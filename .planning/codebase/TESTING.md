# Testing Patterns

**Analysis Date:** 2026-06-20
**Status:** Refreshed; stale "no tests/no CI" statements retired.

## Current Test Status

This repo has a Node.js validation suite focused on deterministic SAF behavior, CLI integration, package inventory, ATLAS flow helpers, and policy gates.

## Primary Commands

```bash
npm run validate        # deterministic Spec-Kit validation
npm run test:validator  # validator unit coverage
npm run test:pipeline   # Phase 2 pipeline simulation
npm run test:cli        # CLI command integration coverage
npm test                # full validation suite
```

## Test Locations

- `validators/scripts/test-validator.js` — spec validator behavior.
- `validators/scripts/test-cli.js` — CLI command integration behavior.
- `validators/scripts/run-pipeline-test.js` — pipeline simulation.
- `validators/scripts/test-*.js` — focused unit/integration tests for `lib/` modules and packaged flows.
- `.github/workflows/ci.yml` — CI execution of verification commands.

## Documentation / Config Verification

For docs/config-only changes:

1. Run `npm run validate` before implementation if required by repo policy.
2. Verify changed paths with targeted searches (`file:///Volumes/D`, version strings, release tag patterns, CLI command count).
3. Run `npm run validate` again after edits.
4. Run targeted tests only when executable behavior changes; run `npm test` for release readiness.

## Current Phase 0 Verification Targets

- Broken pointer removal: resident instruction files use repository-relative Spec-Kit plan paths.
- Version transition: `VERSION`, `package.json`, and `package-lock.json` agree on `0.5.0`/semver metadata.
- Release workflow: accepts both `v*.*.*` and `v*.*.*.*` during transition.
- CLI reference parity: docs list all 22 commands from `bin/adp.js`.
- Planning maps: stale May-2026 claims about absent package/test/CI/CLI are retired.

---

*Testing analysis refreshed: 2026-06-20*
