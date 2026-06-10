# Backward Compatibility Policy

This document is the binding contract between snail-agent-flow (SAF) and every
target project that has installed it. **Every improvement on the roadmap
(see `.ai/reviews/oss-benchmark-assessment.md`) MUST comply with this policy
before it ships.** Spec authors must copy the relevant row from the
Per-Improvement Compatibility Matrix below into the feature's `plan.md`.

## 1. The Compatibility Contract

SAF promises target projects that, within a major version:

1. **Stable artifact paths.** Canonical paths (`specs/<slug>/{spec,plan,tasks}.md`,
   `.specify/feature.json`, `.ai/state/flow-state.json`, `.ai/memory/`,
   `.ai/sessions/`, `.ai/reviews/`, `.ai/claims/`, `.ai/locks/`, `.ai/signals/`)
   never move or change meaning. New artifacts may be added; existing ones are
   never repurposed.
2. **Additive-only schemas.** JSON state files (`flow-state.json`,
   `context-policy.json`, `feature.json`, claims/leases) may gain new optional
   fields. Existing fields are never removed or change type within a major.
   Every state file carries `schema_version`; readers MUST accept any older
   schema_version of the same major and apply defaults for missing fields.
3. **Non-intrusive writes.** `saf init` and `saf upgrade` never overwrite a file
   the user has modified. Re-running `init` on an initialized project is always
   safe (idempotent).
4. **No silent behavior changes.** New gates, validators, or enforcement
   (hooks, budget checks, lint) ship **opt-in first** (config flag or new
   command), become default in the next minor with a printed notice, and only
   become blocking after a deprecation window.
5. **CLI stability.** Existing commands, flags, and exit codes keep their
   meaning. New behavior arrives behind new flags/commands. `0 = pass`,
   `1 = fail` is permanent for `validate-spec`.
6. **Deterministic validation stays offline.** No improvement may make
   `validate-spec` require network access or an LLM.

## 2. Versioning & Deprecation Rules

- **Semver from the next release.** Current version `0.4.0.0` (4-part) is
  frozen as legacy; the next release is `0.5.0` and follows semver strictly.
  Release tags move from `v*.*.*.*` to `v*.*.*` (release.yml must accept both
  during transition).
- **Deprecation window: minimum one minor version.** Sequence:
  1. Minor N: feature/format marked deprecated — `saf doctor` warns, docs
     updated, old path still works.
  2. Minor N+1 (or later): old path removed, automatic migration provided.
- **Never delete user state.** Migrations rename legacy artifacts to
  `<name>.legacy-<version>.bak` instead of deleting; `saf doctor` lists
  leftover backups so users can clean up when confident.
- **CHANGELOG.md** must carry an `### Upgrade notes` section for every release
  that touches any artifact a target project owns.

## 3. Schema Migration Rules

1. Bump `schema_version` only for additive changes within a major
   (`2.0` → `2.1`). Breaking changes require a major bump and an automatic
   migrator.
2. **Read-old / write-new:** runtime code reads any same-major schema; it
   upgrades the file to the newest schema only when it would write anyway,
   and writes a one-line notice to stdout when it does.
3. Before any in-place state migration, copy the original to
   `<file>.pre-<new-version>.bak` in the same directory.
4. `saf doctor` reports the schema_version of every state file and whether a
   newer schema is available (never auto-migrates on `doctor`).

## 4. Legacy Artifact Registry

Known legacy artifacts and their disposition. `saf doctor` must detect each
and print the migration step — never migrate silently.

| Legacy artifact | Replaced by | Disposition |
|---|---|---|
| `.ai/state/flow-ledger.json` | `.ai/state/flow-state.json` (v2.0) | Detect → warn → offer one-shot migration; never read at runtime. `FlowLedger` class stays in `lib/` (deprecated, not deleted) until the next major. |
| `.ai/specs/` | `specs/<slug>/` | Already blocked by validate-spec path-drift check; doctor prints move instructions. |
| `.specify/current` | `.specify/feature.json` | Same as above. |
| 4-part version `0.4.0.0` | semver `0.5.0+` | Tarball installs keep working; `saf doctor` notes the legacy version string. |

## 5. Per-Improvement Compatibility Matrix

Compat strategy each roadmap item MUST implement. Risk = risk of breaking an
existing target project if shipped naively.

| Improvement | Risk | Required compat strategy |
|---|---|---|
| P0: remove dead Mac path, docs drift fixes | None | Doc-only; no action for old projects. |
| P0: `engines`/`.nvmrc` pin | Low | Advisory only — `engines` without `engine-strict` does not block install. Doctor warns on Node < 20. |
| P0: `--verbose` flag, richer validation errors | None | New flag; default output unchanged so log parsers keep working. |
| P0: flow-ledger / flow-state unification | Medium | Follow Legacy Artifact Registry row. Do NOT delete `FlowLedger` from `lib/` this major. |
| P1: `saf budget` + `saf pack` (017) | Medium | New commands = safe. Budget **enforcement at stage gates ships opt-in** (`context-policy.json: "enforce": false` default). Flip default in a later minor with doctor notice. Old context-policy files (no `enforce` key) behave exactly as today. |
| P1: goal-backward verification in settle | Medium | New check runs in **report-only mode** for existing flows (`flow-state.json` without `verification_mode` field). Blocking only when the flow was created by a new-version `saf feature` or user opts in. |
| P1: clarify/analyze gates | Medium | New optional pipeline steps; `validate-spec` default checks unchanged. Activated per-feature via spec front-matter, never retroactively on existing specs. |
| P1: hooks enforcement | High | Hooks are **installed only by explicit `saf hooks install`**, never by `init`/`upgrade` (a hook silently appearing in `.claude/settings.json` violates non-intrusive promise). Provide `saf hooks uninstall`. |
| P1: typed memory + `saf learn` | Medium | New memory types live in **new files** (`.ai/memory/gotchas.md`, `patterns.md`); the existing 5 memory files keep format. `onboard-memory` and `handoff` accept both old (untyped) and new layouts. |
| P1: brownfield `saf ingest` | Low | New command; writes only to `.ai/memory/` + new spec scaffolds. Never rewrites existing specs. |
| P2: plugin-format distribution | High | Tarball/npm install path **remains supported for the whole next major**; plugin is an additional channel. Artifact layout in target projects identical from both channels. |
| P2: `saf upgrade` command | High | Must implement Sections 2–4 of this policy: dry-run by default (`--apply` to execute), per-file backup, refuses to touch user-modified files, prints a migration report. |
| P2: worktree parallelism + wave scheduler | Medium | Worktrees opt-in per claim (`saf claim --worktree`). Default claim behavior unchanged. Ledger protection rules unchanged. |
| P2: `saf stats` / observability | Low | Reads existing `.ai/signals/*.jsonl`; old (sparse) signal data must render without errors. Signal record format is additive-only. |

## 6. Release Gate Checklist (per release)

- [ ] `npm test` green on Node 20 and 22, Windows + Linux/macOS.
- [ ] `test-target-project-bootstrap.js` passes on a fixture initialized by the
      **previous** released version (upgrade-in-place fixture).
- [ ] `saf doctor` on a previous-version fixture produces warnings, not errors.
- [ ] CHANGELOG has `### Upgrade notes`.
- [ ] Any new gate defaults to opt-in/report-only per Section 1.4.

See [migration.md](migration.md) for the user-facing upgrade guide.
