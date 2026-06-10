---
name: saf-upgrade
description: Orchestrate a safe snail-agent-flow (SAF) upgrade in a target project. AI decides, CLI executes — deterministic mechanics run through saf init/doctor; the agent only interprets doctor output and resolves project-specific conflicts.
---

# SAF Upgrade Conductor

This skill drives an in-place SAF upgrade inside a target project. It is
intentionally **thin and version-agnostic**: every version-specific fact
(which warnings exist, how to migrate them, which schemas changed) comes from
the **installed CLI at runtime** — never from this file. An older copy of this
skill remains correct because it always defers to the freshly installed
`saf doctor` / `saf init`.

Trigger this skill when the user asks to upgrade SAF, or when `saf doctor`
reports the installed package version differs from the localized skills
version (`skills.version.current` warning).

---

## Hard Rules (non-negotiable)

1. **AI decides, CLI executes.** Never hand-edit files under `.ai/state/`,
   `.ai/claims/`, `.ai/locks/`, or schema/state JSON. All migrations run
   through the exact commands `saf doctor` prints.
2. **Never invent a migration.** If doctor does not print a migration step
   for an artifact, do not touch that artifact.
3. **Never overwrite user-modified files.** `saf init` already guarantees
   this; do not work around skipped files manually.
4. **Destructive steps require explicit user confirmation** (deleting or
   renaming any existing file or folder, including refreshing skill folders).
5. **Refuse to upgrade mid-stage.** If `saf status` shows an active flow in
   the `act` stage, stop and ask the user to finish the stage or run
   `saf handoff` first.

## Protocol

### 1. Preflight (deterministic)

```bash
git status            # must be clean — otherwise stop and ask
npx saf doctor        # must pass or only warn BEFORE upgrading
npx saf status        # record active feature + stage for later comparison
```

Create a rollback checkpoint:

```bash
git add -A && git commit -m "chore: pre-saf-upgrade checkpoint" && git tag pre-saf-upgrade
```

### 2. Mechanical upgrade (CLI does the work)

The user (or you, with confirmation) installs the new package, then:

```bash
npx saf init          # idempotent: fills gaps, never overwrites, reports skips
npx saf doctor        # authoritative list of migrations for THIS project
```

Capture both outputs. Lines reported as "skipped" are the non-intrusive
guarantee working — they are not errors.

### 3. Interpretation (the part only the agent can do)

For each doctor WARNING:

- Map it to the project's actual state (customized CLAUDE.md/AGENTS.md,
  project-owned memory files, local `context-policy.json`, legacy artifacts).
- If doctor printed a migration command for it: propose it, get confirmation
  if destructive, run it verbatim.
- If the warning is `skills.version.current` (stale localized skills):
  with the user's confirmation, remove the SAF-owned skill folders doctor
  lists (and their `.agents/skills/` twins), then re-run `npx saf init` so
  fresh copies and a new version stamp are written. Never delete skill
  folders SAF does not own.
- If a warning has no printed migration and is not in
  `docs/migration.md` of the installed package, report it to the user
  instead of improvising.

### 4. Verify (deterministic)

```bash
npx saf doctor                              # expect: pass, or pre-existing warnings only
node validators/scripts/validate-spec.js    # spec gate still green (if a feature is active)
npx saf status                              # same feature/stage as preflight
```

If `validate-spec` fails on a spec that passed before the upgrade, that is a
compatibility-policy violation: stop, report, and offer rollback — do not
rewrite the spec to appease the gate.

### 5. Report + rollback path

Summarize: what was copied, what was skipped, which migrations ran, which
warnings remain by user choice. Always include the rollback recipe:

```bash
git reset --hard pre-saf-upgrade
npm install --save-dev <previous-saf-package>
```

plus any `*.bak` files the CLI created next to migrated state files.
