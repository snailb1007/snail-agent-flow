---
name: atlas-gates
description: Evaluates ATLAS Loop preflight, test-readiness, and act-stage verification gates.
---

# Atlas Gates Skill

This skill defines the instructions and checklists for the human-like **judgment gates** used in Snail Agent Flow. It governs the transition criteria between phases of the AI Delivery Pipeline, ensuring spec quality, alignment, and architectural sanity before execution.

## 1. Overview of Gates

Atlas gates are divided into two types:
1. **Judgment Gates (Markdown/Checklists)**: Qualitative reviews evaluating requirements, specifications, and plans. These are executed by agents using the checklists in this file.
2. **Verification Gates (Deterministic Scripts)**: Automated code verification enforcing strict execution boundaries (defined in `reference/gate-contracts.md` and executed via Node.js scripts).

---

## 2. Align Gate Checklist (`align-gate`)

The **align-gate** runs at the end of the Recon phase and the start of the Spec phase. It ensures alignment on requirements and readiness to plan.

### Checklists

- [ ] **Goal Alignment**: The core objective is clearly defined, and there is a shared understanding of what success looks like.
- [ ] **Boundary Clarification**: Non-goals are explicitly documented to prevent scope creep.
- [ ] **Definition of Ready (DoR)**:
  - [ ] Context and background documents have been retrieved and read.
  - [ ] All third-party library or service dependencies are identified.
  - [ ] Risk profile has been estimated and documented.
- [ ] **Scoring Rubric Check**: Task risk has been scored across the 5 dimensions (Novelty, Blast Radius, Ambiguity, Reversibility, User/Biz Risk).
- [ ] **Ambiguity Resolution**: Open questions with the user or product are resolved. No placeholder terms like `TBD` or `NEEDS CLARIFICATION` remain in the core scope.

---

## 3. Trace Review Checklist (`trace-review`)

The **trace-review** runs at the end of the Spec/Plan phase before implementation starts. It checks the technical blueprint and task breakdown.

### Checklists

- [ ] **Plan Quality**: The step-by-step implementation plan is logically ordered, has no missing dependencies, and matches the requirements.
- [ ] **Architecture Sanity**:
  - [ ] The plan does not violate existing architectural patterns documented in `docs/adr/` or `CONTEXT.md`.
  - [ ] No blind rewrites. Existing behavior is preserved by default (Brownfield Preservation).
  - [ ] Clear input/output boundaries are defined for any new module or symbol.
- [ ] **Task Mapping**: Checklists in `tasks.md` map 1-to-1 with the proposed implementation steps.
- [ ] **Validation Coverage**:
  - [ ] Test strategy is documented.
  - [ ] Verification commands are defined for every task.
  - [ ] A failing test case or reproduction script is planned to be written first (TDD).
- [ ] **Impact Analysis**: Upstream/downstream blast radius has been assessed and verified (using GitNexus impact tools where possible).
