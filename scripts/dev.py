"""Start both local services and shut them down together on Ctrl-C."""
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def main():
    npm = shutil.which('npm')
    if not npm or not (ROOT / 'dashboard/node_modules').is_dir():
        raise SystemExit('Install Node.js and run: npm ci --prefix dashboard')
    for port in (8017, 5174):
        with socket.socket() as sock:
            try:
                sock.bind(('127.0.0.1', port))
            except OSError:
                raise SystemExit(f'Port {port} is in use. Stop the existing service or use the manual commands in README.rst.')
    processes = []
    def stop(*_):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, stop)
    try:
        processes.append(subprocess.Popen([sys.executable, '-m', 'uvicorn', 'meridian.api:app', '--reload', '--port', '8017'], cwd=ROOT, start_new_session=os.name != "nt"))
        processes.append(subprocess.Popen([npm, 'run', 'dev', '--', '--port', '5174', '--strictPort'], cwd=ROOT / 'dashboard', env={**os.environ, 'MERIDIAN_API_URL': 'http://127.0.0.1:8017'}, start_new_session=os.name != 'nt'))
        print('Meridian Risk: http://127.0.0.1:5174', flush=True)
        while all(p.poll() is None for p in processes):
            time.sleep(0.25)
    except KeyboardInterrupt:
        pass
    finally:
        for p in processes:
            if p.poll() is None:
                if os.name == 'nt':
                    p.terminate()
                else:
                    os.killpg(p.pid, signal.SIGTERM)
        for p in processes:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
                p.wait()


if __name__ == '__main__':
    main()
