---
phase: 16-context-budget-gate-and-subagent-orchestration-policy
plan: 03
status: complete
completed: 2026-05-27
---

# Summary — Validation and Onboarding CLI Integration

## Findings verified

- Wiring context/policy check gates directly into `runStrictChecks` enforces policy configuration correctness, context pack structure compliance, fan-out disjoint target protection, and handoff validity.
- The default `.ai/state/context-policy.json` config is scaffolded idempotently during `adp init`.
- The instruction files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) are updated idempotently on init to contain the `## Context Budget and Subagent Orchestration Policy` block.
- Fail-closed behavior is successfully triggered in `adp doctor` if any validator finds critical policy, pack, or handoff schema violations.

## Changes

- **`lib/init-checks.js`**
  - Added new check IDs: `policy.config.exists`, `policy.config.schema`, `context.packs.schema`, `context.packs.refs`, `context.packs.fanout.conflicts`, `handoff.exists`, `handoff.schema`, and `instructions.contextPolicySection` to `runStrictChecks`.
- **`bin/adp.js`**
  - Updated `handleInit` to write a default `context-policy.json` config and append context policy rules to instruction markdown files.
- **`validators/scripts/test-init-checks.js`**
  - Added checks asserting out-of-range, missing, and invalid policy config, context pack, fan-out overlap, and handoff validations.
- **`validators/scripts/test-cli.js`**
  - Added integration coverage verifying `adp init` and `adp doctor` behaviors for policy files.

## Verification

- Verified that all unit and integration tests pass:
  - `node validators/scripts/test-init-checks.js` and `node validators/scripts/test-cli.js` complete successfully.
