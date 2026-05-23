# Constitution

## Non-negotiables

- Do not rewrite blindly.
- Preserve existing behavior by default.
- Prefer the smallest safe change.
- Read existing code before writing specs.
- Do not implement unvalidated specs.
- Do not ship without verification.
- Do not ship without memory handoff.
- If spec validation fails 3 times, stop and require human review.
- If implementation fails because of architecture/library/spec mismatch, return to spec instead of patching blindly.

## Engineering Standards

- Strict type safety where applicable.
- Security by default.
- Test-backed implementation.
- Clear rollback or verification path for risky changes.
- Log decisions that affect architecture or behavior.