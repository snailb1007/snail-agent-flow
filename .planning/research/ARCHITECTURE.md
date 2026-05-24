# Architecture Research: Snail Agent Flow

**Domain:** AI coding workflow orchestration protocol / local spec-to-ship agent pipeline  
**Researched:** 2026-05-24  
**Confidence:** HIGH for current repository structure; MEDIUM for target implementation details until the CLI/runtime stack is chosen.

## Executive Recommendation

Structure Snail Agent Flow as a **file-based orchestration protocol** first, then add thin adapters and validation tools around that protocol. The roadmap should avoid treating the repo like an app runtime until the artifact contract, gate semantics, and path ownership are stable.

The core architectural boundary is not "frontend/backend"; it is:

1. **Governance and product intent**: docs that define what the workflow means.
2. **Active workflow state**: `.ai/` artifacts that agents read and write during work.
3. **Tool adapters**: runtime-specific commands, skills, and hooks for Claude, Gemini, GSD, Spec-Kit, and future agents.
4. **Reusable product implementation**: future templates, validators, prompts, CLI commands, and examples that can be distributed without overwriting this repo's live state.

This separation matters because the current repo is brownfield documentation infrastructure. It already has meaningful operating files, but it does not yet have a root package manifest, runtime service, public API, app source tree, automated tests, or deploy target.

## Current State

| Area | Current Path | Status | Architectural Meaning |
|------|--------------|--------|------------------------|
| Product blueprint | `docs/prd.md` | Present | Defines the desired spec-to-ship pipeline and future structure. |
| Agent entry instructions | `CLAUDE.md`, `GEMINI.md` | Present | Runtime-specific repository entry points. |
| Operating policy | `.ai/constitution.md` | Present | Highest-value protocol artifact; defines gates, rules, failure boundaries, and artifact expectations. |
| Active AI state | `.ai/recon.md`, `.ai/pipeline.md`, `.ai/specs/`, `.ai/sessions/`, `.ai/memory/`, `.ai/reviews/` | Present, partly placeholder | Current workflow state and durable memory area. |
| Gemini/Spec-Kit adapter | `.gemini/commands/`, `.specify/` | Present | Tool-specific command scaffold and shell helpers. |
| Local skills | `.agents/skills/` | Present | Project-local agent behavior modules. |
| Planning system | `.planning/` | Present | GSD project management, codebase map, and research artifacts. |
| Runtime implementation | `package.json`, `commands/`, `templates/`, `prompts/`, `validators/`, `examples/` | Not present | Future distributable product surface. |
| Verification implementation | `validators/`, tests, CI | Not present | Must be added before claiming repeatable automation. |

## Target Architecture

```text
Human / Agent Runtime
        |
        v
Runtime Adapter Layer
  - CLAUDE.md, GEMINI.md
  - .claude/hooks/
  - .gemini/commands/
  - .agents/skills/
        |
        v
Protocol Core
  - docs/prd.md
  - .ai/constitution.md
  - .ai/pipeline.md
  - .ai/tool-routing.md
        |
        v
Artifact Contract
  - .ai/specs/current/
  - .ai/sessions/<session-id>/
  - .ai/memory/
  - .ai/reviews/
  - .ai/state/
        |
        v
Validation + Feedback Layer
  - validators/promptfoo/
  - validators/scripts/
  - generated validation reports
        |
        v
Execution + Ship Handoff
  - tasks executed by external coding agents/tools
  - QA and verification artifacts
  - memory promotion
  - release/PR handoff
```

The protocol core should remain Markdown/configuration-first. The future CLI should orchestrate files, validate invariants, and install templates; it should not become the source of truth for project state.

## Component Boundaries

| Component | Responsibility | Owns | Must Not Own |
|-----------|----------------|------|--------------|
| Product docs | Product intent, roadmap-level behavior, positioning | `docs/prd.md`, durable design docs under `docs/` | Live session state or generated execution logs |
| Planning docs | GSD roadmap, requirements, research, codebase maps | `.planning/` | Runtime workflow state consumed by agents during execution |
| Operating constitution | Non-negotiable rules, authority order, gate meanings, failure circuit breakers | `.ai/constitution.md` | Tool-specific command implementation details |
| Protocol core docs | Pipeline phases and routing rules | `.ai/pipeline.md`, future `.ai/tool-routing.md` | Vendored integration scripts |
| Artifact contract | Canonical names, required files, handoff formats | `.ai/specs/current/`, `.ai/sessions/<session-id>/`, `.ai/memory/`, `.ai/reviews/`, `.ai/state/` | Reusable templates or product source code |
| Spec adapter | Translate Spec-Kit/Gemini commands into artifact operations | `.gemini/commands/`, `.specify/` | Canonical policy decisions |
| Agent skills | Agent-local behavior instructions | `.agents/skills/<skill-name>/` | Global product roadmap or live project memory |
| Validators | Check stale specs, missing artifacts, failed gates, loop limits, broken paths | `validators/promptfoo/`, `validators/scripts/` | Manual planning decisions |
| CLI/runtime | Install scaffolds, run validators, create sessions, route commands, produce reports | Future `package.json`, `commands/`, `src/` or equivalent | Hidden live state except through documented artifact APIs |
| Examples/templates | Distributable starter content | Future `examples/`, `templates/`, `prompts/` | This repo's active `.ai/` state |

## Data Flow

### Current Flow

1. Agent enters through `CLAUDE.md`, `GEMINI.md`, or project-local skill instructions.
2. Agent reads `docs/prd.md`, `.ai/constitution.md`, `.ai/recon.md`, and `.ai/memory/*`.
3. Spec-Kit/Gemini commands create or update specification artifacts through `.gemini/commands/*.toml` and `.specify/scripts/bash/*`.
4. Planned gates write reports to `.ai/specs/` and `.ai/sessions/`.
5. Durable outcomes should be promoted to `.ai/memory/`, but current files are mostly placeholders.

### Target Flow

1. **Initialize session**
   - Create `.ai/state/current-session.json`.
   - Create `.ai/sessions/<session-id>/`.
   - Record agent/runtime/tool versions where available.

2. **Recon**
   - Inputs: `docs/prd.md`, `.ai/constitution.md`, `.ai/memory/*`, `.planning/codebase/*`, implementation files when present.
   - Output: `.ai/sessions/<session-id>/agent-recon.md`.
   - Durable updates are not written yet.

3. **Critique**
   - Inputs: recon, constitution, product docs.
   - Outputs: `.ai/sessions/<session-id>/gstack-plan-review.md` or equivalent review packet.
   - Gate: scope and architecture risks must be resolved or explicitly deferred.

4. **Spec generation**
   - Inputs: accepted scope, recon, critique.
   - Outputs: `.ai/specs/current/spec.md`, `.ai/specs/current/plan.md`, `.ai/specs/current/tasks.md`.
   - Future feature directories may exist, but `.ai/specs/current/` should be the active pointer for the current execution cycle.

5. **Spec validation**
   - Inputs: current spec/plan/tasks, constitution, validator rules.
   - Outputs: `.ai/specs/current/validation-report.md`, `.ai/state/spec-validation-state.json`.
   - Gate outcomes: `PASS`, `FAIL`, `NEEDS_HUMAN_REVIEW`.

6. **Execution**
   - Inputs: validated tasks.
   - Outputs: `.ai/sessions/<session-id>/agent-execution.md`, code/doc changes, command logs.
   - Local implementation failures can retry within a bounded loop.
   - Spec-level failures must return to the spec gate.

7. **QA and verification**
   - Inputs: changed files, task list, validation report.
   - Outputs: `.ai/sessions/<session-id>/agent-qa.md`, `.ai/sessions/<session-id>/verification.md`.
   - No ship handoff without explicit verification artifacts.

8. **Memory handoff**
   - Inputs: recon, execution, QA, final diff summary.
   - Outputs: `.ai/sessions/<session-id>/memory-handoff-report.md`.
   - Promotes only durable facts into `.ai/memory/project-summary.md`, `.ai/memory/current-architecture.md`, `.ai/memory/known-risks.md`, `.ai/memory/decisions.md`, and `.ai/memory/verification-history.md`.

9. **Ship**
   - Inputs: verification artifacts, memory handoff, final diff.
   - Output: `.ai/sessions/<session-id>/ship-report.md`.
   - Produces final PR/release handoff when applicable.

## Path Ownership

| Path | Owner | Role | Roadmap Rule |
|------|-------|------|--------------|
| `docs/prd.md` | Product architecture | Product source of truth | Edit when changing the product direction or pipeline definition. |
| `docs/superpowers/specs/` | Durable design specs | Design history | Use for substantial design decisions, not session scratch work. |
| `docs/superpowers/plans/` | Implementation planning | Durable plans | Keep aligned with roadmap phases. |
| `.planning/` | GSD planner | Requirements, roadmap, research, codebase map | Do not make agents depend on `.planning/` as runtime state. |
| `.ai/constitution.md` | Protocol governance | Operating authority | Treat as the highest-priority local policy after explicit user instructions. |
| `.ai/pipeline.md` | Protocol core | Pipeline description | Keep concise and operational. |
| `.ai/tool-routing.md` | Protocol core | Tool choice rules | Add before broad automation so agents route consistently. |
| `.ai/specs/current/` | Artifact contract | Active spec/plan/tasks/validation | Prefer this canonical active path over scattered root-level spec files. |
| `.ai/sessions/<session-id>/` | Artifact contract | Session logs and reports | Use for temporary and auditable per-run outputs. |
| `.ai/memory/` | Artifact contract | Durable facts | Update only after verification/memory handoff. |
| `.ai/reviews/` | Governance | Human review packets | Use for circuit breaker and unresolved risk cases. |
| `.ai/state/` | Artifact contract | Machine-readable gate/session state | Keep JSON small, explicit, and derivable from artifacts where possible. |
| `.gemini/commands/` | Gemini adapter | Slash-command prompt definitions | Adapter-specific; do not store canonical policy here. |
| `.specify/` | Spec-Kit adapter | Vendored workflows, templates, scripts, metadata | Keep in sync with path contract but do not make it the sole source of truth. |
| `.agents/skills/` | Agent adapter | Local reusable skills | Use for behavior instructions, not project state. |
| `.claude/` | Claude adapter | Claude settings and hooks | Keep runtime-specific. |
| `templates/` | Future product implementation | Distributable scaffolds | Add only when converting repo protocol into reusable package assets. |
| `prompts/` | Future product implementation | Reusable prompts | Separate product prompts from this repo's live `.ai/` artifacts. |
| `validators/` | Future product implementation | Promptfoo/custom validation | First automation target after path contract stabilization. |
| `commands/` | Future product implementation | CLI command handlers | Add after validators and templates have stable contracts. |
| `examples/` | Future product implementation | Demonstrations and fixtures | Use to prove install and workflow behavior without mutating active state. |

## Suggested Build Order

1. **Canonical artifact contract**
   - Normalize `.ai/specs/current/`, `.ai/sessions/<session-id>/`, `.ai/state/`, `.ai/memory/`, and `.ai/reviews/`.
   - Decide how `.ai/specs/`, `.specify/`, and future root `.specify/` paths relate.
   - This must precede automation because every validator and CLI command depends on stable paths.

2. **Tool routing and gate semantics**
   - Add or finalize `.ai/tool-routing.md`.
   - Define `PASS`, `FAIL`, and `NEEDS_HUMAN_REVIEW` outputs in one canonical place.
   - Define retry limits and spec-level failure routing.

3. **Manual templates**
   - Create reusable Markdown templates for recon, review, spec, plan, tasks, validation, execution, QA, memory handoff, and ship reports.
   - Keep these separate from active state; use `templates/` once product packaging begins.

4. **Validation scripts**
   - Add `validators/scripts/` checks for missing paths, stale artifact references, broken links, missing verification, and repeated repair loops.
   - Add Promptfoo/LLM-as-judge validation only after deterministic path checks exist.

5. **Adapter alignment**
   - Update `.gemini/commands/`, `.specify/`, `.agents/skills/`, and `.claude/hooks/` to consume the same artifact contract.
   - Avoid embedding divergent artifact paths in each adapter.

6. **CLI wrapper**
   - Add a root package/runtime only after the file contract and validators are stable.
   - CLI commands should create sessions, copy templates, run validators, and print next-step routing.
   - The CLI should not replace `.ai/` artifacts; it should manage them.

7. **Examples and regression fixtures**
   - Add `examples/` repositories or fixture projects that demonstrate greenfield and brownfield setup.
   - Use them to test install, validation, and spec-to-ship flows without relying on this repo's live state.

8. **CI and release packaging**
   - Add CI for validators, shell helpers, generated templates, docs links, and package build.
   - Release only once the example flows pass end-to-end.

## Architecture Patterns to Follow

### Artifact-First Orchestration

**What:** Each pipeline phase reads named artifacts and writes named artifacts.  
**Why:** AI work must be resumable across sessions and runtimes.  
**Rule:** If a phase cannot name its input and output paths, it is not ready for automation.

### Adapter-Core Separation

**What:** Claude, Gemini, Spec-Kit, GSD, and future tools are adapters around a shared `.ai/` contract.  
**Why:** The project goal is orchestration, not lock-in to one runtime.  
**Rule:** Tool-specific files may call the protocol, but they should not redefine the protocol.

### Session Versus Memory Split

**What:** `.ai/sessions/<session-id>/` stores run-local evidence; `.ai/memory/` stores durable facts.  
**Why:** Agents should not pollute long-term context with unverified session notes.  
**Rule:** Memory updates happen only during the memory handoff phase.

### Deterministic Before LLM-Judged Validation

**What:** Start with path, schema, link, and artifact completeness checks before subjective review.  
**Why:** Broken file contracts are cheaper and more reliable to detect than vague spec quality issues.  
**Rule:** Promptfoo/custom LLM validation should supplement deterministic validators, not replace them.

## Anti-Patterns to Avoid

### Competing Sources of Truth

**What goes wrong:** `.ai/specs/`, `.specify/`, root `.specify/`, and future CLI paths each become independently authoritative.  
**Consequence:** Agents execute stale plans or validate the wrong artifacts.  
**Prevention:** Pick one active execution pointer, preferably `.ai/specs/current/`, and make other feature directories feed into it.

### Runtime-Specific Architecture

**What goes wrong:** The workflow becomes a Claude workflow, a Gemini workflow, or a GSD workflow instead of a portable protocol.  
**Consequence:** The product cannot support multiple agent runtimes without duplication.  
**Prevention:** Keep `CLAUDE.md`, `GEMINI.md`, `.claude/`, `.gemini/`, and `.agents/` as adapters.

### CLI Before Contract

**What goes wrong:** A CLI hard-codes unstable paths and workflow rules.  
**Consequence:** Later path normalization becomes a breaking rewrite.  
**Prevention:** Stabilize artifact paths and validators before implementing root command handlers.

### Unbounded Self-Repair

**What goes wrong:** Agents repeatedly edit specs or code after failures without escalating.  
**Consequence:** Loss of trust, noisy diffs, and hidden product drift.  
**Prevention:** Store retry state in `.ai/state/spec-validation-state.json` and route repeated failure to `.ai/reviews/<session-id>-human-review.md`.

## Roadmap Implications

The first implementation milestone should be a protocol-foundation milestone, not a CLI milestone. It should deliver the canonical artifact contract, path ownership, routing rules, and deterministic validation. Only then should the roadmap add reusable templates, adapter alignment, CLI wrappers, examples, and packaging.

Recommended phase ordering:

1. **Artifact Contract Foundation** - normalize `.ai/` paths and current-vs-durable state.
2. **Gate and Routing Semantics** - define workflow transitions, failure classes, and human review routing.
3. **Templates and Validators** - make the protocol mechanically checkable.
4. **Adapter Alignment** - update Gemini, Claude, skills, and Spec-Kit scaffolds to use one contract.
5. **CLI/Product Packaging** - add installable commands and reusable templates.
6. **Examples and CI** - prove end-to-end behavior across fixture projects.

## Sources

- `.planning/PROJECT.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/INTEGRATIONS.md`
- `docs/prd.md`
