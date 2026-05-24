# Technology Stack Research

**Project:** Snail Agent Flow  
**Research dimension:** Stack  
**Domain:** Local AI coding workflow orchestration protocol / spec-to-ship agent pipeline  
**Researched:** 2026-05-24  
**Overall confidence:** MEDIUM-HIGH

## Current Repository State

This repository is documentation-first. It currently contains protocol documents, agent instructions, Spec-Kit/Gemini scaffolding, local skill instructions, durable `.ai/` placeholder artifacts, and GSD planning maps. It does **not** contain an app runtime, CLI package, package manifest, test runner, CI workflow, database schema, service entry point, or deployable artifact.

The current practical stack is therefore:

| Layer | Current Technology | Evidence | Status |
|-------|--------------------|----------|--------|
| Source format | Markdown | `docs/prd.md`, `.ai/constitution.md`, `.planning/codebase/*.md` | Active |
| Workflow config | JSON, YAML, TOML | `.claude/settings.json`, `.gemini/.specify/*.json`, `.gemini/.specify/*.yml`, `.gemini/commands/*.toml` | Active |
| Compatibility scripts | Bash | `.gemini/.specify/scripts/bash/*.sh`, `.claude/hooks/check-gstack.sh` | Active |
| Agent instructions | Claude/Gemini/agent skill Markdown | `CLAUDE.md`, `GEMINI.md`, `.agents/skills/*/SKILL.md` | Active |
| Spec workflow | Spec Kit / Gemini scaffold | `.gemini/.specify/integration.json` records Spec Kit `0.8.14.dev0` with Gemini integration | Active |
| Runtime package | None | No `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `.csproj`, or equivalent | Missing by design |
| Test runner | None | No test config or package manifest | Missing |

## Stack Recommendation

### Phase 1: Template-Only MVP

Use the current stack: Markdown, JSON, YAML, TOML, and small Bash compatibility scripts. Do **not** introduce a runtime just to make the repository feel like a product.

Build:

- canonical `.ai/` artifact templates;
- root agent instruction templates for `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and future agent runtimes;
- prompt templates for recon, critique, spec validation, execution, QA, memory handoff, and ship;
- deterministic documentation checks that can run from shell or a future CLI;
- a clear contract for `.ai/specs/`, `.ai/sessions/`, `.ai/memory/`, `.ai/state/`, `.planning/`, and Spec-Kit feature directories.

Reason: the PRD explicitly says the project should be a thin orchestration protocol, not a replacement for GSD, GStack, Superpowers, Spec-Kit, OpenSpec, Serena, Semble, GitNexus, Context7, Promptfoo, or Playwright.

### Phase 2: Local CLI

When the repo needs executable commands, use a small Node.js + TypeScript CLI.

| Technology | Role | Recommendation | Confidence |
|------------|------|----------------|------------|
| Node.js | CLI runtime | Use current active LTS Node for local command execution and npm packaging. Configure package entry points with `exports` and a `bin` command. | HIGH |
| TypeScript | CLI implementation | Use strict TypeScript for validators, path resolution, session creation, and doctor checks. | HIGH |
| npm | Initial package manager | Use npm initially. This is a single-package CLI, not a monorepo; npm keeps setup boring and portable. | MEDIUM |
| Commander.js | CLI command parser | Use for `init`, `new-session`, `status`, `validate-spec`, `handoff`, and `doctor` because it directly supports commands, subcommands, options, help text, and executable command organization. | HIGH |
| Node `fs`, `path`, `child_process`, `node:test` | Baseline implementation and tests | Prefer Node built-ins for filesystem checks and early tests. Add heavier libraries only after repeated local complexity appears. | HIGH |
| Vitest | Test runner once TypeScript test volume grows | Adopt when the CLI has enough branchy behavior to benefit from watch mode, coverage, TypeScript-friendly config, and project-level test grouping. | MEDIUM-HIGH |

Recommended initial package shape:

```text
package.json
tsconfig.json
src/
  cli.ts
  commands/
    init.ts
    new-session.ts
    status.ts
    validate-spec.ts
    handoff.ts
    doctor.ts
  core/
    artifacts.ts
    paths.ts
    validation.ts
templates/
  base/
  minimal/
prompts/
validators/
  deterministic/
test/
```

Recommended initial commands:

```bash
snail-flow init
snail-flow new-session "task-slug"
snail-flow status
snail-flow doctor
snail-flow validate-spec
snail-flow handoff
```

The PRD examples use `adp`. Treat the final binary name as a product naming decision, not a stack dependency.

### Phase 3: Validation Stack

Start with deterministic TypeScript validators before adding model-backed evaluation.

Build deterministic checks for:

- required files and directories;
- broken artifact references;
- `.ai/specs/current/*` completeness;
- session folder existence and current-session state;
- validation report outcome values: `PASS`, `FAIL`, `NEEDS_HUMAN_REVIEW`;
- failure retry counters and human-review thresholds;
- memory handoff status before ship;
- path drift between `.ai/specs/`, `.gemini/.specify/`, and future root `.specify/`.

Add Promptfoo only after deterministic validation is not enough. Promptfoo is appropriate for rubric-style spec validation because its current docs support `promptfoo eval`, YAML config, assertions, output files, and model/prompt evaluation workflows. Keep it optional because not every repo should need model-backed evals to run `doctor`.

### Phase 4: Agent Presets and Packaging

Use file templates and preset directories, not framework plugins, as the main extension mechanism.

Recommended preset layout:

```text
presets/
  claude/
  codex/
  cursor/
  gemini/
  kiro/
  windsurf/
  generic/
```

Each preset should contain:

- instruction files;
- command templates;
- artifact path mappings;
- required external tool checks;
- compatibility notes;
- migration notes from older artifact layouts.

Do not tightly couple presets to one agent runtime. Spec Kit current documentation emphasizes multi-agent integrations and command/template/script setup; this project should preserve that shape rather than becoming Claude-only or Gemini-only.

### Phase 5: Optional Browser/UI QA

Do not add Playwright until there is a dashboard, web UI, or browser-facing verification target. Playwright is useful later for browser QA, traces, and screenshots, but this repo currently has no UI and no app runtime.

### Phase 6: Optional MCP or Dashboard

Defer MCP server, web dashboard, hosted service, and database-backed state until the file-based protocol and CLI prove useful. The current product value is local artifact discipline and workflow routing.

## What Not To Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js/React dashboard as the first runtime | No UI requirement exists yet; a dashboard would distract from artifact contracts and validation gates. | Template MVP, then small CLI |
| Database or hosted backend | State is intentionally local, human-readable, and file-based under `.ai/` and `.planning/`. | Markdown/JSON state files |
| LangChain, CrewAI, AutoGen, or a custom agent framework | The repo orchestrates existing coding tools; adding an agent framework creates framework soup. | Tool routing docs and CLI checks |
| Reimplementing GSD/GStack/Superpowers/Spec-Kit | Explicitly out of scope in `docs/prd.md` and `.planning/PROJECT.md`. | Integrate through templates, commands, and validators |
| Bash-only product implementation | Bash exists for compatibility scripts, but artifact validation and cross-platform path logic will become fragile in shell. | TypeScript CLI with small Bash shims only where needed |
| Python CLI as the first runtime | Spec Kit itself may use Python/uvx upstream, but this repo already has JSON/YAML/TOML/JS examples and a local Node CLI is easier to package for the intended command surface. | Node.js + TypeScript |
| Bun or Deno baseline | They are unnecessary extra runtime assumptions for a local workflow protocol. | Node.js LTS |
| Monorepo tooling | There is one package and no app runtime. Workspaces add ceremony before value. | Single package until separate packages are real |
| Promptfoo as the first validator | Model-backed validation is useful but should not be required for basic path/state checks. | Deterministic validators first, Promptfoo later |
| Playwright as a baseline dependency | There is no browser target. | Add only when a UI or browser QA target exists |
| MCP server as MVP | The protocol must work as files and commands first. | CLI and templates first |

## Dependency Admission Rule

Add a dependency only when it satisfies at least one of these:

1. It directly implements a user-visible command in the PRD.
2. It prevents fragile custom parsing of a real artifact format.
3. It improves validation evidence in a way deterministic checks cannot.
4. It supports multiple agent runtimes without locking the project to one.

Reject dependencies that only make the repo look more mature.

## Proposed `package.json` Direction

When Phase 2 starts, initialize the package minimally:

```json
{
  "type": "module",
  "bin": {
    "snail-flow": "./dist/cli.js"
  },
  "exports": "./dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "node --test",
    "typecheck": "tsc --noEmit"
  }
}
```

If Vitest is adopted, change `test` to `vitest run` and add a separate coverage script rather than making coverage mandatory for every local check.

Initial install shape:

```bash
npm install commander
npm install -D typescript @types/node
```

Add later, when justified:

```bash
npm install -D vitest
```

Do not add YAML/TOML/JSON-schema parsing libraries until the first validator actually needs structured parsing beyond JSON and filesystem checks.

## Roadmap Implications

1. **Artifact Contract Phase**: no runtime needed; finalize `.ai/`, `.planning/`, Spec-Kit, and agent instruction path ownership.
2. **Template MVP Phase**: ship templates and docs; validate by file checks and manual review.
3. **CLI Foundation Phase**: introduce Node.js + TypeScript + Commander.js with `init`, `new-session`, `status`, and `doctor`.
4. **Validation Phase**: implement deterministic validators first; add Promptfoo as an optional spec-rubric layer.
5. **Preset Phase**: package agent runtime presets as templates, not hard-coded runtime branches.
6. **UI/MCP Phase**: only after local CLI usage exposes a real need.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Current repo state | HIGH | Verified from `.planning/codebase/STACK.md`, `.planning/codebase/ARCHITECTURE.md`, `docs/prd.md`, `.ai/constitution.md`, and file layout. |
| Node.js + TypeScript CLI | HIGH | Fits local command/product needs and verified Node package/test documentation. |
| Commander.js | HIGH | Verified docs show commands, subcommands, options, help metadata, action handlers, and executable subcommands. |
| Vitest | MEDIUM-HIGH | Verified docs support TypeScript config, coverage, and project grouping; defer until test complexity warrants it. |
| Promptfoo optional layer | MEDIUM-HIGH | Official docs support CLI eval, YAML config, assertions, and outputs; still optional because deterministic gates should come first. |
| Playwright optional layer | MEDIUM | Official docs support CLI testing/debug artifacts, but repo has no UI/runtime yet. |
| Exact CLI binary name | LOW | PRD uses `adp`; project name suggests `snail-flow`. Decide during product naming, not stack research. |

## Sources

- Repository source: `.planning/PROJECT.md`
- Repository source: `.planning/codebase/STACK.md`
- Repository source: `.planning/codebase/ARCHITECTURE.md`
- Repository source: `docs/prd.md`
- Repository source: `.ai/constitution.md`
- Context7 / Node.js docs: package `exports` and `node --test` runner from `nodejs/node`
- Context7 / Commander.js docs: commands, subcommands, options, action handlers, executable subcommands from `tj/commander.js`
- Context7 / Vitest docs: TypeScript config, projects, coverage, and typechecking support from `vitest-dev/vitest`
- Spec Kit official docs: https://github.github.io/spec-kit/index.html
- Spec Kit CLI reference: https://github.github.io/spec-kit/reference/overview.html
- Promptfoo CLI docs: https://www.promptfoo.dev/docs/usage/command-line/
- Promptfoo configuration/assertion docs: https://www.promptfoo.dev/docs/configuration/guide/
- Playwright CLI docs: https://playwright.dev/docs/test-cli
