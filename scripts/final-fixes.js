const fs = require('fs');
const path = 'README.md';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Correct skills section order (4, 5, 6)
content = content.replace(
  '### 6. Workspace Management\n* `saf-upgrade`: Version-agnostic upgrade conductor for target projects (AI interprets `saf doctor` output and resolves project-specific conflicts).\n* `contracts`: Schema contracts mapping ATLAS entities and shapes in `.claude/skills/contracts`.\n\n### 5. Upgrade & Contracts\n* `gsd-workspace`: Manages isolated branch sandboxes and checkpoint states.\n* `gsd-workstreams`: Manages parallel workstreams with disjoint write targets and checkpoint states.\n\n### 4. Utility & Engineering Discipline',
  '### 4. Utility & Engineering Discipline\n* `using-superpowers`: Guides overall skill discovery and requires skill preflight checks.\n* `systematic-debugging` / `test-driven-development`: Enforces Red-Green-Refactor testing rigor.\n* `using-git-worktrees`: Allocates isolated workspace directories to parallel features.\n* `logo-generator`: Builds professional geometric and vector SVG product logo assets.\n\n### 5. Upgrade & Contracts\n* `saf-upgrade`: Version-agnostic upgrade conductor for target projects (AI interprets `saf doctor` output and resolves project-specific conflicts).\n* `contracts`: Schema contracts mapping ATLAS entities and shapes in `.claude/skills/contracts`.\n\n### 6. Workspace Management\n* `gsd-workspace` / `gsd-workstreams`: Manages isolated branch sandboxes and checkpoint states.'
);

// Fix 2: Add missing CLI commands (signal, onboard-memory, budget, pack)
const missingCommands = `
  signal <type> <val>     Log observability signal.
  onboard-memory          Promote ONBOARDING.md content into .ai/memory/ files.
  budget                  Report estimated context byte pressure and policy outcome.
                          Options: --stage <id>, --json, --enforce (exit 1 unless inline), --profile.
  pack                    Generate a context pack manifest under .ai/context-packs/.
                          Options: --objective <text>, --stage <id>, --out <path>.`;

content = content.replace(
  '  checkpoint            Write profile-switch checkpoint.\n\n```',
  '  checkpoint            Write profile-switch checkpoint.' + missingCommands + '\n```'
);

fs.writeFileSync(path, content);
console.log('Applied final fixes');