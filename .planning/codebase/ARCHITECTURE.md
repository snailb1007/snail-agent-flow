# Architecture

**Analysis Date:** 2026-05-24

## Pattern Overview

**Overall:** Documentation-first AI delivery protocol repository.

**Current implementation status:**
- Implemented: repository instructions, AI operating constitution, PRD/blueprint, Spec-Kit/Gemini command scaffolding, local agent skills, session/memory placeholder files.
- Planned: reusable template distribution, CLI commands, validators, prompts, examples, and agent presets described in `docs/prd.md`.
- Not implemented: no application source tree, no package manifest, no runtime service, no public API, no product UI, and no executable CLI entry point at the repository root.

**Key Characteristics:**
- The repo defines a thin orchestration protocol for AI coding workflows rather than an application runtime.
- Source of truth is stored in Markdown and configuration under `.ai/`, `docs/`, `.gemini/`, `.agents/`, `CLAUDE.md`, and `GEMINI.md`.
- The intended flow is gate-based: constitution -> recon -> critique -> spec -> validation -> execution -> QA -> memory handoff -> ship.
- Spec-Kit/Gemini scaffolding is vendored under `.gemini/.specify/` and `.gemini/commands/`; it is operational scaffolding, not the product architecture itself.

## Layers

**Repository Instruction Layer:**
- Purpose: Establish mandatory behavior for agents before any project work.
- Location: `CLAUDE.md`, `GEMINI.md`, `.ai/constitution.md`
- Contains: gstack installation guard, Spec-Kit plan pointer, authority order, non-negotiables, pipeline gates, failure rules, artifact contracts.
- Depends on: user instructions, repository files, gstack availability.
- Used by: any agent executing work in this repository.

**Pipeline Blueprint Layer:**
- Purpose: Define the canonical AI delivery workflow and long-term product direction.
- Location: `docs/prd.md`
- Contains: recommended pipeline, phase definitions, `.ai` folder contract, tool routing rules, human review circuit breaker, memory handoff examples, CLI MVP proposal, suggested future repo structure.
- Depends on: tool ecosystem assumptions for Superpowers, GStack, GSD, Spec-Kit/OpenSpec, Serena, Semble, GitNexus, Context7, Promptfoo, and Playwright.
- Used by: planning, architecture mapping, future CLI/template implementation.

**Durable AI State Layer:**
- Purpose: Store resumable project memory and session artifacts.
- Location: `.ai/`
- Contains: `.ai/constitution.md`, `.ai/recon.md`, `.ai/pipeline.md`, `.ai/specs/`, `.ai/sessions/`, `.ai/memory/`, `.ai/reviews/`.
- Depends on: pipeline rules in `.ai/constitution.md` and `docs/prd.md`.
- Used by: recon, planning, validation, execution, QA, handoff, and future agent sessions.
- Implementation note: many files are placeholders containing only blank lines, including `.ai/specs/plan.md`, `.ai/specs/spec.md`, `.ai/specs/tasks.md`, `.ai/pipeline.md`, `.ai/memory/current-architecture.md`, and `.ai/memory/project-summary.md`.

**Spec-Kit/Gemini Integration Layer:**
- Purpose: Provide command prompts, templates, and scripts for specify -> plan -> tasks -> implement.
- Location: `.gemini/commands/`, `.gemini/.specify/`
- Contains: command TOML files such as `.gemini/commands/speckit.specify.toml`, `.gemini/commands/speckit.plan.toml`, `.gemini/commands/speckit.implement.toml`; workflow metadata in `.gemini/.specify/workflows/speckit/workflow.yml`; shell scripts in `.gemini/.specify/scripts/bash/`; templates in `.gemini/.specify/templates/`; integration manifest in `.gemini/.specify/integrations/speckit.manifest.json`.
- Depends on: Spec-Kit conventions, shell scripts, generated feature directories, `.specify/feature.json`, `.specify/memory/constitution.md`.
- Used by: Gemini slash commands and future spec-driven development cycles.
- Implementation note: these files reference `.specify/...` paths in command text, while the checked-in files are under `.gemini/.specify/...`; future work should verify runtime path resolution before depending on those commands.

**Project Skill Layer:**
- Purpose: Provide local agent operating skills copied into the repo.
- Location: `.agents/skills/`
- Contains: Superpowers-style skills such as `.agents/skills/using-superpowers/SKILL.md`, `.agents/skills/brainstorming/SKILL.md`, `.agents/skills/test-driven-development/SKILL.md`, `.agents/skills/systematic-debugging/SKILL.md`, `.agents/skills/subagent-driven-development/SKILL.md`, `.agents/skills/verification-before-completion/SKILL.md`.
- Depends on: agent runtime support for reading skill instructions.
- Used by: agents performing implementation, review, debugging, planning, TDD, and verification.

**Planning Map Layer:**
- Purpose: Store GSD codebase maps for future planning and execution.
- Location: `.planning/codebase/`
- Contains: generated codebase reference docs.
- Depends on: mapper exploration.
- Used by: `$gsd-plan-phase`, `$gsd-execute-phase`, and future orchestration commands.

## Data Flow

**Current Spec-To-Ship Flow:**

1. Agent starts with repository instructions in `CLAUDE.md`, `GEMINI.md`, and `.ai/constitution.md`.
2. Recon reads source-of-truth artifacts such as `docs/prd.md`, `.ai/recon.md`, `.ai/memory/*`, and relevant implementation files when they exist.
3. Planning critique uses the recon output plus the constitution to challenge scope and architecture risk.
4. Spec generation uses Spec-Kit/OpenSpec-style artifacts under `.ai/specs/` or future feature-specific spec directories.
5. Spec validation writes outcomes to `.ai/specs/current/validation-report.md` and `.ai/state/spec-validation-state.json` as described in `.ai/constitution.md` and `docs/prd.md`.
6. Execution follows task artifacts, keeps diffs narrow, records execution notes under `.ai/sessions/`.
7. Failures are classified as local implementation failures or spec-level failures; spec-level failures return to the spec gate.
8. QA records verification under `.ai/sessions/`.
9. Memory handoff promotes durable facts into `.ai/memory/project-summary.md`, `.ai/memory/current-architecture.md`, `.ai/memory/known-risks.md`, `.ai/memory/decisions.md`, and `.ai/memory/verification-history.md`.
10. Ship creates final release/PR handoff after QA and memory handoff.

**Spec-Kit/Gemini Command Flow:**

1. `.gemini/commands/speckit.specify.toml` turns natural language into a feature directory and `spec.md`.
2. `.gemini/commands/speckit.plan.toml` runs setup, reads the feature spec plus constitution memory, then produces plan/design artifacts.
3. `.gemini/commands/speckit.tasks.toml` is expected to turn plan artifacts into executable tasks.
4. `.gemini/commands/speckit.implement.toml` loads prerequisites and executes tasks phase by phase.
5. `.gemini/.specify/workflows/speckit/workflow.yml` sequences `speckit.specify`, review gate, `speckit.plan`, review gate, `speckit.tasks`, and `speckit.implement`.

**State Management:**
- Durable state is Markdown-first and file-based under `.ai/`.
- Command state for Spec-Kit is described through `.specify/feature.json` and feature directories in command prompts; no root `.specify/` directory is currently present.
- Git state is active and currently contains untracked scaffold files plus a deleted `ai-delivery-pipeline-blueprint.md` entry according to `git status --short`.

## Key Abstractions

**Operating Constitution:**
- Purpose: Repository-level policy source for agents.
- Examples: `.ai/constitution.md`
- Pattern: Authority order, hard rules, engineering principles, gate outcomes, failure circuit breakers, artifact contract.

**Pipeline Gate:**
- Purpose: Control movement between major workflow phases.
- Examples: `docs/prd.md`, `.ai/constitution.md`
- Pattern: gates produce `PASS`, `FAIL`, or `NEEDS_HUMAN_REVIEW`.

**Artifact Contract:**
- Purpose: Make handoffs resumable across agent sessions.
- Examples: `.ai/constitution.md`, `docs/prd.md`
- Pattern: named Markdown/state files with specific responsibilities under `.ai/`.

**Session Artifact:**
- Purpose: Store temporary, session-specific recon, execution, QA, failure, and ship reports.
- Examples: `.ai/sessions/session-notes.md`, `.ai/sessions/execution-log.md`, `.ai/sessions/qa-log.md`
- Pattern: current files are placeholders; planned shape in `docs/prd.md` uses `.ai/sessions/<session-id>/...`.

**Durable Memory Artifact:**
- Purpose: Store promoted facts that future agents should trust.
- Examples: `.ai/memory/project-summary.md`, `.ai/memory/current-architecture.md`, `.ai/memory/known-risks.md`, `.ai/memory/decisions.md`, `.ai/memory/verification-history.md`
- Pattern: concise Markdown files updated only with durable, verified facts.

**Spec-Kit Command Prompt:**
- Purpose: Encode slash-command workflows as declarative TOML prompts.
- Examples: `.gemini/commands/speckit.specify.toml`, `.gemini/commands/speckit.plan.toml`, `.gemini/commands/speckit.implement.toml`
- Pattern: command text describes pre-hooks, setup scripts, generated artifacts, gates, and execution rules.

**Spec-Kit Script:**
- Purpose: Resolve feature paths and prerequisites for generated specs/plans/tasks.
- Examples: `.gemini/.specify/scripts/bash/create-new-feature.sh`, `.gemini/.specify/scripts/bash/check-prerequisites.sh`, `.gemini/.specify/scripts/bash/setup-plan.sh`, `.gemini/.specify/scripts/bash/setup-tasks.sh`
- Pattern: Bash scripts emit paths or JSON for command prompts to consume.

## Entry Points

**Human/Agent Repository Entry:**
- Location: `CLAUDE.md`
- Triggers: Claude-style agents opening the repository.
- Responsibilities: verify gstack global install before work and route browsing to gstack browse.

**Gemini Agent Entry:**
- Location: `GEMINI.md`
- Triggers: Gemini-style agent opening the repository.
- Responsibilities: point to the current Spec-Kit plan between `<!-- SPECKIT START -->` and `<!-- SPECKIT END -->`.

**Operating Policy Entry:**
- Location: `.ai/constitution.md`
- Triggers: any planning, execution, review, validation, or shipping work.
- Responsibilities: define authority order, non-negotiables, pipeline gates, failure rules, and artifact contract.

**Product Blueprint Entry:**
- Location: `docs/prd.md`
- Triggers: architecture planning, product scoping, future implementation planning.
- Responsibilities: define purpose, pipeline phases, routing rules, CLI MVP, suggested future structure, roadmap, and positioning.

**Spec-Kit Slash Commands:**
- Location: `.gemini/commands/*.toml`
- Triggers: `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`, and related Gemini commands.
- Responsibilities: create specs, plans, tasks, validations, and feature implementation workflows.

**Spec-Kit Shell Scripts:**
- Location: `.gemini/.specify/scripts/bash/*.sh`
- Triggers: command prompts and workflows.
- Responsibilities: create feature branches/directories, resolve paths, validate prerequisites, and prepare task/plan artifacts.

## Error Handling

**Strategy:** Documentation-defined circuit breakers and gate outcomes.

**Patterns:**
- Use `PASS`, `FAIL`, and `NEEDS_HUMAN_REVIEW` as gate outcomes in `.ai/constitution.md` and `docs/prd.md`.
- Stop autonomous work after more than three failures in the same validation category.
- Classify execution failures before fixing: local implementation failures stay in execution; spec-level failures return to spec generation.
- Stop and request human review for safety, scope, data loss, security, public behavior, API compatibility, or ambiguous requirements.
- Avoid destructive operations unless explicitly approved.

## Cross-Cutting Concerns

**Logging:** No application logging exists. Workflow evidence is planned as Markdown logs in `.ai/sessions/`, including `.ai/sessions/execution-log.md`, `.ai/sessions/qa-log.md`, and future `.ai/sessions/<session-id>/verification.md`.

**Validation:** Validation is policy-driven, not implemented as a root CLI yet. `docs/prd.md` proposes Promptfoo, custom scripts, LLM-as-judge rubrics, Markdown policy checks, and CI preflight. `.gemini/commands/speckit.specify.toml` includes a specification quality checklist flow.

**Authentication:** Not applicable. There is no app runtime or user identity layer.

**Security:** Security baseline is defined in `.ai/constitution.md`: protect secrets, user data, auth boundaries, permissions, destructive operations, and public behavior. `.gitignore` excludes `.env`, `*.env`, `*.pem`, and `*.key`.

**Documentation Drift:** The repository is currently mostly planned artifacts. Future implementation must keep `docs/prd.md`, `.ai/constitution.md`, `.ai/memory/current-architecture.md`, and `.planning/codebase/` aligned with actual code as it appears.

---

*Architecture analysis: 2026-05-24*
