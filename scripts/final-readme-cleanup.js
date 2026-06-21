const fs = require('fs');
const path = 'README.md';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Remove duplicate docs references at the end (lines 231-233)
content = content.replace(
  /\n- \[Failure modes runbook\]\(docs\/runbooks\/failure-modes\.md\)\n- \[Compatibility policy\]\(docs\/compatibility-policy\.md\)\n- \[Migration guide\]\(docs\/migration\.md\)\n$/,
  '\n'
);

// Fix 2: Fix skills section numbering - reorder to 4, 5, 6
content = content.replace(
  '### 5. Upgrade & Contracts\n* `saf-upgrade`: Version-agnostic upgrade conductor for target projects (AI interprets `saf doctor` output and resolves project-specific conflicts).\n* `contracts`: Schema contracts mapping ATLAS entities and shapes in `.claude/skills/contracts`.\n\n### 6. Workspace Management\n* `gsd-workspace`: Manages isolated branch sandboxes and checkpoint states.\n* `gsd-workstreams`: Manages parallel workstreams with disjoint write targets and checkpoint states.\n\n\n### 4. Utility & Engineering Discipline',
  '### 4. Utility & Engineering Discipline\n* `using-superpowers`: Guides overall skill discovery and requires skill preflight checks.\n* `systematic-debugging` / `test-driven-development`: Enforces Red-Green-Refactor testing rigor.\n* `using-git-worktrees`: Allocates isolated workspace directories to parallel features.\n* `logo-generator`: Builds professional geometric and vector SVG product logo assets.\n\n### 5. Upgrade & Contracts\n* `saf-upgrade`: Version-agnostic upgrade conductor for target projects (AI interprets `saf doctor` output and resolves project-specific conflicts).\n* `contracts`: Schema contracts mapping ATLAS entities and shapes in `.claude/skills/contracts`.\n\n### 6. Workspace Management\n* `gsd-workspace` / `gsd-workstreams`: Manages isolated branch sandboxes and checkpoint states.'
);

// Fix 3: Remove duplicate gsd-workspace/gsd-workstreams from section 3
content = content.replace(
  '* `gsd-workspace` / `gsd-workstreams`: Manages isolated branch sandboxes and checkpoint states.\n\n\n### 5. Upgrade & Contracts',
  '* `gsd-workspace` / `gsd-workstreams`: Manages isolated branch sandboxes and checkpoint states.\n\n### 5. Upgrade & Contracts'
);

// Fix 4: Add missing commands to CLI Reference
const missingCommands = `
  signal <type> <val>     Log observability signal.
  onboard-memory          Promote ONBOARDING.md content into .ai/memory/ files.
  budget                  Report estimated context byte pressure and policy outcome.
                          Options: --stage <id>, --json, --enforce (exit 1 unless inline), --profile.
  pack                    Generate a context pack manifest under .ai/context-packs/.
                          Options: --objective <text>, --stage <id>, --out <path>.
`;

content = content.replace(
  '  checkpoint            Write profile-switch checkpoint.\n\n```',
  '  checkpoint            Write profile-switch checkpoint.' + missingCommands + '```'
);

// Fix 5: Remove extra blank lines
content = content.replace(/\n{3,}/g, '\n\n');

// Fix 6: Ensure proper spacing before ## sections
content = content.replace(/\n(## )/g, '\n\n$1');

fs.writeFileSync(path, content);
console.log('README.md final cleanup complete');