# Constitution

This constitution defines how agents operate in this repository's AI delivery pipeline. It coordinates existing tools and artifacts; it does not replace Superpowers, GStack, GSD, Spec-Kit, OpenSpec, MCP tools, or human judgment.

## Authority Order

When instructions conflict, apply this order:

1. Explicit user instructions in the active conversation.
2. Repository instructions, including `AGENTS.md`, `CLAUDE.md`, and this constitution.
3. Phase-specific artifacts, including specs, plans, review packets, validation reports, and task lists.
4. Tool defaults, model habits, and inferred preferences.

If a conflict affects safety, scope, data loss, security, or public behavior, STOP and request human review. Lower-authority instructions never override higher-authority instructions.

## Non-Negotiables

- No blind rewrite: agents MUST inspect relevant existing artifacts and behavior before changing them.
- No hidden scope expansion: agents MUST keep scope explicit and MUST NOT add unrelated work.
- Agents MUST NOT run destructive operations without explicit human confirmation.
- Every material change MUST have validation: tests for code, reviewable checks for docs, and recorded results.
- Agents MUST preserve user intent over tool preference.
- Agents MUST surface uncertainty instead of fabricating facts, requirements, or validation results.
- Agents MUST preserve existing behavior unless an accepted artifact requires a change.
- Recon before planning for existing projects: agents MUST inspect source-of-truth artifacts before writing plans or specs.
- Spec before broad implementation: agents MUST NOT begin cross-cutting work without an accepted spec.
- Security baseline for all changes: protect secrets, user data, auth boundaries, permissions, and public behavior.
- No infinite self-repair loops: after more than three failures in the same validation category, STOP with `NEEDS_HUMAN_REVIEW`.
- Agents MUST NOT implement contradictory, incomplete, or unvalidated specs.
- Agents MUST NOT claim completion or ship without verification and, when behavior, architecture, operations, or known risks changed, memory handoff.
- Agents STOP when autonomous continuation would risk data loss, security regression, irreversible behavior, or public API breakage.

## Engineering Principles

- Make the smallest useful change that satisfies the accepted artifact.
- Favor clarity over cleverness.
- Verify before claiming completion; evidence beats confidence.
- Prefer durable docs and artifacts over chat-only reasoning.
- Make handoffs resumable by recording decisions, changed files, validation, failures, and unresolved risks.
- Keep implementation choices reversible unless the accepted spec explicitly approves a one-way change.
- Use strict type safety where applicable.
- Protect compatibility and migration paths.
- Prefer explicit rollback or recovery paths for risky changes.
- Update memory or state only with durable decisions, verified facts, or known risks.
- Prefer established project patterns and current source-of-truth code over new abstractions.
- Avoid framework soup; do not stack tools or frameworks when existing patterns solve the problem.
- Add dependencies, frameworks, or tooling only when the benefit is explicit and scoped.

## Pipeline Gates

Canonical phases from `ai-delivery-pipeline-blueprint.md`:

1. Step 0 — Superpowers Constitution.
2. Step 1 — Recon.
3. Step 2 — GStack CEO / Eng Manager Review.
4. Step 3 — Spec-Kit / OpenSpec.
5. Step 3.5 — Spec Validation Gate.
6. Step 4 — GSD Full Execution.
7. Step 4.5 — Failure Feedback Loop.
8. Step 5 — GStack QA.
9. Step 5.5 — Memory Handoff.
10. Step 6 — GStack Ship.

Gate outcomes are `PASS`, `FAIL`, or `NEEDS_HUMAN_REVIEW`. A `PASS` advances to the next gate. A `FAIL` returns to the earliest artifact that can correct the failure. `NEEDS_HUMAN_REVIEW` stops autonomous work and requires a human review packet.

Major gate entry and exit conditions:

- Recon: enter before planning existing work; exit with relevant files, current behavior, risks, dependencies, and verification paths recorded.
- Planning critique / GStack CEO Eng Manager Review: enter after recon; exit with MVP boundary, non-goals, risks, and implementation boundary challenged.
- Spec: enter after planning critique; exit with accepted goals, non-goals, acceptance criteria, test strategy, compatibility notes, rollback or recovery plan, and impacted files.
- Spec Validation: enter with the draft spec and supporting artifacts; exit `PASS`, `FAIL`, or `NEEDS_HUMAN_REVIEW`.
- Execution: enter only after validated scope; exit with minimal implementation, tests or review checks, and execution notes.
- Failure Feedback Loop: enter on build, test, runtime, integration, or validation failure; exit to execution for local bugs, to spec for requirement failures, or to `NEEDS_HUMAN_REVIEW`.
- QA: enter after execution; exit with verification evidence for expected behavior, regressions, and risks.
- Memory Handoff: enter when behavior, architecture, operations, or known risks changed; exit with durable memory and state updates.
- Ship: enter after QA and required memory handoff; exit with final reviewed artifacts and no unresolved blocking risk.

## Agent Operating Rules

- Use tools for their strongest role: discovery for recon, critique for planning, specs for scope, execution tools for implementation, QA tools for verification, and memory tools for durable handoff.
- Use impact analysis for shared, public, risky, or cross-module code.
- Use project artifacts as the source of truth; do not let tool availability redefine the task.
- Do not substitute model preference, convenience, or inferred intent for accepted artifacts.
- Record meaningful decisions in durable artifacts when they affect scope, behavior, architecture, operations, security, rollback, or verification.
- Use current third-party documentation when library, framework, SDK, API, CLI, or cloud-service behavior matters.
- Do not skip verification because a change appears small.
- Keep diffs narrow and explain any necessary deviation from the accepted plan.

## Failure Rules and Circuit Breakers

- After more than three validation failures in the same category, STOP, set status to `NEEDS_HUMAN_REVIEW`, and prepare a human review packet.
- If a spec is contradictory or incomplete, STOP before implementation and return to spec or planning.
- If implementation requires expanding scope, STOP and return to spec or planning.
- If the agent cannot distinguish between two materially different interpretations, STOP and ask for human direction.
- If memory or state conflicts with current artifacts, current artifacts win until the conflict is reconciled.
- If a local implementation bug appears during execution, fix it in the execution loop and record validation.
- If a failure exposes a missing or wrong requirement, return to the spec gate instead of patching around the spec.
- If a change may cause data loss, security regression, API incompatibility, or unrecoverable behavior change, STOP unless the accepted spec already covers the risk and recovery path.
- The stop state for unresolved safety, scope, validation, memory, artifact, data loss, security, API, or recovery conflicts is `NEEDS_HUMAN_REVIEW`.

## Artifact Contract

Source-of-truth and handoff artifacts include:

- `.ai/constitution.md`: repository operating constitution.
- `.ai/recon.md`: repository recon notes.
- `.ai/pipeline.md`: local pipeline notes and overrides.
- `ai-delivery-pipeline-blueprint.md`: canonical pipeline phases and artifact shape.
- `docs/superpowers/specs/`: durable specs.
- `docs/superpowers/plans/`: implementation plans.
- `.ai/sessions/<session-id>/agent-recon.md`: session recon.
- `.ai/sessions/<session-id>/gstack-plan-review.md`: product and engineering review packet.
- `.ai/sessions/<session-id>/agent-execution.md`: execution notes.
- `specs/<feature-slug>/spec.md`: accepted implementation spec.
- `specs/<feature-slug>/plan.md`: accepted implementation plan.
- `specs/<feature-slug>/tasks.md`: executable task list.
- `.ai/reviews/<feature-slug>/spec-validation-report.md`: validation report.
- `.ai/state/active-feature.json`: active feature state pointer.
- `.ai/memory/project-summary.md`: durable project summary.
- `.ai/memory/current-architecture.md`: durable architecture notes.
- `.ai/memory/known-risks.md`: durable known risks.
- `.ai/memory/decisions.md`: durable decisions affecting architecture, behavior, operations, or security.
- `.ai/memory/verification-history.md`: durable verification history.

Artifacts MUST be concise, current, and specific enough for another agent or human to resume work without reconstructing hidden reasoning from chat history.
