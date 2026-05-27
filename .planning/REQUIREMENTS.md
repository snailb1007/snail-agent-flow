# Requirements: Snail Agent Flow

**Defined:** 2026-05-28
**Core Value:** Make it obvious which AI engineering tool should run next, what artifact it should consume, and what validation must pass before work can continue.

---

## v1 Requirements (Complete)

All 28 v1 requirements completed in milestone v1.0. See [v1.0 Requirements Archive](file:///.planning/milestones/v1.0-REQUIREMENTS.md) for details.

## v2 Requirements (Complete)

All 33 v2 requirements completed in milestone v2.0. See [v2.0 Requirements Archive](file:///.planning/milestones/v2.0-REQUIREMENTS.md) for details.

---

## v4 Requirements: Risk-Adaptive AI Delivery Operating System (Kernel)

Requirements for the RAOS Kernel milestone. Enables dynamic profile selection, resource safety locks, and decision-aligned metric feedback.

### Task Scoring & Profile Selection
- [ ] **RAOS-01**: Implement a pure task scoring module that rates tasks on a 0-2 scale across 5 dimensions (Novelty, Blast Radius, Ambiguity, Reversibility, User/Biz Risk). Returns FAST (0-2), STANDARD (3-5), or FULL (6+) profile, with override rules for BUGFIX and PROTOTYPE.

### Resource Ownership
- [ ] **RAOS-02**: Implement Work Claiming primitives. Record task ownership (owner, task, profile, write scope, start time, status) in JSON files under `.ai/claims/` before editing files.
- [ ] **RAOS-03**: Implement Artifact Leasing primitives. Record temporary write lock on shared files (owner, scope, purpose, acquired time, TTL, heartbeat) in JSON files under `.ai/locks/`. Active leases must block concurrent writers. Supports heartbeat extensions and TTL expiration.

### State Transitions & ADRs
- [ ] **RAOS-04**: Implement Profile-Switch Checkpoints. Generate checkpoint markdown files at `.ai/state/profile-switch-*.md` when switching profiles mid-flight, capturing completed work, assumptions, touched files, risks, and resume steps.
- [ ] **RAOS-05**: Enforce durable ADR usage. The validator must block checkins if transient session/profile state is written to `docs/adr/`.

### Observability Signals
- [ ] **RAOS-06**: Implement initial 5-signal logger. Record phase duration, revision count, escalation count, test pain notes, and recurring review flags in `.ai/signals/current-period.md`. Enforce that every logged signal must map to a decision it can influence.

### Failure Recovery & CLI Integration
- [ ] **RAOS-07**: Implement failure recovery patterns in the engine for blocked spec sign-offs, scope creep, wrong profile choices, and context exhaustion.
- [ ] **RAOS-08**: Integrate scoring, claiming, leasing, and signals into the CLI (`adp status`, `adp doctor`, and strict init checks) to assert environment compliance.

---

## Out of Scope

- Fully automating distributed lease coordination across multiple remote host machines.
- Creating runtime monitoring dashboards or web-based visualizations in this phase.
- Auto-installing third-party developer toolchains.

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RAOS-01 | Phase 18 | Pending |
| RAOS-02 | Phase 19 | Pending |
| RAOS-03 | Phase 20 | Pending |
| RAOS-04 | Phase 21 | Pending |
| RAOS-05 | Phase 21 | Pending |
| RAOS-06 | Phase 22 | Pending |
| RAOS-07 | Phase 23 | Pending |
| RAOS-08 | Phase 23 | Pending |

**Coverage:**
- Active requirements: 8 total, 0 completed, 8 pending.
