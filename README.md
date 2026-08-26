# popshot 🎀

**tcut + HyperFrames + GSAP + VOICEVOX** で技術解説ショート動画 (1080x1920) を量産するショート工場CLI。

台本 YAML を 1 枚書けば、`popshot render` の 1 コマンドで

1. **VOICEVOX** がナレーションを合成 (モーラタイミング付き)
2. **tcut** がターミナルデモを自動収録・尺フィット
3. **HyperFrames + GSAP** がサンリオ風パステルポップな縦型コンポジションを決定論レンダリング
4. VO / SE / BGM を自動ミックスして **完成 MP4** を出力

までを一気に実行します。

- **100 種のシーンテンプレート** (10カテゴリ×10): hook / text / code / terminal / diagram / list / stat / quiz / transition / outro。0.8秒ごとに視覚イベントを入れる「ドーパミン設計」
- **カラオケ字幕**: VOICEVOX のモーラタイミングに同期して 1 文字ずつアクセント色にポップ
- **右下アバター**: コンテンツを縮小せずオーバーレイ。アイドルバウンス+発話同期の口パク+シーン切替リアクション
- **自前SE 12種 + BGM**: TypeScript でPCM合成したライセンスフリー音源 (再生成可能)
- **デザイン**: [サンリオ公式サイトの DESIGN.md](https://github.com/kzhrknt/awesome-design-md-jp) 準拠 (テキスト #777777、ピル radius 80px+、淡い影、Noto Sans JP)

## クイックスタート

```sh
bun install
bun run gen:se && bun run gen:bgm          # SE/BGM を合成 (clone 直後に一度だけ)
bun run src/cli.ts doctor                 # 依存診断
bun run src/cli.ts init myvideo           # 台本雛形を生成
bun run src/cli.ts render myvideo/video.yaml --mock-tts   # VOICEVOXなしでまず1本
```

VOICEVOX エンジン (`http://127.0.0.1:50021`) を起動すれば `--mock-tts` なしで実音声になります:

```sh
docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest
bun run src/cli.ts render myvideo/video.yaml
```

## サンプル動画

このリポジトリの `popshot render` で生成した [30秒でわかる git の仕組み](https://github.com/ozekimasaki/popshot/blob/main/examples/git-30sec/demo.mp4)（1080×1920 / 約29秒）。

再生成する場合:

```sh
bun run src/cli.ts render examples/git-30sec/video.yaml
# → examples/git-30sec/out/30秒でわかる-git-の仕組み.mp4
```

全100フレームをつないだ AWS 入門は [examples/aws-100](examples/aws-100)（1080×1920 / 約3分57秒）。完成 MP4 は `examples/aws-100/demo.mp4`。

```sh
bun run src/cli.ts render examples/aws-100/video.yaml --mock-tts
# → examples/aws-100/out/100パターンで学ぶ-aws.mp4
```

## 必要環境

- Bun ≥ 1.4 / ffmpeg / Chrome or Chromium (Linux は `BUN_CHROME_PATH` を設定)
- VOICEVOX エンジン (任意。なければ `--mock-tts`)
- 右下アバターを使う場合は `assets/avatar.png` を配置 (台本の `avatarImage:` で差し替え可)

詳細は [.cursor/skills/popshot-setup/SKILL.md](.cursor/skills/popshot-setup/SKILL.md)。

## コマンド

| コマンド | 説明 |
|---|---|
| `popshot render <yaml>` | ワンパス生成。`--mock-tts` `--no-cache` `--only <stage>` `--check` `-q draft\|standard\|high` |
| `popshot init [dir]` | 台本雛形の生成 |
| `popshot frames [--json]` | 100フレームのカタログ |
| `popshot preview <yaml>` | HyperFrames Studio でプレビュー |
| `popshot doctor` | 依存診断 |
| `popshot batch <dir>` | `*.yaml` を一括レンダリング |

(`bun run src/cli.ts …` または `bun link` 後に `popshot …`)

## 台本 YAML

```yaml
title: "30秒でわかる git の仕組み"
theme: cyan            # cyan/pink/purple/yellow/green/coral
speaker: 3             # VOICEVOX話者id (3=ずんだもん)
speedScale: 1.15
avatar: true           # 右下アバター
bgm: ../../assets/bgm/pop-loop.wav

scenes:
  - frame: hook/impact-zoom
    narration: "gitの中身、実は超シンプルなのだ"
    props: { title: "gitの正体", badge: "知らないと損" }

  - frame: terminal/slide-in
    narration: "実際にコミットしてみるのだ"
    terminal:
      theme: catppuccin-mocha
      commands:
        - run: "git init"
        - expect: "Initialized"

  - frame: outro/follow-cta
    narration: "フォローで毎日1分解説なのだ"
```

シーン尺は `max(ナレーション尺+0.45s, フレーム最小尺, 明示duration)` で自動決定。
書き方の詳細は [.cursor/skills/popshot-produce/SKILL.md](.cursor/skills/popshot-produce/SKILL.md)。

## Cursor スキル (エージェント運用)

このリポジトリを Cursor で開くと 3 つのスキルが使えます:

- **popshot-produce** — トピック→完成MP4 のエンドツーエンド手順とショート構成セオリー
- **popshot-frames** — 100フレームの選び方と新規フレームの追加方法 (HyperFrames 決定論制約込み)
- **popshot-setup** — VOICEVOX/Chrome/ffmpeg の導入と doctor の対処

## アーキテクチャ

```
video.yaml
  → [tts]     VOICEVOX audio_query/synthesis (モーラを wav 実測尺にフィット) → .popshot/tts/ (キャッシュ)
  → [tcut]    terminal定義 → .video.ts 自動生成 → 収録 → 目標尺へスピードフィット → .popshot/tcut/ (キャッシュ)
  → [compose] HyperFrames HTML 生成 (.popshot/build/index.html)
              - 単一 root (1080x1920) + シーン clip + 単一 paused GSAP timeline
              - VO/SE/BGM は <audio> クリップとして配置 (HyperFrames が自動ミックス)
              - 字幕/アバター/フレームの timeline はバンドル済みランタイム (Bun.build) が構築
  → [lint]    hyperframes lint (0 エラーをゲートに)
  → [render]  hyperframes render → out/<slug>.mp4
```

- `src/frames/` — 100テンプレート。`html()` は Node、`timeline()` はブラウザで実行
- `scripts/gen-se.ts` / `gen-bgm.ts` — SE/BGM の決定論シンセ (依存ゼロの PCM→WAV)
- `assets/avatar.png` — 右下アバター (台本の `avatarImage:` で差し替え可)

## ライセンス/クレジット

- SE / BGM は本リポジトリで合成した自前音源 (自由に利用可)
- VOICEVOX 音声の利用は各キャラクターの[利用規約](https://voicevox.hiroshiba.jp/)に従ってください (例: 「VOICEVOX:ずんだもん」のクレジット表記)
