import { existsSync } from "node:fs";
import { dirname, join, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

/** import.meta.url からの相対パスを OS ネイティブパスに変換 (Windows の `/C:/` 問題回避) */
export function fromModuleUrl(rel: string, base: string): string {
  return fileURLToPath(new URL(rel, base));
}

/** 安定した内容ハッシュ (キャッシュキー用) */
export function contentHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

/** HTML エスケープ */
export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** タイトル → ファイル名スラッグ */
export function slugify(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return s || "short";
}

/** 秒を小数3桁に丸める (HTML 属性の肥大化防止) */
export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function log(msg: string): void {
  console.log(`  ${msg}`);
}

export function logStage(stage: string, msg: string): void {
  console.log(`\x1b[36m[${stage}]\x1b[0m ${msg}`);
}

export function logCache(stage: string, msg: string): void {
  console.log(`\x1b[90m[${stage}] [cache] ${msg}\x1b[0m`);
}

export function logWarn(msg: string): void {
  console.warn(`\x1b[33m[warn]\x1b[0m ${msg}`);
}

export function logError(msg: string): void {
  console.error(`\x1b[31m[error]\x1b[0m ${msg}`);
}

/** ffprobe でメディアの尺 (秒) を取得 */
export async function probeDuration(file: string): Promise<number> {
  const proc = Bun.spawn(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  if ((await proc.exited) !== 0) throw new Error(`ffprobe に失敗: ${file}`);
  return Number.parseFloat(out.trim());
}

function firstExisting(candidates: Array<string | undefined>): string | null {
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return null;
}

/** 実行環境の Chrome / Chromium バイナリを探す */
export function findChrome(): string | null {
  const pf = process.env.PROGRAMFILES ?? "C:\\Program Files";
  const pf86 = process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)";
  const local = process.env.LOCALAPPDATA ?? "";
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  return firstExisting([
    process.env.BUN_CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    join(pf, "Google", "Chrome", "Application", "chrome.exe"),
    join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
    local ? join(local, "Google", "Chrome", "Application", "chrome.exe") : undefined,
    join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    home ? join(home, "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome") : undefined,
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/snap/bin/google-chrome",
  ]);
}

/** Windows で tcut が bash を使うための Git Bash パス (WSL の bash.exe は使わない) */
export function findGitBash(): string | null {
  if (process.platform !== "win32") return null;
  const pf = process.env.PROGRAMFILES ?? "C:\\Program Files";
  const local = process.env.LOCALAPPDATA ?? "";
  const home = process.env.USERPROFILE ?? "";
  return firstExisting([
    process.env.BUN_BASH_PATH,
    join(pf, "Git", "bin", "bash.exe"),
    join(pf, "Git", "usr", "bin", "bash.exe"),
    home ? join(home, "scoop", "apps", "git", "current", "bin", "bash.exe") : undefined,
    local ? join(local, "Programs", "Git", "bin", "bash.exe") : undefined,
  ]);
}

/** Git for Windows の unix ツール (bash / mktemp) を PATH 先頭に足す */
export function withUnixToolsPath(env: Record<string, string>): Record<string, string> {
  const bash = findGitBash();
  if (!bash) return env;
  const gitBin = dirname(bash);
  const gitRoot = dirname(gitBin);
  const dirs = [gitBin, join(gitRoot, "usr", "bin"), join(gitRoot, "mingw64", "bin")];
  const pathKey = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "PATH";
  const current = env[pathKey] ?? "";
  return { ...env, [pathKey]: `${dirs.join(delimiter)}${delimiter}${current}` };
}
