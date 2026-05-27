# Quickstart: Context Budget Gate and Subagent Orchestration Policy

This guide walks you through configuring, validating, and interacting with the context budget gate and orchestration policy layer.

## 1. Configuring Thresholds

You can customize context pressure limits and subagent caps by creating a policy configuration file at `.ai/state/context-policy.json`:

```json
{
  "schema_version": "1.0",
  "inline_threshold_bytes": 50000,
  "pack_threshold_bytes": 200000,
  "max_parallelism": 3,
  "stage_overrides": {
    "planning_critique": { "outcome": "context_pack_required" }
  },
  "budget_inputs": {
    "include_required_artifacts": true,
    "include_session_logs": true,
    "include_planning_artifacts": true,
    "include_context_packs": true,
    "include_handoff_files": true
  }
}
```

- If this file is missing, conservative defaults apply (50 KB for `inline` execution, 200 KB for `context_pack_required` limit).
- Any stage listed under `stage_overrides` bypasses size estimation and always resolves to the specified outcome.

## 2. Reading Stage Instructions

When running the flow engine or checking status (`node bin/adp.js status`), the output displays the calculated budget outcome and required actions:

```text
═══ NEXT STAGE ═══
Stage:     Plan Critique (planning_critique)
Status:    pending
Skill:     gstack-plan-eng-review

─── CONTEXT POLICY ───
Outcome:   context_pack_required
Est. size: 84.3 KB
Action:    Create .ai/context-packs/<stage>-<timestamp>.json before starting work.
           Reference required files by path. Record omissions.
──────────────────────
═══════════════════
```

## 3. Creating a Context Pack

If the outcome is `context_pack_required`, create a context pack under `.ai/context-packs/` before proceeding:

```json
{
  "schema_version": "1.0",
  "created_at": "2026-05-27T10:30:00Z",
  "stage_id": "planning_critique",
  "objective": "Review implementation plan for the context budget gate",
  "required_decisions": [
    "CONTEXT.md"
  ],
  "required_files": [
    { "path": "specs/017-context-budget-gate/plan.md", "reason": "active implementation plan" }
  ],
  "expected_outputs": [
    { "path": "specs/017-context-budget-gate/research.md", "description": "phase 0 research" }
  ],
  "validation_commands": [
    "npm test"
  ],
  "stop_conditions": [
    "All tests pass successfully"
  ],
  "omissions": []
}
```

Ensure all paths in `required_files` exist and are relative (no `..` or absolute paths).

## 4. Handling Fresh-Session Handoffs

If the outcome is `fresh_session_required`, write `.ai/state/context-handoff.json` to preserve state, then stop your current session:

```json
{
  "schema_version": "1.0",
  "created_at": "2026-05-27T10:35:00Z",
  "resume_stage": "execution",
  "next_skill": "gsd-execute-phase",
  "context_pack_path": ".ai/context-packs/execution-2026-05-27T10-30-00Z.json",
  "verification_commands": [
    "npm test"
  ],
  "open_risks": [],
  "reason": "Accumulated session logs exceeded 200 KB threshold."
}
```

Stop the current session immediately and load the handoff artifact in a clean session.

## 5. Verification & Health Check

Verify configuration files, context packs, and handoff manifests using `adp doctor`:

```bash
node bin/adp.js doctor
```

If any check fails, `adp` will exit with a non-zero code and write a detailed repair guide to `.ai/state/repair-guide.md` explaining the issue.
