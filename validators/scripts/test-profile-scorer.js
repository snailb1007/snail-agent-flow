/**
 * Test suite for lib/profile-scorer.js
 */

const { score } = require('../../lib/profile-scorer');

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

console.log('--- score ---');

// Table-driven tests for totals
const happyPathCases = [
  {
    input: { novelty: 0, blast_radius: 0, ambiguity: 0, reversibility: 0, user_biz_risk: 0 },
    expectedTotal: 0,
    expectedProfile: 'FAST'
  },
  {
    input: { novelty: 1, blast_radius: 0, ambiguity: 1, reversibility: 0, user_biz_risk: 0 },
    expectedTotal: 2,
    expectedProfile: 'FAST'
  },
  {
    input: { novelty: 1, blast_radius: 1, ambiguity: 1, reversibility: 0, user_biz_risk: 0 },
    expectedTotal: 3,
    expectedProfile: 'STANDARD'
  },
  {
    input: { novelty: 1, blast_radius: 1, ambiguity: 1, reversibility: 1, user_biz_risk: 1 },
    expectedTotal: 5,
    expectedProfile: 'STANDARD'
  },
  {
    input: { novelty: 2, blast_radius: 1, ambiguity: 1, reversibility: 1, user_biz_risk: 1 },
    expectedTotal: 6,
    expectedProfile: 'FULL'
  },
  {
    input: { novelty: 2, blast_radius: 2, ambiguity: 2, reversibility: 2, user_biz_risk: 2 },
    expectedTotal: 10,
    expectedProfile: 'FULL'
  }
];

for (const c of happyPathCases) {
  const res = score(c.input);
  assert(res.total === c.expectedTotal, `score: expected total ${c.expectedTotal}, got ${res.total}`);
  assert(res.profile === c.expectedProfile, `score: expected profile ${c.expectedProfile}, got ${res.profile}`);
  assert(res.dimensions.novelty === c.input.novelty, 'score: dimensions novelty should match');
}

// Override precedence tests
{
  const res = score({ novelty: 2, blast_radius: 2, ambiguity: 2, reversibility: 2, user_biz_risk: 2, override: 'BUGFIX' });
  assert(res.total === 10, 'score override BUGFIX: total should still be 10');
  assert(res.profile === 'BUGFIX', 'score override BUGFIX: profile should be BUGFIX');
}
{
  const res = score({ novelty: 2, blast_radius: 2, ambiguity: 2, reversibility: 2, user_biz_risk: 2, override: 'PROTOTYPE' });
  assert(res.total === 10, 'score override PROTOTYPE: total should still be 10');
  assert(res.profile === 'PROTOTYPE', 'score override PROTOTYPE: profile should be PROTOTYPE');
}

// Invalid input tests
assertThrows(() => score(null), 'Task must be a valid object', 'score: null task throws');
assertThrows(() => score({ novelty: 1, blast_radius: 1, ambiguity: 1, reversibility: 1 }), 'Missing required dimension: user_biz_risk', 'score: missing user_biz_risk throws');
assertThrows(() => score({ novelty: 1, blast_radius: 1, ambiguity: 1, reversibility: 1, user_biz_risk: -1 }), 'Invalid value for dimension user_biz_risk', 'score: negative dimension throws');
assertThrows(() => score({ novelty: 1, blast_radius: 1, ambiguity: 1, reversibility: 1, user_biz_risk: 3 }), 'Invalid value for dimension user_biz_risk', 'score: dimension > 2 throws');
assertThrows(() => score({ novelty: 1, blast_radius: 1, ambiguity: 1.5, reversibility: 1, user_biz_risk: 1 }), 'Invalid value for dimension ambiguity', 'score: float dimension throws');
assertThrows(() => score({ novelty: 1, blast_radius: 1, ambiguity: '2', reversibility: 1, user_biz_risk: 1 }), 'Invalid value for dimension ambiguity', 'score: string dimension throws');

console.log('');
console.log(`Profile scorer tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
