# Roadmap

- [v2.0 Flow Engine](file:///.planning/milestones/v2.0-ROADMAP.md) (Shipped: 2026-05-27)
- [v4.0 Risk-Adaptive AI Delivery Operating System (Kernel)](file:///.planning/milestones/v4.0-ROADMAP.md) (Shipped: 2026-05-28)

### Phase 19: atlas-refactor-CONTEXT

**Goal:** Consolidate the GSD 10-stage flow into a 5-stage ATLAS Loop (Align→Trace→Lay→Act→Settle) with 4 custom skills.
**Requirements:** RAOS-01, RAOS-02, RAOS-03, RAOS-06, RAOS-07, RAOS-08
**Depends on:** Phase 18
**Plans:** 8/8 plans complete

Plans:

- [x] 19-01-PLAN.md — Schema Contracts Foundation
- [x] 19-02-PLAN.md — Flow State v2 + Migration
- [x] 19-03-PLAN.md — Atlas Routing Skill
- [x] 19-04-PLAN.md — Atlas Gates Skill
- [x] 19-05-PLAN.md — Atlas Settle Skill
- [x] 19-06-PLAN.md — Atlas Review Skill
- [x] 19-07-PLAN.md — Template Aliases + Artifact Drift Validator
- [x] 19-08-PLAN.md — E2E Integration + CONTEXT.md Update

### Phase 20: Packaging and Target Project Integration for ATLAS Loop

**Goal:** Package the completed ATLAS Loop runtime so fresh target projects initialized with `saf init` receive the ATLAS skills, contract schemas, flow templates, state scaffolding, and validation coverage needed to pass `saf doctor`.
**Requirements**: TBD
**Depends on:** Phase 19
**Plans:** 4/4 plans complete

Plans:

**Wave 1**

- [x] 20-01-PLAN.md — Package Inventory and Manifest
- [x] 20-02-PLAN.md — Init Asset Copying and Runtime Layout

**Wave 2**

- [x] 20-03-PLAN.md — Target Project Bootstrap Smoke Test
- [x] 20-04-PLAN.md — Documentation and Release Checklist

### Phase 21: Memory Seeding and Architecture Awareness at Init

**Goal:** Close the gap where `saf init` creates `.ai/memory/` directory but seeds no files — leaving agents without architecture context until first Memory Handoff. Seed placeholder memory files at init, connect project-onboarding output to durable memory, and add standardized templates for memory handoff.
**Requirements:** TBD
**Depends on:** Phase 20
**Plans:** 3/3 plans complete

Plans:

**Wave 1**

- [x] 21-01-PLAN.md — Memory Templates + Init Seeding
- [x] 21-02-PLAN.md — Onboarding → Memory Bridge (onboard-memory CLI)

**Wave 2**

- [x] 21-03-PLAN.md — Test Coverage, Doctor Validation + Documentation

---

## Next Milestone: Proposed v5.0 (Multi-Flow & Observability Dashboard)

**Goal:** Extend Snail Agent Flow to support concurrent active features (multi-flow), a local web dashboard for flow progress tracking, and exposing flow state as an MCP server.
