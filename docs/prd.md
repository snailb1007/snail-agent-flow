# AI Delivery Pipeline Blueprint

A lightweight operating protocol for AI coding agents that turns scattered skills into a repeatable **spec-to-ship** workflow.

> Goal: help users set up a clean AI coding workflow for both new and existing projects without being confused by many separated tools, skills, MCP servers, or prompt frameworks.

---

## 1. Core Idea

Modern AI coding workflows often combine many strong tools:

- Superpowers
- GStack
- GSD
- Spec-Kit / OpenSpec
- Serena
- Semble
- GitNexus
- Context7
- Promptfoo
- Playwright

The problem is not that these tools are weak. The problem is that users often do not know:

- which tool should run first;
- when to write a spec;
- when to read the existing codebase;
- when to stop AI from self-fixing;
- how to preserve project memory;
- how to avoid framework soup.

This repository defines a **thin orchestration protocol** that coordinates these tools into a reliable engineering pipeline.

It does **not** aim to replace GSD, Superpowers, GStack, Spec-Kit, OpenSpec, or code search tools.

It aims to provide:

- standard folder structure;
- standard AI instructions;
- standard pipeline phases;
- validation gates;
- failure feedback loops;
- human review circuit breakers;
- memory handoff rules;
- setup templates for new and existing projects.

---

## 2. Recommended Pipeline

```text
0. Superpowers Constitution
   ↓
1. Recon
   ↓
2. GStack CEO / Eng Manager Review
   ↓
3. Spec-Kit
   ↓
3.5 Spec Validation Gate
   ↓
4. GSD Full Execution
   ↓
4.5 Failure Feedback Loop
   ↓
5. GStack QA
   ↓
5.5 Memory Handoff
   ↓
6. GStack Ship
```

---

## 3. Phase Definitions

### Step 0 — Superpowers Constitution

Superpowers acts as the global engineering rule layer.

It defines non-negotiable rules such as:

- no blind rewrite;
- preserve existing behavior by default;
- strict type safety where applicable;
- OWASP/security baseline;
- smallest safe change;
- test-backed implementation;
- review before finalization;
- no shipping without verification.

This step answers:

```text
What rules must every agent obey?
```

---

### Step 1 — Recon

Recon means reconnaissance: a short investigation before planning or writing specs.

For existing projects, Recon is mandatory.

Recon should identify:

- relevant files and modules;
- source-of-truth code;
- existing behavior;
- TODO/custom/legacy/hack logic;
- risky areas;
- external libraries/APIs involved;
- current test and verification paths.

Recommended tools:

| Tool | Purpose |
|---|---|
| Serena | Symbol lookup, references, call sites, source-of-truth code |
| Semble | Broad semantic discovery when code location is unknown |
| GitNexus | Impact analysis, dependency graph, multi-module risk |
| Context7 | Third-party docs and version-specific APIs |

Recon output should be saved as:

```text
.ai/sessions/YYYY-MM-DD-recon-<feature-slug>.md
```

---

### Step 2 — GStack CEO / Eng Manager Review

GStack is used as a planning and critique layer.

CEO mode should challenge:

- whether this feature is worth doing;
- product scope;
- non-goals;
- user value;
- MVP boundary.

Eng Manager mode should challenge:

- architecture risk;
- implementation boundary;
- integration points;
- hidden edge cases;
- whether the plan is too broad;
- whether the change may break existing behavior.

This step should consume:

- Superpowers Constitution;
- Recon Report;
- existing project memory.

Output should be saved as:

```text
.ai/reviews/<feature-slug>/gstack-ceo-review.md
.ai/reviews/<feature-slug>/gstack-eng-review.md
```

---

### Step 3 — Spec-Kit / OpenSpec

This step creates the technical blueprint.

For the MVP, Spec-Kit is the canonical spec system.

Required artifacts:

```text
specs/<feature-slug>/spec.md
specs/<feature-slug>/plan.md
specs/<feature-slug>/tasks.md
specs/<feature-slug>/research.md
specs/<feature-slug>/data-model.md
specs/<feature-slug>/quickstart.md
specs/<feature-slug>/contracts/
```

The `specs/<feature-slug>/` directory is the source of truth for feature requirements, plan, and tasks. The `.ai/` directory must not duplicate or shadow these artifacts.

The spec must include:

- goal;
- non-goals;
- acceptance criteria;
- security considerations;
- test strategy;
- compatibility notes;
- rollback or recovery plan for risky changes;
- impacted files/modules;
- implementation tasks;
- explicit behavior-preservation rules.

This step answers:

```text
What exactly should be built, and how will we know it is correct?
```

---

### Step 3.5 — Spec Validation Gate

Before GSD execution starts, the generated spec must be validated.

The validator checks the generated spec against:

- Superpowers Constitution;
- Recon Report;
- GStack planning constraints;
- existing memory;
- known risks;
- behavior-preservation rules.

Validation result must be one of:

```text
PASS
FAIL
NEEDS_HUMAN_REVIEW
```

If validation returns `FAIL`, the system returns to Step 3 and revises the spec.

If validation fails more than 3 times for the same spec file or same validation category, the system must stop and mark the task as:

```text
NEEDS_HUMAN_REVIEW
```

The agent must not keep debating with itself indefinitely.

Validation report should be saved as:

```text
.ai/reviews/<feature-slug>/spec-validation-report.md
.ai/state/current-feature.md
.ai/state/active-run.md
```

Optional implementation:

- Promptfoo;
- custom script;
- LLM-as-judge with fixed rubric;
- markdown policy checker;
- CI preflight.

---

### Step 4 — GSD Full Execution

GSD Full receives the validated spec and performs implementation.

GSD consumes the Spec-Kit artifacts from Step 3. It must not create a competing feature spec or plan for the same work.

GSD must:

- follow `tasks.md`;
- keep diffs minimal;
- avoid broad refactors unless explicitly approved;
- preserve existing behavior;
- write tests or provide verification logs;
- update execution notes;
- avoid changing the spec silently.

Execution notes should be saved as:

```text
.ai/sessions/YYYY-MM-DD-gsd-execution-<feature-slug>.md
```

---

### Step 4.5 — Failure Feedback Loop

If build, test, runtime, or integration fails during Step 4, the agent must classify the failure before fixing it.

#### Local Implementation Failure

Examples:

- typo;
- missing import;
- small type mismatch;
- formatting/lint issue;
- minor test expectation mismatch caused by implementation detail.

Action:

```text
Fix locally inside Step 4.
Do not change the spec.
Keep the diff minimal.
```

#### Spec-Level Failure

Examples:

- planned library/API does not exist;
- incompatible dependency;
- architecture cannot support required behavior;
- spec contradicts existing behavior;
- missing security design;
- impossible or ambiguous acceptance criteria;
- implementation requires broad rewrite not approved in spec;
- wrong data model or integration boundary.

Action:

```text
Stop coding.
Write a Spec Failure Report.
Return to Step 3.
Revise spec/plan/tasks.
Re-run Spec Validation Gate.
```

Spec failure report should be saved as:

```text
.ai/reviews/<feature-slug>/spec-failure-report.md
```

---

### Step 5 — GStack QA

GStack QA validates the implementation before ship.

Recommended checks:

- test suite;
- build;
- typecheck;
- lint;
- Playwright/browser flow if UI exists;
- screenshot or visual check if applicable;
- manual verification logs;
- regression check for existing behavior.

QA report should be saved as:

```text
.ai/reviews/<feature-slug>/qa-review.md
.ai/sessions/YYYY-MM-DD-qa-<feature-slug>.md
```

---

### Step 5.5 — Memory Handoff

Before GStack Ship closes the session, the agent must update durable project memory.

Session notes are temporary. Project memory is the source of truth for future Recon.

The agent must read short Markdown files in:

```text
.ai/sessions/
.ai/reviews/<feature-slug>/
```

Then update:

```text
.ai/memory/project-summary.md
.ai/memory/current-architecture.md
.ai/memory/known-risks.md
```

Rules:

1. Do not copy session notes blindly.
2. Promote only durable, verified, project-relevant facts.
3. Mark stale facts as superseded.
4. Preserve behavior notes, compatibility hacks, TODO/custom logic, and risky areas.
5. Record architecture or behavior decisions with date, reason, and affected files.
6. Record verification evidence.
7. If memory update is ambiguous, mark it as `NEEDS_HUMAN_REVIEW`.
8. Ship must not run until Memory Handoff is complete.

Memory handoff report should be saved as:

```text
.ai/state/handoff.md
```

---

### Step 6 — GStack Ship

The final ship step creates the release/PR handoff.

GStack Ship owns release readiness. The executor must not be the release owner.

Required output:

- summary of changes;
- changed files;
- behavior preserved;
- tests run;
- QA evidence;
- risks;
- TODOs;
- memory handoff status;
- whether human review is needed.

Ship report should be saved as:

```text
.ai/reviews/<feature-slug>/ship-decision.md
```

---

## 4. Recommended Folder Structure

```text
.specify/
  memory/
    constitution.md

  specs/
    <feature-slug>/
      spec.md
      plan.md
      tasks.md
      research.md
      data-model.md
      quickstart.md
      contracts/

.ai/
  memory/
    project-summary.md
    current-architecture.md
    known-risks.md

  sessions/
    YYYY-MM-DD-<agent>-<task>.md

  reviews/
    <feature-slug>/
      gstack-ceo-review.md
      gstack-eng-review.md
      spec-validation-report.md
      qa-review.md
      ship-decision.md

  state/
    current-feature.md
    active-run.md
    handoff.md
```

`.specify/` owns feature specs and Spec-Kit templates (including a constitution template). `.ai/` owns orchestration state, session notes, reviews, and durable project memory. The active operational constitution is `.ai/constitution.md`; `.specify/memory/constitution.md` is a Spec-Kit template copy.

---

## 5. Tool Routing Rules

```text
Unknown code location      → Semble
Known symbol/class         → Serena
External API/library docs  → Context7
Multi-module impact        → GitNexus
Product/scope critique     → GStack CEO mode
Architecture critique      → GStack Eng Manager mode
Spec generation            → Spec-Kit
Spec validation            → Promptfoo/custom validator
Long execution             → GSD Full
Browser/manual QA          → GStack QA / Playwright
Release handoff            → GStack Ship
```

OpenSpec may be added later as an adapter for proposal/change/archive lifecycle. It is not a competing source of truth in the MVP.

Operational handling details are defined in:

- `docs/runbooks/failure-modes.md`

## 5.5 Failure-mode Policy

Failure-mode rules must exist in both this PRD and operational runbooks.

The PRD owns mandatory policy, invariants, and state transitions. The runbooks own concrete handling procedures, fallback behavior, examples, forbidden actions, and recovery checklists.

Rules:

- If interactive tool gates are unavailable, the agent must not silently bypass them.
- If implementation reveals spec drift, the flow must return to Step 3.
- If QA detects release-blocking issues, the flow must return to the responsible execution or spec stage.
- Before Ship, Memory Handoff must be complete.

Required transitions:

| Failure mode | Required transition |
|---|---|
| Interactive gate unavailable | Enter `BLOCKED` state |
| Spec drift | Return to Step 3 |
| Local implementation bug | Return to Step 4 |
| Context fragmentation | Run handoff/restore |
| QA release blocker | Return to Step 4 or Step 3, depending on root cause |

---

## 6. Human Review Circuit Breaker

The system must stop automatic revision when repeated validation failures occur.

Rules:

```text
1st validation failure → revise Step 3
2nd validation failure → revise Step 3 with narrower diff
3rd validation failure → stop and mark NEEDS_HUMAN_REVIEW
```

When this happens, create:

```text
.ai/reviews/<feature-slug>/human-review.md
```

The Human Review Packet must include:

- spec file path;
- failed rule;
- failure count;
- validator output;
- attempted fixes;
- relevant Recon notes;
- relevant Constitution clauses;
- recommended human decision options.

Optional notification channels:

- terminal stop message;
- Slack;
- Telegram;
- GitHub issue;
- PR comment.

---

## 7. Example Human Review Packet

```md
# Human Review Packet

## Status
NEEDS_HUMAN_REVIEW

## Spec file
specs/<feature-slug>/spec.md

## Failure count
3 consecutive validation failures

## Failed category
Security / Behavior Preservation

## Validator output summary
The spec still does not decide whether failed payment callbacks are allowed to mutate order state.

## Attempted fixes
1. Added logging-only behavior.
2. Added idempotency requirement.
3. Added duplicate callback test strategy.

## Why human review is required
The remaining issue is a business rule decision, not an implementation detail.

## Human options
A. Preserve current behavior: failed callbacks only log/alert.
B. Change behavior: failed callbacks update order to Failed.
C. Add feature flag/config to choose behavior.
D. Defer this requirement.

## Recommended option
A, unless product explicitly wants order state mutation.
```

---

## 8. Example Memory Handoff Report

```md
# Memory Handoff Report

## Session
2026-05-23-payment-logging

## Promoted to project memory
- Payment webhook handling is centralized in `PaymentWebhookController`.
- Idempotency is enforced before updating order state.
- Failed callbacks should be logged but must not change order status unless explicitly approved.

## Architecture updated
- Added logging boundary in `PaymentService`.
- No change to payment state machine.

## Known risks updated
- Do not remove gateway retry/reconcile logic.
- Do not return HTTP 200 if database update fails.

## Verification promoted
- `dotnet test` passed.
- Duplicate callback manual test passed.
- Logs verified locally.

## Superseded notes
- Previous note saying failed callback was ignored is superseded; it is now logged.

## Next Recon hints
- For future payment changes, inspect webhook, reconcile job, and transaction status mapping together.
```

---

## 9. CLI MVP Proposal

Initial CLI commands:

```bash
adp init
adp new-session "payment-logging"
adp status
adp validate-spec
adp handoff
adp doctor
```

### `adp init`

Creates:

```text
.ai/
.specify/
CLAUDE.md
AGENTS.md
```

### `adp new-session`

Creates:

```text
.ai/sessions/YYYY-MM-DD-<agent>-<task>.md
.ai/state/current-feature.md
.ai/state/active-run.md
```

### `adp validate-spec`

Runs spec validation gate.

### `adp handoff`

Checks whether Memory Handoff has been completed before ship.

### `adp doctor`

Checks missing files, broken state, missing memory, missing validation report.

---

## 10. Suggested Repo Structure

```text
ai-delivery-pipeline/
  README.md
  LICENSE
  package.json

  templates/
    base/
      CLAUDE.md
      AGENTS.md
      .ai/
        sessions/
          .gitkeep
        memory/
          project-summary.md
          current-architecture.md
          known-risks.md
        reviews/
          .gitkeep
        state/
          current-feature.md
          active-run.md
          handoff.md

      .specify/
        memory/
          constitution.md
        specs/
          .gitkeep

    minimal/
    typescript/
    dotnet/
    python/

  prompts/
    recon.md
    gstack-plan-review.md
    spec-generation.md
    spec-validation.md
    gsd-execution.md
    failure-classification.md
    qa.md
    memory-handoff.md
    ship.md

  validators/
    promptfoo/
      promptfooconfig.yaml
      spec-validation-rubric.md
    scripts/
      validate-spec.js
      check-memory-handoff.js
      check-session-state.js

  commands/
    claude/
    codex/
    cursor/
    generic/

  examples/
    new-project/
    existing-project/
    dotnet-wpf/
    typescript-webapp/

  docs/
    concepts.md
    pipeline.md
    folder-structure.md
    tool-routing.md
    human-review.md
    memory-handoff.md
```

---

## 11. MVP Roadmap

### Phase 1 — Template-only MVP

Ship:

- README;
- CLAUDE.md;
- AGENTS.md;
- `.ai` folder templates;
- prompt templates;
- pipeline docs.

No heavy CLI required.

### Phase 2 — CLI Init

Add:

```bash
adp init
adp new-session
adp status
```

### Phase 3 — Spec Validation Gate

Add:

```bash
adp validate-spec
```

Support Promptfoo optionally.

### Phase 4 — Memory Handoff Checker

Add:

```bash
adp handoff
```

### Phase 5 — Agent Presets

Add presets for:

- Claude Code;
- Codex;
- Cursor;
- Kiro;
- Windsurf;
- generic agents.

### Phase 6 — Optional MCP / Dashboard

Only after the protocol proves useful.

---

## 12. Design Principles

1. Thin protocol, not heavy framework.
2. Human-readable first.
3. Agent-readable by default.
4. Works for both new and existing projects.
5. No hidden magic.
6. Validation before execution.
7. Memory before ship.
8. Human review after repeated failure.
9. Tool-agnostic, but tool-aware.
10. Prevent framework soup.

---

## 13. Final Positioning

```text
Stop letting AI agents improvise. Give them a delivery pipeline.
```

Or:

```text
From scattered AI skills to a repeatable spec-to-ship workflow.
```

This project should not compete with GSD, Superpowers, GStack, Spec-Kit, or OpenSpec.

It should make them usable together through a clear, minimal, enforceable AI delivery protocol.
