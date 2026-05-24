# Decisions Log

- **2026-05-24 | D-01: Canonical Feature Specs Path**: All feature specifications, plans, and checklists reside under `specs/<feature-slug>/`. `.specify/` is reserved for Spec-Kit tooling, templates, and integration files.
- **2026-05-24 | D-03: Active Feature File**: `.ai/state/active-feature.json` is a narrow feature identity pointer.
- **2026-05-24 | D-03a: Run State File**: Mutable progress lives in `.ai/state/run-state.json`.
- **2026-05-24 | D-03b: Verified Artifacts**: `verified_artifacts` is validator-owned evidence, not executor self-attestation.
- **2026-05-24 | D-04: Gate Status Vocabulary**: Gates use `PASS`, `BLOCKED`, `NEEDS_HUMAN_REVIEW`, and judgment-only `WARN`.
- **2026-05-24 | D-13: Validation Loop Exhaustion**: After 3 failed retries for the same gate/scope, transition to `NEEDS_HUMAN_REVIEW` and write the human review packet.
