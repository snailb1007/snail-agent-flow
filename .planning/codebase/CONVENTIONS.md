# Coding Conventions

**Analysis Date:** 2026-06-20
**Status:** Refreshed for current Node.js CLI implementation.

## JavaScript Style

- Runtime: Node.js CommonJS.
- Use built-in modules before local imports (`fs`, `path`, `child_process`, then `../lib/...`).
- Prefer `const`; use `let` only for reassignment.
- Keep zero-dependency CLI/library code unless a phase explicitly approves adding dependencies.
- Existing code uses semicolons, single quotes, and 2-space indentation.
- CLI handlers should print actionable errors to stderr and exit non-zero for invalid usage.

## Documentation Style

- Use concrete repository-relative paths, never author-machine absolute `file:///...` links.
- Keep compatibility claims explicit: legacy names may be documented in migration sections, but current active state should point to `flow-state.json` and `specs/<feature-slug>/`.
- Public ecosystem facts must carry date/source confidence when they are time-bounded.
- Do not hardcode unverified Claude import-depth or Codex context-cap claims.

## Artifact Ownership

- `.specify/` owns Spec-Kit templates, scripts, and `.specify/feature.json`.
- `specs/<feature-slug>/` owns canonical `spec.md`, `plan.md`, and `tasks.md`.
- `.ai/` owns mutable orchestration state, sessions, reviews, memory, context packs, claims, locks, and signals.
- `bin/`, `lib/`, and `validators/scripts/` own executable SAF behavior.
- `docs/artifact-registry.md` is the path ownership reference and should list generated CLI command parity.

## Testing / Verification Convention

Use the smallest command that proves the touched surface, then `npm run validate` for spec gate health. Full release confidence is `npm test`.

```bash
npm run validate
npm run test:cli
npm test
```

## Process Convention

- Validate the active spec before implementation.
- Keep docs/config-only changes behavior-neutral unless explicitly scoped.
- Avoid speculative abstractions; prefer small deterministic patches.
- Record durable fact changes in docs or planning maps when they affect future agents.

---

*Convention analysis refreshed: 2026-06-20*
