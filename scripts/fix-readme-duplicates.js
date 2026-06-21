const fs = require('fs');
const path = 'README.md';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Remove duplicate CLI commands - keep only the first occurrence of each
const lines = content.split('\n');
const seenCommands = new Set();
const uniqueLines = [];
let skipUntilEmpty = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if this is a command line (starts with spaces and has a command name)
  const commandMatch = line.match(/^\s+(hooks|snapshot|restore|profile|bypass|compact-memory|score|claim|lease|checkpoint|signal|onboard-memory|budget|pack)\s/);
  
  if (commandMatch) {
    const cmdName = commandMatch[1];
    if (seenCommands.has(cmdName)) {
      skipUntilEmpty = true;
      continue;
    } else {
      seenCommands.add(cmdName);
    }
  }
  
  if (skipUntilEmpty) {
    if (line.trim() === '' || line.startsWith('```') || line.startsWith('##') || line.startsWith('`budget')) {
      skipUntilEmpty = false;
      uniqueLines.push(line);
    }
    continue;
  }
  
  uniqueLines.push(line);
}

content = uniqueLines.join('\n');

// Fix 2: Remove duplicate docs references at the end
content = content.replace(
  /\n- \[Failure modes runbook\]\(docs\/runbooks\/failure-modes\.md\)\n- \[Compatibility policy\]\(docs\/compatibility-policy\.md\)\n- \[Migration guide\]\(docs\/migration\.md\)$/,
  ''
);

// Fix 3: Fix skills section numbering and remove duplicates
content = content.replace(
  '### 5. Upgrade & Contracts\n* `saf-upgrade`: Version-agnostic upgrade conductor for target projects (AI interprets `saf doctor` output and resolves project-specific conflicts).\n* `contracts`: Schema contracts mapping ATLAS entities and shapes in `.claude/skills/contracts`.\n\n### 6. Workspace Management\n* `gsd-workspace`: Manages isolated branch sandboxes and checkpoint states.\n* `gsd-workstreams`: Manages parallel workstreams with disjoint write targets and checkpoint states.\n\n\n### 4. Utility & Engineering Discipline',
  '### 4. Utility & Engineering Discipline'
);

// Fix 4: Remove duplicate gsd-workspace/gsd-workstreams from section 3
content = content.replace(
  '* `gsd-workspace` / `gsd-workstreams`: Manages isolated branch sandboxes and checkpoint states.\n\n\n### 5. Upgrade & Contracts',
  '* `gsd-workspace` / `gsd-workstreams`: Manages isolated branch sandboxes and checkpoint states.\n\n### 5. Upgrade & Contracts'
);

// Fix 5: Add missing section 4 label
content = content.replace(
  '### Utility & Engineering Discipline',
  '### 4. Utility & Engineering Discipline'
);

fs.writeFileSync(path, content);
console.log('README.md duplicates fixed');