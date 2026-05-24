---
phase: "06"
name: "expanded-examples-ci-matrix-and-optional-evaluation"
created: 2026-05-24
status: complete
---

# Phase 6: expanded-examples-ci-matrix-and-optional-evaluation — User Acceptance Testing

## Test Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Greenfield project initialization | PASS | `validators/scripts/test-cli.js` copies the greenfield fixture, runs `node bin/adp.js init`, creates an active feature, and runs `doctor`. |
| 2 | Brownfield project adoption | PASS | `validators/scripts/test-cli.js` copies the brownfield fixture, runs `init`, confirms protocol files are added, and confirms existing README/source content is preserved. |
| 3 | Brownfield post-adoption validation | PASS | The CLI test creates active spec files in the brownfield sandbox and verifies `doctor` exits successfully. |
| 4 | Evaluation rubric validation | PASS | The CLI test parses `.specify/templates/evaluation-rubric.json` and validates shape, unique IDs, and weight totals. |
| 5 | CI behavior | PASS | `.github/workflows/ci.yml` defines push and pull request verification with a matrix over the project validation commands. |

## Summary

Phase 6 UAT passed for fixture adoption, CI verification, and optional evaluation rubric coverage.
