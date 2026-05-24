---
phase: "03"
name: "deterministic-validator-drift-checks-and-human-review-packet"
created: 2026-05-24
status: pending
---

# Phase 3: deterministic-validator-drift-checks-and-human-review-packet — User Acceptance Testing

## Test Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | **Happy Path Spec Validation**:<br>Given a valid active feature spec stack,<br>When the validator is run,<br>Then it writes status `PASS`, resets `consecutive_failures` to `0`, and exits with code `0`. | pending | |
| 2 | **Missing Spec File**:<br>Given a missing or empty `tasks.md` in active feature,<br>When the validator runs,<br>Then it fails with classification `Missing Required File`, increments `consecutive_failures` in `run-state.json`, and exits with code `1`. | pending | |
| 3 | **Missing Spec Heading**:<br>Given `spec.md` is missing `## Behavior-Preservation Rules`,<br>When the validator runs,<br>Then it fails with classification `Missing Required Heading`, increments `consecutive_failures`, and exits with code `1`. | pending | |
| 4 | **Placeholder Scan Block**:<br>Given `plan.md` contains the token `TBD` or `TODO` (case-insensitive),<br>When the validator runs,<br>Then it fails with classification `Open Clarification`, increments `consecutive_failures`, and exits with code `1`. | pending | |
| 5 | **Path Drift Block**:<br>Given files exist in legacy folders like `.specify/specs/` or `.ai/specs/`,<br>When the validator runs,<br>Then it fails with classification `Path Drift`, increments `consecutive_failures`, and exits with code `1`. | pending | |
| 6 | **Retry Exhaustion Circuit Breaker**:<br>Given 2 consecutive failures exist in `run-state.json`,<br>When a 3rd validation failure is triggered,<br>Then `consecutive_failures` becomes 3, status transitions to `NEEDS_HUMAN_REVIEW`, `.ai/reviews/<feature-slug>/human-review.md` is generated, and the script exits with code `10`. | pending | |
| 7 | **Resume / Override Option**:<br>Given state is in `NEEDS_HUMAN_REVIEW` with 3 failures,<br>When a resume command or flag is executed,<br>Then it resets `consecutive_failures` to 0, status to `RESUMED`, and clears blocked reasons. | pending | |

## Summary

_Pending UAT execution_

