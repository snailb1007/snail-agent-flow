# Technology Stack

**Analysis Date:** 2026-05-24

## Languages

**Primary:**
- Markdown - The current project is mostly planning/specification content. Primary source files are `docs/prd.md`, `.ai/constitution.md`, `.ai/recon.md`, `CLAUDE.md`, and `GEMINI.md`.

**Secondary:**
- YAML - Spec Kit workflow and extension configuration in `.specify/workflows/speckit/workflow.yml`, `.specify/extensions.yml`, and `.specify/extensions/git/extension.yml`.
- TOML - Gemini command prompts in `.gemini/commands/speckit.plan.toml`, `.gemini/commands/speckit.implement.toml`, and related `.gemini/commands/speckit.*.toml` files.
- Bash - Spec Kit helper scripts in `.specify/scripts/bash/check-prerequisites.sh`, `.specify/scripts/bash/setup-plan.sh`, `.specify/scripts/bash/setup-tasks.sh`, `.specify/scripts/bash/create-new-feature.sh`, and the Claude hook `.claude/hooks/check-gstack.sh`.
- JSON - Integration state and Claude settings in `.specify/integration.json`, `.specify/init-options.json`, `.specify/integrations/gemini.manifest.json`, `.specify/integrations/speckit.manifest.json`, and `.claude/settings.json`.
- JavaScript/TypeScript - Only helper/example scripts under project-local skills, such as `.agents/skills/brainstorming/scripts/server.cjs`, `.agents/skills/brainstorming/scripts/helper.js`, `.agents/skills/writing-skills/render-graphs.js`, and `.agents/skills/systematic-debugging/condition-based-waiting-example.ts`.

## Runtime

**Environment:**
- No application runtime is pinned. There is no `package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `.csproj`, `.sln`, or `pubspec.yaml` in the repository.
- Shell execution is expected for Spec Kit scripts under `.specify/scripts/bash/`.
- Claude Code is configured through `.claude/settings.json` and the PreToolUse hook `.claude/hooks/check-gstack.sh`.
- Serena project configuration exists in `.serena/project.yml` with `languages: bash`.

**Package Manager:**
- Not detected for the project itself.
- Lockfile: missing. No `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, or equivalent lockfile was detected.

## Frameworks

**Core:**
- AI Delivery Pipeline protocol - Defined in `docs/prd.md` and `.ai/constitution.md`; current implementation is documentation and configuration, not packaged app code.
- Spec Kit `0.8.14.dev0` - Installed/configured for Gemini in `.specify/integration.json` and `.specify/init-options.json`.
- Gemini Spec Kit integration - Configured as the default integration in `.specify/integration.json`; command prompts live in `.gemini/commands/speckit.*.toml`.
- GStack - Required as a global Claude skill installation, enforced by `CLAUDE.md`, `.claude/settings.json`, and `.claude/hooks/check-gstack.sh`.
- Superpowers workflow skills - Vendored as project-local agent skills in `.agents/skills/*/SKILL.md`; these are process instructions, not app dependencies.

**Testing:**
- No project test runner detected.
- The PRD specifies future validation/QA tooling such as Promptfoo/custom validation and Playwright/GStack QA in `docs/prd.md`, but no test config or implementation exists.

**Build/Dev:**
- No build tool detected.
- Spec Kit workflow commands are described in `.specify/workflows/speckit/workflow.yml`.
- Git extension hooks are configured in `.specify/extensions.yml` and `.specify/extensions/git/extension.yml`.

## Key Dependencies

**Critical:**
- GStack global install - Required before Claude skill usage. Evidence: `CLAUDE.md` requires `~/.claude/skills/gstack/bin`, and `.claude/hooks/check-gstack.sh` denies skill execution when missing.
- Spec Kit - Drives `specify -> plan -> tasks -> implement` workflow. Evidence: `.specify/workflows/speckit/workflow.yml` requires `speckit_version: ">=0.8.5"`, while `.specify/integration.json` records `0.8.14.dev0`.
- Gemini integration - Current Spec Kit integration. Evidence: `.specify/integration.json` sets `installed_integrations: ["gemini"]` and `default_integration: "gemini"`.
- Git extension - Adds branch, remote, validation, initialization, and auto-commit hooks for Spec Kit. Evidence: `.specify/extensions.yml` and `.specify/extensions/git/extension.yml`.

**Infrastructure:**
- Serena - Local project configuration exists in `.serena/project.yml`; the active language server target is Bash.
- Context7, GitNexus, Serena, Semble, Promptfoo, Playwright, GSD, GStack, Spec-Kit/OpenSpec - Listed as intended routing tools in `docs/prd.md`; most are specified protocol dependencies rather than implemented application integrations.

## Configuration

**Environment:**
- No `.env` files detected.
- `.gitignore` excludes `.env`, `.env.local`, `.env.*.local`, `*.env`, `*.pem`, and `*.key`.
- No required application environment variables are documented in current source files.
- GStack expects a global filesystem install at `~/.claude/skills/gstack/bin`, referenced by `CLAUDE.md` and `.claude/hooks/check-gstack.sh`.

**Build:**
- No application build configuration detected.
- Workflow/configuration files:
  - `.claude/settings.json`: Claude PreToolUse hook configuration.
  - `.specify/integration.json`: Spec Kit integration state.
  - `.specify/init-options.json`: initialized AI/integration options.
  - `.specify/extensions.yml`: enabled Git extension hooks.
  - `.specify/workflows/speckit/workflow.yml`: full SDD workflow.
  - `.serena/project.yml`: Serena project configuration.

## Platform Requirements

**Development:**
- Git is expected by Spec Kit Git extension commands in `.specify/extensions/git/extension.yml`.
- Bash/sh is expected for `.specify/scripts/bash/*.sh` and `.claude/hooks/check-gstack.sh`.
- Claude Code users need the global GStack install described in `CLAUDE.md`.
- Gemini Spec Kit commands use `.gemini/commands/speckit.*.toml` and the initialized Gemini integration recorded in `.specify/integration.json`.

**Production:**
- Not applicable in the current implementation. The repo contains protocol docs and agent workflow configuration, not a deployable service, web app, CLI package, database-backed system, or cloud workload.

## Current Implementation Status

- Current state is documentation-first. The product blueprint lives in `docs/prd.md`; the operating constitution lives in `.ai/constitution.md`; recon notes live in `.ai/recon.md`.
- App/package implementation is not present. No package manifest, compiled language project, service entry point, API handler, database schema, or deploy config was detected.
- Spec Kit/Gemini/Claude/GStack/Serena configuration is present and practical, but it supports agent workflow orchestration rather than an end-user runtime.

---

*Stack analysis: 2026-05-24*
