# Memory Handoff Report

- **Feature:** 014-improve-ai-for-spawn-subagent-support
- **Date:** 2026-05-27

## Promoted to project memory
- **Dynamic Skill Localization**: Concept of dynamically copying global Gemini/Claude GSD skills (folders starting with `gsd-`) from the user's home directory (`~/.gemini/config/skills/`) to the local repository workspaces (`.agents/skills/` and `.claude/skills/`) during `adp init`.
- **Context Path Redirection**: Protocol for parsing `<execution_context>` blocks in `SKILL.md` files to rewrite global path references (starting with `@~` or `$HOME`, or containing `.gemini/antigravity`) into workspace-relative paths, ensuring sandboxed agents can run them offline without sandbox/permission errors.
- **Subagent & Parallel Execution Guidelines**: System directives informing agents how to identify independent, non-sequential tasks, define specialized subagents via `define_subagent` tool, and spawn them concurrently via `invoke_subagent` using minimal context packs.
- **Brownfield Preservation**: Guaranteeing that initialization commands (`adp init`) skip over existing local skill folders and do not overwrite modified workflows or duplicate guidelines in instruction files.

## Architecture updated
- **Added** `lib/skill-md-parser.js`: Implements utility functions `extractExecutionContextBlocks(content)` and `findSuspiciousAtLines(block)` for scanning SKILL.md files.
- **Modified** `bin/adp.js`:
  - Extended `handleInit()` to call `localizeGlobalSkills(repoRoot)` and `appendSubagentGuidelines(repoRoot)`.
  - Added `localizeGlobalSkills(repoRoot)`: Scans `~/.gemini/config/skills/`, parses execution context blocks, copies referenced files to workspace subfolders, and rewrites path references to workspace-relative paths.
  - Added `appendSubagentGuidelines(repoRoot)`: Automatically appends `## Subagent & Parallel Execution Guidelines` section to `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`.
  - Updated templates and generated files.

## Verification promoted
- **Automated Tests** (in `validators/scripts/test-cli.js`):
  - `CLI Init Localizes Skills and Appends Guidelines`: Mocks a global config directory with `gsd-test-skill` and verifies proper file copying, path rewriting, and guidelines injection.
  - `CLI Init Localizes Multiple Execution Context Blocks`: Verifies multiple context blocks are handled and resolved.
  - `CLI Init Strict Gate Greenfield Happy Path`: Verifies init succeeds under correct happy path conditions.
  - `CLI Init Strict Gate Fails on Missing Prerequisite`: Verifies init exits with 1 when prerequisite skills are missing.
  - `CLI Init Strict Gate Fails on Broken Localized SKILL.md`: Verifies that init flags localized `SKILL.md` containing unresolved global paths.
  - `CLI Init Strict Gate Reports Instruction Section Missing`: Verifies that init fails when the required instruction section is missing or improperly cased.
- **Verification Commands**:
  - Run full test suite: `npm test`
  - Run CLI integration tests: `npm run test:cli`
