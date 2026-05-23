# Operating Constitution Design

## Purpose

Define a hybrid operating constitution for this repository's AI delivery pipeline.
The constitution is the shared rule layer for agents, reviewers, specs, validators,
and shipping gates. It does not replace Superpowers, GStack, GSD, Spec-Kit,
OpenSpec, Serena, Semble, GitNexus, Context7, Promptfoo, or Playwright.
It constrains how those tools are selected, sequenced, and trusted.

The first implementation target is `.ai/constitution.md`.

## Context

This repository defines a thin orchestration protocol for AI-assisted software
delivery. Existing project docs already establish the pipeline:

1. Superpowers Constitution
2. Recon
3. GStack CEO / Eng Manager Review
4. Spec-Kit / OpenSpec
5. Spec Validation Gate
6. GSD Full Execution
7. Failure Feedback Loop
8. GStack QA
9. Memory Handoff
10. GStack Ship

The current `.ai/constitution.md` contains the right seed ideas but is too short
to serve as a policy source for validation gates or cross-agent handoff.

## Goals

- Replace the brief constitution with a durable operating constitution.
- Make hard rules explicit enough for validators and agents to apply.
- Preserve room for judgment through engineering principles.
- Align the constitution with the existing blueprint and pipeline files.
- Keep the document concise enough to be read before work starts.

## Non-Goals

- Do not create a competing project management framework.
- Do not duplicate full tool manuals for Superpowers, GStack, GSD, or MCP tools.
- Do not encode language-specific engineering rules unless they are broadly
  applicable.
- Do not modify execution scripts or validators in this change.

## Recommended Approach

Use a hybrid operating constitution with three layers:

1. Hard non-negotiables that can block work.
2. Engineering principles that guide tradeoffs.
3. Pipeline and artifact rules that make agent handoff reliable.

This is stronger than a principles-only handbook and easier to use than a pure
policy file. It matches the repository's purpose: orchestrating several capable
tools without letting the process become vague or self-referential.

## Constitution Structure

### 1. Authority Order

Define conflict resolution:

- Explicit user instructions have highest authority.
- Repository constitution comes next.
- Phase-specific artifacts come next.
- Tool defaults and model habits come last.

If a conflict affects safety, scope, data loss, security, or public behavior, the
agent must stop and request human review instead of guessing.

### 2. Non-Negotiables

The constitution must include hard rules:

- No blind rewrite.
- Preserve existing behavior by default.
- Recon before planning for existing projects.
- Spec before broad implementation.
- Smallest safe change.
- Test-backed implementation.
- Security baseline for all changes.
- No infinite self-repair loops.
- No shipping without verification.

These rules should use direct language such as `MUST`, `MUST NOT`, and `STOP`.

### 3. Engineering Principles

The constitution should guide day-to-day engineering decisions:

- Favor clarity over cleverness.
- Keep scope narrow and explicit.
- Use strict type safety where applicable.
- Protect compatibility and migration paths.
- Justify new dependencies.
- Avoid framework soup.
- Log architecture or behavior-changing decisions.
- Prefer explicit rollback or recovery paths for risky changes.

### 4. Pipeline Gates

Each major phase should have a clear entry and exit condition:

- Recon Gate
- Planning Critique Gate
- Spec Gate
- Spec Validation Gate
- Execution Gate
- QA Gate
- Memory Handoff Gate
- Ship Gate

Gate outcomes should be limited to:

- `PASS`
- `FAIL`
- `NEEDS_HUMAN_REVIEW`

### 5. Agent Operating Rules

The constitution should describe tool-selection behavior at a high level:

- Use codebase discovery before changing existing systems.
- Use impact analysis for shared or risky code.
- Use current third-party documentation for libraries, frameworks, SDKs, APIs,
  CLI tools, and cloud services.
- Use validation and QA tools before claiming completion.
- Do not skip verification because a change appears small.

The document should avoid binding the repo to one agent runtime's tool names
unless the existing project instructions already require them.

### 6. Failure Rules and Circuit Breakers

The constitution must stop unbounded loops:

- If the same validation category fails more than three times, stop.
- If the agent cannot distinguish between two materially different
  interpretations, stop.
- If a change may cause data loss, security regression, API incompatibility, or
  unrecoverable behavior change, stop unless the spec already covers it.

The stop state is `NEEDS_HUMAN_REVIEW`.

### 7. Artifact Contract

The constitution should name source-of-truth files and expected outputs:

- `.ai/constitution.md`
- `.ai/sessions/<session-id>/agent-recon.md`
- `.ai/sessions/<session-id>/gstack-plan-review.md`
- `.ai/specs/current/spec.md`
- `.ai/specs/current/plan.md`
- `.ai/specs/current/tasks.md`
- `.ai/specs/current/validation-report.md`
- `.ai/state/spec-validation-state.json`

Artifacts must be specific enough for another agent or human to resume work
without reconstructing hidden reasoning from chat history.

## Acceptance Criteria

- `.ai/constitution.md` is rewritten as a hybrid operating constitution.
- The document has explicit hard rules, engineering principles, pipeline gates,
  failure rules, and artifact contracts.
- The document remains concise and does not duplicate tool manuals.
- The document aligns with `ai-delivery-pipeline-blueprint.md`, `.ai/pipeline.md`,
  and `.ai/recon.md`.
- The document can be used as input to a future validation gate.

## Testing and Review

Validation for the constitution change should include:

- Markdown review for clarity, contradictions, and missing sections.
- Cross-check against the blueprint's pipeline phases.
- Search for vague placeholders or unresolved terms.
- Git diff review to confirm only intended documentation changed.

No runtime tests are required for the constitution-only change.

## Rollback

If the rewrite proves too heavy or misaligned, restore the previous
`.ai/constitution.md` from git and reintroduce only the accepted sections.

## Open Decisions

No open decisions remain. The selected approach is the hybrid operating
constitution.
