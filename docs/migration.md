# Migration Guide for Target Projects

Audience: teams whose repos already run an older snail-agent-flow (SAF)
version (`0.3.x` / `0.4.0.0`). This guide is the safe path to any newer
release. Governing rules live in
[compatibility-policy.md](compatibility-policy.md).

## TL;DR

Upgrading SAF never deletes or rewrites your `.ai/` state, memory, sessions,
or specs. New gates arrive **opt-in or report-only first**. If anything looks
wrong after upgrade, your old state is intact — see Rollback.

## 1. Pre-Upgrade Checklist

Run inside the target project:

```bash
git status                 # 1. clean tree — commit or stash everything
node bin/adp.js doctor     # 2. must pass (or only warn) BEFORE upgrading
node bin/adp.js status     # 3. note active feature + stage
```

If a flow is mid-stage (`status` shows stage != settle), finish the stage or
run `saf handoff` first so a context handoff artifact exists. Do not upgrade
in the middle of an `act` stage.

Recommended: commit a checkpoint tag so rollback is one command:

```bash
git add -A && git commit -m "chore: pre-saf-upgrade checkpoint" && git tag pre-saf-upgrade
```

## 2. Upgrade Steps

### Installed from tarball / npm (recommended path)

```bash
npm install --save-dev ./snail-agent-flow-<new-version>.tgz   # or git+url
npx saf init        # idempotent: only fills gaps, never overwrites
npx saf doctor      # read the report — warnings list every migration needed
```

**AI-assisted path:** if your project was initialized by a SAF version that
ships the `saf-upgrade` skill, you can ask your AI coding agent to "upgrade
SAF" after the `npm install` step. The skill runs the same commands above,
then interprets each doctor warning against your project's customizations
and asks for confirmation before any destructive step. The skill is
version-agnostic — it always defers to the freshly installed CLI's output.

`saf init` on an already-initialized project:
- creates only missing directories/files,
- skips (and reports) every pre-existing file,
- never touches CLAUDE.md / AGENTS.md / GEMINI.md content you customized.

### Vendored / copied checkout

Replace `bin/`, `lib/`, `validators/`, `.specify/templates/`,
`.claude/skills/atlas-*` from the new release. **Do not** copy the release's
`.ai/` or `specs/` over yours — those directories belong to your project.

## 3. Post-Upgrade Verification

```bash
npx saf doctor                              # expect: pass, or actionable warnings only
node validators/scripts/validate-spec.js    # spec gate still green
npx saf status                              # same feature/stage as step 1.3
```

If validate-spec now fails on a spec that previously passed, that is a policy
violation — file an issue; do not rewrite your spec to appease the gate.

## 4. Known Legacy Artifacts (what doctor warnings mean)

| Doctor warning about | What to do |
|---|---|
| `.ai/state/flow-ledger.json` exists | Superseded by `flow-state.json` v2.0. If `flow-state.json` exists and `status` is correct: rename ledger to `flow-ledger.json.legacy.bak`. If only the ledger exists: run the printed one-shot migration, verify with `saf status`, then archive the ledger. |
| `.ai/specs/` exists | Move feature folders to `specs/<slug>/`, update `.specify/feature.json`, re-run `validate-spec`. |
| `.specify/current` exists | Replace with `.specify/feature.json` (doctor prints the JSON shape). |
| Node version < 20 | Upgrade Node; SAF declares `engines: node >=20` (advisory, but new releases are only tested on 20+). |
| state file has older `schema_version` | No action required — runtime reads old schemas. It will be upgraded (with a `.pre-<version>.bak` backup) the next time SAF writes it. |
| `skills.version.current` warning (localized skills stale or version unknown) | `saf init` never overwrites, so skill copies in `.claude/skills/` / `.agents/skills/` do not refresh on upgrade. Remove the SAF-owned skill folders (`.claude/skills/atlas-*`, `.claude/skills/saf-upgrade`, `.claude/skills/contracts` and their `.agents/skills` twins), then re-run `saf init`. Fresh copies are written and `.ai/state/skills-version.json` is re-stamped. Folders SAF does not own are never part of this step. |

## 5. Adopting New (Opt-In) Capabilities

After upgrading, nothing behaves differently until you opt in:

| Capability | How to enable | Default after upgrade |
|---|---|---|
| Context-budget enforcement | `"enforce": true` in `.ai/state/context-policy.json` | off (report-only) |
| Goal-backward verification | new features created by new `saf feature`, or set `verification_mode: "goal-backward"` in flow-state | report-only on old flows |
| Hooks enforcement | `saf hooks install` (explicit; `saf hooks uninstall` to revert) | not installed |
| Typed memory (gotchas/patterns) | files appear on next `saf init`; old 5 memory files unchanged | coexists |
| Worktree-isolated claims | `saf claim --worktree` | off |

Enable one at a time; run your normal flow for a feature before enabling the
next.

## 6. Rollback

1. `git reset --hard pre-saf-upgrade` (the tag from step 1) — restores all
   project-owned artifacts.
2. `npm install --save-dev ./snail-agent-flow-<old-version>.tgz`.
3. Restore any `*.bak` files SAF created if you had let it migrate state:
   they sit next to the migrated file (`flow-state.json.pre-<version>.bak`).

Old SAF versions ignore unknown fields added by newer schemas, so a
downgraded runtime can read state written by a newer minor of the same major.

## 7. Troubleshooting

- **`saf init` reports "skipped" lines** — expected; that's the non-intrusive
  guarantee working.
- **validate-spec halts with a human-review packet** after 3 failures:
  fix the listed files, then `node validators/scripts/validate-spec.js resume`.
- **Windows**: use `scripts/saf-onboard.ps1`; all CLI commands are pure Node
  and shell-agnostic.
- Anything else: run `npx saf doctor` and attach its output to the issue.
