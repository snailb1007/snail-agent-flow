# Memory Handoff Report

- **Feature:** 008-flow-definition-format-built
- **Date:** 2026-05-25

## Promoted to project memory
- **Declarative Flow Definition Schema**: Established a standard YAML structure for specifying execution flows. It includes metadata (`name`, `version`, `description`), `prerequisites` (skills or CLI tools), and `stages` (ordered execution steps containing ID, name, description, active skill/command, required artifacts with heading validations, and revision routing).
- **Zero-Dependency YAML Parsing**: Designed a lightweight line-by-line parsing protocol in pure JavaScript to process keys, values, indentation-based nestings, lists, comments, and multiline strings without third-party npm packages.
- **Prerequisite Validation Protocol**: Introduced a robust verification scheme that searches for required tools/skills across local `.agents/skills/`, `.claude/skills/`, and global `~/.gemini/config/skills/` directories, falling back to a `PATH` check (`command -v`) to ensure necessary capabilities exist prior to flow execution.
- **Built-in Rough Project Flow**: Codified the default 10-stage sequential engineering flow (`rough-project-flow.yaml`) as the standard protocol, mapping stages to corresponding skills like `gsd-discuss-phase`, `grill-with-docs`, `speckit-specify`, `speckit-plan`, `plan-ceo-review`, `speckit-tasks`, `speckit-taskstoissues`, `gsd-execute-phase`, `gsd-verify-work`, and `gsd-ship`.

## Architecture updated
- **`lib/yaml-parser.js`**: Created to export `parseYaml`, implementing indentation-sensitive parsing, scalar type coercion, multiline strings via `|`, and line-level syntax error reporting.
- **`lib/tool-validator.js`**: Created to export `validatePrerequisites`, `getToolInstructions`, and `INSTRUCTIONS_DB`. Handles authoritative checking commands, directory probes, and system PATH fallbacks for GSD, Superpowers, Spec-Kit, and GStack.
- **`.specify/templates/rough-project-flow.yaml`**: Created to define the canonical 10-stage workflow structure and required artifacts (such as context files, plans, tasks, review outcomes, and handoffs).
- **`.specify/templates/custom-flow-example.yaml`**: Created to demonstrate user-level workflow customization (adding, removing, or reordering stages).
- **`package.json`**: Modified the `test` script to append execution of the YAML parser and prerequisite validator unit test suites.

## Verification promoted
- **Unit Test Coverage (`validators/scripts/test-flow-parser.js`)**: Added tests asserting:
  - Complete structure and key values of the parsed `rough-project-flow.yaml` and `custom-flow-example.yaml` templates.
  - Scalar type handling (numbers, booleans, nulls) and list parsing.
  - Syntax error assertion on malformed input (missing colons).
  - Validation of prerequisite matching (slug derivation from command tokens instead of alias names).
  - Cwd-independent resolution of check commands relative to the repository root.
- **Execution commands**:
  - Run the parser/validator test suite: `node validators/scripts/test-flow-parser.js`
  - Run the full test pipeline: `npm test`
