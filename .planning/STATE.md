---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: flow-engine
status: active
last_updated: "2026-05-26T11:00:37.803Z"
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 6
  completed_plans: 5
  percent: 88
---

# Project State

**Last updated:** 2026-05-26

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-26)

**Core value:** Make it obvious which AI engineering tool should run next, what artifact it should consume, and what validation must pass before work can continue.
**Current focus:** Phase 16: Context budget gate and subagent orchestration policy

## Current Status

Milestone v1.0 is complete (Phases 1-7). All 28 v1 requirements delivered.
Milestone v2.0 started. Phases 8-15 are complete and verified. Phase 16 (Context budget gate and subagent orchestration policy) is now active.

## Active Phase

**Phase 16: Context budget gate and subagent orchestration policy**

Goal: Add a deterministic context budget and orchestration policy layer so the flow engine can decide when work stays inline, when it must hand off to a fresh session, and when independent tasks should run as isolated subagents with minimal context packs instead of inheriting a large chat history.

Primary requirements:

- CTX-01
- CTX-02
- CTX-03
- CTX-04
- CTX-05

## Decisions

### v1.0 (Accepted)

- Use GSD recommended defaults because interactive questions are unavailable in this Codex mode.
- Use coarse roadmap granularity for the initial protocol foundation.
- Keep planning docs committed because planning artifacts are part of the product.
- Treat the current repo as brownfield documentation infrastructure, not as an empty greenfield project.

### v2.0 (New)

- Package flow as Gemini skill, not CLI command — users interact via agent chat mention.
- Copy flow definition to `.ai/flows/` on init — allows per-project customization.
- Ledger state in JSON at `.ai/state/flow-ledger.json`.
- Flow definitions are YAML data, not code.
- All 10 stages are mandatory in the built-in flow.
- Prerequisite tools (GSD, Superpowers, Spec-Kit, GStack) are validated, not installed.
- Platform-specific installation instructions (macOS brew/npm) are structured in a helper database.
- Halting and warning the user/agent is enforced inside the flow engine skill when tool prerequisites are missing.

## Verification Log

### v1.0 (Complete)

- Codebase map generated: 7 files, 1117 total lines.
- Requirements coverage: 28 v1 requirements, 28 mapped, 0 unmapped.
- Phases 1-7 execution verified.
- CLI tests, validator tests, pipeline tests all passing.

### v2.0 (Active)

- v2 requirements defined: 24 total, 6 categories (FLOW, INIT, ENGINE, GATE, WARN, FVALID).
- Roadmap phases 8-13 defined with success criteria.
- Phases 8-11: Completed and verified in PR #44.
- Phase 12: Prerequisite Tool Checker and Installation Guide completed and verified.

## Quick Tasks Completed

| Slug | Date | Description |
|---|---|---|
| `phase12-prereq-validator-fixes` | 2026-05-25 | Fix alias directory and spawnSync cwd bugs in tool-validator. |
| `update-readme-install-instructions` | 2026-05-25 | Add installation and CLI linking instructions to README.md. |
| `claude-code-project-flow-skill` | 2026-05-25 | Fix visibility of project-flow skill in Claude Code by copying/init to .claude/skills. |
| `260527-152-update-readme` | 2026-05-26 | Sync README with v0.4.0.0 — expanded `init` description, added `test:init-checks`, added `lib/` and `.ai/flows/` to project structure (commit c58dd92). |

## Next Action

Begin Phase 16 — plan context budget gates and subagent orchestration policies.

```bash
/gsd-plan-phase 16
```

## Accumulated Context

### Roadmap Evolution

- Phase 14 added: Improve AI for spawn subagent support
- Phase 15 added: Strict initialization checks and detailed installation guides for missing tools
- Phase 16 added: Context budget gate and subagent orchestration policy

---
*State updated: 2026-05-26*
