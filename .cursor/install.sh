#!/usr/bin/env bash
# popshot Cloud Agent 用セットアップ (冪等)。
# ベースイメージに既にある node / ffmpeg / Chrome は前提とし、
# ここでは Bun のインストールと依存・生成物の用意のみ行う。
set -euo pipefail

cd "$(dirname "$0")/.."

# ---- Bun (>= 1.4) ----
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"
if ! command -v bun >/dev/null 2>&1; then
  echo "[install] Bun をインストールします"
  curl -fsSL https://bun.sh/install | bash
fi
# 以降のシェル (start / エージェント端末) からも bun を使えるよう system PATH に配置
if [ ! -e /usr/local/bin/bun ]; then
  sudo ln -sf "$BUN_INSTALL/bin/bun" /usr/local/bin/bun 2>/dev/null \
    || ln -sf "$BUN_INSTALL/bin/bun" /usr/local/bin/bun 2>/dev/null || true
fi
echo "[install] bun $(bun --version)"

# ---- 依存 ----
bun install

# ---- SE / BGM の合成 (決定論。clone 直後に一度だけ必要) ----
bun run gen:se
bun run gen:bgm

# ---- 右下アバターのプレースホルダ (無い場合のみ生成; 本番は assets/avatar.png を差し替え) ----
# compose は avatar:false でも assets/avatar.png を参照するため、レンダリングには必須。
if [ ! -f assets/avatar.png ]; then
  echo "[install] assets/avatar.png が無いためプレースホルダを生成します"
  ffmpeg -y -f lavfi -i "color=c=0xFFC7DE:s=540x540" \
    -vf "drawbox=x=0:y=0:w=540:h=540:color=0xFF9EC4:t=24,drawtext=text='POP':fontcolor=0x777777:fontsize=120:x=(w-text_w)/2:y=(h-text_h)/2" \
    -frames:v 1 assets/avatar.png >/dev/null 2>&1 || true
fi

# ---- 診断 (VOICEVOX / avatar 以外が緑なら OK。voicevox は任意で --mock-tts 可) ----
bun run src/cli.ts doctor || true

echo "[install] 完了: 'bun run src/cli.ts render examples/git-30sec/video.yaml --mock-tts' で 1 本生成できます"
