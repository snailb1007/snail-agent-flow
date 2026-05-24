# Memory Handoff Report

## Session
2026-05-25-008-flow-definition-format-built

## Promoted to project memory
- Declarative flow definitions are written in YAML and stored under `.ai/flows/` in the target project.
- A custom, zero-dependency YAML parser is implemented in `lib/yaml-parser.js` to parse YAML configurations in light runtimes.
- Prerequisite tool availability is checked using the `validatePrerequisites` function in `lib/tool-validator.js`, which checks skill folders in `.agents/skills/`, `.claude/skills/`, and `~/.gemini/config/skills/`, with PATH checks as a fallback.

## Architecture updated
- Created `lib/yaml-parser.js` for lightweight line-by-line configuration parsing.
- Created `lib/tool-validator.js` for checking prerequisite skills and commands.
- Configured `.specify/templates/rough-project-flow.yaml` to specify the 10-stage ledger.
- Configured `.specify/templates/custom-flow-example.yaml` as a reference for custom flows.

## Known risks updated
- Simple YAML parser: Anchors, aliases, or advanced nested YAML syntax are not supported. If a custom flow fails to parse, it must be simplified to basic indented lists and key-values.

## Verification promoted
- Added unit tests in `validators/scripts/test-flow-parser.js`.
- Linked tests to `npm test` script in `package.json`.
