# Phase 19: ATLAS Refactor — Research

**Researched:** 2026-05-28
**Status:** Complete

---

## 1. Current Architecture Summary

**Current state: 10-stage sequential flow** (`rough-project-flow.yaml`)
- Stages: decision_discovery → decision_challenge → canonical_spec → implementation_plan → plan_critique → revision_loop → vertical_slicing → execution → verification → release_readiness
- All stages defined in `.ai/flows/rough-project-flow.yaml` (140 lines)
- Ledger at `.ai/state/flow-ledger.json` (v1, no schema_version field)
- Dual state: `flow-ledger.json` + `run-state.json` (PRD calls for consolidation into `flow-state.json`)

**Target: 5-stage ATLAS Loop** (PRD v4.2)
- Stages: align → trace → lay → act → settle
- 4 custom skills: `atlas-routing`, `atlas-gates`, `atlas-settle`, `atlas-review`
- Decoupled Risk Profile (FAST/STANDARD/FULL) × Work Mode (FEATURE/BUGFIX/PROTOTYPE/REFACTOR/DOCS)
- Single state file: `flow-state.json` (schema_version 2.0) replacing both `flow-ledger.json` and `run-state.json`

---

## 2. Module API Inventory

### `lib/flow-engine.js` (525 lines, 18KB)

| Function | Signature | ATLAS Impact |
|---|---|---|
| `VALID_STATUSES` | constant `['pending','in_progress','done','blocked','needs_revision']` | Keep, possibly extend |
| `validateLedger(ledger, repoRoot?)` | → `{valid, errors[]}` | Must adapt to schema v2.0 |
| `resolveNextStage(ledger, flowDef, repoRoot?, vars?)` | → `{ledgerStage, flowStage, contextPolicy}` | Needs profile-aware skip logic |
| `resolveTemplatePath(templatePath, variables)` | → `string` | Extend for `{{dotted.alias}}` via artifact-map.json |
| `checkArtifacts(flowStage, repoRoot, variables?)` | → `{passed, results[]}` | Reuse as-is |
| `advanceStage(ledger, stageId, artifacts)` | → mutated ledger | Subagent guard stays; stage IDs change |
| `triggerRevision(ledger, fromStage, toStage, reason)` | → mutated ledger | Keep, revision routing changes |
| `formatStageInstruction(flowStage, ledgerStage, contextPolicy?)` | → formatted string | Update for ATLAS stage names |
| `checkStagePrerequisites(flowStage, prerequisites, cwd?)` | → `{passed, results[]}` | Keep |
| `handleSpecDrift(ledger, current, target, reason)` | → mutated ledger | Keep — wraps triggerRevision |
| `triggerContextHandoff(ledger, stageId, options, dir)` | → handoff path | Keep |
| `handleLeaseCollision(retryCount, maxRetries?)` | → delay ms | Keep |

**Critical:** `advanceStage` and `triggerRevision` check `process.env.SUBAGENT === 'true'` and throw — subagent protection enforced in engine.

### `lib/profile-scorer.js` (62 lines, 1.4KB)
- `score(task)` → `{total, profile, dimensions}`
- 5 dimensions: novelty, blast_radius, ambiguity, reversibility, user_biz_risk (each 0-2)
- Override: `task.override` can force BUGFIX or PROTOTYPE
- **ATLAS wraps directly — no changes needed**

### `lib/ownership-store.js` (253 lines, 7.6KB)
- `OwnershipStore(baseDir)` — atomic file-based locking with PID+TTL
- Methods: `acquire(key, owner, opts)`, `release(key, owner)`, `list()`

### `lib/claim-manager.js` (4.4KB) / `lib/lease-manager.js` (3.5KB)
- Thin wrappers over OwnershipStore
- ClaimManager: `claim()`, `release()`, `status()`, `list()`
- LeaseManager: `acquire()`, `release()`, `list()`

### `lib/signal-logger.js` (1.5KB) / `lib/checkpoint-writer.js` (2.5KB)
- Signal: `logSignal(type, value, reason, targetDir)`
- Checkpoint: `writeProfileSwitch({from, to, reason, ...}, targetDir)`

### `lib/context-budget.js` (5.9KB)
- `loadPolicyConfig(repoRoot)` — reads `.ai/state/context-policy.json`
- `estimateBudget(flowStage, repoRoot, variables)` → `{totalBytes, inputs[]}`
- `computeOutcome(totalBytes, stageId, policyConfig)` → `'inline' | 'context_pack_required' | 'fresh_session_required'`

### `lib/init-checks.js` (28KB)
- `runStrictChecks(repoRoot)` — validates entire project setup
- References `flow-ledger.json` by name — must update to `flow-state.json`

---

## 3. CLI Commands (`bin/adp.js`)

| Command | ATLAS Impact |
|---|---|
| `init` | Must create `flow-state.json` instead of `flow-ledger.json`; add atlas skill localization |
| `status` | Must read `flow-state.json` schema v2.0 |
| `doctor` | Must validate `flow-state.json`; add drift validation call |
| `score` | Keep (wraps profile-scorer) |
| `claim` | Keep |
| `lease` | Keep |
| `checkpoint` | Keep |
| `signal` | Keep |

---

## 4. Test Infrastructure

**Test runner:** Pure Node.js assert pattern (no framework). All tests in `validators/scripts/`.

| Test File | Covers |
|---|---|
| `test-flow-engine.js` (771 lines) | validateLedger, resolveNextStage, advanceStage, triggerRevision, etc. |
| `test-profile-scorer.js` (104 lines) | Score calculation, thresholds, override, invalid input |
| `test-ownership-store.js` | Acquire, release, stale detection |
| `test-claim-manager.js` | Claim lifecycle |
| `test-lease-manager.js` | Lease lifecycle |
| `test-context-budget.js` | Budget estimation, policy loading |
| `test-init-checks.js` | Strict checks |
| `test-checkpoint-writer.js` | Profile switch writing |
| `test-signal-logger.js` | Signal logging |
| `test-cli.js` (52KB) | CLI integration |

**Test pattern:** Table-driven with manual `assert()`, `assertDeepEqual()`, `assertThrows()`. Uses `fs.mkdtempSync()` for isolated test dirs.

---

## 5. Migration Analysis (flow-ledger → flow-state)

### Current Schema (v1)
```json
{
  "flow_name": "rough-project-flow",
  "flow_version": "1.0.0",
  "flow_definition_path": ".ai/flows/rough-project-flow.yaml",
  "current_stage": "decision_discovery",
  "stages": [{ "id", "name", "status", "artifacts", "gate_result", "started_at", "completed_at", "revision_count" }],
  "revision_history": []
}
```

### Target Schema (v2.0)
```json
{
  "schema_version": "2.0",
  "run_id": "run_...",
  "feature_slug": "...",
  "risk_profile": "STANDARD",
  "work_mode": "FEATURE",
  "stage": "act",
  "status": "running",
  "attempt": 2,
  "last_verified_commit": "...",
  "completed_steps": ["align.score", "trace.spec-lite"],
  "pending_step": "act.slice-002",
  "locks": [],
  "signals": [],
  "last_gate": "...",
  "last_gate_status": "PASS",
  "consecutive_failures": 0,
  "retry_count": 0,
  "verified_artifacts": []
}
```

### Breaking Changes
1. `stages[]` array → flat `stage` + `completed_steps[]` + `pending_step`
2. `flow_name`/`flow_version` → `schema_version` + `run_id`
3. New fields: `risk_profile`, `work_mode`, `attempt`, `last_verified_commit`, `locks`
4. `run-state.json` fields merged in

---

## 6. Integration Points

- `init-checks.js` checks for `.ai/state/flow-ledger.json` — must update
- `bin/adp.js` references `flow-ledger.json` during init
- `project-flow` skill references `flow-ledger.json` 6+ times
- `resolveNextStage()` already computes context policy — keep

---

## 7. Risk Analysis

| Risk | Severity | Mitigation |
|---|---|---|
| Ledger schema break | HIGH | Write `migrate-ledger.js` first, test idempotency |
| init-checks.js regression | HIGH | 28KB of validation logic references ledger by name |
| test-flow-engine.js rewrite | MEDIUM | 771 lines with hardcoded 10-stage mocks |
| Dual-state elimination | MEDIUM | `run-state.json` read by doctor and validator |
| resolveTemplatePath extension | MEDIUM | `{{dotted.alias}}` alongside `{simple_var}` |
| 78 existing skills | LOW | Anti-goal: DON'T rewrite, just wrap |

---

## 8. Recommendations for Planning

1. **Foundation first:** `lib/artifact-paths.js` + `contracts/artifact-map.json` + schema contracts
2. **New flow definition:** `atlas-flow.yaml` + `lib/flow-state.js`
3. **Engine adaptation:** Update `flow-engine.js` for v2.0 schema + profile-aware skipping
4. **Gate scripts:** New `lay-preflight.js`, `act-evaluator.js`, `settle.js`, `release-locks.js`
5. **ATLAS skills:** 4 SKILL.md files with progressive disclosure
6. **CLI + init-checks:** Update `bin/adp.js` init/doctor/status, init-checks path refs
7. **Tests:** New 5-stage mocks, migration tests, artifact-paths tests
8. **Drift validator:** `lib/validate-drift.js` per PRD §6.4

**Key constraint:** Anti-goal "KHÔNG migrate task GSD đang chạy — drain tự nhiên" means migration must be non-destructive, old flow remains runnable.

## RESEARCH COMPLETE
