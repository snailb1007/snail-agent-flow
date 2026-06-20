# Codebase Structure

**Analysis Date:** 2026-06-20
**Status:** Refreshed; replaces stale mapper output that predated CLI/package implementation.

## Directory Layout

```text
snail-agent-flow/
├── bin/                         # CLI entry point (`adp` / `saf`)
├── lib/                         # deterministic runtime helpers
├── validators/scripts/          # validation and test scripts
├── scripts/                     # onboarding shell/PowerShell helpers
├── templates/                   # target-agent bootstrap templates
├── docs/                        # product, compatibility, routing, install docs
├── specs/                       # canonical feature specs/plans/tasks
├── .ai/                         # mutable orchestration state, memory, reviews, sessions
├── .specify/                    # Spec-Kit templates/scripts/workflows/feature pointer
├── .github/workflows/           # CI and release workflows
├── .claude/skills/              # Claude-local packaged skills
├── .agents/skills/              # AGENTS-compatible packaged skills
├── .planning/codebase/          # generated codebase maps (this directory)
├── package.json                 # npm metadata and scripts
├── package-lock.json            # npm lockfile
├── VERSION                      # SAF release version marker
├── AGENTS.md / CLAUDE.md / GEMINI.md
└── README.md / CONTEXT.md / ONBOARDING.md
```

## Key Entry Points

- `bin/adp.js`: command registry and CLI handlers for all 22 commands.
- `lib/init-checks.js`: doctor/init static checks and repair guidance.
- `validators/scripts/validate-spec.js`: deterministic pre-implementation spec gate.
- `docs/artifact-registry.md`: path ownership and CLI command parity reference.
- `docs/compatibility-policy.md`: semver, migration, and compatibility rules.
- `docs/improvement-plan.md`: Phase 0+ roadmap and corrected facts.

## Where To Change Things

- CLI command behavior: `bin/adp.js`, with tests in `validators/scripts/test-cli.js`.
- Runtime helpers: `lib/`, with matching `validators/scripts/test-*.js` coverage.
- Spec validation behavior: `validators/scripts/validate-spec.js` and validator tests.
- Release behavior: `.github/workflows/release.yml`, `VERSION`, `package.json`, `package-lock.json`.
- Documentation parity: `docs/prd.md`, `docs/artifact-registry.md`, `README.md`, `docs/installation.md`.
- Planning maps: `.planning/codebase/*.md` after architecture materially changes.

## Path Rules

- Prefer repository-relative links and paths.
- Do not introduce author-machine absolute links such as `file:///Volumes/D/...`.
- Treat `.ai/state/flow-state.json` as current active flow state; mention `flow-ledger.json` only for compatibility/migration.

---

*Structure analysis refreshed: 2026-06-20*
