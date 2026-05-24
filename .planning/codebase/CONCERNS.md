# Codebase Concerns

**Analysis Date:** 2026-05-24

## Current State

This repository currently contains mostly planning, policy, and agent workflow documents. No application source tree, package manifest, runtime project file, or test suite was detected under paths such as `src/`, `app/`, `tests/`, `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, or `*.csproj`.

Primary source material lives in `docs/prd.md`, `.ai/constitution.md`, `.ai/recon.md`, `docs/superpowers/specs/2026-05-23-operating-constitution-design.md`, `docs/superpowers/plans/2026-05-24-operating-constitution-design.md`, `.specify/`, `.gemini/commands/`, `.agents/skills/`, `CLAUDE.md`, and `GEMINI.md`.

## Tech Debt

**Blueprint source-of-truth drift:**
- Issue: `docs/superpowers/plans/2026-05-24-operating-constitution-design.md` names `ai-delivery-pipeline-blueprint.md` as an inspect-only source, but the working tree shows `ai-delivery-pipeline-blueprint.md` deleted and `docs/prd.md` present as the apparent blueprint content.
- Files: `docs/superpowers/plans/2026-05-24-operating-constitution-design.md`, `docs/prd.md`, `ai-delivery-pipeline-blueprint.md`
- Impact: Future agents may follow stale plan instructions and fail verification commands that read `ai-delivery-pipeline-blueprint.md`.
- Fix approach: Pick one canonical blueprint path, update references in `.ai/constitution.md`, `docs/superpowers/plans/2026-05-24-operating-constitution-design.md`, and future planning docs, then remove or restore the obsolete path intentionally.

**Artifact layout mismatch:**
- Issue: The PRD and constitution describe current spec artifacts under `.ai/specs/current/`, but the repository currently has flat empty files under `.ai/specs/`.
- Files: `docs/prd.md`, `.ai/constitution.md`, `.ai/specs/spec.md`, `.ai/specs/plan.md`, `.ai/specs/tasks.md`, `.ai/specs/validation-report.md`
- Impact: Commands or agents expecting `.ai/specs/current/spec.md`, `.ai/specs/current/plan.md`, `.ai/specs/current/tasks.md`, and `.ai/specs/current/validation-report.md` will not find the documented paths.
- Fix approach: Create the documented `.ai/specs/current/` layout or revise the artifact contract to use the existing flat layout. Keep exactly one current-spec convention.

**Durable memory files are placeholders:**
- Issue: Durable memory files exist but contain no usable project state.
- Files: `.ai/memory/project-summary.md`, `.ai/memory/current-architecture.md`, `.ai/memory/known-risks.md`, `.ai/memory/decisions.md`, `.ai/memory/verification-history.md`
- Impact: The memory handoff gate described in `docs/prd.md` and `.ai/constitution.md` cannot actually preserve context yet.
- Fix approach: Seed each memory file with concise current facts after `$gsd-new-project`, including canonical artifact paths, known risks, and verification status.

**Pipeline implementation is mostly aspirational:**
- Issue: `docs/prd.md` describes validation gates, QA reports, state files, CLI commands, and memory handoff, but the repository has no implementation for validators or pipeline CLI behavior.
- Files: `docs/prd.md`, `.ai/pipeline.md`, `.ai/specs/validation-report.md`, `.ai/memory/verification-history.md`
- Impact: Agents can mistake documented target behavior for implemented behavior and claim validation that has not run.
- Fix approach: Mark current implementation status clearly in `.planning/PROJECT.md` or `.ai/pipeline.md`, then plan separate phases for template-only artifacts, validators, and CLI automation.

**Generated integration files are committed as project logic:**
- Issue: `.specify/` contains a full Spec Kit integration scaffold alongside project-specific docs.
- Files: `.specify/scripts/bash/common.sh`, `.specify/extensions/git/scripts/bash/auto-commit.sh`, `.gemini/commands/speckit.implement.toml`
- Impact: It is easy to confuse vendored/generated Spec Kit behavior with project-specific pipeline design. Updates may create noisy diffs or local drift.
- Fix approach: Document whether `.specify/` is vendored, generated, or project-owned. If generated, avoid hand edits and record the regeneration command.

## Known Bugs

**Spec Kit Git extension config path mismatch:**
- Status: Resolved. Spec-Kit has been relocated to the unified root `.specify/`, aligning the script lookup path with the checked-in config location.
- Files: `.specify/extensions/git/scripts/bash/auto-commit.sh`, `.specify/extensions/git/git-config.yml`

**Plan verification references a deleted file:**
- Symptoms: Verification commands in the operating constitution plan read `ai-delivery-pipeline-blueprint.md`; that file is currently deleted in the working tree.
- Files: `docs/superpowers/plans/2026-05-24-operating-constitution-design.md`, `ai-delivery-pipeline-blueprint.md`, `docs/prd.md`
- Trigger: Executing Task 1 or Task 3 verification commands from `docs/superpowers/plans/2026-05-24-operating-constitution-design.md`.
- Workaround: Use `docs/prd.md` as the blueprint source only if the orchestrator confirms the rename.

## Security Considerations

**Git automation stages all changes:**
- Risk: The Spec Kit auto-commit script uses `git add .` when enabled, which can stage unrelated edits or accidentally include newly created sensitive files if ignore rules are incomplete.
- Files: `.specify/extensions/git/scripts/bash/auto-commit.sh`, `.specify/extensions/git/git-config.yml`, `.gitignore`
- Current mitigation: `.gitignore` excludes `.env`, `*.env`, `*.pem`, `*.key`, common dependency folders, logs, and Serena cache. Auto-commit is disabled by default in `.specify/extensions/git/git-config.yml`.
- Recommendations: Keep auto-commit disabled unless a phase explicitly opts in. Prefer explicit `git add <paths>` in GSD workflows and expand `.gitignore` before adding tools that generate credentials.

**Security baseline is policy-only:**
- Risk: `docs/prd.md` and `.ai/constitution.md` require security baseline checks, but no automated scanner, checklist runner, or validation script is present.
- Files: `docs/prd.md`, `.ai/constitution.md`, `.ai/specs/validation-report.md`
- Current mitigation: The constitution requires stopping for security, data loss, API, and irreversible-operation risks.
- Recommendations: Add a concrete security checklist or validator phase before claiming the pipeline enforces security.

**Claude-only gstack guard does not cover all runtimes:**
- Risk: `CLAUDE.md` requires global gstack, and `.claude/hooks/check-gstack.sh` enforces that only for Claude Skill tool usage. Codex/Gemini workflows can still operate without the same hook.
- Files: `CLAUDE.md`, `.claude/settings.json`, `.claude/hooks/check-gstack.sh`, `GEMINI.md`
- Current mitigation: Repository instructions state the requirement plainly.
- Recommendations: Mirror the requirement in runtime-neutral documentation or add equivalent checks for non-Claude workflows.

## Performance Bottlenecks

**Remote branch discovery can be slow:**
- Problem: Feature branch creation may query all remotes with `git ls-remote --heads` when not using the fetch path.
- Files: `.specify/extensions/git/scripts/bash/create-new-feature.sh`
- Cause: Sequential branch numbering inspects existing branches and remote refs to compute the next prefix.
- Improvement path: Prefer timestamp branch numbering for large repos or make remote inspection opt-in when creating new features.

**Workflow ceremony can dominate small changes:**
- Problem: The documented pipeline has many gates for recon, critique, spec, validation, execution, QA, memory, and ship.
- Files: `docs/prd.md`, `.ai/constitution.md`
- Cause: The project intentionally coordinates many tools, but the current repo has no automation to make the gates cheap.
- Improvement path: Keep Phase 1 template-only scope small, then automate the highest-friction gates first: spec validation, memory handoff checks, and health checks.

## Fragile Areas

**Authority and instruction layering:**
- Files: `CLAUDE.md`, `GEMINI.md`, `.ai/constitution.md`, `.agents/skills/using-superpowers/SKILL.md`
- Why fragile: Multiple instruction systems define stop rules, skill usage, gstack requirements, and artifact authority. Conflicts can change agent behavior before project code exists.
- Safe modification: Update the highest-authority artifact first, then propagate the decision to runtime-specific files. Do not silently diverge `CLAUDE.md`, `GEMINI.md`, and `.ai/constitution.md`.
- Test coverage: No automated instruction consistency checks detected.

**Memory handoff path:**
- Files: `docs/prd.md`, `.ai/memory/project-summary.md`, `.ai/memory/current-architecture.md`, `.ai/memory/known-risks.md`, `.ai/memory/decisions.md`, `.ai/memory/verification-history.md`
- Why fragile: The pipeline depends on durable memory, but the memory files are empty placeholders.
- Safe modification: Treat memory writes as append/update of verified facts only. Keep speculative planning in specs or review packets, not memory.
- Test coverage: No memory handoff checker detected in the repository.

**Spec validation state:**
- Files: `docs/prd.md`, `.ai/specs/validation-report.md`
- Why fragile: The PRD requires `.ai/state/spec-validation-state.json`, but `.ai/state/` is not present.
- Safe modification: Add state files through a planned phase with explicit schema and retry-count semantics.
- Test coverage: No validator or state schema tests detected.

**Git working tree already contains unrelated changes:**
- Files: `ai-delivery-pipeline-blueprint.md`, `.agents/`, `.gemini/`, `.gitignore`, `.serena/`, `GEMINI.md`, `docs/prd.md`
- Why fragile: Mapping is running in a dirty working tree with a deleted blueprint and multiple untracked directories. Broad staging or cleanup can accidentally alter user work.
- Safe modification: Only touch explicitly scoped files. Avoid `git add .`, restore, clean, or reset commands unless the orchestrator explicitly requests them.
- Test coverage: Not applicable.

## Scaling Limits

**Documentation-only MVP capacity:**
- Current capacity: The repo can guide humans and agents through a manual AI delivery process using `docs/prd.md`, `.ai/constitution.md`, and Superpowers/GSD docs.
- Limit: It cannot enforce the described gates without scripts or validators.
- Scaling path: Build phases in this order: canonical artifact layout, validation checklist, validation runner, memory handoff checker, CLI wrappers.

**Tool dependency breadth:**
- Current capacity: The PRD coordinates Superpowers, GStack, GSD, Spec-Kit/OpenSpec, Serena, Semble, GitNexus, Context7, Promptfoo, and Playwright conceptually.
- Limit: Without a minimal decision matrix, agents may overuse tools or stack overlapping workflows.
- Scaling path: Add a small tool-routing reference to `.ai/pipeline.md` or `.planning/PROJECT.md` after initialization.

## Dependencies at Risk

**Global gstack install:**
- Risk: `CLAUDE.md` blocks AI-assisted work if `~/.claude/skills/gstack/bin` is missing.
- Impact: Onboarding fails for contributors who use Codex, Gemini, or a different gstack install path.
- Migration plan: Keep the Claude hook, but document runtime-neutral prerequisites and alternatives in `.planning/PROJECT.md`.

**Spec Kit / Gemini scaffold:**
- Risk: `.specify/` scripts and `.gemini/commands/` are tightly coupled to a generated layout and may not match the repo's chosen `.ai/` artifact structure.
- Impact: Spec Kit commands can write to paths different from the PRD's `.ai/specs/current/` contract.
- Migration plan: Decide whether Spec Kit owns `specs/`, `.specify/`, or `.ai/specs/current/`, then adapt templates and commands consistently.

## Missing Critical Features

**No executable validator:**
- Problem: The spec validation gate is described but not implemented.
- Blocks: Reliable transition from spec to execution, retry counting, and `NEEDS_HUMAN_REVIEW` enforcement.
- Files: `docs/prd.md`, `.ai/specs/validation-report.md`, `.ai/constitution.md`

**No health check command:**
- Problem: `docs/prd.md` proposes health checks for missing files, broken state, missing memory, and missing validation reports, but no script is present.
- Blocks: Fast diagnosis before planning and shipping.
- Files: `docs/prd.md`, `.ai/memory/verification-history.md`

**No initialized GSD project state:**
- Problem: `.planning/codebase/CONCERNS.md` is being created before `$gsd-new-project`, and `.planning/STATE.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, and `.planning/ROADMAP.md` are not present.
- Blocks: GSD planning commands do not yet have durable project context.
- Files: `.planning/codebase/CONCERNS.md`

## Test Coverage Gaps

**No automated tests detected:**
- What's not tested: Script behavior, artifact layout checks, validation-gate logic, memory handoff logic, and instruction consistency.
- Files: `.specify/extensions/git/scripts/bash/auto-commit.sh`, `.specify/extensions/git/scripts/bash/create-new-feature.sh`, `.ai/constitution.md`, `docs/prd.md`
- Risk: The documented workflow can drift from generated scripts and local artifact paths without failing a check.
- Priority: High

**No documentation consistency checks:**
- What's not tested: References between `docs/prd.md`, `.ai/constitution.md`, `docs/superpowers/specs/2026-05-23-operating-constitution-design.md`, and `docs/superpowers/plans/2026-05-24-operating-constitution-design.md`.
- Files: `docs/prd.md`, `.ai/constitution.md`, `docs/superpowers/specs/2026-05-23-operating-constitution-design.md`, `docs/superpowers/plans/2026-05-24-operating-constitution-design.md`
- Risk: Agents may follow stale artifact paths or outdated phase names.
- Priority: High

---

*Concerns audit: 2026-05-24*
