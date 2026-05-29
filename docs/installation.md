# Installation & Project Integration

This guide covers CLI setup, integration with other target projects, and verification commands for Snail Agent Flow.

## CLI Installation (Global Setup)

To make the CLI commands available globally across any repository on your system, clone this repository and install/link it:

```bash
git clone <repository-url>
cd snail-agent-flow
npm install
npm link
# OR: npm install -g .
```

After linking or global installation, the CLI is registered on your system path. You can invoke it using either alias:

```bash
saf <command>
adp <command>
```

To run the CLI directly from this checkout without linking:

```bash
node bin/adp.js <command>
```

---

## Integrating with Target Projects

Snail Agent Flow is designed to structure AI context and execution for **any** repository. To introduce Snail Agent Flow to your target project:

1. **Navigate to the target project directory:**
   ```bash
   cd /path/to/your/target-project
   ```

2. **Initialize the protocol:**
   ```bash
   saf init
   ```
   This command automatically generates the required protocol structures in the target directory:
   - Configures agent instructions (`CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`).
   - Sets up protocol directories (`.ai/`, `.specify/`, `specs/`).
   - Creates the default ATLAS flow definition (`.ai/flows/atlas-flow.yaml`).
   - Copies the packaged ATLAS skills and contracts into `.claude/skills/atlas-*` and `.claude/skills/contracts`.
   - Sets up context size policy limits (`.ai/state/context-policy.json`).
   - Localizes global GSD skills to `.agents/skills` or `.claude/skills` to make them relative to the target project.

3. **Verify the target environment:**
   ```bash
   saf doctor
   ```

---

## Common Commands

| Command | Purpose |
|---|---|
| `init` | Create protocol directories, starter agent docs, default flow definition, flow state schema, and copies ATLAS loop runtime assets. |
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

## Release Verification Checklist

Before publishing or creating a release, verify the package integrity and target project bootstrap behavior using the following steps:

1. **Validate Feature Spec**:
   ```bash
   node validators/scripts/validate-spec.js
   ```
2. **Verify Packaged Assets (Inventory check)**:
   ```bash
   node validators/scripts/test-package-inventory.js
   ```
3. **Verify Target Project Bootstrap (Smoke test)**:
   ```bash
   node validators/scripts/test-target-project-bootstrap.js
   ```
4. **Run Full Test Suite**:
   ```bash
   npm test
   ```
5. **Dry-Run Package Assembly**:
   ```bash
   npm pack --dry-run --json
   ```
