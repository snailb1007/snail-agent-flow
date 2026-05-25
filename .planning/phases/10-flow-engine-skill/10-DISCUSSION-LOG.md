# Phase 10: Flow Engine Skill - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 10-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 10-flow-engine-skill
**Areas discussed:** Skill architecture, Ledger mutation, Stage instruction format, Revision loop complexity, Artifact gate boundary.

---

## Skill Architecture

### Question 1: How should the skill's instructions be structured?
| Option | Description | Selected |
|--------|-------------|----------|
| Self-contained SKILL.md | All engine logic lives entirely in SKILL.md as detailed prose instructions that agents follow step-by-step. | |
| SKILL.md + helper library | SKILL.md contains agent-facing instructions, references `lib/flow-engine.js` for stage resolution logic, gate checking, and ledger mutation helpers. | ✓ |
| SKILL.md + inline decision tree | SKILL.md contains a structured decision tree (if/then format) with file paths and expected outputs at each node. | |

**Recommended choice:** SKILL.md + helper library
**Selected:** SKILL.md + helper library
**Notes:** Splitting agent-facing instructions from deterministic logic is consistent with the project's pattern (e.g., `lib/yaml-parser.js`, `lib/flow-ledger.js`, `lib/tool-validator.js`). The helper library can be tested independently. SKILL.md references it as documentation agents can read for stage resolution logic, but agents don't execute the JS — they follow the SKILL.md instructions that mirror the logic.

---

## Ledger Mutation

### Question 1: Who updates the flow-ledger.json after stage completion?
| Option | Description | Selected |
|--------|-------------|----------|
| Agent-instructed manual update | SKILL.md tells the agent to read the JSON, update `status`, `artifacts`, `completed_at`, and write it back. | ✓ |
| CLI helper command | Add `adp flow advance` / `adp flow reset` commands for deterministic updates. | |
| Hybrid | Agent updates status directly, CLI handles revision routing. | |

**Recommended choice:** Agent-instructed manual update
**Selected:** Agent-instructed manual update
**Notes:** Consistent with the project constraint that the flow skill instructs agents, not spawns subprocesses. The ledger JSON schema is simple enough for agents to update directly. The structured block output (see below) tells agents exactly which fields to update. CLI commands can be added later if deterministic updates prove fragile.

---

## Stage Instruction Output Format

### Question 1: What format should the skill use to instruct the agent about the next stage?
| Option | Description | Selected |
|--------|-------------|----------|
| Structured block | Consistent block with: Stage Name, Stage ID, Skill to Invoke, Command, Required Artifacts, Gate Conditions, Revision Routes. | ✓ |
| Natural language | Conversational instruction. | |
| Ledger-style checklist | Full 10-stage ledger with current stage highlighted. | |

**Recommended choice:** Structured block
**Selected:** Structured block
**Notes:** A structured block is deterministic and parseable. Agents can extract the skill name, artifact paths, and gate conditions without ambiguity. The block format mirrors the flow YAML structure, making it easy to trace back to the definition. Natural language risks hallucination; a full ledger adds noise.

---

## Revision Loop Complexity

### Question 1: How deep should revision support go in Phase 10?
| Option | Description | Selected |
|--------|-------------|----------|
| Simple reset | Reset target stage and all stages between it and current stage to `needs_revision`. Log reason in `revision_history`. | ✓ |
| Full dependency tracking | Build dependency graph from `revision_routing` entries and only reset actually-affected stages. | |
| Manual routing only | SKILL.md tells agent which stage to go back to, but doesn't automate ledger reset. | |

**Recommended choice:** Simple reset
**Selected:** Simple reset
**Notes:** The flow is sequential — resetting all stages between the target and current is safe and simple. A dependency graph is overengineering for 10 sequential stages. The `revision_history` audit trail preserves why revisions happened. Manual-only routing violates ENGINE-04 which says the skill must "reset affected ledger entries."

---

## Artifact Gate Boundary

### Question 1: Should Phase 10 include basic gate checking or defer entirely to Phase 11?
| Option | Description | Selected |
|--------|-------------|----------|
| Basic inline gates | Phase 10 includes simple artifact existence + non-empty checks. Phase 11 adds heading validation, content checks, circuit breaker. | ✓ |
| No gates in Phase 10 | Phase 10 only tracks artifacts but doesn't validate. All enforcement is Phase 11. | |
| Full gates in Phase 10 | Pull all gate enforcement into Phase 10. | |

**Recommended choice:** Basic inline gates
**Selected:** Basic inline gates
**Notes:** ENGINE-03 says "the skill must validate required artifacts exist." Basic existence + non-empty is the minimum to satisfy that requirement. Phase 11 adds the full gate checker module with heading validation, content checks, and the circuit breaker. This splits the work cleanly: Phase 10 validates presence, Phase 11 validates content.

---

## Deferred Ideas

- CLI commands for ledger mutation (`adp flow advance`, `adp flow reset`) — evaluate after Phase 10.
- `adp status` integration with flow ledger state — can be done as an incremental improvement.
- Multi-flow support — v3 scope per REQUIREMENTS.md.
- Visual flow dashboard — v3 scope per REQUIREMENTS.md.
