/** compose: 台本 + TTS + tcut 素材から HyperFrames コンポジション HTML を生成する */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  CaptionChar,
  CaptionPage,
  FrameContextData,
  Manifest,
  SceneManifest,
  SECue,
} from "./types.ts";
import { THEME_COLORS } from "./types.ts";
import type { LoadedScript } from "./script.ts";
import type { VoiceResult } from "./types.ts";
import { getFrame } from "./frames/index.ts";
import { escapeHtml, fromModuleUrl, logStage, logWarn, round3 } from "./util.ts";

const WIDTH = 1080;
const HEIGHT = 1920;
/** VO 終了からシーン終了までの余韻 */
const VO_PAD = 0.45;
/** トランジションが前シーンに重なる秒数 */
const TRANSITION_OVERLAP = 0.4;
/** 末尾の余韻 */
const TAIL = 0.4;
const MAX_SE_PER_SCENE = 8;

export interface TerminalAsset {
  /** 収録済み mp4 の絶対パス */
  path: string;
  duration: number;
}

export interface ComposeInput {
  script: LoadedScript;
  /** シーンごとの TTS 結果 */
  voices: VoiceResult[];
  /** シーン index → tcut 素材 */
  terminalVideos: Map<number, TerminalAsset>;
  buildDir: string;
}

export interface SceneTiming {
  start: number;
  duration: number;
  isTransition: boolean;
}

/** シーン尺の確定。トランジションは前シーン末尾に 0.4s 重ねる */
export function computeTimings(script: LoadedScript, voices: VoiceResult[]): { timings: SceneTiming[]; total: number } {
  const timings: SceneTiming[] = [];
  let t = 0;
  let maxEnd = 0;
  script.config.scenes.forEach((scene, i) => {
    const frame = getFrame(scene.frame);
    const vo = voices[i]?.duration ?? 0;
    const isTransition = frame.category === "transition";
    if (isTransition) {
      const duration = Math.max(scene.duration ?? 0, frame.minDuration, vo > 0 ? vo + VO_PAD : 0);
      const start = Math.max(t - TRANSITION_OVERLAP, 0);
      timings.push({ start, duration, isTransition });
      t = start + TRANSITION_OVERLAP;
      maxEnd = Math.max(maxEnd, start + duration);
    } else {
      const duration = Math.max(scene.duration ?? 0, vo > 0 ? vo + VO_PAD : 0, frame.minDuration);
      timings.push({ start: t, duration, isTransition });
      t += duration;
      maxEnd = Math.max(maxEnd, t);
    }
  });
  return { timings, total: round3(maxEnd + TAIL) };
}

/** 字幕ページ分割: 句読点と文字数 (≤16) でページ化 */
function splitPages(text: string): string[] {
  const MAX = 16;
  const rough = text.split(/(?<=[、。!?!?！？\n])/).flatMap((seg) => {
    const s = seg.replace(/\n/g, "").trim();
    if (s === "") return [];
    if ([...s].length <= MAX) return [s];
    const chunks: string[] = [];
    const arr = [...s];
    for (let i = 0; i < arr.length; i += MAX) chunks.push(arr.slice(i, i + MAX).join(""));
    return chunks;
  });
  // 短すぎるページ (≤3文字) は前のページへ結合
  const pages: string[] = [];
  for (const p of rough) {
    if (pages.length > 0 && [...p].length <= 3) pages[pages.length - 1] += p;
    else pages.push(p);
  }
  return pages;
}

function buildCaptions(
  script: LoadedScript,
  voices: VoiceResult[],
  timings: SceneTiming[],
): CaptionPage[] {
  const out: CaptionPage[] = [];
  script.config.scenes.forEach((scene, i) => {
    const timing = timings[i]!;
    if (timing.isTransition) return;
    const text = (scene.caption ?? scene.narration).trim();
    if (text === "") return;
    const voice = voices[i]!;
    // VO の発話スパン (モーラがなければシーン内に等配)
    const spanStart =
      voice.moras.length > 0 ? timing.start + voice.moras[0]!.start : timing.start + 0.2;
    const lastMora = voice.moras[voice.moras.length - 1];
    const spanEnd = lastMora
      ? timing.start + lastMora.start + lastMora.duration
      : timing.start + timing.duration - 0.3;
    const pages = splitPages(text);
    const totalChars = pages.reduce((a, p) => a + [...p].length, 0);
    let cursor = spanStart;
    pages.forEach((page, pi) => {
      const chars = [...page];
      const share = ((spanEnd - spanStart) * chars.length) / Math.max(totalChars, 1);
      const start = cursor;
      const isLast = pi === pages.length - 1;
      const end = isLast ? timing.start + timing.duration - 0.1 : cursor + share;
      const charTimes: CaptionChar[] = chars.map((ch, ci) => ({
        ch,
        t: round3(start + (share * ci) / Math.max(chars.length, 1)),
      }));
      out.push({ sceneIndex: i, start: round3(start), end: round3(end), chars: charTimes });
      cursor += share;
    });
  });
  return out;
}

/** 口パク用モーラ開始時刻 (グローバル, 最短間隔 0.1s に間引き) */
function collectMoraOnsets(voices: VoiceResult[], timings: SceneTiming[]): number[] {
  const all: number[] = [];
  voices.forEach((v, i) => {
    const base = timings[i]!.start;
    for (const m of v.moras) all.push(base + m.start);
  });
  all.sort((a, b) => a - b);
  const thinned: number[] = [];
  let last = -1;
  for (const t of all) {
    if (t - last >= 0.1) {
      thinned.push(round3(t));
      last = t;
    }
  }
  return thinned;
}

/** BGM を全尺分ループした wav を build/assets に生成 */
async function prepareBgm(src: string, total: number, outPath: string): Promise<void> {
  const proc = Bun.spawn(
    ["ffmpeg", "-y", "-loglevel", "error", "-stream_loop", "-1", "-i", src, "-t", String(total + 0.5), "-af", "afade=t=out:st=" + Math.max(total - 1.2, 0) + ":d=1.2", outPath],
    { stdout: "ignore", stderr: "pipe" },
  );
  if ((await proc.exited) !== 0) throw new Error(`BGM のループ生成に失敗: ${src}`);
}

/** fontsource の Noto Sans JP (400/700/900) を build にコピー */
function prepareFonts(buildDir: string): void {
  const cssPath = Bun.resolveSync("@fontsource/noto-sans-jp/400.css", import.meta.dir);
  const pkgDir = dirname(cssPath);
  const destDir = join(buildDir, "assets/fonts/noto-sans-jp");
  mkdirSync(join(destDir, "files"), { recursive: true });
  let combined = "";
  for (const w of [400, 700, 900]) {
    combined += `${readFileSync(join(pkgDir, `${w}.css`), "utf8")}\n`;
  }
  writeFileSync(join(destDir, "index.css"), combined);
  for (const f of readdirSync(join(pkgDir, "files"))) {
    if (/-(400|700|900)-normal\.woff2?$/.test(f)) {
      cpSync(join(pkgDir, "files", f), join(destDir, "files", f));
    }
  }
}

export async function compose(input: ComposeInput): Promise<{ htmlPath: string; manifest: Manifest }> {
  const { script, voices, terminalVideos, buildDir } = input;
  const config = script.config;
  const assetsDir = join(buildDir, "assets");
  mkdirSync(join(assetsDir, "vo"), { recursive: true });
  mkdirSync(join(assetsDir, "se"), { recursive: true });

  const { timings, total } = computeTimings(script, voices);
  if (total > 62) logWarn(`合計尺が ${total.toFixed(1)}s あります (ショートは 60s 以内推奨)`);

  const accent = THEME_COLORS[config.theme];
  const usedSe = new Set<string>();
  const audioEls: string[] = [];
  const sceneEls: string[] = [];
  const videoEls: string[] = [];
  const scenes: SceneManifest[] = [];
  // audio は要素ごとに一意な表示トラックを割り当てる (lint の重複警告回避)
  let audioTrack = 10;

  // ---- シーン ----
  for (let i = 0; i < config.scenes.length; i++) {
    const scene = config.scenes[i]!;
    const frame = getFrame(scene.frame);
    const timing = timings[i]!;
    const voice = voices[i]!;
    const sceneAccent = scene.theme ? THEME_COLORS[scene.theme] : accent;

    const parsed = frame.propsSchema.safeParse(scene.props);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((x) => `    - ${x.path.join(".")}: ${x.message}`).join("\n");
      throw new Error(`シーン${i + 1} (${scene.frame}) の props が不正です:\n${issues}`);
    }
    const props = parsed.data;

    const ctx: FrameContextData = {
      index: i,
      narration: scene.narration,
      start: round3(timing.start),
      duration: round3(timing.duration),
      accent: sceneAccent,
      theme: scene.theme ?? config.theme,
      seed: i * 7919 + 13,
      moras: voice.moras.map((m) => ({ text: m.text, start: round3(m.start), duration: round3(m.duration) })),
      assets: {},
    };

    // tcut 素材
    const tv = terminalVideos.get(i);
    if (tv) {
      const rel = `assets/tcut-${i}.mp4`;
      cpSync(tv.path, join(buildDir, rel));
      ctx.assets.terminalVideo = rel;
      ctx.assets.terminalVideoDuration = round3(tv.duration);
      const slot = frame.terminalSlot ?? { x: 80, y: 520, w: 920, h: 690, radius: 28 };
      const vStart = round3(timing.start + 0.05);
      const vDur = round3(Math.min(tv.duration, timing.duration - 0.1));
      videoEls.push(
        `<div id="tcw-${i}" class="tcut-wrap" style="position:absolute;left:${slot.x}px;top:${slot.y}px;width:${slot.w}px;height:${slot.h}px;">` +
          `<video id="tcv-${i}" class="clip" src="${rel}" data-start="${vStart}" data-duration="${vDur}" data-track-index="1" muted playsinline ` +
          `style="width:100%;height:100%;object-fit:cover;border-radius:${slot.radius}px;box-shadow:0 10px 30px rgba(0,0,0,0.14);"></video></div>`,
      );
    } else if (frame.category === "terminal") {
      throw new Error(`シーン${i + 1} (${scene.frame}) は terminal フレームですが terminal: 定義がありません`);
    }

    // シーン div (トランジションは z-index を上げて両隣より上に)
    const z = timing.isTransition ? 15 : 6;
    sceneEls.push(
      `<div id="scene-${i}" class="clip scene" data-start="${round3(timing.start)}" data-duration="${round3(timing.duration)}" data-track-index="0" style="z-index:${z};${scene.theme ? `--ps-accent:${sceneAccent};` : ""}">${frame.html(props as never, ctx)}</div>`,
    );

    // VO
    if (voice.wavPath) {
      const rel = `assets/vo/${i}.wav`;
      cpSync(voice.wavPath, join(buildDir, rel));
      audioEls.push(
        `<audio id="vo-${i}" src="${rel}" data-start="${round3(timing.start)}" data-track-index="${audioTrack++}" data-volume="1"></audio>`,
      );
    }

    // SE (YAML 上書き > フレーム既定)
    const cues: SECue[] = (scene.se ?? frame.seCues(props as never, ctx))
      .filter((c) => c.at >= 0 && c.at < timing.duration)
      .slice(0, MAX_SE_PER_SCENE);
    cues.forEach((cue, j) => {
      usedSe.add(cue.name);
      audioEls.push(
        `<audio id="se-${i}-${j}" src="assets/se/${cue.name}.wav" data-start="${round3(timing.start + cue.at)}" data-track-index="${audioTrack++}" data-volume="0.55"></audio>`,
      );
    });

    scenes.push({ frameId: scene.frame, props, ctx });
  }

  // ---- SE ファイルのコピー ----
  const seSrcDir = fromModuleUrl("../assets/se/", import.meta.url);
  for (const name of usedSe) {
    cpSync(join(seSrcDir, `${name}.wav`), join(assetsDir, "se", `${name}.wav`));
  }

  // ---- BGM ----
  if (config.bgm) {
    const bgmSrc = config.bgm.startsWith("/") ? config.bgm : join(script.baseDir, config.bgm);
    if (!(await Bun.file(bgmSrc).exists())) throw new Error(`BGM が見つかりません: ${bgmSrc}`);
    await prepareBgm(bgmSrc, total, join(assetsDir, "bgm.wav"));
    audioEls.push(
      `<audio id="bgm" src="assets/bgm.wav" data-start="0" data-duration="${total}" data-track-index="${audioTrack++}" data-volume="${config.bgmVolume}"></audio>`,
    );
  }

  // ---- アバター ----
  const bundledAvatar = fromModuleUrl("../assets/avatar.png", import.meta.url);
  let avatarHtml = "";
  if (config.avatar) {
    const avatarSrc = config.avatarImage
      ? config.avatarImage.startsWith("/")
        ? config.avatarImage
        : join(script.baseDir, config.avatarImage)
      : bundledAvatar;
    if (!(await Bun.file(avatarSrc).exists())) {
      throw new Error(`アバター画像が見つかりません: ${avatarSrc}\n  bun run gen:avatar で既定画像を生成するか、avatar: false にしてください`);
    }
    cpSync(avatarSrc, join(assetsDir, "avatar.png"));
    avatarHtml = `<div id="avatar-layer"><img id="avatar-img" src="assets/avatar.png" alt="" style="position:absolute;right:20px;bottom:150px;width:270px;"/></div>`;
  } else if (existsSync(bundledAvatar)) {
    // トランジション avatar-jump-cut 用に画像だけは置いておく
    cpSync(bundledAvatar, join(assetsDir, "avatar.png"));
  }

  // ---- 字幕 ----
  const captions = buildCaptions(script, voices, timings);
  const captionHtml = captions
    .map(
      (page, pi) =>
        `<div id="cap-${pi}" class="cap-page">${page.chars
          .map((c) => `<span class="cap-ch">${c.ch === " " ? "&nbsp;" : escapeHtml(c.ch)}</span>`)
          .join("")}</div>`,
    )
    .join("\n");

  // ---- マニフェスト ----
  const manifest: Manifest = {
    width: WIDTH,
    height: HEIGHT,
    duration: total,
    theme: config.theme,
    accent,
    scenes,
    captions,
    avatar: config.avatar,
    moraOnsets: collectMoraOnsets(voices, timings),
    sceneStarts: timings.filter((t) => !t.isTransition).map((t) => round3(t.start)),
    outroStart: (() => {
      const idx = config.scenes.findIndex((s) => s.frame.startsWith("outro/"));
      return idx >= 0 ? round3(timings[idx]!.start) : null;
    })(),
  };

  // ---- ランタイムバンドル ----
  // gsap 内部の Math.random 等を lint に誤検出させないため外部ファイルにし、
  // timeline の「登録」だけをインラインスクリプトで行う (lint はインラインのみ走査する)
  const entry = fromModuleUrl("./browser/entry.ts", import.meta.url);
  const result = await Bun.build({ entrypoints: [entry], target: "browser", minify: true });
  if (!result.success) {
    throw new Error(`ランタイムのバンドルに失敗:\n${result.logs.map((l) => String(l)).join("\n")}`);
  }
  await Bun.write(join(assetsDir, "popshot-runtime.js"), await result.outputs[0]!.text());

  // ---- フォント ----
  prepareFonts(buildDir);

  // ---- テーマ CSS ----
  const themeCss = await Bun.file(fromModuleUrl("./theme/sanrio.css", import.meta.url)).text();

  const manifestJson = JSON.stringify(manifest).replaceAll("</", "<\\/");

  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(config.title)}</title>
    <link rel="stylesheet" href="assets/fonts/noto-sans-jp/index.css" />
    <style>
body { margin: 0; }
${themeCss}
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="short"
      data-width="${WIDTH}"
      data-height="${HEIGHT}"
      data-duration="${total}"
      data-fps="${config.fps}"
      style="width:${WIDTH}px;height:${HEIGHT}px;position:relative;overflow:hidden;--ps-accent:${accent};"
    >
      <div id="bg"></div>
${videoEls.map((v) => `      ${v}`).join("\n")}
${sceneEls.map((s) => `      ${s}`).join("\n")}
      <div id="captions">
${captionHtml}
      </div>
      ${avatarHtml}
${audioEls.map((a2) => `      ${a2}`).join("\n")}
    </div>
    <script>window.__POPSHOT__ = ${manifestJson};</script>
    <script src="assets/popshot-runtime.js"></script>
    <script>
      window.__popshotBuild().then(function (result) {
        window.__timelines = window.__timelines || {};
        window.__timelines.short = result.tl;
      });
    </script>
  </body>
</html>
`;

  const htmlPath = join(buildDir, "index.html");
  await Bun.write(htmlPath, html);
  logStage("compose", `${htmlPath} (${config.scenes.length}シーン / ${total.toFixed(1)}s / 字幕${captions.length}ページ / SE${audioEls.filter((x) => x.includes("se-")).length}個)`);
  return { htmlPath, manifest };
}
