# Human Review Packet

## Feature
- Feature Slug: ${FEATURE_SLUG}
- Spec Path: ${SPEC_PATH}

## Status
- Current Phase: ${CURRENT_PHASE}
- Failed Gate: ${FAILED_GATE}
- Status: NEEDS_HUMAN_REVIEW

## Blocking Question
The system has paused after 3 consecutive validation failures. What is the blocking issue and recommended action?

## Recommended Answer
[Draft recommended resolution or options for the user]

## Options Considered
1. Retry with modified plan.
2. Defer this validation rule.
3. Accept current validation status manually.

## Affected Artifacts
- Run State: `.ai/state/run-state.json`
- Feature Specs: `${SPEC_PATH}spec.md`

## Resume Instructions
To resume pipeline execution, resolve the block, reset retries by running:
```bash
./.specify/scripts/bash/validate-pipeline-state.sh resume
```
