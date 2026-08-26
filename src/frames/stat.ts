/** stat: 数字・グラフ 10種 */
import { z } from "zod";
import { defineFrame } from "./types.ts";
import { burstHtml, burstTl, countUp, esc, popIn, sceneExit, seeded, stage } from "./helpers.ts";

export const counterBlast = defineFrame({
  id: "stat/counter-blast",
  category: "stat",
  description: "巨大カウンターが爆走して目標値でドン!と着地する",
  propsDoc: "value: 目標値 / suffix: 単位 / label: 説明",
  minDuration: 2.4,
  propsSchema: z.object({
    value: z.number().default(100),
    suffix: z.string().default(""),
    label: z.string().default(""),
    decimals: z.number().int().min(0).max(2).default(0),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="st-num" style="font-size:240px;font-weight:900;color:var(--ps-accent);line-height:1;">0${esc(p.suffix)}</div>
       ${p.label || ctx.narration ? `<div class="ps-pill st-label" style="font-size:46px;">${esc(p.label || ctx.narration)}</div>` : ""}
       <div style="position:absolute;inset:0;">${burstHtml(12, seeded(ctx.seed), ["✦", "★"], { cy: 700 })}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".st-num"), s + 0.05, { scale: 0.4 });
    countUp(a, a.q(".st-num"), 0, a.props.value, s + 0.2, {
      duration: Math.min(1.2, a.ctx.duration * 0.5),
      suffix: a.props.suffix,
      decimals: a.props.decimals,
    });
    const landAt = s + 0.2 + Math.min(1.2, a.ctx.duration * 0.5);
    a.tl.fromTo(a.q(".st-num"), { scale: 1 }, { scale: 1.18, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" }, landAt);
    burstTl(a, landAt);
    popIn(a, a.q(".st-label"), landAt + 0.15);
    sceneExit(a);
  },
  seCues: (p, ctx) => [
    { at: 0.2, name: "drum" },
    { at: 0.2 + Math.min(1.2, ctx.duration * 0.5), name: "don" },
    { at: 0.4 + Math.min(1.2, ctx.duration * 0.5), name: "sparkle" },
  ],
});

export const gaugeFill = defineFrame({
  id: "stat/gauge-fill",
  category: "stat",
  description: "ゲージがぐんぐん満ちてパーセントが追いかけるプログレス演出",
  propsDoc: "percent: 0-100 / label: 説明",
  minDuration: 2.4,
  propsSchema: z.object({
    percent: z.number().min(0).max(100).default(80),
    label: z.string().default(""),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="st-pct" style="font-size:150px;font-weight:900;color:var(--ps-accent);">0%</div>
       <div style="width:100%;max-width:820px;height:64px;border-radius:40px;background:var(--ps-surface-gray);overflow:hidden;">
        <div class="st-bar" style="height:100%;width:100%;border-radius:40px;background:linear-gradient(90deg,var(--ps-accent),color-mix(in srgb, var(--ps-accent) 55%, #ffffff));transform-origin:0 50%;"></div>
       </div>
       ${p.label || ctx.narration ? `<div class="ps-small st-label" style="font-size:42px;">${esc(p.label || ctx.narration)}</div>` : ""}`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".st-pct"), s + 0.05);
    a.tl.fromTo(a.q(".st-bar"), { scaleX: 0 }, { scaleX: a.props.percent / 100, duration: 1.0, ease: "power2.out" }, s + 0.3);
    const obj = { v: 0 };
    a.tl.to(
      obj,
      {
        v: a.props.percent,
        duration: 1.0,
        ease: "power2.out",
        onUpdate: () => {
          const el = document.querySelector(a.q(".st-pct"));
          if (el) el.textContent = `${Math.round(obj.v)}%`;
        },
      },
      s + 0.3,
    );
    popIn(a, a.q(".st-label"), s + 1.35);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.3, name: "swipe" },
    { at: 1.3, name: "ding" },
  ],
});

export const pieSpin = defineFrame({
  id: "stat/pie-spin",
  category: "stat",
  description: "円グラフが回転しながら開いてシェアを見せつける",
  propsDoc: "percent: 主要シェア 0-100 / label: 説明",
  minDuration: 2.6,
  propsSchema: z.object({
    percent: z.number().min(0).max(100).default(70),
    label: z.string().default(""),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="st-pie-wrap" style="position:relative;width:560px;height:560px;">
        <div class="st-pie" style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--ps-accent) 0deg, var(--ps-surface-cyan-2) 0deg);box-shadow:var(--ps-shadow-1);"></div>
        <div class="st-pie-num" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:120px;font-weight:900;color:#ffffff;text-shadow:0 3px 12px rgba(0,0,0,0.18);">0%</div>
       </div>
       ${p.label || ctx.narration ? `<div class="ps-pill st-label" style="font-size:44px;">${esc(p.label || ctx.narration)}</div>` : ""}`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".st-pie-wrap"), { scale: 0, rotation: -140, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.55, ease: "back.out(1.5)" }, s + 0.05);
    const obj = { v: 0 };
    a.tl.to(
      obj,
      {
        v: a.props.percent,
        duration: 1.1,
        ease: "power2.inOut",
        onUpdate: () => {
          const pie = document.querySelector(a.q(".st-pie")) as HTMLElement | null;
          const num = document.querySelector(a.q(".st-pie-num"));
          const deg = (obj.v / 100) * 360;
          if (pie) pie.style.background = `conic-gradient(var(--ps-accent) ${deg}deg, var(--ps-surface-cyan-2) ${deg}deg)`;
          if (num) num.textContent = `${Math.round(obj.v)}%`;
        },
      },
      s + 0.6,
    );
    popIn(a, a.q(".st-label"), s + 1.75);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "whoosh" },
    { at: 1.7, name: "coin" },
  ],
});

export const barRace = defineFrame({
  id: "stat/bar-race",
  category: "stat",
  description: "横棒グラフが競争するように伸びて1位が輝く",
  propsDoc: "items: {name, value} の配列 / title: 見出し",
  minDuration: 2.8,
  propsSchema: z.object({
    items: z
      .array(z.object({ name: z.string(), value: z.number().min(0) }))
      .default([
        { name: "A", value: 90 },
        { name: "B", value: 55 },
      ]),
    title: z.string().default(""),
  }),
  html(p) {
    const max = Math.max(...p.items.map((i) => i.value), 1);
    return stage(
      `${p.title ? `<h2 class="ps-h2 st-title">${esc(p.title)}</h2>` : ""}
       <div style="display:flex;flex-direction:column;gap:30px;width:100%;max-width:860px;">
        ${p.items
          .map(
            (it, i) =>
              `<div>
                <div class="ps-small" style="text-align:left;margin-bottom:8px;">${esc(it.name)}</div>
                <div style="display:flex;align-items:center;gap:18px;">
                  <div style="flex:1;height:58px;border-radius:32px;background:var(--ps-surface-gray);overflow:hidden;">
                    <div class="st-race-${i}" style="height:100%;width:${((it.value / max) * 100).toFixed(1)}%;border-radius:32px;background:var(--ps-accent);transform-origin:0 50%;"></div>
                  </div>
                  <div class="st-rv-${i}" style="font-size:44px;font-weight:900;color:var(--ps-accent);min-width:130px;text-align:left;">0</div>
                </div>
              </div>`,
          )
          .join("")}
       </div>`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".st-title"), s + 0.05);
    a.props.items.forEach((it, i) => {
      const at = s + 0.4 + i * 0.2;
      a.tl.fromTo(a.q(`.st-race-${i}`), { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: "power2.out" }, at);
      countUp(a, a.q(`.st-rv-${i}`), 0, it.value, at, { duration: 1.0 });
    });
    const winner = a.props.items.reduce((best, it, i) => (it.value > a.props.items[best]!.value ? i : best), 0);
    a.tl.fromTo(a.q(`.st-race-${winner}`), { scale: 1 }, { scaleY: 1.25, duration: 0.15, yoyo: true, repeat: 1 }, s + 1.7);
    sceneExit(a);
  },
  seCues: (p) => [
    ...p.items.map((_, i) => ({ at: 0.4 + i * 0.2, name: "swipe" as const })),
    { at: 1.7, name: "tada" as const },
  ],
});

export const percentPop = defineFrame({
  id: "stat/percent-pop",
  category: "stat",
  description: "パーセントのチップがぽんぽん飛び出して並ぶ",
  propsDoc: "items: {label, percent} の配列",
  minDuration: 2.4,
  propsSchema: z.object({
    items: z
      .array(z.object({ label: z.string(), percent: z.number() }))
      .default([
        { label: "満足", percent: 92 },
        { label: "継続", percent: 88 },
      ]),
    title: z.string().default(""),
  }),
  html: (p) =>
    stage(
      `${p.title ? `<h2 class="ps-h2 st-title">${esc(p.title)}</h2>` : ""}
       <div style="display:flex;flex-wrap:wrap;gap:34px;justify-content:center;">
        ${p.items
          .map(
            (it, i) =>
              `<div class="ps-card st-chip-${i}" style="padding:42px 50px;border:6px solid var(--ps-accent);">
                <div class="st-cv-${i}" style="font-size:110px;font-weight:900;color:var(--ps-accent);line-height:1;">0%</div>
                <div class="ps-small" style="margin-top:14px;font-size:38px;">${esc(it.label)}</div>
              </div>`,
          )
          .join("")}
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".st-title"), s + 0.05);
    a.props.items.forEach((it, i) => {
      const at = s + 0.35 + i * 0.35;
      a.tl.fromTo(a.q(`.st-chip-${i}`), { scale: 0, autoAlpha: 0, rotation: i % 2 ? 6 : -6 }, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.45, ease: "back.out(2)" }, at);
      countUp(a, a.q(`.st-cv-${i}`), 0, it.percent, at + 0.2, { duration: 0.7, suffix: "%" });
    });
    sceneExit(a);
  },
  seCues: (p) => p.items.map((_, i) => ({ at: 0.35 + i * 0.35, name: "pop" as const })),
});

export const sparklineDraw = defineFrame({
  id: "stat/sparkline-draw",
  category: "stat",
  description: "折れ線グラフがシュルシュルと描画され右肩上がりを見せる",
  propsDoc: "values: 数値配列 / label: 説明",
  minDuration: 2.6,
  propsSchema: z.object({
    values: z.array(z.number()).default([10, 24, 18, 42, 38, 72, 96]),
    label: z.string().default(""),
  }),
  html(p, ctx) {
    const W = 860;
    const H = 520;
    const max = Math.max(...p.values, 1);
    const min = Math.min(...p.values, 0);
    const pts = p.values
      .map((v, i) => {
        const x = (i / (p.values.length - 1)) * (W - 80) + 40;
        const y = H - 60 - ((v - min) / (max - min || 1)) * (H - 140);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return stage(
      `<div class="ps-card" style="width:100%;max-width:900px;padding:30px;">
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;">
          <polyline class="st-line" points="${pts}" fill="none" stroke="var(--ps-accent)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
          ${p.values
            .map((v, i) => {
              const [x, y] = pts.split(" ")[i]!.split(",");
              return `<circle class="st-dot st-dot-${i}" cx="${x}" cy="${y}" r="16" fill="#ffffff" stroke="var(--ps-accent)" stroke-width="10"/>`;
            })
            .join("")}
        </svg>
       </div>
       ${p.label || ctx.narration ? `<div class="ps-pill st-label" style="font-size:44px;">${esc(p.label || ctx.narration)}</div>` : ""}`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".ps-card"), s + 0.05, { y: 60 });
    a.tl.fromTo(a.q(".st-line"), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" }, s + 0.4);
    const dots = document.querySelectorAll(`${a.sel} .st-dot`);
    dots.forEach((el, i) => {
      a.tl.fromTo(el, { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.25, ease: "back.out(3)" }, s + 0.4 + (1.2 * i) / Math.max(dots.length - 1, 1));
    });
    popIn(a, a.q(".st-label"), s + 1.7);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.4, name: "swipe" },
    { at: 1.0, name: "pop" },
    { at: 1.6, name: "coin" },
  ],
});

export const odometerRoll = defineFrame({
  id: "stat/odometer-roll",
  category: "stat",
  description: "数字がオドメーターのように縦回転して揃う",
  propsDoc: "value: 表示する整数 / label: 説明",
  minDuration: 2.4,
  propsSchema: z.object({
    value: z.number().int().min(0).default(2024),
    label: z.string().default(""),
  }),
  html(p, ctx) {
    const digits = String(p.value).split("");
    return stage(
      `<div style="display:flex;gap:16px;">
        ${digits
          .map(
            (d, i) =>
              `<div style="width:130px;height:190px;border-radius:24px;background:var(--ps-accent);overflow:hidden;position:relative;box-shadow:var(--ps-shadow-1);">
                <div class="st-reel st-reel-${i}" style="position:absolute;left:0;right:0;top:0;text-align:center;color:#fff;font-size:150px;font-weight:900;line-height:190px;">
                  ${Array.from({ length: 10 }, (_, k) => `<div style="height:190px;">${(k + Number(d) + 1) % 10}</div>`).join("")}
                  <div style="height:190px;">${d}</div>
                </div>
              </div>`,
          )
          .join("")}
       </div>
       ${p.label || ctx.narration ? `<div class="ps-pill st-label" style="font-size:44px;">${esc(p.label || ctx.narration)}</div>` : ""}`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    const digits = String(a.props.value).length;
    for (let i = 0; i < digits; i++) {
      a.tl.fromTo(
        a.q(`.st-reel-${i}`),
        { y: 0 },
        { y: -1900, duration: 0.9 + i * 0.25, ease: "power3.inOut" },
        s + 0.2,
      );
    }
    popIn(a, a.q(".st-label"), s + 1.6);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.2, name: "drum" },
    { at: 1.5, name: "ding" },
  ],
});

export const donutReveal = defineFrame({
  id: "stat/donut-reveal",
  category: "stat",
  description: "ドーナツリングがくるっと描かれ中央の数字がカウントする",
  propsDoc: "percent: 0-100 / label: 説明",
  minDuration: 2.6,
  propsSchema: z.object({
    percent: z.number().min(0).max(100).default(65),
    label: z.string().default(""),
  }),
  html: (p, ctx) =>
    stage(
      `<div style="position:relative;width:600px;height:600px;">
        <svg viewBox="0 0 200 200" style="width:100%;transform:rotate(-90deg);">
          <circle cx="100" cy="100" r="82" fill="none" stroke="var(--ps-surface-cyan-2)" stroke-width="26"/>
          <circle class="st-ring" cx="100" cy="100" r="82" fill="none" stroke="var(--ps-accent)" stroke-width="26" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>
        </svg>
        <div class="st-dn" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:130px;font-weight:900;color:var(--ps-accent);">0%</div>
       </div>
       ${p.label || ctx.narration ? `<div class="ps-pill st-label" style="font-size:44px;">${esc(p.label || ctx.narration)}</div>` : ""}`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".st-ring"), s + 0.05);
    a.tl.fromTo(a.q(".st-ring"), { strokeDashoffset: 100 }, { strokeDashoffset: 100 - a.props.percent, duration: 1.1, ease: "power2.inOut" }, s + 0.3);
    countUp(a, a.q(".st-dn"), 0, a.props.percent, s + 0.3, { duration: 1.1, suffix: "%" });
    popIn(a, a.q(".st-label"), s + 1.5);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.3, name: "swipe" },
    { at: 1.4, name: "coin" },
  ],
});

export const bigNumberSlam = defineFrame({
  id: "stat/big-number-slam",
  category: "stat",
  description: "巨大数字が画面を割る勢いで叩き込まれ地響きが走る",
  propsDoc: "value: 表示テキスト (数字+単位) / label: 説明",
  minDuration: 2.0,
  propsSchema: z.object({
    value: z.string().default("10倍"),
    label: z.string().default(""),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="st-slam" style="font-size:260px;font-weight:900;color:var(--ps-accent);line-height:1;">${esc(p.value)}</div>
       <div class="st-crack" style="position:absolute;left:0;right:0;top:56%;text-align:center;font-size:90px;opacity:0;">💥</div>
       ${p.label || ctx.narration ? `<div class="ps-small st-label" style="font-size:44px;">${esc(p.label || ctx.narration)}</div>` : ""}`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".st-slam"), { scale: 5, autoAlpha: 0, rotation: 6 }, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.3, ease: "power4.in" }, s + 0.1);
    a.tl.fromTo(a.sel, { y: 0 }, { y: 18, duration: 0.05, yoyo: true, repeat: 5 }, s + 0.4);
    a.tl.fromTo(a.q(".st-crack"), { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1.5, duration: 0.25, ease: "power2.out" }, s + 0.4);
    a.tl.to(a.q(".st-crack"), { autoAlpha: 0, duration: 0.3 }, s + 0.85);
    popIn(a, a.q(".st-label"), s + 0.75);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.1, name: "whoosh" },
    { at: 0.4, name: "don" },
  ],
});

export const compareScale = defineFrame({
  id: "stat/compare-scale",
  category: "stat",
  description: "天秤が重い方へグイッと傾いて勝敗を見せる比較演出",
  propsDoc: "left/right: {label, value}",
  minDuration: 2.6,
  propsSchema: z.object({
    left: z.object({ label: z.string(), value: z.number() }).default({ label: "A", value: 30 }),
    right: z.object({ label: z.string(), value: z.number() }).default({ label: "B", value: 70 }),
  }),
  html: (p) =>
    stage(
      `<div class="st-beam-wrap" style="position:relative;width:900px;height:600px;">
        <div class="st-beam" style="position:absolute;left:50px;right:50px;top:200px;height:20px;border-radius:12px;background:var(--ps-text);transform-origin:50% 50%;"></div>
        <div class="st-post" style="position:absolute;left:50%;top:210px;width:22px;height:300px;margin-left:-11px;border-radius:12px;background:var(--ps-text);"></div>
        <div class="st-pan-l ps-card" style="position:absolute;left:0px;top:260px;width:330px;padding:34px;border:6px solid var(--ps-cyan);text-align:center;">
          <div style="font-size:46px;font-weight:900;">${esc(p.left.label)}</div>
          <div style="font-size:72px;font-weight:900;color:var(--ps-cyan);">${p.left.value}</div>
        </div>
        <div class="st-pan-r ps-card" style="position:absolute;right:0px;top:260px;width:330px;padding:34px;border:6px solid var(--ps-pink);text-align:center;">
          <div style="font-size:46px;font-weight:900;">${esc(p.right.label)}</div>
          <div style="font-size:72px;font-weight:900;color:var(--ps-pink);">${p.right.value}</div>
        </div>
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".st-beam-wrap"), s + 0.05, { y: 80 });
    const heavier = a.props.right.value >= a.props.left.value ? 1 : -1;
    const tilt = 9 * heavier;
    a.tl.to(a.q(".st-beam"), { rotation: tilt, duration: 0.6, ease: "elastic.out(1, 0.45)" }, s + 0.8);
    a.tl.to(a.q(".st-pan-l"), { y: heavier > 0 ? -52 : 52, duration: 0.6, ease: "elastic.out(1, 0.45)" }, s + 0.8);
    a.tl.to(a.q(".st-pan-r"), { y: heavier > 0 ? 52 : -52, duration: 0.6, ease: "elastic.out(1, 0.45)" }, s + 0.8);
    const winSel = heavier > 0 ? ".st-pan-r" : ".st-pan-l";
    a.tl.fromTo(a.q(winSel), { scale: 1 }, { scale: 1.1, duration: 0.2, yoyo: true, repeat: 1 }, s + 1.5);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.8, name: "don" },
    { at: 1.5, name: "ding" },
  ],
});

export const statFrames = [
  counterBlast,
  gaugeFill,
  pieSpin,
  barRace,
  percentPop,
  sparklineDraw,
  odometerRoll,
  donutReveal,
  bigNumberSlam,
  compareScale,
];
