# Snail Agent Flow

Snail Agent Flow is a local operating protocol for AI coding agents. It keeps feature specs, planning artifacts, validation gates, sessions, reviews, and durable memory in predictable paths so agents can move from spec to implementation to release without inventing parallel state.

## Installation

To set up Snail Agent Flow locally:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd snail-agent-flow
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Register the CLI commands globally**:
   Make the `adp` and `saf` CLI commands available anywhere on your system by linking the package:
   ```bash
   npm link
   ```
   *Alternatively, install globally from the local path:*
   ```bash
   npm install -g .
   ```

4. **Verify the installation**:
   Run the project doctor to verify that required directory structures and tool dependencies are present:
   ```bash
   saf doctor
   ```

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
| `init` | Create required protocol directories, missing starter docs (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`), copy the default flow definition to `.ai/flows/rough-project-flow.yaml`, initialize `.ai/state/flow-ledger.json` from it, generate `project-flow` skill stubs under `.agents/skills/` and `.claude/skills/`, copy and localize global GSD skills, append subagent guidelines, and run strict initialization-time sanity checks. |
| `feature <description>` | Create a validated Spec-Kit feature scaffold under `specs/<feature-slug>/` and update `.specify/feature.json`. |
| `run <description>` | Initialize the protocol if needed, create a feature scaffold, run validation, and print next steps. |
| `new-session <name>` | Create `.ai/sessions/YYYY-MM-DD-<name>.md` for temporary execution notes. |
| `status` | Print the active feature, feature directory, current phase, last gate, gate status, retry count, and verified artifacts. |
| `doctor` | Run strict static sanity checks (directories, flow definitions, ledgers, tool prerequisites, global path leaks) and run the deterministic spec validator. Generates `.ai/state/repair-guide.md` on failure. |
| `validate-spec` | Run `validators/scripts/validate-spec.js` through the packaged CLI path. |
| `handoff` | Validate `.ai/state/handoff.md` before release by checking required memory handoff sections. |

Session names for `new-session` may contain only letters, numbers, dots, underscores, and hyphens.

### One-Flow Start

For a new project, run the one-command scaffold flow:

```bash
saf run "Add user login"
```

From a repository checkout, use:

```bash
node bin/adp.js run "Add user login"
```

This creates protocol directories if needed, writes `spec.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md` under `specs/<feature-slug>/`, updates `.specify/feature.json`, and runs the deterministic validation gate.

For a project that is already initialized, create the next feature packet with:

```bash
saf feature "Improve checkout errors"
saf validate-spec
```

The generated packet is a validated starting point for agent-driven planning and implementation. It does not mark implementation complete.

## Verification

```bash
npm run validate           # deterministic Spec-Kit validation
npm run test:validator     # validator unit coverage
npm run test:init-checks   # strict init-time sanity check coverage
npm run test:pipeline      # Phase 2 pipeline simulation
npm run test:cli           # CLI command integration coverage
npm test                   # full validation suite
```

The release workflow runs `npm test`, builds an npm tarball with `npm pack`, uploads the package artifact, and attaches it to tagged GitHub releases matching `v*.*.*.*`.

## Project Structure

| Path | Purpose |
|---|---|
| `.specify/` | Spec-Kit presets, fixtures, templates, validation scripts, optional evaluation rubric, and active feature pointer. |
| `specs/<feature-slug>/` | Canonical feature requirements, implementation plan, tasks, and checklists. |
| `.ai/` | Mutable orchestration state, review logs, session logs, memory handoff state, and durable project memory. |
| `.ai/flows/` | Project flow definitions (e.g. `rough-project-flow.yaml`) consumed by the flow engine and ledger. |
| `.github/workflows/` | GitHub Actions release and CI verification workflows. |
| `bin/adp.js` | Zero-dependency Node.js CLI for protocol setup, status, validation, and handoff checks. |
| `lib/` | Shipped runtime modules — init-checks, flow engine, flow ledger, YAML parser, skill-md parser, tool validator. |
| `validators/scripts/` | Deterministic validation and integration test scripts. |
| `docs/` | Protocol reference docs, artifact registry, routing matrix, ADRs, and runbooks. |

## Documentation

- [Claude agent instructions](CLAUDE.md)
- [Gemini agent instructions](GEMINI.md)
- [General agent instructions](AGENTS.md)
- [Pipeline vocabulary](CONTEXT.md)
- [Full pipeline blueprint](docs/prd.md)
- [Artifact registry](docs/artifact-registry.md)
- [Tool routing matrix](docs/tool-routing.md)
- [Memory versus sessions](docs/memory-versus-sessions.md)
- [Failure modes runbook](docs/runbooks/failure-modes.md)
