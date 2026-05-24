# Requirements: Snail Agent Flow

**Defined:** 2026-05-24
**Core Value:** Make it obvious which AI engineering tool should run next, what artifact it should consume, and what validation must pass before work can continue.

## v1 Requirements

Requirements for the first usable local protocol release. Each maps to one roadmap phase.

### Artifact Contract

- [ ] **ART-01**: Define the canonical artifact contract for `.ai/`, `.planning/`, runtime instruction files, Spec-Kit/Gemini scaffolds, and future feature directories.
- [ ] **ART-02**: Define a path ownership registry that identifies which artifact path is authoritative, generated, runtime-specific, or local-only.
- [ ] **ART-03**: Label current repository artifacts by implementation status: implemented, specified, placeholder, generated scaffold, or deferred.
- [ ] **ART-04**: Define the current-spec convention for active spec, plan, task, validation, and state files.

### Routing and Gates

- [ ] **ROUTE-01**: Provide a routing matrix that maps common task types to the correct tool, required inputs, expected outputs, validators, and stop conditions.
- [ ] **ROUTE-02**: Define gate outcomes for recon, critique, spec generation, validation, execution, QA, memory handoff, and ship.
- [ ] **ROUTE-03**: Define failure categories, retry limits, and the exact transition to `NEEDS_HUMAN_REVIEW`.
- [ ] **ROUTE-04**: Provide a human review packet template with category, attempt count, evidence, changed files, options, and recommended decision.

### Memory and State

- [ ] **MEM-01**: Seed `.ai/memory/` with current project summary, architecture, decisions, risks, and verification history.
- [ ] **MEM-02**: Define what belongs in session logs versus durable memory.
- [ ] **MEM-03**: Define `.ai/state/` files for validation status, retry counts, active session, and current feature/spec pointers.
- [ ] **MEM-04**: Require memory handoff after architecture, behavior, operations, or known-risk changes.

### Validation

- [ ] **VALID-01**: Add deterministic checks for missing required artifacts, placeholder memory, stale paths, and noncanonical references.
- [ ] **VALID-02**: Add deterministic checks for required headings and fields in specs, plans, tasks, validation reports, review packets, and memory files.
- [ ] **VALID-03**: Add validation for retry-count and `NEEDS_HUMAN_REVIEW` state transitions.
- [ ] **VALID-04**: Add docs/runtime parity checks so documentation cannot claim enforcement that has no executable check.

### Runtime Adapters and Templates

- [ ] **ADAPT-01**: Align `CLAUDE.md`, `GEMINI.md`, future `AGENTS.md`, `.agents/skills/`, and `.ai/constitution.md` to the shared artifact contract.
- [ ] **ADAPT-02**: Provide runtime-neutral templates for greenfield and brownfield project setup.
- [ ] **ADAPT-03**: Define adapter boundaries for Claude, Gemini, Codex/GSD, and future runtimes without making any single runtime the source of truth.
- [ ] **ADAPT-04**: Classify generated Spec-Kit/Gemini scaffolds as compatibility adapters rather than canonical policy.

### CLI and Automation

- [ ] **CLI-01**: Add a minimal local CLI or script layer for `init`, `new-session`, `status`, `doctor`, `validate-spec`, and `handoff`.
- [ ] **CLI-02**: Package the CLI around the accepted artifact contract rather than inventing new paths or state.
- [ ] **CLI-03**: Add automated tests for CLI/script behavior using the selected project runtime.
- [ ] **CLI-04**: Keep Promptfoo, Playwright, dashboard, MCP, database, and hosted surfaces optional until core local checks are stable.

### Examples and Verification

- [ ] **VERIFY-01**: Add greenfield and brownfield fixture projects that demonstrate the complete protocol.
- [ ] **VERIFY-02**: Add CI checks for validators, artifact path consistency, templates, and docs/runtime parity.
- [ ] **VERIFY-03**: Record verification commands and results in durable project memory.
- [ ] **VERIFY-04**: Add optional evaluation/rubric checks only after deterministic checks are reliable.

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
| ART-01 | Phase 1 | Pending |
| ART-02 | Phase 1 | Pending |
| ART-03 | Phase 1 | Pending |
| ART-04 | Phase 1 | Pending |
| ROUTE-01 | Phase 2 | Pending |
| ROUTE-02 | Phase 2 | Pending |
| ROUTE-03 | Phase 2 | Pending |
| ROUTE-04 | Phase 2 | Pending |
| MEM-01 | Phase 2 | Pending |
| MEM-02 | Phase 2 | Pending |
| MEM-03 | Phase 2 | Pending |
| MEM-04 | Phase 2 | Pending |
| VALID-01 | Phase 3 | Pending |
| VALID-02 | Phase 3 | Pending |
| VALID-03 | Phase 3 | Pending |
| VALID-04 | Phase 3 | Pending |
| ADAPT-01 | Phase 4 | Pending |
| ADAPT-02 | Phase 4 | Pending |
| ADAPT-03 | Phase 4 | Pending |
| ADAPT-04 | Phase 4 | Pending |
| CLI-01 | Phase 5 | Pending |
| CLI-02 | Phase 5 | Pending |
| CLI-03 | Phase 5 | Pending |
| CLI-04 | Phase 5 | Pending |
| VERIFY-01 | Phase 6 | Pending |
| VERIFY-02 | Phase 6 | Pending |
| VERIFY-03 | Phase 6 | Pending |
| VERIFY-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-05-24*
*Last updated: 2026-05-24 after initialization*
