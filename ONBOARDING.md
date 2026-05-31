# Onboarding Snail Agent Flow into a target project

This guide brings SAF into an **existing** project (long-lived, multi-developer, complex)
quickly and safely. Thanks to the non-intrusive `init`, your team's `CLAUDE.md` / `AGENTS.md` /
`GEMINI.md` are **never modified** — SAF guidance is written to `.ai/instructions/ATLAS.md` instead.

> Fast path: from your project root run the bootstrap script (does A→C and verifies the
> non-intrusive guarantee for you):
> ```bash
> bash node_modules/snail-agent-flow/scripts/saf-onboard.sh        # macOS/Linux/Git Bash
> pwsh node_modules/snail-agent-flow/scripts/saf-onboard.ps1       # Windows PowerShell
> ```

---

## A. Install (package is private — not on the npm registry)

**Tarball (recommended, reproducible).** In the snail-agent-flow repo:
```bash
npm pack            # produces snail-agent-flow-<version>.tgz
```
Copy the `.tgz` into the target project, then:
```bash
cd <TARGET_PROJECT>
npm install --save-dev ./snail-agent-flow-<version>.tgz
```
This exposes `npx saf` / `npx adp`.

**Or from git:** `npm install --save-dev git+https://<repo-url>.git`

**Prerequisite (required by this protocol):** gstack installed globally:
```bash
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

## B. Initialize — and see that it stayed safe
```bash
cd <TARGET_PROJECT>
git switch -c chore/saf-onboarding     # isolate the change for review
npx saf init
git status                              # exactly what SAF touched
git diff CLAUDE.md AGENTS.md GEMINI.md  # MUST be empty if those files pre-existed
```
If your instruction files pre-existed, `init` prints:
```
[init] Team instruction files already exist (CLAUDE.md, AGENTS.md).
[init] SAF guidance written to .ai/instructions/ATLAS.md — your files were left untouched.
```

## C. Verify solidly before trusting it
```bash
npx saf doctor     # strict checks PASS + active claims/locks/signals/handoff
npx saf status     # current feature / ATLAS stage
```
`doctor` exit 0 = valid scaffold. Exit 1 → read `.ai/state/repair-guide.md`, fix, re-run.

## D. Decide what to commit (this is what makes team onboarding solid)

One person runs `init`, commits the **static scaffold**, and everyone else just
`npm install` + `git pull` — nobody needs to re-run `init` (and re-running is idempotent
and non-intrusive anyway).

| Commit (shared) | Do NOT commit (already added to `.gitignore` by init) |
|---|---|
| `.claude/skills/`, `.agents/skills/` | `.ai/state/` (runtime; contains PIDs) |
| `.ai/instructions/ATLAS.md` | `.ai/locks/`, `.ai/claims/` |
| `.ai/flows/atlas-flow.yaml`, `.ai/constitution.md` | `.ai/sessions/`, `.ai/context-packs/`, `.ai/signals/` |
| `.claude/skills/contracts/artifact-map.json` | |

```bash
git add -A && git commit -m "chore: onboard Snail Agent Flow (non-intrusive)"
# open a PR so the team reviews the footprint before merging
```

## E. First real work loop (reach value fast)
```bash
npx saf feature "small, low-risk feature description"   # scaffolds specs/<slug>/{spec,plan,tasks}.md
npx saf validate-spec                                    # gate: spec must be valid to proceed
npx saf status                                           # watch the ATLAS stage
```
Pick a **small, low-blast-radius** task as the team's "hello world" so everyone sees the
align→trace→lay→act→settle loop run end to end before larger work is delegated.

## F. Guardrails for a legacy / multi-developer target (do not skip)

1. **Locks are single-machine** (PID-based). Do **not** commit `.ai/locks` to coordinate
   across people — it is not atomic cross-machine. Coordinate with branches/PRs as usual.
2. **Index the code before letting agents edit legacy.** Run `npx gitnexus analyze`
   (or Serena) on the target so agents understand magic numbers / coupling — SAF itself
   does not read your source.
3. **One source of truth for instructions.** Since SAF writes `.ai/instructions/ATLAS.md`
   separately, have the team add one line in their own `CLAUDE.md` pointing to it, so agents
   don't miss it. (Team-owned edit — SAF won't do this for you.)
