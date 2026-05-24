# Feature Specification: Phase 1: Artifact Contract, Status, and Minimal Golden Path

**Feature Branch**: `001-artifact-contract-status`

**Created**: 2026-05-24

**Status**: Draft

**Input**: User description: "Phase 1: Artifact Contract, Status, and Minimal Golden Path"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define Artifact Contract & Path Ownership Registry (Priority: P1)

As an AI agent or human developer, I want a single canonical registry defining the directory/file location rules and ownership model for all artifacts (such as `.ai/`, `.specify/`, spec-kit commands, local skills, etc.) so that all session tools and manual steps agree on where files live and who owns them.

**Why this priority**: High priority because without a clear path mapping and ownership registry, different runtimes (Claude, Gemini, GSD) will write conflicting/duplicated files, causing context fragmentation and drift.

**Independent Test**: Verify that a documented registry exists under `.ai/` and `.specify/` where each path (authoritative specs, generated files, runtime configuration, session notes) has a defined owner (e.g. "Spec-Kit", "GSD", "GStack QA") and class.

**Acceptance Scenarios**:

1. **Given** a clean repo with the ADP protocol, **When** listing active files, **Then** all files fit into the canonical `.ai/` and `.specify/` contracts with no duplicated or competing spec directories.
2. **Given** the path ownership registry, **When** any tool attempts to resolve the spec file, **Then** it references `specs/<feature-slug>/spec.md` instead of legacy paths like `.ai/specs/current/spec.md`.

---

### User Story 2 - Label Current Artifacts by Implementation Status (Priority: P1)

As a developer, I want to clearly label the implementation status (e.g. "Implemented", "Specified", "Placeholder", "Generated Scaffold", or "Deferred") of every artifact inside the repository so that the system behavior/docs don't claim compliance for things that are not yet built.

**Why this priority**: High priority to prevent documentation drift and false trust in placeholder files.

**Independent Test**: Check all files in the repository and verify they have a matching status label, making it explicit what is active/implemented versus a placeholder.

**Acceptance Scenarios**:

1. **Given** placeholder files like `.ai/specs/plan.md` or `.ai/memory/*`, **When** auditing implementation status, **Then** these are labeled as placeholders or reconciled/deleted, preventing drift.
2. **Given** active runtime configurations and scripts, **When** checking their status, **Then** they are labeled as implemented and match the documentation.

---

### User Story 3 - Run a Minimal Golden Path End-to-End Smoke Test (Priority: P1)

As an orchestrator, I want a runnable minimal golden path script/fixture that simulates a feature request from beginning (recon, draft status) to end (blocking ship due to incomplete gates/memory) using the canonical paths to prove that the vertical slice works.

**Why this priority**: High priority to prove that path ownership and contracts are not just clean on paper but function under an actual simulated run.

**Independent Test**: Running a smoke test command (e.g. `bash scripts/smoke-test.sh` or similar) executes without error and simulates the pipeline steps.

**Acceptance Scenarios**:

1. **Given** a sample feature request, **When** running the golden path script, **Then** it establishes the correct spec feature directory under `specs/`, writes status `DRAFT`, enables validator checks, and successfully blocks ship at the gating step due to incomplete requirements or memory.

### Edge Cases

- **Path Drift Detection**: If a tool attempts to read a legacy spec path like `.ai/specs/current/spec.md`, the system must detect this path drift, report it, and guide the user/agent to `specs/<feature-slug>/spec.md`.
- **Non-Git Fallback**: If the git repository is not initialized or we are not on a feature branch, the minimal golden path must handle the non-git fallback gracefully (as supported by `common.sh`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define the canonical directory layout for `.specify/` (owning feature specs/plans/tasks) and `.ai/` (owning state, session notes, reviews, and durable project memory).
- **FR-002**: System MUST define a path ownership registry document mapping every path (e.g., `specs/<feature-slug>/spec.md`, `.ai/sessions/`, `.ai/memory/`) to its owner tool/role and lifecycle status.
- **FR-003**: System MUST label all existing repository files (including custom scripts, markdown docs, and templates) by their implementation status (Implemented, Specified, Placeholder, Generated Scaffold, or Deferred) to establish an unambiguous baseline.
- **FR-004**: System MUST establish the "current-spec" convention: the active feature's specs/plans/tasks are pinned via `.specify/feature.json` (or `.ai/state/active-feature.json` or both as decided by the plan), and downstream tools must read from that pinned directory.
- **FR-005**: System MUST include a `minimal-golden-path` smoke test script (e.g., `scripts/smoke-test.sh`) that simulates a feature request, verifies path routing, checks that it enters `DRAFT` status, validates that a mock validator can read the spec, and asserts that shipping is blocked if gates/memory are incomplete.

### Key Entities *(include if feature involves data)*

- **Feature Specification (Spec)**: The canonical requirement document under `specs/<feature-slug>/spec.md` defining the what/why of a feature.
- **Path Ownership Registry**: A markdown or JSON document that catalogs every path in the workspace, its owner, its status, and authority level.
- **Feature State (`.specify/feature.json`)**: Pins the active feature's directory path so downstream tools can resolve it.
- **Golden Path Smoke Test**: An executable script that simulates the lifecycle of a feature from specification to blocked-ship state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of major project artifact paths are documented with an owner and status in the path ownership registry.
- **SC-002**: Competing spec/state paths are reconciled: no active code/docs reference `.ai/specs/current/` or `.gemini/` for canonical specification work.
- **SC-003**: The `minimal-golden-path` smoke test runs and exits with code 0 (success) when simulating the correct flow, and correctly asserts a blocked status at the ship gate.
- **SC-004**: The smoke test executes in under 5 seconds locally.

## Assumptions

- The repository has git initialized, and the workspace contains `.gemini/.specify/` containing the Spec-Kit templates/scripts.
- We will use local files for storing feature state and registry information. No external databases or APIs are required.
- The smoke test can run in a standard Bash shell environment (compatible with Mac and Linux).
