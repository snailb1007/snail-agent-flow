---
phase: "06"
name: "expanded-examples-ci-matrix-and-optional-evaluation"
created: 2026-05-24
---

# Phase 6: expanded-examples-ci-matrix-and-optional-evaluation — Context

## Decisions

- **D-06-01: Greenfield and Brownfield Fixtures**: We will implement Greenfield (`.specify/fixtures/greenfield-project`) and Brownfield (`.specify/fixtures/brownfield-project`) directory structures. The Greenfield fixture represents an empty or uninitialized project, while the Brownfield fixture represents an existing codebase. Both will be utilized in automated CLI verification tests by overriding the `PROJECT_ROOT` environment variable.
- **D-06-02: CI Workflow Integration**: A GitHub Actions workflow will be defined at `.github/workflows/ci.yml`. It will trigger on all pushes and pull requests to validate the repository using `npm test`.
- **D-06-03: Optional Evaluation Rubric**: We will define a JSON-based LLM-as-judge evaluation template at `.specify/templates/evaluation-rubric.json` containing qualitative rubrics (spec completeness, plan risk, etc.). We will implement a deterministic validator script to ensure the rubric JSON structure is valid, keeping external Promptfoo execution optional.

## Discretion Areas

- The executor may choose the specific files and structure of the brownfield fixture project to mimic a realistic minimal Node.js application.
- The executor may adjust the CI workflow triggers (e.g. ignoring documentation-only changes) to optimize CI build times.

## Deferred Ideas

- Full automated Promptfoo run in CI (deferred to v2 due to external API dependency and cost constraints).
- Visual Playwright regression testing of the optional dashboard (deferred to v2 as no frontend dashboard runtime exists yet).
