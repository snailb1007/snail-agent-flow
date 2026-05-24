# One-Flow CLI

## Goal

Package the current agent-development protocol into a first-class CLI flow so a user can start a feature from one command instead of manually creating `spec.md`, `plan.md`, `tasks.md`, and the active feature pointer.

The milestone should make the project usable as a product-level workflow for greenfield and running repositories while preserving the existing Spec-Kit artifact contract.

## Non-Goals

- Execute application code changes automatically.
- Replace agent skills such as `speckit-plan`, `speckit-tasks`, GSD execution, QA, or Ship.
- Call external AI services from the CLI.
- Change the canonical ownership of `specs/<feature-slug>/` or `.ai/`.
- Add package publishing or release automation beyond the local CLI behavior.

## Acceptance Criteria

1. Given a repository initialized with `adp init`, when the user runs `adp feature "Add user login"`, then the CLI creates one new `specs/<feature-slug>/` directory containing `spec.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md`.
2. Given the same command, the CLI updates `.specify/feature.json` to point at the new feature directory.
3. Given generated artifacts, when the user runs `adp validate-spec`, then deterministic validation passes without manual edits.
4. Given an existing repository with prior features, the generated feature slug uses the next numeric prefix and a readable short name derived from the feature request.
5. Given a running project with existing protocol files, the command does not overwrite unrelated files or existing feature directories.
6. Given a user wants a single entry point, `adp run "Feature request"` performs initialization if needed, creates the feature artifacts, validates them, and prints the next recommended step.
7. Given missing input, invalid input, or a duplicate target feature directory, the CLI exits non-zero with an actionable error.

## Test Strategy

- Add CLI integration tests for `feature` on an initialized greenfield sandbox.
- Add CLI integration tests for `run` on an empty sandbox.
- Add assertions that `.specify/feature.json`, `spec.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md` are created.
- Add assertions that generated artifacts pass `validate-spec`.
- Run `npm run validate`, `npm run test:cli`, and the full `npm test` suite.

## Behavior-Preservation Rules

- Existing commands keep their current behavior and output contract unless explicitly extended in help text.
- `init` remains idempotent and must not overwrite existing project instructions.
- The deterministic validator remains the pre-implementation gate.
- `.ai/` remains orchestration state and must not become a competing source of truth for feature requirements.
- Generated specs must be intentionally conservative and must not claim implementation is complete.

## User Scenarios

### Scenario 1: Start Feature In New Repository

A user enters a new repository, runs `adp run "Add project dashboard"`, and receives a complete validated feature scaffold plus the next command to use with an agent or implementation flow.

### Scenario 2: Start Feature In Existing Repository

A user with existing specs runs `adp feature "Improve checkout errors"` and receives `specs/NNN-improve-checkout-errors/` without disturbing previous feature directories.

### Scenario 3: Continue With Existing Protocol

After the feature scaffold is generated, the user can continue with current tools: agent-driven planning, task refinement, implementation, QA, memory handoff, and ship.

## Functional Requirements

- FR-001: The CLI must expose `feature <description>` to create validated feature artifacts.
- FR-002: The CLI must expose `run <description>` as the one-command greenfield entry point.
- FR-003: The CLI must derive a lowercase kebab-case short name from the feature description.
- FR-004: The CLI must select the next three-digit numeric feature prefix by scanning `specs/`.
- FR-005: The CLI must create `spec.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md` with validator-compatible content.
- FR-006: The CLI must update `.specify/feature.json` with the resolved feature directory.
- FR-007: The CLI must avoid overwriting an existing feature directory.
- FR-008: The CLI must validate generated artifacts during `run`.
- FR-009: The CLI must print concise next steps that distinguish scaffold completion from actual implementation completion.

## Key Entities

- Feature Request: The natural-language description supplied by the user.
- Feature Slug: The generated `NNN-short-name` directory name.
- Feature Directory: The canonical `specs/<feature-slug>/` artifact location.
- Feature Pointer: `.specify/feature.json`, which identifies the active feature directory.
- Generated Artifact Stack: `spec.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md`.

## Assumptions

- The one-flow CLI should scaffold a valid implementation-ready feature packet, not perform AI reasoning or code execution.
- Agent skills remain the preferred way to enrich the generated baseline artifacts before broad implementation.
- The project currently uses sequential numeric feature prefixes.
