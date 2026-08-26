---
name: popshot-produce
description: popshot でトピックから技術解説ショート動画 (1080x1920 MP4) を量産するエンドツーエンド手順。台本 YAML の書き方、ショート構成のセオリー、フレーム選定、レンダリングと失敗時の対処を含む。「ショート動画を作って」「〜を解説する動画」「popshot で動画」等の依頼で必ず読む。
---

# popshot でショート動画を作る

popshot は 台本 YAML → VOICEVOX 音声 → tcut ターミナル収録 → HyperFrames レンダリング を
**1コマンドで**通すショート動画工場。リポジトリルートで作業する。

## エンドツーエンド手順

1. **前提確認**: `bun run src/cli.ts doctor`。VOICEVOX が NG でも `--mock-tts` で全工程が動く (無音になるだけ)。
2. **フレームカタログを読む**: `bun run src/cli.ts frames --json` で 100 フレームの id / 説明 / props 仕様を取得。
3. **台本 YAML を書く** (下記セオリー参照)。`bun run src/cli.ts init mydir` で雛形生成も可。
4. **レンダリング**: `bun run src/cli.ts render mydir/video.yaml`。出力は `mydir/out/<title-slug>.mp4`。
5. **確認**: 出力 MP4 をフレーム抽出 (`ffmpeg -i out.mp4 -vf fps=1/2,scale=270:480 f%02d.png`) して構図を確認。
6. 量産時は 1 ディレクトリ 1 台本にして `bun run src/cli.ts batch videos/`。

TTS と tcut は内容ハッシュでキャッシュされるので、台本を少し直して再実行しても速い。

## 台本 YAML の書き方

```yaml
title: "30秒でわかる ○○"        # 出力ファイル名にもなる
theme: cyan                      # cyan/pink/purple/yellow/green/coral (動画全体の世界観色)
speaker: 3                       # VOICEVOX 話者id (3=ずんだもん)。ずんだもんなら語尾「なのだ」
speedScale: 1.15                 # ショートは 1.1〜1.3 推奨
avatar: true                     # 右下アバター
bgm: ../../assets/bgm/pop-loop.wav   # 任意 (yaml からの相対パス)
scenes:
  - frame: hook/impact-zoom      # popshot frames の id
    narration: "読み上げる文"     # 字幕もこれから自動生成 (caption: で上書き可)
    props: { title: "画面に出す見出し" }
    # duration: 3.0              # 任意。省略時は VO 尺 + 0.45s
    # se: [{ at: 0.2, name: pop }]  # 任意。省略時はフレーム既定 SE
```

シーン尺は `max(VO尺+0.45s, フレーム最小尺, 明示duration)` で自動決定。
ナレーションを書けば書くほどそのシーンは長くなることに注意。

## ショート構成のセオリー (ドーパミン設計)

- **合計 25〜45 秒 / 6〜12 シーン**。60 秒超は警告が出る
- **冒頭は必ず hook カテゴリ**。1シーン目のナレーションは 2 秒以内で言い切れる煽り
- 本編は text / code / terminal / diagram / list / stat を混ぜ、**同じカテゴリを連続させない**
- 2〜3 シーンごとに transition を 1 枚挟む (narration 不要、勝手に 0.4s 前シーンに重なる)
- 中盤に quiz を 1 つ入れると離脱が減る (choice-3 / true-false / fill-blank)
- **最後は必ず outro カテゴリ** (follow-cta / next-teaser / question-to-comments 等)
- narration は 1 シーン 1 メッセージ。1 文 30 文字以内、体言止めか「〜なのだ」調で統一
- 強調したい単語は text 系フレームの `emphasis` に必ず渡す

## terminal シーン (tcut 自動収録)

terminal カテゴリのフレームには `terminal:` 定義が必須。CLI が tcut スクリプトを自動生成して収録する:

```yaml
- frame: terminal/slide-in
  narration: "実際に叩いてみるのだ"
  props: { label: "実演" }
  terminal:
    theme: catppuccin-mocha      # tcut themes で一覧
    fontSize: 24
    commands:
      - hide: ["cd $(mktemp -d) && git init -q"]   # 画面外セットアップ
      - run: "git status"                           # 入力+実行して プロンプト復帰を待つ
      - expect: "On branch"                         # 画面アサーション
      - sleep: "500ms"
```

- `hide` で環境構築を済ませる。git を使うなら `git config commit.gpgsign false` も hide に入れる (署名で出力が汚れる)
- 収録がシーン尺より長いと自動で最大4倍速に圧縮される。コマンドは 2〜4 個に絞る
- コマンドは実際に実行されるので、破壊的な操作を書かない

## 失敗時の対処

| 症状 | 対処 |
|---|---|
| `VOICEVOX エンジンに接続できません` | popshot-setup スキル参照。急ぐなら `--mock-tts` |
| `hyperframes lint が失敗` | 生成 HTML の問題。`.popshot/build/index.html` を確認し、フレーム実装の規約違反 (popshot-frames スキル) を疑う |
| tcut 収録失敗 | `BUN_CHROME_PATH` 未設定か、commands の expect が一致していない。`--only tcut` で単体デバッグ |
| 途中ステージだけ実行したい | `--only tts|tcut|compose|check|render` |
| 画の確認だけしたい | `bun run src/cli.ts preview video.yaml` (Studio が起動) |
