# Feature Specification: CLI Packaging

**Feature Branch**: `005-cli-packaging`

**Created**: 2026-05-24

**Status**: Draft

**Input**: User description: "Add minimal local CLI commands to manage the Snail Agent Flow protocol: init, new-session, status, doctor, validate-spec, and handoff. Package CLI around the accepted artifact contract without inventing new paths/state, and add automated tests."

## Goal

To implement a zero-dependency, lightweight command-line interface (CLI) for Snail Agent Flow that automates the protocol operations (initialization, session setup, run-state visualization, environment sanity check, specification validation, and memory handoff checks).

## User Scenarios & Testing

### User Story 1 - Project Initialization (Priority: P1)

Developers adopting the protocol want to easily bootstrap their workspace directories and boilerplate configurations.

**Why this priority**: Crucial first step for developer onboarding and pipeline setup.

**Independent Test**: Can be run on an empty sandbox directory to verify that all required folders and initial templates are correctly generated.

**Acceptance Scenarios**:
1. **Given** an empty directory, **When** running `node bin/adp.js init`, **Then** the CLI successfully creates `.ai/sessions/`, `.ai/memory/`, `.ai/reviews/`, `.ai/state/`, `.specify/templates/`, and `specs/`, and populates `.ai/constitution.md`, `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md` using the templates.
2. **Given** a directory containing existing config files (like a custom `CLAUDE.md`), **When** running `node bin/adp.js init`, **Then** the CLI does not overwrite the existing `CLAUDE.md` file, instead printing a warning that it was skipped.

---

### User Story 2 - Checking Workspace Sanity (Priority: P1)

Developers want to check if their workspace has all required files, directories, configurations, and correct active feature spec files.

**Why this priority**: Essential to diagnose pipeline blockages and verify that agents have not caused directory drift.

**Independent Test**: Can be run to inspect the status of the workspace files and exit with an error code if required structures are missing.

**Acceptance Scenarios**:
1. **Given** a valid workspace setup, **When** running `node bin/adp.js doctor`, **Then** the CLI checks all static file structures, runs the spec validator subprocess, and reports that the workspace is healthy with exit code 0.
2. **Given** a workspace with a missing `spec.md` for the active feature, **When** running `node bin/adp.js doctor`, **Then** the CLI reports the missing files, runs the validator which fails, and exits with code 1.

---

### User Story 3 - Visualizing Pipeline Status (Priority: P2)

Developers and agents want to know what the active feature is, what gate is currently blocked, and what actions are needed to advance.

**Why this priority**: Crucial for developers and orchestration scripts to see where a feature stands in the pipeline.

**Independent Test**: Can be run to print the current active feature and run-state metadata.

**Acceptance Scenarios**:
1. **Given** an active feature and run-state file, **When** running `node bin/adp.js status`, **Then** the CLI reads `.specify/feature.json` and `.ai/state/run-state.json` and prints a structured console report showing active feature, current pipeline phase, gate status, and retry attempts.

---

### User Story 4 - Session Management and Memory Handoff Gate (Priority: P2)

Developers want a quick way to log new sessions and verify that durable memory updates are complete before shipping.

**Why this priority**: Enforces discipline around session capture and the memory handoff gate before final code integration.

**Independent Test**: Can be run to generate session logs and verify that the handoff report matches protocol section criteria.

**Acceptance Scenarios**:
1. **Given** a session name `auth-setup`, **When** running `node bin/adp.js new-session auth-setup`, **Then** a new file is created at `.ai/sessions/YYYY-MM-DD-auth-setup.md` with default markdown headings.
2. **Given** an active run-state, **When** running `node bin/adp.js handoff`, **Then** the CLI parses `.ai/state/handoff.md` and validates that all mandatory sections are present, exiting with code 0 if successful, or code 1 if missing sections.

---

### Edge Cases

- **Malformed JSON State**: If `.specify/feature.json` or `.ai/state/run-state.json` are malformed, the CLI must handle the parsing errors gracefully, printing descriptive errors and exiting with code 1.
- **Empty Arguments**: Running the CLI with no arguments or unknown commands must print the usage guide and exit with code 1.

## Non-Goals

- Implementing a web-based dashboard or GUI.
- Adding database support or remote state synchronization.
- Rewriting the validation logic from `validators/scripts/validate-spec.js` inside the CLI codebase.
- Adding third-party NPM runtime dependencies.

## Acceptance Criteria

- **AC-1**: Register `adp` and `saf` as CLI executable commands inside `package.json` pointing to `bin/adp.js`.
- **AC-2**: Implement commands: `init`, `new-session`, `status`, `doctor`, `validate-spec`, and `handoff` in `bin/adp.js` with zero runtime dependencies.
- **AC-3**: Spawning `validate-spec` or calling it via CLI must run `validators/scripts/validate-spec.js` in a subprocess, conveying stdout/stderr and exit codes.
- **AC-4**: Add a validation command for the memory handoff (`handoff`) that checks `.ai/state/handoff.md` sections programmatically.
- **AC-5**: Create a CLI-specific integration test suite `validators/scripts/test-cli.js` (or similar) that validates all CLI commands and exit codes.

## Test Strategy

- Run `node validators/scripts/test-cli.js` (or equivalent test runner command) to verify the behavior of all CLI commands on a mock directory.
- Verify `npm test` runs both validator tests and CLI tests.

## Behavior-Preservation Rules

- The CLI must respect and operate exclusively on the directory structure defined in `docs/artifact-registry.md`.
- No modifications to the behavior or path checking logic in `validators/scripts/validate-spec.js` should occur, except for exporting hooks or helpers if needed, but subprocess execution is preferred.
- All template formats under `.specify/templates/` must be preserved.
