/** 100 フレームのレジストリ */
import type { Frame, FrameCategory } from "./types.ts";
import { hookFrames } from "./hook.ts";
import { textFrames } from "./text.ts";
import { codeFrames } from "./code.ts";
import { terminalFrames } from "./terminal.ts";
import { diagramFrames } from "./diagram.ts";
import { listFrames } from "./list.ts";
import { statFrames } from "./stat.ts";
import { quizFrames } from "./quiz.ts";
import { transitionFrames } from "./transition.ts";
import { outroFrames } from "./outro.ts";

// biome-ignore lint: フレームは props 型が個別なので unknown で束ねる
const all = [
  ...hookFrames,
  ...textFrames,
  ...codeFrames,
  ...terminalFrames,
  ...diagramFrames,
  ...listFrames,
  ...statFrames,
  ...quizFrames,
  ...transitionFrames,
  ...outroFrames,
] as unknown as Frame[];

export const frames: Record<string, Frame> = Object.fromEntries(all.map((f) => [f.id, f]));

export function getFrame(id: string): Frame {
  const f = frames[id];
  if (!f) {
    const suggestions = Object.keys(frames)
      .filter((k) => k.startsWith(`${id.split("/")[0]}/`))
      .slice(0, 5);
    throw new Error(
      `フレーム "${id}" は存在しません。${suggestions.length > 0 ? `候補: ${suggestions.join(", ")}` : "`popshot frames` で一覧を確認してください。"}`,
    );
  }
  return f;
}

export function framesByCategory(): Map<FrameCategory, Frame[]> {
  const map = new Map<FrameCategory, Frame[]>();
  for (const f of all) {
    const list = map.get(f.category) ?? [];
    list.push(f);
    map.set(f.category, list);
  }
  return map;
}

export const frameCount = all.length;
