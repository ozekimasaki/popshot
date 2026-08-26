/** フレーム実装用の共通ヘルパー (ブラウザセーフ: Node API を import しない) */
import type { TimelineArgs } from "./types.ts";

/** シード付き PRNG (mulberry32)。html/timeline 両方で決定論を担保する */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** 1文字ずつ .ch スパンに分解 (文字ポップ用) */
export function chars(text: string, cls = ""): string {
  return [...text]
    .map((c) => `<span class="ch ${cls}">${c === " " ? "&nbsp;" : esc(c)}</span>`)
    .join("");
}

/** 中央寄せステージ (セーフゾーン内 flex 縦積み) */
export function stage(inner: string, extraStyle = ""): string {
  return `<div class="fx-stage" style="${extraStyle}">${inner}</div>`;
}

/** 尺内に収まる有限リピート回数 (yoyo 前提: 片道 period 秒 × 偶数回で元の位置に戻る) */
export function repeats(period: number, avail: number): number {
  const passes = Math.floor(avail / period);
  const even = passes - (passes % 2);
  return Math.max(1, even - 1);
}

/** 絵文字/記号パーティクル。data-* に決定論的な飛散パラメータを焼き込む */
export function burstHtml(
  n: number,
  rand: () => number,
  symbols: string[],
  opts: { cls?: string; cx?: number; cy?: number; spread?: number; size?: number } = {},
): string {
  const { cls = "prt", cx = 540, cy = 860, spread = 460, size = 60 } = opts;
  let out = "";
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + rand() * 0.9;
    const dist = spread * (0.55 + rand() * 0.45);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist * 0.85;
    const rot = Math.round((rand() - 0.5) * 340);
    const sym = symbols[Math.floor(rand() * symbols.length)] ?? "✦";
    const fs = Math.round(size * (0.7 + rand() * 0.6));
    out += `<span class="${cls}" data-dx="${dx.toFixed(0)}" data-dy="${dy.toFixed(0)}" data-r="${rot}" style="left:${cx}px;top:${cy}px;font-size:${fs}px;">${esc(sym)}</span>`;
  }
  return out;
}

/** burstHtml で焼いたパーティクルを飛散させる */
export function burstTl(
  a: Pick<TimelineArgs, "tl" | "sel">,
  at: number,
  opts: { cls?: string; duration?: number; stagger?: number } = {},
): void {
  const { cls = "prt", duration = 0.9, stagger = 0.012 } = opts;
  const els = document.querySelectorAll(`${a.sel} .${cls}`);
  els.forEach((el, i) => {
    const e = el as HTMLElement;
    const dx = Number(e.dataset.dx ?? 0);
    const dy = Number(e.dataset.dy ?? 0);
    const r = Number(e.dataset.r ?? 0);
    a.tl.fromTo(
      e,
      { x: 0, y: 0, rotation: 0, scale: 0, autoAlpha: 0 },
      { x: dx, y: dy, rotation: r, scale: 1, autoAlpha: 1, duration: duration * 0.45, ease: "power3.out" },
      at + i * stagger,
    );
    a.tl.to(e, { autoAlpha: 0, scale: 0.4, duration: duration * 0.4, ease: "power2.in" }, at + duration * 0.55 + i * stagger);
  });
}

/** 文字ポップ入場 (scale 0→オーバーシュート→1) */
export function popChars(
  a: Pick<TimelineArgs, "tl" | "sel">,
  cls: string,
  at: number,
  opts: { stagger?: number; duration?: number; from?: Record<string, unknown> } = {},
): void {
  const { stagger = 0.04, duration = 0.42, from = {} } = opts;
  a.tl.fromTo(
    `${a.sel} .${cls}`,
    { scale: 0, autoAlpha: 0, y: 26, ...from },
    { scale: 1, autoAlpha: 1, y: 0, duration, ease: "back.out(2.2)", stagger },
    at,
  );
}

/** 汎用ポップイン */
export function popIn(
  a: Pick<TimelineArgs, "tl">,
  target: string | Element,
  at: number,
  opts: { duration?: number; y?: number; scale?: number; ease?: string } = {},
): void {
  const { duration = 0.5, y = 42, scale = 0.6, ease = "back.out(1.8)" } = opts;
  a.tl.fromTo(
    target,
    { autoAlpha: 0, y, scale },
    { autoAlpha: 1, y: 0, scale: 1, duration, ease },
    at,
  );
}

/** シーン退場 (末尾 0.25s で高速フェードアウト) */
export function sceneExit(a: Pick<TimelineArgs, "tl" | "sel" | "ctx">, target?: string): void {
  const end = a.ctx.start + a.ctx.duration;
  a.tl.to(target ?? `${a.sel} .fx-stage`, { autoAlpha: 0, y: -36, duration: 0.22, ease: "power2.in" }, end - 0.24);
}

/** 数値カウントアップ。要素の textContent を snap しながら更新 */
export function countUp(
  a: Pick<TimelineArgs, "tl" | "gsap">,
  target: string,
  from: number,
  to: number,
  at: number,
  opts: { duration?: number; suffix?: string; decimals?: number } = {},
): void {
  const { duration = 1.0, suffix = "", decimals = 0 } = opts;
  const obj = { v: from };
  a.tl.to(
    obj,
    {
      v: to,
      duration,
      ease: "power2.out",
      onUpdate() {
        const el = document.querySelector(target);
        if (el) el.textContent = obj.v.toFixed(decimals) + suffix;
      },
    },
    at,
  );
}

/** ゆるい常時アニメーション (ふわふわ)。有限リピート */
export function floatLoop(
  a: Pick<TimelineArgs, "tl" | "ctx">,
  target: string,
  at: number,
  opts: { dy?: number; period?: number } = {},
): void {
  const { dy = 12, period = 0.9 } = opts;
  const avail = a.ctx.start + a.ctx.duration - at;
  const rep = repeats(period, avail);
  if (rep <= 0) return;
  a.tl.fromTo(
    target,
    { y: 0 },
    { y: -dy, duration: period, ease: "sine.inOut", yoyo: true, repeat: rep },
    at,
  );
}

/** かんたんコードハイライト (キーワード/文字列/コメント/数値) */
export function highlightCode(code: string, lineCls = "code-line"): string {
  const kw =
    /\b(const|let|var|function|return|import|export|from|if|else|for|while|async|await|class|new|def|fn|pub|use|mut|type|interface|git|npm|bun|docker|curl)\b/g;
  const lines = code.split("\n").map((line) => {
    let h = esc(line);
    h = h.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`.*?`)/g, '<span class="tok-s">$1</span>');
    h = h.replace(/(\/\/.*$|#.*$)/g, '<span class="tok-c">$1</span>');
    h = h.replace(kw, '<span class="tok-k">$1</span>');
    h = h.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-n">$1</span>');
    return `<div class="${lineCls}">${h || "&nbsp;"}</div>`;
  });
  return lines.join("");
}
