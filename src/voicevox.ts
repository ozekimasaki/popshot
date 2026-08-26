/** VOICEVOX エンジン連携 (audio_query → synthesis) と mock-tts フォールバック */
import { mkdirSync } from "node:fs";
import type { MoraTiming, VoiceResult } from "./types.ts";
import { contentHash, logCache, logStage, probeDuration } from "./util.ts";

export const VOICEVOX_URL = process.env.VOICEVOX_URL ?? "http://127.0.0.1:50021";

/** 1 モーラあたりの推定発話秒 (mock-tts 用)。ずんだもん実測から概算 */
const MOCK_SEC_PER_CHAR = 0.135;
const MOCK_PADDING = 0.25;

export async function voicevoxAvailable(): Promise<string | null> {
  try {
    const res = await fetch(`${VOICEVOX_URL}/version`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    return (await res.json()) as string;
  } catch {
    return null;
  }
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
