### Phase 16: Context budget gate and subagent orchestration policy

**Goal:** Add a deterministic context budget and orchestration policy layer so the flow engine can decide when work stays inline, when it must hand off to a fresh session, and when independent tasks should run as isolated subagents with minimal context packs instead of inheriting a large chat history.
**Requirements**: CTX-01, CTX-02, CTX-03, CTX-04, CTX-05
**Depends on:** Phase 15
**Plans:** 3 plans
Plans:
**Wave 1**

- [ ] 16-01-PLAN.md — Foundation modules: lib/context-budget.js (estimation + 3-outcome decision), lib/context-policy-validator.js (fail-closed schema validation), dedicated unit test, .ai/context-packs/ dir

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 16-02-PLAN.md — Flow-engine integration: resolveNextStage emits contextPolicy, formatStageInstruction renders the CONTEXT POLICY block, extended flow-engine tests
- [ ] 16-03-PLAN.md — Validation + onboarding: runStrictChecks policy/pack/handoff/instruction checks, adp init idempotent context-policy.json + instruction section, init-checks and CLI test coverage

---
*Roadmap defined: 2026-05-24*
