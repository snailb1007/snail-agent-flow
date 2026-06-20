---
name: project-onboarding
description: Guide onboarding for an unknown repo. Load in O-mode to map architecture, commands, conventions, risks, and diagrams into a human-readable ONBOARDING.md.
---

# project-onboarding

## Trigger
Load in O-mode: new repo, unclear architecture/setup, or "onboard this project", "map this repo", "how does this work".
Do NOT load for a known file/symbol task (code-search), library/API research (external-research), or an already-mapped repo unless memory says it's stale.

## Workflow

1. Snapshot state: `pwd`, `git status --short`, `rg --files`, README/docs, agent files, CI, spec/plan/tasks. Route listings >10KB through context-mode.
2. Fingerprint stack from manifests before source: `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `*.sln`; `next.config.*`/`vite.config.*`, Docker/CI. Code beats config.
3. Discover commands, run cheap checks: `--help`, lint/test scripts, dry-run validation. Ask before install, migrate, deploy, or external mutation.
4. Map architecture: apps/services, runtime boundaries, data stores, APIs/jobs, source/tests/generated. Trace one request entry->response.
5. One Mermaid sketch when it clarifies boundaries. If `pretty-mermaid` exists, render SVG + ASCII; else raw Mermaid. Don't install tools.
6. Capture commands, conventions, constraints, gotchas, "do not edit" zones from recent commits; if history is shallow/empty, note "git history unavailable" and skip.
7. Persist (the reader is a human): copy [ONBOARDING-template.md](ONBOARDING-template.md) to repo root as `ONBOARDING.md`, fill from evidence, drop sections that don't apply.

## Routing decision

| Question | Tool | Why |
|---|---|---|
| "What is this repo?" | filesystem + context-mode | cheap inventory |
| "How is this wired?" | gitnexus | architecture graph |
| "Where is X?" | serena or code-search | live symbol lookup |
| "Public-repo patterns?" | external-research | R-mode; don't mix |
| "Need visual map" | pretty-mermaid | Mermaid SVG/ASCII |
| "Last time?" | memory-recall | after first onboarding |

## Artifact: ONBOARDING.md

The file is the deliverable (token rules govern chat, not files). Keep it skimmable; link oversized listings, never dump. Provide a "Where to look" index: endpoint -> router/handler; UI -> components/pages; schema -> model/migration; test -> mirror source path.

## Output contract

Never paste the full map into chat. Reply with: `ONBOARDING.md` path, 3-line summary (stack / architecture / top risk), next task or blocker.

## Anti-patterns enforced
- A2: no scattergun fs+gitnexus+semble+grep on one question; pick one probe, observe, escalate.
- A7: no Codex-mem for first-time onboarding; local evidence first, memory follows anchors.
- A10: no raw output >10KB; route through context-mode or narrow the command.
- A11: serena = live symbol detail; gitnexus = architecture/impact; don't swap them.

## Memory Bridge

After `ONBOARDING.md`, suggest `saf onboard-memory` to promote architecture into `.ai/memory/current-architecture.md` (optional).
