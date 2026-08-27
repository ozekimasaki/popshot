/** outro: 締め/CTA 10種 */
import { z } from "zod";
import { defineFrame } from "./types.ts";
import { burstHtml, burstTl, esc, floatLoop, popIn, repeats, sceneExit, seeded, stage } from "./helpers.ts";

const ctaProps = z.object({
  message: z.string().default(""),
  buttonText: z.string().default("フォロー"),
});

export const followCta = defineFrame({
  id: "outro/follow-cta",
  category: "outro",
  description: "フォローピルがぽよんぽよん弾んで指差し絵文字が誘導する定番CTA",
  propsDoc: "message: 一言 / buttonText: ボタン文言",
  minDuration: 2.4,
  propsSchema: ctaProps,
  html: (p, ctx) =>
    stage(
      `<h2 class="ps-h2 ot-msg">${esc(p.message || ctx.narration)}</h2>
       <div style="display:flex;align-items:center;gap:26px;">
        <div class="ot-finger" style="font-size:100px;">👉</div>
        <div class="ps-pill ot-btn" style="font-size:64px;padding:28px 80px;">${esc(p.buttonText)}</div>
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".ot-msg"), s + 0.05);
    a.tl.fromTo(a.q(".ot-btn"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" }, s + 0.4);
    const rep = repeats(0.45, a.ctx.duration - 1.2);
    a.tl.fromTo(a.q(".ot-btn"), { scale: 1 }, { scale: 1.1, duration: 0.45, yoyo: true, repeat: rep, ease: "sine.inOut" }, s + 1.0);
    a.tl.fromTo(a.q(".ot-finger"), { x: -30, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.3 }, s + 0.7);
    a.tl.fromTo(a.q(".ot-finger"), { x: 0 }, { x: 20, duration: 0.35, yoyo: true, repeat: rep, ease: "sine.inOut" }, s + 1.0);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.4, name: "jump" },
    { at: 1.0, name: "pop" },
  ],
});

export const nextTeaser = defineFrame({
  id: "outro/next-teaser",
  category: "outro",
  description: "「次回予告」カードがバーンと出て続きを匂わせる",
  propsDoc: "title: 次回の内容 / label: バッジ文言",
  minDuration: 2.4,
  propsSchema: z.object({
    title: z.string().default(""),
    label: z.string().default("次回予告"),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="ps-badge ot-label" style="font-size:48px;">${esc(p.label)}</div>
       <div class="ps-card ot-card" style="width:100%;padding:60px;border:6px solid var(--ps-accent);">
        <div style="font-size:60px;font-weight:900;line-height:1.5;">${esc(p.title || ctx.narration)}</div>
       </div>
       <div class="ot-qmark" style="font-size:110px;font-weight:900;color:var(--ps-accent);">続く…</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".ot-label"), { y: -200, autoAlpha: 0, rotation: -8 }, { y: 0, autoAlpha: 1, rotation: -3, duration: 0.4, ease: "bounce.out" }, s + 0.05);
    a.tl.fromTo(a.q(".ot-card"), { scale: 0.4, autoAlpha: 0, rotationY: 60 }, { scale: 1, autoAlpha: 1, rotationY: 0, duration: 0.5, ease: "back.out(1.6)" }, s + 0.4);
    a.tl.fromTo(a.q(".ot-qmark"), { autoAlpha: 0, x: -80 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: "power3.out" }, s + 1.0);
    floatLoop(a, a.q(".ot-qmark"), s + 1.4, { dy: 10 });
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "don" },
    { at: 0.4, name: "whoosh" },
    { at: 1.0, name: "sparkle" },
  ],
});

export const recapCards = defineFrame({
  id: "outro/recap-cards",
  category: "outro",
  description: "今日のまとめカードが3枚ぽんぽん並ぶ復習タイム",
  propsDoc: "items: まとめ項目 / title: 見出し",
  minDuration: 2.8,
  propsSchema: z.object({
    items: z.array(z.string()).default(["ポイント1", "ポイント2", "ポイント3"]),
    title: z.string().default("今日のまとめ"),
  }),
  html: (p) =>
    stage(
      `<div class="ps-badge ot-title" style="font-size:46px;">📝 ${esc(p.title)}</div>
       <div style="display:flex;flex-direction:column;gap:24px;width:100%;max-width:840px;">
        ${p.items.map((it, i) => `<div class="li-row ot-r-${i}"><div class="li-num">${i + 1}</div><div>${esc(it)}</div></div>`).join("")}
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".ot-title"), s + 0.05, { y: -50 });
    a.props.items.forEach((_, i) => {
      a.tl.fromTo(
        a.q(`.ot-r-${i}`),
        { scale: 0.5, autoAlpha: 0, y: 80 },
        { scale: 1, autoAlpha: 1, y: 0, duration: 0.4, ease: "back.out(2)" },
        s + 0.4 + i * 0.35,
      );
    });
    sceneExit(a);
  },
  seCues: (p) => [
    { at: 0.05, name: "pop" },
    ...p.items.map((_, i) => ({ at: 0.4 + i * 0.35, name: "coin" as const })),
  ],
});

export const avatarBow = defineFrame({
  id: "outro/avatar-bow",
  category: "outro",
  description: "アバターが中央に大きく登場してぺこりとお辞儀する挨拶エンド",
  propsDoc: "message: 挨拶文",
  minDuration: 2.6,
  propsSchema: z.object({ message: z.string().default("ご視聴ありがとうございました!") }),
  html: (p, ctx) =>
    stage(
      `<img class="ot-ava" src="assets/avatar.png" alt="" style="width:560px;filter:drop-shadow(0 20px 44px rgba(0,0,0,0.14));"/>
       <div class="ps-pill ot-msg" style="font-size:52px;">${esc(p.message || ctx.narration)}</div>
       <div style="position:absolute;inset:0;">${burstHtml(12, seeded(ctx.seed), ["✨", "🎀"], { cy: 700, spread: 480 })}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".ot-ava"), { y: 700, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, ease: "back.out(1.3)" }, s + 0.05);
    // ぺこり (transformOrigin 下端で前傾)
    a.tl.to(a.q(".ot-ava"), { rotation: 10, scaleY: 0.94, transformOrigin: "50% 100%", duration: 0.35, ease: "power2.inOut" }, s + 0.85);
    a.tl.to(a.q(".ot-ava"), { rotation: 0, scaleY: 1, duration: 0.4, ease: "back.out(2)" }, s + 1.3);
    popIn(a, a.q(".ot-msg"), s + 1.1);
    burstTl(a, s + 1.3);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "jump" },
    { at: 0.85, name: "pop" },
    { at: 1.3, name: "sparkle" },
  ],
});

export const subscribePill = defineFrame({
  id: "outro/subscribe-pill",
  category: "outro",
  description: "チャンネル登録ピルとベルがぶるぶる震えて通知を誘う",
  propsDoc: "message / buttonText",
  minDuration: 2.4,
  propsSchema: z.object({
    message: z.string().default(""),
    buttonText: z.string().default("チャンネル登録"),
  }),
  html: (p, ctx) =>
    stage(
      `<h2 class="ps-h2 ot-msg">${esc(p.message || ctx.narration)}</h2>
       <div style="display:flex;align-items:center;gap:30px;">
        <div class="ps-pill ot-btn" style="font-size:56px;padding:26px 70px;background:#e67272;">${esc(p.buttonText)}</div>
        <div class="ot-bell" style="font-size:96px;">🔔</div>
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".ot-msg"), s + 0.05);
    a.tl.fromTo(a.q(".ot-btn"), { x: -700, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, ease: "back.out(1.6)" }, s + 0.4);
    a.tl.fromTo(a.q(".ot-bell"), { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.4, ease: "back.out(2.4)" }, s + 0.7);
    a.tl.to(a.q(".ot-bell"), { rotation: 24, duration: 0.09, yoyo: true, repeat: 9, ease: "sine.inOut", transformOrigin: "50% 0%" }, s + 1.15);
    a.tl.fromTo(a.q(".ot-btn"), { scale: 1 }, { scale: 1.07, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut" }, s + 1.2);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.4, name: "swipe" },
    { at: 0.7, name: "pop" },
    { at: 1.15, name: "ding" },
  ],
});

export const questionToComments = defineFrame({
  id: "outro/question-to-comments",
  category: "outro",
  description: "吹き出しが「コメントで教えて!」と揺れてエンゲージを誘う",
  propsDoc: "question: 視聴者への問いかけ",
  minDuration: 2.4,
  propsSchema: z.object({ question: z.string().default("みんなはどう思う?") }),
  html: (p, ctx) =>
    stage(
      `<div class="ot-bubble" style="position:relative;background:var(--ps-white);border:6px solid var(--ps-accent);border-radius:44px;padding:50px 60px;max-width:860px;box-shadow:var(--ps-shadow-1);">
        <div style="font-size:58px;font-weight:900;line-height:1.5;">💬 ${esc(p.question || ctx.narration)}</div>
        <div style="position:absolute;left:120px;bottom:-34px;width:0;height:0;border-left:26px solid transparent;border-right:26px solid transparent;border-top:38px solid var(--ps-accent);"></div>
       </div>
       <div class="ps-pill ot-cta" style="font-size:48px;">コメントで教えて!</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".ot-bubble"), { scale: 0, autoAlpha: 0, rotation: -6, transformOrigin: "20% 100%" }, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.5, ease: "elastic.out(1, 0.55)" }, s + 0.1);
    floatLoop(a, a.q(".ot-bubble"), s + 0.8, { dy: 14, period: 0.8 });
    popIn(a, a.q(".ot-cta"), s + 0.9);
    a.tl.fromTo(a.q(".ot-cta"), { scale: 1 }, { scale: 1.08, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut" }, s + 1.4);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.1, name: "jump" },
    { at: 0.9, name: "pop" },
  ],
});

export const seriesBadge = defineFrame({
  id: "outro/series-badge",
  category: "outro",
  description: "シリーズ番号バッジがスタンプされ「毎日更新」を刷り込む",
  propsDoc: "series: シリーズ名 / number: 何本目 / message",
  minDuration: 2.4,
  propsSchema: z.object({
    series: z.string().default("1分解説"),
    number: z.number().int().min(1).default(1),
    message: z.string().default(""),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="ot-series" style="display:flex;align-items:center;gap:0;">
        <div class="ps-pill ot-sname" style="font-size:54px;border-radius:60px 0 0 60px;">${esc(p.series)}</div>
        <div class="ot-snum" style="background:var(--ps-yellow);color:#fff;font-size:54px;font-weight:900;padding:18px 44px;border-radius:0 60px 60px 0;">#${p.number}</div>
       </div>
       <h2 class="ps-h2 ot-msg" style="font-size:56px;">${esc(p.message || ctx.narration)}</h2>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".ot-sname"), { x: -600, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out" }, s + 0.05);
    a.tl.fromTo(a.q(".ot-snum"), { scale: 3, autoAlpha: 0, rotation: 10 }, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.3, ease: "power4.in" }, s + 0.5);
    a.tl.fromTo(a.q(".ot-series"), { y: 0 }, { y: -14, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, s + 0.9);
    popIn(a, a.q(".ot-msg"), s + 1.0);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "swipe" },
    { at: 0.8, name: "don" },
    { at: 1.0, name: "pop" },
  ],
});

export const loopBack = defineFrame({
  id: "outro/loop-back",
  category: "outro",
  description: "くるっと回る矢印が「もう一回見る?」とループ再生を促す",
  propsDoc: "message: 誘い文句",
  minDuration: 2.2,
  propsSchema: z.object({ message: z.string().default("もう一回見る?") }),
  html: (p, ctx) =>
    stage(
      `<div class="ot-loop" style="font-size:210px;font-weight:900;color:var(--ps-accent);line-height:1;">🔁</div>
       <h2 class="ps-h2 ot-msg">${esc(p.message || ctx.narration)}</h2>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".ot-loop"), s + 0.05, { scale: 0.2 });
    const spins = Math.max(1, Math.floor((a.ctx.duration - 0.8) / 0.9));
    a.tl.to(a.q(".ot-loop"), { rotation: 360 * spins, duration: spins * 0.9, ease: "power1.inOut" }, s + 0.5);
    popIn(a, a.q(".ot-msg"), s + 0.6);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.5, name: "whoosh" },
  ],
});

export const thanksConfetti = defineFrame({
  id: "outro/thanks-confetti",
  category: "outro",
  description: "「ありがとう!」と一緒に紙吹雪が舞い上がるハッピーエンド",
  propsDoc: "message: 感謝の言葉",
  minDuration: 2.4,
  propsSchema: z.object({ message: z.string().default("ご視聴ありがとう!") }),
  html: (p, ctx) =>
    stage(
      `<h1 class="ps-h1 ot-msg" style="color:var(--ps-accent);">${esc(p.message || ctx.narration)}</h1>
       <div style="position:absolute;inset:0;">${burstHtml(26, seeded(ctx.seed), ["🎉", "🎊", "✨", "🎀"], { cy: 800, spread: 560 })}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".ot-msg"), { scale: 0, autoAlpha: 0, rotation: -5 }, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" }, s + 0.15);
    burstTl(a, s + 0.35, { duration: 1.2 });
    floatLoop(a, a.q(".ot-msg"), s + 0.9, { dy: 12 });
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.15, name: "tada" },
    { at: 0.4, name: "sparkle" },
  ],
});

export const saveReminder = defineFrame({
  id: "outro/save-reminder",
  category: "outro",
  description: "ブックマークが跳ねて「保存して後で見返してね」と念押しする",
  propsDoc: "message: 保存を促す一言",
  minDuration: 2.2,
  propsSchema: z.object({ message: z.string().default("保存して後で見返してね!") }),
  html: (p, ctx) =>
    stage(
      `<div class="ot-bm" style="font-size:190px;line-height:1;">🔖</div>
       <h2 class="ps-h2 ot-msg" style="font-size:58px;">${esc(p.message || ctx.narration)}</h2>
       <div class="ps-pill-outline ot-hint" style="font-size:40px;">シェアも大歓迎</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".ot-bm"), { y: -500, autoAlpha: 0, rotation: -16 }, { y: 0, autoAlpha: 1, rotation: 0, duration: 0.55, ease: "bounce.out" }, s + 0.05);
    popIn(a, a.q(".ot-msg"), s + 0.55);
    popIn(a, a.q(".ot-hint"), s + 0.95);
    a.tl.fromTo(a.q(".ot-bm"), { scale: 1 }, { scale: 1.12, duration: 0.35, yoyo: true, repeat: 3, ease: "sine.inOut" }, s + 1.1);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.45, name: "don" },
    { at: 0.55, name: "pop" },
    { at: 0.95, name: "coin" },
  ],
});

export const outroFrames = [
  followCta,
  nextTeaser,
  recapCards,
  avatarBow,
  subscribePill,
  questionToComments,
  seriesBadge,
  loopBack,
  thanksConfetti,
  saveReminder,
];
