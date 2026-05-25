---
name: project-flow
description: Orchestrates multi-stage feature delivery by reading the project's declarative flow definition, tracking progress through a ledger state file, and instructing agents which skill to invoke next. Supports starting, resuming, and inspecting the flow.
---

# Project Flow Engine

This skill orchestrates a data-driven project workflow. It reads a flow definition (YAML) and a ledger state file (JSON) to determine the current stage, instruct you which skill to invoke, verify artifacts, and advance the flow.

## Quick Start

1. Read the flow definition at `.ai/flows/rough-project-flow.yaml`.
2. Read the ledger state at `.ai/state/flow-ledger.json`.
3. Find the **first stage** with `status: "needs_revision"` (priority) or `status: "pending"`.
4. Output the **Structured Stage Block** (see format below).
5. Invoke the indicated skill or command.
6. After the stage completes, **verify artifacts** and **update the ledger**.

---

## Starting a Flow

When all stages are `pending`, the flow has not started yet.

1. Read `.ai/flows/rough-project-flow.yaml` to load the stage definitions.
2. Read `.ai/state/flow-ledger.json` — all stages should be `pending`.
3. The first stage (typically `decision_discovery`) is your starting point.
4. **Before starting**, update the ledger:
   - Set `stages[0].status` to `"in_progress"`
   - Set `stages[0].started_at` to the current ISO timestamp
   - Set `current_stage` to the first stage's `id`
   - Set the root `updated_at` to now
   - Write the updated JSON back to `.ai/state/flow-ledger.json`
5. Output the Structured Stage Block for the first stage.
6. Invoke the skill.

---

## Resuming a Flow

When returning after a context reset or new session:

1. Read the ledger. Find `current_stage`.
2. Look up that stage's status:
   - If `in_progress`: Check if its required artifacts already exist. If they do, **complete the stage** (see below). If not, remind yourself to complete it.
   - If `needs_revision`: Re-run the stage from scratch.
   - If `done`: Find the next non-done stage.
3. Output the Structured Stage Block for the current/next stage.

---

## Stage Resolution Algorithm

To determine the next stage:

1. Iterate through `stages` in order.
2. Return the **first stage** with `status === "needs_revision"`. (Revisions take priority.)
3. If no `needs_revision`, return the **first stage** with `status === "pending"`.
4. If all stages are `done`, the flow is **complete**. Output a completion message.

---

## Completing a Stage

After you finish a stage's work:

### 1. Verify Required Artifacts

Check each path in the stage's `required_artifacts` (from the flow definition):
- The file **exists** on disk.
- The file is **non-empty** (size > 0 bytes).

Resolve any template variables in the paths first (see Variable Resolution below).

If any artifact is missing or empty, do **not** advance. Report which artifacts need attention.

### 2. Update the Ledger

Apply these changes to `.ai/state/flow-ledger.json`:

```json
// Before (stage in progress):
{
  "id": "decision_discovery",
  "status": "in_progress",
  "artifacts": [],
  "gate_result": null,
  "started_at": "2026-05-25T01:00:00.000Z",
  "completed_at": null,
  "revision_count": 0
}

// After (stage completed):
{
  "id": "decision_discovery",
  "status": "done",
  "artifacts": [
    ".planning/phases/10-flow-engine-skill/10-CONTEXT.md",
    ".planning/phases/10-flow-engine-skill/10-DISCUSSION-LOG.md"
  ],
  "gate_result": null,
  "started_at": "2026-05-25T01:00:00.000Z",
  "completed_at": "2026-05-25T02:30:00.000Z",
  "revision_count": 0
}
```

Also update:
- `current_stage`: Set to the **next non-done stage's ID**, or `null` if all done.
- `updated_at`: Set to the current ISO timestamp.

### 3. Advance to Next Stage

Find the next stage using the Stage Resolution Algorithm. Output its Structured Stage Block. If the flow is complete, report completion.

---

## Triggering a Revision

When you discover a problem during a downstream stage that requires upstream work:

### 1. Check Revision Routing

Look at the current stage's `revision_routing` in the flow definition:

```yaml
revision_routing:
  - on: critique_failed
    to: implementation_plan
  - on: spec_failed
    to: canonical_spec
```

Match the failure type to find the target stage.

### 2. Reset Affected Stages

Reset **all stages from the target through the current stage** (inclusive) to `needs_revision`:

```json
// Example: At revision_loop (index 5), routing to canonical_spec (index 2)
// Reset stages at indices 2, 3, 4, 5

// Each reset stage gets:
{
  "status": "needs_revision",
  "completed_at": null,
  "gate_result": null,
  "artifacts": [],
  "revision_count": 1  // incremented from previous value
}
```

### 3. Update Ledger Metadata

- Set `current_stage` to the **target stage's ID**.
- Append a revision entry to `revision_history`:

```json
{
  "from_stage": "revision_loop",
  "to_stage": "canonical_spec",
  "reason": "Plan critique found incomplete acceptance criteria in the spec.",
  "timestamp": "2026-05-25T03:00:00.000Z"
}
```

- Set `updated_at` to now.
- Write the updated ledger back to disk.

### 4. Resume from Target

Output the Structured Stage Block for the target stage and re-run it.

---

## Variable Resolution

The flow definition uses template variables in artifact paths. Resolve them from project context:

| Variable | Source | Example |
|----------|--------|---------|
| `{phase_id}` | Current phase from `.planning/STATE.md` or conversation context | `10-flow-engine-skill` |
| `{feature_slug}` | `feature_directory` basename from `.specify/feature.json` | `010-flow-engine-skill` |
| `{feature_dir}` | `feature_directory` value from `.specify/feature.json` | `specs/010-flow-engine-skill` |

---

## Structured Output Format

When presenting a stage to execute, use this exact format:

```
═══ NEXT STAGE ═══
Stage:     Decision Discovery (decision_discovery)
Status:    pending
Skill:     gsd-discuss-phase
Command:   node bin/adp.js new-session "discuss"
Artifacts:
  - .planning/phases/{phase_id}-CONTEXT.md [headings: "## Decisions"]
  - .planning/phases/{phase_id}-DISCUSSION-LOG.md [headings: "# Phase"]
Revision Routes: (none)
═══════════════════
```

---

## The Default Flow

The built-in `rough-project-flow` has 10 stages:

| # | Stage | Skill | Purpose |
|---|-------|-------|---------|
| 1 | `decision_discovery` | gsd-discuss-phase | Discover and document decisions |
| 2 | `decision_challenge` | grill-with-docs | Challenge decisions against docs |
| 3 | `canonical_spec` | speckit-specify | Author the canonical specification |
| 4 | `implementation_plan` | speckit-plan | Create the implementation plan |
| 5 | `plan_critique` | plan-ceo-review | Product and engineering critiques |
| 6 | `revision_loop` | speckit-tasks | Address review findings |
| 7 | `vertical_slicing` | speckit-taskstoissues | Split into vertical slices |
| 8 | `execution` | gsd-execute-phase | Implement the slices |
| 9 | `verification` | gsd-verify-work | Run validators and tests |
| 10 | `release_readiness` | gsd-ship | Assess ship readiness |

---

## Files Reference

| File | Purpose | Read/Write |
|------|---------|------------|
| `.ai/flows/rough-project-flow.yaml` | Flow definition (stages, artifacts, routing) | Read |
| `.ai/state/flow-ledger.json` | Ledger state (progress tracking) | Read/Write |
| `.specify/feature.json` | Active feature pointer (for variable resolution) | Read |
| `.planning/STATE.md` | Phase context (for variable resolution) | Read |
| `.specify/templates/rough-project-flow.yaml` | Source template (package default) | — |
