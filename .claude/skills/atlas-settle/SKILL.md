---
name: atlas-settle
description: Provides close-out protocols and judgment procedures for S4 Close and S5 Learn under the ATLAS Loop, releasing advisory locks and logging final feature performance metrics.
---

# Atlas Settle Skill

This skill provides final close-out and settlement protocols for tasks and features executing under the ATLAS Loop (specifically stages **S4 Close** and **S5 Learn**).

Deterministic tasks (like S1 Verify and S3 Validate) are automated via utility scripts in this skill, while interpretive close-out gates (PR sign-offs, retro reflection, and memory updates) follow the judgment procedures detailed here.

---

## 1. Stage S4: Close (Mandatory Cleanup)

The purpose of **S4 Close** is to ensure that the local workspace is returned to a clean state, releasing all advisory locks to prevent path collisions with later work in the same session. (These locks are single-machine advisory only — see `docs/flow/artifact-ownership.md`.)

### 1.1. Lock & Claim Release Judgment
As a developer or agent finishing a feature branch, you must verify that no residual resource blocks remain:
* **Diff Hygiene**: Before releasing claims or leases, compare changed files with the active claim scope. Warn about out-of-scope changes, but do not block Settle in this lightweight gate.
* **Work Claims**: Verify that the advisory claim lock created during **Stage A: Align** is removed from `.ai/claims/`.
* **File Leases**: Verify that all advisory leases acquired during **Stage L: Lay** on specific files are removed from `.ai/locks/`.
* **State Cleanliness**: Inspect the `flow-state.json` file. The `locks` array must be empty `[]` and `status` should be transitioned to a completed/settling state.

### 1.2. Verification Action
Execute the lock release script:
```bash
node .claude/skills/atlas-settle/scripts/release-locks.js
```
Confirm that the command exits `0` and outputs a passing `gate-result` JSON envelope.

---

## 2. Stage S5: Learn (Retrospective & Observability)

The purpose of **S5 Learn** is to capture task metadata, log duration and retry attempt metrics, and extract long-term learnings for the codebase before concluding.

### 2.1. Retrospective Reflection (Interpretive)
Before archiving a phase or plan, you MUST compile a retrospective report outlining:
1. **Key Decisions**: Document any design patterns, library integrations, or architectural choices made during the phase.
2. **Issues Encountered**: Detail any blockages, command failures, or test regressions, and how they were resolved.
3. **Lessons Learned**: List technical takeaways or recommendations for future phases.

These are written to the phase's `{phase}-{plan}-SUMMARY.md` file.

### 2.2. Metric Logging Verification (Deterministic)
Log the task's final attempt count and latency metrics to the central period observability ledger by executing:
```bash
node .claude/skills/atlas-settle/scripts/signal-log.js
```
Verify that the signal log script appends a valid JSONL entry to `.ai/signals/current-period.jsonl` conforming to the `entities.schema.json` schema contract.

### 2.3. Handoff & State Synchronization
Verify that the `flow-state.json` is updated and all local state changes are synchronized with the git history.
