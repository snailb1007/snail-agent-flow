# Improve AI for Spawn Subagent Support

## Goal

Enable sandboxed AI agents to successfully load, parse, and execute global Get-Shit-Done (GSD) skills by dynamically copying and localizing GSD workflows and reference files into the local workspace under `.agents/skills/` and `.claude/skills/` during project initialization (`adp init`). Additionally, provide explicit guidelines in `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` that direct AI agents to spawn subagents in parallel to speed up execution of non-sequential tasks.

## Non-Goals

- Automatically downloading missing global skills from a remote server.
- Creating new global skills or executing code review/analyses outside the sandbox.
- Bypassing sandbox security restrictions by executing arbitrary commands outside the workspace.

## Acceptance Criteria

1. **SUB-01 (Workspace Localization)**: During project initialization (`adp init`), the CLI scans the user's home directory skill paths (e.g. `~/.gemini/config/skills/`) for installed GSD skills (`gsd-*`). It copies all referenced workflow and reference files (specifically from `<execution_context>` blocks in `SKILL.md`) to local workspace subdirectories (e.g. `.agents/skills/<skill-slug>/workflows/` and `.agents/skills/<skill-slug>/references/`).
2. **SUB-02 (Path Redirection)**: The copied local `SKILL.md` file paths are updated so that any lines starting with `@~` or referencing `.gemini/antigravity` within `<execution_context>` are rewritten to use workspace-relative paths (e.g., `@.agents/skills/<skill-slug>/workflows/...`).
3. **Claude Code Parity**: Localized skills and updated `SKILL.md` files are written to both `.agents/skills/` and `.claude/skills/` to support both runtimes.
4. **Brownfield Preservation**: If local skill folders or workflows already exist in the workspace, the initialization process skips them to protect custom local modifications, in accordance with the project's brownfield merge policy.
5. **SUB-03 (Subagent Guidelines)**: Default instruction files (`CLAUDE.md`, `AGENTS.md`, and `GEMINI.md`) generated or updated during `adp init` must contain a dedicated `## Subagent & Parallel Execution Guidelines` section directing the agent to spawn specialized subagents in parallel for independent task lists. If the instruction files already exist, the section is appended if missing.
6. **SUB-04 (Sandbox Simulation & Testing)**: Add automated tests to `validators/scripts/test-cli.js` (and the CLI/validator test suite) that mock a global skill registry and verify that `adp init` correctly copies the files, rewrites context paths to use local workspace relative references, and appends subagent guidelines without throwing sandbox/permission errors.

## Test Strategy

- **Unit/Integration Tests**:
  - Test global home directory skill discovery and path expansion (supporting `~`).
  - Test `<execution_context>` parsing and relative path rewrite logic.
  - Test instruction file modification to ensure guidelines are appended correctly and not duplicated.
- **CLI Sandbox Verification**:
  - Mock the home directory configuration path in test environments.
  - Run `adp init` inside a clean test directory and assert that `.agents/skills/` and `.claude/skills/` are fully populated with copied workflows, rewritten paths, and modified instruction files.
- Ensure the full test suite runs and passes via `npm test`.

## Behavior-Preservation Rules

- Existing behavior of `adp init` (scaffolding directories, copying constitution/flow definitions, setting up the flow ledger) must remain fully intact.
- Do not overwrite existing custom local files if they are already present (brownfield policy).
- Ensure forward slashes (`/`) are used in rewritten `SKILL.md` context paths to maintain runtime compatibility across platforms.

## User Scenarios

### Scenario 1: Initializing a project with installed GSD skills
A user has global skills `gsd-discuss-phase` and `gsd-execute-phase` installed at `~/.gemini/config/skills/`. The skill files reference global workflow files at `~/.gemini/antigravity/workflows/gsd-discuss-phase.md`.
The user runs `adp init` in a new workspace.
The command:
1. Copies the GSD skill directories to `.agents/skills/` and `.claude/skills/`.
2. Resolves the `<execution_context>` references inside those skills, copies `gsd-discuss-phase.md` into the workspace under `.agents/skills/gsd-discuss-phase/workflows/gsd-discuss-phase.md`.
3. Rewrites the path inside the local `SKILL.md` from `@~/.gemini/antigravity/workflows/gsd-discuss-phase.md` to `@.agents/skills/gsd-discuss-phase/workflows/gsd-discuss-phase.md`.
4. Appends subagent guidelines to the local `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`.

## Functional Requirements

- **FR-14-01**: Implement skill discovery by resolving global home config paths (e.g. `~/.gemini/config/skills/`).
- **FR-14-02**: Parse `SKILL.md` `<execution_context>` blocks to locate all absolute/home-relative references and copy them locally.
- **FR-14-03**: Rewrite `<execution_context>` references inside local `SKILL.md` files to point to their workspace-local equivalents.
- **FR-14-04**: Write copies and localizations to both `.agents/skills/` and `.claude/skills/`.
- **FR-14-05**: Implement helper to safely append `## Subagent & Parallel Execution Guidelines` to `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`.
- **FR-14-06**: Skip copying/overwriting if local destination files/folders exist (brownfield preservation).

## Assumptions

- The host environment running `adp init` has read access to the user's home directory.
- Workflows and references are referenced in `SKILL.md` under `<execution_context>` starting with `@`.
