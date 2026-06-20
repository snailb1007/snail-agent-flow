# SAF Improvement Plan — Toward World-Class

**Status:** Proposal (research-backed, debate-hardened, rev. 2) · **Date:** 2026-06-20
**Companion:** `.ai/reviews/oss-benchmark-assessment.md` (existing roadmap) · governed by `docs/compatibility-policy.md`

Produced by parallel external research (5 streams) + adversarial cross-critique
(3 red-teams) + a fourth implementation-readiness review. Rev. 2 fixes two
blocking issues from that review: **phase ordering** (installer substrate must
precede any user-file mutation) and **ambiguity around runtime instruction
imports + skill deprecation**. Governing principle unchanged:
**subtract before you add.**

---

## 1. North Star & the Moat

**North Star:** SAF is a *near-zero-footprint, deterministic, offline,
agent-agnostic enforcement layer* — risk-adaptive gates that **any
AGENTS.md-compatible agent obeys**, with a resident instruction surface small
enough to honor its own context budget, and whose quality is **proven by a
portable, offline conformance suite** (with an optional live-eval tier).

**The Moat (named explicitly):** *enforcement portability* + *provable quality*.
LangGraph needs a Python runtime; Cursor is closed/cloud; Spec-Kit has no
runtime gate enforcement. SAF's defensible edge is deterministic offline
file/git-native gates that work under **any** agent — a moat only if (a) gates
are agent-agnostic, not Claude-only, and (b) we can **measure** that an agent +
SAF beats the same agent bare. Today neither holds; Phases 4 + 5 fix both.

**Honest verdict:** the original draft reaches *parity* with OSS. Only the
offline conformance suite + live eval (P7) and the security model (P8) move SAF
to *world-class*. Everything else consolidates self-inflicted fragmentation —
necessary, not differentiating.

---

## 2. Corrected facts (load-bearing; counts are time-bounded + source-labeled)

| Claim | Correction | Source / confidence |
|---|---|---|
| AGENTS.md "~30–40k repos" | **"20k+ as of Aug 2025; likely higher now — verify before publishing."** 40k was one vendor's analysis corpus (Tessl), not adoption. Always cite count **with date + source quality**. | agents.md / InfoQ / Socket — *medium, time-bounded* |
| Progressive disclosure "L1 ≤1024 chars" | 1024 = Skills **`description` field** max. The disclosure rule is **SKILL.md body < 500 lines**; the always-resident part is metadata (`name`+`description`, ~100 words). | Anthropic Agent Skills — *high* |
| Claude Code `@path` import (hops/depth) | **Must be verified against current Claude Code docs before the adapter relies on it** (see §4 Phase 4 adapter matrix). Do not hardcode a hop number in the plan. | — *unverified, action item* |
| "Codex 32 KB doc cap" | **Unverified** from primary sources — treat as unconfirmed. | — *unverified* |
| Verified ✓ | AGENTS.md under Linux Foundation AAIF; code-execution-with-MCP up to 98.7% context cut (150k→2k); tool "cliff" (Speakeasy 107 tools = collapse; GitHub 40→13 tools = +2–5 pts SWE-bench, −400 ms); LangGraph single-state + checkpointer; OpenSpec ADDED/MODIFIED/REMOVED deltas. | as cited §8 — *high* |

---

## 3. Governing principle & cross-cutting rules

Measured disease: **~14,000 tokens of resident preamble** across 6 overlapping
files (CLAUDE 13KB, AGENTS 12KB, CONTEXT 11KB, constitution 9KB, GEMINI 9KB),
with CLAUDE/AGENTS/GEMINI ≈ the same content three times (~34KB). **~80% of the
target win is deletion/consolidation.** New machinery is justified *only* where
it builds the moat (P7/P8) or closes a binding-policy violation (migrator).

**Cross-cutting compatibility rule** (`compatibility-policy.md`):
behavior/enforcement changes enter **opt-in → default + `saf doctor` notice →
blocking** across a deprecation window; **never full-rewrite a user-owned file**
(managed BEGIN/END blocks only); **never delete user state** (rename
`*.legacy-<ver>.bak`); the migrator ships **before** any state collapse;
`VERSION`→semver + dual-tag **before** the first semver release.

**Cross-cutting scope rule (NEW — fixes blocking issue #1):** Phases that edit
**SAF's own repo** (Phase 0, Phase 2A) may run immediately. Phases that **mutate
target-project files or state** (Phase 2B, Phase 3, and the target side of
Phase 4-routing) MUST NOT run until the **installer/upgrade substrate +
minimal mutation safety (Phase 1)** has shipped.

---

## 4. Phased roadmap (re-ordered; dependency-correct)

### Phase 0 — Truth & Safety (SAF's own repo; immediate; no behavior change)
- **Fix the broken pointer:** remove the live macOS `file:///Volumes/D/...`
  SPECKIT pointer in `GEMINI.md` **and `AGENTS.md` (confirmed present, line 53)**;
  use a relative path.
- **Unify version:** `VERSION` `0.4.0.0` → `0.5.0`; `release.yml` accepts both
  `v*.*.*` and legacy `v*.*.*.*` during transition (policy §2).
- **Migrator — precise status (fixes #6):** *No packaged CLI/lib migrator
  exists; only an agent-skill helper script does*
  (`.claude/skills/atlas-routing/scripts/migrate-ledger.js`,
  `.agents/skills/.../migrate-ledger.js`). Phase 3 packages a real
  `lib/migrate-ledger.js` + `saf doctor` detection (policy §4 mandates both).
- **Doc↔code parity:** auto-generate the CLI reference from the command registry
  (22 implemented vs 6 documented); update `docs/prd.md`, `docs/artifact-registry.md`.
- **Refresh/retire** the month-stale `.planning/codebase/*`; apply the §2 fact
  corrections wherever they appear.

### Phase 1 — Installer/upgrade substrate + minimal mutation safety
*(was "Phase 4"; promoted — MUST precede any target-file mutation. Fixes #1, #8a.)*
- **Managed `BEGIN/END` markers** for every file SAF edits (incl. `.gitignore`,
  which today uses a single header it can never update/remove) — conda/Ansible
  pattern; enables update *and* removal.
- `saf upgrade --dry-run` (default) / `--apply`; a git `saf/pre-upgrade` ref for
  one-command rollback. **DEFER** the SHA-256 manifest unless multi-harness
  install proves painful.
- **P8a — minimal mutation safety (pulled earlier from P8):** path allowlist for
  writes, mandatory dry-run **diff** before `--apply`, per-file `.bak`, and
  destructive-op confirmation. This guards the migrator + managed-block writes
  that Phases 2B/3 rely on.
- **Cross-platform:** replace bash-only `.specify/scripts/*.sh` with a single
  `.js` source (or ship `.ps1` siblings, the pattern already under
  `extensions/git/scripts/`). `npm test` green Win/Linux/mac × Node 20/22.

### Phase 2 — SUBTRACT (split by scope; fixes #1, #2, #3, #4)
**2A — Own-repo cleanup (immediate; no substrate dependency):**
- Collapse SAF's ~34KB instruction triplicate to **one canonical source**
  (AGENTS.md) + adapters; evict RTK rules (a *personal global hook*, not repo
  policy), the God-Combo refuse-rules block, and CONTEXT.md from the
  *always-resident* set (CONTEXT.md stays a *referenced* glossary). Keep only the
  progressive-disclosure principle. Target SAF resident footprint **< ~3K tokens**.

**Runtime adapter matrix (fixes #2 — replaces the naive "one-line @import"):**

| Runtime | Mechanism | Fallback |
|---|---|---|
| Codex / AGENTS.md tools | native `AGENTS.md` (note: nested precedence varies per tool — document per tool) | none |
| Claude Code | managed block in `CLAUDE.md` that imports/points to `AGENTS.md` (`@path`), **or** symlink where safe — *verify exact `@import` + hop behavior against current Claude Code docs first* | minimal pointer text in `CLAUDE.md` |
| Gemini | `.gemini/settings.json → {"context":{"fileName":"AGENTS.md"}}` (so a separate `GEMINI.md` may be unnecessary) | minimal `GEMINI.md` only if the setting isn't honored |

- **No generator; minimal validator only (fixes #3):** there is no content
  duplication to *sync* (so no generator), but a small validator/lint ensures
  adapter files contain **only** a managed pointer/config — never re-forked
  instruction content. This is what backs the "zero drift" CI metric.

**2B — Target-project migration (REQUIRES Phase 1 substrate):**
- Roll the lean surface to already-initialized targets via managed-block
  injection + `saf upgrade` (never full-rewrite a user's `CLAUDE.md`).
- Behavior change (evicting always-on blocks) ships **opt-in → default+notice →
  blocking**, per the compat rule.

**Skill consolidation — inventory first, not "archive the rest" (fixes #4):**
- Build a **skill inventory matrix**: `skill → role → {canonical | adapter |
  deprecated}`. Then:
  - *Spec source of truth:* **Spec-Kit only**.
  - *GSD spec-generation skills:* deprecated or adapter-only (write into
    `specs/<slug>/`, never a parallel SoT).
  - *GSD execution / review / UAT / workspace / ship / docs skills:* **kept** where
    they fill a unique role — do **not** blanket-archive GSD.

### Phase 3 — CONSOLIDATE state & spec (REQUIRES Phase 1; migrator-first; fixes #6, #7)
- **Package the migrator** (`lib/migrate-ledger.js`, expand-contract:
  read `flow-ledger.json` → write `flow-state.json` → rename source
  `*.legacy-<ver>.bak`) + `saf doctor` detection. Closes the policy §4 violation.
- **One durable state object:** `flow-state.json`, **single-writer**
  (orchestrator only; subagents isolated). Keep `run-state.json`
  **read-compatible** this major; keep the `FlowLedger` reader in `lib/`
  (policy §4 forbids deletion this major).
- **Legacy-read boundary (fixes #7):** *runtime orchestration NEVER reads legacy
  files as active state*; only `saf doctor`/the migrator may inspect
  `flow-ledger.json` to warn or migrate. Audit/normalize the
  `lib/validate-drift.js` fallback that currently reads
  `.ai/state/flow-ledger.json` so it is clearly a doctor/drift path, not core
  runtime state. If an append-only audit log is wanted, name it
  `flow-ledger.jsonl` and document it as an **event log, not state**.
- **One spec engine:** Spec-Kit canonical; add the single missing router rule.
  **DROP** the "git-native checkpointer" subsystem (YAGNI — git already is the
  checkpointer). **DEFER** OpenSpec delta/archive (changes `specs/<slug>/` layout
  → stable-paths risk; revisit post-1.0).

### Phase 4 — UNIFY routing (delete-first + bound migration; fixes #5)
- Delete the overlapping orders (God-Combo vs GitNexus-mandate vs RTK vs
  context-mode). **Reclassify RTK/context-mode as transport/compression, not tool
  selectors.**
- **Migrate the live GitNexus mandate (NEW subtask — the agent is currently
  bound by AGENTS.md lines 73–84):**
  1. Rewrite the AGENTS.md GitNexus block from "MUST run impact before editing
     **any** symbol" to the **risk-tiered rule**: FAST = skip · STANDARD =
     advisory · FULL = required-before-edit.
  2. Keep **mandatory** impact analysis for `rename`, cross-module changes, and
     public-API changes (these are sound).
  3. Add a validator that **prevents an unconditional "impact before every edit"
     from reappearing** in any instruction/skill file.
- **Lazy tool loading:** keep ≤ ~12 hot tools; load gitnexus/serena/semble on
  demand (stay under the tool cliff). The routing rule is expressed **once**; a
  lint (extends existing validators) rejects any skill/instruction that
  contradicts it.

### Phase 5 — PROVE & DIFFERENTIATE (the moat; parity → world-class; fixes #9, #10)
- **P7 — Conformance suite + eval, two tiers (fixes #9, preserves "offline"
  north star):**
  - *Tier 1 — deterministic offline conformance (blocking in CI):* fixtures +
    scripted/fake-agent or transcript-replay asserting expected gate behavior.
    No live model calls; reproducible.
  - *Tier 2 — live eval (optional, scheduled/manual, non-blocking trend):* real
    agents (Claude/Codex/Gemini) **with vs without SAF** scored on gate-adherence,
    regression rate, resident context tokens, task success. This is the
    differentiator; it never gates CI and never compromises determinism.
- **P8b — full security model:** broader capability model for autonomous edits,
  secret-scan before commit, benchmarked security behavior. (P8a minimal safety
  already shipped in Phase 1.)
- **Wire the budget gate to measure ITSELF:** `lib/context-budget.js` exists but
  meters session artifacts, not the preamble. Add resident cost = system prompt
  + tool/MCP schemas + skill L1 index + injected instruction files, **in
  tokens**; report-only first, blocking later.
- **Close the signals→learning loop:** feed `test-signal-logger.js` gate
  outcomes back into the Phase-4 routing rule.
- **Extend (not rebuild) CI self-enforcement:** SAF already ships 35+
  deterministic validators + CI. Add only: doc↔code CLI parity, instruction-
  adapter validator (Phase 2), preamble token budget, and the policy §6
  previous-version upgrade fixture.

---

## 5. Dependency graph

```text
Phase 0 (own repo) ─┐
Phase 2A (own repo) ─┼──> independent, start now
                     │
Phase 1 (substrate + P8a) ──> gate for everything that touches targets
   │
   ├─> Phase 2B (target migration)
   ├─> Phase 3 (state/spec consolidation, migrator-first)
   └─> Phase 4 (routing unify, incl. AGENTS.md mandate migration)
            │
            └─> Phase 5 (P7 conformance+eval, P8b, budget-self-meter, signals loop)
```

## 5.1 Reviewer-4 refinements folded into rev. 2

1. **Ordering fixed** — installer substrate is now **Phase 1**; SUBTRACT split
   into 2A (own repo, now) / 2B (targets, post-substrate). §3 scope rule added.
2. **Runtime adapter matrix** replaces the naive "one-line @import"; `@path`
   behavior flagged *verify-first*.
3. **"No generator; minimal validator only"** — explicit.
4. **Skill inventory matrix** replaces "archive the rest"; GSD execution/review/
   UAT/workspace skills explicitly retained.
5. **AGENTS.md GitNexus mandate migration** added as a Phase-4 subtask + anti-
   regression validator.
6. **Migrator status** reworded: no packaged lib/CLI migrator; skill helper exists.
7. **Legacy-read boundary** clarified; `validate-drift.js` fallback flagged.
8. **Security split** — P8a (minimal mutation safety) pulled into Phase 1; P8b
   (full model) stays Phase 5.
9. **SAF Bench split** — Tier-1 offline conformance (blocking) vs Tier-2 live
   eval (non-blocking); preserves the deterministic/offline north star.
10. **Metric refined** — see §6.

---

## 6. Definition of "world-class" (success metrics, refined per #10)

- Resident SAF footprint **< 3K tokens** (from ~14K), measured by the gate itself.
- **Zero instruction drift** across runtimes (adapter validator) and **zero**
  hardcoded absolute paths.
- **One** state-file name. **Zero *active-runtime* references treating deprecated
  names as canonical** — docs *may* reference `flow-ledger.json`/`run-state.json`
  **only** in migration/compat sections. Migrator proven on a prev-version fixture.
- **One** spec engine; **zero** parallel sources of truth.
- Hot tool-set **≤ 12**; routing expressed once; no contradicting rule survives lint.
- **Tier-1 conformance** green and reproducible offline in CI; **Tier-2 live
  eval** shows uplift (gate-adherence ↑, regression ↓, success ↑, context
  tokens ↓) for **≥2 agents**, with vs without SAF.
- Every change compat-staged; `npm test` green Win/Linux/mac × Node 20/22.

---

## 7. What stayed (validated by review)

Subtract→consolidate→prove→differentiate framing; Phase 0 truth/safety as cheap
high-trust first move; managed-blocks + dry-run upgrade ahead of target mutation;
SAF Bench as a real differentiator (once split offline/live); budget gate
measuring SAF's own footprint.

## 8. Sources (research streams)

- **Instructions/AGENTS.md:** agents.md (Linux Foundation AAIF); Anthropic Claude
  Code memory/import docs; Codex nested-file concatenation; agnix/ctxlint.
- **Context engineering:** Anthropic *Effective context engineering*, *Agent
  Skills*, *Writing tools for agents*, *Code execution with MCP* (98.7%);
  humanlayer/12-factor-agents (Factor 3); Chroma *context rot*.
- **Spec/state:** GitHub Spec-Kit; OpenSpec (delta/archive); BMAD-METHOD;
  LangGraph (single-state + checkpointer + `_migrate_checkpoint`).
- **Tool governance:** Anthropic *Writing tools for agents*; MCP spec (tool
  annotations); Speakeasy/GitHub tool-cliff data; LangChain ReAct benchmarking.
- **Installer/migration:** conda init / Ansible `blockinfile`; Spec-Kit SHA-256
  manifest; husky/chezmoi; expand-contract migration; SemVer §4.
