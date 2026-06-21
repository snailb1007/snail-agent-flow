const fs = require('fs');
const path = 'README.md';
let content = fs.readFileSync(path, 'utf8');

// Fix skills section order: 4, 5, 6
content = content.replace(
  /### 6\. Workspace Management\n\* `saf-upgrade`.*?### 5\. Upgrade & Contracts\n\* `gsd-workspace`.*?### 4\. Utility & Engineering Discipline\n\* `using-superpowers`.*?(?=\n---)/s,
  `### 4. Utility & Engineering Discipline
* \`using-superpowers\`: Guides overall skill discovery and requires skill preflight checks.
* \`systematic-debugging\` / \`test-driven-development\`: Enforces Red-Green-Refactor testing rigor.
* \`using-git-worktrees\`: Allocates isolated workspace directories to parallel features.
* \`logo-generator\`: Builds professional geometric and vector SVG product logo assets.

### 5. Upgrade & Contracts
* \`saf-upgrade\`: Version-agnostic upgrade conductor for target projects (AI interprets \`saf doctor\` output and resolves project-specific conflicts).
* \`contracts\`: Schema contracts mapping ATLAS entities and shapes in \`.claude/skills/contracts\`.

### 6. Workspace Management
* \`gsd-workspace\` / \`gsd-workstreams\`: Manages isolated branch sandboxes and checkpoint states.`
);

fs.writeFileSync(path, content);
console.log('Fixed skills section order');