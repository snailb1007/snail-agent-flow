---
phase: "03"
name: "deterministic-validator-drift-checks-and-human-review-packet"
created: 2026-05-24
status: completed
---

# Phase 3: deterministic-validator-drift-checks-and-human-review-packet — Verification

## Goal-Backward Verification

**Phase Goal:** Implement a deterministic validator and drift checker script (`validators/scripts/validate-spec.js`) to prevent path and memory drift, check file existence and headings, scan for case-insensitive placeholder strings inside spec/plan/tasks files, track validation retries, and generate human review packets upon 3 consecutive validation failures.

## Checks

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 1 | **Deterministic Existence Checks (VALID-01)**:<br>Validator checks for `spec.md`, `plan.md`, `tasks.md` existence and files non-emptiness. | PASS | Verified by `test-validator.js` ("Missing Spec File") and direct checks on active folder. |
| 2 | **Required Headings Check (VALID-02)**:<br>Validator parses and checks `spec.md` (Goal, Non-Goals, Acceptance Criteria, Test Strategy, Behavior-Preservation Rules) and `plan.md` (Proposed Changes, Verification Plan) headings. | PASS | Verified by `test-validator.js` ("Missing Spec Heading") parsing validations. |
| 3 | **Path Drift Checks (VALID-03)**:<br>Validator checks for legacy spec folders (`specs/current/`, `.specify/specs/`, `.ai/specs/`) and blocks if files are present. | PASS | Verified by `test-validator.js` ("Path Drift Block") checking shadow locations. |
| 4 | **Placeholder Scan (VALID-04)**:<br>Validator performs case-insensitive scan of Spec-Kit files for forbidden strings (`TODO`, `TBD`, `NEEDS CLARIFICATION`, `FIXME`, `XXX`). | PASS | Verified by `test-validator.js` ("Placeholder Scan Block") case-insensitive scanning. |
| 5 | **Retry & Packet Generation (VALID-05)**:<br>Validator tracks `consecutive_failures` in `run-state.json`. Upon reaching 3, it writes `.ai/reviews/<feature-slug>/human-review.md` and exits with code 10. | PASS | Verified by `test-validator.js` ("Retry Exhaustion Circuit Breaker"). |
| 6 | **State updates & CLI command (VALID-06)**:<br>Validator updates `run-state.json` with status, last failed rule, and output, and is runnable via command line. | PASS | Verified by running `node validators/scripts/validate-spec.js` and `npm run validate`. |

## Result

All verification checks pass successfully. The validator script operates correctly in both automated test fixture sandbox environments and local repository executions.


