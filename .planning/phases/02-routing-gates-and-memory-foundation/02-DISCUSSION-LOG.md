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
| `.specify/specs/<feature-slug>/` | Keep all specs under the unified Spec-Kit `.specify` root directory to prevent path drift. | ✓ |
| `specs/<feature-slug>/` | Place specifications in a root `specs/` folder. | |

**User's choice:** `.specify/specs/<feature-slug>/`
**Notes:** Reconciles previous path drift and ensures the validator in Phase 3 can enforce a single Spec-Kit location.

### Question 2: Spec-Kit Artifact Contract definition
| Option | Description | Selected |
|--------|-------------|----------|
| Full Contract | Define the artifact contract explicitly as `spec.md`, `plan.md`, and `tasks.md`. | ✓ |
| Minimal Contract | Only require `spec.md` as the specification. | |

**User's choice:** Full Contract
**Notes:** Prevents GSD execution from starting with incomplete implementation plans or task checklists.

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
| Deterministic status | Limit outcomes to `PASS`, `WARN`, `BLOCKED`, or `NEEDS_HUMAN_REVIEW` with exact headers. | ✓ |
| Flexible text descriptions | Allow descriptive outcomes like "Mostly complete" or "No major blockers". | |

**User's choice:** Deterministic status
**Notes:** Crucial for allowing automated scripts/validators to parse review headers without parsing natural language.

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

---

## Human Review Safeguards & Memory Seeding

### Question 1: Recommended choice control
| Option | Description | Selected |
|--------|-------------|----------|
| Strict human review gates | Recommended options are for drafting only; cannot bypass human reviews or auto-commit without explicit approval. | ✓ |
| Automatic adoption | Automatically commit and proceed with recommended choices. | |

**User's choice:** Strict human review gates
**Notes:** Protects against unauthorized agent commits and preserves human review checkpoints.

### Question 2: Seeded project memory content
| Option | Description | Selected |
|--------|-------------|----------|
| Actual project facts | Seed `.ai/memory/` files with actual Snail Agent Flow protocol facts, decisions, architecture, and risks. | ✓ |
| Mock/fixture details | Seed memory files with dummy data from a sample app (e.g., payment webhook example). | |

**User's choice:** Actual project facts
**Notes:** Aligns with the documentation-first approach for the current repository.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
