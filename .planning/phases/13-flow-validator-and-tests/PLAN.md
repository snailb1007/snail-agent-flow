# Phase 13 — Flow Validator and Tests

**Requirements:** FVALID-01, FVALID-02, FVALID-03, FVALID-04
**Pattern reference:** `validators/scripts/validate-spec.js` (Spec-Kit validator), `lib/flow-engine.js#validateLedger`
**ADR alignment:** [0002 — Deterministic Spec Validator](../../../docs/adr/0002-deterministic-spec-validator.md) (same deterministic, LLM-free pattern)

## Goal

Add a deterministic Flow Validator that catches flow-definition syntax errors, ledger corruption, and skill-reference drift before they reach the Flow Engine, plus a test suite covering happy path, gate failures, revision loops, and corruption.

## Command surface

| Surface | Purpose |
|---|---|
| `node bin/adp.js flow validate [--flow <path>] [--ledger <path>]` | Primary CLI entry |
| `npm run validate:flow` | Thin wrapper, CI parity |
| `adp doctor` | Calls flow validator when a ledger exists in cwd |

Auto-resolution when flags omitted:
- `--flow` defaults to `flow_definition_path` from the ledger, else `.flow/flow.yaml`, else `.specify/templates/rough-project-flow.yaml`.
- `--ledger` defaults to `.ai/flow-ledger.json` when present.

## Validation modes

The validator selects a mode from the inputs it receives.

### 1. Flow-only (definition syntax)

- Required top-level keys: `name` (string), `version` (string|number), `stages[]` (non-empty array).
- Each stage requires: `id` (string), `skill` (string). Optional: `name`, `description`, `command`, `required_artifacts[]`, `revision_routing[]`.
- No duplicate `stage.id` values.
- `revision_routing[].to` must reference an existing `stage.id`.
- No circular revision routes (DFS over the routing graph).
- `required_artifacts[].path` is a non-empty string; placeholders like `{phase_id}`, `{feature_slug}`, `{feature_dir}` are allowed and not resolved here.
- `prerequisites[]` (if present): each entry has `name` + `command`; `check` is optional.

### 2. Ledger-only (state consistency)

- Re-uses `flow-engine.validateLedger` for status enum and required fields.
- Adds: `current_stage` (when non-null) must exist in `stages[]`.
- Status monotonicity: no `pending` stage appears after a `done` stage of higher index unless an entry in `revision_history` justifies it (revision flips a later stage back to `needs_revision`/`pending`).
- `revision_history[].from` and `.to` reference real stage ids.
- When both `started_at` and `completed_at` are set, `started_at <= completed_at`.
- `flow_version` is a string (already enforced at creation).

### 3. Paired (flow + ledger cross-check)

- Every ledger `stages[].id` exists in flow `stages[].id` (no orphans).
- Every flow `stages[].id` exists in the ledger (no missing entries unless `--allow-partial`).
- `ledger.flow_name === flow.name`.
- `ledger.flow_version === String(flow.version)` — mismatch emits **warning** `FLOW_VERSION_DRIFT`, not error, so brownfield upgrades stay unblocked.

### 4. Skill Reference Check (FVALID-03)

Pure cross-reference within the flow definition itself:
- For each stage, `stage.skill` must equal some `prerequisites[].command`.
- Mismatch → **warning** `UNKNOWN_SKILL_REFERENCE`, never error. Runtime authority belongs to the Phase 12 tool-checker.

## Output contract

JSON envelope (mirrors existing validator):

```json
{
  "ok": true,
  "mode": "paired",
  "errors": [{ "code": "STAGE_REFERENCE_INVALID", "message": "...", "path": "current_stage" }],
  "warnings": [{ "code": "UNKNOWN_SKILL_REFERENCE", "message": "...", "path": "stages[3].skill" }]
}
```

Human-readable mode (default when stdout is a TTY) mirrors `validate-spec.js` formatting.

**Exit codes:** `0` ok • `1` errors present • `2` invocation/IO error.

**Error code catalogue (initial):** `FLOW_MISSING_KEY`, `FLOW_DUPLICATE_STAGE_ID`, `FLOW_REVISION_TARGET_MISSING`, `FLOW_CIRCULAR_REVISION_ROUTE`, `FLOW_ARTIFACT_PATH_INVALID`, `LEDGER_INVALID_STATUS`, `LEDGER_CURRENT_STAGE_MISSING`, `LEDGER_TRANSITION_INVALID`, `LEDGER_REVISION_REF_MISSING`, `LEDGER_TIMESTAMP_INVERTED`, `PAIR_STAGE_ORPHANED`, `PAIR_STAGE_MISSING`, `PAIR_FLOW_NAME_MISMATCH`. **Warnings:** `FLOW_VERSION_DRIFT`, `UNKNOWN_SKILL_REFERENCE`, `LEDGER_BROWNFIELD_DEFAULT`.

## Files

| File | Action | Notes |
|---|---|---|
| `lib/flow-validator.js` | **new** | Pure functions: `validateFlow(def)`, `validateLedgerDeep(ledger)`, `validatePaired(def, ledger)`, `validateAll({ flowPath, ledgerPath })`. No I/O inside the three pure functions; only `validateAll` reads files. |
| `bin/adp.js` | **edit** | Add `flow validate` subcommand parser; call `validateAll`; pretty-print or emit JSON via `--json`. Add doctor integration block. |
| `package.json` | **edit** | Add scripts: `validate:flow`, `test:flow-validator`. Extend `test` script. |
| `validators/scripts/test-flow-validator.js` | **new** | Assert-based test runner matching `test-flow-engine.js` style. |
| `validators/fixtures/flow-validator/` | **new dir** | YAML + JSON fixtures listed below. |

## Test plan (FVALID-04)

Each test loads a fixture pair and asserts on `{ok, errors[].code, warnings[].code}`.

| Fixture | Expected |
|---|---|
| `happy-path.flow.yaml` + `happy-path.ledger.json` (10-stage rough-project-flow, clean) | `ok=true`, no errors |
| `gate-failure.ledger.json` (stage with `gate_result.passed=false`, status `blocked`) | `ok=true`, warning `LEDGER_BROWNFIELD_DEFAULT` only if applicable; primary assertion: validator does **not** treat gate failure as corruption |
| `revision-loop.flow.yaml` (decision_challenge → decision_discovery) | `ok=true` (legitimate route) |
| `circular-route.flow.yaml` (A → B → A) | error `FLOW_CIRCULAR_REVISION_ROUTE` |
| `corrupt-current-stage.ledger.json` (`current_stage="ghost"`) | error `LEDGER_CURRENT_STAGE_MISSING` |
| `inverted-timestamps.ledger.json` (`started_at > completed_at`) | error `LEDGER_TIMESTAMP_INVERTED` |
| `orphan-ledger-stage.json` paired with `happy-path.flow.yaml` | error `PAIR_STAGE_ORPHANED` |
| `missing-ledger-stage.json` paired with `happy-path.flow.yaml` (no `--allow-partial`) | error `PAIR_STAGE_MISSING` |
| `unknown-skill.flow.yaml` (stage skill absent from prerequisites) | `ok=true`, warning `UNKNOWN_SKILL_REFERENCE` |
| `version-drift.ledger.json` (`flow_version="0.9.0"` vs flow `version=1.0.0`) | `ok=true`, warning `FLOW_VERSION_DRIFT` |
| `duplicate-stage-id.flow.yaml` | error `FLOW_DUPLICATE_STAGE_ID` |
| `brownfield-minimal.ledger.json` (missing `revision_history`) | error `LEDGER_INVALID_STATUS`-class (revision_history required) — confirms existing engine invariant |

Test runner exits non-zero on any case mismatch. Wired into `npm test` after `test:cli`.

## Success criteria (mapped to roadmap)

| Roadmap criterion | Verified by |
|---|---|
| `npm run validate:flow` catches definition syntax errors, ledger corruption, and invalid references | All `FLOW_*`, `LEDGER_*`, `PAIR_*` error codes have a fixture |
| Tests cover normal completion, revision routing, gate blocking, and brownfield merge | happy-path, revision-loop, gate-failure, brownfield-minimal fixtures |
| CI can run flow validation alongside existing spec validation | `npm run validate:flow` added; `npm test` chains both |

## Out of scope

- Resolving artifact path placeholders (`{phase_id}` etc.) — belongs to the Flow Engine at execution time.
- Running `prerequisites[].check` shell commands — that is the Phase 12 tool-checker's job.
- LLM-based plausibility checks on skill names or stage descriptions.
- Repairing corruption — validator reports only; repair is a future phase.

## Task breakdown

1. Create `lib/flow-validator.js` skeleton with the three pure functions and error-code constants.
2. Implement `validateFlow` + unit fixtures (happy-path, duplicate-stage, circular-route, unknown-skill).
3. Implement `validateLedgerDeep` extending `flow-engine.validateLedger`.
4. Implement `validatePaired` cross-checks.
5. Implement `validateAll` (I/O wrapper) with YAML + JSON loaders reusing `lib/yaml-parser.js`.
6. Add `flow validate` subcommand to `bin/adp.js`, including `--json`, `--flow`, `--ledger`, `--allow-partial`.
7. Add doctor integration: when `.ai/flow-ledger.json` exists, run validator and append to doctor report.
8. Write `validators/scripts/test-flow-validator.js` + all fixtures.
9. Update `package.json` scripts: `validate:flow`, `test:flow-validator`, chain into `test`.
10. Update `README.md` "Verification Commands" block with `npm run validate:flow`.
11. Run full `npm test` locally; ensure green.

## Verification

- `npm run validate:flow` against the live `rough-project-flow.yaml` and any generated `.ai/flow-ledger.json` exits 0.
- `npm run test:flow-validator` passes all fixture cases.
- `npm test` (full suite) stays green.
- `adp doctor` reports a flow-validator section when a ledger exists.
