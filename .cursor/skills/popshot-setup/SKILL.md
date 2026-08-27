---
name: popshot-setup
description: popshot の実行環境構築とトラブルシュート (Windows / macOS / Linux)。VOICEVOX は必須で、render/doctor が未起動なら自動起動する。ffmpeg / Chrome / Bun / Git Bash、doctor の各項目の意味と対処。「レンダリングできない」「音声が出ない」「doctor が落ちる」時に読む。
---

# popshot 実行環境のセットアップ

対象 OS: **Windows / macOS / Linux**。コマンドはどれでも `bun run src/cli.ts …` (PowerShell でも bash でも同じ)。

**VOICEVOX は必須。** 納品・通常の動画生成では `--mock-tts` を付けない。
`render` / `doctor` / `preview` / `batch` は、ローカルエンジンが止まっていれば自動起動する。
自動起動できるのは「製品版が入っている」か「Docker がある」場合だけ。エンジン本体の導入は人間側の作業。

## 共通手順 (全 OS)

リポジトリルートで:

```sh
bun install
bun run gen:se && bun run gen:bgm && bun run gen:avatar
bun run src/cli.ts doctor
```

`doctor` は **voicevox を含む全項目 ✅** になるまで進まない。⚠️ や ❌ が残ったら下表で直す。

## OS 別の導入

| 依存 | Windows | macOS | Linux |
|---|---|---|---|
| Bun ≥ 1.4 | [bun.sh](https://bun.sh) の PowerShell インストーラ | `curl -fsSL https://bun.sh/install \| bash` | 同左 |
| ffmpeg | `winget install Gyan.FFmpeg` (PATH 通す) | `brew install ffmpeg` | `sudo apt install ffmpeg` (または dnf/pacman) |
| Chrome | Google Chrome (自動検出) | `/Applications/Google Chrome.app` (自動検出) | Chromium 導入 + **`BUN_CHROME_PATH` 必須** |
| Git Bash | [Git for Windows](https://git-scm.com/download/win)。WSL の bash.exe は使わない | 不要 (システムの bash) | 不要 |
| VOICEVOX | 下記どれか1つ | 同左 | 同左 |

Chrome が見つからないときだけ `BUN_CHROME_PATH` (tcut) と `PUPPETEER_EXECUTABLE_PATH` / `HYPERFRAMES_BROWSER_PATH` (render) を設定。popshot は検出した Chrome を両方に渡す。

## VOICEVOX (必須)

起動確認: `http://127.0.0.1:50021/version` が JSON でバージョンを返す。

導入はどれか1つ:

1. **製品版アプリ** (自動起動の第一候補)
   - Windows: [VOICEVOX](https://voicevox.hiroshiba.jp/) → `C:\Program Files\VOICEVOX\vv-engine\run.exe` または `%LOCALAPPDATA%\Programs\VOICEVOX\vv-engine\run.exe`
   - macOS: アプリを `/Applications` へ → `/Applications/VOICEVOX.app/Contents/Resources/vv-engine/run`
   - Linux: 公式 tar.gz を展開した中の `vv-engine/run`。よくある場所は `~/VOICEVOX/vv-engine/run` / `/opt/VOICEVOX/vv-engine/run`
2. **Docker**: イメージ `voicevox/voicevox_engine:cpu-latest` があれば popshot がコンテナ `popshot-voicevox` を自動起動する
3. **単体エンジン**: [Releases](https://github.com/VOICEVOX/voicevox_engine/releases) の OS 向け CPU 版を展開し、`VOICEVOX_ENGINE` に `run.exe` (Windows) / `run` (macOS/Linux) を設定。または `~/.popshot/voicevox_engine/` に置く

自動起動の順:

1. 既に `VOICEVOX_URL` (既定 `http://127.0.0.1:50021`) が応答 → それを使う
2. 上のパスまたは `VOICEVOX_ENGINE` のバイナリを spawn (Windows は Hidden のまま親終了後も生存、Unix は detached)
3. なければ Docker
4. どれも無ければエラー (ここで `--mock-tts` に逃げない)

- 別ホストなら `VOICEVOX_URL=http://host:port` (この場合は自動起動しない。先方が起動済みであること)
- 話者は YAML の `speaker:`。既定 3 = ずんだもん(ノーマル)。一覧はエンジン起動後に `$VOICEVOX_URL/speakers`
- 商用利用時は各キャラクターの[利用規約](https://voicevox.hiroshiba.jp/)を確認

## Irodori-TTS (Colab) — メイ声エンジン (任意)

台本で `tts.engine: irodori-colab` を指定すると、VOICEVOX の代わりに Colab GPU 上の Irodori-TTS で合成する。

前提:

- **Windows は WSL2 (Ubuntu) 内**に `uv tool install google-colab-cli` + 認証 (`colaboratory` スコープ付きの ADC or oauth2)。macOS/Linux はネイティブで可
- Colab Pro 推奨 (GPU 割当)
- 学習済みモデル (`tts.model` にローカル safetensors パス or `hf:<repo/id>`)
- **学習は Colab UI のノートブック** `notebooks/train_mei_lora.ipynb` で行う。CLI 作成セッションでは Drive マウントが非対話で通らないため

```yaml
tts:
  engine: irodori-colab
  model: "hf:<repo/id>"        # またはローカルの mei_v41.safetensors
  gpu: T4
  caption: ""                  # 任意のスタイルキャプション
```

- 未キャッシュ行だけをまとめて 1 ジョブで合成。セッション `popshot-tts` は再利用のため残る → 終わったら `colab stop -s popshot-tts` (Windows は `wsl -d Ubuntu-24.04 colab stop -s popshot-tts`)
- モーラタイミングは得られない → カラオケ字幕・口パクは等配フォールバック
- 初回は clone + uv sync + モデル取得で数分かかる
- セッション作成に失敗する場合は GPU 割当を確認 (`--gpu` を外すと CPU)

## Windows 固有

- パスは `fromModuleUrl()` / `fileURLToPath()`。`new URL(...).pathname` は `/C:/...` になり失敗する
- spawn は `bun <bin.mjs>`。`bunx` (`.cmd`) は shell なし spawn で見つからない
- tcut のコマンドは bash。popshot が Git Bash (`Git\bin\bash.exe`) を PATH 先頭に足す。`mktemp` は Git の `usr\bin`

## doctor の ❌ と対処

- **ffmpeg**: 上表で導入し、新しいターミナルで `ffmpeg -version`
- **chrome**: ブラウザ導入。Linux は `BUN_CHROME_PATH=/usr/bin/chromium` など
- **git-bash** (Windows のみ): Git for Windows
- **termcut / hyperframes / gsap**: `bun install`
- **voicevox**: 製品版か Docker。`VOICEVOX_ENGINE` でパス指定。自動起動に 90 秒かかることがある
- **se-assets**: `bun run gen:se`
- **avatar**: `bun run gen:avatar` または `assets/avatar.png` を配置

## `--mock-tts` (デバッグ専用)

無音 wav + 文字数から尺推定。字幕・口パクは等間隔。**構図・SE・BGM の確認だけ**に使う。
本番音声のキャッシュキーは別なので、後から本物の TTS で再実行しても混ざらない。

## キャッシュ

```
<台本のディレクトリ>/
  .popshot/tts/     TTS wav + モーラタイミング
  .popshot/tcut/    tcut 収録
  .popshot/build/   HyperFrames HTML (毎回再生成)
  out/              完成 MP4
```

おかしくなったら `--no-cache` か `.popshot/` を削除。
