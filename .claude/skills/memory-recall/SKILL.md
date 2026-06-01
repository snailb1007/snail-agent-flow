---
name: memory-recall
description: Use claude-mem correctly — tag taxonomy, per-mode filters, proj: auto-detect, and the two-store memory hierarchy. Load when the turn needs cross-session memory or hits a resumption signal.
---

# memory-recall

## Trigger
Load when:
- The turn needs prior decisions, patterns, bugs, gotchas, or todos across sessions.
- The user says "continue", "as before", "where did we leave off", or similar (A4).
Do NOT load for first-time repo onboarding (A7) or session-only scratch state.

## Tag taxonomy
Mandatory on every claude-mem write and search:
- `proj:<repo>` — auto-detect from `git rev-parse --show-toplevel` basename; fallback to cwd basename (MEM-05).
- `type:<one of: decision | bug | pattern | api | gotcha | todo>` (MEM-01).

Examples by type:
- decision: `proj:snailb-skills type:decision "mem owns intent, ctx-mode owns session"`
- bug: `proj:foo type:bug "auth cookie cleared on 401"`
- pattern: `proj:foo type:pattern "retry with exponential backoff + jitter"`
- api: `proj:foo type:api "stripe webhook signature header v2"`
- gotcha: `proj:foo type:gotcha "psql LISTEN drops on conn pool recycle"`
- todo: `proj:foo type:todo "extract retry into shared util"`

Recommended: `mode:<F|O|R|M>`, `lib:<name>`, `severity:<low|med|high>`. Example: `mode:M severity:high proj:foo type:bug "off-by-one"`; `lib:ky proj:foo type:pattern "retry hooks"`.

Unfiltered search refusal (MEM-02, A8): "A8 — claude-mem search requires `proj:` and `type:`."

## Per-mode filter strategy (PRD §5.3)

| Mode | Filter |
|---|---|
| F | `proj:<auto> type:(decision\|pattern\|gotcha)` |
| O | `proj:<auto> type:(decision\|pattern)` |
| R | cross-project by `lib:<name>` (no `proj:` lock) |
| M | `proj:<auto> type:(bug\|gotcha)` |

## Memory hierarchy
`claude-mem` owns cross-session intent — decisions, patterns, bugs, gotchas (weeks/months). `context-mode` owns current-session state — in-flight outputs, scratch, ephemeral observations.

Conflict resolution (MEM-04): mem wins for decisions/patterns/gotchas; ctx-mode wins for live session facts.

Lookup order on resumption signals ("continue", "as before"):
- same-session resume (ctx-mode has session state for this project): ctx-mode first; fall back to claude-mem.
- cross-session resume (no ctx-mode session state): claude-mem first with `proj:` + `type:(decision|pattern|todo)`; skip ctx-mode.

Probe ctx-mode session metadata once per turn to decide. A4 says memory first; this rule defines *which* memory.

## Anti-patterns enforced
- A4: on continue/as before, memory first per the lookup order above. Refusal: "A4 — memory first; do not search code before checking memory."
- A7: no claude-mem search for first-time repo onboarding. Refusal: "A7 — no prior memory for an unfamiliar repo; start with gitnexus/filesystem."
- A8: no claude-mem search without `proj:` and `type:`. Refusal above.
- A9: after two empty/irrelevant searches, stop and ask. Refusal: "A9 — two empties; reformulating a third time is drift."
