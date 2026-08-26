/** popshot 全体で共有する型定義 */

export const THEME_COLORS = {
  cyan: "#8bd0dd",
  pink: "#e383a8",
  purple: "#cda1dc",
  yellow: "#f2d36b",
  green: "#91dea9",
  coral: "#f08080",
} as const;

export type ThemeColor = keyof typeof THEME_COLORS;

export const SE_NAMES = [
  "pop",
  "don",
  "sparkle",
  "whoosh",
  "ding",
  "click",
  "drum",
  "buzzer",
  "coin",
  "swipe",
  "jump",
  "tada",
] as const;

export type SEName = (typeof SE_NAMES)[number];

/** SE 再生キュー (時刻はシーンローカル秒) */
export interface SECue {
  at: number;
  name: SEName;
}

/** VOICEVOX のモーラ 1 つ分のタイミング (シーンローカル秒) */
export interface MoraTiming {
  /** カタカナ表記 (例 "コ") */
  text: string;
  /** シーン先頭からの開始秒 */
  start: number;
  /** 長さ (秒) */
  duration: number;
}

/** TTS 結果 (シーン 1 つ分) */
export interface VoiceResult {
  /** wav ファイルへの絶対パス。null なら無音 (narration なし) */
  wavPath: string | null;
  /** wav の実測尺 (秒)。narration なしなら 0 */
  duration: number;
  moras: MoraTiming[];
  /** mock-tts で生成されたか */
  mock: boolean;
}

/** カラオケ字幕 1 文字分 (グローバル秒) */
export interface CaptionChar {
  ch: string;
  /** ポップイン時刻 (グローバル秒) */
  t: number;
}

/** カラオケ字幕 1 ページ分 (グローバル秒) */
export interface CaptionPage {
  sceneIndex: number;
  start: number;
  end: number;
  chars: CaptionChar[];
}

/** ブラウザランタイムに渡すシーン情報 */
export interface SceneManifest {
  frameId: string;
  props: unknown;
  ctx: FrameContextData;
}

/** フレームに渡すコンテキスト (JSON シリアライズ可能) */
export interface FrameContextData {
  /** シーン番号 (0 始まり) */
  index: number;
  /** ナレーション本文 (タイトル未指定時のフォールバック等に使う) */
  narration: string;
  /** グローバル開始秒 */
  start: number;
  /** シーン尺 (秒) */
  duration: number;
  /** アクセント色 (hex) */
  accent: string;
  /** アクセント色名 */
  theme: ThemeColor;
  /** 決定論用シード */
  seed: number;
  /** モーラタイミング (シーンローカル秒) */
  moras: MoraTiming[];
  assets: {
    /** tcut で収録したターミナル動画 (build 相対パス) */
    terminalVideo?: string;
    /** ターミナル動画の実尺 (秒) */
    terminalVideoDuration?: number;
  };
}

/** 生成 HTML に埋め込むマニフェスト全体 */
export interface Manifest {
  width: number;
  height: number;
  duration: number;
  theme: ThemeColor;
  accent: string;
  scenes: SceneManifest[];
  captions: CaptionPage[];
  avatar: boolean;
  /** 口パク用: 全編のモーラ開始時刻 (グローバル秒, 10回/s に間引き済み) */
  moraOnsets: number[];
  /** シーン開始時刻 (リアクション用) */
  sceneStarts: number[];
  /** outro シーンの開始秒 (なければ null) */
  outroStart: number | null;
}
