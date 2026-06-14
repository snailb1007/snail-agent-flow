<!-- Seeded by saf compact-memory. The compaction subagent fills this in during the snail-trail (Vệt ốc sên) memory handoff. Remove this comment once authored. -->
# Memory Handoff — {{FEATURE_SLUG}}

> Compaction protocol: promote ONLY durable, verified, project-relevant facts. Do not copy
> session notes verbatim. Reference existing artifacts by path/link and record only the delta.
> Redact secrets, credentials, tokens, passwords, and personal data as `REDACTED`. Mark
> superseded facts. Flag anything ambiguous as NEEDS_HUMAN_REVIEW.

{{NEXT_SESSION_FOCUS_BLOCK}}

## Session Summary

<!-- Write this FIRST and in plain language — it is the part a human reads to catch up on the
     session in under a minute. No jargon, no file dumps. The three sections below are the
     machine-checked memory bookkeeping; this one is for the human in the loop. If the
     compaction pack names a next_session_focus, tailor this summary to that focus. -->

- **What we did:** _One or two sentences: the goal of this session and the outcome._
- **What changed:** _The user-visible or behavioral change, in plain terms (not a file list)._
- **Verified:** _Did it work? Name the check and the result, e.g. "npm test — all green"._
- **Open / next:** _Anything unfinished, risky, or needing a human decision. "Nothing" is a valid answer._

## Suggested Next Skills

<!-- Optional, non-gated guidance for the next agent. Delete this section if it adds no value.
     Prefer 1-4 concrete skills such as atlas-settle, gsd-verify-work, gsd-code-review,
     or saf-handoff, each with a one-line reason. -->

- _Skill name_ — _why it is the right next route._

## Promoted to project memory

_List the durable facts promoted and which `.ai/memory/` file each landed in
(project-summary.md / current-architecture.md / known-risks.md / decisions.md /
verification-history.md / patterns.md / gotchas.md). Cite existing specs, plans, tasks,
PRs, commits, diffs, or reviews by path/link instead of copying their contents._

## Architecture updated

_Record architecture or behavior decisions with date, reason, and affected files.
Note any compatibility hacks, TODOs, or risky areas preserved._

## Verification promoted

_Record verification evidence: commands run, results, and what they prove._
