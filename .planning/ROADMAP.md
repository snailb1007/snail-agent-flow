# Roadmap: Snail Agent Flow

**Defined:** 2026-05-24
**Granularity:** Coarse
**Planning mode:** YOLO

## Overview

This roadmap stabilizes the protocol before adding automation. The phase order is intentional: path ownership, artifact authority, and a minimal golden path come first; operational routing and durable memory second; executable validation third; runtime adapter alignment fourth; CLI packaging fifth; and expanded examples/CI last. Each phase maintains a working end-to-end "golden path", only increasing automation and rigor.

## Phase 1: Artifact Contract, Status, and Minimal Golden Path

**Goal:** Establish one canonical artifact contract, path ownership model, and a runnable minimal golden path skeleton.

**Rationale:** Path ownership and contracts must be proven by a running vertical slice right away, otherwise the schemas will only be clean on paper.

**Delivers:**

- Canonical artifact contract for `.ai/`, `.specify/`, runtime instruction files, Spec-Kit/Gemini scaffolds, and future feature directories.
- Path ownership registry for authoritative, generated, runtime-specific, and local-only artifacts.
- Implementation-status labels for current artifacts.
- Current-spec convention for active spec, plan, tasks, validation, and state files.
- A `minimal-golden-path` example/smoke test showing a sample feature request creating a session, locating a spec source of truth, establishing `DRAFT` status, enabling validator reading, and blocking ship due to incomplete gates/memory.

**Requirements covered:** ART-01, ART-02, ART-03, ART-04, VERIFY-01 (partial)

**Success criteria:**

- Every major project artifact path has a documented owner and status.
- Competing paths for specs/state are either reconciled or explicitly classified.
- Future phases can reference a single source-of-truth document for artifact locations.
- A minimal fixture task can be simulated from recon to blocked ship state using actual contract paths.

## Phase 2: Routing, Gates, and Memory Foundation

**Goal:** Define how agents choose tools, when gates pass or fail, when human review is required, and what durable memory must contain, running on the same Phase 1 sample.

**Rationale:** Gates, limits, and memory updates need concrete operational definitions using the golden path before building a validator.

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
- The Phase 1 sample runs through routing, gate block rules, and memory handoff simulation.

## Phase 3: Deterministic Validator, Drift Checks, and Human Review Packet

**Goal:** Implement a deterministic validator and drift checker to prevent path and memory drift.

**Rationale:** A checkable script or validator is required to make gates and human review packets operational. This acts as the gatekeeper against path drift (specifically validating `specs/<feature-slug>/...` as the requirement source of truth, and `.ai/` as orchestration/state).

**Delivers:**

- Deterministic artifact existence and path consistency checks.
- Required heading/field checks for specs, plans, tasks, validation reports, review packets, and memory files.
- Path drift checks (specifically validating `specs/<feature-slug>/...` as the requirement source of truth and blocking legacy `.ai/specs/current/` or `.gemini/` drift).
- Validation for retry-count and automatic generation of the `NEEDS_HUMAN_REVIEW` packet after 3 consecutive failures.
- Verification command documented and runnable.

**Requirements covered:** VALID-01, VALID-02, VALID-03, VALID-04

**Success criteria:**

- A local command or script can fail the repo when required protocol artifacts drift.
- Missing files or path drift (e.g. legacy spec paths) fail validation deterministically.
- Three validation failures trigger a human review packet correctly.

## Phase 4: Templates and Runtime Adapter Alignment

**Goal:** Align runtime-specific instructions and templates to the shared protocol contract.

**Rationale:** Claude, Gemini, Codex/GSD, local skills, and Spec-Kit scaffolds should be adapters over the same contract, not competing policy sources, reading from the same `.specify/` source of truth.

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

**Goal:** Add minimal local CLI commands to manage the accepted protocol.

**Rationale:** CLI commands automate the manual script execution steps verified in earlier phases.

**Delivers:**

- Minimal Node.js + TypeScript CLI or script layer for `init`, `new-session`, `status`, `doctor`, `validate`, and `handoff`.
- CLI packaging that reads the accepted path registry and state files.
- Automated tests for CLI/script behavior.

**Requirements covered:** CLI-01, CLI-02, CLI-03, CLI-04

**Success criteria:**

- CLI/script commands operate on documented artifacts only.
- Tests cover core command behavior and failure cases.
- The project can initialize and inspect protocol state repeatably.

## Phase 6: Expanded Examples, CI Matrix, and Optional Evaluation

**Goal:** Expand integration examples, run verification in CI, and add optional evaluation.

**Rationale:** Prevent regressions by running the golden path and drift checks inside CI, adding optional LLM-as-judge only after deterministic checks pass.

**Delivers:**

- Multiple greenfield and brownfield fixture projects.
- CI matrix checking validator, path consistency, and drift.
- Optional promptfoo/LLM evaluation rubrics.

**Requirements covered:** VERIFY-01, VERIFY-02, VERIFY-03, VERIFY-04

**Success criteria:**

- CI fails on broken artifact references, invalid templates, or validator regressions.
- Fixture projects demonstrate the full spec-to-ship protocol.
- Optional evaluation is layered on top of deterministic checks, not used as a substitute.

## Requirement Coverage

| Phase | Requirements |
|-------|--------------|
| Phase 1 | ART-01, ART-02, ART-03, ART-04, VERIFY-01 (partial) |
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
*Last updated: 2026-05-24 after vertical slice alignment*

