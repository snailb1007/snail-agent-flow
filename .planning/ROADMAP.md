# Roadmap

- [v2.0 Flow Engine](file:///.planning/milestones/v2.0-ROADMAP.md) (Shipped: 2026-05-27)
- **v4.0 Risk-Adaptive AI Delivery Operating System (Kernel)** (Active)

---

## Active Milestone: v4.0 Risk-Adaptive AI Delivery Operating System (Kernel)

### Phase 18: Pure task scoring & profile selection module

**Goal:** Implement the pure scoring logic evaluating task risk (Novelty, Blast Radius, Ambiguity, Reversibility, User/Biz Risk) to output FAST, STANDARD, or FULL profile recommendations, with overrides for BUGFIX and PROTOTYPE.
**Requirements:** RAOS-01
**Depends on:** Phase 17
**Plans:** 1 plan

- [ ] [#57](https://github.com/snailb1007/snail-agent-flow/issues/57) (S4) — lib/profile-scorer.js + test suite

### Phase 18.1: Ownership-store primitive (atomic file lock foundation) (INSERTED)

**Goal:** Build a reusable record store at `lib/ownership-store.js` providing race-proof `acquire`/`release`/`list` primitives on the local filesystem. Uses exclusive-create (`fs.openSync(path, 'wx')`) for atomicity and tmp-rename for crash-safety. Lazy stale-steal on acquire (PID-dead OR past `stale_lock_cap_seconds`, default 3600). No daemon, no heartbeat — short-lived locks only. Foundation that Phase 19 (claims) and Phase 20 (leases) both wrap as thin domain wrappers; building it once dedupes the atomic-write logic.
**Requirements:** Foundation for RAOS-02, RAOS-03
**Depends on:** Phase 18**Plans:** 1 plan

- [ ] [#56](https://github.com/snailb1007/snail-agent-flow/issues/56) (S1) — lib/ownership-store.js + race/stale-steal/crash-recovery test suite

### Phase 19: Work claiming backend & storage format

**Goal:** Build the claiming API to record active sessions and lock task items before execution under `.ai/claims/` to prevent parallel session collisions.
**Requirements:** RAOS-02
**Depends on:** Phase 18
**Plans:** 1 plan

- [ ] 19-01-PLAN.md — lib/claim-manager.js + test suite

### Phase 20: Artifact leasing, TTL, heartbeat & concurrency guards

**Goal:** Build the lease lock API to prevent concurrent modifications on shared files, support TTL, and heartbeats under `.ai/locks/`.
**Requirements:** RAOS-03
**Depends on:** Phase 19
**Plans:** 2 plans

- [ ] 20-01-PLAN.md — lib/lease-manager.js + TTL/heartbeat daemon
- [ ] 20-02-PLAN.md — Concurrency lock checks in flow execution path

### Phase 21: Profile-switch checkpoints & ADR enforcement

**Goal:** Implement checkpoint writing at `.ai/state/profile-switch-*.md` when switching execution profiles, and add validators to prevent transient states from being committed to `docs/adr/`.
**Requirements:** RAOS-04, RAOS-05
**Depends on:** Phase 20
**Plans:** 1 plan

- [ ] 21-01-PLAN.md — Checkpoint generation and ADR lock validators

### Phase 22: Observability signal logger

**Goal:** Build the signal logger to write decision-aligned metric logs to `.ai/signals/current-period.md` for phase duration, revision count, escalation count, test pain notes, and review flags.
**Requirements:** RAOS-06
**Depends on:** Phase 21
**Plans:** 1 plan

- [ ] [#58](https://github.com/snailb1007/snail-agent-flow/issues/58) (S5) — lib/signal-logger.js + metrics compiler

### Phase 23: Failure recovery & CLI integration

**Goal:** Define failure recovery logic and integrate all RAOS kernel checks into the `adp` CLI validation and doctor commands.
**Requirements:** RAOS-07, RAOS-08
**Depends on:** Phase 22
**Plans:** 2 plans

- [ ] 23-01-PLAN.md — Failure recovery policies in flow engine
- [ ] 23-02-PLAN.md — Integration with `adp validate-spec`, `adp doctor`, and strict init checks

---
*Roadmap defined: 2026-05-28*
