# Memory Handoff Report

**Feature:** 015-014-improve-ai-spawn

## Promoted to project memory
- **Dynamic Localization:** Scans and localizes GSD global skills into workspace `.agents/skills/` and `.claude/skills/` paths.
- **Subagent Guidelines:** Guidelines are appended to `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md` to direct agents to use subagents for parallel execution.

## Architecture updated
- Modified `bin/adp.js` `handleInit()` function to call `localizeGlobalSkills()` and `appendSubagentGuidelines()`.
- Added helper functions to resolve global home paths, parse `<execution_context>`, copy files, rewrite paths, and append instructions.

## Verification promoted
- Added complete unit/integration coverage for both localization and instruction guidelines in `validators/scripts/test-cli.js`.
- Verified all CLI tests pass.
