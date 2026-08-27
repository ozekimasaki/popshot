#!/usr/bin/env bun
/** 右下アバター用の既定キャラ (透過 PNG) を合成する */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const OUT = fileURLToPath(new URL("../assets/avatar.png", import.meta.url));
const SIZE = 540;

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + data.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcBuf = new Uint8Array(4 + data.length);
  crcBuf.set(out.subarray(4, 8));
  crcBuf.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcBuf));
  return out;
}

function encodePng(rgba: Uint8Array, w: number, h: number): Uint8Array {
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, w);
  v.setUint32(4, h);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const parts = [
    Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array()),
  ];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function setPx(rgba: Uint8Array, x: number, y: number, r: number, g: number, b: number, a: number): void {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || a <= 0) return;
  const i = (y * SIZE + x) * 4;
  const da = rgba[i + 3]! / 255;
  const sa = a / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  rgba[i] = Math.round((r * sa + rgba[i]! * da * (1 - sa)) / outA);
  rgba[i + 1] = Math.round((g * sa + rgba[i + 1]! * da * (1 - sa)) / outA);
  rgba[i + 2] = Math.round((b * sa + rgba[i + 2]! * da * (1 - sa)) / outA);
  rgba[i + 3] = Math.round(outA * 255);
}

function fillCircle(
  rgba: Uint8Array,
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): void {
  const x0 = Math.max(0, Math.floor(cx - radius - 1));
  const x1 = Math.min(SIZE - 1, Math.ceil(cx + radius + 1));
  const y0 = Math.max(0, Math.floor(cy - radius - 1));
  const y1 = Math.min(SIZE - 1, Math.ceil(cy + radius + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d >= radius) continue;
      const aa = d > radius - 1.2 ? Math.round(a * (radius - d)) : a;
      setPx(rgba, x, y, r, g, b, aa);
    }
  }
}

const rgba = new Uint8Array(SIZE * SIZE * 4);
const cx = SIZE / 2;
const cy = SIZE / 2 + 18;

fillCircle(rgba, cx - 118, 128, 78, 255, 245, 250);
fillCircle(rgba, cx + 118, 128, 78, 255, 245, 250);
fillCircle(rgba, cx - 118, 128, 52, 232, 184, 214);
fillCircle(rgba, cx + 118, 128, 52, 232, 184, 214);
fillCircle(rgba, cx, cy, 198, 255, 250, 252);
fillCircle(rgba, cx, cy + 12, 168, 255, 255, 255);
fillCircle(rgba, cx - 72, cy + 28, 36, 255, 176, 198, 150);
fillCircle(rgba, cx + 72, cy + 28, 36, 255, 176, 198, 150);
fillCircle(rgba, cx - 58, cy - 18, 28, 80, 80, 90);
fillCircle(rgba, cx + 58, cy - 18, 28, 80, 80, 90);
fillCircle(rgba, cx - 50, cy - 26, 10, 255, 255, 255);
fillCircle(rgba, cx + 66, cy - 26, 10, 255, 255, 255);
fillCircle(rgba, cx, cy + 52, 18, 232, 131, 168);
fillCircle(rgba, cx, 92, 34, 139, 208, 221);

mkdirSync(dirname(OUT), { recursive: true });
await Bun.write(OUT, encodePng(rgba, SIZE, SIZE));
console.log(`wrote ${OUT}`);
