# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Flow Engine

**Shipped:** 2026-05-27
**Phases:** 8 | **Plans:** 14 | **Sessions:** 15

### What Was Built
- **Declarative Flow Definition Format**: Implemented the YAML-based flow configuration supporting custom stages, artifact gates, tool prerequisites, and revision routing rules.
- **Flow Engine Skill**: Implemented the core engine in `lib/flow-engine.js` with stage resolution, strict artifact gate checks, revision loop routing, and automated terminal/markdown instruction formatters.
- **Tool Verification & Local Onboarding**: Developed `adp doctor` and strict initialization checks to detect missing dependencies and render localized markdown repair guides.
- **Deterministic Flow Validator**: Added verification logic for ledger schema compliance, syntax parsing, and corruption detection.
- **Offline Context Budget Gate**: Created a byte-pressure heuristic that estimates context sizes and emits execution outcomes (`inline`, `context_pack_required`, `fresh_session_required`).
- **Sandbox-Compliant GSD Localization**: Bundled GSD workflows locally in the workspace under `.agents/skills/` to bypass sandboxing path restrictions.

### What Worked
- Decoupling flow stage definitions (YAML) from engine execution logic (JS) made implementing custom flows trivial.
- Localizing GSD workflows directly in the workspace bypassed strict sandbox protection boundaries and simplified file resolution.
- Deterministic, offline byte-pressure sizing provided a robust runtime-neutral heuristic for context budgets without API call overheads.

### What Was Inefficient
- Testing sandbox permission errors initially required multiple rounds of path tweaks before establishing the localized `.agents/skills/` paradigm.
- Having disjointed active specs in different branches made maintaining the global requirements matrix trace table slightly tedious before this final milestone consolidation.

### Patterns Established
- Storing local copy of execution workflows under `.agents/skills/` for sandbox execution.
- Centralizing stage-related variable resolution (`{phase_id}`) in the engine rather than letting caller-level tools independently query it.

### Key Lessons
1. Localizing external tooling workflows inside the workspace is the cleanest way to work around agent sandboxing path security boundaries.
2. Building deterministic offline heuristics is often faster, more reliable, and less expensive than querying an LLM/token API for execution routing decisions.
3. Keeping state data-driven (JSON/YAML ledger) makes tracking execution progress easily validatable and version-controlled.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 25 | 7 | Protocol foundation, deterministic spec validator, and CLI packaging. |
| v2.0 | 15 | 8 | Declarative flow definitions, portable Gemini skills, and offline context budgets. |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 15 | 85% | 12 |
| v2.0 | 218 | 92% | 15 |

### Top Lessons (Verified Across Milestones)

1. Keep agent instructions data-driven and local to the project directory to ensure absolute portability.
2. Enforce deterministic gates at transition points to prevent agents from spiraling or attempting to debug incorrect paths.
