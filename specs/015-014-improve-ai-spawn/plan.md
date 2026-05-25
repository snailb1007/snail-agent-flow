# Implementation Plan: Improve AI for Spawn Subagent Support

Enable sandboxed AI agents to successfully load, parse, and execute global Get-Shit-Done (GSD) skills by dynamically copying and localizing GSD workflows and reference files into the local workspace under `.agents/skills/` and `.claude/skills/` during project initialization (`adp init`).

## User Review Required

> [!IMPORTANT]
> The dynamic localization of global GSD skills checks checked-in workspace files `.agents/skills/` and `.claude/skills/`. Since the copied files are added to the workspace, they will be checked into the user's repository. This is necessary to ensure sandboxed agents have offline access to these files during subsequent sessions.

## Open Questions

None.

## Proposed Changes

### CLI Packaging

#### [MODIFY] [adp.js](file:///Volumes/D/snail-agent-flow/bin/adp.js)
- Extend `handleInit()` to implement dynamic GSD skill localization:
  1. Scan `~/.gemini/config/skills/` for directories starting with `gsd-`.
  2. For each found skill folder, read its `SKILL.md` (if present) and parse `<execution_context>` blocks to find references to global paths (starting with `~` or `$HOME`, or containing `.gemini/antigravity`).
  3. Copy the referenced workflow/reference files to local workspace subdirectories:
     - `.agents/skills/<skill-slug>/workflows/` or `.agents/skills/<skill-slug>/references/`
     - `.claude/skills/<skill-slug>/workflows/` or `.claude/skills/<skill-slug>/references/`
  4. Write the copied `SKILL.md` to `.agents/skills/<skill-slug>/SKILL.md` and `.claude/skills/<skill-slug>/SKILL.md` after rewriting the `<execution_context>` lines to use workspace-relative paths:
     - `@.agents/skills/<skill-slug>/workflows/<filename>` for `.agents/`
     - `@.claude/skills/<skill-slug>/workflows/<filename>` for `.claude/`
  5. Log warnings instead of throwing/crashing if global source files or folders are missing, to guarantee robustness.
  6. Follow brownfield preservation rules: if local destination files or folders already exist, skip them.
- Extend `handleInit()` to safely write or append `## Subagent & Parallel Execution Guidelines` to `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`. If the files already exist, check if the section heading exists, and append the guidelines block to the end of the file if missing.

### Automated Tests

#### [MODIFY] [test-cli.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-cli.js)
- Add a new integration/unit test suite that simulates dynamic skill localization and subagent guidelines generation:
  - Create a temporary simulated home directory containing a mock GSD skill folder, a `SKILL.md` file with global `<execution_context>` references, and mock global workflow/reference files.
  - Run the `init` logic with the mocked environment.
  - Assert that files are copied, rewritten with relative workspace paths, and subagent guidelines are appended to `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`.
  - Clean up mock directories and files.

---

## Verification Plan

### Automated Tests
- Run the full validation suite:
  ```bash
  npm test
  ```
- Specifically run CLI integration tests:
  ```bash
  npm run test:cli
  ```

### Manual Verification
- Run `node bin/adp.js init` in the local workspace.
- Check that the GSD skills are successfully localized in `.agents/skills/` and `.claude/skills/` with rewritten relative context paths.
- Check that `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md` have the subagent guidelines appended.
