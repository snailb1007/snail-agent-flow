# Human Review Packet

## Feature
- Feature Slug: 017-context-budget-gate
- Spec Path: specs/017-context-budget-gate/

## Status
- Current Phase: Complete
- Failed Gate: Spec-Validation
- Status: NEEDS_HUMAN_REVIEW

## Blocking Question
The system has paused after 3 consecutive validation failures.

### Failed Rule
Missing Required Heading

### Validator Output
```
spec.md is missing required headings: ## Acceptance Criteria, ## Test Strategy, ## Behavior-Preservation Rules
```

## Recommended Answer
Please review the failed rule "Missing Required Heading" and correct the spec files under specs/017-context-budget-gate/.

## Options Considered
1. Retry with modified plan.
2. Defer this validation rule.
3. Accept current validation status manually.

## Affected Artifacts
- Run State: `.ai/state/run-state.json`
- Feature Specs: `specs/017-context-budget-gate/spec.md`

## Resume Instructions
To resume pipeline execution, resolve the block, reset retries by running:
```bash
./.specify/scripts/bash/validate-pipeline-state.sh resume
```
