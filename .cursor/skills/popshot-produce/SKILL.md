---
name: popshot-produce
description: popshot でトピックから技術解説ショート動画 (1080x1920 MP4) を量産するエンドツーエンド手順。VOICEVOX 実音声が前提。台本 YAML、ショート構成、フレーム選定、レンダリングと失敗時の対処。「ショート動画を作って」「〜を解説する動画」「popshot で動画」等の依頼で必ず読む。
---

# popshot でショート動画を作る

popshot は 台本 YAML → **VOICEVOX 実音声** → tcut ターミナル収録 → HyperFrames レンダリング を
**1コマンドで**通すショート動画工場。リポジトリルートで作業する。Windows / macOS / Linux 共通。

コマンドは OS を問わず `bun run src/cli.ts …`。PowerShell でも bash でも同じ。

## 前提 (VOICEVOX 起動)

納品動画は **実音声**。`--mock-tts` は付けない (無音になる)。

1. `bun run src/cli.ts doctor` を実行する。未起動ならエンジンを自動起動する。
2. `voicevox` が ✅ になるまで [popshot-setup](../popshot-setup/SKILL.md) で導入する (製品版 or Docker)。
3. そのあと `render` する。

`VOICEVOX エンジンに接続できません` で止まっても `--mock-tts` にフォールバックしない。セットアップを直す。

## エンドツーエンド手順

1. **doctor**: 全項目 ✅ (voicevox 含む)
2. **フレームカタログ**: `bun run src/cli.ts frames --json` (id / 説明 / props)。件数確認に `jq` は使わない (Windows に無い)
3. **台本 YAML** (下記セオリー)。`bun run src/cli.ts init mydir` で雛形可
4. **レンダリング**: `bun run src/cli.ts render mydir/video.yaml`
   出力は `mydir/out/<title-slug>.mp4`
5. **確認**: 出力ディレクトリで

   ```sh
   ffmpeg -i out.mp4 -vf fps=1/2,scale=270:480 f%02d.png
   ```

   (パスに空白や日本語があるときは `ffmpeg -i "その.mp4" ...`)
6. 量産は 1 ディレクトリ 1 台本で `bun run src/cli.ts batch videos/`

TTS と tcut は内容ハッシュでキャッシュされる。台本を少し直して再実行しても速い。

## 台本 YAML の書き方

```yaml
title: "30秒でわかる ○○"        # 出力ファイル名にもなる
theme: cyan                      # cyan/pink/purple/yellow/green/coral (動画全体の世界観色)
speaker: 3                       # VOICEVOX 話者id。一覧はエンジン起動後に $VOICEVOX_URL/speakers
speedScale: 1.15                 # ショートは 1.1〜1.3 推奨
avatar: true                     # 右下アバター
avatarImage: ../../assets/avatar-mei.png  # キャラ画像 (yaml からの相対パス)。このリポジトリの既定は assets/avatar-mei.png (桜草メイ)
bgm: ../../assets/bgm/pop-loop.wav   # 任意 (yaml からの相対パス)
scenes:
  - frame: hook/impact-zoom      # popshot frames の id
    narration: "読み上げる文"     # 字幕もこれから自動生成。caption: で上書きする場合も音声と同じ文にする (別文を字幕に出さない)
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
- narration は 1 シーン 1 メッセージ。口調はキャラクター定義ファイルに従う (このリポジトリの既定は `characters/mei.md` = 桜草メイ。温かい です・ます調、気遣いの締め)。定義がなければ標準語 (です・ます / 体言止め) で統一し、キャラ語尾の既定は設けない
- 句読点 (、。!?！？) が字幕ページ (16文字/ページ) の切れ目になる。語の途中で切れないよう句読点位置を設計する
- 複数項目を紹介する動画では、各項目の前に**区切りシーン**を挟む (stat/big-number-slam に ①②… と項目名、narration は「Nつ目は、〇〇です」)。冒頭に目次シーン (list/checklist-pop) も置くと迷子にならない
- 強調したい単語は text 系フレームの `emphasis` に必ず渡す

## terminal シーン (tcut 自動収録)

terminal カテゴリのフレームには `terminal:` 定義が必須。CLI が tcut スクリプトを自動生成して収録する。
コマンドは **bash** で実行される。Windows では popshot が Git Bash を使う (`mktemp` や `&&` がそのまま書ける)。

```yaml
- frame: terminal/slide-in
  narration: "実際に叩いてみます"
  props: { label: "実演" }
  terminal:
    theme: catppuccin-mocha      # tcut themes で一覧
    # fontSize: 40 が既定 (スマホ視聴前提の大きめ)。長い行を映す時だけ 32〜36 に下げる
    commands:
      - hide: ["cd $(mktemp -d) && git init -q"]   # 画面外セットアップ
      - run: "git status"                           # 入力+実行して プロンプト復帰を待つ
      - expect: "On branch"                         # 画面アサーション
      - sleep: "500ms"
```

- `hide` で環境構築を済ませる。git を使うなら `git config commit.gpgsign false` も hide に入れる (署名で出力が汚れる)
- 収録がシーン尺より長いと自動で最大4倍速に圧縮される。コマンドは 2〜4 個に絞る
- コマンドは実際に実行されるので、破壊的な操作を書かない
- 文字サイズの目安: fontSize 40 なら約41桁、36 なら約46桁でスロットに収まる。映したい出力の最長行に合わせて選ぶ (折り返しは見づらい)

## 失敗時の対処

| 症状 | 対処 |
|---|---|
| `VOICEVOX エンジンに接続できません` | [popshot-setup](../popshot-setup/SKILL.md)。製品版 or Docker。`--mock-tts` で納品しない |
| `hyperframes lint が失敗` | `.popshot/build/index.html` と [popshot-frames](../popshot-frames/SKILL.md) の規約違反を疑う |
| tcut 収録失敗 | Linux は `BUN_CHROME_PATH`。Windows は Git Bash。`expect` 不一致は `--only tcut` で単体デバッグ |
| 途中ステージだけ実行したい | `--only tts\|tcut\|compose\|check\|render` |
| 画の確認だけしたい | `bun run src/cli.ts preview video.yaml` (Studio が起動)。音声は doctor 済みなら実 TTS |
