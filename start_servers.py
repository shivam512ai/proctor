import os
import sys
import time
import subprocess
import signal

WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(WORKSPACE_DIR, "frontend")

def main():
    print("=" * 65)
    print("🚀  LAUNCHING ANTI-CHEAT WEB APPLICATION (FASTAPI + REACT)")
    print("=" * 65)
    print("• Backend:  http://localhost:8000 (API & WebSockets)")
    print("• Frontend: http://localhost:5173 (React Vite App)")
    print("=" * 65)

    # 1. Start Backend
    backend_proc = subprocess.Popen(
        [sys.executable, os.path.join(WORKSPACE_DIR, "start_backend.py")],
        cwd=WORKSPACE_DIR
    )

    # 2. Start Frontend
    # Use npm.cmd on Windows
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR
    )

    print("\n✅ Both services started. Press Ctrl+C to terminate all services.\n")

    def shutdown(sig, frame):
        print("\nStopping services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown(None, None)

if __name__ == "__main__":
    main()
