# Phase 6: expanded-examples-ci-matrix-and-optional-evaluation — Challenge Notes

**Date:** 2026-05-24
**Phase:** 6-expanded-examples-ci-matrix-and-optional-evaluation

## 1. Terminology & Alignment Challenge

- **Glossary Check:** Ensure "Greenfield" and "Brownfield" are defined clearly within the context of project adoption.
  - *Greenfield:* A newly created repository without existing source code or protocol configurations.
  - *Brownfield:* An existing application repository with source code, where the Snail Agent Flow protocol is being introduced.
- **Parity Check:** We must ensure the validation script parses `.specify/templates/evaluation-rubric.json` correctly and outputs warning metrics if promptfoo or LLM credentials are not available.

## 2. Feasibility & Failure Modes

- **Fixture Isolation Failure:**
  - *Risk:* CLI commands run on fixtures during tests could read/write config files in the parent repo (our main workspace), leading to false positives or corrupted host state.
  - *Mitigation:* Ensure all CLI integration tests strictly execute commands with `PROJECT_ROOT` and `REPO_ROOT` env variables set to the path of the fixture.
- **CI Dependency on NPM Install:**
  - *Risk:* Node modules may not be committed (which is standard), and if CI tries to run `npm install` with zero dependencies in `package.json`, it might succeed but waste time.
  - *Mitigation:* The CI pipeline should directly run `npm test` since the codebase is dependency-free. Node's built-in modules are sufficient.
- **Flaky LLM-as-judge in CI:**
  - *Risk:* Running actual LLM prompts for spec quality verification is slow, flaky, and requires API key configuration which is not present in public/private fork workflows.
  - *Mitigation:* The CI matrix runs deterministic validators only. Qualitative Promptfoo checks are run locally or via manual triggering, and their structural template validation in CI is fully mock-driven.

## 3. Command Boundaries & Overlap

- **Fixture Tests vs Pipeline Simulation:**
  - *Overlap:* We already have `.specify/scripts/bash/simulate-phase2-pipeline.sh`.
  - *Clarity:* The pipeline simulation is a procedural bash script showing stage-by-stage outcomes. The new fixture projects should be verified using both our CLI validator command (`adp validate-spec` / `npm run validate`) and CLI doctor checks (`adp doctor`) to prove standard CLI usability.

## Conclusion
The decisions captured in `06-CONTEXT.md` are robust and feasible. We will proceed to Stage 3: Canonical Spec.
