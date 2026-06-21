const fs = require('fs');
const path = 'README.md';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Remove duplicate content in section 6 (lines 133-136)
content = content.replace(
  '### 6. Workspace Management\n* `gsd-workspace` / `gsd-workstreams`: Manages isolated branch sandboxes and checkpoint states.\n* `using-superpowers`: Guides overall skill discovery and requires skill preflight checks.\n* `systematic-debugging` / `test-driven-development`: Enforces Red-Green-Refactor testing rigor.\n* `using-git-worktrees`: Allocates isolated workspace directories to parallel features.\n* `logo-generator`: Builds professional geometric and vector SVG product logo assets.',
  '### 6. Workspace Management\n* `gsd-workspace` / `gsd-workstreams`: Manages isolated branch sandboxes and checkpoint states.'
);

// Fix 2: Add missing CLI commands
const missingCommands = [
  '  signal <type> <val>     Log observability signal.',
  '  onboard-memory          Promote ONBOARDING.md content into .ai/memory/ files.',
  '  budget                  Report estimated context byte pressure and policy outcome.',
  '                          Options: --stage <id>, --json, --enforce (exit 1 unless inline), --profile.',
  '  pack                    Generate a context pack manifest under .ai/context-packs/.',
  '                          Options: --objective <text>, --stage <id>, --out <path>.'
].join('\n');

content = content.replace(
  '  checkpoint            Write profile-switch checkpoint.\n\n```',
  '  checkpoint            Write profile-switch checkpoint.\n' + missingCommands + '\n```'
);

// Fix 3: Add missing docs references before the final blank lines
const missingDocs = [
  '',
  '- [Failure modes runbook](docs/runbooks/failure-modes.md)',
  '- [Compatibility policy](docs/compatibility-policy.md)',
  '- [Migration guide](docs/migration.md)'
].join('\n');

content = content.replace(
  '- [Migration guide for target projects](docs/migration.md)\n\n\n',
  '- [Migration guide for target projects](docs/migration.md)' + missingDocs + '\n'
);

fs.writeFileSync(path, content);
console.log('Applied final cleanup fixes');