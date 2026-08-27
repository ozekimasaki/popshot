"""irodori_infer.py を実ファイルとして実行するブートストラップ (colab exec -f 用)。

colab exec -f はコードをカーネルのセルとして実行するため __file__ を持たず、
venv への再実行ができない。アップロード済みの実ファイルを subprocess で起動する。
子プロセスの出力はセルの戻り値に乗らないため、キャプチャして明示的に表示する。
"""
import subprocess
import sys

r = subprocess.run(
    [sys.executable, "/content/irodori_infer.py"],
    capture_output=True,
    text=True,
)
print(r.stdout, flush=True)
if r.stderr:
    print(r.stderr[-4000:], file=sys.stderr, flush=True)
sys.exit(r.returncode)
