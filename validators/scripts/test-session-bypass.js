const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  addBypass,
  checkBypass,
  clearBypasses,
  normalizeTtlSeconds,
  validateGateId,
  MAX_TTL_SECONDS
} = require('../../lib/session-bypass');
const { checkDiffHygiene } = require('../../lib/diff-hygiene');

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

function assertThrows(fn, expectedMessage, message) {
  try {
    fn();
    failed++;
    console.error(`  FAIL: ${message}`);
  } catch (err) {
    const ok = String(err.message || err).includes(expectedMessage);
    if (ok) {
      passed++;
      console.log(`  PASS: ${message}`);
    } else {
      failed++;
      console.error(`  FAIL: ${message} (${err.message})`);
    }
  }
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'adp-bypass-test-'));
}

console.log('--- Session Bypass Tests ---');

const tempDir = createTempDir();
try {
  // Setup mock .gitignore
  fs.writeFileSync(path.join(tempDir, '.gitignore'), '# Gitignore\n', 'utf8');

  // Test 1: Check bypass when none exists
  console.log('Running Test 1: Check bypass when none exists');
  const res1 = checkBypass(tempDir, 'diff-hygiene');
  assertTest(res1.bypassed === false, 'no bypass active initially');

  // Test 2: Add and check active bypass
  console.log('Running Test 2: Add and check active bypass');
  addBypass(tempDir, 'diff-hygiene', 10, 'Hotfix for hot issue');
  const res2 = checkBypass(tempDir, 'diff-hygiene');
  assertTest(res2.bypassed === true, 'bypass is active');
  assertTest(res2.reason === 'Hotfix for hot issue', 'reason matches');
  const auditPath = path.join(tempDir, '.ai/signals/bypass.jsonl');
  const auditRecords = fs.readFileSync(auditPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assertTest(auditRecords[0].action === 'add', 'add writes audit record');
  assertTest(auditRecords[0].ttl_seconds === 10, 'audit records ttl');

  // Verify gitignore was updated dynamically
  const gitignoreContent = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf8');
  assertTest(gitignoreContent.includes('.ai/state/session-bypass.json'), '.gitignore updated to ignore session-bypass.json');

  // Test 3: Expired bypass
  console.log('Running Test 3: Expired bypass');
  const bypassPath = path.join(tempDir, '.ai/state/session-bypass.json');
  const bypasses = JSON.parse(fs.readFileSync(bypassPath, 'utf8'));
  bypasses[0].expires_at = new Date(Date.now() - 10000).toISOString(); // 10s ago
  fs.writeFileSync(bypassPath, JSON.stringify(bypasses, null, 2), 'utf8');

  const res3 = checkBypass(tempDir, 'diff-hygiene');
  assertTest(res3.bypassed === false, 'expired bypass is not active');
  const unchangedBypasses = JSON.parse(fs.readFileSync(bypassPath, 'utf8'));
  assertTest(unchangedBypasses.length === 1, 'checkBypass does not mutate stored bypasses');

  // Test 3b: Gate matching is case-insensitive
  console.log('Running Test 3b: Case-insensitive gate matching');
  addBypass(tempDir, 'Diff-Hygiene', 60, 'Mixed-case gate');
  const res3b = checkBypass(tempDir, 'diff-hygiene');
  assertTest(res3b.bypassed === true, 'mixed-case bypass matches lowercase check');
  const normalizedBypasses = JSON.parse(fs.readFileSync(bypassPath, 'utf8'));
  assertTest(normalizedBypasses.length === 1, 'adding same gate with different case replaces old active bypass');
  assertTest(normalizedBypasses[0].gate === 'diff-hygiene', 'stored gate is normalized');

  // Test 4: Clear bypasses
  console.log('Running Test 4: Clear bypasses');
  addBypass(tempDir, 'diff-hygiene', 60, 'Temp bypass');
  const clearedCount = clearBypasses(tempDir);
  const res4 = checkBypass(tempDir, 'diff-hygiene');
  const auditAfterClear = fs.readFileSync(auditPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const lastAudit = auditAfterClear[auditAfterClear.length - 1];
  assertTest(clearedCount === 1, 'clearBypasses returns cleared count');
  assertTest(res4.bypassed === false, 'bypasses cleared successfully');
  assertTest(lastAudit.action === 'clear', 'clear writes audit record');
  assertTest(lastAudit.cleared_count === 1, 'clear audit records cleared count');

  // Test 5: checkDiffHygiene respects bypass
  console.log('Running Test 5: checkDiffHygiene respects bypass');
  addBypass(tempDir, 'diff-hygiene', 60, 'Skip hygiene check');
  
  // checkDiffHygiene should return ok: true even though there are no claims/etc because bypass is active
  const hygieneRes = checkDiffHygiene(tempDir);
  assertTest(hygieneRes.ok === true, 'checkDiffHygiene passes when bypassed');
  assertTest(hygieneRes.warnings.some(w => w.includes('diff-hygiene: BYPASSED')), 'warnings include bypass warning');

  // Test 6: Only secondary gates can be bypassed
  console.log('Running Test 6: Secondary gate allowlist');
  assertTest(validateGateId('budget') === 'budget', 'budget is bypassable');
  assertTest(validateGateId('LEASE') === 'lease', 'gate validation normalizes case');
  assertThrows(() => validateGateId('validate-spec'), 'critical and cannot be bypassed', 'validate-spec cannot be bypassed');
  assertThrows(() => validateGateId('unknown-gate'), 'not a bypassable secondary gate', 'unknown gates are rejected');

  // Test 7: TTL validation is finite and bounded
  console.log('Running Test 7: TTL validation');
  assertTest(normalizeTtlSeconds(undefined) === 3600, 'default TTL is one hour');
  assertTest(normalizeTtlSeconds('15') === 15, 'string TTL parses to integer seconds');
  assertThrows(() => normalizeTtlSeconds('abc'), 'positive integer', 'non-numeric TTL is rejected');
  assertThrows(() => normalizeTtlSeconds(0), 'positive integer', 'zero TTL is rejected');
  assertThrows(() => normalizeTtlSeconds(MAX_TTL_SECONDS + 1), 'seconds or less', 'oversized TTL is rejected');

} catch (err) {
  console.error('Test suite failed with error:', err);
  failed++;
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log(`\nSession Bypass tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
