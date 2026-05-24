# Implementation Plan: Deterministic Validator, Drift Checks, and Human Review Packet

**Branch**: `003-deterministic-validator` | **Date**: 2026-05-24 | **Spec**: [spec.md](file:///Volumes/D/snail-agent-flow/specs/003-deterministic-validator/spec.md)

**Input**: Feature specification from `specs/003-deterministic-validator/spec.md`

## Summary

Implement a Node.js-based deterministic spec validator script at `validators/scripts/validate-spec.js` that checks structural markdown format rules, validates file paths, checks for forbidden placeholders (case-insensitive scan), manages validation retry counters in `run-state.json`, and outputs a human review packet on 3 consecutive failures.

## Technical Context

- **Language/Version**: Node.js (Vanilla ES6, CommonJS)
- **Primary Dependencies**: None (Standard library built-ins: `fs`, `path`, `child_process` only)
- **Storage**: JSON file `.ai/state/run-state.json` (state persistence) and Markdown file `.ai/reviews/<feature-slug>/human-review.md` (review packet)
- **Testing**: Node.js automated test runner at `validators/scripts/test-validator.js`
- **Target Platform**: Node.js 18+ (cross-platform macOS/Linux/Windows)
- **Project Type**: CLI Utility / Validator
- **Performance Goals**: Execution time < 100ms
- **Constraints**: 0 external npm dependencies to keep execution fast and dependency-free

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] No complex frameworks or API clients used for structural check.
- [x] Clear CLI-style text input/output protocol (exit codes, logs).
- [x] All requirements are testable and covered by the automated test runner.

## Project Structure

### Documentation (this feature)

```text
specs/003-deterministic-validator/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Tasks checklist (created in next stage)
```

### Source Code (repository root)

```text
validators/
└── scripts/
    ├── validate-spec.js  # [NEW] Core validator script
    └── test-validator.js # [NEW] Test suite for mock validation scenarios
```

## Proposed Changes

We will create the core validator script and the associated test suite in the `validators/scripts/` directory:

### 1. `validators/scripts/validate-spec.js` [NEW]

- Reads `.specify/feature.json` or `.ai/state/active-feature.json` to identify the active spec folder.
- Scans legacy directories (`.specify/specs/`, `specs/current/`, `.ai/specs/`) recursively for any `.md` files. If found, logs `Path Drift` and exits with code 1/10.
- Verifies the existence of `spec.md`, `plan.md`, and `tasks.md` in the active spec folder. If any are missing, logs `Missing Required File` and exits with code 1/10.
- Reads `spec.md` and checks for:
  - H1 title or H2 `## Goal`
  - Exact headings: `## Non-Goals`, `## Acceptance Criteria`, `## Test Strategy`, `## Behavior-Preservation Rules`.
  - If missing, logs `Missing Required Heading` and exits.
- Reads `plan.md` and checks for exact headings:
  - `## Proposed Changes`
  - `## Verification Plan`.
  - If missing, logs `Missing Required Heading` and exits.
- Reads `tasks.md` and checks that it contains standard markdown checklist items (`- [ ]` or `- [x]`). If none found, logs checklist format errors.
- Scans `spec.md`, `plan.md`, and `tasks.md` case-insensitively for forbidden placeholder strings: `TO-DO`, `TB-D`, `NEEDS_CLARIFICATION`, `[NEEDS_CLARIFICATION]`, `FIX-ME`, `XX-X`. If any match, logs `Open Clarification` and prints the location.
- Persists and manages state in `.ai/state/run-state.json`:
  - Increments `consecutive_failures` on failure.
  - Resets `consecutive_failures` to `0` and sets status to `PASS` on success.
  - If `consecutive_failures` reaches 3, writes `.ai/reviews/<feature-slug>/human-review.md` with structured details, sets status to `NEEDS_HUMAN_REVIEW`, and exits with code `10`.
  - Otherwise, sets status to `BLOCKED` and exits with code `1`.

### 2. `validators/scripts/test-validator.js` [NEW]

- Programmatically sets up temporary test directories mocking different spec folder structures.
- Executes `validate-spec.js` via child process fork/spawn and asserts:
  - Exit code values (0, 1, 10).
  - Validation statuses and error output.
  - State changes in `run-state.json`.
  - Generation of the review packet Markdown on the 3rd consecutive failure.
- Cleans up temporary test folders upon completion.

---

## Verification Plan

### Automated Tests

- Execute the automated test runner:
  ```bash
  node validators/scripts/test-validator.js
  ```
  This will verify all validation rules, path scans, retry tracking state transitions, and file generator outputs.

### Manual Verification

- Run the validator against the current active feature directory (003-deterministic-validator):
  ```bash
  node validators/scripts/validate-spec.js
  ```
- Intentionally insert a `TO-DO` marker in `plan.md` and verify the validator fails with `Open Clarification`.
- Run it 3 times to verify that the human review packet `.ai/reviews/003-deterministic-validator/human-review.md` is generated.
- Fix the placeholder and run it again to verify that the status resets to `PASS` and consecutive failures reset to `0`.
