---
name: popshot-setup
description: popshot の実行環境構築とトラブルシュート。VOICEVOX エンジンの導入・起動、ffmpeg / Chrome / Bun 依存、doctor の各項目の意味と対処、mock-tts フォールバック。環境エラーや「レンダリングできない」「音声が出ない」時に読む。
---

# popshot 実行環境のセットアップ

## 必要なもの

| 依存 | 用途 | 導入 |
|---|---|---|
| Bun ≥ 1.4 | CLI 本体 / tcut | `curl -fsSL https://bun.sh/install \| bash` |
| ffmpeg | SE合成 / BGMループ / 尺計測 | `apt install ffmpeg` / `brew install ffmpeg` |
| Chrome/Chromium | tcut の描画と hyperframes のキャプチャ | 導入後 `BUN_CHROME_PATH` を設定 (Linux は必須) |
| VOICEVOX エンジン | ナレーション合成 | 下記。**なくても --mock-tts で全工程が動く** |

導入後は必ず `bun install` → `bun run src/cli.ts doctor` で全項目 ✅ を確認する。

## VOICEVOX エンジンの導入

どれか1つ。起動後 `curl http://127.0.0.1:50021/version` が返れば OK。

1. **Docker (推奨)**: `docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest`
2. **CPU バイナリ**: [VOICEVOX/voicevox_engine の Releases](https://github.com/VOICEVOX/voicevox_engine/releases) から
   `voicevox_engine-linux-cpu-x64-*.7z.001` を取得 → `7z x` で展開 → `./run --host 127.0.0.1 --port 50021`
   (長時間動かすなら tmux セッション内で起動する)
3. **VOICEVOX アプリ**: デスクトップ版を起動すればエンジンも同ポートで立つ

- 別ホスト/ポートなら `VOICEVOX_URL=http://host:port` を設定
- 話者は YAML の `speaker:` で指定 (一覧: `curl $VOICEVOX_URL/speakers`)。既定 3 = ずんだもん(ノーマル)
- 商用利用時は各キャラクターの利用規約 (https://voicevox.hiroshiba.jp/) を確認すること

## doctor の項目と対処

`bun run src/cli.ts doctor` の ❌ ごとの対処:

- **ffmpeg**: PATH に入れる。SE/BGM 生成 (`bun run gen:se` / `gen:bgm`) にも必要
- **chrome**: Chrome/Chromium を入れて `BUN_CHROME_PATH=/path/to/chrome` を設定。
  hyperframes 側は `PUPPETEER_EXECUTABLE_PATH` を見るが、popshot が chrome 検出時に自動設定する
- **termcut / hyperframes / gsap**: `bun install` を実行
- **voicevox**: 上記の導入手順。急ぎなら `--mock-tts` で回避
- **se-assets**: `bun run gen:se` で 12 種を再生成 (決定論なので何度でも同じ音)
- **avatar**: `assets/avatar.png` を配置。台本ごとに変えるなら YAML の `avatarImage:`、消すなら `avatar: false`

## mock-tts フォールバック

`popshot render video.yaml --mock-tts` で VOICEVOX なしに全パイプラインが動く:

- 音声は無音 wav、尺は文字数から推定 (0.135s/文字 ÷ speedScale)
- 字幕・アバター口パクは等間隔タイミングで動く
- **構図・アニメーション・SE・BGM の確認はこれで十分**。本番音声を入れる時だけエンジンが要る
- mock と実音声はキャッシュキーが別なので、後から実音声で再実行しても混ざらない

## キャッシュと生成物

```
<台本のディレクトリ>/
  .popshot/tts/     TTS wav + モーラタイミング (narration+speaker+speedScale のハッシュ)
  .popshot/tcut/    tcut 収録 (terminal定義+スロット+目標尺のハッシュ)
  .popshot/build/   HyperFrames コンポジション (毎回再生成)
  out/              完成 MP4
```

おかしくなったら `--no-cache` か `.popshot/` ごと削除。`.popshot/` と `out/` は gitignore 推奨。
