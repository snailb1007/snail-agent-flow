# Phase 2: routing-gates-and-memory-foundation - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Define how agents choose tools (routing matrix), when gates pass or fail (gate outcomes), when human review is required, what durable memory contains (seeding), and the schema representation of active states, verified via a vertical slice.
</domain>

<decisions>
## Implementation Decisions

### Path Registry & Spec-Kit Contract
- **D-01:** **Canonical Feature Specs Path:** All feature specifications, plans, and checklists must reside under `.specify/specs/<feature-slug>/` (not root `specs/`).
- **D-02:** **Spec-Kit Contract:** A valid Spec-Kit specification comprises three files:
  1. `spec.md` (Functional requirements & test scenarios)
  2. `plan.md` (Technical implementation plan)
  3. `tasks.md` (Ordered execution task list)
- **D-03:** **Active Feature File:** The active feature pointer at `.ai/state/active-feature.json` must reference `.specify/specs/<feature-slug>`.

### Gate Outcome Definitions
- **D-04:** **Deterministic Status:** Every gate review file must contain a status header matching one of: `PASS`, `WARN`, `BLOCKED`, `NEEDS_HUMAN_REVIEW`.
- **D-05:** **Blocking Issues Key:** Reviews must contain a `Blocking Issues:` key. The gate is considered blocked if the value is anything other than `none`.
- **D-06:** **Critique Gate (Critique → Spec):**
  - *Inputs*: `.ai/reviews/<feature-slug>/gstack-ceo-review.md` & `gstack-eng-review.md`.
  - *Outcome Rule*: Both must show `Status: PASS` or `Status: WARN` with `Blocking Issues: none`.
  - *Outputs*: Transition to Spec phase.
- **D-07:** **Spec Validation Gate (Spec → Execution):**
  - *Inputs*: `.specify/specs/<feature-slug>/{spec,plan,tasks}.md`.
  - *Outcome Rule*: Verifies all files exist, contain required headers/sections, contain no unresolved `[NEEDS CLARIFICATION]` or `TODO` tags, and validator writes `Status: PASS`.
  - *Outputs*: Writes `.ai/reviews/<feature-slug>/spec-validation-report.md`.
- **D-08:** **Execution Gate (Execution → QA):**
  - *Inputs*: Code diff, `.specify/specs/<feature-slug>/tasks.md`.
  - *Outcome Rule*: All tasks in `tasks.md` marked checked, code builds.
  - *Outputs*: `.ai/sessions/YYYY-MM-DD-gsd-execution-<feature-slug>.md`.
- **D-09:** **QA Gate (QA → Memory Handoff):**
  - *Inputs*: Execution session logs and code.
  - *Outcome Rule*: `.ai/reviews/<feature-slug>/qa-review.md` contains `Status: PASS`.
  - *Outputs*: `.ai/reviews/<feature-slug>/qa-review.md` and `.ai/sessions/YYYY-MM-DD-qa-<feature-slug>.md`.
- **D-10:** **Memory Handoff Gate (Memory Handoff → Ship):**
  - *Inputs*: Session logs, QA review, and existing memory files.
  - *Outcome Rule*: The state file `.ai/state/handoff.md` exists and certifies memory updates.
  - *Outputs*: Updated `.ai/memory/*` files and `.ai/state/handoff.md`.
- **D-11:** **Ship Gate:**
  - *Inputs*: `.ai/state/handoff.md` and previous review reports.
  - *Outcome Rule*: Writes `ship-decision.md` containing `Status: PASS` with no unresolved review blocks.
  - *Outputs*: `.ai/reviews/<feature-slug>/ship-decision.md`.

### Tool Routing Matrix
- **D-12:** **Detailed Matrix:** Map the development steps as follows:

| Phase | Task Type | Primary Tool | Specific Skill / Flow | Required Input | Required Output | Validator | Stop / Exit Condition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Recon** | Investigation | Serena / Semble / Context7 | Symbol lookup, semantic search, API docs | Target feature request | `.ai/sessions/YYYY-MM-DD-recon-<feature-slug>.md` | Check for listed files & API versions | All unknown APIs and target files listed |
| **Critique** | Planning Review | GStack CEO / Eng Manager | `plan-ceo-review`, `plan-eng-review` | Recon report, constitutional rules | `.ai/reviews/<feature-slug>/gstack-ceo-review.md`, `gstack-eng-review.md` | Verify deterministic Status header | Status headers are set to `PASS` or `WARN` |
| **Spec** | Specification | Spec-Kit | `speckit-specify`, `speckit-plan`, `speckit-tasks` | Reviews, Recon report | `.specify/specs/<feature-slug>/{spec,plan,tasks}.md` | `/speckit.analyze` | Spec-Kit files written; no `[NEEDS CLARIFICATION]` tags |
| **Gate** | Spec Validation | Custom script / Judge | Validator validation | Spec-Kit files | `.ai/reviews/<feature-slug>/spec-validation-report.md` | Verification of contract files and headers | Validation report outputs explicit `PASS` status |
| **Execution** | Code writing | GSD Full | `gsd-execute-phase`, `gsd-quick` | Validated Spec-Kit files | Implemented code, `.ai/sessions/YYYY-MM-DD-gsd-execution-<feature-slug>.md` | Compiler/build checks | All `tasks.md` items checked off, code compiles |
| **QA** | Verification | GStack QA | `qa-only`, Playwright | Implemented code, spec criteria | `.ai/reviews/<feature-slug>/qa-review.md`, `.ai/sessions/YYYY-MM-DD-qa-<feature-slug>.md` | Test runners, Playwright tests | QA review shows `PASS`; all tests green |
| **Memory** | Handoff | Protocol / Human | `gsd-extract-learnings` | QA reports, session notes | Updated `.ai/memory/*` files, `.ai/state/handoff.md` | Check handoff file presence | State pointer `handoff.md` created; memory files seeded |
| **Ship** | Release | GStack Ship | `ship` | Memory handoff, all review logs | `.ai/reviews/<feature-slug>/ship-decision.md` | Pre-landing checklist | Release branch created; PR submitted and verified |

### Failure Taxonomy
- **D-13:** **Failure Modes & Action Rules:**
  1. *Local Bug*: Stay in Step 4, fix locally using minimal diff, do not touch specs.
  2. *Spec Drift*: Stop execution, write `spec-failure-report.md`, return to Step 3 (Spec-Kit) to update spec/plan/tasks, re-run validation.
  3. *Tool Unavailable*: Switch to text-mode fallback, write block report, status `BLOCKED`, present plain-text questions, do not invent answers.
  4. *Context Fragmentation*: Read `CONTEXT.md`, `.ai/memory/*`, and `active-feature.json`. Resume only after state is explicit.
  5. *Path Drift*: Block execution if specs or state are written outside canonical locations (e.g. root `specs/` or `.ai/specs/`).
  6. *Human Decision Required / Validation Loop Exhausted (3 failed attempts)*: Transition run status to `NEEDS_HUMAN_REVIEW` and write the human review packet.

### Human Review Safeguards
- **D-14:** **Safeguards Rule:** Recommended choices are for drafting only and cannot bypass human review gates. The agent must not automatically commit design phase changes without explicit user approval.

### Memory Seeding
- **D-15:** **Memory Seeding Content:** Seed `.ai/memory/` files with the actual Snail Agent Flow protocol's facts, decisions, risks, architecture, and verification history.

### Thin Vertical Example
- **D-16:** **Proof of Concept Example:** Walk the feature `002-routing-gates-memory` through the full recon-to-ship pipeline, enforcing inputs, routing matrix, gate status parsing, path verification, memory writes, and shipping checks.

### the agent's Discretion
None.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**
- [docs/prd.md](file:///Volumes/D/snail-agent-flow/docs/prd.md) — Product requirements and recommended pipeline architecture.
- [.planning/ROADMAP.md](file:///Volumes/D/snail-agent-flow/.planning/ROADMAP.md) — Phase definitions.
- [.planning/phases/02-routing-gates-and-memory-foundation/02-DISCUSSION-LOG.md](file:///Volumes/D/snail-agent-flow/.planning/phases/02-routing-gates-and-memory-foundation/02-DISCUSSION-LOG.md) — Phase 2 alternative choices and notes.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [docs/artifact-registry.md](file:///Volumes/D/snail-agent-flow/docs/artifact-registry.md) — Defines the canonical directory layout and file ownership.
- [.specify/scripts/bash/common.sh](file:///Volumes/D/snail-agent-flow/.specify/scripts/bash/common.sh) — Source library for script routines and environment setups.

### Established Patterns
- State information is pinned inside `.ai/state/active-feature.json`.
- Reviews are written to `.ai/reviews/<feature-slug>/`.
</code_context>

<specifics>
## Specific Ideas
None.
</specifics>

<deferred>
## Deferred Ideas
None.
</deferred>

---

*Phase: 2-routing-gates-and-memory-foundation*
*Context gathered: 2026-05-24*
