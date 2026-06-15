---
name: project-onboarding
description: Guide onboarding for an unknown repo. Load in O-mode to map architecture, commands, conventions, risks, and diagrams into a human-readable ONBOARDING.md.
---

# project-onboarding

## Trigger
Load in O-mode: new repo, unclear architecture/setup, or "onboard this project", "map this repo", "how does this work".
Do NOT load for a known file/symbol task (code-search), library/API research (external-research), or an already-mapped repo unless memory says the map is stale.

## Workflow

1. Snapshot state: `pwd`, `git status --short`, `rg --files`, README/docs, agent files, CI, spec/plan/tasks. Route listings likely >10KB through context-mode.
2. Fingerprint stack from manifests + config before source: `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `*.sln`; `next.config.*`/`vite.config.*`, Docker/CI. Trust code over config when they disagree.
3. Discover commands, then run cheap checks: `--help`, lint/test scripts, dry-run validation. Ask before install, migrate, deploy, or external mutation.
4. Map architecture: apps/packages/services, runtime boundaries, data stores, APIs/jobs, source/tests/generated/fixtures. Trace one request entry->response.
5. One Mermaid sketch when it clarifies boundaries. If `pretty-mermaid` exists, render SVG (`github-dark`/`tokyo-night`) + ASCII; else embed raw Mermaid. Do not install render tools.
6. Capture commands, conventions, constraints, gotchas, "do not edit" zones. Read git conventions from recent branches/commits; if history is shallow/empty, note "git history unavailable" and skip.
7. Persist the artifact — the reader is a human: copy the skeleton in [ONBOARDING-template.md](ONBOARDING-template.md) to repo root as `ONBOARDING.md`, fill each section from evidence, drop sections that don't apply. Keep it skimmable; link oversized listings, never dump. Never leave the map in chat.

## Routing decision

| Question | Tool | Why |
|---|---|---|
| "What is this repo?" | filesystem + context-mode | cheap inventory |
| "How is this wired?" | gitnexus | architecture graph when indexed |
| "Where is X implemented?" | serena or code-search | live symbol lookup |
| "How do public repos do this?" | external-research | switch to R-mode; don't mix |
| "Need visual map" | pretty-mermaid if installed | Mermaid SVG/ASCII |
| "Last time?" | memory-recall | only after first onboarding |

## Artifact: ONBOARDING.md

The file is the deliverable (token rules govern chat, not files). Copy the skeleton in [ONBOARDING-template.md](ONBOARDING-template.md) to repo root as `ONBOARDING.md`, fill each section from evidence, drop sections that don't apply. Keep it skimmable; link oversized listings, never dump.
Provide a "Where to look" index: endpoint -> router/handler; UI -> components/pages; schema -> model/migration; test -> mirror source path.

## Output contract

Never paste the full map into chat. Reply with: `ONBOARDING.md` path, 3-line summary (stack / architecture / top risk), next task or blocker.

## Anti-patterns enforced
- A2: no scattergun fs+gitnexus+semble+grep on one question. "A2 - pick one probe, observe, escalate."
- A7: no Codex-mem for first-time onboarding. "A7 - local evidence first; memory follows anchors."
- A10: no raw output >10KB. "A10 - route through context-mode or narrow the command."
- A11: serena = live symbol detail; gitnexus = architecture/impact. "A11 - don't swap them."

## Memory Bridge

After generating `ONBOARDING.md`, suggest running `saf onboard-memory` to promote architecture info into `.ai/memory/current-architecture.md` for agent consumption. This is optional but recommended for SAF-enabled projects.
