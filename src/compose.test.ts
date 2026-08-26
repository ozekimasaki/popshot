import { describe, expect, test } from "bun:test";
import { computeTimings } from "./compose.ts";
import type { LoadedScript } from "./script.ts";
import type { VoiceResult } from "./types.ts";

function script(scenes: { frame: string; duration?: number }[]): LoadedScript {
  return {
    yamlPath: "/tmp/t.yaml",
    baseDir: "/tmp",
    config: {
      title: "t",
      theme: "cyan",
      speaker: 3,
      speedScale: 1.15,
      bgmVolume: 0.12,
      avatar: true,
      fps: 30,
      scenes: scenes.map((s) => ({
        frame: s.frame,
        narration: "",
        props: {},
        duration: s.duration,
      })),
    } as LoadedScript["config"],
  };
}

function vo(duration: number): VoiceResult {
  return { wavPath: null, duration, moras: [], mock: true };
}

describe("computeTimings", () => {
  test("通常シーンは VO 尺 + パディングで連結される", () => {
    const { timings, total } = computeTimings(
      script([{ frame: "hook/impact-zoom" }, { frame: "text/char-pop" }]),
      [vo(3.0), vo(2.0)],
    );
    expect(timings[0]!.start).toBe(0);
    expect(timings[0]!.duration).toBeCloseTo(3.45, 2);
    expect(timings[1]!.start).toBeCloseTo(3.45, 2);
    expect(total).toBeGreaterThan(timings[1]!.start + timings[1]!.duration);
  });

  test("VO が短くてもフレーム最小尺を下回らない", () => {
    const { timings } = computeTimings(script([{ frame: "quiz/choice-3" }]), [vo(0.5)]);
    expect(timings[0]!.duration).toBeGreaterThanOrEqual(4.0);
  });

  test("明示 duration が VO より優先される", () => {
    const { timings } = computeTimings(
      script([{ frame: "text/char-pop", duration: 8 }]),
      [vo(2.0)],
    );
    expect(timings[0]!.duration).toBe(8);
  });

  test("トランジションは前シーン末尾に 0.4s 重なり、次シーンはカバー時点から始まる", () => {
    const { timings } = computeTimings(
      script([
        { frame: "text/char-pop" },
        { frame: "transition/pill-bounce-wipe" },
        { frame: "text/char-pop" },
      ]),
      [vo(3.0), vo(0), vo(3.0)],
    );
    const sceneEnd = timings[0]!.start + timings[0]!.duration;
    expect(timings[1]!.start).toBeCloseTo(sceneEnd - 0.4, 2);
    expect(timings[2]!.start).toBeCloseTo(timings[1]!.start + 0.4, 2);
  });
});
