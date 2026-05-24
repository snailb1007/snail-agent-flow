# Requirements: Snail Agent Flow

**Defined:** 2026-05-24
**Core Value:** Make it obvious which AI engineering tool should run next, what artifact it should consume, and what validation must pass before work can continue.

## v1 Requirements

Requirements for the first usable local protocol release. Each maps to one roadmap phase.

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

## v2 Requirements

Deferred to future release. Tracked but not in the initial roadmap.

### Product Surface

- **SURFACE-01**: Hosted dashboard for visualizing sessions, gates, and memory.
- **SURFACE-02**: MCP server for exposing protocol status to compatible agents.
- **SURFACE-03**: Database-backed state for multi-user or team workflows.
- **SURFACE-04**: Deep Promptfoo/LLM-as-judge evaluation suite for qualitative planning and review outputs.
- **SURFACE-05**: Browser automation with Playwright for UI-oriented products that adopt the protocol.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Replacing GSD, GStack, Superpowers, Spec-Kit, Serena, Semble, GitNexus, Context7, Promptfoo, or Playwright | The project coordinates existing tools rather than reimplementing them. |
| Full IDE or hosted agent platform | The first release is a local, file-based protocol and artifact system. |
| Database, auth, billing, or deployment stack | No end-user runtime surface exists yet. |
| CLI polish before artifact contract | Automation must manage accepted paths and state, not define them accidentally. |
| Broad rewrites of generated scaffolds | Generated files should be adapted narrowly and treated as compatibility layers. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ART-01 | Phase 1 | Completed |
| ART-02 | Phase 1 | Completed |
| ART-03 | Phase 1 | Completed |
| ART-04 | Phase 1 | Completed |
| ROUTE-01 | Phase 2 | Completed |
| ROUTE-02 | Phase 2 | Completed |
| ROUTE-03 | Phase 2 | Completed |
| ROUTE-04 | Phase 2 | Completed |
| MEM-01 | Phase 2 | Completed |
| MEM-02 | Phase 2 | Completed |
| MEM-03 | Phase 2 | Completed |
| MEM-04 | Phase 2 | Completed |
| VALID-01 | Phase 3 | Completed |
| VALID-02 | Phase 3 | Completed |
| VALID-03 | Phase 3 | Completed |
| VALID-04 | Phase 3 | Completed |
| ADAPT-01 | Phase 4 | Completed |
| ADAPT-02 | Phase 4 | Completed |
| ADAPT-03 | Phase 4 | Completed |
| ADAPT-04 | Phase 4 | Completed |
| CLI-01 | Phase 5, Phase 7 | Completed |
| CLI-02 | Phase 5, Phase 7 | Completed |
| CLI-03 | Phase 5, Phase 7 | Completed |
| CLI-04 | Phase 5, Phase 7 | Completed |
| VERIFY-01 | Phase 6, Phase 1 (partial) | Completed |
| VERIFY-02 | Phase 6 | Completed |
| VERIFY-03 | Phase 6 | Completed |
| VERIFY-04 | Phase 6 | Completed |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-05-24*
*Last updated: 2026-05-24 after vertical slice alignment*
