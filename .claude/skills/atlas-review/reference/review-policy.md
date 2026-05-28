# ATLAS Review Policy & Reference

This document defines the review checklists, formats, and escalation policies for Codex and Human reviews within the ATLAS loop. All reviews output to the canonical path `{{review.current}}` (resolving to `.ai/reviews/{run_id}/review.md`) and conform to the Gate Result Schema interface.

---

## 1. Codex Automated Review Checklist

Codex reviews are performed automatically by the Codex agent/model. Codex must verify the following items:

- **Schema Contracts Alignment**: Verify that all modified files adhere to the schema definitions in `.claude/skills/contracts/`.
- **Path Resolution Check**: Ensure no hardcoded paths are introduced. All path resolutions must go through `lib/artifact-paths.js`.
- **Regression Check**: Ensure tests have been run and are passing, and new functionality is covered by regression tests.
- **Trust Boundary Analysis**: Validate that no unauthorized script execution or unvalidated inputs cross the trust boundaries.

### Format
Codex reviews must be formatted with the following structure:
```markdown
# Codex Review Result
- **Status**: [PASS | FAIL | NEEDS_HUMAN_REVIEW]
- **Target Commit**: [commit-hash]

## Findings
1. ...
```

---

## 2. Human Peer Review Checklist

Human peer reviews are mandatory for `FULL` risk profile features. The human reviewer must check:

- **Design Intent Verification**: Verify that the implementation matches the design specified in the feature plan (`{{feature.plan}}`) and specification (`{{feature.spec}}`).
- **Edge Case Coverage**: Verify that critical failure modes (e.g. race conditions, crash-safety, timeout handling) are addressed and tested.
- **Security Check**: Check for dependency vulnerabilities, secret leakages, or path traversals.
- **Escalation Trigger**: If the implementation exposes unmitigated business risk, reject and escalate back to `align` or `trace` stages.

### Human Sign-off Format
The human reviewer appends their review results and signs off by appending to `{{review.current}}`:
```markdown
# Human Review Sign-Off
- **Reviewer**: @username
- **Date**: [YYYY-MM-DD]
- **Verdict**: [PASS | FAIL]

## Comments
...
```

---

## 3. Output Schema Integration

Every review must produce a gate result representation. The ATLAS engine parses the consolidated state of the review to determine whether the stage can be completed.

```json
{
  "stage_id": "settle",
  "status": "PASS",
  "blocking": [],
  "warnings": [],
  "artifacts_produced": [
    ".ai/reviews/{run_id}/review.md"
  ]
}
```

- **FAST**: No file is created.
- **STANDARD**: Automatically transitions on Codex `PASS`.
- **FULL**: Requires both Codex and Human Verdicts to be `PASS` before the unified status becomes `PASS`.
