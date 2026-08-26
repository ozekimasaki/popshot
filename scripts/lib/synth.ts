/** 依存ゼロの WAV シンセ (SE / BGM 生成用)。全て決定論的 */

export const SAMPLE_RATE = 44100;

/** シード付き PRNG (決定論) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 秒数分のサンプルバッファを確保 */
export function buffer(seconds: number): Float32Array {
  return new Float32Array(Math.ceil(seconds * SAMPLE_RATE));
}

export interface ToneOptions {
  /** 開始周波数 Hz */
  freq: number;
  /** 終了周波数 (チャープ)。省略時は freq 固定 */
  freqEnd?: number;
  /** 開始秒 */
  at?: number;
  /** 長さ秒 */
  duration: number;
  /** 音量 0-1 */
  gain?: number;
  /** 減衰係数 (大きいほど速く消える)。0 で減衰なし */
  decay?: number;
  /** アタック秒 (クリックノイズ防止) */
  attack?: number;
  /** 波形 */
  shape?: "sine" | "square" | "triangle" | "saw";
}

function wave(shape: NonNullable<ToneOptions["shape"]>, phase: number): number {
  const p = phase % 1;
  switch (shape) {
    case "sine":
      return Math.sin(2 * Math.PI * p);
    case "square":
      return p < 0.5 ? 1 : -1;
    case "triangle":
      return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
    case "saw":
      return 2 * p - 1;
    default: {
      const _exhaustive: never = shape;
      throw new Error(`unknown shape: ${_exhaustive}`);
    }
  }
}

/** トーン (チャープ対応) を加算合成 */
export function tone(buf: Float32Array, opts: ToneOptions): void {
  const { freq, freqEnd = opts.freq, at = 0, duration, gain = 0.5, decay = 0, attack = 0.003, shape = "sine" } = opts;
  const start = Math.floor(at * SAMPLE_RATE);
  const n = Math.floor(duration * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    const f = freq + ((freqEnd - freq) * t) / duration;
    phase += f / SAMPLE_RATE;
    let env = decay > 0 ? Math.exp(-decay * t) : 1;
    if (t < attack) env *= t / attack;
    const rel = duration - t;
    if (rel < 0.01) env *= rel / 0.01;
    buf[start + i]! += wave(shape, phase) * gain * env;
  }
}

export interface NoiseOptions {
  at?: number;
  duration: number;
  gain?: number;
  decay?: number;
  /** 簡易ローパス係数 0-1 (1 で素通し、小さいほどこもる) */
  lowpass?: number;
  seed?: number;
}

/** ノイズバーストを加算合成 */
export function noise(buf: Float32Array, opts: NoiseOptions): void {
  const { at = 0, duration, gain = 0.4, decay = 0, lowpass = 1, seed = 1 } = opts;
  const rand = mulberry32(seed);
  const start = Math.floor(at * SAMPLE_RATE);
  const n = Math.floor(duration * SAMPLE_RATE);
  let prev = 0;
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / SAMPLE_RATE;
    let env = decay > 0 ? Math.exp(-decay * t) : 1;
    const rel = duration - t;
    if (rel < 0.008) env *= rel / 0.008;
    const white = rand() * 2 - 1;
    prev = prev + lowpass * (white - prev);
    buf[start + i]! += prev * gain * env;
  }
}

/** クリップ防止の軽いソフトリミッタ */
export function limit(buf: Float32Array, ceiling = 0.92): void {
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i]!;
    buf[i] = Math.tanh(x / ceiling) * ceiling;
  }
}

/** 16bit mono WAV にエンコード */
export function encodeWav(buf: Float32Array): Uint8Array {
  const dataSize = buf.length * 2;
  const out = new ArrayBuffer(44 + dataSize);
  const v = new DataView(out);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, "data");
  v.setUint32(40, dataSize, true);
  for (let i = 0; i < buf.length; i++) {
    const s = Math.max(-1, Math.min(1, buf[i]!));
    v.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return new Uint8Array(out);
}

export async function writeWav(path: string, buf: Float32Array): Promise<void> {
  limit(buf);
  await Bun.write(path, encodeWav(buf));
}
