# Decisions Log

- **2026-05-24 | D-01: Canonical Feature Specs Path**: All feature specifications, plans, and checklists reside under `specs/<feature-slug>/`. `.specify/` is reserved for Spec-Kit tooling, templates, and integration files.
- **2026-05-24 | D-03: Active Feature File**: `.ai/state/active-feature.json` is a narrow feature identity pointer.
- **2026-05-24 | D-03a: Run State File**: Mutable progress lives in `.ai/state/run-state.json`.
- **2026-05-24 | D-03b: Verified Artifacts**: `verified_artifacts` is validator-owned evidence, not executor self-attestation.
- **2026-05-24 | D-04: Gate Status Vocabulary**: Gates use `PASS`, `BLOCKED`, `NEEDS_HUMAN_REVIEW`, and judgment-only `WARN`.
- **2026-05-24 | D-13: Validation Loop Exhaustion**: After 3 failed retries for the same gate/scope, transition to `NEEDS_HUMAN_REVIEW` and write the human review packet.
- **2026-05-24 | D-14: Spec-Kit Artifact Stack Ownership**: Spec-Kit owns `spec.md`, `plan.md`, and `tasks.md` under `specs/<feature-slug>/` as the canonical source of truth for features.
- **2026-05-24 | D-15: GSD Execution Layer**: GSD consumes Spec-Kit artifacts (`spec.md`, `plan.md`, `tasks.md`) for code execution. It must not generate or maintain competing `SPEC.md` or `PLAN.md` files.
- **2026-05-24 | D-16: Critique Gates**: GStack reviews (CEO/Eng Manager) act as the critique gates for product, architecture, design, and release readiness.
- **2026-05-24 | D-16a: Issue Projection**: GitHub issues are created as projections directly from tasks in `tasks.md` (e.g., via `speckit-taskstoissues`) and must not diverge from the canonical tasks list.

