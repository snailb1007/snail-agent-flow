# Phase 14: Improve AI for spawn subagent support - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable the AI agent client to successfully parse GSD workflows without permission denied sandbox errors, and instruct it to spawn subagents for parallel task execution.

</domain>

<decisions>
## Implementation Decisions

### Localization of GSD Workflow Assets
- **D-01:** Copy GSD workflows and reference files locally to the workspace under `.agents/skills/<skill-name>/workflows/` and `.agents/skills/<skill-name>/references/` during project initialization (`adp init`). Local stubs under `.claude/skills/...` will also be kept in sync.

### Workspace-Relative Path Resolution
- **D-02:** Use workspace-relative paths starting with `@.agents/skills/` in the `<execution_context>` blocks of the local skill `SKILL.md` files so that the AI client can resolve them without sandbox path permission security boundaries.

### Default Instruction Guidelines for Subagents
- **D-03:** Append a new section `## Subagent & Parallel Execution Guidelines` directly to the adapter files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) during `adp init` and template rendering to guide the agent in spawning subagents for independent task lists.

### Verification Strategy
- **D-04:** Add a verification check to `validators/scripts/test-cli.js` asserting that the GSD workflows and reference files are correctly localized during `adp init`, and that paths in the local `SKILL.md` stubs are properly formatted.

### the agent's Discretion
- The implementation of the exact layout of `.agents/skills/` folders, how copy errors are handled, and how the subagent guidelines text is formatted.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Strategy and Planning
- `.planning/notes/subagent-spawning-strategy.md` — The core spawning and sandbox path strategy.
- `.planning/ROADMAP.md` — Roadmap defining goals and phase dependencies.
- `.planning/REQUIREMENTS.md` — Requirement specifications for SUB-01 to SUB-04.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/adp.js` `handleInit()` — The initialization logic where we can copy files and append guidelines.

### Established Patterns
- Copying templates from package to workspace on initialization.
- Default instruction file structure (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`).

### Integration Points
- `bin/adp.js` `handleInit()` — Entry point for file copying.
- `validators/scripts/test-cli.js` — Verification entry point.

</code_context>

<specifics>
## Specific Ideas

- No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-improve-ai-for-spawn-subagent-support*
*Context gathered: 2026-05-26*
