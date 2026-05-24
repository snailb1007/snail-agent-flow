# Phase 2: routing-gates-and-memory-foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 02-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 2-routing-gates-and-memory-foundation
**Areas discussed:** Path Reconciliation, Spec-Kit Contract, Gate Inputs/Outputs & Statuses, Tool Routing Columns, Failure Taxonomy, Human Review Safeguards, Memory Seeding, Vertical Example

---

## Path Reconciliation & Spec-Kit Contract

### Question 1: Source-of-truth specs path
| Option | Description | Selected |
|--------|-------------|----------|
| `.specify/specs/<feature-slug>/` | Keep all specs under the unified Spec-Kit `.specify` root directory to prevent path drift. | |
| `specs/<feature-slug>/` | Place canonical feature specifications in a root `specs/` folder. | ✓ |

**User's choice:** `specs/<feature-slug>/`
**Notes:** Aligns with current repository state. `.specify/` is reserved for Spec-Kit tooling, templates, commands, and integration files, not canonical feature specs.

### Question 2: Spec-Kit Artifact Contract definition
| Option | Description | Selected |
|--------|-------------|----------|
| Full Contract | Define the artifact contract explicitly as `spec.md`, `plan.md`, and `tasks.md`. | ✓ |
| Minimal Contract | Only require `spec.md` as the specification. | |

**User's choice:** Full Contract
**Notes:** Prevents GSD execution from starting with incomplete implementation plans or task checklists.

### Question 3: Active feature identity versus run state
| Option | Description | Selected |
|--------|-------------|----------|
| Separate identity pointer and mutable run state | Keep `.ai/state/active-feature.json` as the narrow feature identity pointer and add `.ai/state/run-state.json` for phase, gate, retry, block, path verification, and handoff state. | ✓ |
| Expanded active feature file | Store identity and mutable pipeline progress together in `.ai/state/active-feature.json`. | |

**User's choice:** Separate identity pointer and mutable run state
**Notes:** Separating files is cleaner, easier to validate, and better matches Phase 2's routing, gates, memory handoff, path verification, and retry/block state needs.

### Question 4: Verified artifact ownership
| Option | Description | Selected |
|--------|-------------|----------|
| Validator-owned evidence | `verified_artifacts` is written only by validators/gates and records path, artifact type, verifier, timestamp, status, and optional hash. | ✓ |
| Executor self-attestation | Execution agents may mark their own outputs as verified in run state. | |

**User's choice:** Validator-owned evidence
**Notes:** Prevents execution agents from self-attesting verification. Planning and execution agents may request validation but do not own verification evidence.

---

## Gate Inputs/Outputs & Statuses

### Question 1: Gate input and output separation
| Option | Description | Selected |
|--------|-------------|----------|
| Explicit I/O split | Separately define the required inputs and resulting outputs for every gate boundary. | ✓ |
| General conditions | List the status requirements and files together without separating inputs and outputs. | |

**User's choice:** Explicit I/O split
**Notes:** Ensures gates have a clear direction (e.g., Memory Handoff consumes QA reports and writes memory files, rather than requiring memory files to start QA).

### Question 2: Gate outcome status formats
| Option | Description | Selected |
|--------|-------------|----------|
| Typed status vocabulary | Limit outcomes to exact headers. Deterministic gates use `PASS`, `BLOCKED`, or `NEEDS_HUMAN_REVIEW`; judgment gates may also use non-blocking `WARN`. | ✓ |
| Flexible text descriptions | Allow descriptive outcomes like "Mostly complete" or "No major blockers". | |

**User's choice:** Typed status vocabulary
**Notes:** Crucial for allowing automated scripts/validators to parse review headers without parsing natural language. `WARN` is judgment-only and non-blocking; deterministic validators must not emit it.

---

## Tool Routing & Failure Taxonomy

### Question 1: Routing matrix granularity
| Option | Description | Selected |
|--------|-------------|----------|
| Structured table columns | Map routing using: `phase`, `task type`, `primary tool`, `specific skill/flow`, `input`, `output`, `validator`, and `stop condition`. | ✓ |
| Coarse tool list | Briefly state which tool does what phase (e.g., Recon -> Serena). | |

**User's choice:** Structured table columns
**Notes:** Removes ambiguity so the agent knows exactly which skill/flow to execute.

### Question 2: Failure taxonomy modes
| Option | Description | Selected |
|--------|-------------|----------|
| Expanded taxonomy | Include Local Bug, Spec Drift, Tool Unavailable, Context Fragmentation, Path Drift, Human Decision Required, and Validation Loop Exhausted. | ✓ |
| Basic classification | Only classify into Local Bug and Spec-Level Failure. | |

**User's choice:** Expanded taxonomy
**Notes:** Adds critical real-world failure cases like tool-unavailability and path-drift checks.

### Question 3: Operational blocks versus human review
| Option | Description | Selected |
|--------|-------------|----------|
| Split stop states | `BLOCKED` means execution cannot continue but the next machine/action step is known. `NEEDS_HUMAN_REVIEW` means execution cannot continue because judgment or approval is required. | ✓ |
| Single blocked status | Treat operational failures and human decisions as one blocked state. | |

**User's choice:** Split stop states
**Notes:** Prevents Phase 2 gate semantics from mixing operational failures with human decisions. Retry state belongs in `.ai/state/run-state.json`; after 3 failed retries for the same gate/scope, the run transitions to `NEEDS_HUMAN_REVIEW`.

---

## Human Review Safeguards & Memory Seeding

### Question 1: Recommended choice control
| Option | Description | Selected |
|--------|-------------|----------|
| Strict human review gates | Recommended options are for drafting only; cannot bypass human reviews or auto-commit without explicit approval. | ✓ |
| Automatic adoption | Automatically commit and proceed with recommended choices. | |

**User's choice:** Strict human review gates
**Notes:** Protects against unauthorized agent commits and preserves human review checkpoints.

### Question 1a: Human review packet schema
| Option | Description | Selected |
|--------|-------------|----------|
| Required packet fields | Human review packets include feature slug, phase, gate, status, blocking question, recommended answer, options, affected artifacts, and resume instructions. | ✓ |
| Free-form review packet | Let agents write human review requests in any clear format. | |

**User's choice:** Required packet fields
**Notes:** Keeps `NEEDS_HUMAN_REVIEW` resumable and machine-checkable without removing the human judgment requirement.

### Question 2: Seeded project memory content
| Option | Description | Selected |
|--------|-------------|----------|
| Actual project facts | Seed `.ai/memory/` files with actual Snail Agent Flow protocol facts, decisions, architecture, and risks. | ✓ |
| Mock/fixture details | Seed memory files with dummy data from a sample app (e.g., payment webhook example). | |

**User's choice:** Actual project facts
**Notes:** Aligns with the documentation-first approach for the current repository.

### Question 2a: Tool fallback boundary
| Option | Description | Selected |
|--------|-------------|----------|
| Block report only | If a required tool is unavailable, write a block report, set run state to `BLOCKED`, and present plain-text next steps or questions without inventing missing decisions. | ✓ |
| Continue by assumption | Proceed by guessing what the unavailable tool would have produced. | |

**User's choice:** Block report only
**Notes:** Fallback preserves clarity but does not create authority for missing tool outputs.

### Question 3: Memory Handoff gate authority
| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid judgment gate with deterministic minimum checks | Require `.ai/state/handoff.md` to name the feature slug, list updated memory files, and link QA/session inputs, then require reviewer judgment that memory preserves decisions, risks, verification history, and architecture without invented facts. | ✓ |
| Pure deterministic state check | Pass when `.ai/state/handoff.md` exists and required paths are present. | |

**User's choice:** Hybrid judgment gate with deterministic minimum checks
**Notes:** The Matt Pocock `handoff` skill is an optional/standardized input producer for handoff documents, not the D-10 gate authority.

### Question 4: Vertical slice evidence
| Option | Description | Selected |
|--------|-------------|----------|
| Full state and gate evidence | The vertical slice verifies `active-feature.json`, `run-state.json`, gate report parsing, validator-owned `verified_artifacts`, Path Drift handling, and Memory Handoff deterministic minimum checks. | ✓ |
| Happy-path only | The vertical slice only proves the recon-to-ship path can run once. | |

**User's choice:** Full state and gate evidence
**Notes:** Phase 2 exists to make routing, gates, memory, and state semantics concrete, so the thin slice must exercise those contracts.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
