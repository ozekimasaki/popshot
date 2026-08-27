"""Phase 0: Drive マウントと /irodori-tts/mei_voice の棚卸し (colab run で実行)"""
import os

from google.colab import drive

drive.mount("/content/drive")

ROOT = "/content/drive/MyDrive/irodori-tts"
print("[verify] root exists:", os.path.isdir(ROOT), flush=True)
if not os.path.isdir(ROOT):
    raise SystemExit(1)

print("[verify] top level:", sorted(os.listdir(ROOT)), flush=True)

AUDIO_EXT = {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".opus", ".aac"}
TEXT_EXT = {".txt", ".jsonl", ".json", ".lab", ".tsv", ".csv", ".md"}

audio_files: list[str] = []
text_files: list[str] = []
for dirpath, _, filenames in os.walk(ROOT):
    for f in filenames:
        ext = os.path.splitext(f)[1].lower()
        p = os.path.join(dirpath, f)
        if ext in AUDIO_EXT:
            audio_files.append(p)
        elif ext in TEXT_EXT:
            text_files.append(p)

print(f"[verify] audio files: {len(audio_files)}", flush=True)
for p in audio_files[:15]:
    print(f"  audio: {p} ({os.path.getsize(p) / 1e6:.2f} MB)", flush=True)
print(f"[verify] text-like files: {len(text_files)}", flush=True)
for p in text_files[:15]:
    print(f"  text: {p} ({os.path.getsize(p)} bytes)", flush=True)

total_sec = 0.0
measured = 0
try:
    import soundfile as sf

    for p in audio_files:
        try:
            total_sec += sf.info(p).duration
            measured += 1
        except Exception as e:
            print(f"  unreadable: {p} ({e})", flush=True)
except ImportError:
    print("[verify] soundfile なし。尺の集計はスキップ", flush=True)

print(f"[verify] measured {measured}/{len(audio_files)} files, total {total_sec / 60:.1f} min", flush=True)
