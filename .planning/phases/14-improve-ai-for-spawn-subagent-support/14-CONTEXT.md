# Phase 14: Improve AI for Spawn Subagent Support — Context

**Date:** 2026-05-26
**Phase:** 14-improve-ai-for-spawn-subagent-support
**Requirements:** SUB-01, SUB-02, SUB-03, SUB-04

## Decisions

### D-14-01: Dynamic Discovery and Workspace Localization of Skills
We will extend the `adp init` command to dynamically discover and localize global skill contexts.
- **Global Discovery:** The CLI will resolve the user's home directory config path (specifically `~/.gemini/config/skills/` where GSD skills are installed) using `os.homedir()`.
- **Parsing and Copying:** It will scan this directory for all `gsd-*` folders. For each folder:
  - It reads `SKILL.md` and extracts paths starting with `~` or referencing `.gemini/antigravity` in `<execution_context>` blocks.
  - It copies those referenced workflow/reference markdown files from their global locations into the local workspace under `.agents/skills/<skill-slug>/workflows/` and `.agents/skills/<skill-slug>/references/`.
  - It creates/updates `.agents/skills/<skill-slug>/SKILL.md` (and also `.claude/skills/<skill-slug>/SKILL.md` for Claude parity).
  - It rewrites the `<execution_context>` lines in these local `SKILL.md` files to use workspace-relative paths (e.g. `@.agents/skills/<skill-slug>/workflows/` instead of `@~/.gemini/antigravity/...`).
- **Safe Overwrite Policy:** If the local files already exist, the CLI will skip them to protect custom modifications, matching the existing project brownfield policy.

**Rationale:** The AI sandboxing boundaries prevent the agent client from reading files outside the workspace (such as in `~/.gemini/antigravity`), which throws `Permission denied` errors during GSD skill loading. Localizing these files into the workspace allows sandboxed agents to load and parse them successfully.

### D-14-02: Subagent & Parallel Execution Guidelines in Instruction Files
We will update `adp init` to append subagent rules to the default instructions.
- If `CLAUDE.md`, `AGENTS.md`, or `GEMINI.md` are generated or updated during `init`, they will include a dedicated `## Subagent & Parallel Execution Guidelines` section.
- If these files already exist, the initialization step will check if the section is present, and append it to the end of the file if missing.
- **Rules included:**
  1. Detect independent/non-sequential tasks in `tasks.md` before execution.
  2. Define specialized subagents using the `define_subagent` tool.
  3. Invoke subagents in parallel using the `invoke_subagent` tool.
  4. Restrict subagent context (do not pass full session logs) to keep tokens low and avoid context fragmentation.
  5. Wait for subagent completion before advancing to downstream tasks.

**Rationale:** Runtimes often default to sequential inline execution to conserve tokens unless they are explicitly instructed to use their parallel spawning capabilities. Formalizing these rules in `*.md` files ensures they are loaded into the agent's system prompt on startup.

### D-14-03: Claude Code parity for local skills
We will ensure that all dynamic localizations write to both `.agents/skills/` and `.claude/skills/`.
- Both directories are supported by this repository's prerequisite checks and doctor script.
- Writing to both ensures parity regardless of whether the user is executing the flow via Gemini Agent or Claude Code.

**Rationale:** ADAPT-03 requires maintaining runtime neutrality and parity across different AI agent clients.

### D-14-04: Test Coverage & Sandbox Simulation
We will update `validators/scripts/test-cli.js` to simulate this behavior.
- We will mock a global skill folder and some mock workflow files in the home directory path during testing.
- The test sandbox will assert that running `adp init` copies the mock workflows and generates rewritten relative-context `SKILL.md` files correctly.

**Rationale:** Deterministic validator tests are a hard requirement (CLI-03, VERIFY-02) before code changes are merged.

## Assumptions

- The CLI runs outside the AI sandbox with full read/write permission to the user's home directory.
- `~/.gemini/config/skills/` is the standard path where GSD skills are registered on the user's host system.
- `~/.gemini/antigravity/` is the standard path where global get-shit-done workflows and references reside.

## Constraints

- Files copied to the workspace will be checked into the project's repository. While this increases the workspace file count, it is required so that subsequent agent invocations have access to the workflows.
- Dynamic rewrite must parse the `<execution_context>` blocks accurately using simple regex or split operations, handling whitespace and comments defensively.

## Open Questions

None. All options resolved using recommended patterns.

## Dependencies

- Phase 9: CLI `adp init` command structure (complete).
- Phase 12: `lib/tool-validator.js` and prerequisite checks (complete).
