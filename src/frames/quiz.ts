/** quiz: クイズ/インタラクション誘発 10種 */
import { z } from "zod";
import { defineFrame } from "./types.ts";
import { burstHtml, burstTl, esc, popIn, sceneExit, seeded, stage } from "./helpers.ts";

const quizProps = z.object({
  question: z.string().default("これは何でしょう?"),
  choices: z.array(z.string()).default(["A", "B", "C"]),
  /** 正解の index (0始まり) */
  answer: z.number().int().min(0).default(0),
});

export const choice3 = defineFrame({
  id: "quiz/choice-3",
  category: "quiz",
  description: "3択クイズ→シンキングタイム→正解が光って紙吹雪が舞う",
  propsDoc: "question: 問題文 / choices: 選択肢 / answer: 正解index",
  minDuration: 4.0,
  propsSchema: quizProps,
  html: (p, ctx) =>
    stage(
      `<div class="ps-pill qz-q" style="font-size:50px;width:100%;">${esc(p.question)}</div>
       <div style="display:flex;flex-direction:column;gap:24px;width:100%;max-width:820px;">
        ${p.choices
          .map(
            (c, i) =>
              `<div class="li-row qz-c-${i}" style="font-size:44px;"><div class="li-num">${"ABC"[i] ?? i + 1}</div><div>${esc(c)}</div></div>`,
          )
          .join("")}
       </div>
       <div style="position:absolute;inset:0;">${burstHtml(16, seeded(ctx.seed), ["🎉", "✦", "★"], { cy: 800 })}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".qz-q"), s + 0.05, { y: -50 });
    a.props.choices.forEach((_, i) => {
      a.tl.fromTo(a.q(`.qz-c-${i}`), { x: 700, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.35, ease: "power3.out" }, s + 0.4 + i * 0.2);
    });
    // シンキングタイム: 選択肢がそわそわ揺れる
    const think = s + 1.2;
    a.props.choices.forEach((_, i) => {
      a.tl.fromTo(a.q(`.qz-c-${i}`), { rotation: 0 }, { rotation: i % 2 ? 0.8 : -0.8, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, think);
    });
    const reveal = s + Math.max(a.ctx.duration - 1.5, 2.5);
    a.props.choices.forEach((_, i) => {
      if (i === a.props.answer) {
        a.tl.to(a.q(`.qz-c-${i}`), { backgroundColor: "var(--ps-green)", color: "#ffffff", scale: 1.08, duration: 0.3, ease: "back.out(2)" }, reveal);
      } else {
        a.tl.to(a.q(`.qz-c-${i}`), { opacity: 0.3, scale: 0.95, duration: 0.3 }, reveal);
      }
    });
    burstTl(a, reveal + 0.2);
    sceneExit(a);
  },
  seCues: (p, ctx) => [
    { at: 0.05, name: "pop" },
    { at: 0.4, name: "swipe" },
    { at: 1.2, name: "drum" },
    { at: Math.max(ctx.duration - 1.5, 2.5), name: "ding" },
    { at: Math.max(ctx.duration - 1.3, 2.7), name: "tada" },
  ],
});

export const trueFalse = defineFrame({
  id: "quiz/true-false",
  category: "quiz",
  description: "○×の2枚が向き合い、正解側にスタンプがドンと押される",
  propsDoc: "question: 問題文 / answer: 0=○ 1=×",
  minDuration: 3.5,
  propsSchema: z.object({
    question: z.string().default(""),
    answer: z.number().int().min(0).max(1).default(0),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="ps-pill qz-q" style="font-size:50px;width:100%;">${esc(p.question || ctx.narration)}</div>
       <div style="display:flex;gap:40px;width:100%;justify-content:center;">
        <div class="ps-card qz-o" style="width:340px;height:340px;display:flex;align-items:center;justify-content:center;font-size:180px;font-weight:900;color:var(--ps-green);border:8px solid var(--ps-green);">○</div>
        <div class="ps-card qz-x" style="width:340px;height:340px;display:flex;align-items:center;justify-content:center;font-size:180px;font-weight:900;color:var(--ps-coral);border:8px solid var(--ps-coral);">×</div>
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".qz-q"), s + 0.05, { y: -50 });
    a.tl.fromTo(a.q(".qz-o"), { x: -600, rotation: -18, autoAlpha: 0 }, { x: 0, rotation: 0, autoAlpha: 1, duration: 0.45, ease: "back.out(1.6)" }, s + 0.4);
    a.tl.fromTo(a.q(".qz-x"), { x: 600, rotation: 18, autoAlpha: 0 }, { x: 0, rotation: 0, autoAlpha: 1, duration: 0.45, ease: "back.out(1.6)" }, s + 0.55);
    const reveal = s + Math.max(a.ctx.duration - 1.3, 2.2);
    const win = a.props.answer === 0 ? ".qz-o" : ".qz-x";
    const lose = a.props.answer === 0 ? ".qz-x" : ".qz-o";
    a.tl.fromTo(a.q(win), { scale: 1 }, { scale: 1.22, duration: 0.25, ease: "back.out(3)" }, reveal);
    a.tl.to(a.q(lose), { opacity: 0.25, scale: 0.85, rotation: 8, duration: 0.3 }, reveal);
    sceneExit(a);
  },
  seCues: (p, ctx) => [
    { at: 0.4, name: "swipe" },
    { at: 1.1, name: "drum" },
    { at: Math.max(ctx.duration - 1.3, 2.2), name: "ding" },
  ],
});

export const fillBlank = defineFrame({
  id: "quiz/fill-blank",
  category: "quiz",
  description: "文中の空欄に答えのピースが上から落ちてハマる穴埋めクイズ",
  propsDoc: "before/after: 空欄の前後の文 / answer: 空欄に入る答え",
  minDuration: 3.2,
  propsSchema: z.object({
    before: z.string().default("gitは"),
    after: z.string().default("を保存する"),
    answer: z.string().default("スナップショット"),
  }),
  html: (p) =>
    stage(
      `<h1 class="ps-h2 qz-sentence" style="font-size:64px;line-height:1.7;">
        ${esc(p.before)}<span class="qz-hole" style="display:inline-block;min-width:300px;border-bottom:10px dotted var(--ps-accent);position:relative;margin:0 10px;vertical-align:bottom;"><span class="qz-ans ps-pill" style="font-size:54px;padding:8px 34px;white-space:nowrap;">${esc(p.answer)}</span></span>${esc(p.after)}
       </h1>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".qz-sentence"), s + 0.05);
    a.tl.set(a.q(".qz-ans"), { autoAlpha: 0 }, s);
    const reveal = s + Math.max(a.ctx.duration - 1.6, 1.8);
    a.tl.fromTo(a.q(".qz-ans"), { y: -500, autoAlpha: 0, rotation: -10 }, { y: 0, autoAlpha: 1, rotation: 0, duration: 0.55, ease: "bounce.out" }, reveal);
    a.tl.fromTo(a.q(".qz-hole"), { scale: 1 }, { scale: 1.08, duration: 0.16, yoyo: true, repeat: 1 }, reveal + 0.5);
    sceneExit(a);
  },
  seCues: (p, ctx) => [
    { at: 0.05, name: "pop" },
    { at: 0.8, name: "drum" },
    { at: Math.max(ctx.duration - 1.6, 1.8) + 0.45, name: "don" },
    { at: Math.max(ctx.duration - 1.6, 1.8) + 0.7, name: "sparkle" },
  ],
});

export const thinkingTimer = defineFrame({
  id: "quiz/thinking-timer",
  category: "quiz",
  description: "リングタイマーが3秒を刻み、時間切れで答えがバンと出る",
  propsDoc: "question: 問題文 / answer: 答え",
  minDuration: 4.0,
  propsSchema: z.object({
    question: z.string().default(""),
    answer: z.string().default(""),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="ps-pill qz-q" style="font-size:50px;width:100%;">${esc(p.question || ctx.narration)}</div>
       <div style="position:relative;width:420px;height:420px;">
        <svg viewBox="0 0 200 200" style="width:100%;transform:rotate(-90deg);">
          <circle cx="100" cy="100" r="84" fill="none" stroke="var(--ps-surface-cyan-2)" stroke-width="18"/>
          <circle class="qz-ring" cx="100" cy="100" r="84" fill="none" stroke="var(--ps-accent)" stroke-width="18" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/>
        </svg>
        ${[3, 2, 1]
          .map(
            (n) =>
              `<div class="qz-count qz-cnt-${n}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:150px;font-weight:900;color:var(--ps-accent);">${n}</div>`,
          )
          .join("")}
       </div>
       <div class="ps-pill qz-ans" style="font-size:56px;background:var(--ps-green);">${esc(p.answer)}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".qz-q"), s + 0.05, { y: -50 });
    a.tl.set(a.q(".qz-ans"), { autoAlpha: 0 }, s);
    const tStart = s + 0.5;
    a.tl.fromTo(a.q(".qz-ring"), { strokeDashoffset: 0 }, { strokeDashoffset: 100, duration: 3, ease: "none" }, tStart);
    [3, 2, 1].forEach((n, i) => {
      a.tl.fromTo(
        a.q(`.qz-cnt-${n}`),
        { autoAlpha: 0, scale: 1.5 },
        { autoAlpha: 1, scale: 1, duration: 0.25, ease: "power2.out" },
        tStart + i,
      );
      a.tl.to(a.q(`.qz-cnt-${n}`), { autoAlpha: 0, scale: 0.6, duration: 0.15 }, tStart + i + 0.85);
    });
    const reveal = tStart + 3.1;
    a.tl.fromTo(a.q(".qz-ans"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: "elastic.out(1, 0.5)" }, reveal);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.5, name: "drum" },
    { at: 1.5, name: "drum" },
    { at: 2.5, name: "drum" },
    { at: 3.6, name: "tada" },
  ],
});

export const answerConfetti = defineFrame({
  id: "quiz/answer-confetti",
  category: "quiz",
  description: "正解発表専用。答えがドンと出て紙吹雪が全面に舞う",
  propsDoc: "answer: 答え / note: 補足",
  minDuration: 2.4,
  propsSchema: z.object({
    answer: z.string().default(""),
    note: z.string().default(""),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="ps-badge qz-badge" style="font-size:44px;">正解は…</div>
       <div class="ps-pill qz-big" style="font-size:88px;padding:36px 80px;background:var(--ps-green);">${esc(p.answer || ctx.narration)}</div>
       ${p.note ? `<div class="ps-small qz-note" style="font-size:40px;">${esc(p.note)}</div>` : ""}
       <div style="position:absolute;inset:0;">${burstHtml(24, seeded(ctx.seed), ["🎉", "🎊", "★", "✦"], { cy: 760, spread: 560 })}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".qz-badge"), s + 0.05, { y: -60 });
    a.tl.fromTo(a.q(".qz-big"), { scale: 0, autoAlpha: 0, rotation: -8 }, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.5, ease: "elastic.out(1, 0.55)" }, s + 0.45);
    burstTl(a, s + 0.5, { duration: 1.1 });
    if (a.props.note) popIn(a, a.q(".qz-note"), s + 1.0);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.45, name: "tada" },
    { at: 0.6, name: "sparkle" },
  ],
});

export const hintPeek = defineFrame({
  id: "quiz/hint-peek",
  category: "quiz",
  description: "ヒントカードが画面端からチラ見えして、じらしてから全部見せる",
  propsDoc: "question: 問題文 / hint: ヒント",
  minDuration: 3.2,
  propsSchema: z.object({
    question: z.string().default(""),
    hint: z.string().default("ヒント!"),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="ps-pill qz-q" style="font-size:50px;width:100%;">${esc(p.question || ctx.narration)}</div>
       <div class="ps-card qz-hint" style="width:100%;max-width:800px;padding:44px;border:6px dashed var(--ps-yellow);font-size:48px;font-weight:700;">💡 ${esc(p.hint)}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".qz-q"), s + 0.05, { y: -50 });
    a.tl.fromTo(a.q(".qz-hint"), { x: 1000, autoAlpha: 0.9, rotation: 4 }, { x: 700, autoAlpha: 1, duration: 0.4, ease: "power2.out" }, s + 0.7);
    a.tl.to(a.q(".qz-hint"), { x: 760, duration: 0.3, yoyo: true, repeat: 1, ease: "sine.inOut" }, s + 1.15);
    a.tl.to(a.q(".qz-hint"), { x: 0, rotation: 0, duration: 0.5, ease: "back.out(1.4)" }, s + Math.max(a.ctx.duration - 1.6, 1.9));
    sceneExit(a);
  },
  seCues: (p, ctx) => [
    { at: 0.7, name: "swipe" },
    { at: 1.15, name: "click" },
    { at: Math.max(ctx.duration - 1.6, 1.9), name: "ding" },
  ],
});

export const progressQuiz = defineFrame({
  id: "quiz/progress-quiz",
  category: "quiz",
  description: "「Q2/5」の進捗バッジ付きでテンポよく出題する連問フォーマット",
  propsDoc: "current/total: 進捗 / question: 問題 / answer: 答え",
  minDuration: 3.2,
  propsSchema: z.object({
    current: z.number().int().min(1).default(1),
    total: z.number().int().min(1).default(3),
    question: z.string().default(""),
    answer: z.string().default(""),
  }),
  html: (p, ctx) =>
    stage(
      `<div style="display:flex;gap:14px;align-items:center;">
        <div class="ps-badge qz-prog" style="font-size:40px;">Q${p.current}/${p.total}</div>
        <div style="display:flex;gap:10px;">
          ${Array.from({ length: p.total }, (_, i) => `<span class="qz-dot-${i}" style="width:26px;height:26px;border-radius:50%;background:${i < p.current ? "var(--ps-accent)" : "var(--ps-border)"};display:inline-block;"></span>`).join("")}
        </div>
       </div>
       <h1 class="ps-h2 qz-q" style="font-size:64px;">${esc(p.question || ctx.narration)}</h1>
       <div class="ps-pill qz-ans" style="font-size:54px;background:var(--ps-green);">${esc(p.answer)}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".qz-prog"), { scale: 0, rotation: -12 }, { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2.4)" }, s + 0.05);
    a.tl.fromTo(a.q(`.qz-dot-${a.props.current - 1}`), { scale: 1 }, { scale: 1.6, duration: 0.2, yoyo: true, repeat: 1 }, s + 0.3);
    popIn(a, a.q(".qz-q"), s + 0.4);
    a.tl.set(a.q(".qz-ans"), { autoAlpha: 0 }, s);
    const reveal = s + Math.max(a.ctx.duration - 1.4, 1.8);
    a.tl.fromTo(a.q(".qz-ans"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(2)" }, reveal);
    sceneExit(a);
  },
  seCues: (p, ctx) => [
    { at: 0.05, name: "coin" },
    { at: 0.4, name: "pop" },
    { at: Math.max(ctx.duration - 1.4, 1.8), name: "ding" },
  ],
});

export const emojiVote = defineFrame({
  id: "quiz/emoji-vote",
  category: "quiz",
  description: "絵文字2択の投票バーが競り合いながら伸びる視聴者参加風",
  propsDoc: "question / left,right: {emoji, label, percent}",
  minDuration: 3.2,
  propsSchema: z.object({
    question: z.string().default("どっち派?"),
    left: z.object({ emoji: z.string(), label: z.string(), percent: z.number() }).default({ emoji: "🐱", label: "ねこ", percent: 62 }),
    right: z.object({ emoji: z.string(), label: z.string(), percent: z.number() }).default({ emoji: "🐶", label: "いぬ", percent: 38 }),
  }),
  html: (p) =>
    stage(
      `<div class="ps-pill qz-q" style="font-size:52px;width:100%;">${esc(p.question)}</div>
       ${[
         { d: p.left, cls: "l", color: "var(--ps-cyan)" },
         { d: p.right, cls: "r", color: "var(--ps-pink)" },
       ]
         .map(
           ({ d, cls, color }) =>
             `<div style="display:flex;align-items:center;gap:22px;width:100%;">
              <div class="qz-e-${cls}" style="font-size:96px;">${esc(d.emoji)}</div>
              <div style="flex:1;">
                <div class="ps-small" style="text-align:left;">${esc(d.label)}</div>
                <div style="height:58px;border-radius:32px;background:var(--ps-surface-gray);overflow:hidden;margin-top:8px;">
                  <div class="qz-bar-${cls}" style="height:100%;width:${d.percent}%;background:${color};border-radius:32px;transform-origin:0 50%;"></div>
                </div>
              </div>
              <div class="qz-v-${cls}" style="font-size:52px;font-weight:900;color:${color};min-width:150px;">0%</div>
             </div>`,
         )
         .join("")}`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".qz-q"), s + 0.05, { y: -50 });
    (["l", "r"] as const).forEach((cls, i) => {
      const d = cls === "l" ? a.props.left : a.props.right;
      popIn(a, a.q(`.qz-e-${cls}`), s + 0.4 + i * 0.15);
      a.tl.fromTo(a.q(`.qz-bar-${cls}`), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "power2.out" }, s + 0.7);
      const obj = { v: 0 };
      a.tl.to(
        obj,
        {
          v: d.percent,
          duration: 1.1,
          ease: "power2.out",
          onUpdate: () => {
            const el = document.querySelector(a.q(`.qz-v-${cls}`));
            if (el) el.textContent = `${Math.round(obj.v)}%`;
          },
        },
        s + 0.7,
      );
    });
    const winCls = a.props.left.percent >= a.props.right.percent ? "l" : "r";
    a.tl.to(a.q(`.qz-e-${winCls}`), { scale: 1.3, rotation: 10, duration: 0.25, yoyo: true, repeat: 1, ease: "back.out(2)" }, s + 2.0);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.4, name: "pop" },
    { at: 0.7, name: "swipe" },
    { at: 2.0, name: "tada" },
  ],
});

export const speedQuiz = defineFrame({
  id: "quiz/speed-quiz",
  category: "quiz",
  description: "上部の時間バーが猛スピードで減る焦らせ系瞬発クイズ",
  propsDoc: "question: 問題 / answer: 答え",
  minDuration: 3.0,
  propsSchema: z.object({
    question: z.string().default(""),
    answer: z.string().default(""),
  }),
  html: (p, ctx) =>
    stage(
      `<div style="width:100%;height:34px;border-radius:20px;background:var(--ps-surface-gray);overflow:hidden;">
        <div class="qz-time" style="height:100%;width:100%;background:var(--ps-coral);border-radius:20px;transform-origin:0 50%;"></div>
       </div>
       <div class="ps-badge" style="background:var(--ps-coral);font-size:40px;">⚡ スピードクイズ</div>
       <h1 class="ps-h2 qz-q" style="font-size:66px;">${esc(p.question || ctx.narration)}</h1>
       <div class="ps-pill qz-ans" style="font-size:56px;background:var(--ps-green);">${esc(p.answer)}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    const reveal = s + Math.max(a.ctx.duration - 1.2, 1.8);
    popIn(a, a.q(".ps-badge"), s + 0.05, { y: -40 });
    popIn(a, a.q(".qz-q"), s + 0.25);
    a.tl.set(a.q(".qz-ans"), { autoAlpha: 0 }, s);
    a.tl.fromTo(a.q(".qz-time"), { scaleX: 1 }, { scaleX: 0, duration: reveal - s - 0.3, ease: "none" }, s + 0.3);
    a.tl.fromTo(a.q(".qz-q"), { x: 0 }, { x: 6, duration: 0.06, yoyo: true, repeat: 9 }, reveal - 0.8);
    a.tl.fromTo(a.q(".qz-ans"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(2.4)" }, reveal);
    sceneExit(a);
  },
  seCues: (p, ctx) => {
    const reveal = Math.max(ctx.duration - 1.2, 1.8);
    return [
      { at: 0.05, name: "don" },
      { at: 0.3, name: "drum" },
      { at: reveal - 0.8, name: "drum" },
      { at: reveal, name: "ding" },
    ];
  },
});

export const reverseQuiz = defineFrame({
  id: "quiz/reverse-quiz",
  category: "quiz",
  description: "先に答えをドンと見せ「なぜ?」を後出しする逆張りクイズ",
  propsDoc: "answer: 先に見せる答え / question: 後から出す問い",
  minDuration: 3.0,
  propsSchema: z.object({
    answer: z.string().default(""),
    question: z.string().default("なぜでしょう?"),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="ps-pill qz-big" style="font-size:80px;padding:34px 70px;">${esc(p.answer || ctx.narration)}</div>
       <div class="qz-why" style="font-size:130px;font-weight:900;color:var(--ps-accent);">🤔</div>
       <h2 class="ps-h2 qz-q" style="font-size:60px;">${esc(p.question)}</h2>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".qz-big"), { scale: 3, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: "power4.in" }, s + 0.05);
    a.tl.fromTo(a.q(".qz-why"), { scale: 0, rotation: -30, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" }, s + 0.7);
    a.tl.to(a.q(".qz-why"), { rotation: 14, duration: 0.35, yoyo: true, repeat: 3, ease: "sine.inOut" }, s + 1.25);
    popIn(a, a.q(".qz-q"), s + 1.1);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.4, name: "don" },
    { at: 0.7, name: "pop" },
    { at: 1.1, name: "sparkle" },
  ],
});

export const quizFrames = [
  choice3,
  trueFalse,
  fillBlank,
  thinkingTimer,
  answerConfetti,
  hintPeek,
  progressQuiz,
  emojiVote,
  speedQuiz,
  reverseQuiz,
];
