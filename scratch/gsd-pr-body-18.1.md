## Summary

**Phase 18.1: Ownership-store primitive (atomic file lock foundation)**
**Goal:** Build a reusable record store at `lib/ownership-store.js` providing race-proof `acquire`/`release`/`list` primitives on the local filesystem. Uses exclusive-create (`fs.openSync(path, 'wx')`) for atomicity and tmp-rename for crash-safety. Lazy stale-steal on acquire (PID-dead OR past `stale_lock_cap_seconds`, default 3600). No daemon, no heartbeat — short-lived locks only. Foundation that Phase 19 (claims) and Phase 20 (leases) both wrap as thin domain wrappers; building it once dedupes the atomic-write logic.
**Status:** Verified ✓

Completed the implementation of `lib/ownership-store.js` along with its integration into initialization checks, CLI commands (`adp init` and `adp doctor`), and full unit and integration tests.

## Changes

### Plan 18.1-01: Ownership Store Primitive
Build a reusable record store at `lib/ownership-store.js` that provides atomic, race-proof, and crash-resilient file locking primitives on the local filesystem.

**Key files:**
- `lib/ownership-store.js` (Created)
- `validators/scripts/test-ownership-store.js` (Created)
- `lib/init-checks.js` (Modified)
- `bin/adp.js` (Modified)
- `package.json` (Modified)

## Requirements Addressed

- **RAOS-02**: Work claiming backend & storage format foundation
- **RAOS-03**: Artifact leasing, TTL, heartbeat & concurrency guards foundation

## Verification

- [x] Automated verification: Passed unit tests (`node validators/scripts/test-ownership-store.js` and `npm test` exit 0).
- [x] Manual verification: Verified directory layout and `adp doctor` outputs.

## Key Decisions

- Decided to build `OwnershipStore` as a pure primitive using Node.js filesystem API with atomic guarantees (`fs.openSync` with `'wx'`) for exclusive create.
- Decided to use atomic `fs.renameSync` from unique temp paths to target paths for crash-resilient metadata writes.
- Decided to use `process.kill(pid, 0)` portable process checks and `stale_lock_cap_seconds` for lazy stale-steal health verification.
- Decided to rename stale lock files to unique trash paths using `fs.renameSync` to achieve race-proof stealing.
- Decided to integrate `.ai/claims` and `.ai/locks` directories into `adp init` and `doctor` commands.
