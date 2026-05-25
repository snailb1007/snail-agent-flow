---
slug: phase12-prereq-validator-fixes
status: complete
completed: 2026-05-25
---

# Summary — Phase 12 Prerequisite Validator Fixes

## Findings verified

Both reported defects in `lib/tool-validator.js#validatePrerequisites` are real:

- **P1**: Directory probes used `pre.name.toLowerCase()` (`gsd`, `spec-kit`, `gstack`) instead of the actual stage skill/command (`gsd-discuss-phase`, `speckit-specify`). An alias directory (e.g. `.agents/skills/gsd`) made the function return `available: true` even when the real skill was absent. The old test at `validators/scripts/test-flow-parser.js:104` even contained a comment ("should be available since the skill speckit-specify is in the workspace") that contradicted the actual code path — strong evidence of intent drift.
- **P2**: `spawnSync(checkCmd, { shell: true })` ran in `process.cwd()`. Flow YAML check commands such as `test -d .agents/skills/...` therefore inspected the wrong directory whenever the CLI targeted a repo via `PROJECT_ROOT`/`REPO_ROOT`.

## Changes

- `lib/tool-validator.js`
  - Derive the skill slug from the first whitespace token of `pre.command`, falling back to `pre.name`.
  - When `pre.check` is present, run it as the authoritative check.
  - Pass `cwd: repoRoot` to all `spawnSync` calls.
  - Tightened the failure reason message.
- `validators/scripts/test-flow-parser.js`
  - Replaced the misleading legacy test with a positive one that requires the real `speckit-specify` folder.
  - Added P1 regression: alias-only `.agents/skills/gsd` does not satisfy a missing `gsd-discuss-phase` command.
  - Added P2 regression: `check` runs with `cwd=repoRoot` even when `process.cwd()` is elsewhere.

## Verification

`npm test` → all suites green (CLI 19/19, flow-parser 9/9, flow-engine 78/78).
