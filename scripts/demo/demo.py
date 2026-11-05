#!/usr/bin/env python3
"""demo.py — demo-mode switch for agent sessions.

Demo mode is session tooling only (the app is untouched): when on, the agent shows full
links on their own line so the terminal can make them clickable. State is a JSON file
under the repo's git common dir, so every worktree shares one switch and it is never committed.

Usage:
    python3 scripts/demo/demo.py on | off | status | session-start

    on             turn demo mode on, copying [demo].links from skill_router.toml (needs Python 3.11+)
    off            turn it off, keeping the record of links already shown
    status         print "demo: on" or "demo: off"
    session-start  SessionStart hook: re-inject the demo-mode reminder; silent when off, always exits 0

Exit codes: 0 ok, 2 usage or setup error (not in a git repo, `on` without tomllib).
Everything except `on` is stdlib-only and Python 3.9-safe.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import tomllib
except ImportError:  # Python < 3.11
    tomllib = None

ROOT = Path(__file__).resolve().parents[2]
REMINDER = ("Demo mode is ON: follow skills/shared/demo-mode.md when you mention an issue, "
            "comment or PR link.")
COMMANDS = ("on", "off", "status", "session-start")


class SetupError(Exception):
    pass


def state_path(root: Path) -> Path:
    proc = subprocess.run(["git", "-C", str(root), "rev-parse", "--git-common-dir"],
                          capture_output=True, text=True)
    if proc.returncode != 0:
        raise SetupError("demo mode needs a git repository (git rev-parse failed in %s)" % root)
    return (root / proc.stdout.strip()).resolve() / "yab" / "demo.json"


def load_state(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def save_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".demo-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
            f.write("\n")
        os.replace(tmp, str(path))
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def is_on(state: dict) -> bool:
    return state.get("on") is True


def configured_links(root: Path) -> list:
    if tomllib is None:
        raise SetupError("`demo on` needs Python 3.11+ (tomllib) to read skill_router.toml")
    try:
        with open(str(root / "skill_router.toml"), "rb") as f:
            links = tomllib.load(f).get("demo", {}).get("links", [])
    except OSError:
        return []
    return [str(x) for x in links]


def qrencode_binary() -> str:
    return os.environ.get("YAB_QRENCODE", "qrencode")


def cmd_on(path: Path, root: Path, out, err) -> int:
    links = configured_links(root)
    state = load_state(path)
    state.update({"on": True, "links": links})
    state.setdefault("shown", {})
    save_state(path, state)
    if shutil.which(qrencode_binary()) is None:
        err.write("warning: qrencode not found; demo links will render without QR codes "
                  "(install it, e.g. `brew install qrencode`)\n")
    out.write("demo: on\n")
    return 0


def cmd_off(path: Path, out) -> int:
    state = load_state(path)
    state["on"] = False
    save_state(path, state)
    out.write("demo: off\n")
    return 0


def cmd_session_start(path: Path, out) -> int:
    if is_on(load_state(path)):
        json.dump({
            "systemMessage": "Demo mode is on (`demo.py off` to stop).",
            "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": REMINDER},
        }, out)
        out.write("\n")
    return 0


def main(argv=None, root: Path = ROOT, out=None, err=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    out = out or sys.stdout
    err = err or sys.stderr
    if len(argv) != 1 or argv[0] not in COMMANDS:
        err.write("usage: demo.py %s\n" % " | ".join(COMMANDS))
        return 2
    command = argv[0]
    try:
        path = state_path(root)
        if command == "on":
            return cmd_on(path, root, out, err)
        if command == "off":
            return cmd_off(path, out)
        if command == "status":
            out.write("demo: %s\n" % ("on" if is_on(load_state(path)) else "off"))
            return 0
        return cmd_session_start(path, out)
    except SetupError as e:
        if command == "session-start":
            return 0  # a hook must never fail the session
        err.write("error: %s\n" % e)
        return 2


if __name__ == "__main__":
    sys.exit(main())
