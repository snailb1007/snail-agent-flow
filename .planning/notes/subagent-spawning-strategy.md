# Subagent Spawning & Sandbox Path Strategy

**Date**: 2026-05-26 | **Phase**: Phase 14: Improve AI for spawn subagent support

## Context & Problem

During testing of the `snail-agent-flow` orchestration flow, AI agents (e.g. Claude Code or Gemini Agent) failed to spawn subagents for parallel execution. Upon analysis, two primary bottlenecks were discovered:

1. **Sandbox Permission Denied**:
   The GSD execution skills (like `gsd-execute-phase`) reference workflow and reference files located globally at `~/.gemini/antigravity/get-shit-done/workflows/` in their `<execution_context>` blocks. Because the App Data directory `~/.gemini/antigravity` is protected by hardcoded sandbox boundaries, the AI client encounters a `Permission denied` error when trying to read these files, falling back to sequential execution without instructions.
   
2. **Missing Instruction Mandate**:
   The default runtime instructions (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`) did not explicitly dictate when and how the agent should utilize its subagent capability (`define_subagent` and `invoke_subagent` tools), causing it to default to interactive sequential mode to conserve tokens.

## Decision & Strategy

To resolve these limitations, Phase 14 will implement the following changes:

### 1. Localize GSD Workflow Assets to Workspace
During project initialization (`adp init` / `saf init`), the CLI will copy GSD workflows and reference files from the global setup into the workspace under the specific skill directories:
* `.agents/skills/gsd-execute-phase/workflows/execute-phase.md`
* `.agents/skills/gsd-execute-phase/references/ui-brand.md`
* `.agents/skills/gsd-explore/workflows/explore.md`
* `.agents/skills/gsd-explore/references/questioning.md`
* `.agents/skills/gsd-explore/references/domain-probes.md`

Local stubs in `.claude/skills/...` will also be updated correspondingly.

### 2. Workspace-Relative Skill Context Resolution
We will modify the `<execution_context>` declarations in the local `SKILL.md` stubs to reference these copied files via workspace-local relative paths rather than global `~/` paths:
```markdown
<execution_context>
@.agents/skills/gsd-execute-phase/workflows/execute-phase.md
@.agents/skills/gsd-execute-phase/references/ui-brand.md
</execution_context>
```
Since these files reside in the workspace, the AI client is permitted to read them without security warnings.

### 3. Subagent Spawning Rules in Global Adapter Files
We will append a section `## Subagent & Parallel Execution Guidelines` to `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md`. This will instruct the agent to:
* Detect independent/non-sequential tasks in `tasks.md`.
* Define specialized subagents using the `define_subagent` tool.
* Invoke subagents in parallel using the `invoke_subagent` tool.
* Restrict subagent context by not passing full session logs, preserving prompt focus and token budgets.

## Verification

We will verify this strategy by:
1. Running `adp init` to ensure local GSD skill folders, workflows, and references are generated successfully.
2. Checking that the generated local skill files are loaded by the client and do not throw path permission errors.
3. Simulating execution of a multi-task plan where the agent successfully invokes subagents in parallel.
