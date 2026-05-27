# Memory Handoff Report

- **Feature:** 016-strict-initialization-checks-detailed
- **Date:** 2026-05-27

## Promoted to project memory
- **Strict Post-Initialization Gate (`adp init`)**: Runs local and offline verification gates immediately after scaffolding and localizing files, exiting with a non-zero exit code if any check fails.
- **Offline Prerequisite Tool Validation**: Checks prerequisite tools in `adp init` and `adp doctor` without network lookups by probing localized workspace-relative skill directories (`.agents/skills/`, `.claude/skills/`), home-directory skill folders (`~/.gemini/config/skills/`), or searching system PATH as a fallback.
- **Actionable Markdown Repair Guide**: Generates a detailed Markdown guide at `.ai/state/repair-guide.md` if any initialization check fails, outlining purpose, requirement reason, exact checked paths, install commands, home directory fallback instructions, and verification command. Automatically unlinked on successful check.
- **Unified Diagnostics via `adp doctor`**: Uses the exact same validation engine as `adp init` to check configuration, directories, and files, returning identical exit codes and diagnostic error reasons.
- **Execution Context Localization Path Verification**: Verifies that all execution-context paths inside localized `SKILL.md` files contain relative references, flagging global reference paths (like `~` or `.gemini/antigravity`) as failures.
- **Brownfield Preservation Safety**: Post-init checks respect existing configuration files (such as `flow-ledger.json` or `rough-project-flow.yaml`), flagging inconsistencies as warnings or failures without overwriting them.

## Architecture updated
- **`lib/init-checks.js` (new)**: Core validation engine containing `runStrictChecks`, `formatTerminal` for console diagnostics, and `formatMarkdownGuide` for generating the repair guide. Validates directories, flow YAML, ledger schema, tool requirements, localized skill relative paths, instructions guidelines, and feature pointers.
- **`lib/skill-md-parser.js` (new)**: Helper utility to extract execution-context blocks from `SKILL.md` files and detect suspicious global/home directory paths.
- **`lib/tool-validator.js` (modified)**: Enhanced `validatePrerequisites` to resolve skill slug commands and check system PATH. Added metadata in `INSTRUCTIONS_DB` for prerequisite tools (`gsd`, `superpowers`, `spec-kit`, `gstack`).
- **`bin/adp.js` (modified)**: Wired `runAndReport` checks into `handleInit` and `handleDoctor` handlers, localizes global GSD skills, generates default context policy configuration, and appends subagent/context guidelines to instructions files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`).

## Verification promoted
- **CLI Command Integration Tests (`validators/scripts/test-cli.js`)**: Updated to verify healthy greenfield setup exits 0, and setup failures (missing prerequisites, malformed config files) exit 1 with `.ai/state/repair-guide.md` generation.
- **Unit and Edge-Case Tests (`validators/scripts/test-init-checks.js`)**: Added 24 unit tests covering greenfield configurations, missing directories, malformed/missing YAML, invalid ledger schemas, missing prereqs, localized path flags/ignores, EACCES/ENOENT robustness, formatting constraints, and policy config warnings.
- **Verification Commands**:
  - `npm run test:cli` - Runs CLI integration tests.
  - `node validators/scripts/test-init-checks.js` - Runs unit tests for initialization checks.
  - `npm test` - Runs full validation suite.
