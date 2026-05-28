# PRD v4.1: ATLAS Loop — Risk-Adaptive Flow Protocol

A streamlined 5-stage project execution protocol (`ATLAS Loop`) leveraging ready-made developer capabilities for execution mechanics, and building custom gate/observability adapters.

---

## 1. Goal

Refactor the existing GSD-centric 10-stage project flow into the 5-stage **ATLAS Loop** (`Align → Trace → Lay → Act → Settle`). 
By removing the heavy and overlapping GSD commands, the new protocol will:
- Reuse proven developer skills (e.g., Matt Pocock's skills) for actual execution.
- Maintain strict protocol control using lightweight custom gates (`atlas/*` skills).
- Dynamically skip stages or gates based on the selected operating profile (`FAST`, `STANDARD`, `FULL`, `BUGFIX`, `PROTOTYPE`).

---

## 2. Architecture & The 5 ATLAS Stages

To resolve naming and routing ambiguity, the stages are defined with unique IDs and distinct responsibilities:

```text
  A (Align)   →   T (Trace)   →   L (Lay)   →   A (Act)   →   S (Settle)
 (Stage: align)  (Stage: trace)  (Stage: lay)  (Stage: act)  (Stage: settle)

     ↑                                                              │
     └─────────────────────────── Observability Bus ────────────────┘
```

| ID | Stage Name | Purpose / Action | Output Artifacts | Primary Skills |
|---|---|---|---|---|
| **`align`** | **Align (A1)** | Score task risk, claim work unit, and establish problem intent/test strategy. | `.ai/claims/<task-slug>.json`, `.planning/phases/{phase_id}-CONTEXT.md` (Align Section) | `/grill-with-docs`, `/zoom-out`, `score-and-claim`, `align-gate` |
| **`trace`** | **Trace (T)** | Write/update spec and slice into independent tasks. | `{feature_dir}/spec.md`, task checklist in `{feature_dir}/tasks.md` | `/to-prd`, `/to-issues`, `trace-review` |
| **`lay`** | **Lay (L)** | Setup failing tests, establish rollback paths, acquire leases. | Local test harness (failing tests), `.ai/locks/<file-hash>.json` | `/tdd`, `lay-preflight` |
| **`act`** | **Act (A2)** | Iterative TDD execution of tasks/slices. | Target code files passing tests | `/tdd`, `/diagnose`, `act-evaluator` |
| **`settle`** | **Settle (S)**| Verification, shipping, monitoring, clean up, and signals. | Shipped code, `.ai/signals/current-period.md` update | `/improve-codebase-architecture`, `settle-5stage` |

---

## 3. Profile-Based Stage Transition Rules

### 3.1. Stage Transition Matrix
For each profile, the stage execution behavior is mapped below:

| Profile | Align (`align`) | Trace (`trace`) | Lay (`lay`) | Act (`act`) | Settle (`settle`) |
|---|---|---|---|---|---|
| **FAST** | **Execute** (Scoring/Claiming only; skip DoR grill) | **Skip-Empty** | **Execute** | **Execute** | **Execute-Lite** (Skip PR shipping; release locks & log signals) |
| **STANDARD**| **Execute** | **Execute-Lite** (Skip peer-review gate) | **Execute** | **Execute** | **Execute** |
| **FULL** | **Execute** | **Execute** | **Execute** | **Execute** | **Execute** |
| **BUGFIX** | **Execute** (Diagnosis & repro steps) | **Skip-Empty** | **Execute** (Repro test setup) | **Execute** | **Execute** |
| **PROTOTYPE**| **Execute** | **Execute-Lite** (Skip spec validation) | **Execute** | **Execute** | **Execute-Lite** (Skip PR shipping; force cleanup & release locks) |

* `Skip-Empty`: Flow engine automatically sets status to `done` and skips execution.
* `Execute-Lite`: Runs the stage but skips specific sub-actions or gates (e.g. peer review, PR ship).
* **Minimum Settle Requirement**: To prevent resource leaks, the Settle sub-step `S4 Close` (releasing claims and leases) is **mandatory for all profiles**, including `FAST` and `PROTOTYPE`.

---

## 4. Custom ATLAS Skills (`.claude/skills/atlas/`)

### 4.1. `score-and-claim` (Stage `align`)
- **Input**: Phase intent and task description.
- **Output**: JSON claim file at `.ai/claims/<task-slug>.json` containing owner, task, profile, scope, and start time.
- **Scoring**: Computes total score using the rubric in Appendix A.

### 4.2. `align-gate` (Stage `align`)
- **DoR check**: Validates that the alignment session documented the core problem statement, anti-goals, and test strategy.
- **Skip Rule**: Automatically bypassed for `FAST` profile.

### 4.3. `trace-review` (Stage `trace`)
- **Review Gate**: Conducts peer review.
- **Tie-Breaker Rule**:
  - **Engineering** has final authority on technical feasibility, performance, and architecture.
  - **Product** has final authority on user experience, business logic, and feature scope.
- **Skip Rule**: Bypassed for `FAST` and `STANDARD` profiles.

### 4.4. `lay-preflight` (Stage `lay`)
- **Preflight Check**:
  1. Write a failing test verifying the bug or new feature behavior.
  2. Record the pre-execution git commit hash as a rollback fallback.
  3. Acquire advisory leases for files to be written.
  4. Document non-code states (e.g. DB migrations, flag states) that need reverting in case of rollback.

### 4.5. `act-evaluator` (Stage `act`)
- **Loop Governor**: Evaluates test outcomes. If tests pass, routes to `Settle`. If tests fail, retries up to the profile's iteration cap (FAST=3, STANDARD=5, FULL=8). Exceeding the cap triggers a transition to `NEEDS_HUMAN_REVIEW` or `/diagnose`.

### 4.6. `settle-5stage` (Stage `settle`)
- **Sub-Steps**:
  - **S1 Verify**: Run full validation suite locally.
  - **S2 Ship**: Push branch / create PR (skipped for `FAST` and `PROTOTYPE`).
  - **S3 Validate**: Verify production metric logs or run a smoke test.
  - **S4 Close (Mandatory)**: Delete claim file and file leases.
  - **S5 Learn**: Write retro notes and log final signals.

### 4.7. `signal-log` (Observability Bus)
- **Signal Logger**: Appends metric signals using the schema in Appendix C.
- **Escalation Trigger**: If a threshold is violated (e.g., revision count > 2), triggers mid-flow profile escalation (e.g., FAST → STANDARD), writing a checkpoint file at `.ai/state/profile-switch-*.md`.

---

## 5. Technical Requirements & Concurrency Model

- **GSD Retirement**: Clean up all old GSD-related skills (`gsd-discuss-phase`, `gsd-execute-phase`, `gsd-ship`).
- **Claim Concurrency**: Claims are created using exclusive-create (`fs.openSync(path, 'wx')`). If the claim file exists, other writers fail with `LOCK_UNAVAILABLE`.
- **Lease Concurrency**: Short-lived, advisory leases. If a lease exists and is not stale, other writers back off exponentially (Math.pow(2, retry) * 1000 ms, max 3 retries).
- **Migration Plan**: `flow-engine.js` will automatically migrate legacy 10-stage ledger JSON files to the new 5-stage format on the first status query.

---

## Appendix A: Scoring Rubric

Profiles are selected based on a total risk score calculated across 5 dimensions on a scale of 0 to 2:

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

## Appendix B: Signal Schema

Signals are written as JSON lines appended to `.ai/signals/current-period.md`:

```json
{
  "timestamp": "2026-05-28T18:00:00.000Z",
  "stage_id": "act",
  "signal_type": "revision_count",
  "value": 3,
  "actionable_decision": "escalate_profile"
}
```
Valid signal types: `phase_duration_seconds`, `revision_count`, `escalation_count`, `test_pain_score`, `review_flags`.
