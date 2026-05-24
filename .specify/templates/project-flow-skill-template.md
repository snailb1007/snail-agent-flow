---
name: project-flow
description: Read and follow the project's declarative flow definition to coordinate multi-stage feature delivery. Tracks stage progress through a ledger state file.
---

# Project Flow

This skill provides agent access to the project's declarative flow engine.

## Quick Start

1. Read the flow definition at `.ai/flows/rough-project-flow.yaml` to understand the stage sequence.
2. Read the ledger state at `.ai/state/flow-ledger.json` to see which stage is current.
3. Find the first stage with `status: "pending"` or `status: "needs_revision"` — that is your next action.
4. Follow the stage's `skill` or `command` field to invoke the correct tool.
5. After completing a stage, verify its required artifacts exist before advancing.

## Flow Definition

The flow definition at `.ai/flows/rough-project-flow.yaml` declares:

- **stages**: Ordered list of stages, each with an `id`, `skill`, `command`, `required_artifacts`, and `revision_routing`.
- **prerequisites**: Tools and skills that must be available before starting the flow.

The default flow is `rough-project-flow` with 10 stages:

1. `decision_discovery` — Discover and document decisions
2. `decision_challenge` — Challenge decisions against docs and constraints
3. `canonical_spec` — Author the canonical specification
4. `implementation_plan` — Create the implementation plan
5. `plan_critique` — Run product and engineering critiques
6. `revision_loop` — Address review findings
7. `vertical_slicing` — Split into vertical issue slices
8. `execution` — Implement the slices
9. `verification` — Run validators and tests
10. `release_readiness` — Assess ship readiness

## Ledger State

The ledger at `.ai/state/flow-ledger.json` tracks:

- `current_stage`: ID of the first non-done stage
- `stages[].status`: One of `pending`, `in_progress`, `done`, `blocked`, `needs_revision`
- `stages[].artifacts`: Verified artifact paths with timestamps
- `stages[].gate_result`: Pass/fail result of artifact gate checks
- `revision_history`: Audit trail of stage resets

## Current Limitations

> **Note:** This is a stub skill. Full flow orchestration (automatic stage advancement, artifact gate checking, and revision loop routing) will be added in a future version. For now, read the flow definition and ledger manually to determine your next action.

## Files

| File | Purpose |
|------|---------|
| `.ai/flows/rough-project-flow.yaml` | Flow definition (stages, artifacts, routing) |
| `.ai/state/flow-ledger.json` | Ledger state (progress tracking) |
| `.specify/templates/rough-project-flow.yaml` | Source template (package default) |
