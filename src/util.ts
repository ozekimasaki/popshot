import { createHash } from "node:crypto";

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

/** 実行環境の Chrome バイナリを探す */
export function findChrome(): string | null {
  const candidates = [
    process.env.BUN_CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const c of candidates) {
    if (c && Bun.file(c).size > 0) return c;
  }
  return null;
}
