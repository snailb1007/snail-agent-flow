---
slug: phase12-prereq-validator-fixes
created: 2026-05-25
---

# Quick Task: Phase 12 Prerequisite Validator Fixes

Fix two bugs in `lib/tool-validator.js` (Phase 12: Prerequisite Tool Checker).

## P1 — Wrong directory key (alias vs actual skill)
`validatePrerequisites` checks `.agents/skills/<pre.name.toLowerCase()>` (e.g. `gsd`, `spec-kit`) instead of the actual stage skill folder (`gsd-discuss-phase`, `speckit-specify`). Result: a stale alias folder marks the prerequisite available even when the real skill is missing.

**Fix:** Prefer the first whitespace-token of `pre.command` (the real skill/command identifier) as the directory slug; fall back to `pre.name` only when `command` is absent. When `pre.check` is provided, honor it as the authoritative check (it already enumerates all three locations).

## P2 — spawnSync ignores repoRoot
The fallback `spawnSync(checkCmd, { shell: true })` runs in `process.cwd()`, so relative `test -d .agents/skills/...` in flow YAMLs probes the wrong directory when ADP targets a repo via `PROJECT_ROOT`/`REPO_ROOT`.

**Fix:** Pass `cwd: repoRoot` to `spawnSync`.

## Tests
- Update `validators/scripts/test-flow-parser.js` to add a regression test that proves a stale alias directory (e.g. `.agents/skills/gsd`) does NOT satisfy a `{ name: 'GSD', command: 'gsd-discuss-phase' }` prerequisite when `gsd-discuss-phase` is absent.
- Add a regression test that `cwd` is honored (run from a tmp cwd, point repoRoot at the project).
