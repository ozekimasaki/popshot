/** hook: 冒頭1.5秒で掴むオープナー 10種 */
import { z } from "zod";
import { defineFrame } from "./types.ts";
import {
  burstHtml,
  burstTl,
  chars,
  esc,
  popChars,
  popIn,
  repeats,
  sceneExit,
  seeded,
  stage,
} from "./helpers.ts";

const titleProps = z.object({
  title: z.string().default(""),
  badge: z.string().default(""),
});

export const impactZoom = defineFrame({
  id: "hook/impact-zoom",
  category: "hook",
  description: "タイトルがドン!と3倍ズームから叩き込まれ画面が揺れる王道フック",
  propsDoc: "title: 見出し / badge: 上部バッジ (任意)",
  minDuration: 1.6,
  propsSchema: titleProps,
  html: (p, ctx) =>
    stage(
      `${p.badge ? `<div class="ps-badge hk-badge">${esc(p.badge)}</div>` : ""}
       <h1 class="ps-h1 hk-title">${esc(p.title || ctx.narration)}</h1>
       <div class="hk-burst" style="position:absolute;inset:0;">${burstHtml(14, seeded(ctx.seed), ["★", "✦", "!"], { cy: 820 })}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(
      a.q(".hk-title"),
      { scale: 3.2, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.32, ease: "power4.in" },
      s + 0.05,
    );
    // 着地の画面シェイク
    a.tl.fromTo(a.sel, { x: 0 }, { x: 16, duration: 0.045, yoyo: true, repeat: 5, ease: "power1.inOut" }, s + 0.37);
    burstTl(a, s + 0.38, { cls: "prt" });
    a.tl.fromTo(
      a.q(".hk-badge"),
      { y: -140, autoAlpha: 0, rotation: -8 },
      { y: 0, autoAlpha: 1, rotation: 0, duration: 0.4, ease: "bounce.out" },
      s + 0.55,
    );
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "whoosh" },
    { at: 0.37, name: "don" },
    { at: 0.55, name: "sparkle" },
  ],
});

export const countdown3 = defineFrame({
  id: "hook/countdown-3",
  category: "hook",
  description: "3・2・1 のカウントダウンでドラムが鳴り、タイトルへ雪崩れ込む",
  propsDoc: "title: カウント後に出す見出し",
  minDuration: 2.6,
  propsSchema: titleProps,
  html: (p, ctx) =>
    stage(
      `<div class="hk-nums" style="position:relative;height:360px;width:360px;">
        ${[3, 2, 1]
          .map(
            (n) =>
              `<div class="hk-n hk-n${n}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:280px;font-weight:900;color:var(--ps-accent);">${n}</div>`,
          )
          .join("")}
       </div>
       <h1 class="ps-h1 hk-title">${esc(p.title || ctx.narration)}</h1>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    [3, 2, 1].forEach((n, i) => {
      const at = s + i * 0.45;
      a.tl.fromTo(
        a.q(`.hk-n${n}`),
        { scale: 2.4, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.18, ease: "power3.in" },
        at,
      );
      a.tl.to(a.q(`.hk-n${n}`), { scale: 0.5, autoAlpha: 0, duration: 0.2, ease: "power2.in" }, at + 0.26);
    });
    a.tl.fromTo(
      a.q(".hk-title"),
      { scale: 0.4, autoAlpha: 0, y: 60 },
      { scale: 1, autoAlpha: 1, y: 0, duration: 0.45, ease: "back.out(2)" },
      s + 1.42,
    );
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.0, name: "drum" },
    { at: 0.45, name: "drum" },
    { at: 0.9, name: "drum" },
    { at: 1.42, name: "don" },
  ],
});

export const yabaiBadge = defineFrame({
  id: "hook/yabai-badge",
  category: "hook",
  description: "「知らないとヤバい」系バッジが跳ねて落ち、タイトルが文字ポップで続く",
  propsDoc: "badge: 煽りバッジ文言 / title: 見出し",
  minDuration: 2.0,
  propsSchema: z.object({
    title: z.string().default(""),
    badge: z.string().default("知らないとヤバい"),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="ps-badge hk-badge" style="font-size:52px;padding:20px 56px;">${esc(p.badge)}</div>
       <h1 class="ps-h1" style="line-height:1.4;">${chars(p.title || ctx.narration, "hk-ch")}</h1>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(
      a.q(".hk-badge"),
      { y: -420, autoAlpha: 0, rotation: -14 },
      { y: 0, autoAlpha: 1, rotation: -4, duration: 0.5, ease: "bounce.out" },
      s + 0.05,
    );
    a.tl.to(a.q(".hk-badge"), { rotation: 3, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, s + 0.6);
    popChars(a, "hk-ch", s + 0.5, { stagger: 0.035 });
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "jump" },
    { at: 0.4, name: "don" },
    { at: 0.5, name: "pop" },
  ],
});

export const questionSlam = defineFrame({
  id: "hook/question-slam",
  category: "hook",
  description: "巨大な「?」が回転しながら飛来し、問いかけテキストが1文字ずつ弾む",
  propsDoc: "title: 問いかけ文",
  minDuration: 2.0,
  propsSchema: titleProps,
  html: (p, ctx) =>
    stage(
      `<div class="hk-q" style="font-size:300px;font-weight:900;color:var(--ps-accent);line-height:1;">?</div>
       <h1 class="ps-h2" style="font-size:72px;">${chars(p.title || ctx.narration, "hk-ch")}</h1>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(
      a.q(".hk-q"),
      { scale: 4, rotation: 540, autoAlpha: 0 },
      { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.55, ease: "power3.out" },
      s + 0.05,
    );
    a.tl.to(a.q(".hk-q"), { y: -26, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut" }, s + 0.7);
    popChars(a, "hk-ch", s + 0.55, { stagger: 0.03 });
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "whoosh" },
    { at: 0.55, name: "pop" },
  ],
});

export const statShock = defineFrame({
  id: "hook/stat-shock",
  category: "hook",
  description: "衝撃の数字が爆速カウントアップして止まり、ラベルがスタンプされる",
  propsDoc: "value: 数値 / suffix: 単位 (%, 倍 など) / label: 説明",
  minDuration: 2.2,
  propsSchema: z.object({
    value: z.number().default(90),
    suffix: z.string().default("%"),
    label: z.string().default(""),
    decimals: z.number().int().min(0).max(2).default(0),
  }),
  html: (p, ctx) =>
    stage(
      `<div class="hk-stat" style="font-size:230px;font-weight:900;color:var(--ps-accent);line-height:1;">0${esc(p.suffix)}</div>
       <div class="ps-pill hk-label" style="font-size:48px;">${esc(p.label || ctx.narration)}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    const p = a.props;
    popIn(a, a.q(".hk-stat"), s + 0.05, { scale: 0.3 });
    const obj = { v: 0 };
    a.tl.to(
      obj,
      {
        v: p.value,
        duration: 0.9,
        ease: "power3.out",
        onUpdate: () => {
          const el = document.querySelector(a.q(".hk-stat"));
          if (el) el.textContent = obj.v.toFixed(p.decimals) + p.suffix;
        },
      },
      s + 0.15,
    );
    a.tl.fromTo(a.q(".hk-stat"), { scale: 1 }, { scale: 1.14, duration: 0.12, yoyo: true, repeat: 1 }, s + 1.05);
    a.tl.fromTo(
      a.q(".hk-label"),
      { scale: 2.2, autoAlpha: 0, rotation: 6 },
      { scale: 1, autoAlpha: 1, rotation: -2, duration: 0.3, ease: "power4.in" },
      s + 1.15,
    );
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 1.05, name: "coin" },
    { at: 1.45, name: "don" },
  ],
});

export const beforeAfterFlash = defineFrame({
  id: "hook/before-after-flash",
  category: "hook",
  description: "BEFORE と AFTER のカードが交互にフラッシュして対比を煽る",
  propsDoc: "before: 悪い状態 / after: 良い状態",
  minDuration: 2.6,
  propsSchema: z.object({
    before: z.string().default("Before"),
    after: z.string().default("After"),
  }),
  html: (p) =>
    stage(
      `<div class="ps-card hk-before" style="padding:50px 60px;border:6px solid var(--ps-coral);width:100%;">
        <div class="ps-small" style="color:var(--ps-coral);">BEFORE</div>
        <div style="font-size:56px;font-weight:700;">${esc(p.before)}</div>
       </div>
       <div class="ps-card hk-after" style="padding:50px 60px;border:6px solid var(--ps-green);width:100%;">
        <div class="ps-small" style="color:var(--ps-green);">AFTER</div>
        <div style="font-size:56px;font-weight:700;">${esc(p.after)}</div>
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".hk-before"), { x: -900, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.35, ease: "power3.out" }, s + 0.05);
    a.tl.fromTo(a.q(".hk-after"), { x: 900, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.35, ease: "power3.out" }, s + 0.3);
    for (let i = 0; i < 2; i++) {
      const at = s + 0.8 + i * 0.5;
      a.tl.fromTo(a.q(".hk-before"), { scale: 1 }, { scale: 1.06, duration: 0.12, yoyo: true, repeat: 1 }, at);
      a.tl.fromTo(a.q(".hk-after"), { scale: 1 }, { scale: 1.06, duration: 0.12, yoyo: true, repeat: 1 }, at + 0.25);
    }
    a.tl.fromTo(a.q(".hk-after"), { scale: 1 }, { scale: 1.1, duration: 0.25, ease: "back.out(3)" }, s + 1.9);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "swipe" },
    { at: 0.3, name: "swipe" },
    { at: 0.8, name: "click" },
    { at: 1.05, name: "click" },
    { at: 1.9, name: "ding" },
  ],
});

export const sirenAlert = defineFrame({
  id: "hook/siren-alert",
  category: "hook",
  description: "画面が警告色に点滅し「注意」バッジとタイトルが震える緊急速報風",
  propsDoc: "title: 警告文 / badge: バッジ文言",
  minDuration: 2.0,
  propsSchema: z.object({
    title: z.string().default(""),
    badge: z.string().default("⚠ 注意"),
  }),
  html: (p, ctx) =>
    `<div class="hk-flash" style="position:absolute;inset:0;background:var(--ps-coral);opacity:0;"></div>
     ${stage(
       `<div class="ps-badge hk-badge" style="background:var(--ps-coral);font-size:54px;">${esc(p.badge)}</div>
        <h1 class="ps-h1 hk-title">${esc(p.title || ctx.narration)}</h1>`,
     )}`,
  timeline(a) {
    const s = a.ctx.start;
    for (let i = 0; i < 3; i++) {
      a.tl.fromTo(a.q(".hk-flash"), { opacity: 0 }, { opacity: 0.22, duration: 0.12, yoyo: true, repeat: 1 }, s + 0.05 + i * 0.36);
    }
    a.tl.fromTo(a.q(".hk-badge"), { scale: 2.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.28, ease: "power4.in" }, s + 0.08);
    a.tl.fromTo(a.q(".hk-title"), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power3.out" }, s + 0.45);
    a.tl.fromTo(a.q(".hk-title"), { x: 0 }, { x: 8, duration: 0.05, yoyo: true, repeat: 7 }, s + 0.85);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "buzzer" },
    { at: 0.41, name: "buzzer" },
    { at: 0.85, name: "don" },
  ],
});

export const typewriterBurst = defineFrame({
  id: "hook/typewriter-burst",
  category: "hook",
  description: "タイトルが高速タイプされ、打ち終わりに紙吹雪が弾ける",
  propsDoc: "title: タイプする見出し",
  minDuration: 2.2,
  propsSchema: titleProps,
  html: (p, ctx) =>
    stage(
      `<h1 class="ps-h1" style="text-align:left;">${chars(p.title || ctx.narration, "hk-ch")}<span class="hk-cursor" style="color:var(--ps-accent);">▎</span></h1>
       <div style="position:absolute;inset:0;">${burstHtml(16, seeded(ctx.seed), ["🎀", "★", "✦"], { cy: 780 })}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    const n = [...(a.props.title || a.ctx.narration)].length;
    const per = Math.min(0.07, 0.9 / Math.max(n, 1));
    a.tl.fromTo(`${a.sel} .hk-ch`, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, stagger: per }, s + 0.15);
    const rep = repeats(0.4, a.ctx.duration - 0.2);
    a.tl.fromTo(a.q(".hk-cursor"), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.4, yoyo: true, repeat: rep, ease: "steps(1)" }, s + 0.1);
    burstTl(a, s + 0.25 + n * per, { cls: "prt" });
    sceneExit(a);
  },
  seCues(p, ctx) {
    const n = [...(p.title || ctx.narration)].length;
    const per = Math.min(0.07, 0.9 / Math.max(n, 1));
    const cues: { at: number; name: "click" | "tada" }[] = [];
    for (let i = 0; i < Math.min(n, 8); i++) cues.push({ at: 0.15 + i * per * Math.ceil(n / 8), name: "click" });
    cues.push({ at: 0.3 + n * per, name: "tada" });
    return cues;
  },
});

export const emojiRainOpen = defineFrame({
  id: "hook/emoji-rain-open",
  category: "hook",
  description: "絵文字が雨のように降り注いだあと、タイトルが中央にドン",
  propsDoc: "title: 見出し / emojis: 降らせる絵文字の配列",
  minDuration: 2.4,
  propsSchema: z.object({
    title: z.string().default(""),
    emojis: z.array(z.string()).default(["💻", "✨", "🚀", "🎀"]),
  }),
  html(p, ctx) {
    const rand = seeded(ctx.seed);
    let drops = "";
    for (let i = 0; i < 18; i++) {
      const x = Math.round(rand() * 980) + 40;
      const size = Math.round(52 + rand() * 46);
      const sym = p.emojis[Math.floor(rand() * p.emojis.length)] ?? "✨";
      drops += `<span class="hk-drop" data-delay="${(rand() * 0.7).toFixed(2)}" style="position:absolute;left:${x}px;top:-120px;font-size:${size}px;">${esc(sym)}</span>`;
    }
    return `<div style="position:absolute;inset:0;overflow:hidden;">${drops}</div>
      ${stage(`<h1 class="ps-h1 hk-title">${esc(p.title || ctx.narration)}</h1>`)}
    `;
  },
  timeline(a) {
    const s = a.ctx.start;
    const drops = document.querySelectorAll(`${a.sel} .hk-drop`);
    drops.forEach((el) => {
      const d = Number((el as HTMLElement).dataset.delay ?? 0);
      a.tl.fromTo(el, { y: 0, autoAlpha: 1, rotation: 0 }, { y: 2100, rotation: 120, duration: 1.5, ease: "power1.in" }, s + d);
    });
    a.tl.fromTo(
      a.q(".hk-title"),
      { scale: 0.2, autoAlpha: 0, rotation: -6 },
      { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.45, ease: "back.out(2.4)" },
      s + 0.9,
    );
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "sparkle" },
    { at: 0.5, name: "sparkle" },
    { at: 0.9, name: "don" },
  ],
});

export const spotlightReveal = defineFrame({
  id: "hook/spotlight-reveal",
  category: "hook",
  description: "パステルの幕にスポットライトが開いてタイトルが現れる劇場風オープン",
  propsDoc: "title: 見出し",
  minDuration: 2.2,
  propsSchema: titleProps,
  html: (p, ctx) =>
    `${stage(`<h1 class="ps-h1 hk-title">${esc(p.title || ctx.narration)}</h1>`)}
     <div class="hk-veil" style="position:absolute;inset:0;background:var(--ps-accent);z-index:9;"></div>
     <div class="hk-spot" style="position:absolute;left:340px;top:660px;width:400px;height:400px;border-radius:50%;background:rgba(255,255,255,0.96);z-index:9;box-shadow:0 0 120px 60px rgba(255,255,255,0.96);"></div>`,
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".hk-spot"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: "power3.out" }, s + 0.1);
    a.tl.to(a.q(".hk-spot"), { x: -160, duration: 0.3, ease: "sine.inOut" }, s + 0.55);
    a.tl.to(a.q(".hk-spot"), { x: 160, duration: 0.3, ease: "sine.inOut" }, s + 0.85);
    a.tl.to(a.q(".hk-spot"), { scale: 6, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, s + 1.2);
    a.tl.to(a.q(".hk-veil"), { autoAlpha: 0, duration: 0.45, ease: "power2.out" }, s + 1.3);
    a.tl.fromTo(a.q(".hk-title"), { scale: 0.8 }, { scale: 1, duration: 0.4, ease: "back.out(2)" }, s + 1.35);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.1, name: "pop" },
    { at: 1.3, name: "tada" },
  ],
});

export const hookFrames = [
  impactZoom,
  countdown3,
  yabaiBadge,
  questionSlam,
  statShock,
  beforeAfterFlash,
  sirenAlert,
  typewriterBurst,
  emojiRainOpen,
  spotlightReveal,
];
