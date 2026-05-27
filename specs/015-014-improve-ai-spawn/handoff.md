# Memory Handoff Report

- **Feature:** 015-014-improve-ai-spawn
- **Date:** May 26, 2026

## Promoted to project memory
- **Sandbox Compliance**: Introduced workspace-local dynamic skill localization to ensure sandboxed agents can run GSD skills offline without triggering environment-level read-permission boundaries.
- **Dynamic Skill Localization**: A protocol during `adp init` that copies global GSD skills from `~/.gemini/config/skills` into local `.agents/skills/` and `.claude/skills/` and rewrites any global paths in `<execution_context>` blocks to workspace-relative ones.
- **Subagent Parallelization**: Promoted the strategy of splitting independent tasks in `tasks.md` into concurrent execution threads using specialized parallel subagents.
- **Brownfield Preservation**: Established skip-checking for localized GSD skills and instruction guidelines to preserve pre-existing workspace customizations.

## Architecture updated
- `bin/adp.js`: Modified the `handleInit` command handler to call `localizeGlobalSkills(repoRoot)` and `appendSubagentGuidelines(repoRoot)`. Added supporting utility functions `resolveHomePath` for path expansions.
- `CONTEXT.md`: Added definitions for **Sandbox Compliance** and **Subagent Parallelization**.
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`: Appended the `## Subagent & Parallel Execution Guidelines` section, establishing policies on spawning specialized subagents in parallel for independent tasks.
- `validators/scripts/test-cli.js`: Integrated new tests to assert correct global-to-local skill file copying, `<execution_context>` path rewriting, and guideline formatting.

## Verification promoted
- **Automated Tests**:
  - `validators/scripts/test-cli.js` (`CLI Init Localizes Skills and Appends Guidelines`): Mocks a global home config directory, triggers `adp init` under simulated environments, and verifies that GSD skills are correctly copied and rewritten with relative workspace paths.
  - Full suite validation (`npm run test:cli` and `npm test`).
- **Manual Verification**:
  - Verified localization outputs of `node bin/adp.js init` inside clean worktrees.
