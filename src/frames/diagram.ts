/** diagram: 図解 10種 */
import { z } from "zod";
import { defineFrame } from "./types.ts";
import { esc, popIn, repeats, sceneExit, stage } from "./helpers.ts";

const nodesProps = z.object({
  nodes: z.array(z.string()).default(["入力", "処理", "出力"]),
  title: z.string().default(""),
});

export const flowArrows = defineFrame({
  id: "diagram/flow-arrows",
  category: "diagram",
  description: "ノードが順に現れ、間の矢印がにゅっと伸びる縦フロー図",
  propsDoc: "nodes: ノード名の配列 / title: 見出し",
  minDuration: 2.6,
  propsSchema: nodesProps,
  html: (p) =>
    stage(
      `${p.title ? `<h2 class="ps-h2 dg-title">${esc(p.title)}</h2>` : ""}
       <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
        ${p.nodes
          .map(
            (n, i) =>
              `${i > 0 ? `<div class="dg-arrow dg-ar-${i}" style="transform-origin:50% 0%;">↓</div>` : ""}
               <div class="dg-node dg-n-${i}" style="min-width:420px;">${esc(n)}</div>`,
          )
          .join("")}
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".dg-title"), s + 0.05);
    a.props.nodes.forEach((_, i) => {
      const at = s + 0.3 + i * 0.42;
      popIn(a, a.q(`.dg-n-${i}`), at, { scale: 0.4 });
      if (i > 0) {
        a.tl.fromTo(a.q(`.dg-ar-${i}`), { scaleY: 0, autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: 0.25, ease: "power2.out" }, at - 0.18);
      }
    });
    const lastAt = s + 0.3 + a.props.nodes.length * 0.42;
    a.tl.fromTo(a.q(`.dg-n-${a.props.nodes.length - 1}`), { scale: 1 }, { scale: 1.1, duration: 0.16, yoyo: true, repeat: 1 }, lastAt + 0.1);
    sceneExit(a);
  },
  seCues: (p) => [
    ...p.nodes.map((_, i) => ({ at: 0.3 + i * 0.42, name: "pop" as const })),
    { at: 0.4 + p.nodes.length * 0.42, name: "ding" as const },
  ],
});

export const nodeLightUp = defineFrame({
  id: "diagram/node-light-up",
  category: "diagram",
  description: "並んだノードが順番にアクセント色へ点灯していく",
  propsDoc: "nodes: ノード名 / active: 最後に点灯させ続ける index (省略時全部)",
  minDuration: 2.4,
  propsSchema: z.object({
    nodes: z.array(z.string()).default(["A", "B", "C", "D"]),
    active: z.number().int().min(0).optional(),
    title: z.string().default(""),
  }),
  html: (p) =>
    stage(
      `${p.title ? `<h2 class="ps-h2 dg-title">${esc(p.title)}</h2>` : ""}
       <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:30px;">
        ${p.nodes.map((n, i) => `<div class="dg-node dg-n-${i}">${esc(n)}</div>`).join("")}
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".dg-title"), s + 0.05);
    a.tl.fromTo(`${a.sel} .dg-node`, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "back.out(2)", stagger: 0.09 }, s + 0.3);
    a.props.nodes.forEach((_, i) => {
      const at = s + 0.9 + i * 0.3;
      const on = { backgroundColor: "var(--ps-accent)", color: "#ffffff", scale: 1.12, duration: 0.18 };
      a.tl.to(a.q(`.dg-n-${i}`), on, at);
      const keep = a.props.active === undefined || a.props.active === i;
      if (!keep) a.tl.to(a.q(`.dg-n-${i}`), { backgroundColor: "#ffffff", color: "#777777", scale: 1, duration: 0.2 }, at + 0.26);
    });
    sceneExit(a);
  },
  seCues: (p) => p.nodes.map((_, i) => ({ at: 0.9 + i * 0.3, name: "click" as const })),
});

export const layerStack = defineFrame({
  id: "diagram/layer-stack",
  category: "diagram",
  description: "レイヤーが下から積み上がっていくアーキテクチャ図",
  propsDoc: "layers: 下から順のレイヤー名配列 / title: 見出し",
  minDuration: 2.6,
  propsSchema: z.object({
    layers: z.array(z.string()).default(["インフラ", "バックエンド", "フロントエンド"]),
    title: z.string().default(""),
  }),
  html(p) {
    const colors = ["var(--ps-cyan)", "var(--ps-green)", "var(--ps-yellow)", "var(--ps-pink)", "var(--ps-purple)"];
    return stage(
      `${p.title ? `<h2 class="ps-h2 dg-title">${esc(p.title)}</h2>` : ""}
       <div style="display:flex;flex-direction:column-reverse;gap:18px;width:100%;max-width:760px;">
        ${p.layers
          .map(
            (l, i) =>
              `<div class="dg-layer dg-l-${i}" style="background:${colors[i % colors.length]};color:#fff;font-size:50px;font-weight:900;border-radius:26px;padding:34px;box-shadow:var(--ps-shadow-1);">${esc(l)}</div>`,
          )
          .join("")}
       </div>`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".dg-title"), s + 0.05);
    a.props.layers.forEach((_, i) => {
      a.tl.fromTo(
        a.q(`.dg-l-${i}`),
        { y: -520, autoAlpha: 0, rotation: i % 2 === 0 ? -5 : 5 },
        { y: 0, autoAlpha: 1, rotation: 0, duration: 0.5, ease: "bounce.out" },
        s + 0.3 + i * 0.5,
      );
    });
    sceneExit(a);
  },
  seCues: (p) => p.layers.map((_, i) => ({ at: 0.62 + i * 0.5, name: "don" as const })),
});

export const orbitCycle = defineFrame({
  id: "diagram/orbit-cycle",
  category: "diagram",
  description: "中心ノードの周りを衛星ノードがくるくる公転する",
  propsDoc: "center: 中心 / items: 周回ノード配列",
  minDuration: 3.0,
  propsSchema: z.object({
    center: z.string().default("コア"),
    items: z.array(z.string()).default(["A", "B", "C"]),
  }),
  html(p) {
    const R = 330;
    const sats = p.items
      .map((it, i) => {
        const ang = (i / p.items.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(ang) * R;
        const y = Math.sin(ang) * R;
        return `<div class="dg-sat dg-s-${i}" style="position:absolute;left:calc(50% + ${x.toFixed(0)}px);top:calc(50% + ${y.toFixed(0)}px);"><div class="dg-node" style="position:relative;left:-50%;top:-50%;font-size:38px;padding:20px 30px;">${esc(it)}</div></div>`;
      })
      .join("");
    return stage(
      `<div class="dg-orbit" style="position:relative;width:820px;height:820px;">
        <div class="dg-ring" style="position:absolute;inset:80px;border:6px dashed color-mix(in srgb, var(--ps-accent) 50%, transparent);border-radius:50%;"></div>
        <div class="dg-center ps-pill" style="position:absolute;left:50%;top:50%;margin-left:-160px;margin-top:-70px;width:320px;height:140px;display:flex;align-items:center;justify-content:center;font-size:52px;">${esc(p.center)}</div>
        <div class="dg-sats" style="position:absolute;inset:0;">${sats}</div>
       </div>`,
    );
  },
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".dg-center"), s + 0.05, { scale: 0.3 });
    a.tl.fromTo(a.q(".dg-ring"), { scale: 0.5, autoAlpha: 0, rotation: -60 }, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.5, ease: "power3.out" }, s + 0.2);
    a.tl.fromTo(`${a.sel} .dg-sat .dg-node`, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(2.4)", stagger: 0.14 }, s + 0.5);
    const spin = Math.max(a.ctx.duration - 1.4, 1);
    a.tl.to(a.q(".dg-sats"), { rotation: 120 * (spin / 2), duration: spin, ease: "none", transformOrigin: "50% 50%" }, s + 1.1);
    document.querySelectorAll(`${a.sel} .dg-sat .dg-node`).forEach((el) => {
      a.tl.to(el, { rotation: -120 * (spin / 2), duration: spin, ease: "none" }, s + 1.1);
    });
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.5, name: "sparkle" },
  ],
});

export const treeGrow = defineFrame({
  id: "diagram/tree-grow",
  category: "diagram",
  description: "ルートから枝が伸びて子ノードが実る樹形図",
  propsDoc: "root: 親 / children: 子ノード配列",
  minDuration: 2.6,
  propsSchema: z.object({
    root: z.string().default("親"),
    children: z.array(z.string()).default(["子A", "子B", "子C"]),
  }),
  html: (p) =>
    stage(
      `<div class="dg-node dg-root" style="font-size:54px;">${esc(p.root)}</div>
       <div style="display:flex;gap:60px;">
        ${p.children
          .map(
            (c, i) =>
              `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                <div class="dg-branch dg-b-${i}" style="width:8px;height:90px;background:var(--ps-accent);border-radius:6px;transform-origin:50% 0%;"></div>
                <div class="dg-node dg-c-${i}" style="font-size:40px;padding:22px 32px;">${esc(c)}</div>
              </div>`,
          )
          .join("")}
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".dg-root"), s + 0.05, { scale: 0.3 });
    a.props.children.forEach((_, i) => {
      const at = s + 0.5 + i * 0.3;
      a.tl.fromTo(a.q(`.dg-b-${i}`), { scaleY: 0 }, { scaleY: 1, duration: 0.25, ease: "power2.out" }, at);
      popIn(a, a.q(`.dg-c-${i}`), at + 0.2, { scale: 0.3, y: -20 });
    });
    sceneExit(a);
  },
  seCues: (p) => [
    { at: 0.05, name: "pop" },
    ...p.children.map((_, i) => ({ at: 0.7 + i * 0.3, name: "pop" as const })),
  ],
});

export const pipelineConveyor = defineFrame({
  id: "diagram/pipeline-conveyor",
  category: "diagram",
  description: "ベルトコンベアの上をアイテムが流れて工程を通過していく",
  propsDoc: "stages: 工程名配列 / item: 流れるアイテム (絵文字)",
  minDuration: 3.0,
  propsSchema: z.object({
    stages: z.array(z.string()).default(["build", "test", "deploy"]),
    item: z.string().default("📦"),
  }),
  html: (p) =>
    stage(
      `<div style="display:flex;flex-direction:column;gap:70px;width:100%;">
        ${p.stages
          .map(
            (st, i) =>
              `<div style="display:flex;align-items:center;gap:30px;">
                <div class="dg-node dg-st-${i}" style="flex:1;font-size:44px;">${esc(st)}</div>
                <div class="dg-check dg-ck-${i}" style="font-size:64px;">✅</div>
              </div>`,
          )
          .join("")}
       </div>
       <div class="dg-item" style="position:absolute;left:40px;top:-40px;font-size:96px;">${esc(p.item)}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    const n = a.props.stages.length;
    a.tl.fromTo(`${a.sel} .dg-node`, { x: -800, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out", stagger: 0.12 }, s + 0.05);
    a.tl.set(`${a.sel} .dg-check`, { autoAlpha: 0 }, s);
    popIn(a, a.q(".dg-item"), s + 0.4);
    const per = Math.max((a.ctx.duration - 1.6) / n, 0.5);
    for (let i = 0; i < n; i++) {
      const at = s + 0.7 + i * per;
      a.tl.to(a.q(".dg-item"), { y: 60 + i * 190, duration: per * 0.6, ease: "power1.inOut" }, at);
      a.tl.fromTo(a.q(`.dg-ck-${i}`), { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(3)" }, at + per * 0.62);
      a.tl.fromTo(a.q(`.dg-st-${i}`), { scale: 1 }, { scale: 1.06, duration: 0.14, yoyo: true, repeat: 1 }, at + per * 0.6);
    }
    sceneExit(a);
  },
  seCues(p, ctx) {
    const per = Math.max((ctx.duration - 1.6) / p.stages.length, 0.5);
    return p.stages.map((_, i) => ({ at: 0.7 + i * per + per * 0.62, name: "ding" as const }));
  },
});

export const vennMerge = defineFrame({
  id: "diagram/venn-merge",
  category: "diagram",
  description: "2つの円が寄り合ってベン図になり、重なりにラベルが弾ける",
  propsDoc: "left/right: 円のラベル / overlap: 重なりのラベル",
  minDuration: 2.6,
  propsSchema: z.object({
    left: z.string().default("A"),
    right: z.string().default("B"),
    overlap: z.string().default("いいとこ取り"),
  }),
  html: (p) =>
    stage(
      `<div style="position:relative;width:900px;height:620px;">
        <div class="dg-vl" style="position:absolute;left:0;top:60px;width:500px;height:500px;border-radius:50%;background:color-mix(in srgb, var(--ps-cyan) 55%, transparent);display:flex;align-items:center;justify-content:center;font-size:56px;font-weight:900;color:#5da7b5;">${esc(p.left)}</div>
        <div class="dg-vr" style="position:absolute;right:0;top:60px;width:500px;height:500px;border-radius:50%;background:color-mix(in srgb, var(--ps-pink) 55%, transparent);display:flex;align-items:center;justify-content:center;font-size:56px;font-weight:900;color:#c46a8e;">${esc(p.right)}</div>
        <div class="dg-vo ps-pill" style="position:absolute;left:50%;top:270px;margin-left:-200px;width:400px;text-align:center;font-size:42px;padding:20px 10px;z-index:2;">${esc(p.overlap)}</div>
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(a.q(".dg-vl"), { x: -600, autoAlpha: 0 }, { x: 90, autoAlpha: 1, duration: 0.55, ease: "power3.out" }, s + 0.05);
    a.tl.fromTo(a.q(".dg-vr"), { x: 600, autoAlpha: 0 }, { x: -90, autoAlpha: 1, duration: 0.55, ease: "power3.out" }, s + 0.05);
    a.tl.fromTo(a.q(".dg-vo"), { scale: 0, autoAlpha: 0, rotation: -8 }, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.45, ease: "elastic.out(1, 0.5)" }, s + 0.75);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "whoosh" },
    { at: 0.6, name: "don" },
    { at: 0.78, name: "sparkle" },
  ],
});

export const timelineWalk = defineFrame({
  id: "diagram/timeline-walk",
  category: "diagram",
  description: "タイムラインの点が順に灯り、ラベルが横から差し込まれる年表風",
  propsDoc: "steps: 時系列ラベルの配列 / title: 見出し",
  minDuration: 2.8,
  propsSchema: z.object({
    steps: z.array(z.string()).default(["昔", "今", "未来"]),
    title: z.string().default(""),
  }),
  html: (p) =>
    stage(
      `${p.title ? `<h2 class="ps-h2 dg-title">${esc(p.title)}</h2>` : ""}
       <div style="display:flex;flex-direction:column;gap:0;width:100%;max-width:800px;">
        ${p.steps
          .map(
            (st, i) =>
              `<div style="display:flex;align-items:center;gap:34px;min-height:150px;">
                <div style="display:flex;flex-direction:column;align-items:center;align-self:stretch;">
                  <div class="dg-dot dg-d-${i}" style="width:44px;height:44px;border-radius:50%;background:var(--ps-accent);flex:none;"></div>
                  ${i < p.steps.length - 1 ? `<div class="dg-line dg-ln-${i}" style="width:8px;flex:1;background:color-mix(in srgb, var(--ps-accent) 45%, transparent);border-radius:4px;transform-origin:50% 0%;"></div>` : ""}
                </div>
                <div class="dg-node dg-lb-${i}" style="font-size:42px;margin-bottom:20px;">${esc(st)}</div>
              </div>`,
          )
          .join("")}
       </div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    if (a.props.title) popIn(a, a.q(".dg-title"), s + 0.05);
    a.props.steps.forEach((_, i) => {
      const at = s + 0.35 + i * 0.5;
      a.tl.fromTo(a.q(`.dg-d-${i}`), { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, at);
      a.tl.fromTo(a.q(`.dg-lb-${i}`), { x: 300, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.35, ease: "power3.out" }, at + 0.1);
      if (i < a.props.steps.length - 1) {
        a.tl.fromTo(a.q(`.dg-ln-${i}`), { scaleY: 0 }, { scaleY: 1, duration: 0.3 }, at + 0.25);
      }
    });
    sceneExit(a);
  },
  seCues: (p) => p.steps.map((_, i) => ({ at: 0.35 + i * 0.5, name: "pop" as const })),
});

export const boxConnect = defineFrame({
  id: "diagram/box-connect",
  category: "diagram",
  description: "2つのボックスの間を線がつながりパケットが往復する通信図",
  propsDoc: "from/to: ボックス名 / packet: 飛ぶ絵文字",
  minDuration: 2.8,
  propsSchema: z.object({
    from: z.string().default("クライアント"),
    to: z.string().default("サーバー"),
    packet: z.string().default("📨"),
  }),
  html: (p) =>
    stage(
      `<div class="dg-node dg-from" style="font-size:48px;">${esc(p.from)}</div>
       <div style="position:relative;height:300px;width:12px;">
        <div class="dg-wire" style="position:absolute;inset:0;background:var(--ps-accent);border-radius:6px;transform-origin:50% 0%;"></div>
        <div class="dg-pkt" style="position:absolute;left:-42px;top:-20px;font-size:80px;">${esc(p.packet)}</div>
       </div>
       <div class="dg-node dg-to" style="font-size:48px;">${esc(p.to)}</div>`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    popIn(a, a.q(".dg-from"), s + 0.05);
    popIn(a, a.q(".dg-to"), s + 0.2);
    a.tl.fromTo(a.q(".dg-wire"), { scaleY: 0 }, { scaleY: 1, duration: 0.35, ease: "power2.out" }, s + 0.45);
    a.tl.fromTo(a.q(".dg-pkt"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, s + 0.8);
    a.tl.fromTo(a.q(".dg-pkt"), { y: 0 }, { y: 260, duration: 0.8, yoyo: true, repeat: repeats(0.8, a.ctx.duration - 1.4), ease: "power1.inOut" }, s + 0.85);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.45, name: "swipe" },
    { at: 0.85, name: "coin" },
  ],
});

export const zoomMap = defineFrame({
  id: "diagram/zoom-map",
  category: "diagram",
  description: "全体図からグッとズームして注目箇所がハイライトされる",
  propsDoc: "cells: 全体のセル名配列 / focus: ズームするセル index",
  minDuration: 2.8,
  propsSchema: z.object({
    cells: z.array(z.string()).default(["UI", "API", "DB", "CDN", "認証", "キュー"]),
    focus: z.number().int().min(0).default(2),
    note: z.string().default(""),
  }),
  html: (p) =>
    stage(
      `<div class="dg-map" style="display:grid;grid-template-columns:repeat(2, 1fr);gap:26px;width:100%;max-width:760px;">
        ${p.cells.map((c, i) => `<div class="dg-node dg-cell-${i}" style="font-size:42px;min-height:130px;">${esc(c)}</div>`).join("")}
       </div>
       ${p.note ? `<div class="ps-pill dg-note" style="font-size:40px;">${esc(p.note)}</div>` : ""}`,
    ),
  timeline(a) {
    const s = a.ctx.start;
    a.tl.fromTo(`${a.sel} .dg-node`, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.32, ease: "back.out(2)", stagger: 0.07 }, s + 0.05);
    const f = Math.min(a.props.focus, a.props.cells.length - 1);
    const at = s + 0.9;
    a.props.cells.forEach((_, i) => {
      if (i === f) {
        a.tl.to(a.q(`.dg-cell-${i}`), { scale: 1.28, backgroundColor: "var(--ps-accent)", color: "#ffffff", duration: 0.4, ease: "back.out(2)" }, at);
      } else {
        a.tl.to(a.q(`.dg-cell-${i}`), { opacity: 0.3, scale: 0.92, duration: 0.4 }, at);
      }
    });
    if (a.props.note) popIn(a, a.q(".dg-note"), at + 0.4);
    sceneExit(a);
  },
  seCues: () => [
    { at: 0.05, name: "pop" },
    { at: 0.9, name: "whoosh" },
    { at: 1.3, name: "coin" },
  ],
});

export const diagramFrames = [
  flowArrows,
  nodeLightUp,
  layerStack,
  orbitCycle,
  treeGrow,
  pipelineConveyor,
  vennMerge,
  boxConnect,
  timelineWalk,
  zoomMap,
];
