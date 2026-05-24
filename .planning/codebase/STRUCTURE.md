# Codebase Structure

**Analysis Date:** 2026-05-24

## Directory Layout

```text
snail-agent-flow/
├── CLAUDE.md                 # Claude-facing repository instruction and gstack guard
├── GEMINI.md                 # Gemini-facing Spec-Kit plan pointer
├── docs/                     # Product blueprint and Superpowers specs/plans
├── .ai/                      # AI delivery pipeline artifacts, memory, sessions, reviews, specs
├── .agents/skills/           # Local Superpowers-style agent skills
├── .gemini/                  # Gemini command definitions and Spec-Kit scaffolding
├── .claude/                  # Claude local settings and hooks
├── .serena/                  # Serena project metadata and cache config
├── .planning/codebase/       # Generated GSD codebase maps
└── .gitignore                # Ignore rules for OS files, IDEs, dependencies, secrets, cache
```

## Directory Purposes

**Root:**
- Purpose: Repository-level instructions and tool entry points.
- Contains: `CLAUDE.md`, `GEMINI.md`, `.gitignore`.
- Key files: `CLAUDE.md` enforces gstack availability; `GEMINI.md` contains a Spec-Kit context marker.

**`docs/`:**
- Purpose: Human-readable product and planning documentation.
- Contains: `docs/prd.md`, `docs/superpowers/specs/`, `docs/superpowers/plans/`.
- Key files: `docs/prd.md` is the main blueprint for the AI delivery pipeline; `docs/superpowers/specs/2026-05-23-operating-constitution-design.md` specifies the constitution rewrite; `docs/superpowers/plans/2026-05-24-operating-constitution-design.md` plans that rewrite.

**`.ai/`:**
- Purpose: File-based AI pipeline state, governance, specs, session artifacts, reviews, and memory.
- Contains: `.ai/constitution.md`, `.ai/recon.md`, `.ai/pipeline.md`, `.ai/specs/`, `.ai/sessions/`, `.ai/memory/`, `.ai/reviews/`.
- Key files: `.ai/constitution.md` is the current operating policy; `.ai/recon.md` contains current recon notes; `.ai/specs/plan.md`, `.ai/specs/spec.md`, and `.ai/specs/tasks.md` are placeholders; `.ai/memory/current-architecture.md` and `.ai/memory/project-summary.md` are placeholders.

**`.ai/memory/`:**
- Purpose: Durable project memory for future recon and planning.
- Contains: `.ai/memory/project-summary.md`, `.ai/memory/current-architecture.md`, `.ai/memory/known-risks.md`, `.ai/memory/decisions.md`, `.ai/memory/verification-history.md`.
- Key files: current files exist but are blank placeholders or near-empty.

**`.ai/specs/`:**
- Purpose: Current or future spec artifacts for accepted work.
- Contains: `.ai/specs/spec.md`, `.ai/specs/plan.md`, `.ai/specs/tasks.md`, `.ai/specs/validation-report.md`.
- Key files: current files are placeholders; future work should use feature-specific or `current/` structure consistently before execution.

**`.ai/sessions/`:**
- Purpose: Session-local logs and reports.
- Contains: `.ai/sessions/session-notes.md`, `.ai/sessions/execution-log.md`, `.ai/sessions/qa-log.md`.
- Key files: current files are placeholders; `docs/prd.md` recommends future `.ai/sessions/<session-id>/agent-recon.md`, `gstack-plan-review.md`, `agent-execution.md`, `agent-qa.md`, `verification.md`, `memory-handoff-report.md`, and `ship-report.md`.

**`.ai/reviews/`:**
- Purpose: Human review packets for circuit-breaker cases.
- Contains: `.ai/reviews/human-review.md`.
- Key files: current file is a placeholder; `docs/prd.md` recommends `.ai/reviews/<session-id>-human-review.md`.

**`.agents/skills/`:**
- Purpose: Local project skills for agents.
- Contains: skill directories such as `.agents/skills/using-superpowers/`, `.agents/skills/brainstorming/`, `.agents/skills/test-driven-development/`, `.agents/skills/systematic-debugging/`, `.agents/skills/subagent-driven-development/`, `.agents/skills/verification-before-completion/`, `.agents/skills/writing-plans/`.
- Key files: each skill has `SKILL.md`; some include prompts or scripts such as `.agents/skills/subagent-driven-development/implementer-prompt.md` and `.agents/skills/brainstorming/scripts/server.cjs`.

**`.gemini/commands/`:**
- Purpose: Gemini slash-command definitions for Spec-Kit operations.
- Contains: `.gemini/commands/speckit.specify.toml`, `.gemini/commands/speckit.plan.toml`, `.gemini/commands/speckit.tasks.toml`, `.gemini/commands/speckit.implement.toml`, plus Git helper command definitions.
- Key files: use these as the source of command behavior when maintaining Gemini integration prompts.

**`.gemini/.specify/`:**
- Purpose: Vendored Spec-Kit scaffolding and templates.
- Contains: `.gemini/.specify/scripts/bash/`, `.gemini/.specify/templates/`, `.gemini/.specify/workflows/`, `.gemini/.specify/integrations/`, `.gemini/.specify/extensions/`.
- Key files: `.gemini/.specify/workflows/speckit/workflow.yml` defines the full SDD cycle; `.gemini/.specify/integrations/speckit.manifest.json` records installed files and Spec-Kit version; `.gemini/.specify/scripts/bash/create-new-feature.sh` and `.gemini/.specify/scripts/bash/check-prerequisites.sh` support feature setup and prerequisites.

**`.planning/codebase/`:**
- Purpose: Generated codebase maps for GSD planning and execution.
- Contains: `.planning/codebase/ARCHITECTURE.md` and `.planning/codebase/STRUCTURE.md` after this mapper run.
- Key files: keep maps current when implementation files or architecture materially change.

## Key File Locations

**Entry Points:**
- `CLAUDE.md`: Claude-facing repository entry; verifies gstack before work.
- `GEMINI.md`: Gemini-facing entry; points to current Spec-Kit plan context.
- `.ai/constitution.md`: policy entry for all agent work.
- `docs/prd.md`: product/architecture blueprint entry.
- `.gemini/commands/speckit.specify.toml`: Spec-Kit specify command.
- `.gemini/commands/speckit.plan.toml`: Spec-Kit planning command.
- `.gemini/commands/speckit.tasks.toml`: Spec-Kit task generation command.
- `.gemini/commands/speckit.implement.toml`: Spec-Kit implementation command.
- `.gemini/.specify/workflows/speckit/workflow.yml`: end-to-end specify -> plan -> tasks -> implement workflow.

**Configuration:**
- `.gitignore`: repository ignore rules, including secrets and local cache.
- `.claude/settings.json`: Claude local settings.
- `.claude/hooks/check-gstack.sh`: Claude hook for gstack checking.
- `.gemini/.specify/init-options.json`: Spec-Kit initialization options.
- `.gemini/.specify/integration.json`: Spec-Kit integration metadata.
- `.gemini/.specify/integrations/speckit.manifest.json`: installed Spec-Kit integration manifest.
- `.serena/project.yml`: Serena project metadata.

**Core Logic:**
- `docs/prd.md`: current main blueprint and source for future implementation shape.
- `.ai/constitution.md`: current operating rules and artifact contract.
- `.ai/recon.md`: current recon notes and MVP boundary.
- `.gemini/.specify/scripts/bash/create-new-feature.sh`: feature setup script.
- `.gemini/.specify/scripts/bash/check-prerequisites.sh`: prerequisite resolution script.
- `.gemini/.specify/scripts/bash/setup-plan.sh`: plan setup script.
- `.gemini/.specify/scripts/bash/setup-tasks.sh`: task setup script.

**Testing:**
- Not detected as application test code.
- Current validation is documentation review and command-script behavior described in `docs/prd.md`, `.ai/constitution.md`, and `.gemini/commands/*.toml`.
- Future validation locations proposed by `docs/prd.md`: `validators/promptfoo/`, `validators/scripts/`, and feature checklist files.

## Naming Conventions

**Files:**
- Repository instruction files use uppercase names: `CLAUDE.md`, `GEMINI.md`.
- Durable AI artifacts use lowercase kebab-case Markdown: `.ai/current-task.md`, `.ai/recon.md`, `.ai/memory/current-architecture.md`, `.ai/memory/known-risks.md`.
- Superpowers docs use dated kebab-case names: `docs/superpowers/specs/2026-05-23-operating-constitution-design.md`, `docs/superpowers/plans/2026-05-24-operating-constitution-design.md`.
- Gemini commands use dotted command names: `.gemini/commands/speckit.specify.toml`, `.gemini/commands/speckit.git.commit.toml`.
- Spec-Kit shell scripts use kebab-case: `.gemini/.specify/scripts/bash/create-new-feature.sh`, `.gemini/.specify/scripts/bash/check-prerequisites.sh`.
- GSD map documents use uppercase names: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`.

**Directories:**
- Hidden tool/runtime directories begin with a dot: `.ai/`, `.agents/`, `.gemini/`, `.claude/`, `.serena/`, `.planning/`.
- Skill directories use kebab-case: `.agents/skills/test-driven-development/`, `.agents/skills/systematic-debugging/`.
- Planned future feature directories in Spec-Kit use numbered or timestamped kebab-case names under `specs/`, as described in `.gemini/commands/speckit.specify.toml`.

## Where to Add New Code

**New Product Documentation:**
- Primary docs: `docs/`
- Product blueprint changes: `docs/prd.md`
- Durable design specs: `docs/superpowers/specs/`
- Implementation plans: `docs/superpowers/plans/`

**New AI Pipeline Artifact:**
- Operating rules: `.ai/constitution.md`
- Current recon: `.ai/recon.md`
- Current pipeline notes: `.ai/pipeline.md`
- Session-specific notes: `.ai/sessions/<session-id>/`
- Durable project memory: `.ai/memory/`
- Human review packets: `.ai/reviews/`

**New Spec-Kit/Gemini Command:**
- Command definition: `.gemini/commands/`
- Workflow definition: `.gemini/.specify/workflows/`
- Template: `.gemini/.specify/templates/`
- Shell helper: `.gemini/.specify/scripts/bash/`
- Integration metadata: `.gemini/.specify/integrations/`

**New Agent Skill:**
- Implementation: `.agents/skills/<skill-name>/SKILL.md`
- Supporting prompts/scripts: `.agents/skills/<skill-name>/`
- Follow existing lowercase kebab-case naming from `.agents/skills/test-driven-development/`.

**New CLI or Runtime Implementation:**
- Not currently present.
- Use the planned structure in `docs/prd.md` if implementing the product: root `package.json`, `templates/`, `prompts/`, `validators/`, `commands/`, `examples/`, and `docs/`.
- Keep generated templates separate from repository operating state: future distributable templates should live under `templates/`, while this repo's active state remains under `.ai/`.

**New Validators:**
- Planned Promptfoo validation: `validators/promptfoo/`
- Planned custom scripts: `validators/scripts/`
- Do not place validators under `.ai/`; `.ai/` should store state and artifacts, not reusable implementation.

**New Tests:**
- Not detected yet.
- When runtime code is added, place tests according to the chosen stack and document the convention in `.planning/codebase/TESTING.md`.
- For shell helpers under `.gemini/.specify/scripts/bash/`, prefer script-level fixtures or integration checks near the future validator/test structure rather than inside `.ai/`.

## Special Directories

**`.ai/`:**
- Purpose: active project state and memory.
- Generated: Partly; many files are template/placeholders.
- Committed: Yes, current files are in the worktree.

**`.agents/skills/`:**
- Purpose: local agent instruction packs.
- Generated: Likely copied/generated from Superpowers-style skills.
- Committed: Currently untracked according to `git status --short`.

**`.gemini/`:**
- Purpose: Gemini command and Spec-Kit scaffolding.
- Generated: Yes, contains generated/vendor scaffolding and manifests.
- Committed: Currently untracked according to `git status --short`.

**`.planning/codebase/`:**
- Purpose: GSD-generated codebase reference docs.
- Generated: Yes.
- Committed: Not committed by this mapper; orchestrator handles commits.

**`.serena/`:**
- Purpose: Serena project metadata and local cache configuration.
- Generated: Yes.
- Committed: `.serena/` is currently untracked; `.serena/cache/` and `.serena/project.local.yml` are ignored by `.gitignore`.

**`.claude/`:**
- Purpose: Claude settings and hooks.
- Generated: Tool-specific.
- Committed: Present in worktree; `CLAUDE.md` references global gstack install under `~/.claude/skills/gstack/`.

---

*Structure analysis: 2026-05-24*
