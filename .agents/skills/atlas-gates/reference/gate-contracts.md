# Verification and Judgment Gate Contracts

This document formalizes the contracts, inputs, outputs, and separation of concerns between judgment gates (qualitative markdown-based) and verification gates (deterministic script-based).

## 1. Division of Labor

Snail Agent Flow enforces a strict division of labor between human-like judgment and deterministic code verification:

| Gate Name | Type | Phase | Owner / Mechanism | Objective |
|-----------|------|-------|-------------------|-----------|
| **align-gate** | Judgment | align | Markdown Checklists (`SKILL.md`) | Requirements alignment, scope boundary, and DoR. |
| **trace-review** | Judgment | trace | Markdown Checklists (`SKILL.md`) | Technical plan quality, ADR compliance, and task mapping. |
| **lay-preflight** | Verification | lay | `scripts/lay-preflight.js` | Deterministic verification of failing test, base commit, and active leases. |
| **act-evaluator** | Verification | act | `scripts/act-evaluator.js` | Loop safeguards, profile iteration caps, and stuck state detection. |

---

## 2. Gate Result Schema Contract

All verification gates MUST output a JSON payload to `stdout` conforming to the `gate-result.schema.json` contract (defined in `.claude/skills/contracts/gate-result.schema.json`):

```json
{
  "stage_id": "lay",
  "status": "PASS",
  "blocking": [],
  "warnings": [],
  "artifacts_produced": []
}
```

### Schema Fields

- `stage_id` (string): The ID of the pipeline stage (e.g., `align`, `trace`, `lay`, `act`, `settle`).
- `status` (string): The evaluation result. Must be one of `PASS`, `FAIL`, `BLOCKED`, `NEEDS_HUMAN_REVIEW`.
- `blocking` (array of strings): High-priority errors or blocks that prevent moving to the next phase.
- `warnings` (array of strings): Non-blocking signals or suggestions for the operator.
- `artifacts_produced` (array of strings): Paths to any files generated/validated during this gate execution.

---

## 3. Verification Gate Contracts

### 3.1. `lay-preflight` Gate (Deterministic)
- **Script File**: `.claude/skills/atlas-gates/scripts/lay-preflight.js`
- **Inputs**:
  - `repoRoot` (Command-line Argument 1): Path to the workspace root.
  - `flow-state.json` (Resolved via `lib/artifact-paths`): Read-only state representation.
- **Rules & Invariants**:
  - MUST fail (status `FAIL`) if no unit or validation test file exists under `tests/` or `validators/scripts/`.
  - MUST fail if `last_verified_commit` is missing from `flow-state.json`.
  - MUST fail if the `locks` array in `flow-state.json` is empty (ensures active file leases are held).
- **Exit Code**: `0` on PASS, `1` on FAIL.

### 3.2. `act-evaluator` Gate (Deterministic)
- **Script File**: `.claude/skills/atlas-gates/scripts/act-evaluator.js`
- **Inputs**:
  - `repoRoot` (Command-line Argument 1): Path to the workspace root.
  - `flow-state.json` (Resolved via `lib/artifact-paths`): Read-only state representation.
- **Rules & Invariants**:
  - Enforces iteration limits (attempt counts) based on risk profile:
    - `FAST` cap: 3 attempts.
    - `STANDARD` cap: 5 attempts.
    - `FULL` cap: 8 attempts.
    - `BUGFIX` / `PROTOTYPE` mode override cap: 5 attempts.
  - MUST block (status `BLOCKED`) if `state.attempt` exceeds the corresponding profile cap.
  - Stuck execution detection: If `consecutive_failures >= 2`, emits a warning about stuck step state.
- **Exit Code**: `0` on PASS, `1` on BLOCKED.
