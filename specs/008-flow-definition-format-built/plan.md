# Implementation Plan: Flow Definition Format and Built-in Flow

**Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)

This plan details the technical steps to define the YAML-based flow schema, implement a zero-dependency YAML parser, create a tool validator, ship the default `rough-project-flow.yaml`, and verify correctness with tests.

## Proposed Changes

We will introduce two new core utilities in a new `lib/` directory: one for zero-dependency YAML parsing and one for verifying prerequisite tool availability. We will also ship the default flow and custom example templates, plus automated test cases.

---

### [Built-in Flow Templates]

#### [NEW] [rough-project-flow.yaml](file:///Volumes/D/snail-agent-flow/.specify/templates/rough-project-flow.yaml)
Create the default 10-stage flow definition YAML:
- Define stages with unique IDs, names, descriptions, skills, commands, required artifacts (with heading checks), and revision routing.
- Set prerequisites for GSD, Superpowers, Spec-Kit, and GStack.

#### [NEW] [custom-flow-example.yaml](file:///Volumes/D/snail-agent-flow/.specify/templates/custom-flow-example.yaml)
Create a custom flow definition example to document how users can add, remove, or reorder stages.

---

### [Core Logic Utilities]

#### [NEW] [yaml-parser.js](file:///Volumes/D/snail-agent-flow/lib/yaml-parser.js)
Implement a zero-dependency YAML parsing utility:
- Line-by-line parser handling indentations (spaces), key-value pairs, nested properties, and arrays.
- Gracefully handle single and multi-line strings.
- Throw detailed syntax errors with line numbers on parsing failure.

#### [NEW] [tool-validator.js](file:///Volumes/D/snail-agent-flow/lib/tool-validator.js)
Implement tool validation utility:
- Verify availability of prerequisite tools/skills.
- Scan `.agents/skills/`, `.claude/skills/`, and `~/.gemini/config/skills/` for matching folders.
- Fallback check using `command -v <cmd>` using `child_process.spawnSync`.

---

### [Verification and Testing]

#### [NEW] [test-flow-parser.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-flow-parser.js)
Add test cases for `yaml-parser.js` and `tool-validator.js`:
- Parse `rough-project-flow.yaml` and verify all fields match the spec.
- Test edge cases of YAML parsing (arrays, indentation mismatches, comments).
- Test mock tool check outputs (missing and available tools).

#### [MODIFY] [package.json](file:///Volumes/D/snail-agent-flow/package.json)
Update the `test` script to run our new test suite:
- Append `node validators/scripts/test-flow-parser.js` to the test run list.

---

## Verification Plan

### Automated Tests
- Run `node validators/scripts/test-flow-parser.js` to test the YAML parser and tool validator directly.
- Run `npm test` to verify the full suite passes, including all existing CLI and validator tests.
- Run `node validators/scripts/validate-spec.js` to verify that this feature spec directory is fully compliant and passes the validation gate.

### Manual Verification
- Manually run the YAML parser on the custom example and default flow to ensure there are no parser errors or unexpected structures.
