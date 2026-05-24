---
phase: "05"
name: "cli-packaging"
created: 2026-05-24
status: complete
---

# Phase 5: cli-packaging — Verification

## Goal-Backward Verification

**Phase Goal:** Add minimal local CLI commands to manage the Snail Agent Flow protocol: init, new-session, status, doctor, validate-spec, and handoff. Package CLI around the accepted artifact contract without inventing new paths/state, and add automated tests.

## Checks

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 1 | Register CLI commands `adp` and `saf` | PASS | `package.json` maps `bin/adp.js` to executables. |
| 2 | Zero-dependency CLI entry point | PASS | `bin/adp.js` written using pure Node.js APIs without external packages. |
| 3 | Command: init | PASS | Initializes directory structure and copies templates safely without overwriting. |
| 4 | Command: doctor | PASS | Performs workspace integrity checks and triggers specification validator subprocess. |
| 5 | Command: status | PASS | Reads and formats active-feature and run-state metadata. |
| 6 | Command: new-session | PASS | Creates session log from default markdown template under `.ai/sessions/`. |
| 7 | Command: handoff | PASS | Validates programmatic sections structure of memory handoff report. |
| 8 | Command: validate-spec | PASS | Spawns spec validator subprocess and forwards results. |
| 9 | Automated test coverage | PASS | `validators/scripts/test-cli.js` checks command execution, exits, and folder sandbox isolation. |

## Result

Phase 5 CLI packaging goals are fully achieved and verified.
