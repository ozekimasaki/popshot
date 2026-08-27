/** video.yaml のスキーマ定義とローダー */
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { parse as parseYaml } from "yaml";
import { SE_NAMES } from "./types.ts";

const seCueSchema = z.object({
  at: z.number().min(0),
  name: z.enum(SE_NAMES),
});

const terminalCommandSchema = z.union([
  z.object({ run: z.string() }),
  z.object({ type: z.string() }),
  z.object({ enter: z.literal(true) }),
  z.object({ expect: z.string() }),
  z.object({ wait: z.string() }),
  z.object({ sleep: z.string() }),
  z.object({ hide: z.array(z.string()).min(1) }),
]);

export type TerminalCommand = z.infer<typeof terminalCommandSchema>;

const terminalSchema = z.object({
  /** tcut テーマ名 (例 "catppuccin-mocha") */
  theme: z.string().default("catppuccin-mocha"),
  /** スマホ視聴前提の大きめ既定。長い出力を映す時だけ下げる */
  fontSize: z.number().int().min(16).max(64).default(40),
  /** 収録に使うシェル。既定はクリーンな bash */
  shell: z.string().optional(),
  commands: z.array(terminalCommandSchema).min(1),
});

export type TerminalConfig = z.infer<typeof terminalSchema>;

const sceneSchema = z.object({
  /** フレームid (例 "hook/impact-zoom") */
  frame: z.string().regex(/^[a-z]+\/[a-z0-9-]+$/, "frame は「カテゴリ/名前」形式で指定してください"),
  /** VOICEVOX で読み上げるナレーション */
  narration: z.string().default(""),
  /** 字幕に表示するテキスト (省略時は narration) */
  caption: z.string().optional(),
  /** フレーム固有プロパティ */
  props: z.record(z.string(), z.unknown()).default({}),
  /** SE 上書き (省略時はフレーム既定) */
  se: z.array(seCueSchema).optional(),
  /** 明示尺 (秒)。VO 尺より優先 */
  duration: z.number().min(0.3).max(60).optional(),
  /** シーン単位のテーマ色上書き */
  theme: z.enum(["cyan", "pink", "purple", "yellow", "green", "coral"]).optional(),
  /** terminal カテゴリのフレーム用: tcut 収録定義 */
  terminal: terminalSchema.optional(),
});

export type SceneConfig = z.infer<typeof sceneSchema>;

const ttsSchema = z.object({
  /** 音声合成エンジン。voicevox = ローカル VOICEVOX / irodori-colab = Colab 上の Irodori-TTS */
  engine: z.enum(["voicevox", "irodori-colab"]).default("voicevox"),
  /** irodori-colab: モデル (ローカル safetensors パス or hf:<repo/id>) */
  model: z.string().default(""),
  /** irodori-colab: Colab の GPU 種別 */
  gpu: z.string().default("T4"),
  /** irodori-colab: スタイルキャプション (任意) */
  caption: z.string().default(""),
});

const videoSchema = z.object({
  title: z.string().min(1),
  theme: z.enum(["cyan", "pink", "purple", "yellow", "green", "coral"]).default("cyan"),
  /** VOICEVOX 話者id (engine: voicevox 時のみ有効) */
  speaker: z.number().int().min(0).default(3),
  /** 音声合成エンジン設定 */
  tts: ttsSchema.default({ engine: "voicevox", model: "", gpu: "T4", caption: "" }),
  /** 読み上げ速度 (ショート向けに速め既定) */
  speedScale: z.number().min(0.5).max(2).default(1.15),
  /** BGM ファイルパス (yaml からの相対)。省略可 */
  bgm: z.string().optional(),
  /** BGM 音量 (0-1) */
  bgmVolume: z.number().min(0).max(1).default(0.12),
  /** 右下アバターの表示 */
  avatar: z.boolean().default(true),
  /** アバター画像パス (yaml からの相対)。省略時は popshot 同梱の画像 */
  avatarImage: z.string().optional(),
  fps: z.number().int().min(24).max(60).default(30),
  scenes: z.array(sceneSchema).min(1),
});

export type VideoConfig = z.infer<typeof videoSchema>;

export interface LoadedScript {
  config: VideoConfig;
  /** yaml ファイルの絶対パス */
  yamlPath: string;
  /** yaml のあるディレクトリ (キャッシュ・出力の基準) */
  baseDir: string;
}

export async function loadScript(yamlPath: string): Promise<LoadedScript> {
  const file = Bun.file(yamlPath);
  if (!(await file.exists())) {
    throw new Error(`台本ファイルが見つかりません: ${yamlPath}`);
  }
  const raw = parseYaml(await file.text());
  const parsed = videoSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`台本の形式エラー (${yamlPath}):\n${issues}`);
  }
  const abs = resolve(process.cwd(), yamlPath);
  return {
    config: parsed.data,
    yamlPath: abs,
    baseDir: dirname(abs),
  };
}
