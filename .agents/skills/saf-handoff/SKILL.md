---
name: saf-handoff
description: Compact this session's notes into durable .ai/memory/* and a verified .ai/state/handoff.md report (the "Vệt ốc sên" snail-trail compaction). Use at settle / session close. Intended to be run by a fast-model subagent, not the main agent.
---

# saf-handoff — Snail-Trail Memory Compaction

This skill executes the Memory Handoff Gate (Step 5.5 / D-10): it distills a working
session into durable project memory so the next session starts clean. It is the "Vệt ốc
sên" compaction step.

> **Run this on a fast/cheap model in a subagent or fresh session**, not in the expensive
> main session. The main agent prepares inputs with `saf compact-memory`, delegates to you,
> then verifies with `saf handoff`. If your runtime has no skill system, follow the steps
> below directly.

## Inputs

Read **only** the compaction pack the main agent prepared and the files it lists:

- `.ai/context-packs/compact-<feature>.json` — lists the session logs, review notes, and
  current `.ai/memory/*` to distill.
- If the pack includes `next_session_focus`, use it to tailor `## Session Summary` and
  `Open / next` toward the next session's likely work.
- Do not pull in the full conversation, the ledger, or unrelated specs.

## Protocol (9 mandatory rules)

1. Do **not** copy session notes verbatim.
2. Reference existing artifacts instead of duplicating them: for facts already present in
   `spec.md`, `plan.md`, `tasks.md`, PRs, commits, diffs, or review files, cite the path/link
   and record only the important delta.
3. Promote **only** durable, verified, project-relevant facts.
4. Mark superseded facts as superseded.
5. Preserve behavior notes, compatibility hacks, TODO/custom logic, and risky areas.
6. Record architecture/behavior decisions with **date, reason, and affected files**.
7. Record verification evidence (commands run, results).
8. Redact secrets and sensitive data. Never promote API keys, tokens, passwords, credentials,
   or personal data; write `REDACTED` plus the source path/category, not the value.
9. If a memory update is ambiguous, mark it `NEEDS_HUMAN_REVIEW` rather than guessing.

## Outputs (write only these)

- `.ai/memory/project-summary.md` — what the project is and its current state.
- `.ai/memory/current-architecture.md` — architecture + dated decisions.
- `.ai/memory/known-risks.md` — active risks and mitigations.
- `.ai/memory/decisions.md` — dated decisions that should survive the session.
- `.ai/memory/verification-history.md` — durable verification evidence.
- `.ai/memory/patterns.md` — proven reusable patterns.
- `.ai/memory/gotchas.md` — traps and non-obvious constraints.
- `.ai/state/handoff.md` — the handoff report. Lead with a human-facing
  `## Session Summary`. It may include an optional, non-gated `## Suggested Next Skills`
  section, then these three exact headers (the machine-checked memory bookkeeping):
  - `## Promoted to project memory`
  - `## Architecture updated`
  - `## Verification promoted`

  The report must also name the active feature slug. Do **not** modify any other
  `.ai/state/*` ledger files.

### Session Summary (write this first — it is for the human in the loop)

The three required headers are bookkeeping; the human reading this file wants a one-minute
recap, not a file dump. Open `handoff.md` with a `## Session Summary` in plain language:

- **What we did** — the session goal and outcome, one or two sentences.
- **What changed** — the behavioral/user-visible change, not a list of touched files.
- **Verified** — did it work? Name the check and result (e.g. `npm test — all green`).
- **Open / next** — anything unfinished, risky, or needing a human decision (`Nothing` is valid).

If the compaction pack includes `next_session_focus`, shape this section around what the next
agent needs for that focus. Still keep it short and avoid re-stating artifact contents.

Keep it jargon-free. This section is not part of the `saf handoff` gate, so never let it
crowd out or duplicate the three required sections below it.

### Suggested Next Skills (optional guidance)

Add `## Suggested Next Skills` when it would help the next agent route correctly. This is
human/agent guidance only; it is not part of the deterministic handoff gate.

Good entries are concrete and short, for example:

- `atlas-settle` — finish settle checks and release cleanup.
- `gsd-verify-work` — verify the delivered behavior against the feature goal.
- `gsd-code-review` — review changed source files before ship.
- `saf-handoff` — run another memory compaction after the next session.

Do not list every possible skill, and do not invent gate requirements.

## Done when

`node bin/adp.js handoff` (a.k.a. `saf handoff`) exits 0. The main agent runs this gate;
your job is to produce a handoff report that passes it.
