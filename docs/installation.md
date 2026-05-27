# Installation

This guide covers local setup, CLI usage, and verification commands for Snail Agent Flow. The README stays focused on the flow design and tool map.

## Local Setup

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd snail-agent-flow
npm install
```

Run the CLI directly from the checkout:

```bash
node bin/adp.js <command>
```

To make the package commands available globally from this checkout:

```bash
npm link
```

Alternatively, install globally from the local path:

```bash
npm install -g .
```

After linking or global installation, both command names point to the same CLI:

```bash
adp <command>
saf <command>
```

Verify the local environment:

```bash
saf doctor
```

## Common Commands

| Command | Purpose |
|---|---|
| `init` | Create protocol directories, starter agent docs, default flow definition, flow ledger, local skill stubs, and strict init checks. |
| `feature <description>` | Create a validated Spec-Kit feature scaffold under `specs/<feature-slug>/` and update `.specify/feature.json`. |
| `run <description>` | Initialize the protocol if needed, create a feature scaffold, run validation, and print next steps. |
| `new-session <name>` | Create a dated session note under `.ai/sessions/`. |
| `status` | Print the active feature, current phase, last gate, gate status, retry count, and verified artifacts. |
| `doctor` | Run strict static sanity checks and the deterministic spec validator. |
| `validate-spec` | Run `validators/scripts/validate-spec.js` through the packaged CLI path. |
| `handoff` | Validate `.ai/state/handoff.md` before release. |

Session names for `new-session` may contain only letters, numbers, dots, underscores, and hyphens.

## One-Flow Start

For a new project:

```bash
saf run "Add user login"
```

From a repository checkout:

```bash
node bin/adp.js run "Add user login"
```

This creates protocol directories if needed, writes `spec.md`, `plan.md`, `tasks.md`, and `checklists/requirements.md` under `specs/<feature-slug>/`, updates `.specify/feature.json`, and runs the deterministic validation gate.

For a project that is already initialized:

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
