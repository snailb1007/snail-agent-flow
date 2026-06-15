---
name: repo-ops
description: Route GitHub platform operations across github-mcp and gitnexus. Load on M-mode (and some F-mode) turns that read or act on PRs, issues, CI/checks, comments, or releases.
---

# repo-ops

## Trigger
Load when:
- Mode is M (Maintenance) or F (Feature) AND the turn touches GitHub platform state — PRs, issues, review comments, CI/check runs, releases, labels.
- The user says "open/triage this issue", "what's failing in CI", "review PR #N", "comment on the PR", "what changed in this PR".
Do NOT load for local code lookups (use code-search) or library/web research (use external-research).

## Routing decision

| Kind of question | Tool | Why |
|---|---|---|
| GitHub platform state: PR/issue/comment bodies, CI/check status, labels, releases | github-mcp | live remote state; the platform is the source of truth |
| Code-impact of a PR/diff: what depends on the changed symbols, blast-radius, missing test coverage | gitnexus | structural graph reasons about reach; the platform can't |
| The diff's literal contents / patch text | github-mcp | fetch the diff from the platform, then hand symbols to gitnexus |

Tie-break: platform metadata or actions (read/post/label/merge) → github-mcp; "is this PR safe / what does it touch structurally" → gitnexus on the changed symbols. github-mcp gets the diff; gitnexus reasons about it. Stop after one tool answers the actual question.

OUT-01: Tool calls expected to return >10KB MUST route through context-mode (`ctx_batch_execute` / `ctx_execute_file`). If context-mode is unavailable, refuse the call and ask the user to narrow it. Document any bypass inline.

## Few-shots

1. "What's failing CI on PR #42?" (M-mode)
   → github-mcp: read the check runs / status for PR #42. Do not gitnexus — CI state is platform state, not code structure (A13).

2. "Is PR #42 safe to merge?" (M-mode; A13 split)
   → github-mcp to fetch the diff (changed files/symbols); then gitnexus impact query on those symbols for blast-radius and missing test coverage. Two tools, two distinct questions — not scattergun.

3. "Triage the oldest open bug and tell me where it lives in the code." (M-mode → F-mode)
   → github-mcp lists/reads the issue; then switch to code-search (serena/gitnexus) to locate the symbol. Don't make github-mcp answer code-location questions.

## Anti-patterns enforced
- A13: github-mcp for PR/issue/CI/comment state; gitnexus for diff code-impact; don't swap. Refusal: "A13 — platform state is github-mcp; code-impact of a diff is gitnexus."
- A2: do not fire github-mcp + gitnexus + grep on the same question. Refusal: "A2 — pick one tool for the actual question, observe, then escalate."
- A10: no raw output >10KB. Refusal: "A10 — route through context-mode or narrow the call."
