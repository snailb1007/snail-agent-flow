# Phase 6: expanded-examples-ci-matrix-and-optional-evaluation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 06-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 6-expanded-examples-ci-matrix-and-optional-evaluation
**Areas discussed:** Greenfield & Brownfield Fixture Design, CI Workflow Integration, Optional Evaluation Rubric

---

## Greenfield & Brownfield Fixture Design

### Question 1: Greenfield Project Fixture
| Option | Description | Selected |
|--------|-------------|----------|
| Empty project structure | Minimal directory with only `package.json` to verify initialization from clean state. | ✓ |
| Pre-populated scaffold | Pre-populate folders with some dummy files. | |

**Recommended choice:** Empty project structure
**Selected:** Empty project structure
**Notes:** Testing initialization on a blank project ensures the protocol's setup command works as intended on fresh checkouts.

### Question 2: Brownfield Project Fixture
| Option | Description | Selected |
|--------|-------------|----------|
| Existing application codebase | Pre-populate directory with standard application files (`src/index.js`, `README.md`) but no protocol files to verify safe adoption. | ✓ |
| Duplicate of greenfield | Copy the same greenfield test structure. | |

**Recommended choice:** Existing application codebase
**Selected:** Existing application codebase
**Notes:** A brownfield fixture verifies that running the CLI initialization does not overwrite or interfere with existing application code or configuration.

---

## CI Workflow Integration

### Question 1: CI Platform Choice
| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions | Define a native GitHub Actions workflow file `.github/workflows/ci.yml`. | ✓ |
| External CLI or hook-based check only | Rely entirely on local git pre-commit/pre-push hooks. | |

**Recommended choice:** GitHub Actions
**Selected:** GitHub Actions
**Notes:** Native GitHub Actions integrates seamlessly with our Git workflow, running automated tests on every push and pull request.

---

## Optional Evaluation Rubric

### Question 1: Promptfoo Evaluation Approach
| Option | Description | Selected |
|--------|-------------|----------|
| Real LLM-as-judge runs in CI | Run live Promptfoo evals with OpenAI/Gemini API calls during CI runs. | |
| Structural Rubric Validation | Define a standard rubric template and validate its structure deterministically. | ✓ |

**Recommended choice:** Structural Rubric Validation
**Selected:** Structural Rubric Validation
**Notes:** Real LLM-based evals run in CI require API keys, are costly, and are non-deterministic. A structural template check is fast, free, and completely deterministic, keeping LLM calls as an optional manual step.
