# Phase 10: Flow Engine Skill — Challenge Notes

**Date:** 2026-05-25
**Phase:** 10-flow-engine-skill

We challenged the decisions from `10-CONTEXT.md` against the project's PRD, existing codebase, CONTEXT.md glossary, and runtime constraints:

---

## 1. Challenge: SKILL.md + Helper Library Architecture

- **Question:** Does a `lib/flow-engine.js` module create a confusing overlap with the SKILL.md? Agents read the SKILL.md but the "real" logic is in a JS file they don't execute — is this a documentation-code drift risk?
- **Analysis:** The existing pattern is established: `lib/yaml-parser.js` is a utility that `bin/adp.js` imports. Agents never call it directly. The SKILL.md stub (Phase 9) already tells agents to "read the flow definition and ledger manually." Phase 10 elevates this to structured instructions. The JS module exists for: (1) testing stage resolution logic deterministically, (2) future CLI integration (`adp flow status`), (3) serving as the canonical reference implementation. The SKILL.md mirrors the logic in prose.
- **Resolution:** Accepted. The SKILL.md and `lib/flow-engine.js` serve different consumers (agents vs. tests/CLI). As long as both are updated together, drift risk is manageable. The test suite validates that the module's logic matches what SKILL.md describes.

---

## 2. Challenge: Agent-Instructed Ledger Mutation vs. Data Integrity

- **Question:** If agents update `flow-ledger.json` directly, they could write malformed JSON, invalid stage statuses, or skip fields. Is there no guard against corruption?
- **Analysis:** PROJECT.md constraint says "The flow skill instructs agents, it does not spawn subprocesses." CONTEXT.md glossary separates "Orchestration State" (`.ai/`) from "Feature Spec Source of Truth" (`specs/`). The ledger is orchestration state — it tracks flow progress, not requirements. Phase 13 (FVALID-02) adds ledger corruption detection. Phase 11 (GATE-03) adds circuit breaker for gate failures. For Phase 10, the SKILL.md can specify the exact JSON patch format to minimize agent error.
- **Resolution:** Accepted with mitigation. The SKILL.md must include an exact example of the JSON update pattern, not abstract instructions. Agents see the before/after JSON snippet. Phase 13's flow validator catches corruption after the fact.

---

## 3. Challenge: Structured Block Output Format

- **Question:** The structured block uses `{phase_id}` and `{feature_slug}` template variables from the flow YAML. Who resolves these? The agent? The SKILL.md instructions?
- **Analysis:** The flow YAML uses `{phase_id}`, `{feature_slug}`, `{feature_dir}` as path templates. These are project-context-dependent values that only the agent knows (e.g., which phase number, which feature directory is active). The SKILL.md must tell agents to resolve these from `.specify/feature.json`, `.planning/STATE.md`, or the current conversation context.
- **Resolution:** Accepted. The SKILL.md will include a "Variable Resolution" section that maps each template variable to its source. This is a documentation responsibility, not a code change.

---

## 4. Challenge: Simple Reset vs. Lost Work

- **Question:** Resetting all stages between target and current to `needs_revision` could be aggressive. If stage 7 (vertical slicing) fails and routes to stage 3 (canonical spec), resetting stages 4-6 means the plan, critique, and revision loop results are all invalidated. Is that correct?
- **Analysis:** The flow is designed as a sequential pipeline where each stage builds on the previous. If the canonical spec changes (stage 3), the implementation plan (stage 4), plan critique (stage 5), and revision loop (stage 6) are all based on the old spec. Re-running them is the correct behavior — the whole point of revision routing is to prevent downstream artifacts from being stale.
- **Resolution:** Accepted. This is working as designed. The `revision_history` audit trail preserves the reason and timestamp so users can understand why stages were reset. The original artifacts remain on disk — only the ledger status changes.

---

## 5. Challenge: Basic Inline Gates — "Exists and Non-Empty" Is Weak

- **Question:** A file could exist and be non-empty but contain garbage (e.g., a single space, wrong headings, placeholder content). Basic gates don't catch this. Does this make ENGINE-03 compliance hollow?
- **Analysis:** ENGINE-03 says "validate required artifacts exist, update the ledger, and advance or block." The word "exist" is the operative requirement. Phase 11 (GATE-01) explicitly adds "non-empty content, required headings." The phase boundary is intentional: Phase 10 = flow orchestration with basic checks, Phase 11 = gate enforcement depth. The risk of a garbage file passing Phase 10 gates is real but bounded — the next stage will likely fail if upstream artifacts are invalid, triggering a revision loop.
- **Resolution:** Accepted. Phase 10 gates check existence and non-empty (> 0 bytes). Phase 11 adds content validation. This is the designed phase boundary.

---

## 6. Challenge: Glossary Alignment — "Flow Engine" Term

- **Question:** CONTEXT.md does not define "Flow Engine" or "Flow Engine Skill." Should it be added?
- **Analysis:** The term appears in the roadmap and requirements but not in the glossary. The glossary defines "Orchestration State" as `.ai/` and "GSD" as the execution layer. The Flow Engine Skill is a new concept that coordinates between GSD, Spec-Kit, and GStack — it's a meta-orchestrator.
- **Resolution:** Add "Flow Engine Skill" to CONTEXT.md glossary after Phase 10 implementation. For now, the term is defined in 10-CONTEXT.md and the roadmap.

---

## Conclusion

All decisions in `10-CONTEXT.md` are viable and consistent with the PRD, existing codebase patterns, CONTEXT.md glossary, and Phase 8/9 outputs. Two mitigations identified:

- Include exact JSON patch examples in SKILL.md for ledger mutation (Challenge #2).
- Add a "Variable Resolution" section to SKILL.md mapping template variables to sources (Challenge #3).

No blocking contradictions found. Ready to proceed to Stage 3 (Canonical spec).
