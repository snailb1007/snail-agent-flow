# Feature Specification: Ownership-Store Primitive (Atomic File Lock Foundation)

## Goal

Build a reusable record store at `lib/ownership-store.js` that provides atomic, race-proof, and crash-resilient file locking primitives on the local filesystem. This module serves as the core foundation for the Work Claiming Backend and Artifact Leasing Concurrency Guards.

## Non-Goals

- Implementing a distributed locking mechanism.
- Relying on external databases or network services.
- Providing a lock heartbeat daemon at this stage.

## Acceptance Criteria

- Exclusive lock acquisition uses `fs.openSync(path, 'wx')` to ensure atomicity.
- Crash-safe metadata writes use `fs.renameSync` from a unique temporary path to the target path.
- Lazy stale-steal identifies stale locks via empty/corrupt JSON, dead PID (using process.kill(pid, 0)), or exceeded stale_lock_cap_seconds.
- Race-proof stale-stealing renames stale locks to a unique trash path before claiming.
- Release throws OWNER_MISMATCH if the owner does not match, and returns false if the lock does not exist.
- list() returns active records, ignoring empty, corrupt, or stale lock files.
- lib/init-checks.js and bin/adp.js create `.ai/claims/` and `.ai/locks/` directories idempotently.
- adp doctor supports --check-locks and lists counts of active claims and locks.
- node validators/scripts/test-ownership-store.js exits 0.

## Test Strategy

- **Unit Testing**: Add focused unit tests in `validators/scripts/test-ownership-store.js` covering concurrency, stale-steal, trash-renaming, and listing.
- **CLI/Init Verification**: Run `node bin/adp.js doctor --check-locks` and verify it reports active counts correctly.
- **Run Tests**: Execute `npm test` to run the full verification suite.

## Behavior-Preservation Rules

- Keep existing CLI and engine code compatible.
- Ensure that the directory checks are executed gracefully and fail closed when directories cannot be created or accessed.
