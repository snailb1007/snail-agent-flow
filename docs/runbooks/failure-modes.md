# Failure Modes Runbook

This runbook defines concrete handling procedures for operational failures in the AI Delivery Pipeline.

The PRD owns policy and state transitions. This runbook owns what to do when a failure occurs.

## AskUserQuestion Unavailable

### Symptom

A skill or workflow requires an interactive question gate, but the current environment does not expose the expected interactive tool.

### Required behavior

1. Do not continue the gated review or workflow.
2. Switch to text-mode fallback.
3. Report `BLOCKED`.
4. Ask the user to answer the missing gate manually.
5. Wait for the user.

### Forbidden behavior

- Do not invent the user's answer.
- Do not replace the missing gate with hidden assumptions.
- Do not proceed with CEO review, engineering review, QA, or ship review.
- Do not write workflow artifacts that depend on the missing answer.

## Spec Drift

### Symptom

During execution or QA, implementation evidence shows that the approved spec is incomplete, incorrect, ambiguous, or conflicts with repository reality.

### Required behavior

1. Stop implementation.
2. Record drift evidence.
3. Return to Step 3: Spec-Kit.
4. Update the spec artifacts.
5. Re-run spec validation.

### Forbidden behavior

- Do not patch around an incorrect spec.
- Do not let execution redefine requirements silently.
- Do not approve ship until the spec and implementation agree.

## Local Implementation Bug

### Symptom

The spec is still valid, but implementation fails tests, breaks expected behavior, or has a local defect.

### Required behavior

1. Stay in Step 4.
2. Fix locally with the smallest safe diff.
3. Preserve the approved spec.
4. Re-run the relevant tests or verification.

### Forbidden behavior

- Do not rewrite the spec to justify a bug.
- Do not broaden scope while fixing the defect.

## Context Fragmentation

### Symptom

Important decisions, evidence, or current state are split across sessions, agents, or partial notes, and the next agent cannot reliably reconstruct the work.

### Required behavior

1. Stop before further planning, execution, QA, or ship.
2. Run handoff or restore.
3. Promote only durable, verified facts into project memory.
4. Mark ambiguous or conflicting facts as `NEEDS_HUMAN_REVIEW`.
5. Resume only after the current state is explicit.

### Forbidden behavior

- Do not rely on unstated chat context.
- Do not copy session notes blindly into durable memory.
- Do not ship with unresolved memory ambiguity.

## QA Release Blocker

### Symptom

QA finds a blocker that prevents release readiness.

### Required behavior

1. Classify the root cause.
2. Return to Step 4 for implementation bugs.
3. Return to Step 3 for spec drift or missing requirements.
4. Re-run validation and QA after the fix.

### Forbidden behavior

- Do not let the executor self-approve release readiness.
- Do not ship with unresolved blocker evidence.

## Repeated Validation Failure

### Symptom

The same spec file or validation category fails repeatedly.

### Required behavior

1. Follow the PRD validation-failure counter.
2. Stop after the configured retry limit.
3. Mark the task `NEEDS_HUMAN_REVIEW`.
4. Create a human review packet with failure evidence and decision options.

### Forbidden behavior

- Do not keep debating with self indefinitely.
- Do not make broad, speculative rewrites after repeated failure.
