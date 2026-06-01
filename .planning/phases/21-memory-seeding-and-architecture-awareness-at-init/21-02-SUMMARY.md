# Summary — Onboarding → Memory Bridge

## What Was Built

### Task 1: `adp onboard-memory` CLI Command (`bin/adp.js`)

A new CLI command `adp onboard-memory` (alias `saf onboard-memory`) that bridges the gap between the human-readable `ONBOARDING.md` artifact and agent-readable `.ai/memory/` files.

**Behavior:**
- Reads `ONBOARDING.md` from project root
- If missing, prints error: "Run project-onboarding skill first"
- If `.ai/memory/current-architecture.md` is missing, prints error: "Run `saf init` first"
- If `current-architecture.md` still contains the `<!-- Seeded by saf init -->` marker:
  - Extracts Architecture, Stack & Entrypoints, Conventions sections from ONBOARDING.md
  - Writes formatted content to `current-architecture.md`
- If `project-summary.md` still contains the seed marker:
  - Extracts purpose and stack info and writes
- If no seed marker found: prints warning and skips (non-destructive)

**Functions added:**
- `handleOnboardMemory()` — main handler
- `extractOnboardingSections(content)` — parses `## Heading` sections from ONBOARDING.md
- `buildArchitectureMemory(sections)` — formats architecture memory file
- `buildProjectSummary(sections)` — formats project summary memory file

### Task 2: Project Onboarding Skill Update

Appended a `## Memory Bridge` section to `.claude/skills/project-onboarding/SKILL.md` suggesting `saf onboard-memory` as a follow-up after generating `ONBOARDING.md`.

Note: `.agents/skills/project-onboarding/SKILL.md` does not exist in this repository, so no update was needed there.

## Files Modified

| File | Change |
|------|--------|
| `bin/adp.js` | Added `onboard-memory` to USAGE string, switch case in `runCli()`, and 4 new functions (handleOnboardMemory, extractOnboardingSections, buildArchitectureMemory, buildProjectSummary) |
| `.claude/skills/project-onboarding/SKILL.md` | Appended `## Memory Bridge` section |

## Verification

| Check | Result |
|-------|--------|
| `onboard-memory` in USAGE string | ✅ Present |
| `handleOnboardMemory` function exists | ✅ Present |
| `extractOnboardingSections` helper exists | ✅ Present |
| `buildArchitectureMemory` helper exists | ✅ Present |
| `buildProjectSummary` helper exists | ✅ Present |
| SKILL.md mentions `onboard-memory` | ✅ Verified |
| `npm test` | ✅ All tests pass (0 failures) |
