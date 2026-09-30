#!/usr/bin/env python3
"""Report the Android scenarios CI run (CheL-100) from Maestro's JUnit output.

  scenarios_report.py summary <artifacts-dir>  per-flow table → $GITHUB_STEP_SUMMARY
  scenarios_report.py badge <artifacts-dir>    shields.io endpoint JSON → gist

`badge` needs GIST_TOKEN and GIST_ID; without them it skips. A failed gist
update only warns — the badge is cosmetic and must never fail the job.
No results (e.g. the emulator never came up) is reported as such, never green.
"""
import json
import os
from pathlib import Path
import sys
import urllib.request
import xml.etree.ElementTree as ET


def load_results(root):
    results = []
    for report in sorted(Path(root).glob('**/report.xml')):
        for case in ET.parse(report).iter('testcase'):
            results.append({
                'name': case.get('name', ''),
                'file': case.get('file', ''),
                'seconds': float(case.get('time') or 0),
                'passed': case.get('status') == 'SUCCESS' and case.find('failure') is None,
            })
    return results


def _duration(seconds):
    minutes, secs = divmod(round(seconds), 60)
    return f'{minutes}m {secs}s' if minutes else f'{secs}s'


def summary_markdown(results):
    total = len(results)
    failed = sum(not r['passed'] for r in results)
    if not total:
        status = '⚠️ no results'
    elif failed:
        status = f'❌ {failed} of {total} failed'
    else:
        status = f'✅ {total}/{total} passed'
    lines = [f'## Android scenarios — {status}', '']
    if results:
        lines += ['| | Flow | File | Time |', '|---|---|---|---|']
        lines += [f"| {'✅' if r['passed'] else '❌'} | {r['name']} | `{r['file']}` | {_duration(r['seconds'])} |"
                  for r in results]
    return '\n'.join(lines) + '\n'


def badge(results):
    total = len(results)
    passed = sum(r['passed'] for r in results)
    if not total:
        message, color = 'no results', 'lightgrey'
    else:
        message, color = f'{passed}/{total} passed', 'brightgreen' if passed == total else 'red'
    return {'schemaVersion': 1, 'label': 'scenarios', 'message': message, 'color': color}


def patch_gist(gist_id, token, content):
    payload = json.dumps({'files': {'scenarios.json': {'content': json.dumps(content)}}})
    req = urllib.request.Request(
        f'https://api.github.com/gists/{gist_id}', data=payload.encode(), method='PATCH',
        headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json',
                 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30):
        pass


def main(argv):
    command, root = argv
    results = load_results(root)
    if command == 'summary':
        with open(os.environ.get('GITHUB_STEP_SUMMARY', os.devnull), 'a') as f:
            f.write(summary_markdown(results))
        return 0
    if command == 'badge':
        token, gist_id = os.environ.get('GIST_TOKEN'), os.environ.get('GIST_ID')
        if not token or not gist_id:
            print('GIST_TOKEN or GIST_ID not set; skipping badge update.')
            return 0
        content = badge(results)
        try:
            patch_gist(gist_id, token, content)
            print(f"Badge updated: {content['message']}")
        except OSError as e:
            print(f'::warning::Failed to update scenarios badge: {e}')
        return 0
    print(f'Unknown command: {command}', file=sys.stderr)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
