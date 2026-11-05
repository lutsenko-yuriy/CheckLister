"""Tests for scripts/demo/demo.py — the demo-mode switch and its session-start reminder.

State table (state file <git-common-dir>/yab/demo.json):
    file absent / unreadable / malformed -> demo is off, never an error
    on   -> writes {"on": true, "links": [...from skill_router.toml [demo]], "shown": kept}
    off  -> writes {"on": false, ...}; "shown" kept so a re-enable does not repeat QR codes
"""

import io
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from scripts.demo import demo


class _EmptyToml:
    """Stands in for tomllib on Python 3.9 so `on`'s state handling is still covered there."""

    @staticmethod
    def load(_f):
        return {}


def run_on(root):
    with mock.patch.object(demo, "tomllib", demo.tomllib or _EmptyToml):
        return run(["on"], root, {"YAB_QRENCODE": "true"})


def run(argv, root, env=None):
    out, err = io.StringIO(), io.StringIO()
    with mock.patch.dict(os.environ, env or {}):
        code = demo.main(argv, root=root, out=out, err=err)
    return code, out.getvalue(), err.getvalue()


class DemoTestCase(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        subprocess.run(["git", "-C", tmp.name, "init", "-q"], check=True)
        self.state = self.root / ".git" / "yab" / "demo.json"

    def write_config(self, text):
        (self.root / "skill_router.toml").write_text(text, encoding="utf-8")


class StateTests(DemoTestCase):
    def test_absent_state_is_off(self):
        code, out, _ = run(["status"], self.root)
        self.assertEqual(0, code)
        self.assertEqual("demo: off\n", out)

    def test_malformed_state_is_off(self):
        self.state.parent.mkdir(parents=True)
        self.state.write_text("{not json", encoding="utf-8")
        self.assertEqual("demo: off\n", run(["status"], self.root)[1])

    def test_non_object_state_is_off(self):
        self.state.parent.mkdir(parents=True)
        self.state.write_text("[1]", encoding="utf-8")
        self.assertEqual("demo: off\n", run(["status"], self.root)[1])

    def test_state_lives_under_git_common_dir_from_a_worktree(self):
        subprocess.run(["git", "-C", str(self.root), "-c", "user.name=t", "-c", "user.email=t@t",
                        "commit", "-q", "--allow-empty", "-m", "x"], check=True)
        wt = self.root.parent / (self.root.name + "-wt")
        subprocess.run(["git", "-C", str(self.root), "worktree", "add", "-q", str(wt), "-b", "b"], check=True)
        self.addCleanup(lambda: subprocess.run(["git", "-C", str(self.root), "worktree", "remove", "--force", str(wt)]))
        run_on(wt)
        self.assertTrue(self.state.exists())

    def test_outside_a_git_repo_fails_with_exit_2(self):
        with tempfile.TemporaryDirectory() as plain:
            code, _, err = run(["status"], Path(plain))
        self.assertEqual(2, code)
        self.assertIn("git", err)


class SwitchTests(DemoTestCase):
    def test_on_then_status_then_off(self):
        self.assertEqual(0, run_on(self.root)[0])
        self.assertEqual("demo: on\n", run(["status"], self.root)[1])
        self.assertEqual(0, run(["off"], self.root)[0])
        self.assertEqual("demo: off\n", run(["status"], self.root)[1])

    @unittest.skipIf(demo.tomllib is None, "needs tomllib (Python 3.11+)")
    def test_on_copies_links_from_config(self):
        self.write_config('[demo]\nlinks = ["^https://a$", "^https://b$"]\n')
        run(["on"], self.root, {"YAB_QRENCODE": "true"})
        self.assertEqual(["^https://a$", "^https://b$"], json.loads(self.state.read_text())["links"])

    @unittest.skipIf(demo.tomllib is None, "needs tomllib (Python 3.11+)")
    def test_on_without_demo_table_has_no_links(self):
        self.write_config('[llm]\nrouter_enabled = false\n')
        run_on(self.root)
        self.assertEqual([], json.loads(self.state.read_text())["links"])

    def test_on_warns_when_qrencode_missing_but_still_turns_on(self):
        with mock.patch.object(demo, "tomllib", demo.tomllib or _EmptyToml):
            code, _, err = run(["on"], self.root, {"YAB_QRENCODE": "/nonexistent/qrencode"})
        self.assertEqual(0, code)
        self.assertIn("qrencode", err)
        self.assertEqual("demo: on\n", run(["status"], self.root)[1])

    def test_on_without_tomllib_exits_2_and_stays_off(self):
        with mock.patch.object(demo, "tomllib", None):
            code, _, err = run(["on"], self.root, {"YAB_QRENCODE": "true"})
        self.assertEqual(2, code)
        self.assertIn("3.11", err)
        self.assertEqual("demo: off\n", run(["status"], self.root)[1])

    def _on_with_toml(self, fake):
        with mock.patch.object(demo, "tomllib", fake):
            (self.root / "skill_router.toml").write_text("x", encoding="utf-8")
            return run(["on"], self.root, {"YAB_QRENCODE": "true"})

    def test_on_with_malformed_toml_exits_2_and_stays_off(self):
        class Broken:
            @staticmethod
            def load(_f):
                raise ValueError("bad toml")
        code, _, err = self._on_with_toml(Broken)
        self.assertEqual(2, code)
        self.assertIn("skill_router.toml", err)
        self.assertEqual("demo: off\n", run(["status"], self.root)[1])

    def test_on_rejects_links_that_are_not_a_list(self):
        class Str:
            @staticmethod
            def load(_f):
                return {"demo": {"links": "abc"}}
        code, _, err = self._on_with_toml(Str)
        self.assertEqual(2, code)
        self.assertIn("links", err)

    def test_off_and_status_never_need_tomllib(self):
        with mock.patch.object(demo, "tomllib", None):
            self.assertEqual(0, run(["off"], self.root)[0])
            self.assertEqual(0, run(["status"], self.root)[0])

    def test_off_keeps_shown(self):
        self.state.parent.mkdir(parents=True)
        self.state.write_text(json.dumps({"on": True, "links": [], "shown": {"CheL-1/WU1": ["u"]}}))
        run(["off"], self.root)
        self.assertEqual({"CheL-1/WU1": ["u"]}, json.loads(self.state.read_text())["shown"])

    def test_write_is_atomic_no_temp_files_left(self):
        run_on(self.root)
        self.assertEqual(["demo.json"], os.listdir(self.state.parent))


class SessionStartTests(DemoTestCase):
    def test_silent_when_off_or_absent(self):
        self.assertEqual((0, "", ""), run(["session-start"], self.root))
        run(["off"], self.root)
        self.assertEqual((0, "", ""), run(["session-start"], self.root))

    def test_silent_when_state_malformed(self):
        self.state.parent.mkdir(parents=True)
        self.state.write_text("{not json", encoding="utf-8")
        self.assertEqual((0, "", ""), run(["session-start"], self.root))

    def test_silent_and_exit_0_outside_a_git_repo(self):
        with tempfile.TemporaryDirectory() as plain:
            self.assertEqual((0, "", ""), run(["session-start"], Path(plain)))

    def test_silent_and_exit_0_when_git_is_missing(self):
        self.assertEqual((0, "", ""), run(["session-start"], self.root, {"PATH": "/nonexistent"}))

    def test_on_emits_hook_json_for_user_and_model(self):
        run_on(self.root)
        code, out, err = run(["session-start"], self.root)
        self.assertEqual((0, ""), (code, err))
        payload = json.loads(out)
        self.assertIn("Demo mode", payload["systemMessage"])
        hook = payload["hookSpecificOutput"]
        self.assertEqual("SessionStart", hook["hookEventName"])
        self.assertIn("skills/shared/demo-mode.md", hook["additionalContext"])

    def test_output_is_a_single_json_document(self):
        run_on(self.root)
        out = run(["session-start"], self.root)[1]
        self.assertEqual(1, len(out.splitlines()))


class CliTests(DemoTestCase):
    def test_unknown_command_exits_2(self):
        self.assertEqual(2, run(["bogus"], self.root)[0])

    def test_no_command_exits_2(self):
        self.assertEqual(2, run([], self.root)[0])


if __name__ == "__main__":
    unittest.main()
