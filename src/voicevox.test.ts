import { existsSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { findVoicevoxEngine } from "./voicevox.ts";

describe("findVoicevoxEngine", () => {
  test("検出したパスは実在する", () => {
    const engine = findVoicevoxEngine();
    if (engine) expect(existsSync(engine)).toBe(true);
  });
});
