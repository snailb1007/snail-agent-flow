const fs = require('fs');
const path = 'README.md';
let content = fs.readFileSync(path, 'utf8');

// 1. Add version after title
content = content.replace(
  '# Snail Agent Flow',
  '# Snail Agent Flow\n\n**Version 0.5.0**'
);

// 2. Update Repository Contract table - add new paths
const repoContractUpdate = `
| \`.ai/context-packs/\` | Context Pack Generator | Context-pack manifests for scoped work units. |
| \`.ai/sessions/archive/<slug>/\` | Session Manager | Archived session logs from compacted features. |
| \`.ai/state/skills-version.json\` | Skill Localization | Localized skills version stamp for drift detection. |
| \`.ai/state/context-policy.json\` | Context Budget | Context size policy limits and thresholds. |
| \`.ai/flows/\` | Flow Engine | ATLAS flow definition files. |
| \`.claude/settings.json\` | Hooks Installer | Claude Code lifecycle hooks configuration. |
| \`.agents/skills/\` | Skill Localization | Alternative skill localization path for other runtimes. |
`;

content = content.replace(
  '| \`lib/\` | Runtime | Core library (flow state, drift checks, CLI commands). |',
  '| \`lib/\` | Runtime | Core library (flow state, drift checks, CLI commands). |' + repoContractUpdate
);

// 3. Add new library files to lib entry
content = content.replace(
  '| \`lib/\` | Runtime | Core library (flow state, drift checks, CLI commands). |',
  '| \`lib/\` | Runtime | Core library including context-pack-generator, context-policy-validator, init-checks, lease-manager, claim-manager, profile-scorer, signal-logger, checkpoint-writer, act-snapshot, cmd-profiler, hooks-installer, session-bypass, diff-hygiene, and validate-drift. |'
);

// 4. Update Protocol Skills section - add missing skills
const skillsUpdate = `
### 5. Upgrade & Contracts
* \`saf-upgrade\`: Version-agnostic upgrade conductor for target projects (AI interprets \`saf doctor\` output and resolves project-specific conflicts).
* \`contracts\`: Schema contracts mapping ATLAS entities and shapes in \`.claude/skills/contracts\`.

### 6. Workspace Management
* \`gsd-workspace\`: Manages isolated branch sandboxes and checkpoint states.
* \`gsd-workstreams\`: Manages parallel workstreams with disjoint write targets and checkpoint states.
`;

content = content.replace(
  '### 4. Utility & Engineering Discipline',
  skillsUpdate + '\n### 4. Utility & Engineering Discipline'
);

// 5. Update CLI Reference - add missing commands
const cliUpdate = `
  hooks <install|uninstall|status> Manage Claude Code lifecycle hooks. Options: --apply, --events <list>.
  snapshot              Create a git-based stash checkpoint for the active feature.
                        Options: --label <text>, --list.
  restore <id>          Restore a git-based checkpoint. Options: --hard, --yes.
  profile -- <cmd...>   Run a command, profiling its execution time and output size.
  bypass <gate-id>      Temporarily bypass a secondary gate. Options: --ttl <seconds>, --reason <text>, --list, --clear.
  compact-memory        Prep snail-trail memory compaction without calling an LLM.
                        Options: --archive, --focus <text>.
  score <task.json>     Score task risk and output profile selection.
  claim <task-slug>     Claim work unit ownership.
  lease <file>          Acquire advisory file lease lock. Options: --release, --check.
  checkpoint            Write profile-switch checkpoint.
`;

content = content.replace(
  '  handoff               Validate memory handoff checklist completeness.',
  '  handoff               Validate memory handoff checklist completeness.' + cliUpdate
);

// 6. Update budget documentation
content = content.replace(
  '  budget                Report estimated context byte pressure and policy outcome.',
  '  budget                Report estimated context byte pressure and policy outcome.\n                        Options: --stage <id>, --json, --enforce (exit 1 unless inline), --profile.'
);

// 7. Add missing docs references
const docsUpdate = `
- [Failure modes runbook](docs/runbooks/failure-modes.md)
- [Compatibility policy](docs/compatibility-policy.md)
- [Migration guide](docs/migration.md)
`;

content = content.replace(
  '- [Failure modes runbook](docs/runbooks/failure-modes.md)',
  docsUpdate
);

// 8. Add verification commands section
const verifySection = `

## Verification Commands

\`\`\`bash
npm run validate        # deterministic Spec-Kit validation
npm run test:validator  # validator unit coverage
npm run test:init-checks # strict init-time sanity check coverage
npm run test:pipeline   # Phase 2 pipeline simulation
npm run test:cli        # CLI command integration coverage
npm run test:lint       # lint checks
npm test                # full validation suite
\`\`\`

`;

content = content.replace(
  '## Reference Docs',
  verifySection + '## Reference Docs'
);

fs.writeFileSync(path, content);
console.log('README.md updated successfully');