# Feature Specification: Expanded Examples, CI Matrix, and Optional Evaluation

**Feature Branch**: `006-expanded-examples-ci-matrix-and-optional-evaluation`

**Created**: 2026-05-24

**Status**: Draft

**Input**: User description: "Expand integration examples, run verification in CI, and add optional evaluation. Deliver greenfield and brownfield fixture projects, CI matrix checking validator/path/templates/parity, and optional promptfoo/LLM evaluation rubrics."

## Goal

To expand the test suite with greenfield and brownfield fixture projects, establish a continuous integration (CI) workflow using GitHub Actions, record verification logs in project memory, and introduce qualitative evaluation templates and validator checks.

## User Scenarios & Testing

### User Story 1 - Greenfield Integration Test (Priority: P1)

Developers and automated tests want to verify the protocol setup and validation process on a clean, empty repository (greenfield project).

**Why this priority**: Core integration check showing the protocol can bootstrap a new project from scratch.

**Independent Test**: Can be run by initializing a mock empty directory using the CLI and validating that all protocol folders, template configurations, and active spec validator checks succeed.

**Acceptance Scenarios**:
1. **Given** an empty project directory with a minimal `package.json`, **When** running `node bin/adp.js init` targeting the project root, **Then** all directories and template files are initialized correctly.
2. **Given** the initialized greenfield directory, **When** configuring an active feature and running `node bin/adp.js doctor`, **Then** the validator gate successfully passes.

---

### User Story 2 - Brownfield Integration Test (Priority: P1)

Developers want to ensure that adopting the protocol in an existing, mature repository (brownfield project) does not alter or destroy existing code files, and that the doctor/validation commands work correctly.

**Why this priority**: Essential to guarantee the protocol is non-destructive and safely adopts existing codebases.

**Independent Test**: Can be run by populating a mock directory with dummy application files and running CLI commands to ensure existing files remain untouched.

**Acceptance Scenarios**:
1. **Given** a directory containing existing source files (`src/index.js`, `README.md`), **When** running `node bin/adp.js init` targeting that directory, **Then** the protocol directories are added, and existing source files are left unmodified.

---

### User Story 3 - Continuous Integration Workflow (Priority: P1)

Maintainers want all changes to pull requests and main branches to be automatically tested in CI to prevent regression.

**Why this priority**: Crucial for codebase stability and automated regression checking.

**Independent Test**: Triggered by git commits, running the validation test suite in a GitHub Actions environment.

**Acceptance Scenarios**:
1. **Given** a push or pull request to the repository, **When** GitHub Actions executes, **Then** the CI workflow checks out the code, sets up Node.js v20, and runs `npm test` successfully.

---

### User Story 4 - Optional Qualitative Evaluation (Priority: P2)

Teams wanting to enforce qualitative reviews (e.g., using LLM-as-judge) need a structured template defining the rubrics and a command to validate the rubric schema structure.

**Why this priority**: Prepares the project for qualitative evaluation gates without adding runtime LLM dependency bloat.

**Independent Test**: Validate the structure of the evaluation rubric template using a JSON schema validator or equivalent script.

**Acceptance Scenarios**:
1. **Given** the rubric template at `.specify/templates/evaluation-rubric.json`, **When** running the evaluation schema check, **Then** the validator confirms the JSON matches the schema.

---

### Edge Cases

- **Environment Leakage**: Running CLI commands on fixture directories must not write files or modify the state of the host repository. We must isolate all CLI executions using the `PROJECT_ROOT` and `REPO_ROOT` environment variables.
- **CI failures**: If any validation check or test fails in CI, the workflow must exit with a non-zero status and fail the build.

## Non-Goals

- Running live LLM queries or calling OpenAI/Gemini APIs in CI (deferred to prevent costs and flakiness).
- Playwright-based browser UI tests (no UI dashboard exists yet).
- Adding third-party NPM runtime dependencies.

## Acceptance Criteria

- **AC-1**: Create a greenfield project fixture in `.specify/fixtures/greenfield-project/` containing a basic `package.json`.
- **AC-2**: Create a brownfield project fixture in `.specify/fixtures/brownfield-project/` containing `src/index.js`, `package.json`, and `README.md`.
- **AC-3**: Update the CLI tests in `validators/scripts/test-cli.js` (or add a separate test script) to execute commands against the greenfield and brownfield fixture paths using isolated environment variables.
- **AC-4**: Create a GitHub Actions workflow file `.github/workflows/ci.yml` that runs on push and pull_request, executes `npm test`, and fails on any errors.
- **AC-5**: Create a rubric template `.specify/templates/evaluation-rubric.json` containing qualitative criteria for LLM reviews.
- **AC-6**: Add a deterministic script or test step verifying the structural validity of the rubric template.

## Test Strategy

- Run `npm test` to execute the full validation and test suite.
- The test suite must verify both greenfield and brownfield CLI initialization and run states.
- The test suite must check the schema of the evaluation rubric template.

## Behavior-Preservation Rules

- Existing CLI commands, options, and behaviors must be preserved.
- No third-party NPM runtime dependencies may be added.
- Existing file boundaries and ownership rules must be respected.
