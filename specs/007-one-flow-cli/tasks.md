# Tasks: One-Flow CLI

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)
**Prerequisites**: plan.md and spec.md

## Phase 1: Feature Scaffold Command

- [x] T001 Add `feature <description>` to CLI usage and command routing in `bin/adp.js`.
- [x] T002 Add helpers for short-name generation and next numeric feature directory selection.
- [x] T003 Generate validator-compatible `spec.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md`.
- [x] T004 Update `.specify/feature.json` after feature generation.
- [x] T005 Add safe handling for missing descriptions and duplicate feature directories.

## Phase 2: One-Command Run Flow

- [x] T006 Add `run <description>` to initialize missing protocol directories, create feature artifacts, run validation, and print next steps.
- [x] T007 Ensure `run` exits non-zero when validation fails.

## Phase 3: Tests And Docs

- [x] T008 Add CLI integration tests for `feature`.
- [x] T009 Add CLI integration tests for `run`.
- [x] T010 Update README usage for greenfield and existing projects.
- [x] T011 Run `npm run validate`, `npm run test:cli`, and `npm test`.

## Notes

- This milestone packages artifact creation into one flow; it does not claim implementation work is complete.
