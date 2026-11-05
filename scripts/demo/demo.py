#!/usr/bin/env python3
"""demo.py — demo-mode switch for agent sessions.

Demo mode is session tooling only (the app is untouched): when on, the agent shows full
links on their own line so the terminal can make them clickable. State is a JSON file
under the repo's git common dir, so every worktree shares one switch and it is never committed.

Usage:
    python3 scripts/demo/demo.py on | off | status | session-start
    python3 scripts/demo/demo.py render [--wu KEY] URL [URL...]

    on             turn demo mode on, copying [demo].links from skill_router.toml (needs Python 3.11+)
    off            turn it off, keeping the record of links already shown
    status         print "demo: on" or "demo: off"
    session-start  SessionStart hook: re-inject the demo-mode reminder; silent when off, always exits 0
    render         print each URL on its own line; the first counted link per WU gets a QR code block
                   under it (needs qrencode; without it, bare URLs). Paste the output verbatim.
                   With demo off it prints the URLs unchanged and writes nothing.

Exit codes: 0 ok, 2 usage or setup error (not in a git repo, `on` without tomllib).
Everything except `on` is stdlib-only and Python 3.9-safe.
"""

from __future__ import annotations

import json
import os
import re
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
COMMANDS = ("on", "off", "status", "session-start", "render")
WU_BRANCH = re.compile(r"^[^/]+/([A-Za-z]+-\d+)(?:-(WU\d+))?", re.IGNORECASE)


class SetupError(Exception):
    pass


def state_path(root: Path) -> Path:
    try:
        proc = subprocess.run(["git", "-C", str(root), "rev-parse", "--git-common-dir"],
                              capture_output=True, text=True)
    except OSError as e:
        raise SetupError("cannot run git: %s" % e)
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
    except ValueError as e:
        raise SetupError("skill_router.toml is not valid TOML: %s" % e)
    if not isinstance(links, list):
        raise SetupError("[demo].links in skill_router.toml must be a list of regexes")
    links = [str(x) for x in links]
    for pattern in links:
        try:
            re.compile(pattern)
        except re.error as e:
            raise SetupError("[demo].links has an invalid regex %r: %s" % (pattern, e))
    return links


def qrencode_binary() -> str:
    return os.environ.get("YAB_QRENCODE", "qrencode")


def current_branch(root: Path) -> str:
    try:
        proc = subprocess.run(["git", "-C", str(root), "symbolic-ref", "--short", "-q", "HEAD"],
                              capture_output=True, text=True)
    except OSError:
        return ""
    return proc.stdout.strip() if proc.returncode == 0 else ""


def wu_key(branch: str) -> str:
    """One WU = one branch: feature/CheL-158-WU1-x -> CheL-158/WU1; no WU part -> CheL-158."""
    if not branch:
        return "detached"
    m = WU_BRANCH.match(branch)
    if not m:
        return "branch:" + branch
    return "%s/%s" % (m.group(1), m.group(2)) if m.group(2) else m.group(1)


def qr(url: str):
    """The UTF-8 QR block for url, or None when qrencode is missing or fails."""
    try:
        proc = subprocess.run([qrencode_binary(), "-t", "UTF8", "-m", "2", "-l", "M", url],
                              capture_output=True, text=True)
    except OSError:
        return None
    return proc.stdout.rstrip("\n") if proc.returncode == 0 and proc.stdout.strip() else None


def counts(state: dict, url: str) -> bool:
    links = state.get("links")
    for pattern in links if isinstance(links, list) else []:
        try:
            if re.search(pattern, url):
                return True
        except (re.error, TypeError):
            continue
    return False


def render(urls, state: dict, key: str):
    """Markdown for urls, plus the state with newly QR-coded links recorded under key."""
    old = state.get("shown")
    shown = {k: list(v) for k, v in old.items() if isinstance(v, list)} if isinstance(old, dict) else {}
    parts = []
    for url in urls:
        parts.append(url + "\n")
        if not counts(state, url) or url in shown.get(key, []):
            continue
        block = qr(url)
        if block is None:
            continue
        parts.append("```text\n%s\n```\n" % block)
        shown.setdefault(key, []).append(url)
    return "".join(parts), dict(state, shown=shown)


def cmd_render(path: Path, root: Path, args, out) -> int:
    key = None
    if args[:1] == ["--wu"]:
        if len(args) < 2:
            raise SetupError("--wu needs a key")
        key, args = args[1], args[2:]
    urls = [a.strip().strip("<>").strip() for a in args]
    if not urls:
        raise SetupError("render needs at least one URL")
    state = load_state(path)
    if not is_on(state):
        out.write("".join(u + "\n" for u in urls))
        return 0
    text, new_state = render(urls, state, key or wu_key(current_branch(root)))
    if new_state != state:
        save_state(path, new_state)
    out.write(text)
    return 0


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
    if not argv or argv[0] not in COMMANDS or (argv[0] != "render" and len(argv) != 1):
        err.write("usage: demo.py on | off | status | session-start | render [--wu KEY] URL...\n")
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
        if command == "render":
            return cmd_render(path, root, argv[1:], out)
        return cmd_session_start(path, out)
    except SetupError as e:
        if command == "session-start":
            return 0  # a hook must never fail the session
        err.write("error: %s\n" % e)
        return 2


if __name__ == "__main__":
    sys.exit(main())
