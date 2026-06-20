<!-- Seeded by saf init. Update during Memory Handoff (Step 5.5). -->
# Patterns

_Reusable solutions and conventions proven in this codebase. Promote a pattern_
_only after it has been applied successfully at least once._
_Format: name, when to use, the approach, and an example file/module._

## Code Patterns

### Safe Gate Bypassing (opt-in check)
- **When to use**: Before running secondary validation gates (e.g., lease check, diff hygiene, budget limits) that developers may need to skip locally.
- **Approach**: Import `checkBypass(repoRoot, 'gate-id')` from `lib/session-bypass.js`. If it returns true (the gate is bypassed), log a warning (with expiration time and reason) instead of throwing an error or failing the check.
- **Example**: `lib/diff-hygiene.js` or `bin/adp.js`.


## Workflow Patterns

_None recorded yet._
