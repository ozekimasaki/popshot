"""colab drivemount を pty 配下で実行し、/tmp/grant-ok が現れたら Enter を送る。

使い方 (WSL 内):
  python3 drivemount_pty.py <session-name>
別シェルで `touch /tmp/grant-ok` すると Enter が送信される。
"""
import os
import pty
import select
import sys
import time

SESSION = sys.argv[1] if len(sys.argv) > 1 else "popshot-drv"
FLAG = "/tmp/grant-ok"

if os.path.exists(FLAG):
    os.remove(FLAG)

pid, fd = pty.fork()
if pid == 0:
    os.execvp("colab", ["colab", "drivemount", "-s", SESSION])

print(f"[pty] drivemount started (pid={pid})", flush=True)
buf = b""
sent = False
deadline = time.time() + 900
status = None
while time.time() < deadline:
    r, _, _ = select.select([fd], [], [], 5)
    if r:
        try:
            data = os.read(fd, 4096)
        except OSError:
            break
        if not data:
            break
        sys.stdout.buffer.write(data)
        sys.stdout.buffer.flush()
        buf += data
    if not sent and b"Press Enter" in buf and os.path.exists(FLAG):
        print("\n[pty] grant confirmed, sending Enter", flush=True)
        os.write(fd, b"\n")
        sent = True
    done, status = os.waitpid(pid, os.WNOHANG)
    if done:
        print(f"[pty] exited status={status}", flush=True)
        break
else:
    print("[pty] timeout", flush=True)
