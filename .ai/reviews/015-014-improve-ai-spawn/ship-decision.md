# Ship Decision: Improve AI for Spawn Subagent Support

**Feature:** 015-014-improve-ai-spawn
**Decision:** APPROVED TO SHIP

## Decision Rationale
All 21 CLI tests and the entire flow test suite are passing cleanly. Dynamic skill discovery and localization successfully copies and updates global skills into `.agents/skills/` and `.claude/skills/` with rewritten relative workspace-local paths. Subagent and parallel execution guidelines are correctly written/appended to `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`. No regressions found.
