# Risk Profiles & Work Modes Reference

This document captures the 3x5 Risk Profile by Stage Execution matrix, scoring rules, and Work Mode overrides.

---

## 1. Risk Profile Scoring Rubric

Task risk is evaluated across 5 dimensions (Novelty, Blast Radius, Ambiguity, Reversibility, User/Biz Risk), scored from `0` to `2` each:

$$\text{Total Score} = \text{Novelty} + \text{Blast Radius} + \text{Ambiguity} + \text{Reversibility} + \text{User/Biz Risk}$$

* **FAST (Total: 0-2)**: Very low risk.
* **STANDARD (Total: 3-5)**: Medium risk.
* **FULL (Total: 6+)**: High risk.

---

## 2. 3x5 Risk Profile Stage Execution Matrix

The following matrix defines the rigor and skip policies for each profile across the 5 ATLAS stages:

| Stage | FAST Profile | STANDARD Profile | FULL Profile |
|---|---|---|---|
| **align** | Skip `align-gate`. Direct transition to `trace`. | Run standard `align-gate`. | Run strict `align-gate` with peer/architect sign-off. |
| **trace** | Trace-Min: Skip formal spec, write a light checklist only. | Trace-Lite: Create Spec-Lite template. | Trace-Full: Full Recon, GStack critique, and formal Spec-Kit. |
| **lay** | Skip lease acquisitions. Define simple mock verifications. | Acquire leases for files to modify. Setup TDD tests. | Strict write-lease locking. Preflight verifications on CI/local. |
| **act** | Direct implementation & verify. Single commit. | Atomic commits per task with local verifications. | Detailed task-by-task execution with peer review gates. |
| **settle** | Release claims. Skip S2 PR checks. Log signals. | Release claims/leases. Log signals. Write SUMMARY.md. | Complete retro reflection, release locks, log signals, update memory. |

---

## 3. Work Mode Overrides

Work modes apply situational changes to stage execution:

* **FEATURE**: The default mode. Follows the standard profile matrix.
* **BUGFIX**:
  - Focuses on root-cause analysis and defect correction.
  - Skips feature specs in `trace`.
  - Enforces writing a reproduction test in `lay` and verifying the fix in `act`.
* **PROTOTYPE**:
  - Exploratory execution on a throwaway branch.
  - Skips spec validation gates in `trace`.
  - Skips durable memory promotion and PR verification in `settle`.
* **REFACTOR**:
  - Code improvement with zero behavioral changes.
  - Enforces strict regression testing checks in `lay` and `act`.
* **DOCS**:
  - Documentation changes only.
  - Skips `lay.test-setup` test writing in `lay`.
  - Skips `act` coding/implementation loop entirely.
