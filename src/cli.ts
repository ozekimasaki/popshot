#!/usr/bin/env bun
/** popshot — 技術解説ショート動画 (1080x1920) 量産CLI */
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadScript } from "./script.ts";
import { renderPipeline, type RenderOptions, type Stage } from "./pipeline.ts";
import { frames, framesByCategory, frameCount } from "./frames/index.ts";
import { voicevoxAvailable, findVoicevoxEngine, ensureVoicevox, VOICEVOX_URL } from "./voicevox.ts";
import { findChrome, findGitBash, fromModuleUrl, logError, logStage } from "./util.ts";

const HELP = `popshot — tcut + HyperFrames + GSAP + VOICEVOX ショート動画工場

使い方:
  popshot render <video.yaml> [options]   台本から MP4 までワンパス生成
  popshot init [dir]                      台本の雛形を生成
  popshot frames [--json] [--category c]  100フレームのカタログ
  popshot preview <video.yaml>            compose まで実行して Studio でプレビュー
  popshot doctor                          依存関係の診断
  popshot batch <dir> [options]           ディレクトリ内の *.yaml を一括レンダリング

render options:
  -o, --output <path>   出力先 (既定: out/<title-slug>.mp4)
  --mock-tts            VOICEVOX なしで実行 (無音+推定尺)
  --no-cache            TTS / tcut キャッシュを無視
  --only <stage>        tts|tcut|compose|check|render で停止 (デバッグ用)
  --check               hyperframes check (レイアウト監査) も実行
  -q, --quality <q>     draft|standard|high (既定: standard)

環境変数:
  VOICEVOX_URL          VOICEVOX エンジン (既定: http://127.0.0.1:50021)
  VOICEVOX_ENGINE       未起動時に自動起動する run.exe / run のパス
  BUN_CHROME_PATH       tcut 用 Chrome / PUPPETEER_EXECUTABLE_PATH: render 用 Chrome
`;

interface ParsedArgs {
  positional: string[];
  flags: Map<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string | boolean>();
  const valueFlags = new Set(["-o", "--output", "--only", "-q", "--quality", "--category"]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("-")) {
      if (valueFlags.has(a)) {
        flags.set(a, argv[++i] ?? "");
      } else {
        flags.set(a, true);
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function renderOptions(args: ParsedArgs): RenderOptions {
  const only = (args.flags.get("--only") as string | undefined) ?? undefined;
  if (only && !["tts", "tcut", "compose", "check", "render"].includes(only)) {
    throw new Error(`--only の値が不正です: ${only}`);
  }
  const quality = ((args.flags.get("-q") ?? args.flags.get("--quality")) as string | undefined) ?? "standard";
  if (!["draft", "standard", "high"].includes(quality)) {
    throw new Error(`--quality の値が不正です: ${quality}`);
  }
  return {
    output: (args.flags.get("-o") ?? args.flags.get("--output")) as string | undefined,
    mockTts: args.flags.has("--mock-tts"),
    noCache: args.flags.has("--no-cache"),
    only: only as Stage | undefined,
    check: args.flags.has("--check"),
    quality: quality as RenderOptions["quality"],
  };
}

async function cmdRender(args: ParsedArgs): Promise<void> {
  const yaml = args.positional[0];
  if (!yaml) throw new Error("台本ファイルを指定してください: popshot render video.yaml");
  const script = await loadScript(yaml);
  logStage("popshot", `「${script.config.title}」 (${script.config.scenes.length}シーン)`);
  await renderPipeline(script, renderOptions(args));
}

async function cmdBatch(args: ParsedArgs): Promise<void> {
  const dir = args.positional[0];
  if (!dir) throw new Error("ディレクトリを指定してください: popshot batch videos/");
  const yamls = readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort();
  if (yamls.length === 0) throw new Error(`${dir} に *.yaml がありません`);
  logStage("batch", `${yamls.length} 本をレンダリングします`);
  const results: { file: string; ok: boolean; detail: string }[] = [];
  for (const f of yamls) {
    try {
      const script = await loadScript(join(dir, f));
      const out = await renderPipeline(script, renderOptions(args));
      results.push({ file: f, ok: true, detail: out ?? "(途中stage)" });
    } catch (e) {
      results.push({ file: f, ok: false, detail: e instanceof Error ? e.message : String(e) });
      logError(`${f}: ${results[results.length - 1]!.detail}`);
    }
  }
  console.log("\n==== batch 結果 ====");
  for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.file} → ${r.detail}`);
  if (results.some((r) => !r.ok)) process.exit(1);
}

function cmdFrames(args: ParsedArgs): void {
  const category = args.flags.get("--category") as string | undefined;
  if (args.flags.has("--json")) {
    const list = Object.values(frames)
      .filter((f) => !category || f.category === category)
      .map((f) => ({
        id: f.id,
        category: f.category,
        description: f.description,
        props: f.propsDoc,
        minDuration: f.minDuration,
        terminalSlot: f.terminalSlot ?? null,
      }));
    console.log(JSON.stringify(list, null, 2));
    return;
  }
  console.log(`全 ${frameCount} フレーム\n`);
  for (const [cat, list] of framesByCategory()) {
    if (category && cat !== category) continue;
    console.log(`■ ${cat}`);
    for (const f of list) {
      console.log(`  ${f.id.padEnd(30)} ${f.description}`);
      console.log(`  ${"".padEnd(30)} props: ${f.propsDoc}`);
    }
    console.log("");
  }
}

async function cmdPreview(args: ParsedArgs): Promise<void> {
  const yaml = args.positional[0];
  if (!yaml) throw new Error("台本ファイルを指定してください: popshot preview video.yaml");
  const script = await loadScript(yaml);
  await renderPipeline(script, { ...renderOptions(args), only: "compose" });
  const buildDir = join(script.baseDir, ".popshot/build");
  logStage("preview", "hyperframes preview を起動します (Ctrl+C で終了)");
  const bin = Bun.resolveSync("hyperframes/bin/hyperframes.mjs", import.meta.dir);
  const proc = Bun.spawn(["bun", bin, "preview"], {
    cwd: buildDir,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  process.exit(await proc.exited);
}

async function cmdDoctor(): Promise<void> {
  interface Check {
    name: string;
    ok: boolean;
    detail: string;
    fix?: string;
    optional?: boolean;
  }
  const checks: Check[] = [];

  checks.push({
    name: "bun",
    ok: true,
    detail: Bun.version,
  });

  const ffmpeg = Bun.spawnSync(["ffmpeg", "-version"], { stdout: "pipe", stderr: "pipe" });
  checks.push({
    name: "ffmpeg",
    ok: ffmpeg.exitCode === 0,
    detail: ffmpeg.exitCode === 0 ? (ffmpeg.stdout.toString().split("\n")[0] ?? "") : "見つかりません",
    fix:
      process.platform === "win32"
        ? "winget install Gyan.FFmpeg して PATH を通す"
        : process.platform === "darwin"
          ? "brew install ffmpeg"
          : "sudo apt install ffmpeg (または dnf/pacman 相当)",
  });

  const chrome = findChrome();
  checks.push({
    name: "chrome",
    ok: chrome !== null,
    detail: chrome ?? "見つかりません",
    fix:
      process.platform === "linux"
        ? "Chromium を導入し BUN_CHROME_PATH を設定 (tcut と render の両方で必要)"
        : "Chrome / Chromium を導入 (通常は自動検出。だめなら BUN_CHROME_PATH)",
  });

  if (process.platform === "win32") {
    const bash = findGitBash();
    checks.push({
      name: "git-bash",
      ok: bash !== null,
      detail: bash ?? "見つかりません",
      fix: "Git for Windows を導入 (tcut の bash / mktemp に必要) https://git-scm.com/download/win",
    });
  }

  for (const dep of ["termcut", "hyperframes", "gsap"]) {
    try {
      Bun.resolveSync(`${dep}/package.json`, import.meta.dir);
      checks.push({ name: dep, ok: true, detail: "OK" });
    } catch {
      checks.push({ name: dep, ok: false, detail: "未インストール", fix: "bun install" });
    }
  }

  const engine = findVoicevoxEngine();
  let vv = await voicevoxAvailable();
  let vvErr = "";
  if (!vv) {
    try {
      vv = await ensureVoicevox();
    } catch (e) {
      vvErr = e instanceof Error ? e.message.split("\n")[0]! : String(e);
    }
  }
  checks.push({
    name: "voicevox",
    ok: vv !== null,
    detail: vv ? `${VOICEVOX_URL} (v${vv})` : vvErr || `${VOICEVOX_URL} に接続できません`,
    fix: engine
      ? `手動起動: "${engine}" --host 127.0.0.1 --port 50021`
      : "製品版 VOICEVOX か Docker を導入。非標準パスは VOICEVOX_ENGINE で指定",
  });

  const seDir = fromModuleUrl("../assets/se/", import.meta.url);
  const seOk = await Bun.file(join(seDir, "pop.wav")).exists();
  checks.push({
    name: "se-assets",
    ok: seOk,
    detail: seOk ? seDir : "SE 音源がありません",
    fix: "bun run gen:se",
  });

  const avatarPath = fromModuleUrl("../assets/avatar.png", import.meta.url);
  const avatarOk = await Bun.file(avatarPath).exists();
  checks.push({
    name: "avatar",
    ok: avatarOk,
    detail: avatarOk ? "assets/avatar.png" : "アバター画像がありません",
    fix: "assets/avatar.png を配置するか bun run gen:avatar (または video.yaml で avatarImage を指定 / avatar: false)",
  });

  let allOk = true;
  for (const c of checks) {
    const mark = c.ok ? "✅" : c.optional ? "⚠️ " : "❌";
    console.log(`${mark} ${c.name.padEnd(12)} ${c.detail}`);
    if (!c.ok) {
      if (!c.optional) allOk = false;
      if (c.fix) console.log(`   → ${c.fix}`);
    }
  }
  if (!allOk) process.exit(1);
}

async function cmdInit(args: ParsedArgs): Promise<void> {
  const dir = args.positional[0] ?? ".";
  mkdirSync(dir, { recursive: true });
  const yamlPath = join(dir, "video.yaml");
  if (await Bun.file(yamlPath).exists()) throw new Error(`${yamlPath} は既に存在します`);
  await Bun.write(
    yamlPath,
    `# popshot 台本 (popshot frames でフレーム一覧を確認できます)
title: "30秒でわかる ○○"
theme: cyan          # cyan / pink / purple / yellow / green / coral
speaker: 3           # VOICEVOX 話者id (3 = ずんだもん)
speedScale: 1.15
avatar: true
# bgm: ../../assets/bgm/pop-loop.wav

scenes:
  - frame: hook/impact-zoom
    narration: "○○、実は3ステップで理解できます"
    props: { title: "○○を30秒で", badge: "初心者OK" }

  - frame: text/char-pop
    narration: "まず大事なのはここです"
    props: { text: "ポイントは1つだけ", emphasis: "1つだけ" }

  - frame: transition/pill-bounce-wipe

  - frame: terminal/slide-in
    narration: "実際にコマンドを叩いてみます"
    props: { label: "ターミナル" }
    terminal:
      theme: catppuccin-mocha
      # fontSize: 40 が既定。長い出力を映す時だけ 32〜36 に下げる
      commands:
        - run: "echo 'hello popshot'"
        - expect: "hello popshot"

  - frame: outro/follow-cta
    narration: "フォローで毎日1分、解説します"
    props: { message: "続きはフォローで!", buttonText: "フォロー" }
`,
  );
  await Bun.write(join(dir, ".gitignore"), ".popshot/\nout/\n");
  logStage("init", `${yamlPath} を作成しました`);
  logStage("init", `次: popshot render ${yamlPath}`);
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  try {
    switch (cmd) {
      case "render":
        await cmdRender(args);
        break;
      case "batch":
        await cmdBatch(args);
        break;
      case "frames":
        cmdFrames(args);
        break;
      case "preview":
        await cmdPreview(args);
        break;
      case "doctor":
        await cmdDoctor();
        break;
      case "init":
        await cmdInit(args);
        break;
      case undefined:
      case "-h":
      case "--help":
      case "help":
        console.log(HELP);
        break;
      default:
        console.log(HELP);
        throw new Error(`不明なコマンド: ${cmd}`);
    }
  } catch (e) {
    logError(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

await main();
