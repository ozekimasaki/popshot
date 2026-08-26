/** code: コード表示 10種 */
import { z } from "zod";
import { defineFrame } from "./types.ts";
import { esc, highlightCode, popIn, sceneExit, stage } from "./helpers.ts";

const codeProps = z.object({
  code: z.string().default("console.log('hello')"),
  /** カード上部のタイトル (ファイル名など) */
  title: z.string().default(""),
  /** 強調する行番号 (1始まり) */
  highlight: z.number().int().min(1).optional(),
});

function codeCard(p: { code: string; title: string }, extraCls = "", innerCls = "cd-line"): string {
  return `<div class="ps-code cd-card ${extraCls}" style="width:100%;position:relative;">
    ${p.title ? `<div class="ps-small" style="color:#cbbfd9;margin-bottom:18px;">📄 ${esc(p.title)}</div>` : ""}
    <div class="cd-body">${highlightCode(p.code, innerCls)}</div>
  </div>`;
}

export const typingReveal = defineFrame({
  id: "code/typing-reveal",
  category: "code",
  description: "コードが行ごとにタイプされていき、完了でキラッと光る",
  propsDoc: "code: コード / title: ファイル名 (任意)",
  minDuration: 2.5,
  propsSchema: codeProps,
  html: (p) => stage(codeCard(p)),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".cd-card"), s + 0.05, { y: 60 });
    const lines = document.querySelectorAll(`${a.sel} .cd-line`);
    const avail = Math.max(a.ctx.duration - 1.4, 0.6);
    const per = Math.min(0.4, avail / Math.max(lines.length, 1));
    lines.forEach((el, i) => {
      a.tl.fromTo(el, { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.22, ease: "power2.out" }, s + 0.45 + i * per);
    });
    a.tl.fromTo(a.q(".cd-card"), { scale: 1 }, { scale: 1.02, duration: 0.15, yoyo: true, repeat: 1 }, s + 0.5 + lines.length * per);
    sceneExit(a);
  },
  seCues(p, ctx) {
    const n = p.code.split("\n").length;
    const avail = Math.max(ctx.duration - 1.4, 0.6);
    const per = Math.min(0.4, avail / Math.max(n, 1));
    const cues = Array.from({ length: Math.min(n, 6) }, (_, i) => ({
      at: 0.45 + i * per * Math.ceil(n / Math.min(n, 6)),
      name: "click" as const,
    }));
    return [...cues, { at: 0.55 + n * per, name: "sparkle" as const }];
  },
});

export const lineZoom = defineFrame({
  id: "code/line-zoom",
  category: "code",
  description: "注目行がグッと拡大され、他の行が霞んで視線を誘導する",
  propsDoc: "code: コード / highlight: 拡大する行番号 (1始まり)",
  minDuration: 2.4,
  propsSchema: codeProps,
  html: (p) => stage(codeCard(p)),
  timeline(a) {
    const s = a.ctx.start;
    const hl = (a.props.highlight ?? 1) - 1;
    popIn(a, a.q(".cd-card"), s + 0.05, { y: 60 });
    const lines = document.querySelectorAll(`${a.sel} .cd-line`);
    lines.forEach((el, i) => {
      if (i === hl) {
        a.tl.fromTo(el, { scale: 1, transformOrigin: "0% 50%" }, { scale: 1.22, duration: 0.35, ease: "back.out(2)" }, s + 0.8);
        a.tl.fromTo(
          el,
          { backgroundColor: "rgba(0,0,0,0)" },
          { backgroundColor: "color-mix(in srgb, var(--ps-accent) 38%, transparent)", borderRadius: 12, duration: 0.3 },
          s + 0.8,
        );
      } else {
        a.tl.to(el, { opacity: 0.28, duration: 0.35 }, s + 0.8);
      }
    });
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "whoosh" },
    { at: 0.8, name: "coin" },
  ],
});

export const diffBeforeAfter = defineFrame({
  id: "code/diff-before-after",
  category: "code",
  description: "赤の旧コードが打ち消され、緑の新コードがスライドインする差分表示",
  propsDoc: "before: 旧コード / after: 新コード",
  minDuration: 2.8,
  propsSchema: z.object({
    before: z.string().default("var x = 1"),
    after: z.string().default("const x = 1"),
    title: z.string().default(""),
  }),
  html: (p) =>
    stage(
      `<div class="ps-code" style="width:100%;">
        ${p.title ? `<div class="ps-small" style="color:#cbbfd9;margin-bottom:18px;">📄 ${esc(p.title)}</div>` : ""}
        <div class="cd-old" style="background:rgba(240,128,128,0.22);border-radius:12px;padding:6px 14px;">${highlightCode(p.before, "cd-old-line")}</div>
        <div class="cd-new" style="background:rgba(145,222,169,0.22);border-radius:12px;padding:6px 14px;margin-top:14px;">${highlightCode(p.after, "cd-new-line")}</div>
      </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".ps-code"), s + 0.05, { y: 60 });
    a.tl.fromTo(a.q(".cd-old"), { autoAlpha: 0, x: -40 }, { autoAlpha: 1, x: 0, duration: 0.35 }, s + 0.5);
    a.tl.to(a.q(".cd-old"), { opacity: 0.35, duration: 0.3 }, s + 1.3);
    a.tl.fromTo(
      a.q(".cd-old"),
      { textDecoration: "none" },
      { textDecoration: "line-through", duration: 0.01 },
      s + 1.3,
    );
    a.tl.fromTo(a.q(".cd-new"), { autoAlpha: 0, x: 60, scale: 0.94 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.4, ease: "back.out(1.8)" }, s + 1.5);
    a.tl.fromTo(a.q(".cd-new"), { scale: 1 }, { scale: 1.04, duration: 0.15, yoyo: true, repeat: 1 }, s + 2.0);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.5, name: "swipe" },
    { at: 1.3, name: "buzzer" },
    { at: 1.5, name: "pop" },
    { at: 2.0, name: "ding" },
  ],
});

export const syntaxRainbow = defineFrame({
  id: "code/syntax-rainbow",
  category: "code",
  description: "トークンの色ごとに波状に着色されていくシンタックスハイライトショー",
  propsDoc: "code: コード / title: ファイル名",
  minDuration: 2.4,
  propsSchema: codeProps,
  html: (p) => stage(codeCard(p)),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".cd-card"), s + 0.05, { y: 60 });
    const groups = ["tok-k", "tok-s", "tok-f", "tok-n", "tok-c"];
    groups.forEach((g, i) => {
      const els = document.querySelectorAll(`${a.sel} .${g}`);
      if (els.length === 0) return;
      a.tl.fromTo(
        els,
        { scale: 1 },
        { scale: 1.25, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out", stagger: 0.03 },
        s + 0.6 + i * 0.3,
      );
    });
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.6, name: "pop" },
    { at: 0.9, name: "pop" },
    { at: 1.2, name: "pop" },
    { at: 1.5, name: "sparkle" },
  ],
});

export const errorShake = defineFrame({
  id: "code/error-shake",
  category: "code",
  description: "コードカードが赤く点滅しながら激しく震えるエラー演出",
  propsDoc: "code: コード / message: エラーメッセージ",
  minDuration: 2.2,
  propsSchema: z.object({
    code: z.string().default("undefined is not a function"),
    message: z.string().default("Error!"),
    title: z.string().default(""),
  }),
  html: (p) =>
    stage(
      `${codeCard({ code: p.code, title: p.title })}
       <div class="ps-badge cd-err" style="background:var(--ps-coral);font-size:48px;">💥 ${esc(p.message)}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".cd-card"), s + 0.05, { y: 60 });
    a.tl.fromTo(
      a.q(".cd-card"),
      { boxShadow: "0 8px 26px rgba(0,0,0,0.10)" },
      { boxShadow: "0 0 0 8px rgba(240,128,128,0.65)", duration: 0.18, yoyo: true, repeat: 3 },
      s + 0.7,
    );
    a.tl.fromTo(a.q(".cd-card"), { x: 0 }, { x: 14, duration: 0.045, yoyo: true, repeat: 9 }, s + 0.7);
    a.tl.fromTo(
      a.q(".cd-err"),
      { scale: 3, autoAlpha: 0, rotation: 8 },
      { scale: 1, autoAlpha: 1, rotation: -3, duration: 0.3, ease: "power4.in" },
      s + 1.15,
    );
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.7, name: "buzzer" },
    { at: 1.15, name: "don" },
  ],
});

export const copyPasteFlash = defineFrame({
  id: "code/copy-paste-flash",
  category: "code",
  description: "コードが一瞬でペーストされ「コピペOK」ピルがぽよんと出る",
  propsDoc: "code: コード / label: ピルの文言",
  minDuration: 2.0,
  propsSchema: z.object({
    code: z.string().default(""),
    label: z.string().default("コピペOK"),
    title: z.string().default(""),
  }),
  html: (p) =>
    stage(
      `${codeCard({ code: p.code, title: p.title })}
       <div class="ps-pill cd-copied" style="font-size:44px;">📋 ${esc(p.label)}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".cd-card"), { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.12, ease: "power1.out" }, s + 0.1);
    a.tl.fromTo(
      a.q(".cd-card"),
      { backgroundColor: "#8bd0dd" },
      { backgroundColor: "#4a4458", duration: 0.5, ease: "power2.out" },
      s + 0.12,
    );
    a.tl.fromTo(
      a.q(".cd-copied"),
      { scale: 0, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.45, ease: "elastic.out(1, 0.5)" },
      s + 0.75,
    );
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.1, name: "click" },
    { at: 0.75, name: "coin" },
  ],
});

export const scrollFollow = defineFrame({
  id: "code/scroll-follow",
  category: "code",
  description: "長いコードがカード内をゆっくりスクロールし続ける",
  propsDoc: "code: 長めのコード / title: ファイル名",
  minDuration: 3.0,
  propsSchema: codeProps,
  html: (p) =>
    stage(
      `<div class="ps-code cd-card" style="width:100%;max-height:900px;overflow:hidden;position:relative;">
        ${p.title ? `<div class="ps-small" style="color:#cbbfd9;margin-bottom:18px;">📄 ${esc(p.title)}</div>` : ""}
        <div class="cd-scroll">${highlightCode(p.code, "cd-line")}</div>
      </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".cd-card"), s + 0.05, { y: 60 });
    const lines = a.props.code.split("\n").length;
    const scrollPx = Math.max(0, lines * 56 - 700);
    if (scrollPx > 0) {
      a.tl.fromTo(
        a.q(".cd-scroll"),
        { y: 0 },
        { y: -scrollPx, duration: Math.max(a.ctx.duration - 1.2, 0.8), ease: "none" },
        s + 0.7,
      );
    }
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "whoosh" },
    { at: 0.7, name: "swipe" },
  ],
});

export const bracketHighlight = defineFrame({
  id: "code/bracket-highlight",
  category: "code",
  description: "対応する括弧のペアが順番にぽこぽこ光って構造を見せる",
  propsDoc: "code: コード",
  minDuration: 2.4,
  propsSchema: codeProps,
  html(p) {
    const marked = esc(p.code).replace(/([(){}[\]])/g, '<span class="cd-br" style="display:inline-block;font-weight:900;">$1</span>');
    const lines = marked.split("\n").map((l) => `<div class="cd-line">${l || "&nbsp;"}</div>`).join("");
    return stage(
      `<div class="ps-code cd-card" style="width:100%;">
        ${p.title ? `<div class="ps-small" style="color:#cbbfd9;margin-bottom:18px;">📄 ${esc(p.title)}</div>` : ""}
        ${lines}
      </div>`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".cd-card"), s + 0.05, { y: 60 });
    const brs = document.querySelectorAll(`${a.sel} .cd-br`);
    brs.forEach((el, i) => {
      a.tl.fromTo(
        el,
        { scale: 1, color: "#f4eef7" },
        { scale: 1.7, color: "#f2d36b", duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out" },
        s + 0.7 + i * 0.12,
      );
    });
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.7, name: "click" },
    { at: 0.94, name: "click" },
    { at: 1.18, name: "click" },
  ],
});

export const minimapPan = defineFrame({
  id: "code/minimap-pan",
  category: "code",
  description: "ミニマップのビューポート枠が移動して今どこを見ているかを示す",
  propsDoc: "code: コード / title: ファイル名",
  minDuration: 2.6,
  propsSchema: codeProps,
  html: (p) =>
    stage(
      `<div style="display:flex;gap:20px;width:100%;align-items:stretch;">
        <div class="ps-code cd-card" style="flex:1;">${highlightCode(p.code, "cd-line")}</div>
        <div style="flex:none;width:110px;background:#5a5468;border-radius:20px;position:relative;padding:16px 12px;">
          ${p.code.split("\n").map(() => `<div style="height:10px;border-radius:5px;background:#8d84a0;margin-bottom:8px;"></div>`).join("")}
          <div class="cd-vp" style="position:absolute;left:6px;right:6px;top:10px;height:70px;border:4px solid var(--ps-accent);border-radius:12px;"></div>
        </div>
      </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".cd-card"), s + 0.05, { y: 60 });
    popIn(a, a.q(".cd-vp"), s + 0.5, { scale: 0.5 });
    const travel = Math.min(a.props.code.split("\n").length * 18, 300);
    a.tl.to(a.q(".cd-vp"), { y: travel, duration: Math.max(a.ctx.duration - 1.4, 0.8), ease: "power1.inOut" }, s + 0.8);
    const lines = document.querySelectorAll(`${a.sel} .cd-line`);
    lines.forEach((el, i) => {
      a.tl.fromTo(el, { opacity: 0.4 }, { opacity: 1, duration: 0.25 }, s + 0.8 + (i * (a.ctx.duration - 1.6)) / Math.max(lines.length, 1));
    });
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.5, name: "pop" },
    { at: 0.8, name: "swipe" },
  ],
});

export const codeToOutput = defineFrame({
  id: "code/code-to-output",
  category: "code",
  description: "コード→矢印→実行結果の順で現れる因果表示",
  propsDoc: "code: コード / output: 実行結果",
  minDuration: 2.8,
  propsSchema: z.object({
    code: z.string().default(""),
    output: z.string().default(""),
    title: z.string().default(""),
  }),
  html: (p) =>
    stage(
      `${codeCard({ code: p.code, title: p.title })}
       <div class="cd-arrow dg-arrow" style="font-size:72px;">↓</div>
       <div class="ps-card cd-out" style="width:100%;padding:36px 44px;border:5px solid var(--ps-green);font-size:42px;font-weight:700;text-align:left;white-space:pre-wrap;">${esc(p.output)}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".cd-card"), s + 0.05, { y: 60 });
    a.tl.fromTo(a.q(".cd-arrow"), { autoAlpha: 0, y: -30 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: "bounce.out" }, s + 0.9);
    a.tl.fromTo(
      a.q(".cd-out"),
      { autoAlpha: 0, scale: 0.7 },
      { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)" },
      s + 1.3,
    );
    a.tl.fromTo(a.q(".cd-out"), { scale: 1 }, { scale: 1.04, duration: 0.14, yoyo: true, repeat: 1 }, s + 1.75);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "whoosh" },
    { at: 0.9, name: "pop" },
    { at: 1.3, name: "ding" },
  ],
});

export const codeFrames = [
  typingReveal,
  lineZoom,
  diffBeforeAfter,
  syntaxRainbow,
  errorShake,
  copyPasteFlash,
  scrollFollow,
  bracketHighlight,
  minimapPan,
  codeToOutput,
];
