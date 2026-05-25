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
4. **Verify prerequisite tools** for that stage (see Prerequisite Tool Verification below). If any are missing, halt and mark the stage as `"blocked"`.
5. Output the **Structured Stage Block** (or Prerequisite Warning Block if blocked).
6. Invoke the indicated skill or command.
7. After the stage completes, **verify artifacts** and **update the ledger**.

---

## Starting a Flow

When all stages are `pending`, the flow has not started yet.

1. Read `.ai/flows/rough-project-flow.yaml` to load the stage definitions.
2. Read `.ai/state/flow-ledger.json` — all stages should be `pending`.
3. The first stage (typically `decision_discovery`) is your starting point.
4. **Verify prerequisite tools** for the first stage. If missing, update status to `"blocked"`, output the Prerequisite Warning Block, and halt.
5. If prerequisites are satisfied, **before starting**, update the ledger:
   - Set `stages[0].status` to `"in_progress"`
   - Set `stages[0].started_at` to the current ISO timestamp
   - Set `current_stage` to the first stage's `id`
   - Set the root `updated_at` to now
   - Write the updated JSON back to `.ai/state/flow-ledger.json`
6. Output the Structured Stage Block for the first stage.
7. Invoke the skill.

---

## Resuming a Flow

When returning after a context reset or new session:

1. Read the ledger. Find `current_stage`.
2. Look up that stage's status:
   - If `blocked`: Re-verify the prerequisites. If now available, set status to `"in_progress"`, update the ledger, and proceed. If still missing, output the Prerequisite Warning Block and halt.
   - If `in_progress`: Check if its required artifacts already exist. If they do, **complete the stage** (see below). If not, remind yourself to complete it.
   - If `needs_revision`: Re-run the stage from scratch.
   - If `done`: Find the next non-done stage.
3. Output the Structured Stage Block (or Prerequisite Warning Block) for the current/next stage.

---

## Prerequisite Tool Verification

Before starting or advancing to any stage, you MUST verify that the required prerequisite tool for that stage's skill is installed.

### 1. Map Stage to Prerequisite
Lookup the `prerequisites` array in `.ai/flows/rough-project-flow.yaml` and find the entry whose `name` or `command` matches the current stage's `skill` or `command` property (case-insensitively).

### 2. Verify Tool Availability
Check if the tool is available using `validatePrerequisites` logic:
- Check if the skill folder exists in `.agents/skills/<name>` or `.claude/skills/<name>`.
- Check if the skill folder exists in your home directory `~/.gemini/config/skills/<name>`.
- If a `command` is defined, check if it exists on the system PATH.

### 3. Handle Missing Prerequisites (Halt and Block)
If the tool is **missing**:
- Update `.ai/state/flow-ledger.json` setting the stage status to `"blocked"`.
- Set the root `updated_at` to the current ISO timestamp and write it back.
- Output the **Prerequisite Warning Block** instead of the normal stage instruction:

```text
⚠️ PREREQUISITE WARNING
Stage:        {Stage Name} ({Stage ID})
Missing:      {Tool Name} ({Prerequisite Command})
Purpose:      {Tool Purpose/Description}
Instructions: {Tool Installation Instructions}

Flow execution is BLOCKED. Please install the tool and run 'adp doctor' to re-verify.
```

- **Halt execution** and do not advance or run any commands for this stage until the user installs the tool.

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
