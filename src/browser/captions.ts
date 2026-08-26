/** カラオケ字幕のタイムライン構築 (ブラウザで実行) */
import type { Manifest } from "../types.ts";
import type { Tl } from "../frames/types.ts";

export function buildCaptions(tl: Tl, m: Manifest): void {
  m.captions.forEach((page, pi) => {
    const pageSel = `#cap-${pi}`;
    const el = document.querySelector(pageSel);
    if (!el) return;
    // ページ表示 (CSS 初期 opacity:0 → fromTo で入退場)
    tl.fromTo(
      pageSel,
      { autoAlpha: 0, y: 40, scale: 0.94 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: "back.out(1.8)" },
      page.start,
    );
    tl.to(pageSel, { autoAlpha: 0, y: -24, duration: 0.16, ease: "power2.in" }, page.end - 0.16);

    // 文字ごとのカラオケポップ
    const chars = el.querySelectorAll(".cap-ch");
    chars.forEach((ch, i) => {
      const info = page.chars[i];
      if (!info) return;
      tl.fromTo(
        ch,
        { color: "#b9b9b9", scale: 1 },
        { color: "var(--ps-accent)", scale: 1.18, duration: 0.09, ease: "power2.out" },
        Math.max(info.t, page.start + 0.05),
      );
      tl.to(ch, { color: "#777777", scale: 1, duration: 0.14 }, Math.max(info.t, page.start + 0.05) + 0.09);
    });
  });
}
