'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { checkDiffHygiene } = require('../../lib/diff-hygiene');
const { ClaimManager } = require('../../lib/claim-manager');

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

function createProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-diff-hygiene-'));
  fs.mkdirSync(path.join(tempDir, '.ai', 'claims'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'README.md'), '# test\n', 'utf8');
  return tempDir;
}

function fakeGit({ tracked = [], untracked = [], outsideGit = false }) {
  return (args) => {
    if (outsideGit) {
      return { status: 128, stdout: '', stderr: 'fatal: not a git repository' };
    }
    const key = args.join(' ');
    if (key === 'diff --name-only HEAD --') {
      return { status: 0, stdout: tracked.join('\n'), stderr: '' };
    }
    if (key === 'ls-files --others --exclude-standard') {
      return { status: 0, stdout: untracked.join('\n'), stderr: '' };
    }
    return { status: 1, stdout: '', stderr: `unexpected git args: ${key}` };
  };
}

function claim(tempDir, task, scope) {
  const manager = new ClaimManager(path.join(tempDir, '.ai', 'claims'));
  manager.claim(task, { owner: 'agent', profile: 'FAST', scope });
}

addTest('exact file scope match passes', () => {
  const tempDir = createProject();
  try {
    fs.mkdirSync(path.join(tempDir, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'lib', 'foo.js'), 'module.exports = 1;\n', 'utf8');
    claim(tempDir, 'task-foo', ['lib/foo.js']);

    const result = checkDiffHygiene(tempDir, { gitRunner: fakeGit({ untracked: ['lib/foo.js'] }) });
    assert.deepStrictEqual(result.outOfScopeFiles, []);
    assert.strictEqual(result.activeClaimCount, 1);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

addTest('directory scope matches only when scope ends with slash', () => {
  const tempDir = createProject();
  try {
    fs.mkdirSync(path.join(tempDir, 'lib', 'nested'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'lib', 'nested', 'foo.js'), 'module.exports = 1;\n', 'utf8');
    claim(tempDir, 'task-dir', ['lib/']);

    const result = checkDiffHygiene(tempDir, { gitRunner: fakeGit({ untracked: ['lib/nested/foo.js'] }) });
    assert.deepStrictEqual(result.outOfScopeFiles, []);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

addTest('sibling file is out of scope for exact file scope', () => {
  const tempDir = createProject();
  try {
    fs.mkdirSync(path.join(tempDir, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'lib', 'foo.test.js'), 'module.exports = 1;\n', 'utf8');
    claim(tempDir, 'task-foo', ['lib/foo.js']);

    const result = checkDiffHygiene(tempDir, { gitRunner: fakeGit({ untracked: ['lib/foo.test.js'] }) });
    assert.deepStrictEqual(result.outOfScopeFiles, ['lib/foo.test.js']);
    assert.ok(result.warnings.some((entry) => entry.includes('changed files outside active claim scope')));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

addTest('stale raw claim files are ignored', () => {
  const tempDir = createProject();
  try {
    fs.mkdirSync(path.join(tempDir, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'lib', 'stale-covered.js'), 'module.exports = 1;\n', 'utf8');
    fs.writeFileSync(
      path.join(tempDir, '.ai', 'claims', 'stale.json'),
      JSON.stringify({
        owner: 'old-agent',
        pid: 99999999,
        acquired_at: '2000-01-01T00:00:00.000Z',
        stale_lock_cap_seconds: 1,
        task: 'stale',
        status: 'active',
        scope: ['lib/']
      }, null, 2),
      'utf8'
    );
    claim(tempDir, 'task-readme', ['README.md']);

    const result = checkDiffHygiene(tempDir, { gitRunner: fakeGit({ untracked: ['lib/stale-covered.js'] }) });
    assert.deepStrictEqual(result.claimScopes, ['README.md']);
    assert.deepStrictEqual(result.outOfScopeFiles, ['lib/stale-covered.js']);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

addTest('zero active claims returns a single skip warning and no out-of-scope files', () => {
  const tempDir = createProject();
  try {
    fs.writeFileSync(path.join(tempDir, 'fast.js'), 'module.exports = 1;\n', 'utf8');

    const result = checkDiffHygiene(tempDir, { gitRunner: fakeGit({ untracked: ['fast.js'] }) });
    assert.strictEqual(result.activeClaimCount, 0);
    assert.deepStrictEqual(result.claimScopes, []);
    assert.deepStrictEqual(result.outOfScopeFiles, []);
    assert.deepStrictEqual(result.warnings, ['diff-hygiene: skipped, no active claim scope']);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

addTest('multiple active claims union scopes and warn', () => {
  const tempDir = createProject();
  try {
    fs.mkdirSync(path.join(tempDir, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'lib', 'one.js'), 'module.exports = 1;\n', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'docs.md'), 'docs\n', 'utf8');
    claim(tempDir, 'task-one', ['lib/']);
    claim(tempDir, 'task-two', ['docs.md']);

    const result = checkDiffHygiene(tempDir, { gitRunner: fakeGit({ untracked: ['lib/one.js', 'docs.md'] }) });
    assert.strictEqual(result.activeClaimCount, 2);
    assert.deepStrictEqual(result.outOfScopeFiles, []);
    assert.ok(result.warnings.some((entry) => entry.includes('multiple active claim scopes')));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

addTest('non-git repo returns skip warning without failure', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-diff-hygiene-nongit-'));
  try {
    fs.writeFileSync(path.join(tempDir, 'file.js'), 'module.exports = 1;\n', 'utf8');

    const result = checkDiffHygiene(tempDir, { gitRunner: fakeGit({ outsideGit: true }) });
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.changedFiles, []);
    assert.deepStrictEqual(result.outOfScopeFiles, []);
    assert.deepStrictEqual(result.warnings, ['diff-hygiene: skipped outside git repository']);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

let failed = false;
for (const test of tests) {
  try {
    test.fn();
    console.log(`[PASS] ${test.name}`);
  } catch (err) {
    console.error(`[FAIL] ${test.name}:`, err.message);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
