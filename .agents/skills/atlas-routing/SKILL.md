---
name: atlas-routing
description: Provides routing, transition policies, and external skill integration boundaries for the 5-stage ATLAS Loop (align, trace, lay, act, settle).
---

# Atlas Routing Skill

This skill governs the routing and transition logic of the **5-Stage ATLAS Loop** (align → trace → lay → act → settle). It dynamically scopes execution rigor to task risk and work mode by integrating task scoring, claim acquisition, and profile-aware skip transitions.

Deterministic staging tasks are automated via utility scripts in this skill, while stage transition policies and risk profile configurations follow the reference definitions detailed here.

---

## 1. Core Workflow Stages

The ATLAS Loop consolidates the pipeline into 5 core stages. Each stage has a distinct objective, set of actions, and verification gates:

1. **Align**: Score task risk, acquire work unit claims, and define write boundaries.
2. **Trace**: Perform recon, generate specs/plans/checklists, and verify architectural alignment.
3. **Lay**: Prepare verification environments, write tests (TDD), and acquire advisory file leases.
4. **Act**: Execute code modifications and satisfy local acceptance criteria iteratively.
5. **Settle**: Perform workspace cleanup, release claims/leases, log metrics, and promote memory.

For a detailed mapping of stages, actions, and gates, see [stages.md](reference/stages.md).

---

## 2. Risk-Adaptive Profiles & Work Modes

RAOS dynamically selects an operating profile based on a 5-dimension risk rubric (Novelty, Blast Radius, Ambiguity, Reversibility, User/Biz Risk). These profiles dictate process rules and allow stages or steps to be skipped:

* **FAST (Score 0-2)**: Ultra-lightweight path. Skips formal planning reviews (`align-gate`) and skips S2 PR checks.
* **STANDARD (Score 3-5)**: Default path. Requires standard spec validation and local verification gates.
* **FULL (Score 6+)**: High-risk path. Demands comprehensive recon, GStack reviews, formal spec/plans, and human sign-offs.

Work modes provide situational overrides:
* **BUGFIX**: Skips feature specs; enforces root-cause diagnosis and reproduction tests.
* **PROTOTYPE**: Exploration path. No production spec updates, no durable memory promotion.
* **DOCS**: Documentation-only. Skips test-setup in Lay and skips Act coding entirely.

For detailed profile rules and work mode configurations, see [profiles.md](reference/profiles.md).

---

## 3. Automation Scripts

The skill provides two scripts to handle deterministic workflow actions:

### 3.1. Score and Claim
Scores the task risk using the profile scorer and claims the work unit via the claim manager, outputting a gate result JSON:
```bash
node .claude/skills/atlas-routing/scripts/score-and-claim.js <task_json_or_file> [repoRoot]
```

### 3.2. Stage Transition
Resolves the next stage and identifies skipped steps or stages based on the current flow state, risk profile, and work mode:
```bash
node .claude/skills/atlas-routing/scripts/transition.js [repoRoot]
```
