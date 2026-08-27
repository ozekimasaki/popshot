"""VM 内のモデルファイル有無を確認するプローブ"""
import os

print("[probe] model exists:", os.path.exists("/content/model.safetensors"), flush=True)
