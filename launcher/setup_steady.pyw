"""Double-click to set up Steady on this PC.

Makes a "Steady app" shortcut on the Desktop and a "Steady" entry in the Start menu,
then opens Steady. Run it again any time to repair the shortcuts.
"""

import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE if (HERE / "launcher").is_dir() else HERE.parent
LAUNCHER = ROOT / "launcher" / "steady.pyw"
ICON = next((p for p in (ROOT / "icon.ico", ROOT / "assets" / "icon.ico") if p.exists()), None)

exe = Path(sys.executable)
pyw = exe.with_name("pythonw.exe") if exe.with_name("pythonw.exe").exists() else exe
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

PS = (
    "$sh = New-Object -ComObject WScript.Shell; "
    "foreach ($p in @(([Environment]::GetFolderPath('Desktop') + '\\Steady app.lnk'), "
    "([Environment]::GetFolderPath('Programs') + '\\Steady.lnk'))) { "
    "$s = $sh.CreateShortcut($p); $s.TargetPath = $env:STEADY_PY; $s.Arguments = $env:STEADY_ARGS; "
    "$s.WorkingDirectory = $env:STEADY_DIR; if ($env:STEADY_ICON) { $s.IconLocation = $env:STEADY_ICON }; "
    "$s.Description = 'Steady'; $s.Save() }"
)


def message(title: str, text: str) -> None:
    try:
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        messagebox.showinfo(title, text)
        root.destroy()
    except Exception:  # noqa: BLE001
        pass


def main() -> None:
    env = dict(os.environ, STEADY_PY=str(pyw), STEADY_ARGS=f'-I "{LAUNCHER}"', STEADY_DIR=str(ROOT), STEADY_ICON=str(ICON or ""))
    made = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", PS], env=env, creationflags=NO_WINDOW).returncode == 0
    if made:
        message("Steady is set up", "There's a \"Steady app\" shortcut on your Desktop and \"Steady\" in the Start menu.\n\n"
                "Steady will open now.")
    else:
        message("Steady", "The shortcuts couldn't be made, but Steady still works: double-click launcher\\steady.pyw to open it.")
    subprocess.Popen([str(pyw), "-I", str(LAUNCHER)], cwd=str(ROOT), creationflags=NO_WINDOW)


if __name__ == "__main__":
    main()
