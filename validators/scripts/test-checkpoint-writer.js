/**
 * Test suite for lib/checkpoint-writer.js
 */

const fs = require('fs');
const path = require('path');
const { writeProfileSwitch, VALID_PROFILES } = require('../../lib/checkpoint-writer');

const tempDir = path.resolve(__dirname, '../../.ai/state-test-checkpoint');

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

console.log('--- checkpoint-writer ---');

// Setup temp directory
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

try {
  // Test 1: Invalid source profile
  assertThrows(
    () => writeProfileSwitch({ from: 'INVALID', to: 'STANDARD', reason: 'switching' }, tempDir),
    'Invalid source profile',
    'throws on invalid source profile'
  );

  // Test 2: Invalid target profile
  assertThrows(
    () => writeProfileSwitch({ from: 'STANDARD', to: 'INVALID', reason: 'switching' }, tempDir),
    'Invalid target profile',
    'throws on invalid target profile'
  );

  // Test 3: Happy path write and verification
  const params = {
    from: 'STANDARD',
    to: 'FAST',
    reason: 'Reducing scope for faster iteration',
    completed_files: ['lib/profile-scorer.js', 'bin/adp.js'],
    active_risks: ['None'],
    resume_steps: ['Run npm test', 'Commit files']
  };

  const writtenPath = writeProfileSwitch(params, tempDir);
  assert(fs.existsSync(writtenPath), 'checkpoint file should exist on disk');

  const content = fs.readFileSync(writtenPath, 'utf8');

  // Verify Frontmatter
  assert(content.includes('Status: transient'), 'frontmatter should have Status: transient');
  assert(content.includes('From: STANDARD'), 'frontmatter should have From: STANDARD');
  assert(content.includes('To: FAST'), 'frontmatter should have To: FAST');
  assert(content.includes('Timestamp: '), 'frontmatter should contain Timestamp');

  // Verify four sections
  assert(content.includes('## Transition Reason'), 'should contain Transition Reason section');
  assert(content.includes('## Completed Files'), 'should contain Completed Files section');
  assert(content.includes('## Active Risks'), 'should contain Active Risks section');
  assert(content.includes('## Resume Steps'), 'should contain Resume Steps section');

  // Verify content details
  assert(content.includes('Reducing scope for faster iteration'), 'should include reason text');
  assert(content.includes('- lib/profile-scorer.js'), 'should include completed files list');
  assert(content.includes('- None'), 'should include active risks list');
  assert(content.includes('- Run npm test'), 'should include resume steps list');

  // Test 4: Default/empty values check
  const paramsEmpty = {
    from: 'FAST',
    to: 'FULL',
    reason: ''
  };

  const writtenEmptyPath = writeProfileSwitch(paramsEmpty, tempDir);
  assert(fs.existsSync(writtenEmptyPath), 'empty/minimal checkpoint file should exist');
  
  const contentEmpty = fs.readFileSync(writtenEmptyPath, 'utf8');
  assert(contentEmpty.includes('Not specified'), 'reason should default to Not specified');
  assert(contentEmpty.includes('*None*'), 'empty arrays should render as *None*');

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
console.log(`Checkpoint writer tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
