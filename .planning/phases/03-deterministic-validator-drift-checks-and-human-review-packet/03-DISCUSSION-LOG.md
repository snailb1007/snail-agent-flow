# Phase 3: deterministic-validator-drift-checks-and-human-review-packet - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 03-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 3-deterministic-validator-drift-checks-and-human-review-packet
**Areas discussed:** Script Environment & CLI Entry Point, State Tracking & Retry Schema, Canonical Specs & Path Drift Checks, Heading/Checklist Rules, Failure Classifications & Placeholder Scan, Human Review Packet Generation

---

## Script Environment & CLI Entry Point

### Question 1: Script Language & Runtime
| Option | Description | Selected |
|--------|-------------|----------|
| Node.js Script | Implement the validator as a Node.js script located at `validators/scripts/validate-spec.js`. | ✓ |
| Python / Bash Script | Implement the validator as a Python or Bash script. | |

**Recommended choice:** Node.js Script
**Selected:** Node.js Script
**Notes:** Aligns with decision D-17. Node.js is widely available in JavaScript/TypeScript workspaces, runs extremely fast, and simplifies reading and mutating JSON state files.

### Question 2: Path Configuration & Overrides
| Option | Description | Selected |
|--------|-------------|----------|
| Active Feature Pointer | Automatically read `.ai/state/active-feature.json` to determine the active spec directory. | ✓ |
| CLI Argument Only | Require the active feature path to be passed explicitly as a command-line argument. | |

**Recommended choice:** Active Feature Pointer
**Selected:** Active Feature Pointer
**Notes:** Allows running the script with zero configuration via `node validators/scripts/validate-spec.js` while keeping behavior deterministic. Optional command line overrides can be supported for testing.

---

## State Tracking & Retry Schema

### Question 1: Run State File Reconciliation
| Option | Description | Selected |
|--------|-------------|----------|
| Align with `run-state.json` | Use `.ai/state/run-state.json` (from Phase 2 and ADR 0001) as the single source of truth for mutable pipeline state. | ✓ |
| Separate `active-run.json` | Create a separate `.ai/state/active-run.json` just for Phase 3 validator metrics. | |

**Recommended choice:** Align with `run-state.json`
**Selected:** Align with `run-state.json`
**Notes:** Resolves the discrepancy between Phase 3 draft notes and Phase 2 implementation. Using `run-state.json` avoids duplicate state tracking and prevents context fragmentation.

### Question 2: Schema Extensions for Validation
| Option | Description | Selected |
|--------|-------------|----------|
| Extended Schema | Extend the `run-state.json` schema to include specific validation tracking keys (e.g. `consecutive_failures`, `last_failed_step`, `last_failed_rule`, `last_validator_output`). | ✓ |
| Minimal Schema | Keep the schema exactly as defined in Phase 2, relying on general fields. | |

**Recommended choice:** Extended Schema
**Selected:** Extended Schema
**Notes:** Explicit fields for failures and validator output make it easy to generate the human review packet programmatically and allow external tools to parse validation health.

### Question 3: Retry Counter Reset Rules
| Option | Description | Selected |
|--------|-------------|----------|
| Scope-Bound Reset | The retry count is bound to the active step/gate and resets to 0 on any successful check, but increments on any failures within that step/gate. | ✓ |
| Global Unbounded | Maintain a single global counter that never resets. | |

**Recommended choice:** Scope-Bound Reset
**Selected:** Scope-Bound Reset
**Notes:** Scoping retries to the current gate/phase ensures that minor issues resolved in early phases do not exhaust the retry limit for later phases.

---

## Canonical Specs & Path Drift Checks

### Question 1: Legacy Path Exclusion Strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Recursive / Glob Scan | Perform a scan of legacy folders (`specs/current/`, `.specify/specs/`, `.ai/specs/`) for any markdown files, failing on matches. | ✓ |
| Directory Check | Only verify if the directory path itself exists. | |

**Recommended choice:** Recursive / Glob Scan
**Selected:** Recursive / Glob Scan
**Notes:** Recursively scanning for markdown files ensures that shadow spec/plan files written by agents are caught deterministically, preventing path drift.

### Question 2: Spec-Kit Ownership Verification
| Option | Description | Selected |
|--------|-------------|----------|
| Full Stack Check | Verify that `spec.md`, `plan.md`, and `tasks.md` all exist under the active feature folder and are owned by Spec-Kit. | ✓ |
| Spec File Check | Only verify that `spec.md` exists. | |

**Recommended choice:** Full Stack Check
**Selected:** Full Stack Check
**Notes:** Prevents GSD from executing if the planner fails to generate a plan or task checklist, enforcing the Spec-Kit artifact contract.

---

## Heading & Checklist Rules

### Question 1: Heading Match Rigor
| Option | Description | Selected |
|--------|-------------|----------|
| Flexible Regex Matching | Use case-insensitive regex or flexible heading parsing (e.g., matching `# Goal` or H2 `## Goal`). | ✓ |
| Exact String Match | Match exact headings (case-sensitive, exact spacing). | |

**Recommended choice:** Flexible Regex Matching
**Selected:** Flexible Regex Matching
**Notes:** Allows minor variations in header styling (e.g. `#` vs `##` for main title) while strictly enforcing the presence of required sections (Goal, Non-Goals, Acceptance Criteria, Test Strategy, Behavior-Preservation Rules).

### Question 2: Checklist Format Verification
| Option | Description | Selected |
|--------|-------------|----------|
| Standard Checklist Pattern | Verify that `tasks.md` contains a markdown list of checkboxes (`- [ ]` or `- [x]`). | ✓ |
| Raw Text Check | Only check if the file is non-empty. | |

**Recommended choice:** Standard Checklist Pattern
**Selected:** Standard Checklist Pattern
**Notes:** Enforces that tasks are structured as a checklist, allowing GSD and issue projection systems to parse them properly.

---

## Failure Classifications & Placeholder Scan

### Question 1: Failure Classification Categories
| Option | Description | Selected |
|--------|-------------|----------|
| Explicit Failure Taxonomy | Classify failures into one of: `Missing Required File`, `Missing Required Heading`, `Open Clarification`, `Path Drift`, `Invalid Active Feature Pointer`, `Invalid JSON State`. | ✓ |
| Simple Pass / Fail | Do not categorize failures, only exit with non-zero code. | |

**Recommended choice:** Explicit Failure Taxonomy
**Selected:** Explicit Failure Taxonomy
**Notes:** Aligns with decision D-26. Clear classification allows execution or planning agents to understand exactly why they failed and automatically revise the correct artifact.

### Question 2: Placeholder Scan Coverage
| Option | Description | Selected |
|--------|-------------|----------|
| Active Feature Scope | Scan case-insensitively for forbidden words (`TODO`, `TBD`, `NEEDS CLARIFICATION`, `FIXME`, `XXX`) ONLY inside the active feature's Spec-Kit files. | ✓ |
| Full Workspace Scope | Scan the entire codebase for placeholders. | |

**Recommended choice:** Active Feature Scope
**Selected:** Active Feature Scope
**Notes:** Restricting the scan to the active feature folder prevents the validator from failing due to legacy code or third-party dependencies (`node_modules`) that contain these words.

---

## Human Review Packet Generation

### Question 1: Packet Location & Format
| Option | Description | Selected |
|--------|-------------|----------|
| Standard Review Location | Write the packet to `.ai/reviews/<feature-slug>/human-review.md` matching the structure outlined in the PRD. | ✓ |
| Shared Root File | Write to a single root-level `human-review.md` file. | |

**Recommended choice:** Standard Review Location
**Selected:** Standard Review Location
**Notes:** Prevents overwriting review logs across features and keeps review packets organized by feature slug.
