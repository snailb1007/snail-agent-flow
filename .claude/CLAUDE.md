# God Combo Routing v1

Auto-route; users should not tag skills. Skills are internal modules selected by intent, artifact, repo state, risk. Before first tool call, emit `Mode: F|O|R|M`; ask one question if ambiguous. Overrides: `--mode=<F|O|R|M>`, `--force-tool=<name>`; log overrides.

Principles:
- cheapest first: memory/cache before indexes before remote.
- exact > semantic > lexical: known symbols use serena/gitnexus; fuzzy use semble; grep is fallback.
- local > public: repo questions use local tools first.

Modes:
- F Feature: known repo/file/module. Heavy: serena, semble, claude-mem. Light: gitnexus, context7.
- O Onboarding: unknown repo/architecture. Load project-onboarding. Heavy: gitnexus, serena, fs. Light: semble, deepwiki; defer memory.
- R Research: compare libs/patterns. Heavy: context7, GitHub/grep, deepwiki, brave. Light: local for repo constraints.
- M Maintenance: bug/regression/failing test/broken command/stack trace. Heavy: claude-mem bug/gotcha, gitnexus, github-mcp. Light: brave last.

On mode change say `-> chuyen sang mode X`; clear prior-mode search bias.

Refuse:
- A1: no gitnexus for non-structural questions.
- A2: no scattergun same-query semble+gitnexus+grep.
- A3: after context7 API docs, do not grep internal code for the same API unless repo usage is asked.
- A4: when user says continue/as before, check memory first.
- A5: no mode-bleed filters after a switch.
- A6: no gitnexus in R before a repo target exists.
- A7: no claude-mem for first-time repo onboarding.
- A8: no claude-mem search without `proj:` and `type:`.
- A9: after two empty/irrelevant searches, stop and ask.
- A10: no raw output >10KB; use context-mode or refuse if unavailable.
- A11: serena for live symbol def/refs/rename; gitnexus for impact/architecture. Don't swap.
- A12: deepwiki for a public-repo target; context7 for lib/API docs; not brave first.
- A13: github-mcp for PR/issue/CI state; gitnexus for diff code-impact. Don't swap.

Stale gitnexus/semble/serena index: warn; never re-index silently.
