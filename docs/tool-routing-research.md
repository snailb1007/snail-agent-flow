# Tool Routing Research

Source PRD: `docs/prd.md`

This note zooms out from the current pipeline and checks the named tools against the skills and docs available in this workspace.

## Current Pipeline Map

```text
0. Superpowers Constitution
1. Recon
2. GStack CEO / Eng Manager Review
3. Spec-Kit / OpenSpec
3.5 Spec Validation Gate
4. GSD Full Execution
4.5 Failure Feedback Loop
5. GStack QA
5.5 Memory Handoff
6. GStack Ship
```

## Superpowers: Actual Skills Found

Superpowers is best treated as the global engineering-method layer, not as a delivery executor.

Relevant skills found:

- `using-superpowers`: skill discovery and mandatory skill-routing discipline.
- `brainstorming`: requirements and design exploration before creative work.
- `writing-plans`: written implementation plans before multi-step code work.
- `executing-plans`: executing a written plan with review checkpoints.
- `test-driven-development`: test-first workflow for features and bug fixes.
- `systematic-debugging`: disciplined debugging before fixes.
- `verification-before-completion`: evidence before completion claims.
- `requesting-code-review`: review before merge or major completion.
- `receiving-code-review`: rigorous handling of review feedback.
- `finishing-a-development-branch`: merge/PR/cleanup options after verification.
- `dispatching-parallel-agents`: parallel independent work.
- `subagent-driven-development`: implementation plan execution with subagents.
- `using-git-worktrees`: isolated feature work.

Recommendation:

- Keep Step 0 as `Superpowers Constitution`.
- Do not route normal execution to "Superpowers".
- Use it to define non-negotiable rules for all later tools: skill routing, smallest change, TDD where applicable, systematic debugging, evidence-backed verification, code review, and branch completion.

## GSD: Actual Role

GSD is a phase/workflow engine. It owns execution state, planning artifacts, validation, UAT, handoff, and shipping support.

Relevant skills found:

- `gsd-spec-phase`: clarify what a phase delivers and produce `SPEC.md`.
- `gsd-discuss-phase`: adaptive phase questioning.
- `gsd-plan-phase`: detailed `PLAN.md` with verification loop.
- `gsd-execute-phase`: execute phase plans with wave-based parallelization.
- `gsd-quick`: quick task with GSD guarantees.
- `gsd-fast`: trivial inline task with no planning overhead.
- `gsd-autonomous`: run remaining phases through discuss -> plan -> execute.
- `gsd-map-codebase`: codebase map via parallel mapper agents.
- `gsd-validate-phase`: audit and fill validation gaps.
- `gsd-verify-work`: conversational UAT.
- `gsd-pause-work`: context handoff while pausing.
- `gsd-resume-work`: restore full context.
- `gsd-extract-learnings`: promote decisions, lessons, patterns, surprises.
- `gsd-forensics`: diagnose failed GSD workflows.
- `gsd-plan-review-convergence`: replan with review feedback until no high concerns.
- `gsd-review`: request cross-AI peer review of phase plans.
- `gsd-ui-review`: retroactive visual audit.
- `gsd-eval-review`: evaluation coverage audit for AI phases.
- `gsd-ship`: PR/review/merge preparation after verification.

Recommendation:

- Use GSD for Step 4 execution and Step 5.5 memory/handoff.
- Use GSD-specific validation/UAT skills after implementation when the artifact is a GSD phase.
- Decision: GSD consumes Spec-Kit artifacts only in this pipeline.
- Do not run `gsd-spec-phase` or `gsd-plan-phase` as competing spec/plan generators after Spec-Kit owns `specs/<feature-slug>/spec.md`, `plan.md`, and `tasks.md`.
- Use GSD primarily for execution, verification support, workflow state, UAT, learning extraction, and handoff.

## GStack: Actual Review Roles

GStack is best treated as the critique, QA, and release-readiness layer.

Relevant skills found:

- `plan-ceo-review`: product strategy, scope, ambition, MVP boundary.
- `plan-eng-review`: architecture, data flow, diagrams, edge cases, tests, performance.
- `plan-design-review`: UI/UX plan critique before implementation.
- `devex-review`: live developer-experience audit.
- `design-review`: live visual QA with screenshots and source fixes.
- `review`: pre-landing review.
- `qa` / `qa-only`: live QA.
- `ship`: ship workflow.
- `guard` / `careful` / `freeze`: safety controls around broad or risky work.
- `health`: code quality/project health.
- `context-save` / `context-restore`: GStack context continuity.
- `forensics` / `investigate`: post-failure investigation.

Recommendation:

- Step 2 should use `plan-ceo-review` and `plan-eng-review`.
- Add `plan-design-review` only when the feature has UI/UX surface.
- Add `devex-review` only for developer-facing features, CLIs, SDKs, docs, onboarding, or APIs.
- Step 5 should use `qa`/`qa-only`, with `design-review` for visual UI changes.
- Decision: Step 6 ship owner is GStack `ship`.
- GSD is the executor and must not be the release owner.
- `gsd-ship` can provide supporting evidence if useful, but final release/PR handoff ownership stays with GStack Ship.

## Spec-Kit / OpenSpec Placement

Context7 docs confirm:

- Spec Kit workflow centers on `specify`, `plan`, `tasks`, and `analyze`.
- `/speckit.analyze` checks consistency across `spec.md`, `plan.md`, and `tasks.md` before implementation.
- OpenSpec centers on `propose`, `apply`, `verify`, and `archive`, with change-local `proposal.md`, `design.md`, `tasks.md`, and specs.

Local Spec-Kit skills found:

- `speckit-specify`: create/update feature spec.
- `speckit-clarify`: ask up to five targeted clarification questions and encode answers.
- `speckit-plan`: generate implementation planning artifacts.
- `speckit-tasks`: generate dependency-ordered tasks.
- `speckit-analyze`: non-destructive cross-artifact consistency analysis.
- `speckit-checklist`: requirements-quality checklist, "unit tests for English".
- `speckit-taskstoissues`: convert tasks to GitHub issues.
- `speckit-implement`: execute `tasks.md`.

Recommendation:

- Step 3 should be the spec-authoring stage.
- Step 3.5 should explicitly run `speckit-analyze` or OpenSpec `verify`-style checks before execution.
- Decision: Spec-Kit is the canonical Step 3 spec system for the MVP.
- Spec-Kit owns `specs/<feature-slug>/spec.md`, `plan.md`, `tasks.md`, and related design artifacts.
- `.ai/` owns orchestration state, sessions, reviews, and durable memory only.
- OpenSpec is optional later as an adapter for proposal/change/archive lifecycle.
- Do not run OpenSpec as an equal authority for one feature unless there is a defined translation layer.

## Failure Modes

### AskUserQuestion Unavailable

GSD skills explicitly map Claude-style `AskUserQuestion` to Codex `request_user_input`.

If `request_user_input` is unavailable or rejected:

- enter text mode;
- present questions as a numbered plain-text list;
- stop and wait for the user;
- do not pick defaults;
- do not write workflow artifacts until the user answers, unless an explicit non-interactive flag or safe documented default exists.

PRD implication:

- Add this as a platform-adapter failure mode.
- Mark silent defaulting as a hard failure.

### Context Fragmentation

Observed risks:

- GSD agents use `fork_context: false` by default and load their own context via explicit files.
- GSD has pause/resume and extract-learnings skills.
- GStack has context-save/context-restore skills.
- The PRD has Memory Handoff, but it should define which memory artifact is canonical.

Recommendation:

- Treat `.ai/sessions/YYYY-MM-DD-<agent>-<task>.md` files as session-local.
- Promote only durable facts into project memory.
- Require a handoff packet before context reset, agent fan-out, or ship.

### Spec Drift

Observed risks:

- Spec-Kit, OpenSpec, and GSD can all create plan/spec/task artifacts.
- Execution may discover reality that contradicts the spec.
- QA may pass implementation behavior that no longer matches the approved spec.

Recommendation:

- Define one canonical feature-spec owner.
- Require Step 3.5 before execution.
- Require a spec-drift check at Step 4.5 when implementation failure suggests the spec is wrong.
- Require Step 5 QA to compare implementation evidence against accepted requirements, not just observed behavior.

## Open Decisions

1. Resolved: Spec-Kit is the canonical Step 3 spec system for the MVP.
2. Resolved: GSD consumes Spec-Kit artifacts only; it does not create competing `SPEC.md`/`PLAN.md` in this pipeline.
3. Resolved: GStack `ship` owns Step 6. GSD does not own release.
4. Resolved: failure-mode rules live in both `docs/prd.md` and `docs/runbooks/failure-modes.md`.
5. Resolved: `specs/<feature-slug>/` is the feature spec source of truth; `.ai/` is orchestration state only.

Failure-mode split:

- `docs/prd.md` owns mandatory policy, invariants, and state transitions.
- `docs/runbooks/failure-modes.md` owns concrete handling procedures, fallback behavior, examples, forbidden actions, and recovery checklists.
