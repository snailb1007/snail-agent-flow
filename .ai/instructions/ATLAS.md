# SAF / ATLAS Instructions

> Your project already had instruction files (CLAUDE.md / GEMINI.md / AGENTS.md), so Snail
> Agent Flow did not modify them. The guidance SAF would normally add lives here instead.
> To follow SAF, read this file alongside your existing instruction files.

## Autonomous ATLAS Loop

When asked to run the ATLAS auto loop, use the local `atlas-auto-loop` skill.
Read `.ai/state/flow-state.json`, resolve `.ai/flows/atlas-flow.yaml`, and follow the skill instructions.
Do not read or create `.ai/state/flow-ledger.json`.

## Subagent & Parallel Execution Guidelines

1. **Detect Capability First:** Before planning parallel work, check whether your runtime exposes a tool for delegating work to subagents (for example Claude Code's `Agent`/Task tool or an equivalent parallel-task facility). If no such tool exists, do not simulate spawning: execute independent tasks sequentially in dependency-safe order, and use background execution only for long-running verification commands.
2. **Detect Independent Tasks:** Review the task list (e.g., `tasks.md`) and group tasks into waves; tasks in the same wave must share no files and no data dependencies.
3. **Spawn in Parallel (capable runtimes only):** Launch one subagent per independent task in the current wave. Each subagent prompt must be self-contained: goal, owned file list, and the verify command.
4. **Limit Context Size:** Pass each subagent only the files it owns plus the relevant spec section. Never pass session logs, the ledger, or other agents' outputs.
5. **Coordinate & Wait:** Wait for every subagent in a wave to finish and verify its results before starting the next wave or any dependent task.
6. **Protect Shared State:** Subagents write only to their assigned files. Only the orchestrating agent updates `.ai/state/*` and the ledger.

> Runtime note: This file may be read by any runtime (Claude Code, Codex, Antigravity, ...). Resolve the actual subagent tool from your own tool list per rule 1.

## Context Budget and Subagent Orchestration Policy

1. **Estimate Byte Pressure:** Before starting any flow stage, estimate the byte pressure locally to decide the execution path (inline, context pack, or fresh session).
2. **Configure Thresholds:** Set conservative size thresholds (e.g. 50KB inline, 200KB context pack) in `.ai/state/context-policy.json` to prevent context bloat.
3. **Generate Context Packs:** When context packs are required, generate a structured pack containing only essential files and omit all others.
4. **Use Fresh Sessions:** When byte pressure exceeds limits, write a handoff artifact (`.ai/state/context-handoff.json`) and resume from a clean session.
5. **Protect Ledger State:** Parallel subagents must run in isolated workspaces with disjoint write targets and must never modify the central ledger.

## Behavioral Core

1. **State Assumptions:** Before implementation, name any assumptions that affect scope, behavior, data, or verification.
2. **Prefer Simplicity:** Choose the smallest sufficient implementation path and avoid speculative abstractions.
3. **Respect Boundaries:** Touch only files and symbols that are in scope for the accepted task, claim, or plan.
4. **Define Verification:** Know the command, test, or observable check that proves completion before claiming success.

## Snail Trail — Memory Compaction at Settle

At settle / session close, compact the session into durable memory — but do NOT do it inline in the main session, and do NOT pick the model yourself.

1. **Prep (deterministic):** Run `saf compact-memory` (optionally `--focus "<next session goal>"`). It assembles a compaction input pack (the session logs, review notes, and current `.ai/memory/*`), scaffolds `.ai/state/handoff.md` from the template, and prints the prescribed fast model plus a subagent prompt skeleton. No LLM runs here.
2. **Prescribed model (not your choice):** Run the compaction on your runtime's fastest/cheapest model tier. Resolve the spawn mechanism from your own tool list; do NOT use the main session's model and do NOT decide the tier ad hoc.
3. **Delegate:** Spawn a subagent on that model and have it run the `/handoff` skill. If your runtime has no skill system, the subagent follows the handoff protocol directly (read the compact pack and listed files only; promote only durable, verified facts).
4. **Subagent writes only:** `.ai/memory/project-summary.md`, `.ai/memory/current-architecture.md`, `.ai/memory/known-risks.md`, `.ai/memory/decisions.md`, `.ai/memory/verification-history.md`, `.ai/memory/patterns.md`, `.ai/memory/gotchas.md`, and the handoff report `.ai/state/handoff.md`. The report leads with a plain-language `## Session Summary` (what we did / changed / verified / open) for the human reader, may include optional `## Suggested Next Skills`, then the three gate headers `## Promoted to project memory`, `## Architecture updated`, `## Verification promoted`. Reference existing artifacts by path/link instead of duplicating them, and redact secrets/PII as `REDACTED`. It must not touch other `.ai/state/*` ledger files.
5. **Verify:** As the main agent, run `saf handoff` to gate the result. Do not close the session until it exits 0.

> Runtime note: This file may be read by any runtime (Claude Code, Codex, Antigravity, ...). Resolve the actual subagent tool from your own tool list per rule 1.
