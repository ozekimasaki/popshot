/** list: 箇条書き/ランキング 10種 */
import { z } from "zod";
import { defineFrame } from "./types.ts";
import { burstTl, esc, popIn, sceneExit, seeded, stage } from "./helpers.ts";

const itemsProps = z.object({
  items: z.array(z.string()).default(["その1", "その2", "その3"]),
  title: z.string().default(""),
});

export const rankingFlip = defineFrame({
  id: "list/ranking-flip",
  category: "list",
  description: "ランキングが下位から順にめくれ、1位が金メダルで輝く",
  propsDoc: "items: 1位から順の配列 / title: 見出し",
  minDuration: 3.0,
  propsSchema: itemsProps,
  html(p) {
    const medals = ["🥇", "🥈", "🥉"];
    return stage(
      `${p.title ? `<h2 class="ps-h2 li-title">${esc(p.title)}</h2>` : ""}
       <div style="display:flex;flex-direction:column;gap:26px;width:100%;max-width:840px;">
        ${p.items
          .map(
            (it, i) =>
              `<div class="li-row li-r-${i}" ${i === 0 ? 'style="border:6px solid var(--ps-yellow);"' : ""}>
                <div style="font-size:56px;flex:none;">${medals[i] ?? `${i + 1}.`}</div>
                <div>${esc(it)}</div>
              </div>`,
          )
          .join("")}
       </div>`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".li-title"), s + 0.05);
    const n = a.props.items.length;
    for (let i = n - 1; i >= 0; i--) {
      const at = s + 0.35 + (n - 1 - i) * 0.45;
      a.tl.fromTo(
        a.q(`.li-r-${i}`),
        { rotationX: -90, autoAlpha: 0, transformOrigin: "50% 0%" },
        { rotationX: 0, autoAlpha: 1, duration: 0.4, ease: "back.out(1.6)" },
        at,
      );
    }
    const topAt = s + 0.35 + (n - 1) * 0.45 + 0.4;
    a.tl.fromTo(a.q(".li-r-0"), { scale: 1 }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, topAt);
    sceneExit(a);
  },
  seCues(p) {
    const n = p.items.length;
    return [
      ...p.items.map((_, i) => ({ at: 0.35 + i * 0.45, name: "swipe" as const })),
      { at: 0.75 + (n - 1) * 0.45, name: "tada" as const },
    ];
  },
});

export const checklistPop = defineFrame({
  id: "list/checklist-pop",
  category: "list",
  description: "チェックリストに✓が次々スタンプされていく達成感演出",
  propsDoc: "items: 項目配列 / title: 見出し",
  minDuration: 2.8,
  propsSchema: itemsProps,
  html: (p) =>
    stage(
      `${p.title ? `<h2 class="ps-h2 li-title">${esc(p.title)}</h2>` : ""}
       <div style="display:flex;flex-direction:column;gap:26px;width:100%;max-width:840px;">
        ${p.items
          .map(
            (it, i) =>
              `<div class="li-row li-r-${i}">
                <div class="li-check li-c-${i}" style="width:66px;height:66px;border-radius:18px;border:6px solid var(--ps-accent);display:flex;align-items:center;justify-content:center;font-size:44px;color:var(--ps-accent);flex:none;"><span class="li-mark li-m-${i}">✓</span></div>
                <div>${esc(it)}</div>
              </div>`,
          )
          .join("")}
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".li-title"), s + 0.05);
    a.tl.fromTo(`${a.sel} .li-row`, { x: -700, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out", stagger: 0.14 }, s + 0.3);
    a.props.items.forEach((_, i) => {
      const at = s + 0.9 + i * 0.4;
      a.tl.fromTo(a.q(`.li-m-${i}`), { scale: 3, autoAlpha: 0, rotation: 20 }, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.25, ease: "power4.in" }, at);
      a.tl.fromTo(a.q(`.li-r-${i}`), { scale: 1 }, { scale: 1.04, duration: 0.12, yoyo: true, repeat: 1 }, at + 0.22);
    });
    sceneExit(a);
  },
  seCues: (p) => p.items.map((_, i) => ({ at: 1.12 + i * 0.4, name: "ding" as const })),
});

export const bingoGrid = defineFrame({
  id: "list/bingo-grid",
  category: "list",
  description: "3x3ビンゴ盤のセルがめくれて1列が揃い「BINGO!」が弾ける",
  propsDoc: "cells: 9個のセル文言 / line: 揃う列 (0-2 の行番号)",
  minDuration: 3.2,
  propsSchema: z.object({
    cells: z.array(z.string()).length(9).default(["変数", "関数", "型", "配列", "再帰", "クラス", "非同期", "例外", "GC"]),
    line: z.number().int().min(0).max(2).default(1),
  }),
  html: (p) =>
    stage(
      `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;width:100%;max-width:820px;">
        ${p.cells.map((c, i) => `<div class="dg-node li-cell-${i}" style="font-size:38px;min-height:170px;padding:14px;">${esc(c)}</div>`).join("")}
       </div>
       <div class="li-bingo" style="font-size:130px;font-weight:900;color:var(--ps-accent);position:absolute;left:0;right:0;text-align:center;top:44%;z-index:9;">BINGO!</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    for (let i = 0; i < 9; i++) {
      a.tl.fromTo(
        a.q(`.li-cell-${i}`),
        { rotationY: 90, autoAlpha: 0 },
        { rotationY: 0, autoAlpha: 1, duration: 0.3, ease: "back.out(1.6)" },
        s + 0.1 + i * 0.12,
      );
    }
    const row = a.props.line;
    const lineAt = s + 1.5;
    for (let cIdx = 0; cIdx < 3; cIdx++) {
      const i = row * 3 + cIdx;
      a.tl.to(a.q(`.li-cell-${i}`), { backgroundColor: "var(--ps-accent)", color: "#ffffff", scale: 1.12, duration: 0.22, ease: "back.out(2)" }, lineAt + cIdx * 0.22);
    }
    a.tl.fromTo(a.q(".li-bingo"), { scale: 0, autoAlpha: 0, rotation: -12 }, { scale: 1, autoAlpha: 1, rotation: -4, duration: 0.4, ease: "elastic.out(1, 0.5)" }, lineAt + 0.8);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.1, name: "click" },
    { at: 0.5, name: "click" },
    { at: 1.5, name: "coin" },
    { at: 1.72, name: "coin" },
    { at: 1.94, name: "coin" },
    { at: 2.3, name: "tada" },
  ],
});

export const carouselCards = defineFrame({
  id: "list/carousel-cards",
  category: "list",
  description: "カードが横から流れ込み、中央で一瞬止まって流れていくカルーセル",
  propsDoc: "items: カード文言配列 / title: 見出し",
  minDuration: 3.0,
  propsSchema: itemsProps,
  html: (p) =>
    stage(
      `${p.title ? `<h2 class="ps-h2 li-title">${esc(p.title)}</h2>` : ""}
       <div style="position:relative;width:100%;height:560px;">
        ${p.items
          .map(
            (it, i) =>
              `<div class="ps-card li-card-${i}" style="position:absolute;left:90px;right:90px;top:40px;bottom:40px;display:flex;align-items:center;justify-content:center;font-size:56px;font-weight:700;padding:40px;border:6px solid var(--ps-accent);">${esc(it)}</div>`,
          )
          .join("")}
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".li-title"), s + 0.05);
    const n = a.props.items.length;
    const per = Math.max((a.ctx.duration - 0.8) / n, 0.8);
    a.props.items.forEach((_, i) => {
      const at = s + 0.3 + i * per;
      a.tl.fromTo(a.q(`.li-card-${i}`), { x: 1200, autoAlpha: 0, rotation: 6 }, { x: 0, autoAlpha: 1, rotation: 0, duration: 0.4, ease: "power3.out" }, at);
      if (i < n - 1) {
        a.tl.to(a.q(`.li-card-${i}`), { x: -1200, autoAlpha: 0, rotation: -6, duration: 0.35, ease: "power2.in" }, at + per - 0.3);
      }
    });
    sceneExit(a);
  },
  seCues(p, ctx) {
    const per = Math.max((ctx.duration - 0.8) / p.items.length, 0.8);
    return p.items.map((_, i) => ({ at: 0.3 + i * per, name: "swipe" as const }));
  },
});

export const stepLadder = defineFrame({
  id: "list/step-ladder",
  category: "list",
  description: "手順が階段状にせり上がり、番号バッジが弾む",
  propsDoc: "items: 手順配列 / title: 見出し",
  minDuration: 2.8,
  propsSchema: itemsProps,
  html: (p) =>
    stage(
      `${p.title ? `<h2 class="ps-h2 li-title">${esc(p.title)}</h2>` : ""}
       <div style="display:flex;flex-direction:column;gap:26px;width:100%;">
        ${p.items
          .map(
            (it, i) =>
              `<div class="li-row li-r-${i}" style="margin-left:${i * 56}px;width:calc(100% - ${i * 56}px);">
                <div class="li-num">${i + 1}</div><div>${esc(it)}</div>
              </div>`,
          )
          .join("")}
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".li-title"), s + 0.05);
    a.props.items.forEach((_, i) => {
      const at = s + 0.3 + i * 0.35;
      a.tl.fromTo(a.q(`.li-r-${i}`), { y: 300, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: "back.out(1.6)" }, at);
      a.tl.fromTo(`${a.sel} .li-r-${i} .li-num`, { scale: 0, rotation: -180 }, { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2.4)" }, at + 0.15);
    });
    sceneExit(a);
  },
  seCues: (p) => p.items.map((_, i) => ({ at: 0.3 + i * 0.35, name: "pop" as const })),
});

export const versusTable = defineFrame({
  id: "list/versus-table",
  category: "list",
  description: "左右の比較カードが交互に叩き込まれる VS 対決レイアウト",
  propsDoc: "leftTitle/rightTitle: 見出し / leftItems/rightItems: 各側の項目",
  minDuration: 3.0,
  propsSchema: z.object({
    leftTitle: z.string().default("A"),
    rightTitle: z.string().default("B"),
    leftItems: z.array(z.string()).default(["速い"]),
    rightItems: z.array(z.string()).default(["安い"]),
  }),
  html(p) {
    const rows = Math.max(p.leftItems.length, p.rightItems.length);
    let body = "";
    for (let i = 0; i < rows; i++) {
      body += `<div style="display:flex;gap:22px;">
        <div class="ps-card li-l-${i}" style="flex:1;padding:26px;font-size:38px;font-weight:700;border:4px solid var(--ps-cyan);">${esc(p.leftItems[i] ?? "-")}</div>
        <div class="ps-card li-rr-${i}" style="flex:1;padding:26px;font-size:38px;font-weight:700;border:4px solid var(--ps-pink);">${esc(p.rightItems[i] ?? "-")}</div>
      </div>`;
    }
    return stage(
      `<div style="display:flex;gap:22px;width:100%;align-items:center;">
        <div class="ps-pill li-th-l" style="flex:1;background:var(--ps-cyan);font-size:46px;">${esc(p.leftTitle)}</div>
        <div class="li-vs" style="font-size:72px;font-weight:900;color:var(--ps-accent);flex:none;">VS</div>
        <div class="ps-pill li-th-r" style="flex:1;background:var(--ps-pink);font-size:46px;">${esc(p.rightTitle)}</div>
       </div>
       <div style="display:flex;flex-direction:column;gap:22px;width:100%;">${body}</div>`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".li-th-l"), { x: -600, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out" }, s + 0.05);
    a.tl.fromTo(a.q(".li-th-r"), { x: 600, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out" }, s + 0.05);
    a.tl.fromTo(a.q(".li-vs"), { scale: 3, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.3, ease: "power4.in" }, s + 0.4);
    const rows = Math.max(a.props.leftItems.length, a.props.rightItems.length);
    for (let i = 0; i < rows; i++) {
      a.tl.fromTo(a.q(`.li-l-${i}`), { x: -500, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.32, ease: "power3.out" }, s + 0.8 + i * 0.36);
      a.tl.fromTo(a.q(`.li-rr-${i}`), { x: 500, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.32, ease: "power3.out" }, s + 0.98 + i * 0.36);
    }
    sceneExit(a);
  },
  seCues: (p) => {
    const rows = Math.max(p.leftItems.length, p.rightItems.length);
    const cues: { at: number; name: "don" | "swipe" }[] = [{ at: 0.4, name: "don" }];
    for (let i = 0; i < rows; i++) {
      cues.push({ at: 0.8 + i * 0.36, name: "swipe" });
      cues.push({ at: 0.98 + i * 0.36, name: "swipe" });
    }
    return cues;
  },
});

export const tagCloudBurst = defineFrame({
  id: "list/tag-cloud-burst",
  category: "list",
  description: "タグが中央から弾け飛んで雲状に散らばって着地する",
  propsDoc: "items: タグ配列 / title: 見出し",
  minDuration: 2.6,
  propsSchema: itemsProps,
  html(p, ctx) {
    const rand = seeded(ctx.seed);
    const tags = p.items
      .map((it, i) => {
        const x = (rand() - 0.5) * 660;
        const y = (rand() - 0.5) * 760;
        const size = 34 + Math.round(rand() * 26);
        const colors = ["var(--ps-cyan)", "var(--ps-pink)", "var(--ps-purple)", "var(--ps-green)", "var(--ps-yellow)"];
        return `<div class="li-tag li-t-${i}" data-x="${x.toFixed(0)}" data-y="${y.toFixed(0)}" style="position:absolute;left:50%;top:50%;background:${colors[i % colors.length]};color:#fff;font-weight:900;font-size:${size}px;border-radius:70px;padding:16px 40px;white-space:nowrap;">${esc(it)}</div>`;
      })
      .join("");
    return stage(
      `${p.title ? `<h2 class="ps-h2 li-title" style="position:absolute;top:0;left:0;right:0;">${esc(p.title)}</h2>` : ""}
       <div style="position:relative;width:100%;height:800px;">${tags}</div>`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".li-title"), s + 0.05);
    const tags = document.querySelectorAll(`${a.sel} .li-tag`);
    tags.forEach((el, i) => {
      const e = el as HTMLElement;
      const x = Number(e.dataset.x ?? 0);
      const y = Number(e.dataset.y ?? 0);
      a.tl.fromTo(
        e,
        { x: 0, y: 0, xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 0 },
        { x, y, xPercent: -50, yPercent: -50, scale: 1, autoAlpha: 1, duration: 0.5, ease: "back.out(1.4)" },
        s + 0.3 + i * 0.1,
      );
    });
    sceneExit(a);
  },
  seCues: (p) => [
    { at: 0.3, name: "don" },
    ...p.items.slice(0, 4).map((_, i) => ({ at: 0.4 + i * 0.1, name: "pop" as const })),
  ],
});

export const accordionDrop = defineFrame({
  id: "list/accordion-drop",
  category: "list",
  description: "Q&A アコーディオンが開いて答えがぽろっと出てくる",
  propsDoc: "q: 質問 / answers: 開いて出てくる行",
  minDuration: 2.6,
  propsSchema: z.object({
    q: z.string().default("なぜ?"),
    answers: z.array(z.string()).default(["こうだから"]),
  }),
  html: (p) =>
    stage(
      `<div class="li-acc-q ps-pill" style="width:100%;font-size:52px;text-align:left;display:flex;justify-content:space-between;align-items:center;"><span>Q. ${esc(p.q)}</span><span class="li-acc-arrow" style="display:inline-block;">▼</span></div>
       <div style="display:flex;flex-direction:column;gap:20px;width:100%;">
        ${p.answers.map((ans, i) => `<div class="li-row li-a-${i}" style="font-size:42px;">💡 ${esc(ans)}</div>`).join("")}
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".li-acc-q"), s + 0.05, { y: -40 });
    a.tl.to(a.q(".li-acc-arrow"), { rotation: 180, duration: 0.3, ease: "back.out(2)" }, s + 0.55);
    a.props.answers.forEach((_, i) => {
      a.tl.fromTo(
        a.q(`.li-a-${i}`),
        { y: -90, autoAlpha: 0, scaleY: 0.3, transformOrigin: "50% 0%" },
        { y: 0, autoAlpha: 1, scaleY: 1, duration: 0.4, ease: "back.out(1.7)" },
        s + 0.7 + i * 0.3,
      );
    });
    sceneExit(a);
  },
  seCues: (p) => [
    { at: 0.05, name: "pop" },
    { at: 0.55, name: "click" },
    ...p.answers.map((_, i) => ({ at: 0.7 + i * 0.3, name: "pop" as const })),
  ],
});

export const medalPodium = defineFrame({
  id: "list/medal-podium",
  category: "list",
  description: "表彰台がせり上がり、1位が最後にジャンプして輝く",
  propsDoc: "first/second/third: 各順位の名前",
  minDuration: 3.0,
  propsSchema: z.object({
    first: z.string().default("1位"),
    second: z.string().default("2位"),
    third: z.string().default("3位"),
  }),
  html(p) {
    const cols = [
      { label: p.second, medal: "🥈", h: 260, cls: "li-p2", color: "var(--ps-cyan)" },
      { label: p.first, medal: "🥇", h: 380, cls: "li-p1", color: "var(--ps-yellow)" },
      { label: p.third, medal: "🥉", h: 190, cls: "li-p3", color: "var(--ps-pink)" },
    ];
    return stage(
      `<div style="display:flex;align-items:flex-end;gap:26px;width:100%;max-width:860px;height:760px;">
        ${cols
          .map(
            (c) =>
              `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:20px;justify-content:flex-end;">
                <div class="${c.cls}-head" style="font-size:88px;">${c.medal}</div>
                <div class="${c.cls}-name ps-small" style="font-size:40px;">${esc(c.label)}</div>
                <div class="${c.cls}-col" style="width:100%;height:${c.h}px;background:${c.color};border-radius:24px 24px 0 0;transform-origin:50% 100%;box-shadow:var(--ps-shadow-1);"></div>
              </div>`,
          )
          .join("")}
       </div>`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    const order = ["li-p3", "li-p2", "li-p1"];
    order.forEach((cls, i) => {
      const at = s + 0.2 + i * 0.5;
      a.tl.fromTo(a.q(`.${cls}-col`), { scaleY: 0 }, { scaleY: 1, duration: 0.45, ease: "back.out(1.4)" }, at);
      a.tl.fromTo(a.q(`.${cls}-head`), { y: -160, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: "bounce.out" }, at + 0.2);
      a.tl.fromTo(a.q(`.${cls}-name`), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, at + 0.3);
    });
    a.tl.to(a.q(".li-p1-head"), { y: -60, duration: 0.3, yoyo: true, repeat: 3, ease: "power1.inOut" }, s + 1.9);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.2, name: "pop" },
    { at: 0.7, name: "pop" },
    { at: 1.2, name: "pop" },
    { at: 1.9, name: "tada" },
  ],
});

export const swipeCards = defineFrame({
  id: "list/swipe-cards",
  category: "list",
  description: "重なったカードがスワイプで飛んでいき次が現れるマッチングアプリ風",
  propsDoc: "items: カード文言 (上から順に飛んでいく)",
  minDuration: 3.0,
  propsSchema: itemsProps,
  html: (p) =>
    stage(
      `${p.title ? `<h2 class="ps-h2 li-title">${esc(p.title)}</h2>` : ""}
       <div style="position:relative;width:100%;max-width:780px;height:640px;">
        ${p.items
          .map(
            (it, i) =>
              `<div class="ps-card li-sw-${i}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:54px;font-weight:700;padding:40px;border:6px solid var(--ps-accent);z-index:${p.items.length - i};">${esc(it)}</div>`,
          )
          .join("")}
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".li-title"), s + 0.05);
    const n = a.props.items.length;
    a.props.items.forEach((_, i) => {
      a.tl.fromTo(a.q(`.li-sw-${i}`), { y: 90 + i * 4, autoAlpha: 0, rotation: (i % 2 === 0 ? 1 : -1) * (2 + i) }, { y: i * 14, autoAlpha: 1, rotation: (i % 2 === 0 ? 1 : -1) * 2, duration: 0.4, ease: "back.out(1.6)" }, s + 0.2 + i * 0.08);
    });
    const per = Math.max((a.ctx.duration - 1.4) / Math.max(n - 1, 1), 0.6);
    for (let i = 0; i < n - 1; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      a.tl.to(a.q(`.li-sw-${i}`), { x: dir * 1300, rotation: dir * 30, duration: 0.45, ease: "power2.in" }, s + 0.9 + i * per);
      a.tl.to(a.q(`.li-sw-${i + 1}`), { y: 0, rotation: 0, scale: 1.02, duration: 0.3, ease: "back.out(2)" }, s + 1.05 + i * per);
    }
    sceneExit(a);
  },
  seCues(p, ctx) {
    const n = p.items.length;
    const per = Math.max((ctx.duration - 1.4) / Math.max(n - 1, 1), 0.6);
    return Array.from({ length: n - 1 }, (_, i) => ({ at: 0.9 + i * per, name: "swipe" as const }));
  },
});

export const listFrames = [
  rankingFlip,
  checklistPop,
  bingoGrid,
  carouselCards,
  stepLadder,
  versusTable,
  tagCloudBurst,
  accordionDrop,
  medalPodium,
  swipeCards,
];
