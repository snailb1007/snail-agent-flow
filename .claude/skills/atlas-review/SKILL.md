---
name: atlas-review
description: "Enforce code review checklists and policies based on risk profile (FAST, STANDARD, FULL)"
---

<objective>
Govern the S2.5 Review step during the Settle stage of the ATLAS Loop. Differentiate review rituals across risk profiles and work modes, enforce specific checklists for Codex and Human reviews, and ensure review outcomes are canonically logged to {{review.current}} under the gate-result schema contract.
</objective>

<execution_context>
@.claude/skills/atlas-review/reference/review-policy.md
</execution_context>

<process>
Depending on the active flow risk profile, execute the appropriate review workflow:

### FAST Profile Review Policy
- **Checklist**: None.
- **Workflow**: Skip the S2 PR and S2.5 Review steps entirely. Move directly to S4 Close.
- **Outcome**: No review artifact is generated.

### STANDARD Profile Review Policy
- **Checklist**: Codex Automated Review.
- **Workflow**:
  1. Generate a pull request.
  2. Invoke Codex review using the instructions and checklists defined in `reference/review-policy.md`.
  3. Format the review results as a JSON structure adhering to `gate-result.schema.json`.
  4. Write the results to the canonical path `{{review.current}}`.
  5. The review status must be `PASS` for the engine to advance. If `FAIL`, the engine will block.

### FULL Profile Review Policy
- **Checklist**: Codex Review + Peer/Human Sign-off.
- **Workflow**:
  1. Generate a pull request.
  2. Invoke Codex review and log results to `{{review.current}}` staging.
  3. Conduct a Human Peer Review using the checklist defined in `reference/review-policy.md`.
  4. The Human reviewer must append their sign-off to `{{review.current}}`.
  5. The consolidated `status` in `{{review.current}}` must be explicitly marked as `PASS`. If `NEEDS_HUMAN_REVIEW` or `FAIL`, the engine is blocked.
</process>
