#!/usr/bin/env bun
/** かわいいポップ調のチップチューン BGM ループ (16秒) を合成する */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buffer, noise, tone, writeWav } from "./lib/synth.ts";

const OUT = fileURLToPath(new URL("../assets/bgm/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const BPM = 128;
const BEAT = 60 / BPM;
const BARS = 8;
const TOTAL = BARS * 4 * BEAT;

const b = buffer(TOTAL);

// コード進行: C - G - Am - F を 2 周 (1 コード 1 小節)
// 周波数 (4オクターブ帯)
const chords: number[][] = [
  [261.63, 329.63, 392.0], // C
  [246.94, 293.66, 392.0], // G
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
];
const roots = [130.81, 98.0, 110.0, 87.31];

for (let bar = 0; bar < BARS; bar++) {
  const chord = chords[bar % 4]!;
  const root = roots[bar % 4]!;
  const barStart = bar * 4 * BEAT;

  // ベース: 拍ごとにルート音
  for (let beat = 0; beat < 4; beat++) {
    tone(b, {
      freq: root,
      at: barStart + beat * BEAT,
      duration: BEAT * 0.9,
      gain: 0.3,
      decay: 6,
      shape: "triangle",
    });
  }

  // アルペジオ: 8分音符で コード分散 (上下)
  const arp = [chord[0]!, chord[1]!, chord[2]!, chord[1]!, chord[0]! * 2, chord[2]!, chord[1]!, chord[2]!];
  arp.forEach((f, i) => {
    tone(b, {
      freq: f * 2,
      at: barStart + i * (BEAT / 2),
      duration: BEAT * 0.42,
      gain: 0.14,
      decay: 8,
      shape: "square",
    });
  });

  // キック: 1,3拍 / ハット: 裏拍
  for (let beat = 0; beat < 4; beat++) {
    if (beat % 2 === 0) {
      tone(b, {
        freq: 140,
        freqEnd: 50,
        at: barStart + beat * BEAT,
        duration: 0.18,
        gain: 0.4,
        decay: 18,
      });
    }
    noise(b, {
      at: barStart + beat * BEAT + BEAT / 2,
      duration: 0.05,
      gain: 0.1,
      decay: 60,
      lowpass: 0.95,
      seed: 100 + bar * 4 + beat,
    });
  }
}

await writeWav(join(OUT, "pop-loop.wav"), b);
console.log(`wrote ${join(OUT, "pop-loop.wav")} (${TOTAL.toFixed(1)}s)`);
