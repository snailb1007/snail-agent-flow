---
phase: 15-strict-initialization-checks-and-detailed-installation-guide
plan: 05
status: complete
completed: 2026-05-26
---

# Summary — Add unit tests in validators/scripts/test-init-checks.js and wire package.json

## Findings verified

- Implemented 20 direct unit tests for `lib/init-checks.js` covering every check ID and evidence/report schema validation.
- Verified that all tests run inside clean, isolated tempdir fixtures created via `fs.mkdtempSync` and automatically cleaned up in `finally` blocks.
- Validated that direct unit tests execute extremely fast (under 5 seconds) without any child process spawning overhead.
- Validated that the EACCES permission test correctly handles POSIX platforms, early-returns on Windows, and skips vacuously when running under root.
- Verified that `npm run test:init-checks` and `npm test` are fully integrated and pass without issue.

## Changes

- **`validators/scripts/test-init-checks.js` [NEW]**
  - Created a pure unit test harness (no external test library) containing 20 tests.
  - Covered `dirs.required`, `flow.yaml.exists`, `flow.yaml.parse`, `ledger.exists`, `ledger.schema`, `prereqs.<tool>`, `localization.copiedRefs`, `localization.localPaths`, `skill.projectFlow.exists`, `instructions.subagentSection`, `constitution.exists`, and `featurePointer.active`.
  - Added tests verifying regex behavior (ignoring literal `~` in prose), FS-error rescue logic (EACCES and ENOENT mid-scan), and terminal formatting rules (line length <= 120 chars).
- **`package.json`**
  - Added `"test:init-checks": "node validators/scripts/test-init-checks.js"` script.
  - Pre-pended `npm run test:init-checks` to the full `"test"` script.

## Verification

- Standalone: Ran `npm run test:init-checks` which executed and passed all 20 tests cleanly.
- Full Suite: Ran `npm test` which executed all 143 tests in the suite successfully.
