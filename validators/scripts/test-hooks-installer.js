const fs = require('fs');
const path = require('path');
const os = require('os');
const { installHooks, uninstallHooks, statusHooks } = require('../../lib/hooks-installer');

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adp-hooks-test-'));
}

console.log('--- Hooks Installer Tests ---');

const tempDir = createTempDir();
try {
  // Create mock specify templates folder
  const templatesHooksDir = path.join(tempDir, '.specify/templates/hooks');
  fs.mkdirSync(templatesHooksDir, { recursive: true });
  fs.writeFileSync(path.join(templatesHooksDir, 'saf-session-start.cjs'), '// start\n', 'utf8');
  fs.writeFileSync(path.join(templatesHooksDir, 'saf-pre-write.cjs'), '// pre-write\n', 'utf8');
  fs.writeFileSync(path.join(templatesHooksDir, 'saf-stop.cjs'), '// stop\n', 'utf8');

  // Test 1: install (dry-run)
  console.log('Running Test 1: install (dry-run)');
  installHooks(tempDir, { apply: false });
  assertTest(!fs.existsSync(path.join(tempDir, '.claude/settings.json')), 'settings.json not created in dry-run');
  assertTest(!fs.existsSync(path.join(tempDir, '.claude/hooks/saf-session-start.cjs')), 'hook files not copied in dry-run');

  // Test 2: install (apply)
  console.log('Running Test 2: install (apply)');
  installHooks(tempDir, { apply: true });
  const settingsPath = path.join(tempDir, '.claude/settings.json');
  assertTest(fs.existsSync(settingsPath), 'settings.json created on apply');
  assertTest(fs.existsSync(path.join(tempDir, '.claude/hooks/saf-session-start.cjs')), 'saf-session-start.cjs copied');
  assertTest(fs.existsSync(path.join(tempDir, '.claude/hooks/saf-pre-write.cjs')), 'saf-pre-write.cjs copied');
  assertTest(fs.existsSync(path.join(tempDir, '.claude/hooks/saf-stop.cjs')), 'saf-stop.cjs copied');

  let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assertTest(settings.hooks !== undefined, 'hooks key exists in settings.json');
  assertTest(settings.hooks.SessionStart !== undefined, 'SessionStart hook array exists');
  assertTest(settings.hooks.SessionStart.some(h => h._saf === 'SessionStart'), 'SAF SessionStart hook registered');
  assertTest(settings.hooks.Stop !== undefined, 'Stop hook array exists');
  assertTest(settings.hooks.Stop.some(h => h._saf === 'Stop'), 'SAF Stop hook registered');
  assertTest(settings.hooks.PreToolUse !== undefined, 'PreToolUse hook array exists');
  assertTest(settings.hooks.PreToolUse.some(b => b.hooks && b.hooks.some(h => h._saf === 'PreToolUse')), 'SAF PreToolUse hook registered');

  // Test 3: status
  console.log('Running Test 3: status');
  const oldLog = console.log;
  let loggedOutput = '';
  console.log = (...args) => {
    loggedOutput += args.join(' ') + '\n';
  };
  try {
    statusHooks(tempDir);
  } finally {
    console.log = oldLog;
  }
  assertTest(loggedOutput.includes('SessionStart: Registered=YES'), 'Status shows SessionStart registered');
  assertTest(loggedOutput.includes('Stop:         Registered=YES'), 'Status shows Stop registered');
  assertTest(loggedOutput.includes('PreToolUse:   Registered=YES'), 'Status shows PreToolUse registered');

  // Test 4: uninstall
  console.log('Running Test 4: uninstall');
  uninstallHooks(tempDir);
  assertTest(fs.existsSync(settingsPath + '.pre-uninstall.bak'), 'backup pre-uninstall created');
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assertTest(settings.hooks === undefined || settings.hooks.SessionStart === undefined, 'SessionStart hooks removed');
  assertTest(settings.hooks === undefined || settings.hooks.Stop === undefined, 'Stop hooks removed');
  assertTest(settings.hooks === undefined || settings.hooks.PreToolUse === undefined, 'PreToolUse hooks removed');
  assertTest(!fs.existsSync(path.join(tempDir, '.claude/hooks/saf-session-start.cjs')), 'saf-session-start.cjs deleted');
  assertTest(!fs.existsSync(path.join(tempDir, '.claude/hooks/saf-pre-write.cjs')), 'saf-pre-write.cjs deleted');
  assertTest(!fs.existsSync(path.join(tempDir, '.claude/hooks/saf-stop.cjs')), 'saf-stop.cjs deleted');

} catch (err) {
  console.error('Test suite failed with error:', err);
  failed++;
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log(`\nHooks Installer tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
