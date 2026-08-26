/** ブラウザランタイム: 埋め込みマニフェストから単一の paused GSAP timeline を構築する
 *
 * compose が `window.__POPSHOT__` に Manifest を埋め込み、このバンドルが
 * フレームの timeline() / 字幕 / アバター / 背景を1本の timeline にまとめて
 * `window.__timelines.short` に登録する (HyperFrames の規約)。
 */
import { gsap } from "gsap";
import type { Manifest } from "../types.ts";
import { frames } from "../frames/index.ts";
import { seeded } from "../frames/helpers.ts";
import { buildCaptions } from "./captions.ts";
import { buildAvatar } from "./avatar.ts";

declare global {
  interface Window {
    __POPSHOT__: Manifest;
    // biome-ignore lint: hyperframes ランタイムのレジストリ
    __timelines: Record<string, unknown>;
    /** インラインスクリプトから呼ばれるビルダー (lint が登録を検出できるよう登録自体はインライン側で行う) */
    __popshotBuild: () => Promise<{ tl: unknown }>;
  }
}

/**
 * 注意: GSAP timeline は thenable (paused だと永遠に解決しない) なので、
 * async 関数から直接 return せず必ずオブジェクトに包む。
 */
async function build(): Promise<{ tl: unknown }> {
  const m = window.__POPSHOT__;
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]);
  } catch {
    // フォントロード失敗時もフォールバックフォントで続行
  }

  const tl = gsap.timeline({ paused: true });

  // 背景ドットのゆっくりドリフト
  if (document.querySelector("#bg")) {
    tl.fromTo(
      "#bg",
      { x: 0, y: 0 },
      { x: 240, y: 240, duration: m.duration, ease: "none" },
      0,
    );
  }

  for (const scene of m.scenes) {
    const frame = frames[scene.frameId];
    if (!frame) {
      console.error(`unknown frame: ${scene.frameId}`);
      continue;
    }
    const sel = `#scene-${scene.ctx.index}`;
    frame.timeline({
      tl,
      sel,
      props: scene.props as never,
      ctx: scene.ctx,
      gsap,
      rand: seeded(scene.ctx.seed),
      q: (cls: string) => `${sel} ${cls.startsWith(".") ? cls : `.${cls}`}`,
    });
  }

  buildCaptions(tl, m);
  if (m.avatar) buildAvatar(tl, m);

  return { tl };
}

window.__popshotBuild = build;
