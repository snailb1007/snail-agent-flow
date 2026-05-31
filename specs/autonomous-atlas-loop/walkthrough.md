# Walkthrough — Autonomous ATLAS Loop

## Summary of Changes

We implemented a fully autonomous ATLAS loop system where the AI agent can transition between stages automatically by parsing stage metadata, executing actions/gates, checking prerequisites, and settling.

### Component 1: Machine-readable Contract
- Extended `.specify/templates/atlas-flow.yaml` with `agent_action`, `gate`, `post_gate`, and `verify_command` attributes.
- Created human companion documentation in `.claude/skills/atlas-routing/reference/controller-contract.md`.

### Component 2: Script Fixes
- Added `--auto --description "<text>"` mode to `.claude/skills/atlas-routing/scripts/score-and-claim.js` with default risk scores (all=1, STANDARD risk profile).
- Split the override flags (`BUGFIX`/`PROTOTYPE`) into `work_mode` rather than contaminating the `risk_profile`.
- Synchronized `.specify/feature.json` automatically after a flow-state file write in `score-and-claim.js`.
- Normalized file paths in `handleLease` in `bin/adp.js` to absolute paths before calling `LeaseManager`.
- Synchronized lease locks into `flow-state.json` `locks` field on both acquire and release.
- Added a fallback scan to `.claude/skills/atlas-gates/scripts/lay-preflight.js` scanning `.ai/locks/` when `state.locks` is empty and synced those back to state.
- Created `.claude/skills/atlas-settle/scripts/settle-full.js` to handle verify -> signal-log -> release-locks -> mark-done flow.

### Component 3: Agent Instructions
- Renamed `appendAtlasGuidelines` to `upsertAtlasGuidelines` in `bin/adp.js` to dynamically rewrite/migrate ATLAS Loop guidelines.
- Updated agent markdown files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) with the new `## Autonomous ATLAS Loop` section.

### Component 4: Verification
- Added 22 comprehensive deterministic rail tests inside `tests/` covering every script logic edge case.

---

## Verification Results

### Automated Tests
Ran `npm test` successfully. All CLI, unit, integration, and flow engine tests pass:

```text
Flow engine tests: 123 passed, 0 failed
Context budget tests: 32 passed, 0 failed
CLI Test Summary: Passed: 28/28
OwnershipStore: Passed: 10/10
Total integration tests passed successfully!
```
