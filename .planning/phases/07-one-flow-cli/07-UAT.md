---
phase: "07"
name: "one-flow-cli"
created: 2026-05-25
status: complete
---

# Phase 7: one-flow-cli — User Acceptance Testing

## Test Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Feature command routing & help | PASS | Running `adp feature` with no description fails with a usage help message. `--help` lists new commands. |
| 2 | Feature scaffold generation | PASS | Running `adp feature "Add user login"` creates `specs/001-add-user-login/` with `spec.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md`. |
| 3 | Active feature pointer updates | PASS | After running `adp feature`, the `.specify/feature.json` pointer is updated to the newly generated feature directory. |
| 4 | Scaffold spec-validation | PASS | Scaffolded files pass deterministic validation by default with zero manual modifications. |
| 5 | Slug derivation and stop words | PASS | derived slugs filter stop words and use lowercase kebab case. Empty slugs fall back to `new-feature`. |
| 6 | Overwrite collision prevention | PASS | Exits with error code 1 and doesn't overwrite files if a feature directory of the same slug already exists. |
| 7 | Zero-config run entry point | PASS | Running `adp run "Create project dashboard"` initializes missing directories, creates a valid scaffold, and validates it. |
| 8 | Target sandbox path isolation | PASS | Running CLI tests overrides `PROJECT_ROOT`/`REPO_ROOT` variables, targeting sandbox fixtures without leaking host repository state. |

## Summary

Phase 7 UAT passed successfully for first-class One-Flow CLI commands `feature` and `run`.
