# Resource & Artifact Ownership Policy

To prevent race conditions, duplicate effort, and write conflicts between parallel agents on a single machine, the system defines task claims and file leases.

> **Scope — local advisory coordination only.** Claims and leases are *single-machine, single-session* advisory locks: liveness is detected via the local process id (`process.kill(pid, 0)`). They coordinate parallel subagents within one machine and one session. They do **not** coordinate across different developers, machines, or branches — a remote developer's PID is meaningless locally, so their lock is treated as stale and may be stolen. Do **not** commit `.ai/locks` / `.ai/claims` to share locks (it creates merge noise and still is not atomic); use git branches/PRs for cross-developer coordination.

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

Stale locks are automatically stolen or overwritten on subsequent acquire attempts within the same machine, using PID-based liveness detection so a dead process cannot block later work. This is best-effort local cleanup, not a distributed deadlock guarantee.
