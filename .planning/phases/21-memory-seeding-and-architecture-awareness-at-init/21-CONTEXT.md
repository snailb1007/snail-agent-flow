# Phase 21: Memory Seeding and Architecture Awareness at Init - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

## Phase Boundary

Close the gap where `saf init` creates `.ai/memory/` directory but seeds no files — leaving agents without architecture context until the first Memory Handoff completes. This phase covers three deliverables:

1. **Init memory seeding** — `saf init` creates placeholder `.ai/memory/` files so agents always have readable memory artifacts from the start.
2. **Onboarding → memory integration** — After `project-onboarding` produces `ONBOARDING.md`, auto-extract the architecture section into `.ai/memory/current-architecture.md`.
3. **Memory templates** — Add standardized templates under `.specify/templates/` so Memory Handoff (Step 5.5) has consistent format guidance.

## Implementation Decisions

### Init Memory File Seeding
- `handleInit()` in `bin/adp.js` already seeds `.ai/constitution.md`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, flow state, and context-policy. Follow the same pattern: check if file exists → write default if missing.
- Seeded files: `project-summary.md`, `current-architecture.md`, `known-risks.md`, `decisions.md`, `verification-history.md` (matches the 5 files in `.ai/constitution.md` artifact contract, lines 120-124).
- Content should be minimal starter templates, not empty files — agents need parseable headings.

### Onboarding → Memory Bridge
- `project-onboarding` skill (`.claude/skills/project-onboarding/SKILL.md`) produces `ONBOARDING.md` with an "Architecture" section containing Mermaid diagrams and textual descriptions.
- After onboarding runs (detected by presence of `ONBOARDING.md` at repo root), a new `adp onboard-memory` command or a section in `saf init --post-onboard` can extract and promote the Architecture section into `.ai/memory/current-architecture.md`.
- This is a one-directional bridge: `ONBOARDING.md` (human-readable) → `.ai/memory/current-architecture.md` (agent-readable). The human-owned file is never modified.

### Memory Templates
- Add templates to `.specify/templates/` following the existing pattern (`constitution-template.md`, `atlas-flow.yaml`).
- Template files: `memory-project-summary-template.md`, `memory-current-architecture-template.md`, `memory-known-risks-template.md`, `memory-decisions-template.md`, `memory-verification-history-template.md`.
- Templates define section headings, placeholder text with guidance, and format expectations.

### Agent's Discretion
- Exact heading structure and placeholder text in memory templates
- Whether `adp onboard-memory` is a separate CLI command or integrated into existing commands
- Whether init-checks should validate memory file content (not just existence)
- Whether doctor should warn about stale/empty memory files

## Canonical References

### Init flow
- `bin/adp.js` — handleInit() function, template seeding patterns
- `lib/init-checks.js` — directory validation, expected paths

### Memory contract
- `.ai/constitution.md` — artifact contract listing memory files (lines 120-124)
- `docs/prd.md` — Memory Handoff rules (Step 5.5, lines 357-394)

### Onboarding
- `.claude/skills/project-onboarding/SKILL.md` — onboarding workflow
- `.claude/skills/project-onboarding/ONBOARDING-template.md` — template sections
- `ONBOARDING.md` — target project onboarding guide

### Templates
- `.specify/templates/` — existing template directory

### Tests
- `validators/scripts/test-target-project-bootstrap.js` — bootstrap smoke test
- `validators/scripts/test-init-checks.js` — init validation tests
- `validators/scripts/test-cli.js` — CLI command tests

## Specific Ideas

- Memory files seeded by init should include `<!-- Seeded by saf init. Update during Memory Handoff. -->` comment so agents know to update them.
- `current-architecture.md` template should include: Stack, Directory Structure, State Pointers, Data Flow, Key Components, and External Dependencies sections.
- The onboarding→memory bridge should be non-destructive: only populate `current-architecture.md` if it still contains the init-seeded placeholder content.

## Deferred Ideas

- Auto-updating `current-architecture.md` on every ATLAS settle stage (would require settle skill modifications — separate phase)
- Staleness detection for memory files (comparing last-modified dates against recent commits)
- Memory file versioning or diff tracking

---

*Phase: 21-memory-seeding-and-architecture-awareness-at-init*
*Context gathered: 2026-06-01 via manual analysis*
