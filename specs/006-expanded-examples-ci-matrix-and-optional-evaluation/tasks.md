# Tasks: Expanded Examples, CI Matrix, and Optional Evaluation

**Input**: Design documents from `/specs/006-expanded-examples-ci-matrix-and-optional-evaluation/`

**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup

**Purpose**: Update active feature pointer to target Phase 6 spec directory.

- [x] T001 Update `.specify/feature.json` to point to `specs/006-expanded-examples-ci-matrix-and-optional-evaluation/`.

---

## Phase 2: Greenfield & Brownfield Fixtures (User Story 1 & 2)

**Goal**: Implement greenfield and brownfield directories for test verification.

- [x] T002 Create greenfield project directory structure and mock `package.json` under `.specify/fixtures/greenfield-project/`.
- [x] T003 Create brownfield project directory structure, mock application code `src/index.js`, `package.json`, and `README.md` under `.specify/fixtures/brownfield-project/`.

---

## Phase 3: CLI Integration Tests (User Story 1 & 2)

**Goal**: Integrate fixture test assertions in the CLI test runner.

- [x] T004 Implement assertions in `validators/scripts/test-cli.js` verifying `adp init` and `adp doctor` commands run correctly against the greenfield fixture.
- [x] T005 Implement assertions in `validators/scripts/test-cli.js` verifying `adp init` runs non-destructively against the brownfield fixture, leaving existing application files untouched.

---

## Phase 4: CI Configuration (User Story 3)

**Goal**: Configure GitHub Actions to automate pipeline test runs.

- [x] T006 Create `.github/workflows/ci.yml` defining the push and pull request verification pipeline.

---

## Phase 5: Optional Evaluation Rubric (User Story 4)

**Goal**: Create LLM-as-judge rubric template and structural test check.

- [x] T007 Create evaluation template `.specify/templates/evaluation-rubric.json` containing qualitative criteria.
- [x] T008 Implement test assertions in `validators/scripts/test-cli.js` validating the schema of `.specify/templates/evaluation-rubric.json`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Update project state, record verification command, and verify all tests pass.

- [x] T009 Update current phase and status in `.planning/STATE.md`.
- [x] T010 Run `npm test` and verify that all test suites pass.
- [x] T011 Record the verification commands and output in `.ai/memory/verification-history.md`.
