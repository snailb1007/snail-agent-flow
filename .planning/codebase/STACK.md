# Technology Stack

**Analysis Date:** 2026-06-20
**Status:** Refreshed; replaces stale statements that no package manifest, lockfile, test runner, or CI existed.

## Languages

- **JavaScript (Node.js, CommonJS):** CLI and deterministic helpers in `bin/`, `lib/`, and `validators/scripts/`.
- **Markdown:** protocol docs, instruction files, specs, memory, reviews, and planning maps.
- **YAML:** GitHub Actions workflows and ATLAS flow definitions.
- **JSON:** package metadata, lockfile, state files, context packs, claims, locks, and config.
- **Shell / PowerShell:** onboarding scripts in `scripts/` and some packaged helper scripts.

## Runtime & Package Manager

- Runtime: Node.js `>=20` from `package.json`.
- Package manager: npm (`package-lock.json` present). `pnpm-lock.yaml` is also present but npm scripts are authoritative.
- Package version transition: `VERSION` moved from legacy `0.4.0.0` to semver `0.5.0`; `package.json` follows npm semver.

## CLI / Binaries

`package.json` maps both binaries to the same entry point:

```json
{
  "adp": "./bin/adp.js",
  "saf": "./bin/adp.js"
}
```

The command registry currently documents 22 commands in `bin/adp.js`.

## Verification Commands

```bash
npm run validate
npm run test:validator
npm run test:pipeline
npm run test:cli
npm test
```

## CI/CD

- `.github/workflows/ci.yml` runs the verification suite on pushes and pull requests.
- `.github/workflows/release.yml` runs `npm test`, `npm pack`, uploads the tarball, and publishes GitHub releases for `v*.*.*` and legacy `v*.*.*.*` tags.

## External / Agent Tooling

- Spec-Kit owns `.specify/` and canonical feature artifacts under `specs/<feature-slug>/`.
- ATLAS skills are packaged under `.claude/skills/` and `.agents/skills/`.
- GitNexus, Context7, Serena, Semble, GSD, GStack, Promptfoo, and Playwright are routing/tooling concepts unless a concrete local config or command exists.

---

*Stack analysis refreshed: 2026-06-20*
