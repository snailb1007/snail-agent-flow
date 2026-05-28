# Memory Handoff Report

**Feature:** 18.1-ownership-store-primitive-atomic-file-lock-foundation-for-cl

## Promoted to project memory
- Greenfield exclusive lock acquisition utilizes OS kernel-level atomic `fs.openSync(..., 'wx')` calls.
- Crash-safety guarantees writing JSON payloads to temp files and atomically renaming them via `fs.renameSync`.
- Path traversal prevention ensuring keys must strictly match `^[a-zA-Z0-9_-]+$`.
- Lazy stale-stealing logic when encountering dead process PIDs, expired TTL timestamps, or empty/corrupt lock files.
- Race-proof concurrent stale-stealing where losing the rename race is handled gracefully via automatic retries.
- Thread-safe active lock listing filtering out invalid, empty, corrupt, or stale lock files.

## Architecture updated
- Created new `lib/ownership-store.js` file with `OwnershipStore` class.
- Modified `lib/init-checks.js` to add `.ai/claims` and `.ai/locks` to required directories list.
- Modified `bin/adp.js` to add `.ai/claims` and `.ai/locks` to initialization directory list and update `handleDoctor` lock counts reporting.

## Verification promoted
- Created a comprehensive test suite at `validators/scripts/test-ownership-store.js`.
- Integrated OwnershipStore tests into the root test suite under `package.json`.
- Verified all unit and integration tests pass successfully.
