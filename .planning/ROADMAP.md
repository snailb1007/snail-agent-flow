# Roadmap: Snail Agent Flow

**Defined:** 2026-05-24
**Granularity:** Coarse
**Planning mode:** YOLO

## Overview

This roadmap has two milestones. Milestone v1.0 (Phases 1-7) established the protocol, artifact contract, validators, CLI, and examples. Milestone v2.0 (Phases 8-13) packages the rough-project-flow ledger into a portable, init-able Gemini skill with declarative flow definitions and artifact gates.

---

## Milestone v1.0 — Protocol Foundation (Complete)

### Phase 1: Artifact Contract, Status, and Minimal Golden Path ✅

**Goal:** Establish one canonical artifact contract, path ownership model, and a runnable minimal golden path skeleton.

**Requirements covered:** ART-01, ART-02, ART-03, ART-04, VERIFY-01 (partial)

### Phase 2: Routing, Gates, and Memory Foundation ✅

**Goal:** Define how agents choose tools, when gates pass or fail, when human review is required, and what durable memory must contain.

**Requirements covered:** ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04, MEM-01, MEM-02, MEM-03, MEM-04

### Phase 3: Deterministic Validator, Drift Checks, and Human Review Packet ✅

**Goal:** Implement a deterministic validator and drift checker to prevent path and memory drift.

**Requirements covered:** VALID-01, VALID-02, VALID-03, VALID-04

### Phase 4: Templates and Runtime Adapter Alignment ✅

**Goal:** Align runtime-specific instructions and templates to the shared protocol contract.

**Requirements covered:** ADAPT-01, ADAPT-02, ADAPT-03, ADAPT-04

### Phase 5: CLI Packaging ✅

**Goal:** Add minimal local CLI commands to manage the accepted protocol.

**Requirements covered:** CLI-01, CLI-02, CLI-03, CLI-04

### Phase 6: Expanded Examples, CI Matrix, and Optional Evaluation ✅

**Goal:** Expand integration examples, run verification in CI, and add optional evaluation.

**Requirements covered:** VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04

### Phase 7: One-Flow CLI ✅

**Goal:** Package the agent-development protocol into a first-class CLI flow for feature scaffolding.

**Requirements covered:** CLI-01, CLI-02, CLI-03, CLI-04 (extended)

---

## Milestone v2.0 — Flow Engine

### Phase 8: Flow Definition Format and Built-in Flow

**Goal:** Define a declarative flow definition format and ship the built-in `rough-project-flow` as the first flow definition.

**Rationale:** The flow must be data-driven before it can be consumed by a skill engine. A YAML definition captures stage order, required skills, artifact gates, and revision routing as structured data instead of prose instructions.

**Delivers:**

- Flow definition schema (YAML) specifying: stages, stage names, required skills/commands, required artifacts per stage, gate conditions, revision routing rules, and prerequisite tool declarations.
- Built-in `rough-project-flow.yaml` encoding the 10-stage ledger: decision discovery → decision challenge → canonical spec → implementation plan → plan critique → revision loop → vertical slicing → execution → verification → release readiness.
- Schema documentation and a custom flow example showing how to add/remove/reorder stages.
- Prerequisite tool declaration and validation (GSD, Superpowers, Spec-Kit, GStack).

**Requirements covered:** FLOW-01, FLOW-02, FLOW-03, FLOW-04

**Success criteria:**

- The YAML schema can express the 10-stage flow with all artifact gates and revision routes.
- A custom flow definition can be validated against the schema.
- Prerequisite tool availability is checkable from the definition.

### Phase 9: Flow Initialization and Ledger State

**Goal:** Extend `adp init` to bootstrap flow infrastructure and create the ledger state file.

**Rationale:** Projects need a single `init` step to install the flow definition and create the tracking ledger. Brownfield support must not overwrite existing `.ai/` infrastructure.

**Delivers:**

- Updated `adp init` that copies the default flow definition into `.ai/flows/rough-project-flow.yaml`.
- Ledger state file at `.ai/state/flow-ledger.json` with fields: flow name, current stage, stage statuses (pending/in_progress/done/blocked/needs_revision), artifact paths per stage, timestamps, gate results, and revision history.
- Brownfield merge logic — detect existing `.ai/` structure and merge without overwrite.
- Generated Gemini skill SKILL.md stub that references the flow definition.

**Requirements covered:** INIT-01, INIT-02, INIT-03, INIT-04

**Success criteria:**

- `adp init` on a greenfield project creates `.ai/flows/` with the default flow and `.ai/state/flow-ledger.json` with all stages pending.
- `adp init` on a brownfield project with existing `.ai/` merges new files without destroying existing state.
- The generated SKILL.md is valid and can be read by agents.

### Phase 10: Flow Engine Skill

**Goal:** Package the flow orchestrator as a Gemini skill that agents mention in chat to start, resume, or inspect the flow.

**Rationale:** This is the core deliverable — a skill that reads the flow definition, reads ledger state, determines the next actionable stage, and instructs the agent which skill or command to invoke. It replaces the manual `rough-project-flow` prose orchestration with a data-driven engine.

**Delivers:**

- Gemini skill `flow-engine` (or `project-flow`) under `.agents/skills/` with SKILL.md.
- Stage resolution logic: read flow definition → read ledger → find first non-done stage → check prerequisites → emit instruction.
- Artifact gate checking after each stage: verify required artifacts exist and pass basic content checks (non-empty, required headings if specified).
- Ledger update after each stage: advance stage status, record artifact paths, timestamps, gate results.
- Revision loop support: when a downstream stage fails or detects errors, route back to the correct upstream stage, reset affected ledger entries, and log the revision reason.
- Stage instruction formatting: output the stage name, required skill/command, expected artifacts, and gate conditions in a structured format agents can follow.

**Requirements covered:** ENGINE-01, ENGINE-02, ENGINE-03, ENGINE-04

**Success criteria:**

- An agent mentioning the flow engine skill sees the current stage and knows exactly which skill to invoke next.
- After a stage completes and artifacts exist, the ledger advances automatically.
- Revision loops reset the correct upstream stages and preserve audit history.
- The skill works with the built-in `rough-project-flow.yaml` end-to-end.

### Phase 11: Artifact Gate Enforcement

**Goal:** Implement deterministic artifact gate checks as a reusable validation layer.

**Rationale:** Gates are the enforcement mechanism that prevents skipping stages. They must be deterministic (no LLM-as-judge) and must integrate with both the flow engine skill and the CLI validator.

**Delivers:**

- Gate checker module that validates: artifact existence, non-empty content, required headings (configurable per stage), and forbidden placeholders.
- Gate failure logging in the ledger with failure reason, attempt count, and timestamp.
- Circuit breaker: after 3 consecutive gate failures on the same stage, generate `NEEDS_HUMAN_REVIEW` packet and halt the flow.
- Integration with flow engine skill so gates are checked automatically after each stage instruction is followed.

**Requirements covered:** GATE-01, GATE-02, GATE-03, GATE-04

**Success criteria:**

- A stage with missing artifacts blocks advancement deterministically.
- Gate failures are logged with actionable reasons.
- Three failures trigger the human review circuit breaker.
- No gate check uses LLM evaluation — only file existence, content checks, and heading validation.

### Phase 12: Prerequisite Tool Checker and Installation Guide

**Goal:** Warn users or guide the installation of required tools if they are missing from the system to use agent skills.

**Rationale:** To successfully run agent skills (GSD, Superpowers, Spec-Kit, GStack, etc.), prerequisite command-line tools must be installed on the user's system. While auto-installation is out of scope, providing a checker that warns and gives guidance ensures users can resolve environment issues before starting execution.

**Delivers:**

- Standalone CLI/skill command to check prerequisite tool availability (e.g. `adp doctor` extension or `check-prerequisites` function).
- Structured error warnings indicating which tools are missing and their purpose.
- Platform-specific installation instructions (macOS brew/npm directions) to guide the user in setting up missing tools.
- Integration into the `flow-engine` startup sequence to check tool prerequisites before advancing stages.

**Requirements covered:** WARN-01, WARN-02, WARN-03, WARN-04

**Success criteria:**

- Running the tool checker correctly reports status (installed / missing) for each required tool.
- Missing tools trigger helpful, platform-specific installation instructions (macOS brew/npm directions).
- Flow engine halts and warns the user if they try to execute a stage requiring missing tools.

### Phase 13: Flow Validator and Tests

**Goal:** Add a deterministic flow validator and comprehensive test suite.

**Rationale:** The flow definition, ledger state, and gate logic all need validation to prevent corruption and catch configuration errors early.

**Delivers:**

- Flow validator command (`npm run validate:flow` or integrated into `adp doctor`) that checks: flow definition syntax, ledger state consistency, stage reference validity, artifact path validity, and impossible state transitions.
- Corruption detection: invalid stage names, circular revision routes, orphaned artifact references, ledger entries referencing undefined stages.
- Skill name validation: verify that flow definitions reference known skill names or commands available in the environment.
- Test suite covering: happy path flow, gate failures, revision loops, corruption detection, brownfield init, custom flow definitions.

**Requirements covered:** FVALID-01, FVALID-02, FVALID-03, FVALID-04

**Success criteria:**

- `npm run validate:flow` catches definition syntax errors, ledger corruption, and invalid references.
- Tests cover the critical paths: normal completion, revision routing, gate blocking, circuit breaker, and brownfield merge.
- CI can run flow validation alongside existing spec validation.

---

## Requirement Coverage

| Phase | Requirements |
|-------|--------------|
| Phase 1 (v1) | ART-01, ART-02, ART-03, ART-04, VERIFY-01 (partial) |
| Phase 2 (v1) | ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04, MEM-01, MEM-02, MEM-03, MEM-04 |
| Phase 3 (v1) | VALID-01, VALID-02, VALID-03, VALID-04 |
| Phase 4 (v1) | ADAPT-01, ADAPT-02, ADAPT-03, ADAPT-04 |
| Phase 5 (v1) | CLI-01, CLI-02, CLI-03, CLI-04 |
| Phase 6 (v1) | VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04 |
| Phase 7 (v1) | CLI-01, CLI-02, CLI-03, CLI-04 (extended) |
| Phase 8 (v2) | FLOW-01, FLOW-02, FLOW-03, FLOW-04 |
| Phase 9 (v2) | INIT-01, INIT-02, INIT-03, INIT-04 |
| Phase 10 (v2) | ENGINE-01, ENGINE-02, ENGINE-03, ENGINE-04 |
| Phase 11 (v2) | GATE-01, GATE-02, GATE-03, GATE-04 |
| Phase 12 (v2) | WARN-01, WARN-02, WARN-03, WARN-04 |
| Phase 13 (v2) | FVALID-01, FVALID-02, FVALID-03, FVALID-04 |

**Coverage:**
- v1 requirements: 28 total, 28 completed
- v2 requirements: 24 total, 0 completed
- Unmapped: 0

## Research Flags

- Keep the first implementation docs/templates-first. Do not add a CLI before Phase 1 and Phase 2 are stable.
- Prefer deterministic validators before Promptfoo or LLM-as-judge evaluation.
- Do not add Playwright until there is a browser target.
- Do not add database or hosted state until local file-based state proves insufficient.
- Treat generated scaffolds as compatibility layers, not source-of-truth policy.
- Flow definitions are data, not code — they describe stage order and artifact gates, not execution logic.
- The flow engine skill instructs agents; it does not spawn subprocesses or invoke tools directly.

### Phase 14: Improve AI for spawn subagent support

**Goal:** Enable the AI agent client to successfully parse GSD workflows without permission denied sandbox errors, and instruct it to spawn subagents for parallel task execution.
**Requirements:** SUB-01, SUB-02, SUB-03, SUB-04
**Depends on:** Phase 13
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 14 to break down)

---
*Roadmap defined: 2026-05-24*
*Last updated: 2026-05-26 — Phase 14 subagent support added*
