/** VOICEVOX エンジン連携 (audio_query → synthesis) と mock-tts フォールバック */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { MoraTiming, VoiceResult } from "./types.ts";
import { contentHash, logCache, logStage, probeDuration } from "./util.ts";

export const VOICEVOX_URL = process.env.VOICEVOX_URL ?? "http://127.0.0.1:50021";

/** 1 モーラあたりの推定発話秒 (mock-tts 用)。ずんだもん実測から概算 */
const MOCK_SEC_PER_CHAR = 0.135;
const MOCK_PADDING = 0.25;
const START_TIMEOUT_MS = 90_000;

export async function voicevoxAvailable(): Promise<string | null> {
  try {
    const res = await fetch(`${VOICEVOX_URL}/version`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    return (await res.json()) as string;
  } catch {
    return null;
  }
}

function voicevoxEndpoint(): URL {
  return new URL(VOICEVOX_URL);
}

function isLocalVoicevox(): boolean {
  return ["127.0.0.1", "localhost", "::1"].includes(voicevoxEndpoint().hostname);
}

/** 製品版 VOICEVOX / 単体エンジンの run バイナリを探す */
export function findVoicevoxEngine(): string | null {
  const env = process.env.VOICEVOX_ENGINE;
  if (env && existsSync(env)) return env;
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
  const pf = process.env.PROGRAMFILES ?? "C:\\Program Files";
  const local = process.env.LOCALAPPDATA ?? "";
  const macApp = (root: string) => join(root, "VOICEVOX.app", "Contents", "Resources", "vv-engine", "run");
  const candidates = [
    join(pf, "VOICEVOX", "vv-engine", "run.exe"),
    local ? join(local, "Programs", "VOICEVOX", "vv-engine", "run.exe") : undefined,
    join(home, "VOICEVOX", "vv-engine", "run.exe"),
    macApp("/Applications"),
    home ? macApp(join(home, "Applications")) : undefined,
    join(home, ".local", "share", "VOICEVOX", "vv-engine", "run"),
    join(home, "VOICEVOX", "vv-engine", "run"),
    "/opt/VOICEVOX/vv-engine/run",
    "/usr/local/VOICEVOX/vv-engine/run",
    join(home, ".popshot", "voicevox_engine", "run.exe"),
    join(home, ".popshot", "voicevox_engine", "run"),
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return null;
}

function hasDocker(): boolean {
  return Bun.spawnSync(["docker", "--version"], { stdout: "ignore", stderr: "ignore" }).exitCode === 0;
}

async function waitForVoicevox(timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const version = await voicevoxAvailable();
    if (version) return version;
    await Bun.sleep(400);
  }
  return null;
}

function spawnEngine(bin: string, port: number): { kill(): void; exitCode: number | null } {
  const args = ["--host", "127.0.0.1", "--port", String(port), "--output_log_utf8"];
  if (process.platform === "win32") {
    // 親 CLI 終了後もエンジンを残す (通常の spawn だと Windows のジョブごと死ぬ)
    const ps = `Start-Process -FilePath ${psQuote(bin)} -WorkingDirectory ${psQuote(dirname(bin))} -WindowStyle Hidden -ArgumentList ${args.map(psQuote).join(",")}`;
    Bun.spawn(["powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps], {
      stdout: "ignore",
      stderr: "ignore",
      stdin: "ignore",
    });
    return { kill() {}, exitCode: null };
  }
  const proc = Bun.spawn([bin, ...args], {
    cwd: dirname(bin),
    stdout: "ignore",
    stderr: "ignore",
    stdin: "ignore",
    detached: true,
  });
  proc.unref();
  return proc;
}

function psQuote(s: string): string {
  return `'${s.replaceAll("'", "''")}'`;
}

function startDockerEngine(port: number): boolean {
  const name = "popshot-voicevox";
  const started = Bun.spawnSync(["docker", "start", name], { stdout: "ignore", stderr: "ignore" });
  if (started.exitCode === 0) return true;
  const run = Bun.spawnSync(
    [
      "docker",
      "run",
      "-d",
      "--name",
      name,
      "-p",
      `127.0.0.1:${port}:50021`,
      "voicevox/voicevox_engine:cpu-latest",
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  return run.exitCode === 0;
}

/**
 * ローカルの VOICEVOX が止まっていれば起動し、応答するまで待つ。
 * 既に起動済みならそのまま使う。リモート URL の場合は起動しない。
 */
export async function ensureVoicevox(): Promise<string> {
  const existing = await voicevoxAvailable();
  if (existing) return existing;
  if (!isLocalVoicevox()) {
    throw new Error(
      `VOICEVOX エンジン (${VOICEVOX_URL}) に接続できません。\n` +
        `  - リモートのエンジンが起動しているか確認してください`,
    );
  }

  const port = Number(voicevoxEndpoint().port || 50021);
  const engine = findVoicevoxEngine();
  if (engine) {
    logStage("tts", `VOICEVOX エンジンを起動しています… (${engine})`);
    const proc = spawnEngine(engine, port);
    const version = await waitForVoicevox(START_TIMEOUT_MS);
    if (version) return version;
    if (proc.exitCode !== null) {
      throw new Error(
        `VOICEVOX エンジンが起動直後に終了しました (exit=${proc.exitCode})\n` +
          `  手動起動: "${engine}" --host 127.0.0.1 --port ${port}`,
      );
    }
    proc.kill();
    throw new Error(
      `VOICEVOX エンジンが ${START_TIMEOUT_MS / 1000} 秒以内に応答しませんでした\n` +
        `  手動起動: "${engine}" --host 127.0.0.1 --port ${port}`,
    );
  }

  if (hasDocker()) {
    logStage("tts", "VOICEVOX エンジンを Docker で起動しています…");
    if (!startDockerEngine(port)) {
      throw new Error("docker run による VOICEVOX 起動に失敗しました");
    }
    const version = await waitForVoicevox(START_TIMEOUT_MS);
    if (version) return version;
    throw new Error("Docker 上の VOICEVOX が起動しましたが、API が応答しませんでした");
  }

  throw new Error(
    `VOICEVOX エンジン (${VOICEVOX_URL}) に接続できません。\n` +
      `  - 製品版 VOICEVOX を導入するか、VOICEVOX_ENGINE にエンジン (run.exe / run) のパスを設定してください\n` +
      `  - Docker があれば voicevox/voicevox_engine:cpu-latest を自動起動します`,
  );
}

interface VVMora {
  text: string;
  consonant_length: number | null;
  vowel_length: number;
}

interface VVAccentPhrase {
  moras: VVMora[];
  pause_mora: VVMora | null;
}

interface VVAudioQuery {
  accent_phrases: VVAccentPhrase[];
  speedScale: number;
  prePhonemeLength: number;
  postPhonemeLength: number;
  [key: string]: unknown;
}

export interface SynthesizeOptions {
  text: string;
  speaker: number;
  speedScale: number;
  /** wav / timings の出力ディレクトリ */
  outDir: string;
  mock: boolean;
  noCache: boolean;
}

/**
 * ナレーション 1 本を合成し、wav とモーラタイミングを返す。
 * タイミングは wav 実測尺に合わせて線形補正する (speedScale の適用範囲の
 * エンジン実装差を吸収するため)。
 */
export async function synthesize(opts: SynthesizeOptions): Promise<VoiceResult> {
  const { text, speaker, speedScale, outDir } = opts;
  if (text.trim() === "") {
    return { wavPath: null, duration: 0, moras: [], mock: opts.mock };
  }
  mkdirSync(outDir, { recursive: true });

  if (opts.mock) return mockSynthesize(opts);

  const key = contentHash({ text, speaker, speedScale, v: 1 });
  const wavPath = `${outDir}/${key}.wav`;
  const timingsPath = `${outDir}/${key}.timings.json`;
  if (!opts.noCache && (await Bun.file(wavPath).exists()) && (await Bun.file(timingsPath).exists())) {
    const cached = (await Bun.file(timingsPath).json()) as { duration: number; moras: MoraTiming[] };
    logCache("tts", `"${preview(text)}" (${cached.duration.toFixed(2)}s)`);
    return { wavPath, duration: cached.duration, moras: cached.moras, mock: false };
  }

  const queryRes = await fetch(
    `${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
    { method: "POST" },
  );
  if (!queryRes.ok) throw new Error(`VOICEVOX audio_query に失敗 (${queryRes.status}): ${text}`);
  const query = (await queryRes.json()) as VVAudioQuery;
  query.speedScale = speedScale;

  const synthRes = await fetch(`${VOICEVOX_URL}/synthesis?speaker=${speaker}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!synthRes.ok) throw new Error(`VOICEVOX synthesis に失敗 (${synthRes.status}): ${text}`);
  await Bun.write(wavPath, await synthRes.arrayBuffer());

  const duration = await probeDuration(wavPath);
  const moras = extractMoras(query, duration);
  await Bun.write(timingsPath, JSON.stringify({ text, duration, moras }, null, 2));
  logStage("tts", `"${preview(text)}" → ${duration.toFixed(2)}s / ${moras.length}モーラ`);
  return { wavPath, duration, moras, mock: false };
}

/** audio_query のモーラ長を累積し、wav 実測尺にフィットさせる */
function extractMoras(query: VVAudioQuery, wavDuration: number): MoraTiming[] {
  interface Raw {
    text: string;
    len: number;
    silent: boolean;
  }
  const raw: Raw[] = [];
  for (const phrase of query.accent_phrases) {
    for (const m of phrase.moras) {
      raw.push({ text: m.text, len: (m.consonant_length ?? 0) + m.vowel_length, silent: false });
    }
    if (phrase.pause_mora) {
      raw.push({
        text: "",
        len: (phrase.pause_mora.consonant_length ?? 0) + phrase.pause_mora.vowel_length,
        silent: true,
      });
    }
  }
  const speechTotal = raw.reduce((a, r) => a + r.len, 0);
  const pre = query.prePhonemeLength;
  const post = query.postPhonemeLength;
  // wav = pre + 発話部 + post。発話部を実測にスケールして speedScale 差を吸収
  const target = Math.max(wavDuration - pre - post, 0.01);
  const scale = speechTotal > 0 ? target / speechTotal : 1;
  const moras: MoraTiming[] = [];
  let t = pre;
  for (const r of raw) {
    const d = r.len * scale;
    if (!r.silent) moras.push({ text: r.text, start: t, duration: d });
    t += d;
  }
  return moras;
}

/** エンジンなしで無音 wav + 等間隔タイミングを生成する */
async function mockSynthesize(opts: SynthesizeOptions): Promise<VoiceResult> {
  const { text, speedScale, outDir } = opts;
  const chars = [...text.replace(/[\s、。!?!?]/g, "")];
  const duration =
    Math.round(((chars.length * MOCK_SEC_PER_CHAR) / speedScale + MOCK_PADDING) * 100) / 100;
  const key = contentHash({ text, speedScale, mock: 1 });
  const wavPath = `${outDir}/${key}.wav`;
  if (opts.noCache || !(await Bun.file(wavPath).exists())) {
    const proc = Bun.spawn(
      [
        "ffmpeg",
        "-y",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        `anullsrc=r=24000:cl=mono:d=${duration}`,
        wavPath,
      ],
      { stdout: "ignore", stderr: "pipe" },
    );
    if ((await proc.exited) !== 0) throw new Error("mock-tts の無音 wav 生成に失敗しました");
  }
  const per = (duration - MOCK_PADDING) / Math.max(chars.length, 1);
  const moras: MoraTiming[] = chars.map((ch, i) => ({
    text: ch,
    start: MOCK_PADDING / 2 + i * per,
    duration: per,
  }));
  logStage("tts", `[mock] "${preview(text)}" → ${duration.toFixed(2)}s`);
  return { wavPath, duration, moras, mock: true };
}

function preview(text: string): string {
  return text.length > 18 ? `${text.slice(0, 18)}…` : text;
}
