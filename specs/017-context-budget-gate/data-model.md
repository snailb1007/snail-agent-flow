# Data Model: Context Budget Gate and Subagent Orchestration Policy

This document defines the key entities, schemas, fields, validation rules, and state transitions for the context budget and subagent orchestration policy layer.

## Key Entities & Schemas

### 1. Context Policy Configuration (`context-policy.json`)
The configuration schema defining budget thresholds and orchestration limits.

**Path**: `.ai/state/context-policy.json` (Optional, defaults apply if missing)

#### Fields:
- `schema_version` (string, required): Format version (e.g. `"1.0"`).
- `inline_threshold_bytes` (integer, required): Maximum estimated byte size allowed for inline stage execution.
- `pack_threshold_bytes` (integer, required): Maximum estimated byte size allowed for stage execution with a context pack. Sizes above this trigger a fresh session.
- `max_parallelism` (integer, required): Maximum number of parallel subagents allowed in fan-out mode (1-10).
- `stage_overrides` (object, required): Map of stage IDs to override rules.
  - Key: `stage_id` (string)
  - Value: `stage_override_object` containing:
    - `outcome` (string, required): One of `"inline"`, `"context_pack_required"`, `"fresh_session_required"`.
- `budget_inputs` (object, required): Booleans determining which inputs are measured during byte-pressure calculation:
  - `include_required_artifacts` (boolean, required)
  - `include_session_logs` (boolean, required)
  - `include_planning_artifacts` (boolean, required)
  - `include_context_packs` (boolean, required)
  - `include_handoff_files` (boolean, required)

#### Validation Rules:
- `inline_threshold_bytes` must be a positive integer.
- `pack_threshold_bytes` must be a positive integer.
- `inline_threshold_bytes` must be strictly less than `pack_threshold_bytes`.
- `max_parallelism` must be an integer between 1 and 10 inclusive.

---

### 2. Context Pack Manifest (`<stage-id>-<timestamp>.json`)
A minimal task descriptor file directing an agent or subagent on a scoped unit of work.

**Path**: `.ai/context-packs/<stage-id>-<iso-timestamp>.json`

#### Fields:
- `schema_version` (string, required): Format version.
- `created_at` (string, required): ISO 8601 creation timestamp.
- `stage_id` (string, required): Target flow stage ID.
- `objective` (string, required): One-sentence description of the task objective.
- `required_decisions` (array of strings, optional): Paths to decision documentation or CONTEXT.md keys.
- `required_files` (array of objects, required): Files to read/edit. Each object has:
  - `path` (string, required): Workspace-relative path to the file.
  - `reason` (string, optional): Rationale for inclusion.
- `allowed_files` (array of objects, optional): Files allowed to read.
- `excluded_files` (array of objects, optional): Files explicitly ignored.
- `omissions` (array of objects, required): Explicitly omitted files or directories.
  - `path` (string, required): Workspace-relative path or glob.
  - `reason` (string, required): Rationale for omission.
- `expected_outputs` (array of objects, required): Target deliverables.
  - `path` (string, required): Workspace-relative path.
  - `description` (string, required): Description of the output.
- `validation_commands` (array of strings, required): Commands to verify work.
- `stop_conditions` (array of strings, required): Criteria to stop execution.
- `subagent_fanout` (object, null/optional): Subagent execution parameters:
  - `group_id` (string, required): Identifier for the group of parallel subagents.
  - `subagent_index` (integer, required): Index of the current subagent.
  - `total_subagents` (integer, required): Total subagents in the group.
  - `write_targets` (array of strings, required): Workspace-relative paths the subagent will modify.
  - `coordination_note` (string, optional): Rules for overlapping/related files.
  - `sequential_inline_fallback` (boolean, required): Flag enabling sequential execution if parallel spawn is unavailable.
  - `join_owner` (string, required): Typically `"parent"`.

#### Validation Rules:
- `required_files` and `expected_outputs` paths must be workspace-relative (no leading `/`, no `..`).
- Every referenced path in `required_files` must exist on the local filesystem.
- `omissions` array must be present (can be empty `[]`).
- If `subagent_fanout` is present:
  - `sequential_inline_fallback` must be true.
  - `join_owner` must be present.
  - Parallel subagents in the same `group_id` must not share write targets unless a `coordination_note` is explicitly provided.

---

### 3. Fresh-Session Handoff Artifact (`context-handoff.json`)
The handover file written when context pressure forces a session restart.

**Path**: `.ai/state/context-handoff.json`

#### Fields:
- `schema_version` (string, required): Format version.
- `created_at` (string, required): ISO 8601 creation timestamp.
- `resume_stage` (string, required): Flow stage ID where execution will resume.
- `next_skill` (string, required): Name of the GSD skill to launch.
- `next_command` (string, optional): Recommended verification or status command.
- `context_pack_path` (string, required): Workspace-relative path to the context pack JSON file.
- `open_risks` (array of strings, optional): Unresolved concerns or known issues.
- `verification_commands` (array of strings, required): Verification commands to run.
- `reason` (string, required): Explanation for the fresh-session handoff.

#### Validation Rules:
- `context_pack_path` must exist on disk.
- `verification_commands` must be a non-empty array.
- `resume_stage` must match a known stage ID from the flow definition.
- `context_pack_path` must be workspace-relative (no leading `/`, no `..`).

## Relationships and State Transitions

```
[ Stage Resolution ]
         |
         v
[ Estimate Budget ] --( Byte Size Heuristic )--> [ Compute Outcome ]
                                                          |
                 +----------------------------------------+----------------------------------------+
                 |                                        |                                        |
                 v                                        v                                        v
          [ Outcome: inline ]              [ Outcome: context_pack_required ]       [ Outcome: fresh_session_required ]
                 |                                        |                                        |
                 |                                        v                                        v
                 |                            [ Create Context Pack ]                    [ Write Context Handoff ]
                 |                                        |                                        |
                 |                                        v                                        v
                 |                              [ Verify Context Pack ]                   [ Verify Handoff File ]
                 |                                        |                                        |
                 +----------------------------------------+                                        v
                                        |                                                    [ Restart Session ]
                                        v                                                          |
                              [ Execute Flow Stage ]                                               v
                                                                                           [ Resume Flow Stage ]
```
