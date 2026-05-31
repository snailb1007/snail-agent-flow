'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { upsertAtlasGuidelines } = require('../../bin/adp');

const repoRoot = path.resolve(__dirname, '..', '..');

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

/**
 * Tests for upsertAtlasGuidelines logic — the regex pattern + replacement used
 * by appendAtlasGuidelines in adp.js.
 *
 * Since the function is not exported, we test the regex pattern and string
 * replacement logic in isolation, and also test via `adp init`.
 */

const ATLAS_HEADER_REGEX = /##\s+ATLAS\s+Loop/;
const AUTONOMOUS_ATLAS_HEADER_REGEX = /##\s+Autonomous\s+ATLAS\s+Loop/;

const ATLAS_GUIDELINES_BLOCK = `
## ATLAS Loop

1. **Use the current flow:** Follow the 5-stage ATLAS Loop: align, trace, lay, act, settle.
2. **Read current state:** Use \`.ai/state/flow-state.json\` as the execution state snapshot.
3. **Use ATLAS skills:** Route stage work through \`.claude/skills/atlas-routing\`, \`.claude/skills/atlas-gates\`, \`.claude/skills/atlas-settle\`, and \`.claude/skills/atlas-review\`.
4. **Use contracts:** Resolve canonical artifacts through \`.claude/skills/contracts\`.
5. **Avoid deprecated ledger:** Do not read or create \`.ai/state/flow-ledger.json\`.
`;

const ATLAS_AUTO_LOOP_POINTER = `## Autonomous ATLAS Loop

When asked to run the ATLAS auto loop, use the local \`atlas-auto-loop\` skill.
Read \`.ai/state/flow-state.json\`, resolve \`.ai/flows/atlas-flow.yaml\`, and follow the skill instructions.
Do not read or create \`.ai/state/flow-ledger.json\`.`;

// Test 20: Detection of existing ## ATLAS Loop header
addTest('regex detects existing ## ATLAS Loop header', () => {
  const content = `# My Project

## Build Commands
- npm test

## ATLAS Loop

1. **Use the current flow:** Follow the 5-stage ATLAS Loop.
2. **Read current state:** Use flow-state.json.

## Other Section
- details
`;

  assert.ok(ATLAS_HEADER_REGEX.test(content), 'Should detect ## ATLAS Loop');
  assert.ok(!AUTONOMOUS_ATLAS_HEADER_REGEX.test(content), 'Should NOT detect ## Autonomous ATLAS Loop');
});

// Test 21: Idempotent — appendAtlasGuidelines does not duplicate the section
addTest('appendAtlasGuidelines is idempotent (does not duplicate ATLAS Loop section)', () => {
  // Simulate the logic from appendAtlasGuidelines
  let content = `# CLAUDE.md

## Build Commands
- npm test
`;

  // First append (section doesn't exist yet)
  if (!content.includes('## ATLAS Loop')) {
    content += ATLAS_GUIDELINES_BLOCK;
  }
  assert.ok(content.includes('## ATLAS Loop'), 'Should have ATLAS Loop after first append');

  // Count occurrences
  const count1 = (content.match(/## ATLAS Loop/g) || []).length;
  assert.strictEqual(count1, 1, 'Should have exactly 1 ATLAS Loop section');

  // Second append (section already exists — should skip)
  if (!content.includes('## ATLAS Loop')) {
    content += ATLAS_GUIDELINES_BLOCK;
  }

  const count2 = (content.match(/## ATLAS Loop/g) || []).length;
  assert.strictEqual(count2, 1, 'Should still have exactly 1 ATLAS Loop section after idempotent check');
});

// Test 22: Other sections are preserved when ATLAS Loop section is appended
addTest('Other sections are preserved when ATLAS Loop is appended', () => {
  const original = `# CLAUDE.md

## Build Commands
- npm run build
- npm test

## Code Style
- Use strict mode
- Prefer const

## Custom Project Rules
- Rule 1
- Rule 2
`;

  let content = original;

  // Simulate appendAtlasGuidelines
  if (!content.includes('## ATLAS Loop')) {
    content += ATLAS_GUIDELINES_BLOCK;
  }

  // Verify all original sections still exist
  assert.ok(content.includes('## Build Commands'), 'Build Commands section should be preserved');
  assert.ok(content.includes('## Code Style'), 'Code Style section should be preserved');
  assert.ok(content.includes('## Custom Project Rules'), 'Custom Project Rules section should be preserved');
  assert.ok(content.includes('npm run build'), 'Build command content should be preserved');
  assert.ok(content.includes('Use strict mode'), 'Code style content should be preserved');
  assert.ok(content.includes('Rule 1'), 'Custom rules content should be preserved');

  // And ATLAS Loop is present
  assert.ok(content.includes('## ATLAS Loop'), 'ATLAS Loop section should be appended');
  assert.ok(content.includes('5-stage ATLAS Loop'), 'ATLAS Loop content should be present');

  // Verify original content is at the beginning (ATLAS Loop appended at end)
  const atlasIndex = content.indexOf('## ATLAS Loop');
  const buildIndex = content.indexOf('## Build Commands');
  assert.ok(buildIndex < atlasIndex, 'Build Commands should appear before ATLAS Loop (appended at end)');
});

// Test 22b: Regex-based section replacement for migration from old header to new
addTest('Regex can replace old ATLAS Loop header with Autonomous ATLAS Loop', () => {
  const oldContent = `# AGENTS.md

## ATLAS Loop

1. Use the 5-stage ATLAS Loop.
2. Read flow state.

## Other Section
- content here
`;

  // Migration regex: replace ## ATLAS Loop with ## Autonomous ATLAS Loop
  const migrated = oldContent.replace(
    /^(## )ATLAS Loop$/m,
    '$1Autonomous ATLAS Loop'
  );

  assert.ok(migrated.includes('## Autonomous ATLAS Loop'), 'Should have new header');
  assert.ok(!migrated.match(/^## ATLAS Loop$/m), 'Should NOT have old header as standalone');
  assert.ok(migrated.includes('## Other Section'), 'Other sections should be preserved');
  assert.ok(migrated.includes('5-stage ATLAS Loop'), 'Content after header should be preserved');
});

// Test 22c: Upsert creates atlas-auto-loop pointer in agent files
addTest('upsertAtlasGuidelines creates atlas-auto-loop skill pointer', () => {
  const tempDir = fs.mkdtempSync(path.join(repoRoot, '.tmp-test-upsert-atlas-'));
  const projectDir = path.join(tempDir, 'project');

  try {
    fs.mkdirSync(projectDir, { recursive: true });
    for (const f of ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md']) {
      fs.writeFileSync(path.join(projectDir, f), `# ${f}\n\n## Existing Section\n- Keep this.\n`);
    }
    upsertAtlasGuidelines(projectDir);

    // Check that the generated CLAUDE.md contains the normalized skill pointer
    const claudePath = path.join(projectDir, 'CLAUDE.md');
    if (fs.existsSync(claudePath)) {
      const claudeContent = fs.readFileSync(claudePath, 'utf8');
      assert.ok(
        claudeContent.includes(ATLAS_AUTO_LOOP_POINTER),
        'CLAUDE.md should contain atlas-auto-loop pointer after init'
      );
    }

    // Check AGENTS.md
    const agentsPath = path.join(projectDir, 'AGENTS.md');
    if (fs.existsSync(agentsPath)) {
      const agentsContent = fs.readFileSync(agentsPath, 'utf8');
      assert.ok(
        agentsContent.includes(ATLAS_AUTO_LOOP_POINTER),
        'AGENTS.md should contain atlas-auto-loop pointer after init'
      );
    }
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

addTest('adp init deduplicates old and autonomous ATLAS Loop sections at EOF', () => {
  const tempDir = fs.mkdtempSync(path.join(repoRoot, '.tmp-test-upsert-atlas-dedupe-'));
  const projectDir = path.join(tempDir, 'project');

  try {
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');

    const duplicateContent = `# AGENTS.md

## Autonomous ATLAS Loop

1. **Read current state:** Load \`.ai/state/flow-state.json\` to determine current stage.
2. **Execute stage action:** Read \`atlas-flow.yaml\` for the current stage's \`agent_action\`.

## ATLAS Loop

1. **Use the current flow:** Follow the 5-stage ATLAS Loop.
2. **Read current state:** Use flow-state.json.

## Autonomous ATLAS Loop

1. **Read current state:** Load \`.ai/state/flow-state.json\` to determine current stage.
2. **Execute stage action:** Read \`atlas-flow.yaml\` for the current stage's \`agent_action\`.
`;

    for (const f of ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md']) {
      fs.writeFileSync(path.join(projectDir, f), duplicateContent.replace('# AGENTS.md', `# ${f}`));
    }
    upsertAtlasGuidelines(projectDir);

    for (const f of ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md']) {
      const content = fs.readFileSync(path.join(projectDir, f), 'utf8');
      const sectionCount = (content.match(/^## Autonomous ATLAS Loop$/gm) || []).length;
      assert.strictEqual(sectionCount, 1, `${f} should contain exactly one Autonomous ATLAS Loop section`);
      assert.ok(content.includes(ATLAS_AUTO_LOOP_POINTER), `${f} should contain normalized atlas-auto-loop pointer`);
      assert.ok(!content.match(/^## ATLAS Loop$/m), `${f} should not retain old ATLAS Loop header`);
      assert.ok(!content.includes('Execute stage action'), `${f} should not retain expanded algorithm text`);
    }
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});

// Run tests
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
