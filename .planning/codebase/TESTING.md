# Testing Patterns

**Analysis Date:** 2026-05-24

## Current Test Status

This repository currently contains planning/specification artifacts and local agent skills rather than application code. No test runner, package manifest, CI workflow, or application test files were detected.

Detected code files:
- `.agents/skills/brainstorming/scripts/helper.js`
- `.agents/skills/brainstorming/scripts/server.cjs`
- `.agents/skills/systematic-debugging/condition-based-waiting-example.ts`
- `.agents/skills/writing-skills/render-graphs.js`

Detected test files: Not detected.

## Test Framework

**Runner:**
- Not detected.
- Config: Not detected.

**Assertion Library:**
- Not detected.

**Run Commands:**
```bash
# No repository-level test command exists yet.
# Add one with the first application source tree.
```

## Verification Workflow

**Required Gate Pattern:**
- `.ai/constitution.md` requires validation for every material change: tests for code, reviewable checks for docs, and recorded results.
- `.ai/constitution.md` defines gate outcomes as `PASS`, `FAIL`, and `NEEDS_HUMAN_REVIEW`.
- `.ai/constitution.md` requires agents to stop with `NEEDS_HUMAN_REVIEW` after more than three validation failures in the same category.
- `.agents/skills/verification-before-completion/SKILL.md` requires evidence before completion claims.
- `.agents/skills/test-driven-development/SKILL.md` is available for implementation work and should be used before writing feature or bugfix code.
- `.agents/skills/systematic-debugging/SKILL.md` is available for bugs, test failures, and unexpected behavior.
- `.agents/skills/requesting-code-review/SKILL.md` and `.agents/skills/receiving-code-review/SKILL.md` define review workflows for major changes and review feedback.

**Documentation Verification:**
- For documentation-only changes, use reviewable checks: confirm the requested files exist, line counts are plausible, links/paths are correct, and content matches source artifacts.
- Record verification results in the relevant execution or memory artifact, such as `.ai/memory/verification-history.md` or `.ai/sessions/<session-id>/agent-execution.md`.

**Code Verification:**
- For scripts under `.agents/skills/`, run the smallest executable check available for the changed script.
- For shell hooks such as `.claude/hooks/check-gstack.sh`, verify executable behavior with a direct shell invocation where safe.
- For future application code, add automated tests in the same phase as the new behavior.

## Test File Organization

**Location:**
- Not established for application code.
- Skill-level validation material currently lives near the skill it validates, as in `.agents/skills/writing-skills/testing-skills-with-subagents.md`.

**Naming:**
- No repository test naming convention exists yet.
- When app code is added, use the idiom of the selected stack and document it here. Examples: `*.test.ts` for TypeScript unit tests, `*.spec.ts` for behavior specs, or framework-specific test directories.

**Structure:**
```text
# Current repository
.agents/skills/<skill-name>/        # Skill docs, examples, and occasional scripts
.ai/specs/                          # Spec placeholders
.ai/reviews/                        # Human review packets
.ai/memory/                         # Durable verification and risk memory

# To establish with first app code
<app-root>/
├── src/
└── tests/ or co-located *.test.*
```

## Test Structure

**Suite Organization:**
```typescript
// Establish this with the selected application stack.
describe('unit under test', () => {
  it('observable behavior', () => {
    // arrange
    // act
    // assert
  });
});
```

**Patterns:**
- Test observable behavior and accepted requirements from `.ai/specs/spec.md`, not implementation details.
- Keep each user story independently testable, matching the task guidance in `.gemini/.specify/templates/tasks-template.md`.
- Include validation steps in implementation plans and task lists, not only in final summaries.
- For async behavior, prefer condition-based waits over arbitrary sleeps, following `.agents/skills/systematic-debugging/condition-based-waiting-example.ts`.

## Mocking

**Framework:** Not detected.

**Patterns:**
```typescript
// No repository mocking framework exists yet.
// Prefer dependency boundaries that let tests pass fakes/stubs explicitly.
```

**What to Mock:**
- External APIs, network calls, clocks, file systems, process boundaries, and expensive integrations once app code exists.
- Third-party behavior whose contract is already covered by current documentation or contract tests.

**What NOT to Mock:**
- Core domain logic introduced by this project.
- Parsing, validation, and gate-state transitions unless the test is explicitly isolating an integration boundary.

## Fixtures and Factories

**Test Data:**
```typescript
// Not established.
// Prefer small factory helpers once domain models exist.
```

**Location:**
- Not established.
- Use co-located fixtures for narrow unit tests and shared `tests/fixtures/` only when multiple suites need the same data.

## Coverage

**Requirements:** None enforced.

**View Coverage:**
```bash
# No coverage command exists yet.
```

## Test Types

**Unit Tests:**
- Not present.
- Add unit tests for pure functions, parsers, validators, state transitions, and script helpers when those become application code.

**Integration Tests:**
- Not present.
- Add integration tests for workflow execution paths, file generation, command hooks, and external tool boundaries when those are implemented.

**E2E Tests:**
- Not present.
- If this repository grows a UI or CLI workflow, add E2E coverage around the primary spec-to-ship path defined in `docs/prd.md`.

## Common Patterns

**Async Testing:**
```typescript
// Prefer condition-based polling with bounded timeouts.
await waitForEvent(threadManager, threadId, 'TOOL_RESULT', 5000);
```

Evidence: `.agents/skills/systematic-debugging/condition-based-waiting-example.ts` demonstrates bounded polling and descriptive timeout errors.

**Error Testing:**
```typescript
// Validate explicit failure states and messages.
await expect(operation()).rejects.toThrow('Timeout waiting for');
```

Expected future coverage:
- `PASS`, `FAIL`, and `NEEDS_HUMAN_REVIEW` gate transitions from `.ai/constitution.md`.
- Stop behavior after repeated validation failures from `.ai/constitution.md`.
- CLI error exits and stderr output for scripts like `.agents/skills/writing-skills/render-graphs.js`.

## CI/CD Verification

**CI Pipeline:**
- Not detected. No `.github/workflows/` files exist.

**Recommended First CI Gate Once App Code Exists:**
```bash
# Example only; replace with actual stack commands.
<package-manager> lint
<package-manager> test
<package-manager> build
```

CI should run the same commands documented in the active implementation plan and should fail on lint, test, typecheck, or build errors.

## Known Gaps

- No application code is present to test.
- No package manager or project runtime is selected.
- No lint, format, typecheck, test, coverage, or build commands are configured.
- `.ai/specs/spec.md`, `.ai/specs/plan.md`, `.ai/specs/tasks.md`, `.ai/specs/validation-report.md`, `.ai/reviews/human-review.md`, and `.ai/memory/verification-history.md` are placeholder/empty files.
- No CI workflow exists under `.github/workflows/`.

## How To Add Tests Once App Code Exists

1. Select the test framework that matches the app stack introduced by the implementation plan.
2. Add the test runner, assertion library, lint/typecheck commands, and CI workflow in the same phase as the first app source tree.
3. Add tests for the first user-visible behavior before or alongside implementation.
4. Record exact commands in this file, the implementation plan, and verification history.
5. Keep tests independent by user story so each story can be implemented and verified separately.

---

*Testing analysis: 2026-05-24*
