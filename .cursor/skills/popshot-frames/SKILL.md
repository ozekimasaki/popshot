---
name: popshot-frames
description: popshot の100フレーム (シーンテンプレート) カタログの引き方・選び方と、新規フレームの追加方法。HyperFrames の決定論制約 (fromTo必須・aotoAlpha・有限repeat・シード乱数) とドーパミン設計規約を含む。フレームの選定・カスタマイズ・追加を行うときに読む。
---

# popshot のフレームを使う・作る

## カタログの引き方

- 一覧: `bun run src/cli.ts frames` (人間向け) / `--json` (エージェント向け、props 仕様付き)
- カテゴリ絞り込み: `--category hook` など
- 実装本体: `src/frames/<category>.ts` (1カテゴリ1ファイル、各10フレーム)

## カテゴリと使い分け

| カテゴリ | 用途 | 代表 |
|---|---|---|
| hook | 冒頭 1.5 秒の掴み。動画の先頭専用 | impact-zoom, countdown-3, stat-shock |
| text | 主張・キーメッセージ | char-pop, word-explosion, karaoke-highlight |
| code | コード表示 | typing-reveal, diff-before-after, code-to-output |
| terminal | tcut 収録のカットイン (`terminal:` 必須) | slide-in, pip-corner, crt-frame |
| diagram | 構造・フローの図解 | flow-arrows, layer-stack, venn-merge |
| list | 手順・ランキング・比較 | step-ladder, ranking-flip, versus-table |
| stat | 数字で殴る | counter-blast, gauge-fill, donut-reveal |
| quiz | 中盤の離脱防止 | choice-3, true-false, thinking-timer |
| transition | シーン間の 1 秒。narration 不要 | pill-bounce-wipe, pastel-confetti |
| outro | 締めの CTA。動画の最後専用 | follow-cta, avatar-bow, question-to-comments |

## 新規フレームの追加手順

1. `src/frames/<category>.ts` に `defineFrame({...})` を追加し、末尾の `<category>Frames` 配列に登録する
2. `bun run src/cli.ts frames --json | jq length` が増えていることを確認
3. サンプル台本でレンダリングし `hyperframes lint` 0 エラーを確認

```ts
export const myFrame = defineFrame({
  id: "text/my-frame",          // カテゴリ/ケバブケース
  category: "text",
  description: "1行の日本語説明 (カタログに出る)",
  propsDoc: "text: 本文 / emphasis: 強調",
  minDuration: 1.8,             // これ未満に縮まない
  propsSchema: z.object({ text: z.string().default("") }),
  html: (p, ctx) => stage(`<h1 class="ps-h1 my-title">${esc(p.text || ctx.narration)}</h1>`),
  timeline(a) {
    const s = a.ctx.start;      // 位置は必ずグローバル秒 (ctx.start + ローカル)
    popIn(a, a.q(".my-title"), s + 0.1);
    sceneExit(a);               // 末尾 0.25s の退場
  },
  seCues: () => [{ at: 0.1, name: "pop" }],   // シーンローカル秒
});
```

### 実行モデル (重要)

- `html()` は **Node (compose 時)** に実行され、シーン div の中身を返す
- `timeline()` は **ブラウザ (レンダリング時)** に実行され、単一の paused GSAP timeline に tween を追加する
- 両方に同じ `ctx` (index / narration / start / duration / accent / seed / moras / assets) が渡る
- html 側のレイアウト乱数は `seeded(ctx.seed)`、timeline 側は `a.rand` を使う (同じシードで決定論)
- timeline 側は `document.querySelectorAll(a.sel + " .cls")` で DOM を読んでよい (静的DOMなので決定論)

### HyperFrames 決定論制約 (違反すると lint が落ちる/絵が壊れる)

- **CSS に transform を書かない**。初期状態は必ず `fromTo()` の from 側で与える (`gsap_css_transform_conflict`)
- 表示/非表示は `autoAlpha` を使う。`display` / `visibility` を tween しない
- `repeat: -1` 禁止。`repeats(period, avail)` ヘルパーで有限回数にする (yoyo 前提で偶数往復を返す)
- `Math.random()` / `Date.now()` 禁止。乱数は `seeded()` / `a.rand`
- `<audio>`/`<video>` を html() から直接出さない (音は seCues、映像は terminalSlot 経由で compose が配置する)
- terminal フレームの動画はシーン div の**兄弟**として配置される (`#tcw-{index}` ラッパー / `#tcv-{index}` video)。
  フレームからは `#tcw-${a.ctx.index}` の transform を動かす。video 自体の width/height は動かさない
- async 関数から GSAP timeline を直接 return しない (**thenable なので paused だと永遠に解決しない**)

### ドーパミン設計規約

- **0.8 秒に 1 回は視覚イベント** (ポップイン / 色替え / パーティクル / カウント)
- 入場は `back.out(1.6〜2.4)` / `elastic.out`、退場は 0.25s 以内の高速フェード
- 1.2 秒以上画面が静止する設計にしない。間が空くなら `floatLoop` でゆらゆらさせる
- SE はイベントに同期させる (ポップイン=pop、衝撃=don、正解=ding、失敗=buzzer、締め=tada)
- 字幕帯 (下部 bottom:132px 付近) とアバター (右下 270px) に被せない。`stage()` のセーフゾーンを使う

### 利用できるヘルパー (`src/frames/helpers.ts`)

`esc` `chars` (1文字spans) `stage` (セーフゾーン中央) `popIn` `popChars` `sceneExit`
`burstHtml`+`burstTl` (パーティクル) `floatLoop` `countUp` `repeats` `seeded` `highlightCode`
