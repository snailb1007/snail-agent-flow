# Tasks: CLI Packaging

**Input**: Design documents from `/specs/005-cli-packaging/`

**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup

**Purpose**: Project configuration updates.

- [x] T001 Register commands `adp` and `saf` in `package.json` pointing to `bin/adp.js` and add CLI script to `test:cli`.

---

## Phase 2: Foundational

**Purpose**: Core files setup.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Create shell entry file `bin/adp.js` with `#!/usr/bin/env node` and simple argv router.
- [x] T003 Setup initial test file `validators/scripts/test-cli.js` with helpers to run CLI in a sandbox.

---

## Phase 3: User Story 1 - Project Initialization (init) 🎯 MVP

**Goal**: Initialize all protocol folders and copy missing config files without overwriting.

- [x] T004 [P] Write CLI test for `init` behavior in `validators/scripts/test-cli.js`.
- [x] T005 Implement `init` command in `bin/adp.js` (directory structure creation, safe template copy, skipping existings).

---

## Phase 4: User Story 2 - Workspace Sanity Check (doctor)

**Goal**: Structure inspections, drift/template presence verification, and validator execution.

- [x] T006 [P] Write CLI test for `doctor` behavior in `validators/scripts/test-cli.js`.
- [x] T007 Implement `doctor` command in `bin/adp.js` (static checks of folders/files, spawning validate-spec, health logging).

---

## Phase 5: User Story 3 - Pipeline Status (status)

**Goal**: Display active feature info and run state.

- [x] T008 [P] Write CLI test for `status` behavior in `validators/scripts/test-cli.js`.
- [x] T009 Implement `status` command in `bin/adp.js` (read feature.json and run-state.json, format console output).

---

## Phase 6: User Story 4 - Session Management & Handoff Gate (new-session & handoff)

**Goal**: Log new sessions and check memory handoff status.

- [x] T010 [P] Write CLI test for `new-session` and `handoff` in `validators/scripts/test-cli.js`.
- [x] T011 Implement `new-session` command in `bin/adp.js` (create YYYY-MM-DD log file from template).
- [x] T012 Implement `handoff` command in `bin/adp.js` (parse and validate `handoff.md` sections).

---

## Phase 7: User Story 5 - Subprocess Validator (validate-spec)

**Goal**: Direct wrapper to execute spec validator subprocess.

- [x] T013 [P] Write CLI test for `validate-spec` in `validators/scripts/test-cli.js`.
- [x] T014 Implement `validate-spec` command in `bin/adp.js` (spawn validate-spec.js subprocess and forward outcome).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: final repository updates and clean test verify.

- [x] T015 [P] Update active phase to Phase 5 in `.planning/STATE.md`.
- [x] T016 Verify `npm test` runs validator tests, pipeline simulation, and CLI tests successfully.

---

## Dependencies & Execution Order

- **Setup (Phase 1) & Foundational (Phase 2)**: Must complete first.
- **User Stories (Phase 3 to 7)**: Can proceed in sequence, writing tests first.
- **Polish (Phase 8)**: Runs after all tasks are completed.
