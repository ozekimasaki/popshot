/** text: キネティックタイポグラフィ 10種 */
import { z } from "zod";
import { defineFrame } from "./types.ts";
import { burstHtml, burstTl, chars, esc, popChars, repeats, sceneExit, seeded, stage } from "./helpers.ts";

const textProps = z.object({
  text: z.string().default(""),
  /** 強調ワード (text 内に含まれる部分文字列) */
  emphasis: z.string().default(""),
});

/** emphasis 部分だけ別クラスを付けて分解する (強調ワードは途中改行させない) */
function splitEmphasis(text: string, emphasis: string, cls: string, emCls: string): string {
  if (!emphasis || !text.includes(emphasis)) return chars(text, cls);
  const idx = text.indexOf(emphasis);
  return (
    chars(text.slice(0, idx), cls) +
    `<span style="white-space:nowrap;display:inline-block;">${chars(emphasis, `${cls} ${emCls}`)}</span>` +
    chars(text.slice(idx + emphasis.length), cls)
  );
}

export const charPop = defineFrame({
  id: "text/char-pop",
  category: "text",
  description: "テキストが1文字ずつ弾んで登場し、強調ワードはアクセント色ピルで跳ねる",
  propsDoc: "text: 本文 / emphasis: 強調ワード",
  minDuration: 1.8,
  propsSchema: textProps,
  html: (p, ctx) =>
    stage(
      `<h1 class="ps-h1" style="line-height:1.5;">${splitEmphasis(p.text || ctx.narration, p.emphasis, "tx-ch", "tx-em")}</h1>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popChars(a, "tx-ch", s + 0.1, { stagger: 0.045 });
    const ems = document.querySelectorAll(`${a.sel} .tx-em`);
    if (ems.length > 0) {
      a.tl.to(ems, { color: "var(--ps-accent)", scale: 1.22, duration: 0.22, ease: "back.out(3)", stagger: 0.02 }, s + 0.75);
      a.tl.to(ems, { scale: 1.08, duration: 0.2 }, s + 1.0);
    }
    sceneExit(a);
  },
  seCues: (p, ctx) => [
    { at: 0.1, name: "pop" },
    ...(p.emphasis ? [{ at: 0.75, name: "coin" as const }] : []),
  ],
});

export const karaokeHighlight = defineFrame({
  id: "text/karaoke-highlight",
  category: "text",
  description: "ナレーションに合わせて文字がカラオケ風にアクセント色へ染まっていく",
  propsDoc: "text: 本文 (省略時ナレーション)",
  minDuration: 1.5,
  propsSchema: textProps,
  html: (p, ctx) =>
    stage(
      `<h1 class="ps-h2" style="font-size:76px;line-height:1.6;">${chars(p.text || ctx.narration, "tx-ch")}</h1>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    const els = document.querySelectorAll(`${a.sel} .tx-ch`);
    const moras = a.ctx.moras;
    const spanStart = moras.length > 0 ? moras[0]!.start : 0.1;
    const last = moras.length > 0 ? moras[moras.length - 1]! : null;
    const spanEnd = last ? last.start + last.duration : a.ctx.duration - 0.4;
    a.tl.fromTo(els, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.015 }, s + 0.05);
    els.forEach((el, i) => {
      const t = s + spanStart + ((spanEnd - spanStart) * i) / Math.max(els.length, 1);
      a.tl.to(el, { color: "var(--ps-accent)", scale: 1.12, duration: 0.1 }, t);
      a.tl.to(el, { scale: 1, duration: 0.14 }, t + 0.1);
    });
    sceneExit(a);
  },
  seCues: () => [{ at: 0.05, name: "pop" }],
});

export const wordExplosion = defineFrame({
  id: "text/word-explosion",
  category: "text",
  description: "強調ワードが爆発的に拡大してパーティクルを撒き散らす",
  propsDoc: "text: 前置き / emphasis: 爆発させるワード",
  minDuration: 2.0,
  propsSchema: textProps,
  html(p, ctx) {
    const boom = p.emphasis || "ここ重要";
    const fs = Math.min(150, Math.floor(900 / Math.max([...boom].length, 1)));
    return stage(
      `<h2 class="ps-h2 tx-lead">${esc(p.text || ctx.narration)}</h2>
       <div class="tx-boom" style="font-size:${fs}px;font-weight:900;color:var(--ps-accent);line-height:1.15;white-space:nowrap;">${esc(boom)}</div>
       <div style="position:absolute;inset:0;">${burstHtml(18, seeded(ctx.seed), ["★", "✦", "💥"], { cy: 900, spread: 520 })}</div>`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".tx-lead"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power3.out" }, s + 0.05);
    a.tl.fromTo(
      a.q(".tx-boom"),
      { scale: 0, autoAlpha: 0, rotation: -10 },
      { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.4, ease: "back.out(1.6)" },
      s + 0.55,
    );
    a.tl.fromTo(a.sel, { x: 0 }, { x: 12, duration: 0.04, yoyo: true, repeat: 5 }, s + 0.9);
    burstTl(a, s + 0.9);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.55, name: "whoosh" },
    { at: 0.9, name: "don" },
  ],
});

export const verticalDrop = defineFrame({
  id: "text/vertical-drop",
  category: "text",
  description: "文字が上から次々に落下してバウンドで整列する",
  propsDoc: "text: 本文",
  minDuration: 1.8,
  propsSchema: textProps,
  html: (p, ctx) =>
    stage(`<h1 class="ps-h1" style="line-height:1.5;">${chars(p.text || ctx.narration, "tx-ch")}</h1>`),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(
      `${a.sel} .tx-ch`,
      { y: -700, autoAlpha: 0, rotation: -12 },
      { y: 0, autoAlpha: 1, rotation: 0, duration: 0.55, ease: "bounce.out", stagger: 0.05 },
      s + 0.1,
    );
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.3, name: "pop" },
    { at: 0.6, name: "pop" },
    { at: 0.9, name: "pop" },
  ],
});

export const neonPulse = defineFrame({
  id: "text/neon-pulse",
  category: "text",
  description: "パステルネオンの光彩がドクンドクンと脈打つ",
  propsDoc: "text: 本文",
  minDuration: 2.0,
  propsSchema: textProps,
  html: (p, ctx) => {
    const t = esc(p.text || ctx.narration);
    return stage(
      `<div style="position:relative;">
        <h1 class="ps-h1 tx-glow" style="position:absolute;inset:0;color:var(--ps-accent);filter:blur(22px);">${t}</h1>
        <h1 class="ps-h1 tx-main" style="position:relative;color:var(--ps-accent);">${t}</h1>
      </div>`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".tx-main"), { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, s + 0.1);
    const rep = repeats(0.5, a.ctx.duration - 0.6);
    a.tl.fromTo(a.q(".tx-glow"), { autoAlpha: 0.15, scale: 0.98 }, { autoAlpha: 0.9, scale: 1.04, duration: 0.5, yoyo: true, repeat: rep, ease: "sine.inOut" }, s + 0.4);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.1, name: "pop" },
    { at: 0.5, name: "sparkle" },
  ],
});

export const waveText = defineFrame({
  id: "text/wave-text",
  category: "text",
  description: "文字が波打ちながら泳ぎ続けるゆるふわモーション",
  propsDoc: "text: 本文",
  minDuration: 1.8,
  propsSchema: textProps,
  html: (p, ctx) =>
    stage(`<h1 class="ps-h1" style="line-height:1.5;">${chars(p.text || ctx.narration, "tx-ch")}</h1>`),
  timeline(a) {
    const s = a.ctx.start;
    const els = document.querySelectorAll(`${a.sel} .tx-ch`);
    a.tl.fromTo(els, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "back.out(2)", stagger: 0.035 }, s + 0.1);
    const waveStart = s + 0.7;
    const rep = repeats(0.45, a.ctx.start + a.ctx.duration - waveStart - 0.3);
    els.forEach((el, i) => {
      a.tl.fromTo(el, { y: 0 }, { y: -22, duration: 0.45, yoyo: true, repeat: rep, ease: "sine.inOut" }, waveStart + i * 0.06);
    });
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.1, name: "pop" },
    { at: 0.7, name: "sparkle" },
  ],
});

export const stampPress = defineFrame({
  id: "text/stamp-press",
  category: "text",
  description: "ハンコのようにドンと押される承認スタンプ演出",
  propsDoc: "text: 前置き / emphasis: スタンプ文言",
  minDuration: 2.0,
  propsSchema: textProps,
  html: (p, ctx) =>
    stage(
      `<h2 class="ps-h2 tx-lead">${esc(p.text || ctx.narration)}</h2>
       <div class="tx-stamp" style="border:10px solid var(--ps-accent);color:var(--ps-accent);border-radius:32px;padding:26px 56px;font-size:96px;font-weight:900;">${esc(p.emphasis || "認定")}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".tx-lead"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35 }, s + 0.05);
    a.tl.fromTo(
      a.q(".tx-stamp"),
      { scale: 3.4, autoAlpha: 0, rotation: 14 },
      { scale: 1, autoAlpha: 1, rotation: -6, duration: 0.28, ease: "power4.in" },
      s + 0.6,
    );
    a.tl.fromTo(a.sel, { x: 0 }, { x: 10, duration: 0.04, yoyo: true, repeat: 5 }, s + 0.88);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.88, name: "don" },
  ],
});

export const underlineSweep = defineFrame({
  id: "text/underline-sweep",
  category: "text",
  description: "本文の下をアクセントのマーカー線がシュッと走り抜ける",
  propsDoc: "text: 本文 / emphasis: マーカーを引くワード",
  minDuration: 1.8,
  propsSchema: textProps,
  html: (p, ctx) => {
    const text = p.text || ctx.narration;
    const em = p.emphasis && text.includes(p.emphasis) ? p.emphasis : text;
    const idx = text.indexOf(em);
    return stage(
      `<h1 class="ps-h1" style="line-height:1.6;">${esc(text.slice(0, idx))}<span class="tx-mark" style="position:relative;display:inline-block;"><span class="tx-line" style="position:absolute;left:0;right:0;bottom:6px;height:0.42em;background:color-mix(in srgb, var(--ps-accent) 45%, transparent);border-radius:12px;transform-origin:0 50%;"></span><span style="position:relative;">${esc(em)}</span></span>${esc(text.slice(idx + em.length))}</h1>`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".fx-stage"), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }, s + 0.05);
    a.tl.fromTo(a.q(".tx-line"), { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.out" }, s + 0.6);
    a.tl.fromTo(a.q(".tx-mark"), { scale: 1 }, { scale: 1.08, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out" }, s + 0.95);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.6, name: "swipe" },
    { at: 0.95, name: "coin" },
  ],
});

export const splitFlap = defineFrame({
  id: "text/split-flap",
  category: "text",
  description: "空港の反転フラップ板のように文字がパタパタめくれて揃う",
  propsDoc: "text: 本文",
  minDuration: 2.0,
  propsSchema: textProps,
  html: (p, ctx) =>
    stage(
      `<h1 class="ps-h1" style="line-height:1.5;perspective:800px;">${chars(p.text || ctx.narration, "tx-ch")}</h1>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(
      `${a.sel} .tx-ch`,
      { rotationX: -95, autoAlpha: 0, transformOrigin: "50% 0%" },
      { rotationX: 0, autoAlpha: 1, duration: 0.5, ease: "back.out(1.6)", stagger: 0.06 },
      s + 0.1,
    );
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.15, name: "click" },
    { at: 0.35, name: "click" },
    { at: 0.55, name: "click" },
    { at: 0.75, name: "click" },
  ],
});

export const gradientSlide = defineFrame({
  id: "text/gradient-slide",
  category: "text",
  description: "パステル虹色のグラデーションが文字の中を流れ続ける",
  propsDoc: "text: 本文",
  minDuration: 2.0,
  propsSchema: textProps,
  html: (p, ctx) =>
    stage(
      `<h1 class="ps-h1 tx-grad" style="background:linear-gradient(90deg,#8bd0dd,#e383a8,#cda1dc,#f2d36b,#8bd0dd);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.4;">${esc(p.text || ctx.narration)}</h1>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".tx-grad"), { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, s + 0.1);
    a.tl.fromTo(
      a.q(".tx-grad"),
      { backgroundPosition: "0% 50%" },
      { backgroundPosition: "300% 50%", duration: Math.max(a.ctx.duration - 0.6, 0.5), ease: "none" },
      s + 0.5,
    );
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.1, name: "pop" },
    { at: 0.55, name: "sparkle" },
  ],
});

export const textFrames = [
  charPop,
  karaokeHighlight,
  wordExplosion,
  verticalDrop,
  neonPulse,
  waveText,
  stampPress,
  underlineSweep,
  splitFlap,
  gradientSlide,
];
