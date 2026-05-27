# Milestones

## v2.0 (Shipped: 2026-05-27)

**Phases completed:** 8 phases (Phases 8-16), 14 plans, all complete and verified.

**Key accomplishments:**
- **Declarative Flow Definition Format**: Implemented the YAML-based flow configuration supporting custom stages, artifact gates, tool prerequisites, and revision routing rules.
- **Portable Flow Engine Gemini Skill (`project-flow`)**: Deployed an interactive chat-based flow skill for starting, resuming, or inspecting the 10-stage ledger.
- **Prerequisite Checker & Local Repair Guides**: Developed `adp doctor` and strict initialization checks to detect missing dependencies and render localized markdown repair guides.
- **Sandbox-Compliant GSD Localization**: Bundled GSD workflows locally in the workspace under `.agents/skills/` to bypass sandboxing path restrictions.
- **Deterministic Flow Validator**: Added verification logic for ledger schema compliance, syntax parsing, and corruption detection.
- **Offline Context Budget Gate**: Created a byte-pressure heuristic that estimates context sizes and emits execution outcomes (`inline`, `context_pack_required`, `fresh_session_required`).

---
