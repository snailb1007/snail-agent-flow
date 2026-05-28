# PRD v4.2: ATLAS Loop — Risk-Adaptive Flow Protocol (Revised)

A highly structured, 5-stage project execution protocol (`ATLAS Loop`) leveraging ready-made developer capabilities for execution mechanics, consolidating custom gates/observability into 4 key skills, decoupling risk profile from work mode, and enforcing artifact ownership through a canonical Artifact Contract.

---

## 1. Goal & Architecture

Consolidate the ATLAS protocol into 4 custom skills containing deterministic utility scripts and schema contracts. Re-use Spec Kit for specification mechanics, decouple risk profiles from work modes, transition state tracking to a durable flow state snapshot, and enforce canonical artifact ownership to prevent path fragmentation.

```text
  A (Align)   →   T (Trace)   →   L (Lay)   →   A (Act)   →   S (Settle)
 (Stage: align)  (Stage: trace)  (Stage: lay)  (Stage: act)  (Stage: settle)

     ↑                                                              │
     └─────────────────────────── Observability Bus ────────────────┘
```

---

## 2. Decoupled Taxonomy: Risk Profile & Work Mode

To prevent taxonomy overlap, the protocol splits the task categorization into two orthogonal axes:

### 2.1. Risk Profiles (Determines Rigor)
Calculated via the Scoring Rubric (Appendix A):
* **FAST (Score: 0-2)**: Minimal rituals. Direct execution, targeted preflight, and Settle-Lite.
* **STANDARD (Score: 3-5)**: Spec-lite, tasks checklist, local verification, and Codex review pass.
* **FULL (Score: 6+)**: Comprehensive spec, implementation plans, peer review gate, Codex review, and human review gate.

### 2.2. Work Modes (Determines Stage Behavior)
* **FEATURE**: Standard new capability path.
* **BUGFIX**: Focuses on root-cause isolation and reproduction tests. Skips full spec.
* **PROTOTYPE**: Skip spec validation, skip S2 Ship (no PR merge), force S4 Close cleanup.
* **REFACTOR**: Codebase maintenance. Enforces regression testing.
* **DOCS**: Documentation updates. Skips test setup and coding iterations.

---

## 3. Durable Flow State

The flow state (`flow-state.json`, formerly `flow-ledger.json`) is the **current-state snapshot with append-only audit trail**. It is NOT a pure event log — stages are mutated in-place for current status, while `revision_history` is append-only for auditability.

This file consolidates the former `run-state.json` (deprecated) to eliminate dual source-of-truth.

```json
{
  "schema_version": "2.0",
  "run_id": "run_01j7z...",
  "feature_slug": "018-pure-task-scoring-profile",
  "risk_profile": "STANDARD",
  "work_mode": "FEATURE",
  "stage": "act",
  "status": "running",
  "attempt": 2,
  "last_verified_commit": "dd73523",
  "completed_steps": [
    "align.score",
    "align.claim",
    "trace.spec-lite",
    "trace.task-checklist",
    "lay.base-commit",
    "lay.failing-test",
    "lay.leases"
  ],
  "pending_step": "act.slice-002",
  "locks": [
    {
      "file": "lib/profile-scorer.js",
      "acquired_at": "2026-05-28T18:00:00Z"
    }
  ],
  "signals": [],
  "last_gate": "Spec-Validation",
  "last_gate_status": "PASS",
  "consecutive_failures": 0,
  "retry_count": 0,
  "verified_artifacts": []
}
```

> **Migration**: `lib/migrate-ledger.js` auto-converts `flow-ledger.json` → `flow-state.json` and merges `run-state.json` fields on first load.

---

## 4. Consolidated Skill Architecture

Custom ATLAS controls are grouped into 4 skills. Progressive disclosure is used. **Deterministic verification** (exit codes, file checks, schema validation) is extracted to utility scripts. **Interpretive judgment** (DoR assessment, spec quality) remains as SKILL.md instructions.

```text
.claude/skills/
├── atlas-routing/
│   ├── SKILL.md                  # Routing, transition & external skill integration
│   ├── reference/stages.md       # Stage definitions
│   ├── reference/profiles.md     # Risk & Work Mode rules
│   └── scripts/
│       ├── score-and-claim.js    # Claim wx open & scoring logic
│       ├── transition.js         # Resolves next stage & skips
│       └── migrate-ledger.js     # Auto-converts flow-ledger → flow-state
├── atlas-gates/
│   ├── SKILL.md                  # Judgment gates (align-gate, trace-review)
│   ├── reference/gate-contracts.md
│   └── scripts/
│       ├── lay-preflight.js      # [VERIFICATION] Test fails + leases check
│       └── act-evaluator.js      # [VERIFICATION] Iteration cap & stuck detection
├── atlas-settle/
│   ├── SKILL.md                  # Close-out protocols (S4 Close, S5 Learn = judgment)
│   ├── reference/settle-contract.md
│   └── scripts/
│       ├── settle.js             # [VERIFICATION] S1 Verify + S3 Validate
│       ├── release-locks.js      # Mandatory claims & leases release
│       └── signal-log.js         # Appends JSON signals
├── atlas-review/
│   ├── SKILL.md                  # PR review policies
│   └── reference/review-policy.md
└── contracts/                    # Schema contracts (shared across all skills)
    ├── artifact-map.json         # Canonical path registry (location-of)
    ├── entities.schema.json      # Claim, lease, signal, state shapes (shape-of)
    └── gate-result.schema.json   # Gate output envelope (interface)
```

### 4.1. Gate Implementation Split

| Gate | Type | Implementation | Rationale |
|------|------|---------------|----------|
| `align-gate` | Judgment | SKILL.md | DoR is interpretive assessment |
| `trace-review` | Judgment | SKILL.md | Spec quality is interpretive |
| `lay-preflight` | Verification | JS script | Test exit code + file existence = deterministic |
| `act-evaluator` | Verification | JS script | Iteration count + stuck detection = deterministic |
| Settle S1/S3 | Verification | JS script | npm test + smoke test = deterministic |
| Settle S4/S5 | Judgment | SKILL.md | Retro notes = interpretive |

**Rule**: If a gate has an **exit code** or **file existence check** → code script. If a gate needs to **interpret meaning** → SKILL.md.

---

## 5. Stage Execution & Spec-Kit Integration

### 5.1. Stage A: Align (`align`)
* **Actions**:
  1. Score task risk and select risk profile.
  2. Classify work mode.
  3. Claim work unit.
  4. Write intent + acceptance check.
* **Gate**: `align-gate` DoR verification (skipped for `FAST`).

### 5.2. Stage T: Trace (`trace`)
* **Actions**:
  - **FAST**: `Trace-Min` (simple markdown checklist, no formal spec).
  - **STANDARD**: Spec-lite + task checklist using Spec-Kit.
  - **FULL**: Enforce full Spec-Kit flow (`speckit-specify` → `speckit-plan` → `speckit-tasks`).
  - **BUGFIX**: Document reproduction notes + failing test target.
* **Gate**: `trace-review` gate (enforces Spec/Task consistency; tie-breaker rules apply for `FULL`).

### 5.3. Stage L: Lay (`lay`)
* **Actions**:
  1. Record pre-execution git commit hash.
  2. Implement a failing test / characterization test.
  3. Acquire advisory leases for files to be modified.
  4. Document rollback plan (including non-code states like DB, infra, flags).
* **Gate**: `lay-preflight` (verifies test fails, commits are tracked, and leases are acquired).

### 5.4. Stage A: Act (`act`)
* **Actions**:
  - Execute one vertical slice at a time.
  - Run targeted local tests.
  - No broad refactoring unless profile escalates.
* **Gate**: `act-evaluator` controls loop (FAST cap = 3, STANDARD = 5, FULL = 8, BUGFIX/PROTOTYPE = 5).

### 5.5. Stage S: Settle (`settle`)
* **Actions**:
  - **S1 Verify**: Run full local validation suite (`npm test`).
  - **S2 Ship**: Push branch / create PR (skipped for `FAST` and `PROTOTYPE`).
  - **S2.5 Review**: Request Codex PR review for `STANDARD` and `FULL`. Enforce human review sign-off for `FULL`.
  - **S3 Validate**: Smoke test / prod monitor verify.
  - **S4 Close (Mandatory)**: Release claims and file leases.
  - **S5 Learn**: Write retro notes and log final signals.

---

## 6. ATLAS Artifact Contract

The Artifact Contract is the sole authority for canonical paths, schemas, and ownership. Every skill — internal (ATLAS) or external (Matt, Spec Kit, Codex, GStack) — operates through this contract.

### 6.1. Artifact Ownership Matrix

| Artifact | Source of Truth | Write Access | Mutate? |
|----------|----------------|-------------|--------|
| `flow-state.json` | `.ai/state/flow-state.json` | ATLAS engine only | Yes |
| Claims | `.ai/claims/*.json` | ATLAS claim adapter | Create/delete only |
| Locks/leases | `.ai/locks/*.json` | ATLAS lease adapter | Create/delete only |
| Signals | `.ai/signals/current-period.jsonl` | ATLAS settle/signal only | Append-only |
| Feature spec | `specs/{feature_slug}/spec.md` | Trace adapter (via Spec Kit) | Yes |
| Plan/tasks | `specs/{feature_slug}/plan.md`, `tasks.md` | Trace adapter (via Spec Kit) | Yes |
| Context/memory | `CONTEXT.md`, `docs/adr/*.md`, `.ai/memory/*.md` | ATLAS-approved memory adapter | Append/update sections |
| Review packets | `.ai/reviews/{run_id}/*.md` | Review adapter | Append-only |
| Session logs | `.ai/sessions/{run_id}.md` | ATLAS engine / handoff | Yes |
| Staging area | `.ai/staging/{run_id}/*` | Any adapter (disposable) | Yes |
| External issues | GitHub/GitLab | Optional sync adapter only | Mirror only |

### 6.2. External Skill Integration Rule

```
External skill may produce suggestions.
ATLAS adapter decides what becomes canonical.
```

All external skill output flows through a staging area before promotion:

```text
External Skill Output → .ai/staging/{run_id}/   → ATLAS adapter normalizes
                        (raw, disposable)          → specs/{feature_slug}/  (canonical)
```

Examples:
- Matt `/to-prd` → `.ai/staging/{run_id}/matt-to-prd.md` → adapter → `specs/{slug}/spec.md`
- Matt `/to-issues` → `.ai/staging/{run_id}/issue-candidates.md` → adapter → GitHub (only if `profile=FULL` or user allows)
- Codex review → `.ai/reviews/{run_id}/codex-review.md` (direct, review artifacts are append-only)

### 6.3. Template Variable Aliases

Artifact references in ATLAS skills use `{{dotted.alias}}` syntax (double-brace for artifact aliases, single-brace `{simple_var}` for backward-compatible variables like `{feature_slug}`).

| Alias | Resolves to |
|-------|------------|
| `{{feature.spec}}` | `specs/{feature_slug}/spec.md` |
| `{{feature.plan}}` | `specs/{feature_slug}/plan.md` |
| `{{feature.tasks}}` | `specs/{feature_slug}/tasks.md` |
| `{{run.state}}` | `.ai/state/flow-state.json` |
| `{{run.session}}` | `.ai/sessions/{run_id}.md` |
| `{{review.current}}` | `.ai/reviews/{run_id}/review.md` |
| `{{signals.current}}` | `.ai/signals/current-period.jsonl` |
| `{{memory.current}}` | `.ai/memory/current.md` |
| `{{context}}` | `CONTEXT.md` |

Resolution: `resolveTemplatePath()` extended to handle `{{x.y}}` via `artifact-map.json` lookup. Single hop only.

### 6.4. Artifact Drift Validation

`lib/validate-drift.js` is a pure function called at multiple points:

| Caller | When |
|--------|------|
| `init-checks.js` | Startup |
| `flow-engine.js` | Each stage transition |
| `settle.js` | Settle cleanup |
| `bin/adp.js doctor` | Manual check |

Drift checks:
1. Duplicate spec detection (scan for `spec.md` outside `specs/`)
2. Stale lock/claim cleanup (TTL via OwnershipStore)
3. Path-outside-contract check (files in `.ai/` not in `artifact-map.json`)
4. `flow-state.json` points to existing paths
5. Signals file is valid JSONL

**Any duplicate source-of-truth artifact → status `BLOCKED`, not `WARN`.**

### 6.5. Schema Contract Files

| File | Concern | Location |
|------|---------|----------|
| `artifact-map.json` | Location-of (canonical paths, dirs, template vars) | `.claude/skills/contracts/` |
| `entities.schema.json` | Shape-of (claim, lease, signal, state entry) | `.claude/skills/contracts/` |
| `gate-result.schema.json` | Interface output (gate result envelope) | `.claude/skills/contracts/` |

Runtime access: `lib/artifact-paths.js` loads `artifact-map.json` and exports helpers. **No hardcoded paths allowed** — enforced by test.

---

## Appendix A: Scoring Rubric

Profiles are selected based on a total risk score calculated across 5 dimensions on a 0-2 scale:

| Score | Novelty | Blast Radius | Ambiguity | Reversibility | User/Biz Risk |
|---|---|---|---|---|---|
| **0** | Familiar, boilerplate | Single file / local | Clear, fully specified | Trivial to revert | No external impact |
| **1** | Semi-novel / extension | Module / subsystem | Minor open questions | Requires minor cleanup | Internal tool / low |
| **2** | Brand new technology | Cross-cutting / core | High, underspecified | Breaking / hard rollback | Customer-facing / high |

$$\text{Total Score} = \text{Novelty} + \text{Blast Radius} + \text{Ambiguity} + \text{Reversibility} + \text{User/Biz Risk}$$

- **FAST**: Total score `0` to `2`
- **STANDARD**: Total score `3` to `5`
- **FULL**: Total score `6` to `10`

---

## Appendix B: Stage Transition Matrix

| Profile | Align (`align`) | Trace (`trace`) | Lay (`lay`) | Act (`act`) | Settle (`settle`) |
|---|---|---|---|---|---|
| **FAST** | **Execute** (Scoring & Claiming; skip DoR) | **Trace-Min** (Markdown task list) | **Execute** (Leases + failing test) | **Execute** (Cap: 3) | **Execute-Lite** (Skip S2 PR; enforce S4 Close & S5 Learn) |
| **STANDARD**| **Execute** | **Execute-Lite** (Spec-lite; skip peer-review) | **Execute** | **Execute** (Cap: 5) | **Execute** (PR + Codex review) |
| **FULL** | **Execute** | **Execute** (Spec-Kit complete; trace-review) | **Execute** | **Execute** (Cap: 8) | **Execute** (PR + Codex + Human sign-off) |

---

## Appendix C: Gate Result Schema

All gates (code scripts and SKILL.md judgment gates) must produce output conforming to this envelope:

```json
{
  "stage_id": "lay",
  "status": "PASS",
  "blocking": [],
  "warnings": ["Rollback plan is minimal"],
  "artifacts_produced": ["tests/foo.test.ts"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stage_id` | string | Yes | ATLAS stage ID |
| `status` | enum | Yes | `PASS`, `FAIL`, `BLOCKED`, `NEEDS_HUMAN_REVIEW` |
| `blocking` | string[] | Yes | Issues that prevent advancement (empty = no blockers) |
| `warnings` | string[] | Yes | Non-blocking concerns |
| `artifacts_produced` | string[] | Yes | Paths created/modified by this gate |

The engine reads `status` to decide advancement. `blocking` and `warnings` are logged to session. The gate does NOT recommend next action — the engine resolves that from the ledger.

---

## Appendix D: Artifact Map Reference

`contracts/artifact-map.json` defines all canonical paths:

```json
{
  "version": "1.0",
  "canonical": {
    "flow_state": ".ai/state/flow-state.json",
    "claims_dir": ".ai/claims",
    "locks_dir": ".ai/locks",
    "signals_file": ".ai/signals/current-period.jsonl",
    "staging_dir": ".ai/staging",
    "reviews_dir": ".ai/reviews",
    "sessions_dir": ".ai/sessions",
    "memory_dir": ".ai/memory",
    "context_file": "CONTEXT.md",
    "adr_dir": "docs/adr",
    "feature_root": "specs"
  },
  "feature_artifacts": {
    "spec": "specs/{feature_slug}/spec.md",
    "plan": "specs/{feature_slug}/plan.md",
    "tasks": "specs/{feature_slug}/tasks.md"
  },
  "staging_outputs": {
    "matt_to_prd": ".ai/staging/{run_id}/matt-to-prd.md",
    "matt_to_issues": ".ai/staging/{run_id}/issue-candidates.md",
    "matt_handoff": ".ai/staging/{run_id}/handoff-draft.md",
    "codex_review": ".ai/reviews/{run_id}/codex-review.md",
    "gstack_review": ".ai/reviews/{run_id}/gstack-review.md"
  }
}
```

Runtime access: `const paths = require('../lib/artifact-paths');`

---

## Appendix E: Artifact Contract Decisions

```
D-Artifact-01: ATLAS Artifact Contract is the sole authority for canonical paths.
D-Artifact-02: External skills write raw output to .ai/staging/{run_id}/ only.
D-Artifact-03: Only ATLAS adapters may promote staged output to canonical artifacts.
D-Artifact-04: All artifact references use {{dotted.alias}} resolved via artifact-map.json.
D-Artifact-05: Verification gates use deterministic JS scripts; judgment gates use SKILL.md.
D-Artifact-06: Artifact Drift Validator runs at init, stage transitions, and settle.
D-Artifact-07: Duplicate source-of-truth artifacts are BLOCKED, not WARN.
D-Artifact-08: External issue trackers are mirrors, not source of truth.
D-Artifact-09: Schema contract = 3 files (artifact-map / entities / gate-result).
D-Artifact-10: flow-state.json is a current-state snapshot with append-only audit trail.
```
