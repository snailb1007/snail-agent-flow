# Memory Handoff Report

- **Feature:** 006-expanded-examples-ci-matrix-and-optional-evaluation
- **Date:** 2026-05-24

## Promoted to project memory
- **Greenfield and Brownfield Project Integration Standards:** Establishing protocols for bootstrapping new projects (greenfield) versus adopting Snail Agent Flow in existing repositories (brownfield) without destroying existing application files.
- **Qualitative Evaluation Schema:** Defining structured templates for qualitative reviews (e.g., using LLM-as-judge rubrics) with unique criterion IDs, weight range bounds [0, 1], and a requirement that all weights sum to exactly 1.0.
- **CI Verification Matrix:** Requiring a matrix verification strategy in continuous integration workflows that tests spec validation, validator unit tests, pipeline simulations, CLI integration tests, and full verification.

## Architecture updated
- **Fixtures:**
  - Added `.specify/fixtures/greenfield-project/package.json` for empty project bootstrap testing.
  - Added `.specify/fixtures/brownfield-project/` containing `package.json`, `README.md`, and `src/index.js` to simulate pre-existing project codebases.
- **CI Workflows:**
  - Added `.github/workflows/ci.yml` defining the GitHub Actions pipeline with a matrix to execute verification commands on push and pull request events.
- **Templates:**
  - Added `.specify/templates/evaluation-rubric.json` containing the schema-compliant qualitative evaluation criteria.
- **Tests:**
  - Updated `validators/scripts/test-cli.js` with new test suites: "Greenfield Project Fixture Integration", "Brownfield Project Fixture Integration", "Evaluation Rubric Schema Conformance", and "CI Workflow Matrix Structure".

## Verification promoted
- **Automated CLI Tests (`npm run test:cli`):**
  - Greenfield sandbox test verifies CLI initialization and spec doctor gates pass.
  - Brownfield sandbox test verifies initialization is non-destructive (pre-existing `README.md` and `src/index.js` content is preserved).
  - Evaluation rubric validation ensures the template matches the rubric schema (unique IDs, weights sum to 1.0).
  - CI workflow structure check verifies `.github/workflows/ci.yml` has correct triggers and run steps.
- **CI Pipeline:**
  - Configured GitHub Actions to execute `npm run validate`, `npm run test:validator`, `npm run test:pipeline`, `npm run test:cli`, and `npm test` automatically on Ubuntu runners with Node.js v20.
