---
name: draft-release-notes
effort: RAPID
reasoning: TACTICAL
output_style: CONCISE
description: Draft the [user] "What's New"/"What to Test" CHANGELOG bullets for a PR or ticket, separately from the technical N/A-XX bullet. Gathers observable before/after behaviour from the ticket, the PR diff, and (for multi-WU tickets) the reconciled final state across all WUs, drafts one bullet per user-noticeable change, self-checks each against the plain-language checklist, and returns the approved list (possibly empty) to its caller.
---

@skills/shared/project-config.md

This skill drafts bullets only — it does not write to `docs/CHANGELOG.md` itself. It is
invoked inline by `ship` (or standalone via `/draft-release-notes`) and returns its approved
output to the caller. The returned bullets are what `fastlane/Fastfile`'s `testflight_changelog`
later pulls verbatim into TestFlight's "What to Test" field, so this is the only place that text
gets shaped — write every bullet as if it will be read by a tester, not just filed in a changelog.

---

## Inputs

A PR number or a ticket ID (`ship` already has the PR number in hand when it calls this inline).
Everything else below is derived — do not ask the user for anything except final approval.

---

## Steps

### 1. Gather evidence

Collect observable before/after behaviour from these sources, in order:

1. **Ticket description** (fetch via the PM tool — see `skills/shared/pm-tool-mapping.md`'s
   "Fetch issue" operation; skip the fetch if the ticket description is already in hand from
   earlier this session) — the *intended* user-facing behaviour, and its Work Units section if
   present.
2. **PR diff**, scoped to what a user could actually notice: `gh pr diff <N>` filtered to
   `src/shared/i18n/locales/en.ts` (user-facing copy), `src/features/*/ui/**` (screens and
   components), and any native-visible resource change (`assets/icon/**`, `ios/**/Info.plist`,
   `android/**/AndroidManifest.xml`, `android/**/res/**`). Read implementation-only diffs (domain
   models, repositories, navigation wiring, analytics) for context, but never quote them into a
   bullet.
3. **Multi-WU reconciliation** — if the ticket has more than one WU: read
   `git log origin/main --grep "<ticket-id>"` plus every existing `[wip]` CHANGELOG entry under
   `## [Unreleased]` carrying this ticket's identifier (see `docs/workflows/MULTI_WU.md`). Draft
   the bullet describing only what is *still true after the final WU* — a behaviour an earlier WU
   introduced and a later WU changed or reverted is explicitly excluded, not mentioned as history.
4. **Prior `[user]`/`[app]` bullets** already in `docs/CHANGELOG.md` — read a handful as a tone
   reference sample only, never as content to reuse.

### 2. Draft

One bullet per distinct thing a user would notice. Do not pad the list — **zero bullets is a
valid, first-class outcome**, reported as "no user-visible change in this PR" rather than
inventing one. This is advisory only: the caller (`ship`) still decides the entry's classification
tag (`[user]`, `[app]`, `[ci]`, `[meta]`, `[test]`, `[wip]` — see `docs/VERSIONING.md`) itself, and
zero bullets here does not block that decision.

### 3. Self-check

@skills/manage/draft-release-notes/resources/user-bullet-checklist.md

Run every drafted bullet against all seven items above before showing it. A bullet that fails any
item gets rewritten, not shown with a caveat attached.

### 4. Present for approval

Show the user:
- Each bullet that passed self-check.
- One line noting anything deliberately left out and why (e.g. "the icon zoom-transition timing
  fix — implementation detail, item 5").

Wait for explicit approval or revision. Iterate on any requested changes, then return to step 3
for the revised bullets.

### 5. Return

Return the approved bullet list (possibly empty) to the caller. Do not write to
`docs/CHANGELOG.md` — that stays owned by whoever invoked this skill (`ship`, step 2).

---

## Constraints

- Never invent a bullet to avoid returning an empty list.
- Never quote class/component names, file paths, remote-config or feature-flag key names,
  ticket/PR numbers, or WU markers into a bullet — see the checklist for the full list.
- Never write to `docs/CHANGELOG.md` or any other file — this skill only drafts and returns text.
- For multi-WU tickets, never describe an intermediate WU's behaviour that a later WU changed or
  reverted.
