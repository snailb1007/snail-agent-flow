# Implementation Plan: Expanded Examples, CI Matrix, and Optional Evaluation

**Branch**: `006-expanded-examples-ci-matrix-and-optional-evaluation` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)

## Summary

This plan integrates greenfield and brownfield fixture projects, establishes GitHub Actions CI validation, updates durable verification history, and implements qualitative evaluation rubric structural validation.

## Technical Context

- **Language/Version**: Node.js (ES6 / CommonJS)
- **Primary Dependencies**: None (Zero third-party runtime dependencies)
- **CI Platform**: GitHub Actions (Ubuntu runner, Node v20)
- **Storage**: JSON and Markdown files (`.specify/fixtures/`, `.specify/templates/`, `.github/workflows/`)

## Proposed Changes

### Fixture Projects

#### [NEW] [package.json](file:///Volumes/D/snail-agent-flow/.specify/fixtures/greenfield-project/package.json)
- Create a minimal package file to represent a fresh Node.js workspace.

#### [NEW] [package.json](file:///Volumes/D/snail-agent-flow/.specify/fixtures/brownfield-project/package.json)
- Create a package file for the brownfield app.

#### [NEW] [index.js](file:///Volumes/D/snail-agent-flow/.specify/fixtures/brownfield-project/src/index.js)
- Create a minimal application source file representing pre-existing user code.

#### [NEW] [README.md](file:///Volumes/D/snail-agent-flow/.specify/fixtures/brownfield-project/README.md)
- Create a simple README file representing pre-existing documentation.

### CI Configuration

#### [NEW] [ci.yml](file:///Volumes/D/snail-agent-flow/.github/workflows/ci.yml)
- Configure a GitHub Actions workflow that:
  - Runs on `push` and `pull_request` to all branches.
  - Installs Node.js v20.
  - Executes `npm test` (which triggers spec validation, validator unit tests, pipeline simulations, and CLI checks).

### Evaluation Rubrics & Verification

#### [NEW] [evaluation-rubric.json](file:///Volumes/D/snail-agent-flow/.specify/templates/evaluation-rubric.json)
- Define a JSON format template for qualitative LLM-as-judge rubrics.

#### [MODIFY] [test-cli.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-cli.js)
- Update CLI tests to:
  - Validate greenfield fixture initialization and status.
  - Validate brownfield fixture adoption and status, verifying that existing application files (`src/index.js`, `README.md`) are preserved.
  - Validate the structural conformance of `.specify/templates/evaluation-rubric.json`.

## Verification Plan

### Automated Tests

- Execute the entire validation suite to verify the changes:
  ```bash
  npm test
  ```

### Manual Verification

- Run the CLI tests directly:
  ```bash
  node validators/scripts/test-cli.js
  ```
- Run the validator scripts locally:
  ```bash
  node validators/scripts/test-validator.js
  ```
