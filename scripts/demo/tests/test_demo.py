"""Tests for scripts/demo/demo.py — the demo-mode switch and its session-start reminder.

State table (state file <git-common-dir>/yab/demo.json):
    file absent / unreadable / malformed -> demo is off, never an error
    on   -> writes {"on": true, "links": [...from skill_router.toml [demo]], "shown": kept}
    off  -> writes {"on": false, ...}; "shown" kept so a re-enable does not repeat QR codes
"""

import io
import json
import os
import shutil
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

    def test_on_rejects_an_invalid_regex_and_stays_off(self):
        class Bad:
            @staticmethod
            def load(_f):
                return {"demo": {"links": ["^ok$", "("]}}
        with mock.patch.object(demo, "tomllib", Bad):
            self.write_config("")
            code, _, err = run(["on"], self.root, {"YAB_QRENCODE": "true"})
        self.assertEqual(2, code)
        self.assertIn("regex", err)
        self.assertFalse(self.state.exists())

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


ISSUE = "https://github.com/lutsenko-yuriy/CheckLister/issues/158"
COMMENT = ISSUE + "#issuecomment-4242"
PR = "https://github.com/lutsenko-yuriy/CheckLister/pull/159"
LINKS = [
    r"^https://github\.com/lutsenko-yuriy/CheckLister/issues/\d+$",
    r"^https://github\.com/lutsenko-yuriy/CheckLister/issues/\d+#issuecomment-\d+$",
    r"^https://github\.com/lutsenko-yuriy/CheckLister/pull/\d+$",
]


class WuKeyTests(unittest.TestCase):
    def test_branch_to_key_table(self):
        table = [
            ("feature/CheL-158-WU1-demo-switch", "CheL-158/WU1"),
            ("feature/CheL-158-demo-mode", "CheL-158"),
            ("feature/CheL-3-WU0-scenarios", "CheL-3/WU0"),
            ("feature/HAB-278-wu12-onboard-port", "HAB-278/wu12"),
            ("feature/CheL-12-debrief", "CheL-12"),
            ("chore/checkup-light-2026", "branch:chore/checkup-light-2026"),
            ("main", "branch:main"),
            ("", "detached"),
        ]
        for branch, key in table:
            with self.subTest(branch=branch):
                self.assertEqual(key, demo.wu_key(branch))


def fake_qrencode(directory, body):
    path = Path(directory) / "qrencode"
    path.write_text("#!/bin/sh\n" + body + "\n", encoding="utf-8")
    path.chmod(0o755)
    return str(path)


class RenderTestCase(DemoTestCase):
    def setUp(self):
        super().setUp()
        self.qr = fake_qrencode(self.root, 'for last; do :; done; echo "QR:$last"')
        self.env = {"YAB_QRENCODE": self.qr}

    def turn_on(self, **extra):
        state = {"on": True, "links": LINKS, "shown": {}}
        state.update(extra)
        self.state.parent.mkdir(parents=True, exist_ok=True)
        self.state.write_text(json.dumps(state), encoding="utf-8")

    def shown(self):
        return json.loads(self.state.read_text())["shown"]

    def render(self, *urls, wu="CheL-1/WU1"):
        return run(["render", "--wu", wu] + list(urls), self.root, self.env)


class RenderTests(RenderTestCase):
    def test_first_mention_prints_url_then_fenced_qr(self):
        self.turn_on()
        code, out, _ = self.render(PR)
        self.assertEqual(0, code)
        self.assertEqual("%s\n```text\nQR:%s\n```\n" % (PR, PR), out)
        self.assertEqual({"CheL-1/WU1": [PR]}, self.shown())

    def test_repeat_in_same_wu_prints_url_only(self):
        self.turn_on(shown={"CheL-1/WU1": [PR]})
        self.assertEqual((0, PR + "\n"), self.render(PR)[:2])
        self.assertEqual({"CheL-1/WU1": [PR]}, self.shown())

    def test_same_url_under_next_wu_gets_a_qr_again(self):
        self.turn_on(shown={"CheL-1/WU1": [PR]})
        out = self.render(PR, wu="CheL-1/WU2")[1]
        self.assertIn("QR:" + PR, out)
        self.assertEqual({"CheL-1/WU1": [PR], "CheL-1/WU2": [PR]}, self.shown())

    def test_link_not_in_the_counted_list_is_url_only(self):
        self.turn_on()
        other = PR + "/files"
        self.assertEqual((0, other + "\n"), self.render(other)[:2])
        self.assertEqual({}, self.shown())

    def test_several_urls_each_get_their_own_block(self):
        self.turn_on()
        out = self.render(ISSUE, COMMENT)[1]
        self.assertEqual(2, out.count("```text"))
        self.assertLess(out.index(ISSUE), out.index(COMMENT))
        self.assertEqual({"CheL-1/WU1": [ISSUE, COMMENT]}, self.shown())

    def test_same_url_twice_in_one_call_gets_one_qr(self):
        self.turn_on()
        self.assertEqual(1, self.render(PR, PR)[1].count("```text"))

    def test_url_is_trimmed_of_whitespace_and_angle_brackets(self):
        self.turn_on()
        out = self.render("  <%s> " % PR)[1]
        self.assertTrue(out.startswith(PR + "\n"))
        self.assertIn("QR:" + PR, out)

    def test_missing_qrencode_prints_url_only_and_records_nothing(self):
        self.turn_on()
        self.env = {"YAB_QRENCODE": "/nonexistent/qrencode"}
        self.assertEqual((0, PR + "\n"), self.render(PR)[:2])
        self.assertEqual({}, self.shown())

    def test_failing_qrencode_prints_url_only_and_records_nothing(self):
        self.turn_on()
        self.env = {"YAB_QRENCODE": fake_qrencode(self.root, "exit 1")}
        self.assertEqual((0, PR + "\n"), self.render(PR)[:2])
        self.assertEqual({}, self.shown())

    def test_off_prints_urls_unchanged_and_writes_nothing(self):
        self.turn_on(on=False)
        before = self.state.read_text()
        self.assertEqual((0, PR + "\n"), self.render(PR)[:2])
        self.assertEqual(before, self.state.read_text())

    def test_absent_state_prints_urls_unchanged_and_creates_nothing(self):
        self.assertEqual((0, PR + "\n"), self.render(PR)[:2])
        self.assertFalse(self.state.exists())

    def test_key_defaults_to_the_current_branch(self):
        self.turn_on()
        subprocess.run(["git", "-C", str(self.root), "symbolic-ref", "HEAD",
                        "refs/heads/feature/CheL-158-WU2-demo-links"], check=True)
        run(["render", PR], self.root, self.env)
        self.assertEqual({"CheL-158/WU2": [PR]}, self.shown())

    def test_detached_head_uses_the_detached_key(self):
        self.turn_on()
        (self.root / ".git" / "HEAD").write_text("0" * 40 + "\n")
        run(["render", PR], self.root, self.env)
        self.assertEqual({"detached": [PR]}, self.shown())

    def test_hand_edited_state_of_the_wrong_shape_does_not_crash(self):
        for extra in ({"shown": 5, "links": []}, {"shown": {"CheL-1/WU1": 7}, "links": []},
                      {"links": "abc"}):
            with self.subTest(extra=extra):
                self.turn_on(**extra)
                code, out, _ = self.render(PR)
                self.assertEqual(0, code)
                self.assertEqual(PR + "\n", out)

    def test_render_needs_at_least_one_url(self):
        self.turn_on()
        self.assertEqual(2, run(["render"], self.root, self.env)[0])

    def test_render_outside_a_git_repo_exits_2(self):
        with tempfile.TemporaryDirectory() as bare:
            self.assertEqual(2, run(["render", PR], Path(bare), self.env)[0])

    @unittest.skipUnless(shutil.which("qrencode"), "qrencode not installed")
    def test_real_qrencode_block_is_a_utf8_qr(self):
        self.turn_on()
        out = run(["render", "--wu", "CheL-1/WU1", COMMENT], self.root, {})[1]
        block = out.split("```text\n")[1].split("```")[0].splitlines()
        self.assertGreater(len(block), 15)
        self.assertEqual(1, len({len(line) for line in block}))
        self.assertTrue(all(set(line) <= set(" \u2580\u2584\u2588") for line in block))


class CliTests(DemoTestCase):
    def test_unknown_command_exits_2(self):
        self.assertEqual(2, run(["bogus"], self.root)[0])

    def test_no_command_exits_2(self):
        self.assertEqual(2, run([], self.root)[0])


if __name__ == "__main__":
    unittest.main()
