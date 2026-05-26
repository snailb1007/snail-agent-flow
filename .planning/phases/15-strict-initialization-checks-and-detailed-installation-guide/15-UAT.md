---
status: complete
phase: 15-strict-initialization-checks-and-detailed-installation-guide
source: 15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md, 15-04-SUMMARY.md, 15-05-SUMMARY.md
started: 2026-05-26T17:10:00Z
updated: 2026-05-26T17:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Verify tool-validator instructions database expansion
expected: The INSTRUCTIONS_DB records for the required tools (gsd, superpowers, spec-kit, and gstack) are extended to include the 8 new structured fields (purpose, whyRequired, detectionHint, checkedPaths, installCommands, workspaceFallback, homeFallback, verifyCommand) while fully preserving the backward-compatible description and instructions fields.
result: pass

### 2. Verify runStrictChecks engine validation checks
expected: The runStrictChecks engine in lib/init-checks.js validates 12 checks (directories, flow YAML exists/parse, ledger exists/schema, prerequisites, localized copy refs, localized global path detections, project flow, instruction subagent guidelines, constitution, and active feature pointer) and returns a structured report with correct pass/fail states, IDs, and category classifications.
result: pass

### 3. Verify bin/adp.js wiring, doctor command strict checks, and bypass
expected: Running adp doctor with failing checks outputs terminal errors, generates .ai/state/repair-guide.md, and exits with 1. Running with ADP_NO_STRICT=1 bypasses this gate. Running when checks pass cleanly unlinks the repair-guide.md file.
result: pass

### 4. Verify Repair Guide formatting and D-15-15 wording pin
expected: When instruction checks fail, formatMarkdownGuide in lib/init-checks.js generates the exact heading "Local workflow files incomplete" (D-15-15 wording pin) in the repair guide, and successfully formats tool guidance with purpose/installCommand details.
result: pass

### 5. Verify CLI integration and Unit Test coverage
expected: Running npm test executes the unit test suite and the CLI integration test suite, verifying all checks, terminal formatting, and gate constraints under clean, isolated tempdir fixtures.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
