## Spec Validation

Before starting implementation (e.g. before running GSD), you MUST validate the feature specification, plan, and checklist by running:
```bash
node validators/scripts/validate-spec.js
```
If this script fails, do not proceed with implementation. If it fails 3 times consecutively, it will halt and generate a human review packet at `.ai/reviews/<feature-slug>/human-review.md`. To resume, fix the files and run:
```bash
node validators/scripts/validate-spec.js resume
```

## Verification Commands

```bash
npm run validate        # deterministic Spec-Kit validation
npm run test:validator  # validator unit coverage
npm run test:pipeline   # Phase 2 pipeline simulation
npm run test:cli        # CLI command integration coverage
npm test                # full validation suite
```

## Local CLI Commands

Use `node bin/adp.js <command>` from the repository checkout, or `adp <command>` / `saf <command>` when the package binary is installed.

```bash
node bin/adp.js init
node bin/adp.js new-session <name>
node bin/adp.js status
node bin/adp.js doctor
node bin/adp.js validate-spec
node bin/adp.js handoff
```

## Path Ownership & Folder Boundaries

- **`.specify/`**: Owns presets, templates, validation scripts, and the active feature pointer (`.specify/feature.json`).
- **`specs/<feature-slug>/`**: Owns canonical Spec-Kit files: `spec.md` (requirements), `plan.md` (architecture & changes), and `tasks.md` (checklist).
- **`.ai/`**: Owns mutable orchestration state (`run-state.json`), review logs, QA results, sessions, and durable project memory.

## Project Documentation

- `README.md` documents CLI usage, verification commands, and project structure.
- `CONTEXT.md` defines pipeline vocabulary and current orchestration terms.
- `docs/prd.md` describes the full AI delivery pipeline blueprint.
- `docs/artifact-registry.md` owns path and artifact ownership rules.
- `docs/tool-routing.md` maps pipeline phases to tools, validators, and stop conditions.
- `docs/memory-versus-sessions.md` defines durable memory versus temporary session logs.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
[plan.md](specs/017-context-budget-gate/plan.md)
<!-- SPECKIT END -->

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **snail-agent-flow** (2414 symbols, 3238 relationships, 45 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **Use risk-tiered impact analysis before editing symbols:**
  - **FAST (low risk)**: Skip impact analysis.
  - **STANDARD (medium risk)**: Advisory/optional impact analysis.
  - **FULL (high risk)**: Required impact analysis before edit, reporting the blast radius (direct callers, affected processes, risk level) to the user.
- **Mandatory impact analysis:** ALWAYS run `impact({target: "symbolName", direction: "upstream"})` before performing a `rename`, cross-module changes, or public-API changes.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

## Never Do

- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/snail-agent-flow/context` | Codebase overview, check index freshness |
| `gitnexus://repo/snail-agent-flow/clusters` | All functional areas |
| `gitnexus://repo/snail-agent-flow/processes` | All execution flows |
| `gitnexus://repo/snail-agent-flow/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

## Subagent & Parallel Execution Guidelines

1. **Detect Capability First:** Before planning parallel work, check whether your runtime exposes a tool for delegating work to subagents (for example Claude Code's `Agent`/Task tool or an equivalent parallel-task facility). If no such tool exists, do not simulate spawning: execute independent tasks sequentially in dependency-safe order, and use background execution only for long-running verification commands.
2. **Detect Independent Tasks:** Review the task list (e.g., `tasks.md`) and group tasks into waves; tasks in the same wave must share no files and no data dependencies.
3. **Spawn in Parallel (capable runtimes only):** Launch one subagent per independent task in the current wave. Each subagent prompt must be self-contained: goal, owned file list, and the verify command.
4. **Limit Context Size:** Pass each subagent only the files it owns plus the relevant spec section. Never pass session logs, the ledger, or other agents' outputs.
5. **Coordinate & Wait:** Wait for every subagent in a wave to finish and verify its results before starting the next wave or any dependent task.
6. **Protect Shared State:** Subagents write only to their assigned files. Only the orchestrating agent updates `.ai/state/*` and the ledger.

> Runtime note: This file is read by Codex and other AGENTS.md-compatible tools. Most of them expose no subagent tool — when none is available, always use the sequential fallback from rule 1.

## Context Budget and Subagent Orchestration Policy

1. **Estimate Byte Pressure:** Before starting any flow stage, estimate the byte pressure locally to decide the execution path (inline, context pack, or fresh session).
2. **Configure Thresholds:** Set conservative size thresholds (e.g. 50KB inline, 200KB context pack) in `.ai/state/context-policy.json` to prevent context bloat.
3. **Generate Context Packs:** When context packs are required, generate a structured pack containing only essential files and omit all others.
4. **Use Fresh Sessions:** When byte pressure exceeds limits, write a handoff artifact (`.ai/state/context-handoff.json`) and resume from a clean session.
5. **Protect Ledger State:** Parallel subagents must run in isolated workspaces with disjoint write targets and must never modify the central ledger.

## Autonomous ATLAS Loop

When asked to run the ATLAS auto loop, use the local `atlas-auto-loop` skill.
Read `.ai/state/flow-state.json`, resolve `.ai/flows/atlas-flow.yaml`, and follow the skill instructions.
Do not read or create `.ai/state/flow-ledger.json`.

<!-- snailb-skills:start -->
# Target Agent Bootstrap Policy

Auto-route by default. Users should not manually tag skills during normal work.
Agents infer intent and mode from the request, active artifact, repo state, and risk.
Broad actions like analysis, find, search, and research are operations, not manual skill triggers.

Route every non-trivial turn:
1. Detect mode/intent.
2. Choose the minimal correct tool or skill path.
3. Gather evidence.
4. Act or propose a plan according to the current agent mode.
5. Settle with verification and results.

Tool rules:
- Use Context7 MCP for current library, framework, SDK, API, CLI, and cloud-service docs.
- Use project-onboarding for first-time repo setup, architecture maps, commands, and constraints.
- Prefer `rg` and code-search for local repo discovery.
- Use context-mode for large outputs and derived analysis.
- Use scoped/tagged memory recall for cross-session continuity.

Skills are internal execution modules selected by the router, not user commands.
<!-- snailb-skills:end -->

## Behavioral Core

1. **State Assumptions:** Before implementation, name any assumptions that affect scope, behavior, data, or verification.
2. **Prefer Simplicity:** Choose the smallest sufficient implementation path and avoid speculative abstractions.
3. **Respect Boundaries:** Touch only files and symbols that are in scope for the accepted task, claim, or plan.
4. **Define Verification:** Know the command, test, or observable check that proves completion before claiming success.

## Snail Trail — Memory Compaction at Settle

At settle / session close, compact the session into durable memory — but do NOT do it inline in the main session, and do NOT pick the model yourself.

1. **Prep (deterministic):** Run `saf compact-memory`. It assembles a compaction input pack (the session logs, review notes, and current `.ai/memory/*`), scaffolds `.ai/state/handoff.md` from the template, and prints the prescribed fast model plus a subagent prompt skeleton. No LLM runs here.
2. **Prescribed model (not your choice):** Run the compaction on your runtime's mini tier (e.g. `gpt-5.4-mini`). If no subagent tool exists, run the compaction in a fresh cheap-model session — never inline in the main session.
3. **Delegate:** Spawn a subagent on that model and have it run the `/handoff` skill. If your runtime has no skill system, the subagent follows the handoff protocol directly (read `.ai/sessions/` + `.ai/reviews/<feature>/`; promote only durable, verified facts).
4. **Subagent writes only:** `.ai/memory/project-summary.md`, `.ai/memory/current-architecture.md`, `.ai/memory/known-risks.md`, `.ai/memory/decisions.md`, `.ai/memory/verification-history.md`, `.ai/memory/patterns.md`, `.ai/memory/gotchas.md`, and the handoff report `.ai/state/handoff.md` (with headers `## Promoted to project memory`, `## Architecture updated`, `## Verification promoted`). It must not touch other `.ai/state/*` ledger files.
5. **Verify:** As the main agent, run `saf handoff` to gate the result. Do not close the session until it exits 0.

> Runtime note: This file is read by Codex and other AGENTS.md-compatible tools. Most of them expose no subagent tool — when none is available, always use the sequential fallback from rule 1.
