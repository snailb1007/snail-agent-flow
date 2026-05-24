# Tool Routing Matrix

| Phase | Task Type | Primary Tool | Specific Skill / Flow | Required Input | Required Output | Validator | Stop / Exit Condition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Recon** | Investigation | Serena / Semble / Context7 | Symbol lookup, semantic search, API docs | Target feature request | `.ai/sessions/YYYY-MM-DD-recon-<feature-slug>.md` | Check for listed files & API versions | All unknown APIs and target files listed |
| **Critique** | Planning Review | GStack CEO / Eng Manager | `plan-ceo-review`, `plan-eng-review` | Recon report, constitutional rules | `.ai/reviews/<feature-slug>/gstack-ceo-review.md`, `gstack-eng-review.md` | Verify judgment gate Status header | Status headers are set to `PASS` or judgment-only `WARN` with `Blocking Issues: none` |
| **Spec** | Specification | Spec-Kit | `speckit-specify`, `speckit-plan`, `speckit-tasks` | Reviews, Recon report | `specs/<feature-slug>/{spec,plan,tasks}.md` | `/speckit.analyze` | Spec-Kit files written; no `[NEEDS CLARIFICATION]` tags |
| **Gate** | Spec Validation | Custom script / Judge | Validator validation | Spec-Kit files | `.ai/reviews/<feature-slug>/spec-validation-report.md` | Verification of contract files and headers | Validation report outputs explicit `PASS` |
| **Execution** | Code writing | GSD Full | `gsd-execute-phase`, `gsd-quick` | Validated Spec-Kit files | Implemented code, `.ai/sessions/YYYY-MM-DD-gsd-execution-<feature-slug>.md` | Compiler/build checks | All `tasks.md` items checked off, code compiles |
| **QA** | Verification | GStack QA | `qa-only`, Playwright | Implemented code, spec criteria | `.ai/reviews/<feature-slug>/qa-review.md`, `.ai/sessions/YYYY-MM-DD-qa-<feature-slug>.md` | Test runners, Playwright tests | QA review shows `PASS`; all tests green |
| **Memory** | Handoff | Protocol / Human | `gsd-extract-learnings` | QA reports, session notes | Updated `.ai/memory/*` files, `.ai/state/handoff.md` | Deterministic minimum checks plus reviewer judgment | `PASS` or judgment-only `WARN` with no blocking issues |
| **Ship** | Release | GStack Ship | `ship` | Memory handoff, all review logs | `.ai/reviews/<feature-slug>/ship-decision.md` | Pre-landing checklist | `PASS` or judgment-only `WARN` with no blocking issues; branch created |

## Routing Invariants

- **Spec-Kit Stack Ownership**: The Spec-Kit artifact stack owns `spec.md`, `plan.md`, and `tasks.md` inside `specs/<feature-slug>/`. It is the canonical source of truth.
- **GSD Role**: GSD is the execution layer that consumes Spec-Kit artifacts to perform the implementation. GSD must not author specs or plans.
- **Critique Gates**: Matt and the GStack critique reviews act as the planning and critique gates.
- **GitHub Issues**: Git/GitHub issues are strict projections of tasks defined in `tasks.md` (e.g., using `speckit-taskstoissues`). They must not diverge from the canonical tasks list.

