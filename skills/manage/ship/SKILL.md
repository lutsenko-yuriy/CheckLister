---
name: ship
effort: RAPID
reasoning: TACTICAL
output_style: CONCISE
description: Post-merge housekeeping after a PR/MR is approved. Closes the linked PM issues, adds a CHANGELOG entry, regenerates BACKLOG.md, bumps the version, proposes PRODUCT_SPEC.md and GLOSSARY.md updates for approval, commits everything onto the feature branch, pushes, and merges. Invoke when the user approves a PR/MR, before merging.
---

The project management tool is **GitHub Issues**. The issue identifier prefix is **N/A**.

@skills/shared/git-cli-safety.md

---

## Steps

Run all steps in order. Each step must succeed before moving to the next.

### 1. Close the linked issue(s)

Move each issue linked to the PR/MR to **Done** (or the equivalent closed state) in the PM tool.

| Tool | How |
|---|---|
| Linear | `mcp__linear__save_issue` with `state: "Done"` |
| Jira | `POST /rest/api/3/issue/{key}/transitions` with the Done transition |
| GitHub Issues | `gh issue close {number}` |
| GitLab | `glab issue close {number}` |

### 2. Add a CHANGELOG entry

Invoke `draft-release-notes` inline for this PR (pass the PR number already in hand from step 1).
It returns zero or more approved, plain-language `[user]` bullets — possibly empty, which is a
valid outcome for a PR with no user-visible change.

Determine the entry's classification tag(s) first (`[user]`, `[app]`, `[ci]`, `[meta]`, `[test]`,
`[wip]` — see `docs/VERSIONING.md`), then branch:

**If the entry carries `[user]` or `[app]`:** open `docs/CHANGELOG.md` and convert any existing
`## [Unreleased]` heading at the top into a real numbered entry, folding in its existing bullets
alongside the new one(s) — carry each existing bullet under its own original subsection
(`### Added`/`### Changed`/`### Fixed`); if the new bullet(s) need a different subsection than
what's already there, add that subsection rather than merging unlike bullets under one heading
(or just prepend a fresh `## [X.Y.Z]` entry if there's no `## [Unreleased]` section to convert):

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Added / Changed / Fixed
- [user] N/A-XX: <drafted bullet from draft-release-notes>
- [user] N/A-XX: <another drafted bullet, if more than one>
- <any bullet already waiting under ## [Unreleased], carried over unchanged under its own subsection>
```

If `draft-release-notes` returned an empty list (no user-visible change) but the entry still
carries `[app]` (a release-worthy but non-user-facing change), use the original single-bullet
form instead:

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Added / Changed / Fixed
- [app] N/A-XX: <one-line technical summary of what changed>
```

Follow semantic versioning (`docs/VERSIONING.md`): patch for bug fixes, minor for new features, major for breaking changes. Proceed to step 4 to bump the version.

**Otherwise** (`[ci]`, `[meta]`, `[test]`, `[wip]` only): append a bullet under a `## [Unreleased]`
heading at the top of the file instead (create the heading if it doesn't exist yet):

```markdown
## [Unreleased]

### Added / Changed / Fixed
- [ci] N/A-XX: <one-line technical summary of what changed>
```

Do **not** bump the version for this case — skip step 4 entirely and go straight to step 5.

### 3. Regenerate BACKLOG.md

Open `docs/BACKLOG.md` and make two edits:

1. **In Progress section** — replace the in-progress bullet with `_(nothing in progress)_`.
2. **Milestone section** — remove the completed ticket(s) from the remaining-work list for their milestone.

Do not rewrite the rest of the file — the milestone sections are the source of truth from the PM tool.

### 4. Bump the version

Only reached when step 2 added a `[user]`/`[app]` entry. Find the project's version file (check `CLAUDE.md` → "Common Commands" for the stack-specific location, e.g. `pubspec.yaml`, `package.json`, `build.gradle`). Update the version string to match the new `[X.Y.Z]` entry added in step 2.

**No version file exists yet** (common for a project with no build tool chosen, or a script/CLI project that doesn't version itself): skip this step entirely — do not fail or block on it. Note in the step 7 report that there was no version file to bump, so this doesn't silently look skipped.

Do not touch the build number — CI manages it.

### 5. Update PRODUCT_SPEC.md and GLOSSARY.md

Skip this step if the new CHANGELOG entry (added in step 2) contains only `[meta]`, `[ci]`, or `[app]` tags — those PRs introduce no observable user-facing behaviour change. For all other PRs (`[user]` entries), proceed as follows:

1. Fetch the PR/MR diff (GitHub: `gh pr diff <number>` · GitLab: `glab mr diff <iid>`).
2. Re-read the ticket description (already fetched in step 1).
3. Determine what changed or was added:
   - **Product spec** (`docs/PRODUCT_SPEC.md`) — identify any new or modified user-facing behaviour. Propose a minimal, precise addition or edit to the relevant section (append a new bullet or update an existing one; never rewrite unrelated content).
   - **Glossary** (`docs/GLOSSARY.md`) — identify any new canonical domain terms introduced by the feature. For each, propose a new entry with a definition.
4. Present the proposed changes to the user **before writing anything**. Show the exact text to be added or replaced. Wait for explicit approval or revision instructions.
5. Apply only the approved changes.

If no changes are needed for a file, skip it. If the user declines all changes, skip to step 6.

### 6. Commit, push, and merge

Stage only the files changed above and commit onto the feature branch:

```bash
git add docs/CHANGELOG.md docs/BACKLOG.md <version-file>
# add only if modified in step 5:
git add docs/PRODUCT_SPEC.md docs/GLOSSARY.md
git commit -m "chore: release N/A-XX, bump version to X.Y.Z"
git push
```

Then merge the PR/MR on your Git host:

| Host | Command |
|---|---|
| GitHub | `gh pr merge {number} --squash --delete-branch` |
| GitLab | `glab mr merge {iid} --squash --remove-source-branch` |
| Bitbucket | merge via Bitbucket REST API or UI |

### 7. Report back

Confirm: issue(s) closed, changelog updated, version bumped (or "no version bump — entry filed under `## [Unreleased]`, no `[user]`/`[app]` tag"), docs updated (list which files changed), PR/MR merged. Include the version number (or note there was none this time) and the PR/MR URL.

After reporting, propose: *"Want to run `/debrief N/A-XX` to capture what you learned from this ticket?"* (optional — do not block on it)
