# Phase 16: Context Budget Gate and Subagent Orchestration Policy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 16-context-budget-gate-and-subagent-orchestration-policy
**Areas discussed:** Context budget gate, Context pack shape, Subagent fan-out policy, Fresh session handoff, Validation and repair

---

## Context Budget Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic local estimator | Estimate context pressure from declared artifacts, referenced files, session artifacts, and context packs. Runtime-neutral and testable. | ✓ |
| Runtime chat-token introspection | Depend on each agent runtime exposing live context usage. More precise when available, but not portable. | |
| Advisory-only note | Document suggestions without blocking or routing behavior. Low enforcement value. | |

**User's choice:** Recommended default selected by instruction: deterministic local estimator.
**Notes:** User said to use recommended defaults and ask only when no recommendation or meaningful tradeoff exists.

---

## Context Pack Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal manifest | Objective, stage, decisions, files, exclusions, outputs, validation, stop conditions, and dependencies. References files by path. | ✓ |
| Full transcript bundle | Preserve all chat/session text. High continuity, but defeats the context-budget goal. | |
| Freeform handoff prose only | Easy to author, but hard to validate deterministically. | |

**User's choice:** Recommended default selected by instruction: minimal manifest.
**Notes:** Packs should be durable workspace artifacts under `.ai/` and should record intentional omissions.

---

## Subagent Fan-Out Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative fan-out | Spawn only for independent tasks with bounded context packs, disjoint ownership, capped concurrency, and parent join/merge. | ✓ |
| Aggressive fan-out | Spawn for most checklist items. Faster when perfect, but higher merge and context-fragmentation risk. | |
| Inline-only | Avoids coordination risk, but fails the phase goal of isolated subagent orchestration. | |

**User's choice:** Recommended default selected by instruction: conservative fan-out.
**Notes:** Default max parallelism should be conservative, with runtime fallback to sequential inline execution when subagents are unavailable.

---

## Fresh Session Handoff

| Option | Description | Selected |
|--------|-------------|----------|
| Stop with concise handoff | Write a resume artifact and stop when context pressure is too high. Preserve stage unless truly blocked. | ✓ |
| Keep working with warnings | Maintains momentum but risks losing the thread or omitting constraints. | |
| Mark stage blocked | Strong signal, but inaccurate when the only issue is context pressure. | |

**User's choice:** Recommended default selected by instruction: stop with concise handoff.
**Notes:** Fresh-session handoff is not a failure state.

---

## Validation and Repair

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic validation | Validate policy config, context packs, refs, fan-out conflicts, and handoff completeness. | ✓ |
| Documentation-only policy | Simpler but unenforced. | |
| LLM review gate | Flexible, but violates the project's deterministic-gate direction. | |

**User's choice:** Recommended default selected by instruction: deterministic validation.
**Notes:** `adp doctor` and strict init should detect missing or malformed policy artifacts once introduced.

---

## the agent's Discretion

- Exact module names, field names, context-pack directory, and numeric thresholds can be chosen during planning if they preserve the locked policy.
- Planner should pick the smallest integration that keeps flow-stage resolution, strict init, doctor, and tests coherent.

## Deferred Ideas

None.
