import os
import sys

# Configure environment paths
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(WORKSPACE_DIR, "backend")
CACHE_DIR = os.path.join(WORKSPACE_DIR, ".cache")

os.environ["KERAS_HOME"] = os.path.join(CACHE_DIR, "keras")
os.environ["DEEPFACE_HOME"] = os.path.join(CACHE_DIR, "deepface")
os.environ["MPLCONFIGDIR"] = os.path.join(CACHE_DIR, "mpl")
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🛡️  Starting Anti-Cheat Proctoring Backend on http://localhost:8000")
    print("="*60 + "\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
