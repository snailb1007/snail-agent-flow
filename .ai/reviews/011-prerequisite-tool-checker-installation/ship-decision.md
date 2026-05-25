# Ship Decision

**Feature Slug:** 011-prerequisite-tool-checker-installation
**Date:** 2026-05-25
**Release Decision:** SHIP

## Verification Evidence

All deterministic validations and test suites pass successfully:
- `node validators/scripts/validate-spec.js` passes without warnings.
- `node validators/scripts/test-validator.js` (15/15) passes.
- `node validators/scripts/test-cli.js` (20/20) passes, successfully validating the `adp doctor` prerequisite warning block output, platform instructions, and exit code 1 handling.
- `node validators/scripts/test-flow-engine.js` (89/89) passes, successfully validating the `checkStagePrerequisites` matching helper under various case-insensitive and substring matching scenarios.
- Complete `npm test` suite runs and passes cleanly.

## Unresolved Risks

- **Timeout Risk:** Running verification commands could hang if command verification takes long. 
  *Mitigation:* The `validatePrerequisites` checks are extremely simple `command -v` commands or directory checks, which execute in less than 10ms.
- **Path Portability:** `~` is utilized in some default `rough-project-flow.yaml` fallback checks which could theoretically fail under shell environments without HOME defined.
  *Mitigation:* `validatePrerequisites` uses robust Node-based `os.homedir()` for skill checks, ensuring homedir checks succeed even if `~` shell expansion fails.

## Rollback Considerations

If any issues arise, the changes are fully self-contained and can be rolled back via git:
- Revert commits to restore `bin/adp.js`, `lib/flow-engine.js`, `lib/tool-validator.js`, and `validators/` to their pre-Phase 12 state.
- The `rough-project-flow.yaml` definition itself is untouched, meaning no schema changes are needed for rollback.

## Follow-up Issues

- Defer auto-installation scripts to future milestones (out of scope).
- Add interactive wizard for tool installation in v3 (deferred).
