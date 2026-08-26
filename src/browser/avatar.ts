/** 右下アバターのタイムライン構築 (ブラウザで実行)
 *
 * - 入場: 0.3s で下からポップイン
 * - アイドル: ふわふわ呼吸バウンス (有限 repeat)
 * - 口パク: モーラ開始ごとに scaleY squash (最大 10 回/s に間引き済み)
 * - リアクション: シーン切替で首振り、outro で大きく手を振る
 */
import type { Manifest } from "../types.ts";
import type { Tl } from "../frames/types.ts";
import { repeats } from "../frames/helpers.ts";

const SEL = "#avatar-img";

export function buildAvatar(tl: Tl, m: Manifest): void {
  if (!document.querySelector(SEL)) return;
  tl.set(SEL, { transformOrigin: "50% 100%" }, 0);

  // 入場
  tl.fromTo(
    SEL,
    { y: 320, autoAlpha: 0, scale: 0.6 },
    { y: 0, autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.8)" },
    0.25,
  );

  // アイドル呼吸 (y は口パクと別プロパティなので干渉しない)
  const idlePeriod = 1.1;
  const idleStart = 0.9;
  const rep = repeats(idlePeriod, m.duration - idleStart - 0.2);
  tl.fromTo(
    "#avatar-layer",
    { y: 0 },
    { y: -10, duration: idlePeriod, yoyo: true, repeat: rep, ease: "sine.inOut" },
    idleStart,
  );

  // 口パク squash
  for (const t of m.moraOnsets) {
    if (t < 0.9) continue;
    tl.to(SEL, { scaleY: 0.945, scaleX: 1.02, duration: 0.055, ease: "power2.out" }, t);
    tl.to(SEL, { scaleY: 1, scaleX: 1, duration: 0.075, ease: "power2.in" }, t + 0.055);
  }

  // シーン切替リアクション (首振り)
  for (const st of m.sceneStarts) {
    if (st < 1 || st > m.duration - 1) continue;
    tl.to(SEL, { rotation: 5, duration: 0.11, ease: "power1.inOut" }, st);
    tl.to(SEL, { rotation: -4, duration: 0.11, ease: "power1.inOut" }, st + 0.11);
    tl.to(SEL, { rotation: 0, duration: 0.12, ease: "power1.out" }, st + 0.22);
  }

  // outro: 大きめのジャンプ + 手を振る風の揺れ
  if (m.outroStart !== null && m.outroStart < m.duration - 1.2) {
    const at = m.outroStart + 0.2;
    tl.to(SEL, { y: -46, duration: 0.24, ease: "power2.out", yoyo: true, repeat: 3 }, at);
    tl.to(SEL, { rotation: 9, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, at + 1.0);
    tl.to(SEL, { rotation: 0, duration: 0.2 }, at + 2.2);
  }
}
