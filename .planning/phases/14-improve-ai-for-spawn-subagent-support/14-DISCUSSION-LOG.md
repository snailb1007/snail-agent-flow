# Phase 14: Improve AI for spawn subagent support - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 14-improve-ai-for-spawn-subagent-support
**Areas discussed:** GSD Workflow Location in Workspace, Reference Path Resolution in Skill Context, Subagent Spawning Guidelines Content and Location, Verification Strategy for Sandbox Security

---

## GSD Workflow Location in Workspace

| Option | Description | Selected |
|--------|-------------|----------|
| Option 1 | Under `.agents/skills/<skill-name>/workflows/...` and `.agents/skills/<skill-name>/references/...` (keeps skill structures completely self-contained and clean) | ✓ (Recommended) |
| Option 2 | Under `.gsd/workflows/...` and `.gsd/references/...` | |

**User's choice:** Option 1
**Notes:** Keeps each skill self-contained and aligns with how local skill directories are structured.

---

## Reference Path Resolution in Skill Context

| Option | Description | Selected |
|--------|-------------|----------|
| Option 1 | Workspace-relative paths using the `@` prefix, e.g., `@.agents/skills/gsd-execute-phase/workflows/execute-phase.md` | ✓ (Recommended) |
| Option 2 | Relative paths from the SKILL.md file itself, e.g., `./workflows/execute-phase.md` | |

**User's choice:** Option 1
**Notes:** Aligns with standard `@` path resolver mechanism already validated in the workspace.

---

## Subagent Spawning Guidelines Content and Location

| Option | Description | Selected |
|--------|-------------|----------|
| Option 1 | Append a new section `## Subagent & Parallel Execution Guidelines` directly to `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` | ✓ (Recommended) |
| Option 2 | Create a dedicated skill `subagent-driven-development/SKILL.md` | |

**User's choice:** Option 1
**Notes:** Makes the guidelines active and loaded immediately when the agent starts a session.

---

## Verification Strategy for Sandbox Security

| Option | Description | Selected |
|--------|-------------|----------|
| Option 1 | Add a test to `validators/scripts/test-cli.js` that asserts all workflow files are correctly copied during `adp init` and paths in `SKILL.md` are valid | ✓ (Recommended) |
| Option 2 | Implement a new dedicated test script `validators/scripts/test-subagents.js` | |

**User's choice:** Option 1
**Notes:** Simple consolidation that integrates with the existing CLI test suite.

---

## the agent's Discretion

- Precise text formatting of the subagent guidelines in instruction adapter files.
- Copy error handling details when copying global workflows during `adp init`.

## Deferred Ideas

- None.
