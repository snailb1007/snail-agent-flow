# Deterministic flow/ledger validation is unified into the post-init gate

Earlier phases described a standalone Flow Validator (`lib/flow-validator.js`, invoked via `adp flow validate` / `npm run validate:flow`). Phase 016 deliberately consolidated all deterministic, offline setup validation into a single gate (`lib/init-checks.js` `runStrictChecks`) that composes the existing pieces — `lib/yaml-parser.js` for flow syntax and `lib/flow-engine.js` `validateLedger` for ledger schema — and is run identically by `adp init` (post-scaffold) and `adp doctor`.

We chose one gate over a separate command so that `init` and `doctor` cannot drift in their diagnostics, and so there is exactly one place that decides whether a workspace is healthy. The standalone `lib/flow-validator.js` and `adp flow validate` no longer exist and should not be re-introduced; add new deterministic checks to `runStrictChecks` instead.
