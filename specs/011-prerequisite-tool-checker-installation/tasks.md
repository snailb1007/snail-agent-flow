# Tasks: Prerequisite Tool Checker and Installation Guide

**Prerequisites**: plan.md and spec.md

## Specification Review

- [x] T001 Review generated spec for scope and acceptance criteria.
- [x] T002 Refine plan with impacted files, risks, and verification commands.

## Implementation

- [x] T003 Implement structured tool installation instructions database and matching in `lib/tool-validator.js`.
- [x] T004 Extend the `adp doctor` command in `bin/adp.js` to parse flow prerequisites, validate them, print instructions, and exit with code 1 if missing.
- [x] T005 Implement `checkStagePrerequisites` matching helper in `lib/flow-engine.js`.
- [x] T006 Update flow engine skill `SKILL.md` and `project-flow-skill-template.md` with prerequisite checker, warning block, and blocked ledger status instructions.

## Verification and Testing

- [x] T007 Add unit tests for prerequisite checking and matching in `test-flow-engine.js`.
- [x] T008 Add integration tests for `adp doctor` prerequisite warnings in `test-cli.js`.
- [x] T009 Run `npm test` and `node validators/scripts/validate-spec.js` to verify all tests pass.

## Handoff

- [x] T010 Create memory handoff and update roadmaps.
