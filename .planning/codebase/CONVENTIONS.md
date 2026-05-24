# Coding Conventions

**Analysis Date:** 2026-05-24

## Current Codebase State

This repository is mostly planning, workflow, and AI-agent orchestration documentation. Application source code is not present. The only detected code files are support/example scripts under `.agents/skills/`:

- `.agents/skills/brainstorming/scripts/helper.js`
- `.agents/skills/brainstorming/scripts/server.cjs`
- `.agents/skills/systematic-debugging/condition-based-waiting-example.ts`
- `.agents/skills/writing-skills/render-graphs.js`

No package manifest, lint config, formatter config, CI workflow, or test runner config was detected.

## Naming Patterns

**Files:**
- Use uppercase Markdown filenames for durable project maps and top-level reference artifacts, as in `.ai/constitution.md`, `.planning/codebase/CONVENTIONS.md`, and `.planning/codebase/TESTING.md`.
- Use lowercase descriptive Markdown filenames for workflow/spec artifacts, as in `.ai/specs/spec.md`, `.ai/specs/plan.md`, `.ai/specs/tasks.md`, `.ai/recon.md`, and `docs/prd.md`.
- Use kebab-case directories for reusable skills, as in `.agents/skills/test-driven-development/`, `.agents/skills/systematic-debugging/`, and `.agents/skills/verification-before-completion/`.
- Use `SKILL.md` as the entry point for each local skill directory, as in `.agents/skills/requesting-code-review/SKILL.md`.
- Use explicit script names for utility scripts, as in `.agents/skills/writing-skills/render-graphs.js` and `.claude/hooks/check-gstack.sh`.

**Functions:**
- Use lower camelCase for JavaScript/TypeScript functions, as in `computeAcceptKey`, `encodeFrame`, and `decodeFrame` in `.agents/skills/brainstorming/scripts/server.cjs`.
- Use named functions for reusable script logic, as in `extractDotBlocks`, `extractGraphBody`, `combineGraphs`, and `renderToSvg` in `.agents/skills/writing-skills/render-graphs.js`.
- Use exported named functions in TypeScript examples, as in `waitForEvent` in `.agents/skills/systematic-debugging/condition-based-waiting-example.ts`.

**Variables:**
- Use `const` by default and `let` only for reassignment, as shown in `.agents/skills/brainstorming/scripts/helper.js` and `.agents/skills/writing-skills/render-graphs.js`.
- Use uppercase constants for protocol or configuration constants, as in `OPCODES`, `WS_MAGIC`, and `WS_URL` in `.agents/skills/brainstorming/scripts/server.cjs` and `.agents/skills/brainstorming/scripts/helper.js`.

**Types:**
- No application type model exists yet.
- TypeScript examples use PascalCase imported types, as in `ThreadManager`, `LaceEvent`, and `LaceEventType` in `.agents/skills/systematic-debugging/condition-based-waiting-example.ts`.

## Code Style

**Formatting:**
- No formatter config was detected.
- Existing JavaScript uses CommonJS, semicolons, single quotes, and 2-space indentation, as shown in `.agents/skills/writing-skills/render-graphs.js`.
- Existing shell scripts use Bash with strict command checks where needed, as in `.claude/hooks/check-gstack.sh`.

**Linting:**
- No ESLint, Prettier, Biome, or equivalent config was detected.
- When app code is introduced, add lint and format configuration in the same phase as the first real source tree. Record the chosen commands in `.planning/codebase/TESTING.md` and the implementation plan that creates them.

## Import Organization

**Order:**
1. Built-in runtime modules first, as in `crypto`, `http`, `fs`, and `path` in `.agents/skills/brainstorming/scripts/server.cjs`.
2. Local files after runtime modules, as in template/helper loading from `__dirname` in `.agents/skills/brainstorming/scripts/server.cjs`.
3. Type-only imports first in TypeScript examples, as in `.agents/skills/systematic-debugging/condition-based-waiting-example.ts`.

**Path Aliases:**
- No project-wide application alias is configured.
- The TypeScript example in `.agents/skills/systematic-debugging/condition-based-waiting-example.ts` references `~/...`, but there is no `tsconfig.json` in this repository to define that alias.

## Error Handling

**Patterns:**
- Treat workflow gate results as explicit states: `PASS`, `FAIL`, and `NEEDS_HUMAN_REVIEW` are defined in `.ai/constitution.md`.
- Stop rather than self-repair indefinitely. `.ai/constitution.md` requires `NEEDS_HUMAN_REVIEW` after more than three validation failures in the same category.
- Use `try`/`catch` around external commands and report failures to stderr, as in `renderToSvg` in `.agents/skills/writing-skills/render-graphs.js`.
- Use `process.exit(1)` for invalid CLI usage or missing prerequisites, as in `.agents/skills/writing-skills/render-graphs.js` and `.claude/hooks/check-gstack.sh`.
- Reject async wait failures with descriptive `Error` messages rather than fixed sleeps, as shown in `.agents/skills/systematic-debugging/condition-based-waiting-example.ts`.

## Logging

**Framework:** `console` and Markdown artifacts.

**Patterns:**
- Use `console.error` for CLI/script failures and `console.log` for human-readable script output, as in `.agents/skills/writing-skills/render-graphs.js`.
- Record durable verification and handoff information in artifacts, not only chat. `.ai/constitution.md` names `.ai/memory/verification-history.md`, `.ai/memory/decisions.md`, `.ai/memory/known-risks.md`, and `.ai/sessions/<session-id>/agent-execution.md` as source-of-truth handoff files.

## Comments

**When to Comment:**
- Comment protocol-heavy or non-obvious logic, as in the WebSocket protocol section of `.agents/skills/brainstorming/scripts/server.cjs`.
- Keep documentation comments useful and operational, as in the usage block at the top of `.agents/skills/writing-skills/render-graphs.js`.
- Do not add comments that restate simple code.

**JSDoc/TSDoc:**
- Use JSDoc/TSDoc for reusable utilities where parameters, timeouts, or examples matter, as shown in `.agents/skills/systematic-debugging/condition-based-waiting-example.ts`.

## Function Design

**Size:** Keep functions narrow and named around one operation. Examples include `computeAcceptKey`, `encodeFrame`, and `decodeFrame` in `.agents/skills/brainstorming/scripts/server.cjs`.

**Parameters:** Prefer explicit parameters over hidden globals for reusable functions. CLI entry functions may parse `process.argv`, as in `main` in `.agents/skills/writing-skills/render-graphs.js`.

**Return Values:** Return `null` for recoverable parse/render absence only when callers check it, as in `.agents/skills/writing-skills/render-graphs.js`. Throw or reject for invalid protocol state and timeout failures, as in `.agents/skills/brainstorming/scripts/server.cjs` and `.agents/skills/systematic-debugging/condition-based-waiting-example.ts`.

## Module Design

**Exports:** No shared application module system exists. Current scripts are standalone utilities or browser helpers.

**Barrel Files:** Not used.

## Documentation Conventions

**Source of Truth:**
- Treat `.ai/constitution.md` as the operating rules source of truth for agents and quality gates.
- Treat `docs/prd.md` as the product/process blueprint source of truth.
- Treat `.ai/specs/spec.md`, `.ai/specs/plan.md`, `.ai/specs/tasks.md`, and `.ai/specs/validation-report.md` as placeholders until populated by a spec workflow.

**Artifact Style:**
- Keep artifacts concise, current, and specific enough for another agent or human to resume work. This is required by `.ai/constitution.md`.
- Include concrete file paths in specs, plans, reviews, and validation notes.
- Record meaningful decisions in durable artifacts when they affect scope, behavior, architecture, operations, security, rollback, or verification, per `.ai/constitution.md`.

## Process Conventions

**Required Flow:**
- Recon before planning existing work. Use `.ai/recon.md` or `.ai/sessions/<session-id>/agent-recon.md`.
- Planning critique before specs. Use `.ai/sessions/<session-id>/gstack-plan-review.md` when running the full pipeline.
- Spec before broad implementation. Use `.ai/specs/spec.md`, `.ai/specs/plan.md`, and `.ai/specs/tasks.md` or the current GSD equivalents.
- Execution must stay within validated scope.
- QA and verification evidence must exist before completion claims.
- Memory handoff is required when behavior, architecture, operations, or known risks change.

**Quality Expectations:**
- Preserve existing behavior unless an accepted artifact requires a change.
- Make the smallest useful change that satisfies the accepted artifact.
- Protect secrets, user data, auth boundaries, permissions, and public behavior.
- Use current third-party documentation when library, framework, SDK, API, CLI, or cloud-service behavior matters.
- Keep diffs narrow and explain any required deviation from an accepted plan.

---

*Convention analysis: 2026-05-24*
