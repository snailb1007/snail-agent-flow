---
name: external-research
description: Route external research across context7, deepwiki, GitHub search/grep, github-mcp, and brave. Load on R-mode API, comparison, and best-practice turns.
---

# external-research

## Trigger
Load when:
- Mode is R (Research) — comparing libs, looking up APIs, scanning public examples, or mining GitHub best practices.
- The user asks "is X better than Y", "what's the current API for Z", "how do high-quality repos do W".
Do NOT load for local code questions (use code-search) or first-time repo onboarding (filesystem/gitnexus).

## Routing decision

| Kind of question | Tool | Why |
|---|---|---|
| Current API / docs / version migration | context7 | authoritative, dated, cheaper than guessing |
| How a specific public repo works (architecture, "how does repo X do Y") | deepwiki | repo-scoped Q&A; sharper than brave when the repo is known |
| Best-practice mining in public code | GitHub search / grep (Vercel) | compare implementations across mature repos |
| Repo quality signals: stars, recency, issues, releases, PRs | github-mcp | GitHub is source of truth for project health metadata |
| Broad context, non-API research, comparisons | brave | last resort; widest net |

Tie-break: context7 first when an API/lib is named; deepwiki when a specific public repo is the target; GitHub search/grep for implementation patterns; github-mcp for repo health metadata; brave only when unbounded.

Quality gate: sample multiple mature repos, prefer official/vendor or active projects, note framework/version fit, and separate common practice from recommended practice.

OUT-01: Tool calls expected to return >10KB MUST route through context-mode (`ctx_batch_execute` / `ctx_execute_file`). If context-mode is unavailable, refuse the call and ask the user to narrow it. Document any bypass inline.

## Few-shots

1. "Should we use ky or fetch for retries?" (R-mode)
   → context7 for APIs; GitHub search/grep for production retry patterns; compare. Do not grep internal repo (A3).

2. "How do high-quality repos structure stripe webhook handlers?" (R-mode)
   → GitHub search/grep across mature repos, then github-mcp for repo health. Brave only if GitHub gives no usable hits.

3. "What's the state of the art on rate-limit backoff in 2026?" (R-mode broad; A6)
   → brave. Do not gitnexus — no repo target exists for this question.

## Anti-patterns enforced
- A3: after context7 API docs, do not re-grep internal code for the same API unless repo usage is the question. Refusal: "A3 — external docs answered; internal grep adds no signal."
- A6: no gitnexus in R before a repo target exists. Refusal: "A6 — Research mode is bounded by libs/patterns, not repo structure."
- A12: deepwiki for a public-repo target; context7 for lib/API docs; don't brave first when either fits. Refusal: "A12 — known public repo → deepwiki; named lib/API → context7; brave is the wide net, not the first net."
- A10: no raw output >10KB. Refusal: "A10 — route through context-mode or narrow the call."
