/** Irodori-TTS (Colab) バッチ合成エンジン。
 *  未キャッシュの narration をまとめて Colab GPU セッションで wav 化する。
 *  モーラタイミングは得られないため moras は空 (字幕は等配フォールバック)。 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { VoiceResult } from "./types.ts";
import { contentHash, fromModuleUrl, logCache, logStage, probeDuration } from "./util.ts";

const WSL_DISTRO = process.env.POPSHOT_COLAB_DISTRO ?? "Ubuntu-24.04";
const SESSION = process.env.POPSHOT_COLAB_SESSION ?? "popshot-tts";

export interface IrodoriBatchOptions {
  texts: string[];
  /** ローカル safetensors パス、または hf:<repo/id> */
  model: string;
  gpu: string;
  caption: string;
  speedScale: number;
  outDir: string;
  noCache: boolean;
}

function cacheKey(text: string, model: string, speedScale: number): string {
  return contentHash({ text, model, speedScale, engine: "irodori", v: 1 });
}

/** Windows パスを WSL パスに変換 (C:\foo\bar → /mnt/c/foo/bar) */
function toWslPath(p: string): string {
  const m = p.replace(/\\/g, "/").match(/^([A-Za-z]):\/(.*)$/);
  return m ? `/mnt/${m[1]!.toLowerCase()}/${m[2]}` : p;
}

function colabCmd(): string[] {
  return process.platform === "win32" ? ["wsl", "-d", WSL_DISTRO, "colab"] : ["colab"];
}

async function colab(args: string[]): Promise<{ code: number; out: string }> {
  // WSL ディストロ起動直後などの一時的な失敗 (command not found 等) はリトライ
  for (let attempt = 0; ; attempt++) {
    const proc = Bun.spawn([...colabCmd(), ...args], { stdout: "pipe", stderr: "pipe" });
    const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
    const code = await proc.exited;
    const transient = code !== 0 && /command not found|WSL.*(error|失敗)|PATH_NOT_FOUND/i.test(out);
    if (!transient || attempt >= 2) return { code, out };
    await Bun.sleep(2000);
  }
}

/** VM 内でリポジトリ同梱の Python ファイルを実行 (colab exec -f) */
async function colabExecFile(relPath: string): Promise<{ code: number; out: string }> {
  const local = fromModuleUrl(`../${relPath}`, import.meta.url);
  return colab(["exec", "-s", SESSION, "-f", toWslPath(local)]);
}

export async function irodoriAvailable(): Promise<string | null> {
  const v = await colab(["version"]);
  if (v.code !== 0) return null;
  const m = v.out.match(/Version:\s*(\S+)/);
  return m ? m[1]! : "unknown";
}

async function ensureSession(gpu: string): Promise<void> {
  // colab status はセッションが無くても exit 0 で "not found" を返すため本文で判定
  const st = await colab(["status", "-s", SESSION]);
  if (st.code === 0 && !st.out.includes("not found")) return;
  logStage("tts", `Colab セッション ${SESSION} を作成しています (GPU: ${gpu})…`);
  const nw = await colab(["new", "-s", SESSION, "--gpu", gpu]);
  if (nw.code !== 0) {
    throw new Error(
      `Colab セッションの作成に失敗しました:\n${nw.out}\n` +
        "  - WSL 内の colab 認証 (gcloud ADC / oauth2) と GPU 割当を確認してください",
    );
  }
}

/**
 * narration 群を合成して VoiceResult を返す。
 * キャッシュ済みは Colab を呼ばず、未キャッシュ分だけを 1 ジョブにまとめて実行する。
 * セッションは再利用のため停止しない (終わったら `colab stop -s popshot-tts`)。
 */
export async function synthesizeBatchIrodori(opts: IrodoriBatchOptions): Promise<VoiceResult[]> {
  const { texts, model, caption, speedScale, outDir } = opts;
  if (!model) {
    throw new Error(
      "tts.model が未設定です。メイ LoRA 統合モデル (ローカルパス or hf:<repo/id>) を指定してください",
    );
  }
  mkdirSync(outDir, { recursive: true });

  const results: VoiceResult[] = new Array(texts.length);
  const missing: { index: number; key: string; text: string }[] = [];

  texts.forEach((text, i) => {
    if (text.trim() === "") {
      results[i] = { wavPath: null, duration: 0, moras: [], mock: false };
      return;
    }
    const key = cacheKey(text, model, speedScale);
    const wavPath = join(outDir, `${key}.wav`);
    const timingsPath = join(outDir, `${key}.timings.json`);
    if (!opts.noCache && existsSync(wavPath) && existsSync(timingsPath)) {
      const cached = JSON.parse(readFileSync(timingsPath, "utf-8")) as { duration: number };
      logCache("tts", `"${text.slice(0, 18)}" (${cached.duration.toFixed(2)}s)`);
      results[i] = { wavPath, duration: cached.duration, moras: [], mock: false };
      return;
    }
    missing.push({ index: i, key, text });
  });

  if (missing.length === 0) return results;

  await ensureSession(opts.gpu);

  const jobPath = join(outDir, "irodori-job.json");
  const job: Record<string, unknown> = {
    lines: missing.map(({ key, text }) => ({ key, text })),
    model: model.startsWith("hf:") ? model : "/content/model.safetensors",
    duration_scale: Math.round((1 / Math.max(speedScale, 0.5)) * 100) / 100,
    caption,
  };
  if (process.env.HF_TOKEN) job.hf_token = process.env.HF_TOKEN;
  await Bun.write(jobPath, JSON.stringify(job, null, 2));

  const up = await colab(["upload", "-s", SESSION, toWslPath(jobPath), "/content/job.json"]);
  if (up.code !== 0) throw new Error(`job.json のアップロードに失敗:\n${up.out}`);

  if (!model.startsWith("hf:")) {
    const chk = await colabExecFile("scripts/colab/probe_model.py");
    if (!chk.out.includes("True")) {
      logStage("tts", "モデルをアップロードしています (数 GB。初回のみ時間がかかります)…");
      const upModel = await colab([
        "upload",
        "-s",
        SESSION,
        toWslPath(model),
        "/content/model.safetensors",
      ]);
      if (upModel.code !== 0) throw new Error(`モデルのアップロードに失敗:\n${upModel.out}`);
    }
  }

  // ランナーを VM に配置 (exec -f はセル実行で __file__ を持たないため、実ファイルとして送る)
  const runner = fromModuleUrl("../scripts/colab/irodori_infer.py", import.meta.url);
  const upRunner = await colab(["upload", "-s", SESSION, toWslPath(runner), "/content/irodori_infer.py"]);
  if (upRunner.code !== 0) throw new Error(`ランナーのアップロードに失敗:\n${upRunner.out}`);

  logStage("tts", `Colab で ${missing.length} 行を合成しています (初回は環境構築で数分)…`);
  const run = await colabExecFile("scripts/colab/irodori_bootstrap.py");
  // セル内の例外でも colab exec は exit 0 を返すことがあるため、完了マーカーで判定する
  if (run.code !== 0 || !run.out.includes("[infer] all done")) {
    throw new Error(`Colab 推論ジョブに失敗:\n${run.out.slice(-3000)}`);
  }
  const doneCount = (run.out.match(/\[infer\] .* done/g) ?? []).length;
  logStage("tts", `Colab 合成完了 (${doneCount} 行)`);

  for (const m of missing) {
    const wavPath = join(outDir, `${m.key}.wav`);
    const dl = await colab(["download", "-s", SESSION, `/content/out/${m.key}.wav`, toWslPath(wavPath)]);
    if (dl.code !== 0 || !existsSync(wavPath)) {
      throw new Error(`wav のダウンロードに失敗 (${m.key}):\n${dl.out}`);
    }
    const duration = await probeDuration(wavPath);
    await Bun.write(
      join(outDir, `${m.key}.timings.json`),
      JSON.stringify({ text: m.text, duration, moras: [] }, null, 2),
    );
    logStage("tts", `"${m.text.slice(0, 18)}" → ${duration.toFixed(2)}s`);
    results[m.index] = { wavPath, duration, moras: [], mock: false };
  }

  return results;
}
