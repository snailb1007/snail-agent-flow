---
phase: 15-strict-initialization-checks-and-detailed-installation-guide
plan: 04
status: complete
completed: 2026-05-26
---

# Summary — Add CLI integration tests in validators/scripts/test-cli.js

## Findings verified

- Added four comprehensive CLI integration tests to `validators/scripts/test-cli.js` validating the strict initialization check gate behavior.
- Validated that under greenfield conditions, `adp init` succeeds and generates no `.ai/state/repair-guide.md` file.
- Validated that on a missing prerequisite, `adp init` fails with exit code 1, and the generated repair guide accurately lists the missing tool and its verify command.
- Validated that if a localized SKILL.md file contains a global path reference (such as `~/` or `$HOME`), `adp init` fails with exit code 1, writes a repair guide mentioning `category: localization`, and names the offending file.
- Validated that when a required instruction file is incomplete (missing the `## Subagent & Parallel Execution Guidelines` heading), `adp init` fails with exit code 1, does NOT report a missing tool (D-15-15), and the repair guide contains the exact literal `Local workflow files incomplete` (D-15-15 wording pin).

## Changes

- **`validators/scripts/test-cli.js`**
  - Added `'CLI Init Strict Gate Greenfield Happy Path'` integration test.
  - Added `'CLI Init Strict Gate Fails on Missing Prerequisite'` integration test.
  - Added `'CLI Init Strict Gate Fails on Broken Localized SKILL.md'` integration test.
  - Added `'CLI Init Strict Gate Reports Instruction Section Missing'` integration test.

## Verification

- Ran `npm run test:cli` which executed all 25 integration tests (21 existing + 4 new) successfully.
