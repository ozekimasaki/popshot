/** transition: シーン間トランジション 10種
 *
 * トランジションシーンは前シーンの末尾 0.4 秒に重ねて開始され、
 * ローカル 0.4s 時点で画面を完全に覆う → 残りで次シーンを開く。
 * compose がシーン div に z-index:15 を与えるため両隣より上に描画される。
 */
import { z } from "zod";
import { defineFrame } from "./types.ts";
import { seeded } from "./helpers.ts";

const none = z.object({});

/** 覆う→開く の2フェーズタイミング */
function phases(ctx: { start: number; duration: number }) {
  return { coverEnd: ctx.start + 0.4, out: ctx.start + 0.45, end: ctx.start + ctx.duration };
}

export const pillBounceWipe = defineFrame({
  id: "transition/pill-bounce-wipe",
  category: "transition",
  description: "巨大ピルが画面を横切ってワイプする",
  propsDoc: "props なし",
  minDuration: 0.9,
  propsSchema: none,
  html: () =>
    `<div class="tr-pill" style="position:absolute;left:-15%;top:42%;width:130%;height:16%;border-radius:200px;background:var(--ps-accent);"></div>`,
  timeline(a) {
    const p = phases(a.ctx);
    a.tl.fromTo(a.q(".tr-pill"), { x: -2400, scaleY: 1 }, { x: 0, scaleY: 12, duration: 0.4, ease: "power2.in" }, a.ctx.start);
    a.tl.to(a.q(".tr-pill"), { x: 2400, scaleY: 1, duration: 0.45, ease: "power2.out" }, p.out);
  },
  seCues: () => [{ at: 0.0, name: "whoosh" }],
});

export const pastelConfetti = defineFrame({
  id: "transition/pastel-confetti",
  category: "transition",
  description: "パステル紙吹雪が画面いっぱいに舞って場面が変わる",
  propsDoc: "props なし",
  minDuration: 1.0,
  propsSchema: none,
  html(_p, ctx) {
    const rand = seeded(ctx.seed);
    const colors = ["#8bd0dd", "#e383a8", "#cda1dc", "#f2d36b", "#91dea9"];
    let bits = "";
    for (let i = 0; i < 42; i++) {
      const x = Math.round(rand() * 1080);
      const w = Math.round(26 + rand() * 40);
      const c = colors[Math.floor(rand() * colors.length)];
      const r = Math.round(rand() * 360);
      bits += `<div class="tr-bit" data-d="${(rand() * 0.25).toFixed(2)}" style="position:absolute;left:${x}px;top:-80px;width:${w}px;height:${Math.round(w * 0.6)}px;background:${c};border-radius:8px;transform:rotate(${r}deg);"></div>`;
    }
    return bits;
  },
  timeline(a) {
    const bits = document.querySelectorAll(`${a.sel} .tr-bit`);
    bits.forEach((el) => {
      const d = Number((el as HTMLElement).dataset.d ?? 0);
      a.tl.fromTo(el, { y: 0 }, { y: 2200, rotation: 300, duration: 0.9, ease: "power1.in" }, a.ctx.start + d);
    });
  },
  seCues: () => [{ at: 0.0, name: "sparkle" }],
});

export const screenCrack = defineFrame({
  id: "transition/screen-crack",
  category: "transition",
  description: "画面が2枚に割れて左右へ吹き飛ぶ",
  propsDoc: "props なし",
  minDuration: 1.0,
  propsSchema: none,
  html: () =>
    `<div class="tr-half-l" style="position:absolute;left:0;top:0;width:52%;height:100%;background:var(--ps-accent);clip-path:polygon(0 0, 100% 0, 86% 100%, 0 100%);"></div>
     <div class="tr-half-r" style="position:absolute;right:0;top:0;width:52%;height:100%;background:color-mix(in srgb, var(--ps-accent) 78%, #ffffff);clip-path:polygon(14% 0, 100% 0, 100% 100%, 0 100%);"></div>
     <div class="tr-bolt" style="position:absolute;left:0;right:0;top:40%;text-align:center;font-size:180px;z-index:2;">⚡</div>`,
  timeline(a) {
    const s = a.ctx.start;
    const p = phases(a.ctx);
    a.tl.fromTo(a.q(".tr-half-l"), { x: -1300 }, { x: 0, duration: 0.35, ease: "power3.in" }, s);
    a.tl.fromTo(a.q(".tr-half-r"), { x: 1300 }, { x: 0, duration: 0.35, ease: "power3.in" }, s);
    a.tl.fromTo(a.q(".tr-bolt"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.15, ease: "power4.in" }, s + 0.3);
    a.tl.to(a.q(".tr-bolt"), { autoAlpha: 0, duration: 0.15 }, p.out + 0.05);
    a.tl.to(a.q(".tr-half-l"), { x: -1300, rotation: -6, duration: 0.4, ease: "power2.in" }, p.out);
    a.tl.to(a.q(".tr-half-r"), { x: 1300, rotation: 6, duration: 0.4, ease: "power2.in" }, p.out);
  },
  seCues: () => [
    { at: 0.3, name: "don" },
    { at: 0.45, name: "whoosh" },
  ],
});

export const dotWipe = defineFrame({
  id: "transition/dot-wipe",
  category: "transition",
  description: "水玉が波状に膨らんで画面を覆い、しぼんで消える",
  propsDoc: "props なし",
  minDuration: 1.1,
  propsSchema: none,
  html() {
    const cols = 5;
    const rows = 8;
    let dots = "";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) * (1080 / cols);
        const y = (r + 0.5) * (1920 / rows);
        dots += `<div class="tr-dot" data-i="${r + c}" style="position:absolute;left:${x - 150}px;top:${y - 150}px;width:300px;height:300px;border-radius:50%;background:var(--ps-accent);"></div>`;
      }
    }
    return dots;
  },
  timeline(a) {
    const s = a.ctx.start;
    const p = phases(a.ctx);
    const dots = document.querySelectorAll(`${a.sel} .tr-dot`);
    dots.forEach((el) => {
      const i = Number((el as HTMLElement).dataset.i ?? 0);
      a.tl.fromTo(el, { scale: 0 }, { scale: 1.5, duration: 0.3, ease: "power2.out" }, s + i * 0.035);
      a.tl.to(el, { scale: 0, duration: 0.3, ease: "power2.in" }, p.out + 0.1 + i * 0.03);
    });
  },
  seCues: () => [
    { at: 0.0, name: "pop" },
    { at: 0.2, name: "pop" },
  ],
});

export const ribbonSweep = defineFrame({
  id: "transition/ribbon-sweep",
  category: "transition",
  description: "3本のリボンが斜めに走り抜けて場面を切り替える",
  propsDoc: "props なし",
  minDuration: 0.9,
  propsSchema: none,
  html: () =>
    ["var(--ps-cyan)", "var(--ps-pink)", "var(--ps-yellow)"]
      .map(
        (c, i) =>
          `<div class="tr-rb tr-rb-${i}" style="position:absolute;left:-30%;top:${18 + i * 28}%;width:160%;height:22%;background:${c};transform:rotate(-14deg);"></div>`,
      )
      .join(""),
  timeline(a) {
    const s = a.ctx.start;
    const p = phases(a.ctx);
    for (let i = 0; i < 3; i++) {
      a.tl.fromTo(a.q(`.tr-rb-${i}`), { x: -2600 }, { x: 0, duration: 0.32, ease: "power2.in" }, s + i * 0.07);
      a.tl.to(a.q(`.tr-rb-${i}`), { x: 2600, duration: 0.35, ease: "power2.out" }, p.out + i * 0.06);
    }
  },
  seCues: () => [
    { at: 0.0, name: "whoosh" },
    { at: 0.14, name: "whoosh" },
  ],
});

export const pageFlip = defineFrame({
  id: "transition/page-flip",
  category: "transition",
  description: "紙面がペラッとめくれるページターン",
  propsDoc: "props なし",
  minDuration: 1.0,
  propsSchema: none,
  html: () =>
    `<div style="position:absolute;inset:0;perspective:2200px;">
      <div class="tr-page" style="position:absolute;inset:0;background:linear-gradient(120deg,var(--ps-surface-pink),var(--ps-surface-cyan));box-shadow:var(--ps-shadow-2);"></div>
     </div>`,
  timeline(a) {
    const s = a.ctx.start;
    const p = phases(a.ctx);
    a.tl.fromTo(
      a.q(".tr-page"),
      { rotationY: -100, transformOrigin: "0% 50%", autoAlpha: 0 },
      { rotationY: 0, autoAlpha: 1, duration: 0.4, ease: "power2.in" },
      s,
    );
    a.tl.to(a.q(".tr-page"), { rotationY: 100, transformOrigin: "100% 50%", autoAlpha: 0, duration: 0.5, ease: "power2.out" }, p.out);
  },
  seCues: () => [
    { at: 0.05, name: "swipe" },
    { at: 0.5, name: "swipe" },
  ],
});

export const bubblePop = defineFrame({
  id: "transition/bubble-pop",
  category: "transition",
  description: "シャボン玉が下から湧き上がって覆い、順にはじけて消える",
  propsDoc: "props なし",
  minDuration: 1.2,
  propsSchema: none,
  html(_p, ctx) {
    const rand = seeded(ctx.seed);
    let bubbles = "";
    for (let i = 0; i < 16; i++) {
      const x = Math.round(rand() * 1000);
      const size = Math.round(220 + rand() * 320);
      bubbles += `<div class="tr-bub" data-d="${(rand() * 0.22).toFixed(2)}" style="position:absolute;left:${x - size / 2}px;top:${1920 - size / 3}px;width:${size}px;height:${size}px;border-radius:50%;background:color-mix(in srgb, var(--ps-accent) ${55 + Math.round(rand() * 40)}%, #ffffff);"></div>`;
    }
    return bubbles;
  },
  timeline(a) {
    const s = a.ctx.start;
    const p = phases(a.ctx);
    const bubbles = document.querySelectorAll(`${a.sel} .tr-bub`);
    bubbles.forEach((el, i) => {
      const d = Number((el as HTMLElement).dataset.d ?? 0);
      a.tl.fromTo(el, { y: 200, scale: 0.4 }, { y: -1400 - (i % 4) * 260, scale: 1.4, duration: 0.55, ease: "power1.out" }, s + d);
      a.tl.to(el, { scale: 0, autoAlpha: 0, duration: 0.22, ease: "back.in(2)" }, p.out + 0.12 + (i % 5) * 0.06);
    });
  },
  seCues: () => [
    { at: 0.0, name: "jump" },
    { at: 0.5, name: "pop" },
    { at: 0.65, name: "pop" },
  ],
});

export const zoomThrough = defineFrame({
  id: "transition/zoom-through",
  category: "transition",
  description: "アクセント色の円がカメラを突き抜けるズームスルー",
  propsDoc: "props なし",
  minDuration: 0.9,
  propsSchema: none,
  html: () =>
    `<div class="tr-zoom" style="position:absolute;left:50%;top:50%;width:200px;height:200px;margin:-100px 0 0 -100px;border-radius:50%;background:var(--ps-accent);"></div>`,
  timeline(a) {
    const s = a.ctx.start;
    const p = phases(a.ctx);
    a.tl.fromTo(a.q(".tr-zoom"), { scale: 0 }, { scale: 16, duration: 0.4, ease: "power3.in" }, s);
    a.tl.to(a.q(".tr-zoom"), { scale: 0, duration: 0.45, ease: "power3.out" }, p.out);
  },
  seCues: () => [{ at: 0.1, name: "whoosh" }],
});

export const colorFlood = defineFrame({
  id: "transition/color-flood",
  category: "transition",
  description: "下から色が満ちて上へ引いていく液体ワイプ",
  propsDoc: "props なし",
  minDuration: 1.0,
  propsSchema: none,
  html: () =>
    `<div class="tr-flood" style="position:absolute;left:0;right:0;bottom:0;height:105%;background:linear-gradient(0deg,var(--ps-accent),color-mix(in srgb, var(--ps-accent) 60%, #ffffff));border-radius:48% 52% 0 0 / 6% 8% 0 0;transform-origin:50% 100%;"></div>`,
  timeline(a) {
    const s = a.ctx.start;
    const p = phases(a.ctx);
    a.tl.fromTo(a.q(".tr-flood"), { scaleY: 0 }, { scaleY: 1, duration: 0.4, ease: "power2.inOut" }, s);
    a.tl.to(a.q(".tr-flood"), { y: -2100, duration: 0.5, ease: "power2.in" }, p.out);
  },
  seCues: () => [{ at: 0.0, name: "whoosh" }],
});

export const avatarJumpCut = defineFrame({
  id: "transition/avatar-jump-cut",
  category: "transition",
  description: "アバターが画面を大ジャンプで横切って場面を切り替える",
  propsDoc: "props なし (アバター画像を使用)",
  minDuration: 1.0,
  propsSchema: none,
  html: () =>
    `<img class="tr-ava" src="assets/avatar.png" alt="" style="position:absolute;left:50%;top:52%;width:640px;margin-left:-320px;filter:drop-shadow(0 20px 40px rgba(0,0,0,0.16));"/>
     <div class="tr-ava-fx" style="position:absolute;left:0;right:0;top:46%;text-align:center;font-size:110px;">✨　　✨</div>`,
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(
      a.q(".tr-ava"),
      { x: -1400, y: 300, rotation: -18, autoAlpha: 1 },
      { x: 0, y: -80, rotation: 0, duration: 0.42, ease: "power2.out" },
      s,
    );
    a.tl.to(a.q(".tr-ava"), { x: 1400, y: 320, rotation: 18, duration: 0.45, ease: "power2.in" }, s + 0.46);
    a.tl.fromTo(a.q(".tr-ava-fx"), { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1.2, duration: 0.25 }, s + 0.3);
    a.tl.to(a.q(".tr-ava-fx"), { autoAlpha: 0, duration: 0.25 }, s + 0.6);
  },
  seCues: () => [
    { at: 0.0, name: "jump" },
    { at: 0.42, name: "sparkle" },
  ],
});

export const transitionFrames = [
  pillBounceWipe,
  pastelConfetti,
  screenCrack,
  dotWipe,
  ribbonSweep,
  pageFlip,
  bubblePop,
  zoomThrough,
  colorFlood,
  avatarJumpCut,
];
