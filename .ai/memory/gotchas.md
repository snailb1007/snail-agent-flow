<!-- Seeded by saf init. Update during Memory Handoff (Step 5.5). -->
# Gotchas

_Traps, surprises, and non-obvious constraints that cost time to discover._
_Promote a gotcha only after it has actually bitten work in this repo._
_Format: the trap, why it happens, and how to avoid or detect it._

## Environment & Tooling

### Bypass State Gitignore Leakage
- **The trap**: Local active bypass configuration stored in `.ai/state/session-bypass.json` leaking into git history.
- **Why it happens**: Untracked state files are added to git by default unless tracked in `.gitignore`.
- **How to avoid**: Call `ensureGitignored(repoRoot)` when initializing or writing bypasses.

## Code & Behavior

### Critical Gate Hard Lock
- **The trap**: Unintentionally permitting bypasses for spec-validation or security gates.
- **Why it happens**: Broad checks matching gate IDs can be bypassed if the list of bypassable gates is not strictly controlled.
- **How to avoid**: Forbidden gates are hardcoded (`FORBIDDEN_GATES`) and only explicitly allowed secondary gates (`BYPASSABLE_GATES`) are permitted.

