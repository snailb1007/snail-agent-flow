const fs = require('fs');
const path = require('path');
const os = require('os');
const { profileCommand } = require('../../lib/cmd-profiler');

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adp-cmd-profiler-'));
}

console.log('--- Command Profiler Tests ---');

const tempDir = createTempDir();
try {
  // To avoid shell quote parsing issues on Windows, we write a temp JS script to execute
  const scriptPath = path.join(tempDir, 'test-run.cjs');
  fs.writeFileSync(scriptPath, 'console.log("hello"); console.error("error output"); process.exit(0);', 'utf8');
  const nodeArgs = [scriptPath];

  profileCommand(tempDir, ['node'].concat(nodeArgs)).then((code) => {
    assertTest(code === 0, 'profileCommand returned exit code 0');

    const logPath = path.join(tempDir, '.ai/signals/profile.jsonl');
    assertTest(fs.existsSync(logPath), 'profile.jsonl log file created');

    const content = fs.readFileSync(logPath, 'utf8').trim();
    const metrics = JSON.parse(content);

    assertTest(metrics.command.includes('node'), 'Log contains command string');
    assertTest(metrics.stdout_bytes > 0, `Log contains stdout bytes: ${metrics.stdout_bytes}`);
    assertTest(metrics.stderr_bytes > 0, `Log contains stderr bytes: ${metrics.stderr_bytes}`);
    assertTest(metrics.duration_ms >= 0, `Log contains valid duration: ${metrics.duration_ms} ms`);
    assertTest(metrics.exit_code === 0, 'Log contains correct exit code 0');

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log(`\nCommand Profiler tests: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }).catch((err) => {
    console.error('Promise rejected in test:', err);
    process.exit(1);
  });
} catch (e) {
  console.error('Test threw error:', e);
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(1);
}
