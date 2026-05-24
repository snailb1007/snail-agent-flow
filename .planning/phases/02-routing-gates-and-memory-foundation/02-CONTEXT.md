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
- **D-01:** **Canonical Feature Specs Path:** All feature specifications, plans, and checklists must reside under `specs/<feature-slug>/`. `.specify/` is reserved for Spec-Kit tooling, templates, commands, and integration files, not canonical feature specs.
- **D-02:** **Spec-Kit Contract:** A valid Spec-Kit specification comprises three files:
  1. `spec.md` (Functional requirements & test scenarios)
  2. `plan.md` (Technical implementation plan)
  3. `tasks.md` (Ordered execution task list)
- **D-03:** **Active Feature File:** The active feature pointer at `.ai/state/active-feature.json` must remain a narrow identity pointer that references `specs/<feature-slug>/`.
- **D-03a:** **Run State File:** Mutable pipeline progress must live in `.ai/state/run-state.json`, not in `active-feature.json`. The run state tracks `feature_slug`, `spec_path`, `current_phase`, `last_gate`, `last_gate_status`, `blocked_reason`, `retry_count`, `retry_scope`, `updated_at`, and `verified_artifacts`.
- **D-03b:** **Verified Artifacts Evidence:** `verified_artifacts` is validator-owned evidence, not executor self-attestation. Planning and execution agents may request validation but must not mark artifacts verified. Each entry includes `path`, `artifact_type`, `verified_by`, `verified_at`, `status`, and optional `hash`.

### Gate Outcome Definitions
- **D-04:** **Gate Status Vocabulary:** Every gate review file must contain a status header. Deterministic gates use `PASS`, `BLOCKED`, or `NEEDS_HUMAN_REVIEW`; judgment gates may also use `WARN`.
- **D-05:** **Blocking Issues Key:** Reviews must contain a `Blocking Issues:` key. The gate is considered blocked if the value is anything other than `none`. `WARN` means judgment-only, non-blocking concerns were recorded; it cannot be emitted by deterministic validators.
- **D-06:** **Critique Gate (Critique → Spec):**
  - *Inputs*: `.ai/reviews/<feature-slug>/gstack-ceo-review.md` & `gstack-eng-review.md`.
  - *Outcome Rule*: Both must show `Status: PASS` or `Status: WARN` with `Blocking Issues: none`.
  - *Outputs*: Transition to Spec phase.
- **D-07:** **Spec Validation Gate (Spec → Execution):**
  - *Inputs*: `specs/<feature-slug>/{spec,plan,tasks}.md`.
  - *Outcome Rule*: Verifies all files exist, contain required headers/sections, contain no unresolved `[NEEDS CLARIFICATION]` or `TODO` tags, and validator writes `Status: PASS`.
  - *Outputs*: Writes `.ai/reviews/<feature-slug>/spec-validation-report.md`.
- **D-08:** **Execution Gate (Execution → QA):**
  - *Inputs*: Code diff, `specs/<feature-slug>/tasks.md`.
  - *Outcome Rule*: All tasks in `tasks.md` marked checked, code builds, and the gate writes `Status: PASS`; otherwise it writes `Status: BLOCKED` or `Status: NEEDS_HUMAN_REVIEW`.
  - *Outputs*: `.ai/sessions/YYYY-MM-DD-gsd-execution-<feature-slug>.md`.
- **D-09:** **QA Gate (QA → Memory Handoff):**
  - *Inputs*: Execution session logs and code.
  - *Outcome Rule*: `.ai/reviews/<feature-slug>/qa-review.md` contains `Status: PASS`.
  - *Outputs*: `.ai/reviews/<feature-slug>/qa-review.md` and `.ai/sessions/YYYY-MM-DD-qa-<feature-slug>.md`.
- **D-10:** **Memory Handoff Gate (Memory Handoff → Ship):**
  - *Inputs*: Session logs, QA review, existing memory files, and optional handoff documents produced by the Matt Pocock `handoff` skill.
  - *Outcome Rule*: Hybrid judgment gate with deterministic minimum checks. `.ai/state/handoff.md` must exist, name the feature slug, list updated memory files, and link the QA/session inputs. A human or reviewer must confirm memory updates preserve decisions, risks, verification history, and current architecture without inventing facts. The `handoff` skill may standardize input summaries but is not the D-10 gate authority.
  - *Outputs*: Updated `.ai/memory/*` files and `.ai/state/handoff.md`.
- **D-11:** **Ship Gate:**
  - *Inputs*: `.ai/state/handoff.md` and previous review reports.
  - *Outcome Rule*: Writes `ship-decision.md` containing `Status: PASS` or judgment-only `Status: WARN` with `Blocking Issues: none` and no unresolved review blocks.
  - *Outputs*: `.ai/reviews/<feature-slug>/ship-decision.md`.

### Tool Routing Matrix
- **D-12:** **Detailed Matrix:** Map the development steps as follows:

| Phase | Task Type | Primary Tool | Specific Skill / Flow | Required Input | Required Output | Validator | Stop / Exit Condition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Recon** | Investigation | Serena / Semble / Context7 | Symbol lookup, semantic search, API docs | Target feature request | `.ai/sessions/YYYY-MM-DD-recon-<feature-slug>.md` | Check for listed files & API versions | All unknown APIs and target files listed |
| **Critique** | Planning Review | GStack CEO / Eng Manager | `plan-ceo-review`, `plan-eng-review` | Recon report, constitutional rules | `.ai/reviews/<feature-slug>/gstack-ceo-review.md`, `gstack-eng-review.md` | Verify judgment gate Status header | Status headers are set to `PASS` or judgment-only `WARN` with `Blocking Issues: none` |
| **Spec** | Specification | Spec-Kit | `speckit-specify`, `speckit-plan`, `speckit-tasks` | Reviews, Recon report | `specs/<feature-slug>/{spec,plan,tasks}.md` | `/speckit.analyze` | Spec-Kit files written; no `[NEEDS CLARIFICATION]` tags |
| **Gate** | Spec Validation | Custom script / Judge | Validator validation | Spec-Kit files | `.ai/reviews/<feature-slug>/spec-validation-report.md` | Verification of contract files and headers | Validation report outputs explicit `PASS`; deterministic validators do not emit `WARN` |
| **Execution** | Code writing | GSD Full | `gsd-execute-phase`, `gsd-quick` | Validated Spec-Kit files | Implemented code, `.ai/sessions/YYYY-MM-DD-gsd-execution-<feature-slug>.md` | Compiler/build checks | All `tasks.md` items checked off, code compiles |
| **QA** | Verification | GStack QA | `qa-only`, Playwright | Implemented code, spec criteria | `.ai/reviews/<feature-slug>/qa-review.md`, `.ai/sessions/YYYY-MM-DD-qa-<feature-slug>.md` | Test runners, Playwright tests | QA review shows `PASS`; all tests green |
| **Memory** | Handoff | Protocol / Human | `gsd-extract-learnings`, optional Matt Pocock `handoff` input producer | QA reports, session notes, optional handoff document | Updated `.ai/memory/*` files, `.ai/state/handoff.md` | Deterministic minimum checks plus reviewer judgment | `PASS` or judgment-only `WARN` with no blocking issues; memory updates certified without invented facts |
| **Ship** | Release | GStack Ship | `ship` | Memory handoff, all review logs | `.ai/reviews/<feature-slug>/ship-decision.md` | Pre-landing checklist | `PASS` or judgment-only `WARN` with no blocking issues; release branch created; PR submitted and verified |

### Failure Taxonomy
- **D-13:** **Failure Modes & Action Rules:**
  1. *Local Bug*: Stay in Step 4, fix locally using minimal diff, do not touch specs.
  2. *Spec Drift*: Stop execution, write `spec-failure-report.md`, return to Step 3 (Spec-Kit) to update spec/plan/tasks, re-run validation.
  3. *Tool Unavailable*: Switch to text-mode fallback, write block report, status `BLOCKED`, present plain-text questions, do not invent answers.
  4. *Context Fragmentation*: Read `CONTEXT.md`, `.ai/memory/*`, and `active-feature.json`. Resume only after state is explicit.
  5. *Path Drift*: Block execution if `.ai/state/active-feature.json` diverges from the actual `specs/<feature-slug>/` directory, or if duplicate feature specs are written outside canonical locations such as `.specify/specs/` or `.ai/specs/`.
  6. *Operational Block*: Use `BLOCKED` when execution cannot continue but the next machine/action step is known, such as missing inputs, unavailable tools, path drift, or deterministic check failure.
  7. *Human Decision Required*: Use `NEEDS_HUMAN_REVIEW` when execution cannot continue because judgment, trade-off approval, or explicit human authorization is required.
  8. *Validation Loop Exhausted*: Track retries with `retry_count` and `retry_scope` in `.ai/state/run-state.json`. After 3 failed retries for the same gate/scope, transition to `NEEDS_HUMAN_REVIEW` and write the human review packet.

### Human Review Safeguards
- **D-14:** **Safeguards Rule:** Recommended choices are for drafting only and cannot bypass human review gates. The agent must not automatically commit design phase changes without explicit user approval.
- **D-14a:** **Review Packet Schema:** Human review packets must include `feature_slug`, `current_phase`, `gate`, `status: NEEDS_HUMAN_REVIEW`, `blocking_question`, `recommended_answer`, `options_considered`, `affected_artifacts`, and `resume_instructions`.

### Memory Seeding
- **D-15:** **Memory Seeding Content:** Seed `.ai/memory/` files with the actual Snail Agent Flow protocol's facts, decisions, risks, architecture, and verification history.
- **D-15a:** **Tool Fallback Boundary:** Tool fallback is allowed only to preserve clarity, not to invent missing decisions. If a required tool is unavailable, the agent writes a block report, updates run state to `BLOCKED`, and presents plain-text next steps or questions.

### Thin Vertical Example
- **D-16:** **Proof of Concept Example:** Walk the feature `002-routing-gates-memory` through the full recon-to-ship pipeline, enforcing inputs, routing matrix, gate status parsing, path verification, memory writes, and shipping checks.
- **D-16a:** **Vertical Slice Evidence:** The proof of concept must verify `active-feature.json`, `run-state.json`, gate report parsing, validator-owned `verified_artifacts`, Path Drift handling, and Memory Handoff deterministic minimum checks.

### the agent's Discretion
None.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**
- [docs/prd.md](file:///Volumes/D/snail-agent-flow/docs/prd.md) — Product requirements and recommended pipeline architecture.
- [docs/adr/0001-separate-active-feature-and-run-state.md](file:///Volumes/D/snail-agent-flow/docs/adr/0001-separate-active-feature-and-run-state.md) — Decision to keep feature identity separate from mutable pipeline run state.
- [.planning/ROADMAP.md](file:///Volumes/D/snail-agent-flow/.planning/ROADMAP.md) — Phase definitions.
- [.planning/phases/02-routing-gates-and-memory-foundation/02-DISCUSSION-LOG.md](file:///Volumes/D/snail-agent-flow/.planning/phases/02-routing-gates-and-memory-foundation/02-DISCUSSION-LOG.md) — Phase 2 alternative choices and notes.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [docs/artifact-registry.md](file:///Volumes/D/snail-agent-flow/docs/artifact-registry.md) — Defines the canonical directory layout and file ownership.
- [.specify/scripts/bash/common.sh](file:///Volumes/D/snail-agent-flow/.specify/scripts/bash/common.sh) — Source library for script routines and environment setups.

### Established Patterns
- Current feature identity is pinned inside `.ai/state/active-feature.json`; Phase 2 introduces `.ai/state/run-state.json` for mutable gate, routing, memory handoff, path verification, retry, and block state.
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
