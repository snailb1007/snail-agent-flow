# Tasks: Phase 1: Artifact Contract, Status, and Minimal Golden Path

**Input**: Design documents from `specs/001-artifact-contract-status/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Move Spec-Kit files to the unified root `.specify/`

- [ ] T001 Create directory structure for `.specify/` and its subdirectories
- [ ] T002 Move Spec-Kit configurations, templates, and scripts from `.gemini/.specify/` to `.specify/`
- [ ] T003 Update script import paths in `.specify/scripts/bash/check-prerequisites.sh` to point to `.specify/scripts/bash/common.sh`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update command paths and references to use the new `.specify/` location

- [ ] T004 Update path references in all `.gemini/commands/` TOML files from `.gemini/.specify/` to `.specify/`
- [ ] T005 Update path references in `.planning/codebase/` documentation to point to `.specify/` instead of `.gemini/.specify/`

---

## Phase 3: User Story 1 - Define Artifact Contract & Path Ownership Registry (Priority: P1)

**Goal**: Create a canonical path ownership registry for all workspace paths

**Independent Test**: Verify that `docs/artifact-registry.md` exists and contains a complete matrix of all files/directories and their owners

- [ ] T006 [P] [US1] Create the registry document `docs/artifact-registry.md` defining ownership categories (Authoritative, Generated, Runtime-Specific, Local-Only)
- [ ] T007 [US1] Deprecate and delete the legacy spec folder `.ai/specs/` and update references in `.ai/constitution.md` to point to `.specify/specs/`

---

## Phase 4: User Story 2 - Label Current Artifacts by Implementation Status (Priority: P1)

**Goal**: Document the implementation status of all workspace files

**Independent Test**: Verify that the registry table contains a status column mapping each path to its implementation status

- [ ] T008 [P] [US2] Update `docs/artifact-registry.md` status table to assign status labels (implemented, specified, placeholder, generated-scaffold, deferred) for all files
- [ ] T009 [US2] Add status headers to scripts in `.specify/scripts/bash/` indicating they are implemented

---

## Phase 5: User Story 3 - Run a Minimal Golden Path End-to-End Smoke Test (Priority: P1)

**Goal**: Create an executable smoke test that simulates feature state transitions and verifies gates

**Independent Test**: Running `bash .specify/scripts/bash/smoke-test.sh` exits with code 0

- [ ] T010 [P] [US3] Create feature state JSON initialization support at `.ai/state/active-feature.json`
- [ ] T011 [US3] Update `.specify/scripts/bash/common.sh` functions to read feature directory from `.ai/state/active-feature.json` with env var override support
- [ ] T012 [P] [US3] Create mock feature fixture specifications in `.specify/fixtures/minimal-golden-path/`
- [ ] T013 [US3] Create the validator script `.specify/scripts/bash/validate-gate.sh` that exits with code 1 if gates/memory are incomplete
- [ ] T014 [US3] Create the executable simulation script `.specify/scripts/bash/smoke-test.sh` that sets up mock files, runs validation, and asserts exit code behavior

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, validation, and project verification

- [ ] T015 Run the smoke-test simulation script `.specify/scripts/bash/smoke-test.sh` to verify behavior
- [ ] T016 Delete redundant files and directories under `.gemini/.specify/`
- [ ] T017 Update project status in `.planning/STATE.md` to reflect Phase 1 progress

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all user stories being complete
