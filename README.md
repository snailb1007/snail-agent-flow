# Snail Agent Flow

Snail Agent Flow is a local operating protocol for AI coding agents. It keeps feature specs, planning artifacts, validation gates, sessions, reviews, and durable memory in predictable paths so agents can move from spec to implementation to release without inventing parallel state.

## CLI

The package exposes the same local CLI through two command names:

```bash
adp <command>
saf <command>
```

When running from a checkout, use the script directly:

```bash
node bin/adp.js <command>
```

| Command | Purpose |
|---|---|
| `init` | Create the required protocol directories and missing starter docs without overwriting existing files. |
| `new-session <name>` | Create `.ai/sessions/YYYY-MM-DD-<name>.md` for temporary execution notes. |
| `status` | Print the active feature, feature directory, current phase, last gate, gate status, retry count, and verified artifacts. |
| `doctor` | Check required project structure and run the deterministic spec validator. |
| `validate-spec` | Run `validators/scripts/validate-spec.js` through the packaged CLI path. |
| `handoff` | Validate `.ai/state/handoff.md` before release by checking required memory handoff sections. |

Session names for `new-session` may contain only letters, numbers, dots, underscores, and hyphens.

## Verification

```bash
npm run validate        # deterministic Spec-Kit validation
npm run test:validator  # validator unit coverage
npm run test:pipeline   # Phase 2 pipeline simulation
npm run test:cli        # CLI command integration coverage
npm test                # full validation suite
```

The release workflow runs `npm test`, builds an npm tarball with `npm pack`, uploads the package artifact, and attaches it to tagged GitHub releases matching `v*.*.*.*`.

## Project Structure

| Path | Purpose |
|---|---|
| `.specify/` | Spec-Kit presets, templates, validation scripts, and active feature pointer. |
| `specs/<feature-slug>/` | Canonical feature requirements, implementation plan, tasks, and checklists. |
| `.ai/` | Mutable orchestration state, review logs, session logs, memory handoff state, and durable project memory. |
| `bin/adp.js` | Zero-dependency Node.js CLI for protocol setup, status, validation, and handoff checks. |
| `validators/scripts/` | Deterministic validation and integration test scripts. |
| `docs/` | Protocol reference docs, artifact registry, routing matrix, ADRs, and runbooks. |

## Documentation

- [Pipeline vocabulary](CONTEXT.md)
- [Full pipeline blueprint](docs/prd.md)
- [Artifact registry](docs/artifact-registry.md)
- [Tool routing matrix](docs/tool-routing.md)
- [Memory versus sessions](docs/memory-versus-sessions.md)
- [Failure modes runbook](docs/runbooks/failure-modes.md)
