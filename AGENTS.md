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
[plan.md](file:///Volumes/D/snail-agent-flow/specs/017-context-budget-gate/plan.md)
<!-- SPECKIT END -->

# RTK Token Optimization Rules
You are integrated with RTK (Rust Token Killer). When executing or reading outputs of system commands, you must respect the compressed structural signatures to preserve context tokens:

- Git Status: Interpret short hex indicators and bulleted branches (e.g., "📌 master") as standard clean working trees.
- Test Runners: Expect failed assertions only. Ignore truncated lines for passing suites.
- File Tree/Operations: Recognize that boilerplate directories (node_modules, .git, target, target/debug) are hidden by default; do not re-run commands to find them unless explicitly requested.
- Error logs: Focus strictly on the core stack trace signals; summary formats contain the complete execution diagnostic.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **snail-agent-flow** (3093 symbols, 3756 relationships, 26 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

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

1. **Detect Independent Tasks:** Before starting execution, review the task list (e.g., `tasks.md`) to identify independent, non-sequential tasks.
2. **Define Specialized Subagents:** For each independent task or sub-project, define a specialized subagent using the `define_subagent` tool.
3. **Spawn in Parallel:** Invoke the defined subagents in parallel using the `invoke_subagent` tool to execute tasks concurrently.
4. **Limit Context Size:** Do not pass large session logs or redundant context files to subagents. Keep their context focused and lightweight.
5. **Coordinate & Wait:** Wait for all parallel subagents to complete before advancing to downstream tasks that depend on their outputs.

## Context Budget and Subagent Orchestration Policy

1. **Estimate Byte Pressure:** Before starting any flow stage, estimate the byte pressure locally to decide the execution path (inline, context pack, or fresh session).
2. **Configure Thresholds:** Set conservative size thresholds (e.g. 50KB inline, 200KB context pack) in `.ai/state/context-policy.json` to prevent context bloat.
3. **Generate Context Packs:** When context packs are required, generate a structured pack containing only essential files and omit all others.
4. **Use Fresh Sessions:** When byte pressure exceeds limits, write a handoff artifact (`.ai/state/context-handoff.json`) and resume from a clean session.
5. **Protect Ledger State:** Parallel subagents must run in isolated workspaces with disjoint write targets and must never modify the central ledger.

## Autonomous ATLAS Loop

1. **Read current state:** Load `.ai/state/flow-state.json` to determine current stage.
2. **Execute stage action:** Read `atlas-flow.yaml` for the current stage's `agent_action`.
3. **Run gate:** Execute the stage's `gate` script. If FAIL, fix and retry.
4. **Transition:** On gate PASS, run the stage's `post_gate` script.
5. **Loop:** Repeat from step 1 until stage = settle and status = done.
6. **HIL stops:** validate-spec fail ×3, FULL profile at act needs sign-off.
7. **Contracts:** Resolve artifacts via `.claude/skills/contracts`.
8. **Avoid deprecated:** Do not read/create `.ai/state/flow-ledger.json`.
