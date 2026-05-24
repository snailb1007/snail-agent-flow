# Roadmap: Snail Agent Flow

**Defined:** 2026-05-24
**Granularity:** Coarse
**Planning mode:** YOLO

## Overview

This roadmap stabilizes the protocol before adding automation. The phase order is intentional: path ownership and artifact authority come first, operational routing and durable memory second, executable validation third, runtime adapter alignment fourth, CLI packaging fifth, and examples/CI last.

## Phase 1: Artifact Contract and Status

**Goal:** Establish one canonical artifact contract and path ownership model for the repository.

**Rationale:** Validators, templates, adapters, and future CLI commands all depend on stable paths and source-of-truth ownership. Without this phase, later automation will encode drift.

**Delivers:**

- Canonical artifact contract for `.ai/`, `.planning/`, runtime instruction files, Spec-Kit/Gemini scaffolds, and future feature directories.
- Path ownership registry for authoritative, generated, runtime-specific, and local-only artifacts.
- Implementation-status labels for current artifacts.
- Current-spec convention for active spec, plan, tasks, validation, and state files.

**Requirements covered:** ART-01, ART-02, ART-03, ART-04

**Success criteria:**

- Every major project artifact path has a documented owner and status.
- Competing paths for specs/state are either reconciled or explicitly classified.
- Future phases can reference a single source-of-truth document for artifact locations.

## Phase 2: Routing, Gates, and Memory Foundation

**Goal:** Define how agents choose tools, when gates pass or fail, when human review is required, and what durable memory must contain.

**Rationale:** Agents need operational routing and stop conditions before broad execution or automation. Empty memory and vague gate semantics are current risks.

**Delivers:**

- Tool routing matrix for task type, input artifacts, output artifacts, validators, and stop conditions.
- Gate outcome definitions for recon, critique, spec generation, validation, execution, QA, memory handoff, and ship.
- Failure taxonomy, retry limits, and `NEEDS_HUMAN_REVIEW` transition rules.
- Human review packet template.
- Seeded `.ai/memory/` project summary, architecture, decisions, risks, and verification history.
- `.ai/state/` shape for validation status, retry counts, active session, and current feature/spec pointers.

**Requirements covered:** ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04, MEM-01, MEM-02, MEM-03, MEM-04

**Success criteria:**

- A new agent can inspect local artifacts and determine the next correct workflow step.
- Retry limits and human-review behavior are documented in state terms.
- Durable memory files contain current facts rather than placeholders.

## Phase 3: Deterministic Validator and Drift Checks

**Goal:** Make the protocol mechanically checkable before adding product automation.

**Rationale:** The current validation gate is specified but not executable. A small deterministic validator should fail on missing files, placeholder memory, stale paths, schema/heading gaps, and docs/runtime mismatch.

**Delivers:**

- Deterministic artifact existence and path consistency checks.
- Required heading/field checks for specs, plans, tasks, validation reports, review packets, and memory files.
- Retry-count and `NEEDS_HUMAN_REVIEW` transition validation.
- Docs/runtime parity checks that prevent documentation from claiming nonexistent enforcement.
- Verification command documented in project memory.

**Requirements covered:** VALID-01, VALID-02, VALID-03, VALID-04

**Success criteria:**

- A local command or script can fail the repo when required protocol artifacts drift.
- Validation results can be written to the accepted validation-report path.
- The gate is no longer only aspirational.

## Phase 4: Templates and Runtime Adapter Alignment

**Goal:** Align runtime-specific instructions and generated scaffolds to the shared protocol.

**Rationale:** Claude, Gemini, Codex/GSD, local skills, and Spec-Kit scaffolds should be adapters over the same contract, not competing policy sources.

**Delivers:**

- Aligned `CLAUDE.md`, `GEMINI.md`, future `AGENTS.md`, `.agents/skills/`, and `.ai/constitution.md`.
- Runtime-neutral greenfield and brownfield templates.
- Adapter boundary documentation for Claude, Gemini, Codex/GSD, and future runtimes.
- Spec-Kit/Gemini scaffold compatibility classification and narrow adapter rules.

**Requirements covered:** ADAPT-01, ADAPT-02, ADAPT-03, ADAPT-04

**Success criteria:**

- Runtime-specific files reference the same artifact contract and stop rules.
- Generated scaffolds are not mistaken for canonical policy.
- A project can adopt the protocol without choosing one agent runtime as the only source of truth.

## Phase 5: CLI Packaging

**Goal:** Add minimal local automation around the accepted protocol.

**Rationale:** CLI automation should manage accepted artifacts, not invent the contract. This phase packages the validated workflow into repeatable commands after the core invariants are stable.

**Delivers:**

- Minimal Node.js + TypeScript CLI or script layer for `init`, `new-session`, `status`, `doctor`, `validate-spec`, and `handoff`.
- Packaging that reads the accepted path registry and state files.
- Automated tests for CLI/script behavior.
- Explicit deferral of Promptfoo, Playwright, dashboard, MCP, database, and hosted surfaces until core local checks are stable.

**Requirements covered:** CLI-01, CLI-02, CLI-03, CLI-04

**Success criteria:**

- CLI/script commands operate on documented artifacts only.
- Tests cover core command behavior and failure cases.
- The project can initialize and inspect protocol state repeatably.

## Phase 6: Examples, CI, and Optional Evaluation

**Goal:** Prove repeatability across fixture projects and protect the protocol from regression.

**Rationale:** Once local behavior is stable, examples and CI provide confidence that greenfield and brownfield setup still works as templates, validators, and adapters evolve.

**Delivers:**

- Greenfield and brownfield fixture projects.
- CI checks for validators, artifact path consistency, templates, and docs/runtime parity.
- Verification command history recorded in durable project memory.
- Optional evaluation/rubric checks after deterministic checks are stable.

**Requirements covered:** VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04

**Success criteria:**

- CI fails on broken artifact references, invalid templates, or validator regressions.
- Fixture projects demonstrate the full spec-to-ship protocol.
- Optional evaluation is layered on top of deterministic checks, not used as a substitute.

## Requirement Coverage

| Phase | Requirements |
|-------|--------------|
| Phase 1 | ART-01, ART-02, ART-03, ART-04 |
| Phase 2 | ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04, MEM-01, MEM-02, MEM-03, MEM-04 |
| Phase 3 | VALID-01, VALID-02, VALID-03, VALID-04 |
| Phase 4 | ADAPT-01, ADAPT-02, ADAPT-03, ADAPT-04 |
| Phase 5 | CLI-01, CLI-02, CLI-03, CLI-04 |
| Phase 6 | VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04 |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

## Research Flags

- Keep the first implementation docs/templates-first. Do not add a CLI before Phase 1 and Phase 2 are stable.
- Prefer deterministic validators before Promptfoo or LLM-as-judge evaluation.
- Do not add Playwright until there is a browser target.
- Do not add database or hosted state until local file-based state proves insufficient.
- Treat generated scaffolds as compatibility layers, not source-of-truth policy.

---
*Roadmap defined: 2026-05-24*
*Last updated: 2026-05-24 after initialization*
