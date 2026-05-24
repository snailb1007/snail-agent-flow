# Requirements: Snail Agent Flow

**Defined:** 2026-05-24
**Core Value:** Make it obvious which AI engineering tool should run next, what artifact it should consume, and what validation must pass before work can continue.

## v1 Requirements (Complete)

All 28 v1 requirements completed in milestone v1.0. See v1.0 archive for details.

### Artifact Contract

- [x] **ART-01**: Define the canonical artifact contract for `.ai/`, `.planning/`, runtime instruction files, Spec-Kit/Gemini scaffolds, and future feature directories.
- [x] **ART-02**: Define a path ownership registry that identifies which artifact path is authoritative, generated, runtime-specific, or local-only.
- [x] **ART-03**: Label current repository artifacts by implementation status: implemented, specified, placeholder, generated scaffold, or deferred.
- [x] **ART-04**: Define the current-spec convention for active spec, plan, task, validation, and state files.

### Routing and Gates

- [x] **ROUTE-01**: Provide a routing matrix that maps common task types to the correct tool, required inputs, expected outputs, validators, and stop conditions.
- [x] **ROUTE-02**: Define gate outcomes for recon, critique, spec generation, validation, execution, QA, memory handoff, and ship.
- [x] **ROUTE-03**: Define failure categories, retry limits, and the exact transition to `NEEDS_HUMAN_REVIEW`.
- [x] **ROUTE-04**: Provide a human review packet template with category, attempt count, evidence, changed files, options, and recommended decision.

### Memory and State

- [x] **MEM-01**: Seed `.ai/memory/` with current project summary, architecture, decisions, risks, and verification history.
- [x] **MEM-02**: Define what belongs in session logs versus durable memory.
- [x] **MEM-03**: Define `.ai/state/` files for validation status, retry counts, active session, and current feature/spec pointers.
- [x] **MEM-04**: Require memory handoff after architecture, behavior, operations, or known-risk changes.

### Validation

- [x] **VALID-01**: Add deterministic checks for missing required artifacts, placeholder memory, stale paths, and noncanonical references.
- [x] **VALID-02**: Add deterministic checks for required headings and fields in specs, plans, tasks, validation reports, review packets, and memory files.
- [x] **VALID-03**: Add validation for retry-count and `NEEDS_HUMAN_REVIEW` state transitions.
- [x] **VALID-04**: Add docs/runtime parity checks so documentation cannot claim enforcement that has no executable check.

### Runtime Adapters and Templates

- [x] **ADAPT-01**: Align `CLAUDE.md`, `GEMINI.md`, future `AGENTS.md`, `.agents/skills/`, and `.ai/constitution.md` to the shared artifact contract.
- [x] **ADAPT-02**: Provide runtime-neutral templates for greenfield and brownfield project setup.
- [x] **ADAPT-03**: Define adapter boundaries for Claude, Gemini, Codex/GSD, and future runtimes without making any single runtime the source of truth.
- [x] **ADAPT-04**: Classify generated Spec-Kit/Gemini scaffolds as compatibility adapters rather than canonical policy.

### CLI and Automation

- [x] **CLI-01**: Add a minimal local CLI or script layer for `init`, `new-session`, `status`, `doctor`, `validate-spec`, and `handoff`.
- [x] **CLI-02**: Package the CLI around the accepted artifact contract rather than inventing new paths or state.
- [x] **CLI-03**: Add automated tests for CLI/script behavior using the selected project runtime.
- [x] **CLI-04**: Keep Promptfoo, Playwright, dashboard, MCP, database, and hosted surfaces optional until core local checks are stable.

### Examples and Verification

- [x] **VERIFY-01**: Add greenfield and brownfield fixture projects that demonstrate the complete protocol.
- [x] **VERIFY-02**: Add CI checks for validators, artifact path consistency, templates, and docs/runtime parity.
- [x] **VERIFY-03**: Record verification commands and results in durable project memory.
- [x] **VERIFY-04**: Add optional evaluation/rubric checks only after deterministic checks are reliable.

---

## v2 Requirements

Requirements for the Flow Engine milestone. Packages the rough-project-flow ledger into a portable, init-able Gemini skill with artifact gates.

### Flow Definition

- [ ] **FLOW-01**: Define a declarative flow definition format (YAML or JSON) that specifies stage order, required skills/commands per stage, required artifacts, gate conditions, and revision routing rules.
- [ ] **FLOW-02**: Ship a built-in `rough-project-flow` definition file encoding the 10-stage ledger: decision discovery, decision challenge, canonical spec, implementation plan, plan critique, revision loop, vertical slicing, execution, verification, release readiness.
- [ ] **FLOW-03**: Allow custom flow definitions so users can add, remove, or reorder stages for their project needs.
- [ ] **FLOW-04**: Document prerequisite tools (GSD, Superpowers, Spec-Kit, GStack) and verify their availability at flow start.

### Flow Initialization

- [ ] **INIT-01**: Extend `adp init` to copy the default flow definition into `.ai/flows/` in the target project.
- [ ] **INIT-02**: Create an initial flow ledger state file at `.ai/state/flow-ledger.json` tracking stage status, artifact paths, timestamps, and gate results.
- [ ] **INIT-03**: Support brownfield projects that already have `.ai/` infrastructure — merge, do not overwrite.
- [ ] **INIT-04**: Generate a Gemini skill file (SKILL.md) that agents can mention to start or resume the flow.

### Flow Engine Skill

- [ ] **ENGINE-01**: Package the flow orchestrator as a Gemini skill under `.agents/skills/` that agents mention in chat to start, resume, or inspect the flow.
- [ ] **ENGINE-02**: The skill must read the flow definition from `.ai/flows/`, read ledger state from `.ai/state/flow-ledger.json`, determine the next stage, and instruct the agent which skill/command to invoke.
- [ ] **ENGINE-03**: After each stage completes, the skill must validate required artifacts exist, update the ledger, and advance or block.
- [ ] **ENGINE-04**: Support revision loops — when a downstream stage detects errors, the skill routes back to the correct upstream stage and resets affected ledger entries.

### Artifact Gates

- [ ] **GATE-01**: Each stage must declare required output artifacts. The gate checks artifact existence and basic content validation (non-empty, required headings).
- [ ] **GATE-02**: Gate failures must block stage advancement and log the failure reason in the ledger.
- [ ] **GATE-03**: After 3 consecutive gate failures on the same stage, generate a `NEEDS_HUMAN_REVIEW` packet and halt the flow.
- [ ] **GATE-04**: Gate validation must be deterministic — no LLM-as-judge for pass/fail decisions.

### Flow Validator

- [ ] **FVALID-01**: Add a deterministic flow validator (`adp flow validate` or `npm run validate:flow`) that checks flow definition syntax, ledger state consistency, and artifact gate status.
- [ ] **FVALID-02**: Detect and report ledger corruption: invalid stage references, impossible state transitions, missing artifact paths.
- [ ] **FVALID-03**: Validate that the flow definition references only known skill names or commands.
- [ ] **FVALID-04**: Add tests for the flow validator covering happy path, gate failures, revision loops, and corruption detection.

## v3 Requirements (Deferred)

- **MULTI-01**: Support multiple concurrent flows per project (e.g., feature A at execution while feature B at spec stage).
- **MULTI-02**: Flow dashboard for visualizing stage progress and artifact status.
- **MULTI-03**: MCP server exposing flow state to compatible agents.
- **MULTI-04**: Cross-agent flow handoff when switching between Claude, Gemini, Codex, or other runtimes mid-flow.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Replacing GSD, GStack, Superpowers, Spec-Kit, Serena, Semble, GitNexus, Context7, Promptfoo, or Playwright | The project coordinates existing tools rather than reimplementing them. |
| Full IDE or hosted agent platform | The first release is a local, file-based protocol and artifact system. |
| Database, auth, billing, or deployment stack | No end-user runtime surface exists yet. |
| Automatic tool installation | Users must install prerequisites themselves; the flow validates availability. |
| Flow step automation via subprocess | The flow skill instructs agents, it does not spawn child processes. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ART-01 – ART-04 | Phase 1 (v1) | Completed |
| ROUTE-01 – ROUTE-04 | Phase 2 (v1) | Completed |
| MEM-01 – MEM-04 | Phase 2 (v1) | Completed |
| VALID-01 – VALID-04 | Phase 3 (v1) | Completed |
| ADAPT-01 – ADAPT-04 | Phase 4 (v1) | Completed |
| CLI-01 – CLI-04 | Phase 5, 7 (v1) | Completed |
| VERIFY-01 – VERIFY-04 | Phase 6 (v1) | Completed |
| FLOW-01 – FLOW-04 | Phase 8 (v2) | Completed |
| INIT-01 – INIT-04 | Phase 9 (v2) | Pending |
| ENGINE-01 – ENGINE-04 | Phase 10 (v2) | Pending |
| GATE-01 – GATE-04 | Phase 11 (v2) | Pending |
| FVALID-01 – FVALID-04 | Phase 12 (v2) | Pending |

**Coverage:**
- v1 requirements: 28 total, 28 completed
- v2 requirements: 20 total, 4 completed
- Unmapped: 0

---
*Requirements defined: 2026-05-24*
*Last updated: 2026-05-25 — v2 Flow Engine milestone added*
