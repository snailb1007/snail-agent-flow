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

## Path Ownership & Folder Boundaries

- **`.specify/`**: Owns presets, fixtures, templates, validation scripts, optional evaluation rubric, and the active feature pointer (`.specify/feature.json`).
- **`specs/<feature-slug>/`**: Owns canonical Spec-Kit files: `spec.md` (requirements), `plan.md` (architecture & changes), and `tasks.md` (checklist).
- **`.ai/`**: Owns mutable orchestration state (`run-state.json`), review logs, QA results, sessions, and durable project memory.
- **`.github/workflows/`**: Owns release packaging and CI verification workflows.

## Project Documentation

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

When asked to run the ATLAS auto loop, use the local `atlas-auto-loop` skill.
Read `.ai/state/flow-state.json`, resolve `.ai/flows/atlas-flow.yaml`, and follow the skill instructions.
Do not read or create `.ai/state/flow-ledger.json`.
