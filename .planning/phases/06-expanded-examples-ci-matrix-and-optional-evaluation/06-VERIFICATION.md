---
phase: "06"
name: "expanded-examples-ci-matrix-and-optional-evaluation"
created: 2026-05-24
status: complete
---

# Phase 6: expanded-examples-ci-matrix-and-optional-evaluation — Verification

## Goal-Backward Verification

**Phase Goal:** Expand integration examples, run verification in CI, and add optional evaluation.

## Checks

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 1 | Greenfield fixture supports protocol initialization and validation | PASS | `.specify/fixtures/greenfield-project/package.json`; `validators/scripts/test-cli.js` runs `init` and `doctor` in an isolated sandbox. |
| 2 | Brownfield fixture preserves existing project files during adoption | PASS | `.specify/fixtures/brownfield-project/README.md`, `package.json`, and `src/index.js`; CLI test verifies README/source content survives `init`. |
| 3 | Brownfield fixture supports validation after adoption | PASS | `validators/scripts/test-cli.js` creates active brownfield spec files and runs `doctor` successfully. |
| 4 | CI verifies the project on pushes and pull requests | PASS | `.github/workflows/ci.yml` runs a GitHub Actions matrix for validation, validator tests, pipeline simulation, CLI integration tests, and full `npm test` on Node.js 20. |
| 5 | Optional evaluation rubric exists and is structurally validated | PASS | `.specify/templates/evaluation-rubric.json`; CLI test checks required fields, criterion uniqueness, weight bounds, and total weight. |
| 6 | Full local verification suite passes | PASS | `npm test` passed on 2026-05-24: spec validation, 15 validator checks, phase 2 pipeline simulation, and CLI checks. |

## Result

Phase 6 is verified and ready for ship.
