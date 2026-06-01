# Phase 21-03 Summary: Memory Seeding Validation & CLI Tests

## What Was Built

Plan 03 (Wave 2) adds comprehensive test coverage for the memory seeding infrastructure
built in Plans 01 and 02. This covers bootstrap smoke tests, doctor checks, init-checks
unit tests, CLI integration tests for `onboard-memory`, and onboarding documentation.

## Files Modified

| File | Change |
|------|--------|
| `validators/scripts/test-target-project-bootstrap.js` | Added 5 memory file paths to `expectedFiles`, content verification (seed marker + heading), idempotency check, brownfield memory file existence checks |
| `lib/init-checks.js` | Added 5 non-blocking (`required: false`) memory file existence checks in `runStrictChecks()` |
| `validators/scripts/test-init-checks.js` | Added tests 30–31: memory checks pass when files exist; memory checks fail as non-blocking warnings |
| `validators/scripts/test-cli.js` | Added tests 28–30: onboard-memory missing ONBOARDING.md, successful promotion, skip on manual edit |
| `ONBOARDING.md` | Added section C.5 documenting `saf onboard-memory` command |

## Task Completion

- [x] **Task 1**: Bootstrap smoke test — memory file paths, content verification, idempotency, brownfield
- [x] **Task 2**: init-checks.js — 5 non-blocking memory file existence checks
- [x] **Task 3**: test-init-checks.js — 2 new unit tests for memory checks
- [x] **Task 4**: test-cli.js — 3 new CLI integration tests for onboard-memory
- [x] **Task 5**: ONBOARDING.md — C.5 section for onboard-memory documentation

## Verification Results

**`npm test` — ALL PASSED**

| Suite | Result |
|-------|--------|
| Validators | 18/18 ✅ |
| Init checks | 32/32 ✅ |
| Pipeline simulation | ✅ |
| CLI tests | 32/32 ✅ |
| Bootstrap smoke test | ✅ |
| Flow parser | 9/9 ✅ |
| Flow engine | 123/123 ✅ |
| Context budget | 32/32 ✅ |
| OwnershipStore | 10/10 ✅ |
| Profile scorer | 28/28 ✅ |
| ClaimManager | 18/18 ✅ |
| LeaseManager | 9/9 ✅ |
| Checkpoint writer | 18/18 ✅ |
| Signal logger | 23/23 ✅ |

## Commit

```
53dd6e2 phase-21-03: add memory seeding validation, doctor checks, and onboard-memory CLI tests
```

5 files changed, 278 insertions(+), 1 deletion(-)
