---
phase: "03"
name: "deterministic-validator-drift-checks-and-human-review-packet"
created: 2026-05-24
status: Ready for planning
---

# Phase 3: deterministic-validator-drift-checks-and-human-review-packet — Context

<domain>
## Phase Boundary

Implement a deterministic validator and drift checker script (`validators/scripts/validate-spec.js`) to prevent path and memory drift, check file existence and headings, scan for case-insensitive placeholder strings inside spec/plan/tasks files, track validation retries, and generate human review packets upon 3 consecutive validation failures.
</domain>

<decisions>
## Implementation Decisions

### 1. Script Environment & CLI Entry Point
- **D-17:** **Validator Tool Execution**: The validator must be implemented as a Node.js script located at `validators/scripts/validate-spec.js`. It must be runnable via `node validators/scripts/validate-spec.js`.

### 2. State Tracking & Retry Schema
- **D-18:** **Active Run State File**: The execution state must be persisted in `.ai/state/active-run.json`.
- **D-19:** **Active Run Schema**: The file must contain:
  ```json
  {
    "feature_slug": "002-routing-gates-memory",
    "current_step": "spec-validation",
    "status": "PASS" | "BLOCKED" | "NEEDS_HUMAN_REVIEW",
    "consecutive_failures": 0,
    "last_failed_step": null | string,
    "last_failed_rule": null | string,
    "last_validator_output": null | string,
    "updated_at": "YYYY-MM-DDTHH:mm:ss.sssZ"
  }
  ```
- **D-20:** **Retry Reset & Transition Rules**:
  - Any successful validation resets `consecutive_failures` to `0` and sets `status` to `PASS`.
  - Any validation failure increments `consecutive_failures` by `1`.
  - If `consecutive_failures < 3`, the validator updates `.ai/state/active-run.json` with status `BLOCKED`, logs the failure classification, and exits with code `1`.
  - If `consecutive_failures >= 3`, the validator updates `.ai/state/active-run.json` with status `NEEDS_HUMAN_REVIEW`, automatically generates `.ai/reviews/<feature-slug>/human-review.md`, and exits with code `10` (Blocked).

### 3. Canonical Specs & Path Drift Check
- **D-21:** **Canonical Feature Spec Paths**: Feature specifications, plans, and checklists must reside under `specs/<feature-slug>/{spec.md,plan.md,tasks.md}`.
- **D-22:** **Legacy Specs Exclusion**: The script must verify that no markdown specs are written under legacy/shadow locations such as `.specify/specs/`, `specs/current`, or `.ai/specs/`. Any matching files trigger a `Path Drift` failure classification.

### 4. Flexible Heading Checks
- **D-23:** **spec.md Heading Rules**:
  - Must contain either an H1 title matching `/^#\s+.+/` or an exact H2 heading `## Goal`.
  - Must contain the following exact headings:
    - `## Non-Goals`
    - `## Acceptance Criteria`
    - `## Test Strategy`
    - `## Behavior-Preservation Rules`
- **D-24:** **plan.md Heading Rules**:
  - Must contain the exact headings:
    - `## Proposed Changes`
    - `## Verification Plan`
- **D-25:** **tasks.md Checklist Rules**:
  - Must contain a markdown list of tasks (e.g., lines starting with `- [ ]` or `- [x]`).

### 5. Failure Classifications & Placeholder Scan
- **D-26:** **Failure Categories**: Failures must be categorized into one of:
  - `Missing Required File`
  - `Missing Required Heading`
  - `Open Clarification`
  - `Path Drift`
  - `Invalid Active Feature Pointer`
  - `Invalid JSON State`
- **D-27:** **Targeted Placeholder Scan**: The script must scan case-insensitively only inside `spec.md`, `plan.md`, and `tasks.md` of the active feature folder for the following forbidden strings:
  - `TODO`
  - `TBD`
  - `NEEDS CLARIFICATION`
  - `[NEEDS CLARIFICATION]`
  - `FIXME`
  - `XXX`
  If found, the validator fails with `Open Clarification` classification.

### 6. Human Review Packet Generation
- **D-28:** **Packet Generation**: When `consecutive_failures` reaches `3`, the validator must write a Markdown packet at `.ai/reviews/<feature-slug>/human-review.md` matching the structure outlined in the PRD, summarizing the spec file path, failed rule, retry count, validator output, and recommended human options.
</decisions>

<canonical_refs>
## Canonical References
- [docs/prd.md](file:///Volumes/D/snail-agent-flow/docs/prd.md) — Definition of pipeline, folder structure, validation rules, and failure modes.
- [.planning/ROADMAP.md](file:///Volumes/D/snail-agent-flow/.planning/ROADMAP.md) — Scope and deliverables for Phase 3.
</canonical_refs>

<code_context>
## Existing Code Insights
- [docs/artifact-registry.md](file:///Volumes/D/snail-agent-flow/docs/artifact-registry.md) — Defines the canonical layout and path ownership.
- [.specify/scripts/bash/validate-gates-and-memory.sh](file:///Volumes/D/snail-agent-flow/.specify/scripts/bash/validate-gates-and-memory.sh) — Reference bash script asserting gate results.
</code_context>

<specifics>
## Specific Ideas
- Integrate the JS validator into local pre-commit hooks or pre-push routines to detect drift early.
</specifics>

<deferred>
## Deferred Ideas
- Interactive prompt options for human reviews using visual companion templates in later phases.
</deferred>
