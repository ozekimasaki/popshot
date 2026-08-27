/** ワンパスパイプライン: TTS → tcut → compose → lint → render */
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { LoadedScript } from "./script.ts";
import type { VoiceResult } from "./types.ts";
import { synthesize, ensureVoicevox } from "./voicevox.ts";
import { recordTerminal, type TcutResult } from "./tcut.ts";
import { compose, computeTimings } from "./compose.ts";
import { getFrame } from "./frames/index.ts";
import { findChrome, logError, logStage, logWarn, slugify } from "./util.ts";

export type Stage = "tts" | "tcut" | "compose" | "check" | "render";

export interface RenderOptions {
  output?: string;
  mockTts: boolean;
  noCache: boolean;
  /** 指定ステージまでで停止 (デバッグ用) */
  only?: Stage;
  /** hyperframes check (レイアウト/コントラスト監査) も実行する */
  check: boolean;
  quality: "draft" | "standard" | "high";
}

const DEFAULT_SLOT = { x: 80, y: 520, w: 920, h: 690, radius: 28 };

function hyperframesBin(): string {
  return Bun.resolveSync("hyperframes/bin/hyperframes.mjs", import.meta.dir);
}

async function runHyperframes(args: string[], cwd: string): Promise<{ code: number; out: string }> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  const chrome = findChrome();
  if (chrome) {
    if (!env.PUPPETEER_EXECUTABLE_PATH) env.PUPPETEER_EXECUTABLE_PATH = chrome;
    if (!env.HYPERFRAMES_BROWSER_PATH) env.HYPERFRAMES_BROWSER_PATH = chrome;
    if (!env.BUN_CHROME_PATH) env.BUN_CHROME_PATH = chrome;
  }
  const proc = Bun.spawn(["bun", hyperframesBin(), ...args], {
    cwd,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
  return { code: await proc.exited, out };
}

export async function renderPipeline(script: LoadedScript, opts: RenderOptions): Promise<string | null> {
  const workDir = join(script.baseDir, ".popshot");
  const buildDir = join(workDir, "build");
  mkdirSync(buildDir, { recursive: true });

  // ---- 1. TTS ----
  let mock = opts.mockTts;
  if (!mock) {
    const version = await ensureVoicevox();
    logStage("tts", `VOICEVOX ${version} / 話者 ${script.config.speaker} / 速度 ${script.config.speedScale}`);
  }
  const voices: VoiceResult[] = [];
  for (const scene of script.config.scenes) {
    voices.push(
      await synthesize({
        text: scene.narration,
        speaker: script.config.speaker,
        speedScale: script.config.speedScale,
        outDir: join(workDir, "tts"),
        mock,
        noCache: opts.noCache,
      }),
    );
  }
  if (opts.only === "tts") return null;

  // ---- 2. tcut (VO 尺が決まってから目標尺を計算して収録) ----
  const { timings } = computeTimings(script, voices);
  const terminalVideos = new Map<number, TcutResult>();
  for (let i = 0; i < script.config.scenes.length; i++) {
    const scene = script.config.scenes[i]!;
    if (!scene.terminal) continue;
    const frame = getFrame(scene.frame);
    if (frame.category !== "terminal") {
      logWarn(`シーン${i + 1}: terminal: 定義がありますが ${scene.frame} は terminal カテゴリではないため無視します`);
      continue;
    }
    const result = await recordTerminal({
      terminal: scene.terminal,
      slot: frame.terminalSlot ?? DEFAULT_SLOT,
      targetDuration: timings[i]!.duration,
      cacheDir: join(workDir, "tcut"),
      noCache: opts.noCache,
    });
    terminalVideos.set(i, result);
  }
  if (opts.only === "tcut") return null;

  // ---- 3. compose ----
  const { htmlPath } = await compose({ script, voices, terminalVideos, buildDir });
  if (opts.only === "compose") return null;

  // ---- 4. lint (エラーはレンダリング前に止める) ----
  logStage("lint", "hyperframes lint を実行中…");
  const lint = await runHyperframes(["lint"], buildDir);
  if (lint.code !== 0) {
    logError("lint エラーがあります。生成 HTML に問題があるためレンダリングを中止します。");
    console.error(lint.out);
    throw new Error("hyperframes lint が失敗しました");
  }
  const lintSummary = lint.out.split("\n").find((l) => l.includes("error")) ?? "";
  logStage("lint", lintSummary.trim() || "OK");

  if (opts.check) {
    logStage("check", "hyperframes check (レイアウト/コントラスト監査) を実行中…");
    const check = await runHyperframes(["check"], buildDir);
    console.log(check.out);
    if (check.code !== 0) logWarn("check で findings がありますが続行します (コントラスト警告はパステル配色では既知)");
  }
  if (opts.only === "check") return null;

  // ---- 5. render ----
  const outPath = resolve(
    script.baseDir,
    opts.output ?? join("out", `${slugify(script.config.title)}.mp4`),
  );
  mkdirSync(dirname(outPath), { recursive: true });
  logStage("render", `MP4 レンダリング中… (1080x1920 @${script.config.fps}fps, ${opts.quality})`);
  const render = await runHyperframes(
    ["render", "-o", outPath, "--fps", String(script.config.fps), "-q", opts.quality, "--quiet"],
    buildDir,
  );
  if (render.code !== 0) {
    console.error(render.out);
    throw new Error("hyperframes render が失敗しました");
  }
  const tail = render.out.trim().split("\n").slice(-2).join(" / ");
  logStage("render", tail);
  logStage("done", `✅ ${outPath}`);
  return outPath;
}
