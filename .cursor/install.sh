#!/usr/bin/env bash
# popshot の開発環境セットアップ (Cloud Agent の install フェーズで実行される)
# 冪等: 何度実行しても安全。
set -euo pipefail

# Bun (CLI 本体 / tcut の実行ランタイム) を導入。既に PATH にあれば再導入しない。
if ! command -v bun >/dev/null 2>&1; then
  export BUN_INSTALL="$HOME/.bun"
  curl -fsSL https://bun.sh/install | bash
fi
export PATH="$HOME/.bun/bin:$PATH"

# 依存パッケージ (hyperframes / termcut / gsap など) を取得。
bun install

# SE 12種 と BGM を決定論シンセで生成 (依存ゼロの PCM→WAV, 何度でも同じ音)。
bun run gen:se
bun run gen:bgm

echo "[popshot] install 完了。'bun run src/cli.ts doctor' で依存診断できます。"
