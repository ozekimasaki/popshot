"""popshot バッチ推論ランナー (Colab VM 内で実行)。

使い方:
  1. /content/job.json を配置:
     {"lines": [{"key": "<hash>", "text": "読み上げる文"}],
      "model": "hf:<repo/id>" または "/content/model.safetensors",
      "duration_scale": 1.0, "caption": ""}
  2. colab exec -s <session> -f irodori_infer.py   (ローカルファイルが VM に送信される)
  3. /content/out/<key>.wav が生成される

初回実行時は Irodori-TTS の clone と uv sync を行う (数分)。
"""
import json
import os
import subprocess
import sys

JOB_PATH = "/content/job.json"
OUT_DIR = "/content/out"
REPO_DIR = "/content/Irodori-TTS"
VENV_PY = f"{REPO_DIR}/.venv/bin/python"
READY = "/content/.popshot_irodori_ready"


def sh(cmd: list[str], cwd: str | None = None) -> None:
    print("[setup]$", " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=cwd, check=True)


def setup() -> None:
    if not os.path.isdir(REPO_DIR):
        sh(["git", "clone", "--depth", "1", "https://github.com/Aratako/Irodori-TTS.git", REPO_DIR])
    sh([sys.executable, "-m", "pip", "install", "-q", "uv"])
    sh(["uv", "sync"], cwd=REPO_DIR)
    with open(READY, "w") as f:
        f.write("ok")


def main() -> None:
    with open(JOB_PATH, encoding="utf-8") as f:
        job = json.load(f)
    os.makedirs(OUT_DIR, exist_ok=True)

    if not os.path.exists(READY):
        setup()

    # Irodori の venv python で自分自身を再実行 (依存は venv 側に入る)
    if os.environ.get("POPSHOT_INFER") != "1":
        env = dict(os.environ, POPSHOT_INFER="1")
        subprocess.run([VENV_PY, os.path.abspath(__file__)], cwd=REPO_DIR, env=env, check=True)
        return

    # ---- ここから venv 内 ----
    # リポジトリ本体は venv にインストールされないため sys.path に足す
    sys.path.insert(0, REPO_DIR)
    from irodori_tts.inference_runtime import (
        InferenceRuntime,
        RuntimeKey,
        SamplingRequest,
        resolve_cfg_scales,
        save_wav,
    )

    model = job["model"]
    if model.startswith("hf:"):
        from huggingface_hub import hf_hub_download

        ckpt = hf_hub_download(model[3:], "model.safetensors", token=job.get("hf_token") or None)
    else:
        ckpt = model
    print("[infer] checkpoint:", ckpt, flush=True)

    runtime = InferenceRuntime.from_key(
        RuntimeKey(
            checkpoint=ckpt,
            model_device="cuda",
            codec_repo="Aratako/Semantic-DACVAE-Japanese-32dim",
            model_precision="bf16",
            codec_device="cuda",
            codec_precision="bf16",
            codec_deterministic_encode=True,
            codec_deterministic_decode=True,
            compile_model=False,
            compile_dynamic=False,
        )
    )

    duration_scale = float(job.get("duration_scale", 1.0))
    caption = job.get("caption") or None
    cfg_text, cfg_caption, cfg_speaker, msgs = resolve_cfg_scales(
        cfg_guidance_mode="independent",
        cfg_scale_text=3.0,
        cfg_scale_caption=3.0,
        cfg_scale_speaker=5.0,
        cfg_scale=None,
        use_caption_condition=bool(runtime.model_cfg.use_caption_condition and caption),
        use_speaker_condition=False,
    )
    for m in msgs:
        print(m, flush=True)

    lines = job["lines"]
    for i, line in enumerate(lines):
        out = os.path.join(OUT_DIR, f"{line['key']}.wav")
        if os.path.exists(out):
            print(f"[infer] ({i + 1}/{len(lines)}) {line['key']} 既存のためスキップ", flush=True)
            continue
        result = runtime.synthesize(
            SamplingRequest(
                text=line["text"],
                caption=caption,
                ref_wav=None,
                ref_wavs=None,
                ref_latent=None,
                ref_latents=None,
                ref_embed=None,
                no_ref=True,
                ref_normalize_db=-16.0,
                ref_ensure_max=True,
                num_candidates=1,
                decode_mode="sequential",
                seconds=None,
                duration_scale=duration_scale,
                max_ref_seconds=None,
                max_text_len=None,
                max_caption_len=None,
                num_steps=40,
                cfg_scale_text=cfg_text,
                cfg_scale_caption=cfg_caption,
                cfg_scale_speaker=cfg_speaker,
                cfg_guidance_mode="independent",
                cfg_scale=None,
                cfg_min_t=0.5,
                cfg_max_t=1.0,
                truncation_factor=None,
                rescale_k=None,
                rescale_sigma=None,
                context_kv_cache=True,
                speaker_kv_scale=None,
                speaker_kv_min_t=None,
                speaker_kv_max_layers=None,
                speaker_uncond_mode="mask",
                seed=int(line["key"][:8], 16),
                t_schedule_mode="linear",
                sway_coeff=-1.0,
                trim_tail=True,
                tail_window_size=20,
                tail_std_threshold=0.05,
                tail_mean_threshold=0.1,
                lora_adapter=None,
            ),
            log_fn=None,
        )
        save_wav(out, result.audio, result.sample_rate)
        print(f"[infer] ({i + 1}/{len(lines)}) {line['key']} done", flush=True)

    print("[infer] all done", flush=True)


if __name__ == "__main__":
    main()
