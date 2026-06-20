# Snail Agent Flow - Claude Code Rules

@AGENTS.md

<!-- snailb-skills:start -->
# Target Agent Bootstrap Policy

Auto-route by default. Users should not manually tag skills during normal work.
Agents infer intent and mode from the request, active artifact, repo state, and risk.
Broad actions like analysis, find, search, and research are operations, not manual skill triggers.

Route every non-trivial turn:
1. Detect mode/intent.
2. Choose the minimal correct tool or skill path.
3. Gather evidence.
4. Act or propose a plan according to the current agent mode.
5. Settle with verification and results.

Tool rules:
- Use Context7 MCP for current library, framework, SDK, API, CLI, and cloud-service docs.
- Use project-onboarding for first-time repo setup, architecture maps, commands, and constraints.
- Prefer `rg` and code-search for local repo discovery.
- Use context-mode for large outputs and derived analysis.
- Use scoped/tagged memory recall for cross-session continuity.

Skills are internal execution modules selected by the router, not user commands.
<!-- snailb-skills:end -->
