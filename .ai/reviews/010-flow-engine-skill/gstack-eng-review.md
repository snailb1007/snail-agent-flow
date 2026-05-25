# GStack Engineering Manager Review — Phase 10: Flow Engine Skill

**Date:** 2026-05-25
**Reviewer:** Engineering/Architecture perspective
**Artifacts reviewed:** [spec.md](file:///Volumes/D/snail-agent-flow/specs/010-flow-engine-skill/spec.md), [plan.md](file:///Volumes/D/snail-agent-flow/specs/010-flow-engine-skill/plan.md), [10-CONTEXT.md](file:///Volumes/D/snail-agent-flow/.planning/phases/10-flow-engine-skill/10-CONTEXT.md)

## Architecture Assessment

| Area | Assessment | Notes |
|------|-----------|-------|
| Module design | ✅ Good | `lib/flow-engine.js` follows existing `lib/` patterns. Five focused functions with clear contracts. |
| Dependency chain | ✅ Clean | `flow-engine.js` → `yaml-parser.js` + `flow-ledger.js`. No circular dependencies. |
| Test coverage plan | ✅ Comprehensive | All 5 exported functions covered. Edge cases for revision routing identified. |
| SKILL.md structure | ✅ Well-organized | 10 sections covering all user scenarios. Variable resolution table is a good addition. |
| Backward compatibility | ✅ Safe | Replaces stub but preserves file paths and concepts. No breaking changes. |

## Findings

### Decision Issues
None found.

### Spec Issues
None found.

### Requirement Quality Issues
- **LOW**: FR-003 ("prioritize `needs_revision` over `pending`") is correct but should clarify: does this mean the *first* `needs_revision` in stage order, or the *most recent* revision? Stage order is correct (sequential pipeline), but worth being explicit.

### Plan Issues

- **MEDIUM**: `triggerRevision()` resets `completed_at` and `gate_result` but the plan doesn't mention resetting `artifacts` array. If a stage is revised, its previous artifact list is stale. Should `artifacts` be cleared to `[]` on revision reset?
  - **Recommendation:** Clear `artifacts` to `[]` when resetting a stage to `needs_revision`. The new run will repopulate them.

- **LOW**: `checkArtifacts()` needs to handle template variables in paths (e.g., `{feature_dir}/spec.md`). The plan says it "resolves template variables" but doesn't specify how. Should it accept a `variables` map parameter?
  - **Recommendation:** Add a `variables` parameter to `checkArtifacts()` that maps template names to resolved values. The SKILL.md tells agents how to determine these values.

- **LOW**: The plan doesn't mention whether `flow-engine.js` should validate ledger schema on load. A malformed ledger could cause subtle bugs in all functions.
  - **Recommendation:** Add a lightweight `validateLedger()` helper that checks for required fields before mutation. This is a defensive measure, not a full validator (that's Phase 13).

## Blocking Findings

None. The MEDIUM finding about `artifacts` reset is an implementation detail that should be addressed but doesn't block planning.

## Recommendation

**Ship with minor adjustments:**
1. Clear `artifacts` array when resetting stages in `triggerRevision()`.
2. Add `variables` parameter to `checkArtifacts()`.
3. Consider adding lightweight `validateLedger()` defensive check.
