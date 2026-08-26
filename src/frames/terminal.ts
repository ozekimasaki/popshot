/** terminal: tcut 収録動画のカットイン 10種
 *
 * tcut の mp4 は compose が `#tcw-{index}` (ラッパー) + `#tcv-{index}` (video clip)
 * としてシーン div の兄弟に配置する (video_nested_in_timed_element 回避)。
 * フレーム側はラッパーの transform と、シーン div 内の装飾だけを動かす。
 */
import { z } from "zod";
import { defineFrame, type TerminalSlot } from "./types.ts";
import { esc, popIn, repeats, sceneExit, stage } from "./helpers.ts";

const termProps = z.object({
  /** 上に添えるラベル (任意) */
  label: z.string().default(""),
});

const CENTER: TerminalSlot = { x: 80, y: 520, w: 920, h: 690, radius: 28 };

function wrap(ctx: { index: number }): string {
  return `#tcw-${ctx.index}`;
}

/** スロットに合わせたラベルピル */
function labelHtml(label: string, slot: TerminalSlot): string {
  if (!label) return "";
  return `<div class="tm-label ps-pill" style="position:absolute;left:${slot.x + 30}px;top:${slot.y - 46}px;font-size:38px;z-index:7;">${esc(label)}</div>`;
}

export const slideIn = defineFrame({
  id: "terminal/slide-in",
  category: "terminal",
  description: "ターミナルが横からシュッとスライドインする基本カットイン",
  propsDoc: "label: 上部ラベル / terminal: 収録定義 (必須)",
  minDuration: 2.5,
  propsSchema: termProps,
  terminalSlot: CENTER,
  html: (p) => labelHtml(p.label, CENTER),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(wrap(a.ctx), { x: -1200, rotation: -4 }, { x: 0, rotation: 0, duration: 0.5, ease: "power3.out" }, s + 0.05);
    if (a.props.label) popIn(a, a.q(".tm-label"), s + 0.45);
    a.tl.to(wrap(a.ctx), { x: 1200, rotation: 3, duration: 0.3, ease: "power2.in" }, s + a.ctx.duration - 0.3);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "whoosh" },
    { at: 0.45, name: "pop" },
  ],
});

const PIP: TerminalSlot = { x: 48, y: 900, w: 640, h: 480, radius: 24 };

export const pipCorner = defineFrame({
  id: "terminal/pip-corner",
  category: "terminal",
  description: "説明テキストの下に小窓ターミナルがぽよんと浮かぶピクチャインピクチャ",
  propsDoc: "title: 上部の見出し / label: 小窓ラベル / terminal: 収録定義",
  minDuration: 2.5,
  propsSchema: z.object({
    title: z.string().default(""),
    label: z.string().default(""),
  }),
  terminalSlot: PIP,
  html: (p, ctx) =>
    `<div class="fx-stage" style="bottom:1100px;"><h1 class="ps-h2 tm-title">${esc(p.title || ctx.narration)}</h1></div>
     ${labelHtml(p.label, PIP)}`,
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".tm-title"), s + 0.05);
    a.tl.fromTo(
      wrap(a.ctx),
      { scale: 0, rotation: -8, transformOrigin: "20% 100%" },
      { scale: 1, rotation: 0, duration: 0.55, ease: "elastic.out(1, 0.6)" },
      s + 0.4,
    );
    if (a.props.label) popIn(a, a.q(".tm-label"), s + 0.8);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.4, name: "jump" },
  ],
});

export const zoomFocus = defineFrame({
  id: "terminal/zoom-focus",
  category: "terminal",
  description: "ターミナルが登場後にグッと寄って出力部分へフォーカスする",
  propsDoc: "label: ラベル / terminal: 収録定義",
  minDuration: 3.0,
  propsSchema: termProps,
  terminalSlot: CENTER,
  html: (p) => labelHtml(p.label, CENTER),
  timeline(a) {
    const s = a.ctx.start;
    const w = wrap(a.ctx);
    a.tl.fromTo(w, { autoAlpha: 0, scale: 0.7, y: 80 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.45, ease: "back.out(1.7)" }, s + 0.05);
    if (a.props.label) popIn(a, a.q(".tm-label"), s + 0.4);
    const mid = s + a.ctx.duration * 0.55;
    a.tl.to(w, { scale: 1.35, y: -60, transformOrigin: "50% 78%", duration: 0.6, ease: "power2.inOut" }, mid);
    a.tl.to(`${a.sel} .tm-label`, { autoAlpha: 0, duration: 0.25 }, mid);
    sceneExit(a);
  },
  seCues: (p, ctx) => [
    { at: 0.05, name: "pop" },
    { at: ctx.duration * 0.55, name: "whoosh" },
  ],
});

const CRT: TerminalSlot = { x: 110, y: 540, w: 860, h: 645, radius: 40 };

export const crtFrame = defineFrame({
  id: "terminal/crt-frame",
  category: "terminal",
  description: "レトロなブラウン管風ベゼルに収まったターミナルが点灯する",
  propsDoc: "label: ラベル / terminal: 収録定義",
  minDuration: 2.5,
  propsSchema: termProps,
  terminalSlot: CRT,
  html: (p) =>
    `<div class="tm-bezel" style="position:absolute;left:${CRT.x - 44}px;top:${CRT.y - 44}px;width:${CRT.w + 88}px;height:${CRT.h + 88}px;border-radius:64px;background:linear-gradient(160deg,#fdf5fa,#e2f2f7);box-shadow:var(--ps-shadow-2), inset 0 0 0 10px var(--ps-accent);z-index:3;"></div>
     <div class="tm-knob" style="position:absolute;left:${CRT.x + CRT.w - 40}px;top:${CRT.y + CRT.h + 52}px;width:80px;height:26px;border-radius:14px;background:var(--ps-accent);z-index:7;"></div>
     ${labelHtml(p.label, { ...CRT, y: CRT.y - 24 })}`,
  timeline(a) {
    const s = a.ctx.start;
    const w = wrap(a.ctx);
    a.tl.fromTo(a.q(".tm-bezel"), { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(1.8)" }, s + 0.05);
    // ブラウン管の点灯: 横線から開く
    a.tl.fromTo(w, { scaleY: 0.02, scaleX: 0.7, autoAlpha: 0 }, { scaleY: 1, scaleX: 1, autoAlpha: 1, duration: 0.4, ease: "power3.out" }, s + 0.35);
    a.tl.fromTo(a.q(".tm-knob"), { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, s + 0.6);
    if (a.props.label) popIn(a, a.q(".tm-label"), s + 0.7);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.35, name: "ding" },
  ],
});

const FLOAT: TerminalSlot = { x: 90, y: 560, w: 900, h: 640, radius: 0 };

export const floatingWindow = defineFrame({
  id: "terminal/floating-window",
  category: "terminal",
  description: "信号機ボタン付きウィンドウがふわふわ浮遊し続ける",
  propsDoc: "title: ウィンドウタイトル / terminal: 収録定義",
  minDuration: 2.5,
  propsSchema: z.object({ title: z.string().default("terminal") }),
  terminalSlot: { ...FLOAT, y: FLOAT.y + 76, h: FLOAT.h - 76, radius: 0 },
  html: (p) =>
    `<div class="tm-win" style="position:absolute;left:${FLOAT.x}px;top:${FLOAT.y}px;width:${FLOAT.w}px;height:76px;background:#fdf5fa;border-radius:26px 26px 0 0;box-shadow:var(--ps-shadow-1);display:flex;align-items:center;gap:16px;padding:0 30px;z-index:7;">
      <span style="width:26px;height:26px;border-radius:50%;background:#f08080;"></span>
      <span style="width:26px;height:26px;border-radius:50%;background:#f2d36b;"></span>
      <span style="width:26px;height:26px;border-radius:50%;background:#91dea9;"></span>
      <span class="ps-small" style="margin-left:14px;">${esc(p.title)}</span>
    </div>`,
  timeline(a) {
    const s = a.ctx.start;
    const w = wrap(a.ctx);
    const both = [w, `${a.sel} .tm-win`];
    a.tl.fromTo(both, { y: 900, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, ease: "back.out(1.4)" }, s + 0.05);
    const rep = repeats(1.0, a.ctx.duration - 1.0);
    a.tl.to(both, { y: -16, duration: 1.0, yoyo: true, repeat: rep, ease: "sine.inOut" }, s + 0.7);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "jump" },
    { at: 0.6, name: "pop" },
  ],
});

const SPLIT: TerminalSlot = { x: 80, y: 480, w: 920, h: 560, radius: 28 };

export const splitCompare = defineFrame({
  id: "terminal/split-compare",
  category: "terminal",
  description: "上にターミナル、下に解説カードが順番に決まる2段構成",
  propsDoc: "note: 下段の解説文 / label: ラベル / terminal: 収録定義",
  minDuration: 3.0,
  propsSchema: z.object({
    note: z.string().default(""),
    label: z.string().default(""),
  }),
  terminalSlot: SPLIT,
  html: (p, ctx) =>
    `${labelHtml(p.label, SPLIT)}
     <div class="tm-note ps-card" style="position:absolute;left:80px;top:${SPLIT.y + SPLIT.h + 40}px;width:920px;padding:40px 48px;font-size:46px;font-weight:700;line-height:1.6;border:5px solid var(--ps-accent);">${esc(p.note || ctx.narration)}</div>`,
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(wrap(a.ctx), { y: -800, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" }, s + 0.05);
    if (a.props.label) popIn(a, a.q(".tm-label"), s + 0.45);
    a.tl.fromTo(a.q(".tm-note"), { y: 500, autoAlpha: 0, scale: 0.9 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(1.8)" }, s + 0.7);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "whoosh" },
    { at: 0.7, name: "pop" },
  ],
});

const FULL: TerminalSlot = { x: 0, y: 420, w: 1080, h: 900, radius: 0 };

export const fullscreenTakeover = defineFrame({
  id: "terminal/fullscreen-takeover",
  category: "terminal",
  description: "小窓から一気に全幅へ拡大するテイクオーバー",
  propsDoc: "label: ラベル / terminal: 収録定義",
  minDuration: 3.0,
  propsSchema: termProps,
  terminalSlot: FULL,
  html: (p) => labelHtml(p.label, { ...FULL, x: 40, y: FULL.y + 20 }),
  timeline(a) {
    const s = a.ctx.start;
    const w = wrap(a.ctx);
    a.tl.fromTo(w, { scale: 0.4, y: 200, autoAlpha: 0, transformOrigin: "50% 50%" }, { scale: 0.6, y: 100, autoAlpha: 1, duration: 0.4, ease: "power2.out" }, s + 0.05);
    a.tl.to(w, { scale: 1, y: 0, duration: 0.45, ease: "back.out(1.2)" }, s + 0.7);
    if (a.props.label) popIn(a, a.q(".tm-label"), s + 1.1);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.7, name: "don" },
  ],
});

export const bounceDrop = defineFrame({
  id: "terminal/bounce-drop",
  category: "terminal",
  description: "ターミナルが上から落ちてバウンドし、埃のパーティクルが舞う",
  propsDoc: "label: ラベル / terminal: 収録定義",
  minDuration: 2.5,
  propsSchema: termProps,
  terminalSlot: CENTER,
  html: (p) =>
    `${labelHtml(p.label, CENTER)}
     <div class="tm-dust" style="position:absolute;left:${CENTER.x}px;top:${CENTER.y + CENTER.h - 20}px;width:${CENTER.w}px;text-align:center;font-size:60px;z-index:7;opacity:0;">💨　　💨</div>`,
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(wrap(a.ctx), { y: -1400 }, { y: 0, duration: 0.6, ease: "bounce.out" }, s + 0.05);
    a.tl.fromTo(a.q(".tm-dust"), { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1.4, duration: 0.3, ease: "power2.out" }, s + 0.42);
    a.tl.to(a.q(".tm-dust"), { autoAlpha: 0, y: -30, duration: 0.35 }, s + 0.72);
    if (a.props.label) popIn(a, a.q(".tm-label"), s + 0.8);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.42, name: "don" },
    { at: 0.8, name: "pop" },
  ],
});

export const glitchIn = defineFrame({
  id: "terminal/glitch-in",
  category: "terminal",
  description: "ノイズ混じりにガガッと乱れながら出現するグリッチ登場",
  propsDoc: "label: ラベル / terminal: 収録定義",
  minDuration: 2.5,
  propsSchema: termProps,
  terminalSlot: CENTER,
  html: (p) =>
    `${labelHtml(p.label, CENTER)}
     <div class="tm-glitch" style="position:absolute;left:${CENTER.x}px;top:${CENTER.y}px;width:${CENTER.w}px;height:${CENTER.h}px;border-radius:${CENTER.radius}px;background:var(--ps-accent);z-index:5;opacity:0;"></div>`,
  timeline(a) {
    const s = a.ctx.start;
    const w = wrap(a.ctx);
    const jitter = [22, -18, 12, -8, 4, 0];
    jitter.forEach((x, i) => {
      a.tl.fromTo(w, { x: i === 0 ? 40 : jitter[i - 1]!, autoAlpha: i % 2 === 0 ? 0.4 : 1 }, { x, autoAlpha: 1, duration: 0.06 }, s + 0.05 + i * 0.06);
      a.tl.fromTo(a.q(".tm-glitch"), { autoAlpha: 0.5, x: -x }, { autoAlpha: 0, x: 0, duration: 0.06 }, s + 0.05 + i * 0.06);
    });
    if (a.props.label) popIn(a, a.q(".tm-label"), s + 0.6);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "buzzer" },
    { at: 0.3, name: "click" },
    { at: 0.6, name: "pop" },
  ],
});

export const progressFollow = defineFrame({
  id: "terminal/progress-follow",
  category: "terminal",
  description: "ターミナル下の進捗バーがシーンの進行に合わせて満ちていく",
  propsDoc: "label: 進捗ラベル / terminal: 収録定義",
  minDuration: 3.0,
  propsSchema: z.object({ label: z.string().default("実行中…") }),
  terminalSlot: { ...CENTER, y: 480 },
  html: (p) =>
    `<div class="tm-bar-wrap" style="position:absolute;left:120px;top:${480 + CENTER.h + 60}px;width:840px;z-index:7;">
      <div class="ps-small tm-bar-label" style="margin-bottom:14px;text-align:left;">⏳ ${esc(p.label)}</div>
      <div style="height:34px;border-radius:20px;background:var(--ps-surface-gray);overflow:hidden;">
        <div class="tm-bar" style="height:100%;width:100%;border-radius:20px;background:var(--ps-accent);transform-origin:0 50%;"></div>
      </div>
     </div>`,
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(wrap(a.ctx), { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }, s + 0.05);
    popIn(a, a.q(".tm-bar-wrap"), s + 0.35);
    a.tl.fromTo(a.q(".tm-bar"), { scaleX: 0 }, { scaleX: 1, duration: Math.max(a.ctx.duration - 1.2, 0.8), ease: "power1.inOut" }, s + 0.6);
    a.tl.to(a.q(".tm-bar"), { backgroundColor: "#91dea9", duration: 0.2 }, s + a.ctx.duration - 0.55);
    sceneExit(a);
  },
  seCues: (p, ctx) => [
    { at: 0.05, name: "pop" },
    { at: ctx.duration - 0.55, name: "ding" },
  ],
});

export const terminalFrames = [
  slideIn,
  pipCorner,
  zoomFocus,
  crtFrame,
  floatingWindow,
  splitCompare,
  fullscreenTakeover,
  bounceDrop,
  glitchIn,
  progressFollow,
];
