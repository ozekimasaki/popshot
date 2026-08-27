import { existsSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { findChrome, fromModuleUrl } from "./util.ts";

describe("fromModuleUrl", () => {
  test("import.meta.url からの相対パスを実在するネイティブパスにする", () => {
    const p = fromModuleUrl("./util.ts", import.meta.url);
    expect(existsSync(p)).toBe(true);
    if (process.platform === "win32") {
      expect(p).not.toMatch(/^\//);
      expect(p).toMatch(/^[A-Za-z]:\\/);
    }
  });
});

describe("findChrome", () => {
  test("検出したパスは実在する", () => {
    const chrome = findChrome();
    if (chrome) expect(existsSync(chrome)).toBe(true);
  });
});
