const { spawnSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCommand, ['pack', '--dry-run', '--json'], {
  cwd: repoRoot,
  encoding: 'utf8',
  shell: process.platform === 'win32'
});

if (result.status !== 0) {
  throw new Error(`npm pack --dry-run failed: ${result.error ? result.error.message : (result.stderr || result.stdout)}`);
}

const payload = JSON.parse(result.stdout);
const files = new Set((payload[0].files || []).map((entry) => entry.path.replace(/\\/g, '/')));

const required = [
  'bin/adp.js',
  'lib/flow-state.js',
  'lib/validate-drift.js',
  '.specify/templates/atlas-flow.yaml',
  '.claude/skills/atlas-auto-loop/SKILL.md',
  '.claude/skills/atlas-routing/SKILL.md',
  '.claude/skills/atlas-gates/SKILL.md',
  '.claude/skills/atlas-settle/SKILL.md',
  '.claude/skills/atlas-review/SKILL.md',
  '.claude/skills/saf-upgrade/SKILL.md',
  '.claude/skills/contracts/artifact-map.json',
  '.claude/skills/contracts/entities.schema.json',
  '.claude/skills/contracts/gate-result.schema.json'
];

const forbiddenPrefixes = [
  '.planning/',
  '.ai/state/',
  '.ai/sessions/',
  '.git/'
];

const missing = required.filter((file) => !files.has(file));
if (missing.length) {
  throw new Error(`Package is missing required ATLAS assets: ${missing.join(', ')}`);
}

const forbidden = [...files].filter((file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix)));
if (forbidden.length) {
  throw new Error(`Package includes mutable workspace artifacts: ${forbidden.join(', ')}`);
}

console.log('[test-package-inventory] Package contains required ATLAS assets');
