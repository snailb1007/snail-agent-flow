---
name: code-search
description: Route local code lookups across serena, gitnexus, semble, and grep (Vercel). Load when an F-mode or O-mode turn needs to find code in this repo.
---

# code-search

## Trigger
Load when:
- Mode is F (Feature) or O (Onboarding) AND the turn needs to locate code in this repo.
- The user asks "where is X", "how does Y work", "what calls Z".
Do NOT load for R-mode (use external-research) or pure memory questions (use memory-recall).

## Routing decision

| Kind of question | Tool | Why |
|---|---|---|
| Live symbol def/refs/rename in the working tree | serena | LSP: exact, never stale; cheapest precise navigation/edit |
| Structure, impact/blast-radius, "what depends on X", cross-repo | gitnexus | indexed graph; architectural reach serena can't give |
| Fuzzy concept ("retry logic", "auth flow") | semble | semantic match across chunks; cheaper than scattergun |
| Text/string fallback (literal regex, error message) | grep (Vercel) | only when the above can't anchor |

Tie-break: precise single-symbol lookup/edit → serena; "what breaks / how is this wired across the repo" → gitnexus; fuzzy concept → semble; literal string → grep. Stop after one tool answers.

OUT-01: Tool calls expected to return >10KB MUST route through context-mode (`ctx_batch_execute` / `ctx_execute_file`). If context-mode is unavailable, refuse the call and ask the user to narrow it. Document any bypass inline.

## Few-shots

1. "Where do we handle Stripe webhook retries?" (PRD §5.3 F-mode)
   → likely a known symbol like `WebhookRetry` or `stripe_webhook_*`. gitnexus first; if no hit, semble "stripe webhook retry"; grep last.

2. "What calls `parseInvoice`?" (F-mode; A11)
   → precise references in the live tree → serena `find_referencing_symbols`. Escalate to gitnexus only for cross-repo/architectural blast-radius. Do not semble.

3. "Find the place that returns `ETIMEDOUT` from the proxy." (A2 + OUT-01)
   → literal error string. grep (Vercel) with the string. If grep returns >10KB, route through context-mode.

## Anti-patterns enforced
- A1: gitnexus is for structure, not opinions. Refusal: "A1 — gitnexus is for structure, not opinions."
- A11: serena for live symbol def/refs/rename; gitnexus for impact/architecture; don't swap. Refusal: "A11 — precise symbol nav is serena; architectural reach is gitnexus."
- A2: do not fire semble + gitnexus + grep on the same query. Refusal: "A2 — pick one tool, observe the result, then escalate."
- A3: after external API docs (context7), do not re-grep internal code for the same API unless repo usage is the question. Refusal: "A3 — external docs answered; internal grep adds no signal."
- A10: no raw output >10KB. Refusal: "A10 — route through context-mode or narrow the call."
