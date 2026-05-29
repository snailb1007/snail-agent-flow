const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { parseYaml } = require('../../lib/yaml-parser');
const { validatePrerequisites } = require('../../lib/tool-validator');

const repoRoot = path.resolve(__dirname, '../..');

console.log('[test-flow-parser] Running Phase 8 Unit Tests...');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failed++;
  }
}

// 1. YAML Parser Tests
test('parse default atlas-flow.yaml', () => {
  const yamlPath = path.join(repoRoot, '.specify/templates/atlas-flow.yaml');
  const yamlStr = fs.readFileSync(yamlPath, 'utf8');
  const parsed = parseYaml(yamlStr);

  assert.strictEqual(parsed.name, 'atlas-flow');
  assert.strictEqual(parsed.version, '2.0.0');
  assert.ok(parsed.description.includes('5-stage ATLAS Loop'));
  
  assert.ok(Array.isArray(parsed.prerequisites));
  assert.strictEqual(parsed.prerequisites.length, 4);
  assert.strictEqual(parsed.prerequisites[0].name, 'Atlas Routing');

  assert.ok(Array.isArray(parsed.stages));
  assert.deepStrictEqual(parsed.stages.map((stage) => stage.id), ['align', 'trace', 'lay', 'act', 'settle']);
  
  // Verify stage details
  assert.strictEqual(parsed.stages[0].id, 'align');
  assert.strictEqual(parsed.stages[0].name, 'Align');
  assert.strictEqual(parsed.stages[0].skill, 'atlas-routing');
  assert.ok(Array.isArray(parsed.stages[0].required_artifacts));
  assert.strictEqual(parsed.stages[0].required_artifacts[0].path, '.ai/state/flow-state.json');
});

test('parse custom-flow-example.yaml', () => {
  const yamlPath = path.join(repoRoot, '.specify/templates/custom-flow-example.yaml');
  const yamlStr = fs.readFileSync(yamlPath, 'utf8');
  const parsed = parseYaml(yamlStr);

  assert.strictEqual(parsed.name, 'custom-feature-flow');
  assert.strictEqual(parsed.version, '1.0.0');
  assert.ok(Array.isArray(parsed.stages));
  assert.strictEqual(parsed.stages.length, 3);
  assert.strictEqual(parsed.stages[0].id, 'custom_spec');
});

test('parse basic inline YAML values', () => {
  const simpleYaml = `
# Comment at top
title: "Testing simple values"
numberValue: 42
booleanTrue: true
booleanFalse: false
nullValue: null
`;
  const parsed = parseYaml(simpleYaml);
  assert.strictEqual(parsed.title, 'Testing simple values');
  assert.strictEqual(parsed.numberValue, 42);
  assert.strictEqual(parsed.booleanTrue, true);
  assert.strictEqual(parsed.booleanFalse, false);
  assert.strictEqual(parsed.nullValue, null);
});

test('parse YAML list of scalars', () => {
  const listYaml = `
items:
  - "apple"
  - "banana"
  - cherry
`;
  const parsed = parseYaml(listYaml);
  assert.deepStrictEqual(parsed.items, ['apple', 'banana', 'cherry']);
});

test('throw error on malformed YAML line', () => {
  const malformedYaml = `
key1: value1
invalid_line_without_colon
key2: value2
`;
  assert.throws(() => {
    parseYaml(malformedYaml);
  }, /Invalid YAML format/);
});

// 2. Tool Validator Tests
test('validatePrerequisites - directory slug derives from command, not name', () => {
  // `speckit-specify` exists at .agents/skills/speckit-specify in this repo.
  // The alias `Spec-Kit` must NOT be used as the directory key.
  const prereqs = [
    { name: 'Spec-Kit', command: 'speckit-specify' }
  ];
  const results = validatePrerequisites(prereqs, repoRoot);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].available, true);
});

test('validatePrerequisites - alias dir does NOT satisfy missing real skill (P1 regression)', () => {
  // Simulate: only the alias dir exists, the real stage command does not.
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'prereq-p1-'));
  fs.mkdirSync(path.join(tmp, '.agents/skills/gsd'), { recursive: true });

  const prereqs = [
    { name: 'GSD', command: 'gsd-discuss-phase-definitely-not-on-path-xyz' }
  ];
  const results = validatePrerequisites(prereqs, tmp);
  assert.strictEqual(results[0].available, false,
    'alias-only directory must not mark prerequisite available');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('validatePrerequisites - check command runs with cwd=repoRoot (P2 regression)', () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'prereq-p2-'));
  fs.mkdirSync(path.join(tmp, '.agents/skills/some-tool'), { recursive: true });

  const originalCwd = process.cwd();
  // Change CWD to somewhere that has no .agents folder.
  process.chdir(require('os').tmpdir());
  try {
    const prereqs = [
      { name: 'SomeTool', check: 'node -e "process.exit(require(\'fs\').existsSync(\'.agents/skills/some-tool\') ? 0 : 1)"' }
    ];
    const results = validatePrerequisites(prereqs, tmp);
    assert.strictEqual(results[0].available, true,
      'check command should resolve relative paths against repoRoot, not process.cwd()');
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('validatePrerequisites - missing tool reporting', () => {
  const prereqs = [
    { name: 'NonExistentToolForTesting', command: 'nonexistent-command-that-fails-xyz' }
  ];

  const results = validatePrerequisites(prereqs, repoRoot);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].name, 'NonExistentToolForTesting');
  assert.strictEqual(results[0].available, false);
  assert.ok(results[0].reason.includes('Could not find skill folder'));
});

console.log(`\n[test-flow-parser] Tests complete: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
