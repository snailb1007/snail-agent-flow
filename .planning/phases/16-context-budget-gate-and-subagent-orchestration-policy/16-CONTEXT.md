# Phase 16: Context Budget Gate and Subagent Orchestration Policy - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds a deterministic context budget and orchestration policy layer for the flow engine. The policy decides when work can continue inline, when a bounded context pack must be created, when the current session should stop with a handoff for a fresh session, and when independent work should be split into isolated subagents with minimal context. It builds on Phase 14 subagent-localization guidance and Phase 15 strict initialization/repair checks.

This phase does not make the flow engine execute subprocesses, automatically install tools, create a hosted agent runtime, or replace GSD/GStack/Spec-Kit orchestration. It defines deterministic policy, artifacts, validation, and agent instructions that existing flow stages can consume.

</domain>

<decisions>
## Implementation Decisions

### Context Budget Gate
- **D-16-01:** The budget gate should be deterministic and local/offline. It should estimate context pressure from declared artifacts, referenced files, session/handoff files, and context-pack manifests rather than relying on runtime-specific live chat token introspection.
- **D-16-02:** The policy should have three outcomes: `inline` when the required context is small enough to continue in the current session, `context_pack_required` when the agent should create a bounded context pack before continuing, and `fresh_session_required` when the current thread should stop after writing a resume/handoff artifact.
- **D-16-03:** Thresholds should be configurable, but the default should be conservative. The recommended default is to bias toward context packs before large implementation or review stages, and toward fresh-session handoff when prior session logs, phase plans, or accumulated review artifacts would need to be pasted wholesale.
- **D-16-04:** The gate should be integrated with flow-stage resolution, not as an unrelated advisory note. When the next stage is resolved, the flow engine should also report the context policy decision and required action before the agent starts work.

### Context Pack Shape
- **D-16-05:** Context packs should be minimal task manifests, not copied chat history. They should include objective, current stage, required decisions, required files, allowed files, excluded/noise files, expected outputs, validation commands, stop conditions, and dependency notes.
- **D-16-06:** Context packs should use durable workspace paths under `.ai/` so they can be handed to a fresh session or subagent without relying on hidden chat state. The planner may choose the exact subdirectory, but it should align with existing `.ai/sessions/` or `.ai/state/` ownership rather than creating a competing source of truth.
- **D-16-07:** Each context pack should reference canonical files by path instead of embedding large file bodies. Embedding snippets is acceptable only when the source file is large and the specific lines are needed to keep the pack bounded.
- **D-16-08:** Context packs should record what was intentionally omitted. This prevents downstream agents from assuming missing history is accidental and reloading broad logs or unrelated planning artifacts.

### Subagent Fan-Out Policy
- **D-16-09:** Subagent spawning should be allowed only for independent, non-sequential tasks with disjoint or explicitly coordinated file ownership. If tasks share files, mutate the same ledger/state artifact, or depend on ordered decisions, keep them inline or sequence them.
- **D-16-10:** Fan-out should require one context pack per subagent. A subagent should receive only its assigned objective, required references, expected output, and verification responsibility; it should not inherit the full parent session history.
- **D-16-11:** The policy should cap default parallelism conservatively. Recommended default: at most three active subagents unless the user or flow definition explicitly raises the limit.
- **D-16-12:** Parent orchestration remains responsible for join/merge. Subagents may produce findings, plans, patches, or verification notes, but the parent must reconcile outputs, resolve conflicts, and advance the ledger only after all required subagent results are complete.
- **D-16-13:** Runtime differences must be explicit. The policy should describe a generic fan-out intent and adapter-specific mappings; if a runtime cannot spawn subagents, the required fallback is sequential inline execution using the same context packs.

### Fresh Session Handoff
- **D-16-14:** When the policy returns `fresh_session_required`, the agent should write a concise handoff/resume artifact and stop rather than pushing deeper into an overloaded context. The handoff should name the next skill/command, phase/stage, required context pack, open risks, and verification commands.
- **D-16-15:** Fresh-session handoff is not a failure state. It should preserve the current flow stage unless the stage is genuinely blocked by missing artifacts or prerequisites.
- **D-16-16:** The handoff path should be reported in terminal/chat output and, where applicable, linked from ledger or state metadata so a new session can resume deterministically.

### Validation and Repair
- **D-16-17:** Add deterministic validation for context-policy configuration and generated context packs. Validation should check required fields, known outcome values, referenced file existence, duplicate file ownership in fan-out groups, and max-parallelism bounds.
- **D-16-18:** `adp doctor` and strict init checks from Phase 15 should detect missing or malformed context-policy artifacts once this phase introduces them.
- **D-16-19:** Validation should fail closed for unsafe orchestration instructions, such as a subagent plan with overlapping write targets and no coordination note, missing context packs for fan-out tasks, or a fresh-session handoff that lacks a resume target.

### the agent's Discretion
The user asked to use recommended defaults for all decisions and only ask when no recommendation is possible or a real tradeoff blocks a clear choice. Downstream agents may choose exact module names, field names, file locations, and threshold values during planning, provided they preserve the deterministic/offline policy, runtime-neutral fallback behavior, minimal context-pack shape, and validation requirements above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Prior Decisions
- `.planning/ROADMAP.md` — Phase 16 goal, dependency on Phase 15, and fixed scope.
- `.planning/PROJECT.md` — Core constraints: orchestration-focused product, runtime neutrality, local file-based state, no automatic tool installation, and verification-required completion.
- `.planning/REQUIREMENTS.md` — Active v2 requirements and the existing SUB/WARN/INIT boundaries that this policy builds on.
- `.planning/STATE.md` — Current milestone state and accumulated context noting Phase 16.
- `.planning/phases/14-improve-ai-for-spawn-subagent-support/14-CONTEXT.md` — Locked subagent localization, instruction-file, and parallel execution decisions.
- `.planning/phases/15-strict-initialization-checks-and-detailed-installation-guide/15-CONTEXT.md` — Locked strict-init, repair-guide, and local workflow validation decisions.

### Existing Implementation
- `.ai/flows/rough-project-flow.yaml` — Current 10-stage flow definition and stage skill/artifact declarations.
- `.ai/state/flow-ledger.json` — Current ledger state shape and stage-status data that policy integration may extend or annotate.
- `lib/flow-engine.js` — Stage resolution, artifact checks, stage prerequisite checks, ledger mutation helpers, and formatted stage instruction output.
- `lib/flow-ledger.js` — Ledger creation from flow definitions.
- `lib/tool-validator.js` — Existing prerequisite validation and installation/repair instruction patterns.
- `bin/adp.js` — CLI entry point for init, doctor, validation, and flow-related commands.
- `validators/scripts/test-flow-engine.js` — Existing unit coverage pattern for flow engine helpers.

### Specs and Docs
- `specs/010-flow-engine-skill/spec.md` — Flow engine skill contract, especially the boundary that the skill instructs agents and does not execute subprocesses.
- `specs/011-prerequisite-tool-checker-installation/spec.md` — Existing prerequisite warning behavior that Phase 16 should preserve.
- `docs/tool-routing.md` — Routing matrix and stop conditions for stages and validators.
- `docs/prd.md` — Product blueprint and long-term workflow intent.
- `docs/artifact-registry.md` — Artifact ownership rules for choosing context-pack and handoff locations.

### Codebase Maps
- `.planning/codebase/STACK.md` — Runtime/tool dependency context.
- `.planning/codebase/ARCHITECTURE.md` — Flow architecture and current file-based state model.
- `.planning/codebase/CONVENTIONS.md` — CLI/script style, artifact style, and process conventions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resolveNextStage` in `lib/flow-engine.js`: the natural integration point for returning or attaching the context-policy decision alongside the next actionable stage.
- `formatStageInstruction` in `lib/flow-engine.js`: can be extended to print the policy result, required context pack, handoff requirement, or fan-out instructions.
- `checkArtifacts` and `resolveTemplatePath` in `lib/flow-engine.js`: reusable for validating context-pack references and resolving `{feature_dir}`, `{feature_slug}`, or `{phase_id}` paths.
- `checkStagePrerequisites` in `lib/flow-engine.js`: established pattern for stage-level preflight checks before instruction output.
- `createLedgerFromFlow` in `lib/flow-ledger.js`: may need to initialize policy metadata if the planner chooses ledger-backed policy state.
- `validatePrerequisites` / `getToolInstructions` in `lib/tool-validator.js`: pattern for deterministic checks plus actionable guidance without runtime network calls.

### Established Patterns
- Flow definitions are YAML data, not executable code.
- Ledger state is JSON and deterministic; stage transitions use explicit status values.
- CLI code uses CommonJS, 2-space indentation, semicolons, and local/offline checks.
- Existing policy consistently avoids automatic installation, subprocess execution from skills, and LLM-as-judge validation.
- Planning artifacts and repair/handoff artifacts should use concrete workspace-relative paths.

### Integration Points
- Flow-stage resolution should emit the context budget decision before agents invoke the next skill.
- Strict init and `adp doctor` should validate policy configuration after Phase 16 adds it.
- Flow validation tests should cover valid policy config, malformed context packs, fan-out conflicts, and fresh-session handoff requirements.
- Instruction files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) may need a generated or updated section describing context-pack and fan-out behavior, building on Phase 14's subagent guidelines.

</code_context>

<specifics>
## Specific Ideas

The user explicitly approved recommended defaults for all choices and asked to be asked only when no recommended path exists or when there is a real tradeoff. This context therefore locks the recommended path: deterministic policy, minimal context packs, conservative fan-out, runtime-neutral fallback, and validation-first integration.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Automatic subprocess execution, hosted orchestration, automatic tool installation, and multi-flow support remain outside this phase.

</deferred>

---

*Phase: 16-context-budget-gate-and-subagent-orchestration-policy*
*Context gathered: 2026-05-26*
