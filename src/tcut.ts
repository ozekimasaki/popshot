/** tcut 統合: YAML の terminal 定義から .video.ts を自動生成して収録する */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { TerminalCommand, TerminalConfig } from "./script.ts";
import type { TerminalSlot } from "./frames/types.ts";
import { contentHash, findChrome, findGitBash, logCache, logStage, logWarn, probeDuration, withUnixToolsPath } from "./util.ts";

export interface TcutResult {
  /** 尺調整済み mp4 の絶対パス */
  path: string;
  duration: number;
}

/** terminal コマンド → tcut スクリプト行 */
function commandToLine(cmd: TerminalCommand): string {
  if ("run" in cmd) return `  await t.run(${JSON.stringify(cmd.run)});`;
  if ("type" in cmd) return `  await t.type(${JSON.stringify(cmd.type)});`;
  if ("enter" in cmd) return `  await t.enter();`;
  if ("expect" in cmd) return `  await t.expect(new RegExp(${JSON.stringify(escapeRegex(cmd.expect))}), { scope: "scrollback" });`;
  if ("wait" in cmd) return `  await t.wait(new RegExp(${JSON.stringify(escapeRegex(cmd.wait))}), { scope: "scrollback" });`;
  if ("sleep" in cmd) return `  await t.sleep(${JSON.stringify(cmd.sleep)});`;
  if ("hide" in cmd) {
    // 最後に clear して、隠したコマンドの echo が可視部分に残らないようにする
    const inner = [...cmd.hide.map((c) => `    await t.run(${JSON.stringify(c)});`), `    await t.run("clear");`].join("\n");
    return `  await t.hide(async () => {\n${inner}\n  });`;
  }
  const _exhaustive: never = cmd;
  throw new Error(`unknown terminal command: ${JSON.stringify(_exhaustive)}`);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** スロット表示サイズに対する収録解像度の倍率 (文字のにじみ防止のスーパーサンプリング) */
const RECORD_SCALE = 2;

function generateScript(terminal: TerminalConfig, slot: TerminalSlot): string {
  const lines = terminal.commands.map(commandToLine).join("\n");
  return `import { defineVideo } from "termcut";

export default defineVideo(
  {
    output: "demo.mp4",
    width: ${slot.w * RECORD_SCALE},
    height: ${slot.h * RECORD_SCALE},
    theme: ${JSON.stringify(terminal.theme)},
    font: { size: ${terminal.fontSize * RECORD_SCALE} },
    padding: ${24 * RECORD_SCALE},
${terminal.shell ? `    shell: ${JSON.stringify(terminal.shell)},` : ""}
  },
  async (t) => {
${lines}
  await t.sleep("600ms");
  },
);
`;
}

export interface RecordOptions {
  terminal: TerminalConfig;
  slot: TerminalSlot;
  /** 目標尺 (VO 尺ベース)。収録がこれより長ければ speed 圧縮する */
  targetDuration: number;
  cacheDir: string;
  noCache: boolean;
}

/** terminal 定義を収録し、目標尺にスピードフィットした mp4 を返す */
export async function recordTerminal(opts: RecordOptions): Promise<TcutResult> {
  const { terminal, slot, targetDuration } = opts;
  const key = contentHash({ terminal, w: slot.w, h: slot.h, target: Math.round(targetDuration * 10), v: 3 });
  const dir = join(opts.cacheDir, key);
  const fitted = join(dir, "fitted.mp4");

  if (!opts.noCache && (await Bun.file(fitted).exists())) {
    const duration = await probeDuration(fitted);
    logCache("tcut", `${terminal.commands.length}コマンド → ${duration.toFixed(1)}s`);
    return { path: fitted, duration };
  }

  mkdirSync(dir, { recursive: true });
  const scriptPath = join(dir, "demo.video.ts");
  await Bun.write(scriptPath, generateScript(terminal, slot));

  let env: Record<string, string> = { ...process.env } as Record<string, string>;
  const chrome = findChrome();
  if (chrome && !env.BUN_CHROME_PATH) env.BUN_CHROME_PATH = chrome;
  env = withUnixToolsPath(env);
  if (process.platform === "win32" && !findGitBash()) {
    throw new Error(
      "Windows では tcut 収録に Git Bash が必要です。Git for Windows を導入してください\n" +
        "  https://git-scm.com/download/win",
    );
  }

  const tcutBin = join(dirname(Bun.resolveSync("termcut/package.json", import.meta.dir)), "bin", "tcut.mjs");

  logStage("tcut", `収録中… (${terminal.commands.length}コマンド)`);
  const rec = Bun.spawn(["bun", tcutBin, "demo.video.ts"], {
    cwd: dir,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const recOut = await new Response(rec.stdout).text();
  const recErr = await new Response(rec.stderr).text();
  if ((await rec.exited) !== 0) {
    throw new Error(`tcut の収録に失敗しました:\n${recOut}\n${recErr}`);
  }

  const rawPath = join(dir, "demo.mp4");
  const rawDuration = await probeDuration(rawPath);

  // スピードフィット: 長すぎたら speed 倍率で再レンダリング (cast から再計算するので画質劣化なし)
  const usable = Math.max(targetDuration - 0.3, 1);
  let speed = rawDuration / usable;
  if (speed <= 1.02) {
    // 収録が目標より短い: そのまま使う (残りはフレーム側で静止)
    await Bun.write(fitted, Bun.file(rawPath));
    logStage("tcut", `収録 ${rawDuration.toFixed(1)}s (そのまま使用)`);
    return { path: fitted, duration: rawDuration };
  }
  if (speed > 4) {
    logWarn(`ターミナル収録 (${rawDuration.toFixed(1)}s) がシーン尺に対して長すぎるため 4 倍速に制限します`);
    speed = 4;
  }
  const render = Bun.spawn(
    ["bun", tcutBin, "render", "demo.cast", "--speed", speed.toFixed(2), "-o", "fitted.mp4"],
    { cwd: dir, env, stdout: "pipe", stderr: "pipe" },
  );
  const rOut = await new Response(render.stdout).text();
  const rErr = await new Response(render.stderr).text();
  if ((await render.exited) !== 0) {
    throw new Error(`tcut のスピードフィットに失敗しました:\n${rOut}\n${rErr}`);
  }
  const duration = await probeDuration(fitted);
  logStage("tcut", `収録 ${rawDuration.toFixed(1)}s → ${speed.toFixed(2)}倍速 → ${duration.toFixed(1)}s`);
  return { path: fitted, duration };
}
