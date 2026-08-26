#!/usr/bin/env bun
/** SE 12種を決定論的に合成して assets/se/ に書き出す */
import { mkdirSync } from "node:fs";
import { buffer, noise, tone, writeWav } from "./lib/synth.ts";

const OUT = new URL("../assets/se/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

type Gen = () => Float32Array;

const generators: Record<string, Gen> = {
  /** 要素ポップイン: 上昇チャープ */
  pop: () => {
    const b = buffer(0.16);
    tone(b, { freq: 700, freqEnd: 1900, duration: 0.09, gain: 0.55, decay: 22 });
    tone(b, { freq: 1400, freqEnd: 3800, duration: 0.09, gain: 0.18, decay: 26 });
    return b;
  },
  /** インパクト: 低域ドン + ノイズバースト */
  don: () => {
    const b = buffer(0.5);
    tone(b, { freq: 130, freqEnd: 55, duration: 0.4, gain: 0.9, decay: 9 });
    noise(b, { duration: 0.1, gain: 0.35, decay: 45, lowpass: 0.35, seed: 7 });
    return b;
  },
  /** キラキラ: 高域3連アルペジオ */
  sparkle: () => {
    const b = buffer(0.55);
    tone(b, { freq: 2093, duration: 0.3, gain: 0.3, decay: 15 });
    tone(b, { freq: 2637, at: 0.07, duration: 0.3, gain: 0.3, decay: 15 });
    tone(b, { freq: 3136, at: 0.14, duration: 0.35, gain: 0.3, decay: 13 });
    tone(b, { freq: 4186, at: 0.21, duration: 0.3, gain: 0.16, decay: 13 });
    return b;
  },
  /** ワイプ/スライド: ノイズスウィープ */
  whoosh: () => {
    const b = buffer(0.3);
    noise(b, { duration: 0.28, gain: 0.55, decay: 8, lowpass: 0.25, seed: 11 });
    noise(b, { at: 0.04, duration: 0.2, gain: 0.3, decay: 12, lowpass: 0.6, seed: 12 });
    return b;
  },
  /** 正解/完了: 2和音の澄んだ音 */
  ding: () => {
    const b = buffer(0.7);
    tone(b, { freq: 1319, duration: 0.65, gain: 0.42, decay: 6 });
    tone(b, { freq: 1760, duration: 0.65, gain: 0.34, decay: 6 });
    tone(b, { freq: 2637, duration: 0.5, gain: 0.14, decay: 9 });
    return b;
  },
  /** タイプ/選択: 短いクリック */
  click: () => {
    const b = buffer(0.05);
    noise(b, { duration: 0.03, gain: 0.5, decay: 160, lowpass: 0.9, seed: 3 });
    tone(b, { freq: 2200, duration: 0.02, gain: 0.2, decay: 120 });
    return b;
  },
  /** カウントダウン: キック1発 (連打はキュー側で) */
  drum: () => {
    const b = buffer(0.35);
    tone(b, { freq: 160, freqEnd: 48, duration: 0.3, gain: 0.95, decay: 11 });
    noise(b, { duration: 0.03, gain: 0.25, decay: 90, lowpass: 0.5, seed: 5 });
    return b;
  },
  /** 不正解/エラー: 濁った矩形波 */
  buzzer: () => {
    const b = buffer(0.45);
    tone(b, { freq: 220, duration: 0.4, gain: 0.3, decay: 5, shape: "square" });
    tone(b, { freq: 233, duration: 0.4, gain: 0.24, decay: 5, shape: "square" });
    return b;
  },
  /** 獲得/スコア: 2段コイン音 */
  coin: () => {
    const b = buffer(0.5);
    tone(b, { freq: 988, duration: 0.08, gain: 0.4, shape: "square" });
    tone(b, { freq: 1319, at: 0.08, duration: 0.38, gain: 0.4, decay: 9, shape: "square" });
    return b;
  },
  /** カード送り: 短いスワイプ */
  swipe: () => {
    const b = buffer(0.18);
    noise(b, { duration: 0.16, gain: 0.45, decay: 18, lowpass: 0.45, seed: 21 });
    return b;
  },
  /** アバター跳ね: 上昇グライド */
  jump: () => {
    const b = buffer(0.28);
    tone(b, { freq: 320, freqEnd: 1050, duration: 0.22, gain: 0.5, decay: 9, shape: "triangle" });
    return b;
  },
  /** アウトロ: メジャーコード分散 */
  tada: () => {
    const b = buffer(1.0);
    const notes = [1047, 1319, 1568, 2093];
    notes.forEach((f, i) => {
      tone(b, { freq: f, at: i * 0.07, duration: 0.85 - i * 0.07, gain: 0.3, decay: 4 });
    });
    noise(b, { duration: 0.3, gain: 0.12, decay: 10, lowpass: 0.7, seed: 31 });
    return b;
  },
};

for (const [name, gen] of Object.entries(generators)) {
  const path = `${OUT}${name}.wav`;
  await writeWav(path, gen());
  console.log(`wrote ${path}`);
}
