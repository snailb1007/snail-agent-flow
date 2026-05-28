# Milestones

## v4.0 (Shipped: 2026-05-28)

**Phases completed:** 7 phases (Phases 18-23, including 18.1), 8 plans, all complete and verified.

**Key accomplishments:**
- **Risk-Adaptive Operating Profiles**: Implemented task risk evaluation based on 5 dimensions and dynamic profile selection (`FAST`, `STANDARD`, `FULL`, `BUGFIX`, `PROTOTYPE`).
- **Resource Claiming & File Leasing**: Built race-proof filesystem-based claims (`.ai/claims/`) and advisory locks (`.ai/locks/`) to guarantee safety in parallel agent work environments.
- **Switch Checkpoints & ADR Enforcement**: Implemented transition state checkpoints and validation constraints to ensure transient state is not committed to ADRs.
- **Observability Signals**: Deployed a decision-aligned signal logging subsystem in `.ai/signals/current-period.md` tracking durations, revisions, escalations, test pain, and review feedback.
- **Integrations & Failure Recovery**: Integrated RAOS checks into CLI subcommands (`adp score/claim/lease/checkpoint/signal`) and `adp doctor`.

---

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
