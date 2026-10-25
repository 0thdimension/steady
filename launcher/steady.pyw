"""Steady launcher.

Serves the built app (dist/) from a small private server on 127.0.0.1 and opens it in its own
window: a Microsoft Edge app window on Windows, or your default browser elsewhere. Uses only
Python's standard library.

Data lives in one JSON file (on Windows: %APPDATA%\\Steady\\steady-data.json), with a daily copy
kept in backups/ for 30 days. The server shuts itself down a minute or two after the window closes.
"""

from __future__ import annotations

import base64
import datetime as dt
import json
import mimetypes
import os
import re
import secrets
import socket
import subprocess
import sys
import threading
import time
import traceback
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen

APP_ROOT = Path(__file__).resolve().parent.parent
DIST = APP_ROOT / "dist"
# STEADY_DATA_DIR lets tests use a scratch folder instead of the real data.
def default_data_dir() -> Path:
    if os.environ.get("APPDATA"):
        return Path(os.environ["APPDATA"]) / "Steady"
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "Steady"
    return Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share") / "Steady"


DATA_DIR = Path(os.environ.get("STEADY_DATA_DIR") or default_data_dir())
DATA_FILE = DATA_DIR / "steady-data.json"
BACKUPS = DATA_DIR / "backups"
STATE_FILE = DATA_DIR / "server.json"
LOG_FILE = DATA_DIR / "steady.log"
EDGE_PROFILE = Path(os.environ.get("LOCALAPPDATA") or Path.home()) / "Steady" / "edge-profile"
EXPORT_DIR = Path.home() / "Documents" / "Steady backups"

LAUNCHER_VERSION = 2  # bump when the launcher changes, so an older running copy gets replaced
PREFERRED_PORT = 52871
KEEP_BACKUPS = 30
IDLE_EXIT_SECONDS = 120
MAX_BODY = 60 * 1024 * 1024
MAX_BACKGROUND = 20 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

TOKEN = secrets.token_urlsafe(24)
last_seen = time.time()
started = time.time()


def log(msg: str) -> None:
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(f"{dt.datetime.now().isoformat(timespec='seconds')} {msg}\n")
    except OSError:
        pass


def valid_data(text: str) -> bool:
    try:
        return isinstance(json.loads(text), dict)
    except ValueError:
        return False


def backup_files() -> list[Path]:
    if not BACKUPS.exists():
        return []
    return sorted(p for p in BACKUPS.glob("steady-*.json"))


def backup_once_a_day() -> None:
    """The first save of each day keeps a copy of the file as it was."""
    if not DATA_FILE.exists():
        return
    BACKUPS.mkdir(parents=True, exist_ok=True)
    target = BACKUPS / f"steady-{dt.date.today().isoformat()}.json"
    if target.exists():
        return
    target.write_bytes(DATA_FILE.read_bytes())
    files = backup_files()
    for old in files[: max(0, len(files) - KEEP_BACKUPS)]:
        old.unlink(missing_ok=True)


def load_data() -> str | None:
    if not DATA_FILE.exists():
        return None
    text = DATA_FILE.read_text(encoding="utf-8")
    if valid_data(text):
        return text
    # Keep the unreadable file for inspection and fall back to the newest good backup.
    DATA_FILE.rename(DATA_DIR / f"steady-data.unreadable-{int(time.time())}.json")
    log("data file was unreadable; trying backups")
    for b in reversed(backup_files()):
        t = b.read_text(encoding="utf-8")
        if valid_data(t):
            return t
    raise RuntimeError("The data file couldn't be read and no backup was found.")


def save_data(text: str) -> None:
    if not valid_data(text):
        raise ValueError("Refusing to save data that isn't valid.")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    backup_once_a_day()
    tmp = DATA_DIR / "steady-data.json.tmp"
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, DATA_FILE)  # atomic swap, so a crash never leaves half a file


write_lock = threading.Lock()  # saves can arrive on parallel request threads


def background_files() -> list[Path]:
    return [DATA_DIR / f"background.{ext}" for ext in ("jpg", "png", "webp") if (DATA_DIR / f"background.{ext}").exists()]


class Handler(BaseHTTPRequestHandler):
    server_version = "Steady"

    def log_message(self, fmt: str, *args) -> None:  # keep quiet; errors go to steady.log
        pass

    # ---------------------------------------------------------------- helpers

    def host_ok(self) -> bool:
        host = (self.headers.get("Host") or "").lower()
        port = self.server.server_address[1]
        return host in (f"127.0.0.1:{port}", f"localhost:{port}")

    def token_ok(self) -> bool:
        return secrets.compare_digest(self.headers.get("X-Steady-Token") or "", TOKEN)

    def send(self, code: int, body: bytes = b"", ctype: str = "text/plain; charset=utf-8") -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if body and self.command != "HEAD":
            self.wfile.write(body)

    def body(self) -> bytes:
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise ValueError("Too large")
        return self.rfile.read(n) if n else b""

    # ---------------------------------------------------------------- routing

    def do_GET(self) -> None:
        self.route("GET")

    def do_PUT(self) -> None:
        self.route("PUT")

    def do_POST(self) -> None:
        self.route("POST")

    def do_DELETE(self) -> None:
        self.route("DELETE")

    def route(self, method: str) -> None:
        global last_seen
        if not self.host_ok():
            return self.send(403, b"Forbidden")
        path = self.path.split("?", 1)[0]
        try:
            if path.startswith("/api/"):
                if not self.token_ok():
                    return self.send(403, b"Forbidden")
                last_seen = time.time()
                return self.api(method, path[5:])
            if method != "GET":
                return self.send(405, b"Method not allowed")
            return self.static(path)
        except Exception as e:  # noqa: BLE001
            log("error " + method + " " + path + ": " + "".join(traceback.format_exception_only(type(e), e)).strip())
            return self.send(500, str(e).encode("utf-8"))

    def static(self, path: str) -> None:
        rel = path.lstrip("/") or "index.html"
        target = (DIST / rel).resolve()
        if DIST.resolve() not in target.parents and target != DIST.resolve() or not target.is_file():
            target = DIST / "index.html"  # single-page app: unknown paths get the app
        if target.name == "index.html":
            html = target.read_text(encoding="utf-8")
            inject = f'<script>window.__STEADY__={{"token":"{TOKEN}"}};</script>'
            html = html.replace("</head>", inject + "</head>", 1)
            return self.send(200, html.encode("utf-8"), "text/html; charset=utf-8")
        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if target.suffix == ".js":
            ctype = "text/javascript; charset=utf-8"
        return self.send(200, target.read_bytes(), ctype)

    def api(self, method: str, name: str) -> None:
        if name == "ping":
            return self.send(200, json.dumps({"ok": True, "version": LAUNCHER_VERSION}).encode("utf-8"), "application/json")
        if name == "shutdown" and method == "POST":
            threading.Timer(0.2, self.server.shutdown).start()
            return self.send(204)
        if name == "data" and method == "GET":
            text = load_data()
            return self.send(204) if text is None else self.send(200, text.encode("utf-8"), "application/json")
        if name == "data" and method in ("PUT", "POST"):
            text = self.body().decode("utf-8")
            with write_lock:
                save_data(text)
            return self.send(204)
        if name == "folder":
            return self.send(200, json.dumps({"path": str(DATA_DIR)}).encode("utf-8"), "application/json")
        if name == "open-folder" and method == "POST":
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            if sys.platform == "win32":
                os.startfile(DATA_DIR)  # type: ignore[attr-defined]
            else:
                subprocess.Popen(["open" if sys.platform == "darwin" else "xdg-open", str(DATA_DIR)])
            return self.send(204)
        if name == "background" and method == "GET":
            files = background_files()
            if not files:
                return self.send(204)
            f = files[0]
            mime = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[f.suffix[1:]]
            url = f"data:{mime};base64," + base64.b64encode(f.read_bytes()).decode("ascii")
            return self.send(200, url.encode("ascii"))
        if name == "background" and method == "PUT":
            m = re.match(r"^data:(image/[a-z]+);base64,(.+)$", self.body().decode("ascii"), re.S)
            if not m or m.group(1) not in IMAGE_TYPES:
                return self.send(400, b"Pick a JPG, PNG or WebP photo.")
            raw = base64.b64decode(m.group(2))
            if len(raw) > MAX_BACKGROUND:
                return self.send(400, b"That photo is over 20 MB. Pick a smaller one.")
            for f in background_files():
                f.unlink(missing_ok=True)
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            (DATA_DIR / f"background.{IMAGE_TYPES[m.group(1)]}").write_bytes(raw)
            return self.send(204)
        if name == "background" and method == "DELETE":
            for f in background_files():
                f.unlink(missing_ok=True)
            return self.send(204)
        if name == "export" and method == "POST":
            text = self.body().decode("utf-8")
            if not valid_data(text):
                return self.send(400, b"Nothing valid to export.")
            EXPORT_DIR.mkdir(parents=True, exist_ok=True)
            base = f"steady-backup-{dt.date.today().isoformat()}"
            target = EXPORT_DIR / f"{base}.json"
            n = 2
            while target.exists():
                target = EXPORT_DIR / f"{base}-{n}.json"
                n += 1
            target.write_text(text, encoding="utf-8")
            return self.send(200, json.dumps({"path": str(target)}).encode("utf-8"), "application/json")
        return self.send(404, b"Not found")


def find_edge() -> str | None:
    for base in (os.environ.get("ProgramFiles(x86)"), os.environ.get("ProgramFiles"), os.environ.get("LOCALAPPDATA")):
        if base:
            exe = Path(base) / "Microsoft" / "Edge" / "Application" / "msedge.exe"
            if exe.exists():
                return str(exe)
    return None


def open_window(url: str) -> None:
    edge = find_edge()
    if not edge:
        webbrowser.open(url)
        return
    EDGE_PROFILE.mkdir(parents=True, exist_ok=True)
    args = [
        edge,
        f"--app={url}",
        f"--user-data-dir={EDGE_PROFILE}",
        "--window-size=1320,860",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-mode",
        "--disable-sync",
        "--disable-extensions",
    ]
    subprocess.Popen(args, close_fds=True, creationflags=getattr(subprocess, "DETACHED_PROCESS", 0))


def already_running() -> str | None:
    """If this version of Steady is already open, return its address so we just open another
    window. An older copy that's still running is stopped so the new one can take over."""
    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        url = f"http://127.0.0.1:{state['port']}/"
        headers = {"X-Steady-Token": state["token"]}
        with urlopen(Request(url + "api/ping", headers=headers), timeout=1.5) as r:
            info = json.loads(r.read().decode("utf-8") or "{}")
    except Exception:  # noqa: BLE001
        return None
    if info.get("version") == LAUNCHER_VERSION:
        return url
    log(f"replacing an older running copy (version {info.get('version', 1)})")
    try:
        urlopen(Request(url + "api/shutdown", data=b"", method="POST", headers=headers), timeout=1.5)
    except Exception:  # noqa: BLE001
        stop_old_process(int(state.get("pid") or 0))
    for _ in range(20):
        time.sleep(0.25)
        try:
            urlopen(Request(url + "api/ping", headers=headers), timeout=0.5)
        except Exception:  # noqa: BLE001
            break
    return None


def stop_old_process(pid: int) -> None:
    """Older launchers had no shutdown call; stop that process only if it's really Python."""
    if pid <= 0 or pid == os.getpid():
        return
    out = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"], capture_output=True, text=True,
                         creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)).stdout.lower()
    if "python" in out:
        subprocess.run(["taskkill", "/PID", str(pid), "/F"], capture_output=True, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))


def pick_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", PREFERRED_PORT))
            return PREFERRED_PORT
        except OSError:
            s.bind(("127.0.0.1", 0))
            return s.getsockname()[1]


def watchdog(server: ThreadingHTTPServer) -> None:
    while True:
        time.sleep(10)
        if time.time() - started > 60 and time.time() - last_seen > IDLE_EXIT_SECONDS:
            log("window closed; shutting down")
            try:
                STATE_FILE.unlink(missing_ok=True)
            except OSError:
                pass
            server.shutdown()
            return


def main() -> None:
    if not (DIST / "index.html").exists():
        log("dist/index.html is missing; run npm run build in " + str(APP_ROOT))
        webbrowser.open(APP_ROOT.as_uri())
        return
    existing = already_running()
    if existing:
        if "--serve-only" not in sys.argv:
            open_window(existing)
        return
    port = pick_port()
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps({"port": port, "token": TOKEN, "pid": os.getpid()}), encoding="utf-8")
    threading.Thread(target=watchdog, args=(server,), daemon=True).start()
    url = f"http://127.0.0.1:{port}/"
    log(f"serving {DIST} at {url}")
    if "--serve-only" not in sys.argv:  # --serve-only is for testing without opening a window
        threading.Timer(0.3, open_window, args=(url,)).start()
    server.serve_forever()


if __name__ == "__main__":
    try:
        main()
    except Exception:  # noqa: BLE001
        log("launcher crashed:\n" + traceback.format_exc())
        sys.exit(1)
