# Resource & Artifact Ownership Policy

To prevent race conditions, duplicate effort, and write conflicts in parallel agent environments, the system defines task claims and file leases.

## 1. Claims (Work Unit Ownership)

- **Target**: Task in `tasks.md` or active work unit.
- **Location**: `.ai/claims/<task-slug>.json`
- **Properties**: `owner`, `task`, `profile`, `scope` (list of target files), `start_time`, `status`.
- **Behavior**: An agent must claim a work unit slug before executing work. If the claim file is present and not stale (i.e. the PID is alive and TTL has not expired), the work is blocked for other agents.

## 2. Leases (Shared Artifact Locks)

- **Target**: Source-of-truth files (`CONTEXT.md`, specs, roadmaps, ADRs).
- **Location**: `.ai/locks/<file-path-sha256-hash>.json`
- **Properties**: `owner`, `target_file`, `purpose`, `acquired_time`, `stale_lock_cap_seconds`.
- **Invariants**:
  - Leases are advisory. Cooperative writers only — nothing at the filesystem level enforces them.
  - Short-lived: writers acquire the lease right before writing and release it immediately after completing the write.
  - If a lease is already held by another active process, the acquire fails with `LOCK_UNAVAILABLE`.

## 3. Stale Claims & Locks Cleanup

`adp doctor` scans for stale claims and locks. A claim or lock is considered stale if:
- The writing process PID is no longer running (dead PID).
- The lock elapsed duration exceeds its TTL (`stale_lock_cap_seconds`).

Stale locks are automatically stolen or overwritten by cooperative processes on subsequent acquire attempts, preventing deadlock.
