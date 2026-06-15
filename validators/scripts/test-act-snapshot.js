const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { handleSnapshot, handleRestore } = require('../../lib/act-snapshot');

let passed = 0;
let failed = 0;

function assertTest(condition, message) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adp-act-snapshot-'));
}

console.log('--- Act Snapshot & Restore Tests ---');

const tempDir = createTempDir();
try {
  // Initialize git repo
  execSync('git init', { cwd: tempDir, stdio: 'ignore' });
  execSync('git config user.name "Test Agent"', { cwd: tempDir, stdio: 'ignore' });
  execSync('git config user.email "test@agent.com"', { cwd: tempDir, stdio: 'ignore' });

  // Create initial commit
  const testFile = path.join(tempDir, 'file.txt');
  fs.writeFileSync(testFile, 'initial content\n', 'utf8');
  execSync('git add file.txt', { cwd: tempDir, stdio: 'ignore' });
  execSync('git commit -m "initial commit"', { cwd: tempDir, stdio: 'ignore' });

  // Setup active feature pointer
  fs.mkdirSync(path.join(tempDir, '.specify'), { recursive: true });
  fs.writeFileSync(
    path.join(tempDir, '.specify/feature.json'),
    JSON.stringify({ feature_directory: 'specs/024-test-feature' }, null, 2),
    'utf8'
  );

  // Test 1: Snapshot with no changes
  console.log('Running Test 1: Snapshot with no changes');
  handleSnapshot(tempDir, ['--label', 'no-changes-test']);

  const dbPath = path.join(tempDir, '.ai/state/act-checkpoints.json');
  assertTest(fs.existsSync(dbPath), 'act-checkpoints.json created');
  let db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  assertTest(db.length === 1, 'One checkpoint recorded');
  assertTest(db[0].label === 'no-changes-test', 'Label matches');
  const initialHeadSha = execSync('git rev-parse HEAD', { cwd: tempDir, encoding: 'utf8' }).trim();
  assertTest(db[0].sha === initialHeadSha, 'SHA matches initial HEAD commit');

  // Test 2: Snapshot with changes
  console.log('Running Test 2: Snapshot with changes');
  fs.writeFileSync(testFile, 'modified content\n', 'utf8');
  handleSnapshot(tempDir, ['--label', 'changes-test']);

  db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  assertTest(db.length === 2, 'Second checkpoint recorded');
  assertTest(db[1].label === 'changes-test', 'Second label matches');
  assertTest(db[1].sha !== initialHeadSha, 'SHA is different from initial HEAD commit');

  // Test 3: List snapshots (capturing stdout)
  console.log('Running Test 3: List snapshots');
  const oldLog = console.log;
  let loggedOutput = '';
  console.log = (...args) => {
    loggedOutput += args.join(' ') + '\n';
  };
  try {
    handleSnapshot(tempDir, ['--list']);
  } finally {
    console.log = oldLog;
  }
  assertTest(loggedOutput.includes('ID: 1'), 'Lists ID 1');
  assertTest(loggedOutput.includes('ID: 2'), 'Lists ID 2');
  assertTest(loggedOutput.includes('no-changes-test'), 'Lists no-changes-test label');

  // Test 4: Soft restore (stash apply)
  console.log('Running Test 4: Soft restore');
  // First clean working directory by resetting to HEAD
  execSync('git reset --hard HEAD', { cwd: tempDir, stdio: 'ignore' });
  assertTest(fs.readFileSync(testFile, 'utf8').replace(/\r/g, '') === 'initial content\n', 'Reset to initial content');

  // Restore ID 2 (which has 'modified content')
  handleRestore(tempDir, ['2']);
  assertTest(fs.readFileSync(testFile, 'utf8').replace(/\r/g, '') === 'modified content\n', 'Soft restore applied modifications');

  // Test 5: Hard restore
  console.log('Running Test 5: Hard restore');
  // Make uncommitted changes
  fs.writeFileSync(testFile, 'more changes\n', 'utf8');

  // Restore ID 1 (which was the initial HEAD) hard
  handleRestore(tempDir, ['1', '--hard', '--yes']);
  assertTest(fs.readFileSync(testFile, 'utf8').replace(/\r/g, '') === 'initial content\n', 'Hard restore reset to initial content');

  // Test 6: Malicious checkpoint SHA is passed as an argv value, not shell-interpolated
  console.log('Running Test 6: Restore rejects malicious SHA without shell execution');
  const injectionMarker = path.join(tempDir, 'injection-marker.txt');
  db.push({
    id: 99,
    sha: `HEAD && node -e "require('fs').writeFileSync('${injectionMarker.replace(/\\/g, '\\\\')}', 'pwned')"`,
    label: 'malicious-sha',
    stage: 'act',
    feature_slug: '024-test-feature',
    created_at: new Date().toISOString()
  });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  handleRestore(tempDir, ['99']);
  assertTest(!fs.existsSync(injectionMarker), 'malicious SHA did not execute shell payload');

} catch (err) {
  console.error('Test suite failed with error:', err);
  failed++;
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log(`\nAct Snapshot tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
