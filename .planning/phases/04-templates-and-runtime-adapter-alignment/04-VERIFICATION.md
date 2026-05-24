---
phase: "04"
name: "templates-and-runtime-adapter-alignment"
created: 2026-05-24
status: complete
---

# Phase 4: templates-and-runtime-adapter-alignment — Verification

## Goal-Backward Verification

**Phase Goal:** Align runtime-specific instructions and templates to the shared protocol contract:
- `.specify/` owns templates, scripts, and the active feature pointer (`.specify/feature.json`).
- `specs/<feature-slug>/` owns canonical Spec-Kit files (`spec.md`/`plan.md`/`tasks.md`).
- `.ai/` owns orchestration state (`run-state.json`), reviews, sessions, and memory.

## Checks

| # | Requirement | Status | Evidence |
21: | 1 | Redundant active feature pointer `.ai/state/active-feature.json` is deleted | PASS | Removed from repo; JS validator updated to read from `.specify/feature.json`. |
22: | 2 | Spec validator reads `.specify/feature.json` and blocks deprecated active-feature.json | PASS | `validators/scripts/validate-spec.js` path drift check; tested in `test-validator.js`. |
23: | 3 | Bash scripts parse `.specify/feature.json` | PASS | `.specify/scripts/bash/validate-pipeline-state.sh`, `validate-gates-and-memory.sh`, and `smoke-test.sh` updated. |
24: | 4 | Runtime instructions and constitution aligned | PASS | `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` and `.ai/constitution.md` updated to document boundary rules. |
25: | 5 | All validation tests pass successfully | PASS | `npm test` runs spec validator and pipeline simulation checks cleanly. |

## Result

Phase 4 goals are fully achieved and verified.
