/**
 * Test suite for lib/signal-logger.js
 */

const fs = require('fs');
const path = require('path');
const { logSignal, VALID_SIGNALS } = require('../../lib/signal-logger');

const tempDir = path.resolve(__dirname, '../../.ai/signals-test-log');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertThrows(fn, expectedMsgPart, message) {
  try {
    fn();
    failed++;
    console.error(`  FAIL: ${message} (expected exception)`);
  } catch (e) {
    if (e.message.includes(expectedMsgPart)) {
      passed++;
    } else {
      failed++;
      console.error(`  FAIL: ${message}`);
      console.error(`    Expected error to contain: "${expectedMsgPart}"`);
      console.error(`    Actual error:              "${e.message}"`);
    }
  }
}

console.log('--- signal-logger ---');

// Setup temp directory
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

try {
  // Test 1: Invalid signal type throws error (unlinked signal)
  assertThrows(
    () => logSignal('INVALID_SIGNAL', 42, 'test reason', tempDir),
    'Invalid signal type',
    'throws on invalid signal type'
  );

  // Test 2: Valid signals happy path logging
  const signals = [
    { type: 'phase_duration', value: 1.5, reason: 'completed phase 20' },
    { type: 'revision_count', value: 2, reason: 'minor bug fix cycles' },
    { type: 'escalation_count', value: 0, reason: 'on track' },
    { type: 'test_pain', value: 'High async race complexity', reason: 'lease heartbeat concurrency issues' },
    { type: 'review_flag', value: 'Repeated git config failures', reason: 'CI pipeline validation failures' }
  ];

  for (const sig of signals) {
    const writtenPath = logSignal(sig.type, sig.value, sig.reason, tempDir);
    assert(fs.existsSync(writtenPath), `signal file should exist on disk after logging ${sig.type}`);
  }

  const filePath = path.join(tempDir, 'current-period.md');
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify headers and entries
  assert(content.includes('# RAOS Observability Signals Log'), 'should contain main title header');
  
  for (const sig of signals) {
    assert(content.includes(sig.type.toUpperCase()), `should record signal type: ${sig.type.toUpperCase()}`);
    assert(content.includes(`Value:** ${sig.value}`), `should record signal value: ${sig.value}`);
    assert(content.includes(`Reason:** ${sig.reason}`), `should record signal reason: ${sig.reason}`);
  }

  // Test 3: Default/empty reason
  logSignal('phase_duration', 0.5, '', tempDir);
  const content2 = fs.readFileSync(filePath, 'utf8');
  assert(content2.includes('Reason:** Not specified'), 'empty reason should render as Not specified');

} finally {
  // Clean up temp directory
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    for (const f of files) {
      fs.unlinkSync(path.join(tempDir, f));
    }
    fs.rmdirSync(tempDir);
  }
}

console.log('');
console.log(`Signal logger tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
