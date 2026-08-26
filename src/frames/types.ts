/** フレーム (シーンテンプレート) の契約。html は Node、timeline はブラウザで実行される */
import type { z } from "zod";
import type { FrameContextData, SECue } from "../types.ts";

export const FRAME_CATEGORIES = [
  "hook",
  "text",
  "code",
  "terminal",
  "diagram",
  "list",
  "stat",
  "quiz",
  "transition",
  "outro",
] as const;

export type FrameCategory = (typeof FRAME_CATEGORIES)[number];

/** GSAP timeline (構造型。gsap の型依存をブラウザバンドルに持ち込まない) */
// biome-ignore lint: gsap は動的APIのため any で受ける
export type Tl = any;

export interface TimelineArgs<P = unknown> {
  tl: Tl;
  /** シーン要素セレクタ (例 "#scene-3") */
  sel: string;
  props: P;
  ctx: FrameContextData;
  // biome-ignore lint: gsap グローバル
  gsap: any;
  /** シード付き PRNG (決定論) */
  rand: () => number;
  /** q(".foo") => `${sel} .foo` */
  q: (cls: string) => string;
}

/** terminal カテゴリ用: tcut 動画の配置スロット (1080x1920 キャンバス座標) */
export interface TerminalSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
}

export interface Frame<P = unknown> {
  id: string;
  category: FrameCategory;
  /** カタログ表示用の日本語1行説明 */
  description: string;
  /** props の書き方 (カタログ用) */
  propsDoc: string;
  /** このフレームが成立する最小尺 (秒) */
  minDuration: number;
  propsSchema: z.ZodType<P>;
  /** terminal カテゴリのみ: 動画スロット */
  terminalSlot?: TerminalSlot;
  /** シーン div の中身 (compose 時に Node で実行) */
  html(props: P, ctx: FrameContextData): string;
  /** GSAP tween の追加 (レンダリング時にブラウザで実行)。位置は ctx.start 起点の絶対秒 */
  timeline(args: TimelineArgs<P>): void;
  /** 既定 SE (シーンローカル秒)。YAML の se で上書き可能 */
  seCues(props: P, ctx: FrameContextData): SECue[];
}

// 型推論を効かせるためのヘルパー
export function defineFrame<P>(f: Frame<P>): Frame<P> {
  return f;
}
