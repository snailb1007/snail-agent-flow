const fs = require('fs');
const path = require('path');
const os = require('os');
const { runStrictChecks, formatTerminal, formatMarkdownGuide } = require('../../lib/init-checks');

// Test framework
const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

// Helper to populate a default perfect greenfield workspace in a given tempdir
function populateGreenfield(tempdir) {
  const dirs = [
    '.ai/sessions',
    '.ai/memory',
    '.ai/reviews',
    '.ai/state',
    '.ai/flows',
    '.specify/templates',
    'specs',
    '.agents/skills/project-flow',
    '.claude/skills/project-flow'
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(tempdir, d), { recursive: true });
  }

  // flow yaml
  const flowYaml = `
name: rough-project-flow
version: 1.0.0
prerequisites: []
stages:
  - id: decision_discovery
    name: Decision discovery
    skill: project-flow
`;
  fs.writeFileSync(path.join(tempdir, '.ai/flows/rough-project-flow.yaml'), flowYaml, 'utf8');

  // ledger JSON
  const ledgerJson = {
    flow_name: "rough-project-flow",
    flow_version: "1.0.0",
    flow_definition_path: ".ai/flows/rough-project-flow.yaml",
    created_at: "2026-05-26T17:00:00.000Z",
    updated_at: "2026-05-26T17:00:00.000Z",
    stages: [
      {
        "id": "decision_discovery",
        "status": "pending",
        "artifacts": [],
        "gate_result": null,
        "started_at": null,
        "completed_at": null,
        "revision_count": 0
      }
    ],
    current_stage: "decision_discovery",
    revision_history: []
  };
  fs.writeFileSync(path.join(tempdir, '.ai/state/flow-ledger.json'), JSON.stringify(ledgerJson, null, 2), 'utf8');

  // skill project-flow SKILL.md
  const skillMd = `---
name: project-flow
description: "Flow skill"
---
<execution_context>
</execution_context>
`;
  fs.writeFileSync(path.join(tempdir, '.agents/skills/project-flow/SKILL.md'), skillMd, 'utf8');
  fs.writeFileSync(path.join(tempdir, '.claude/skills/project-flow/SKILL.md'), skillMd, 'utf8');

  // constitution
  fs.writeFileSync(path.join(tempdir, '.ai/constitution.md'), '# Constitution', 'utf8');
}

// 1. Greenfield ok=true
addTest('init-checks: greenfield with all required artifacts returns ok=true', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    const report = runStrictChecks(tempdir);
    if (!report.ok) {
      throw new Error(`Expected report.ok to be true, got false. Failures: ${JSON.stringify(report.failures)}`);
    }
    if (report.failures.length !== 0) {
      throw new Error(`Expected 0 failures, got ${report.failures.length}`);
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 2. missing required directory -> dirs.required
addTest('init-checks: missing required directory produces failure with id=dirs.required', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.rmdirSync(path.join(tempdir, '.ai/sessions'));
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when a required dir is missing');
    }
    const fail = report.failures.find(f => f.id === 'dirs.required');
    if (!fail) {
      throw new Error('Expected failure with id "dirs.required"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
    if (!fail.evidence || !fail.evidence.checkedPaths || !fail.evidence.checkedPaths.includes('.ai/sessions')) {
      throw new Error('Evidence shape incorrect for dirs.required');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 3. missing flow YAML -> flow.yaml.exists
addTest('init-checks: missing flow YAML produces failure with id=flow.yaml.exists', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.unlinkSync(path.join(tempdir, '.ai/flows/rough-project-flow.yaml'));
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when flow YAML is missing');
    }
    const fail = report.failures.find(f => f.id === 'flow.yaml.exists');
    if (!fail) {
      throw new Error('Expected failure with id "flow.yaml.exists"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
    if (!fail.evidence || !fail.evidence.checkedPaths || !fail.evidence.checkedPaths.includes('.ai/flows/rough-project-flow.yaml')) {
      throw new Error('Evidence shape incorrect for flow.yaml.exists');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 4. malformed flow YAML -> flow.yaml.parse
addTest('init-checks: malformed flow YAML produces failure with id=flow.yaml.parse and evidence.parseError', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.writeFileSync(path.join(tempdir, '.ai/flows/rough-project-flow.yaml'), 'completely_broken_line_with_no_colon', 'utf8');
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when flow YAML is malformed');
    }
    const fail = report.failures.find(f => f.id === 'flow.yaml.parse');
    if (!fail) {
      throw new Error('Expected failure with id "flow.yaml.parse"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
    if (!fail.evidence || typeof fail.evidence.parseError !== 'string' || fail.evidence.parseError.length === 0) {
      throw new Error('Expected non-empty parseError string in evidence');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 5. missing ledger -> ledger.exists
addTest('init-checks: missing ledger produces failure with id=ledger.exists', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.unlinkSync(path.join(tempdir, '.ai/state/flow-ledger.json'));
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when ledger is missing');
    }
    const fail = report.failures.find(f => f.id === 'ledger.exists');
    if (!fail) {
      throw new Error('Expected failure with id "ledger.exists"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 6. invalid ledger schema -> ledger.schema
addTest('init-checks: invalid ledger schema produces failure with id=ledger.schema and offendingLines', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    const badLedger = {
      flow_name: "",
      current_stage: 123,
      revision_history: "not-an-array"
    };
    fs.writeFileSync(path.join(tempdir, '.ai/state/flow-ledger.json'), JSON.stringify(badLedger, null, 2), 'utf8');
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when ledger schema is invalid');
    }
    const fail = report.failures.find(f => f.id === 'ledger.schema');
    if (!fail) {
      throw new Error('Expected failure with id "ledger.schema"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
    if (!fail.evidence || !Array.isArray(fail.evidence.offendingLines) || fail.evidence.offendingLines.length === 0) {
      throw new Error('Expected offendingLines array in evidence');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 7. valid prerequisite passes
addTest('init-checks: valid prerequisite passes', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    // write a flow YAML with a prerequisite that will succeed
    const flowYaml = `
name: rough-project-flow
version: 1.0.0
prerequisites:
  - name: Echo
    command: echo
    check: echo "ok"
stages:
  - id: decision_discovery
    name: Decision discovery
    skill: echo
`;
    fs.writeFileSync(path.join(tempdir, '.ai/flows/rough-project-flow.yaml'), flowYaml, 'utf8');
    const report = runStrictChecks(tempdir);
    const fail = report.failures.find(f => f.id === 'prereqs.echo');
    if (fail) {
      throw new Error('Expected prerequisite echo to pass, but got a failure');
    }
    const result = report.results.find(r => r.id === 'prereqs.echo');
    if (!result) {
      throw new Error('Expected result for prereqs.echo');
    }
    if (result.passed !== true) {
      throw new Error('Expected prereqs.echo to have passed = true');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 8. missing prereq -> prereqs.<tool>
addTest('init-checks: missing prereq produces failure with category=tool and guidance populated from INSTRUCTIONS_DB', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    const flowYaml = `
name: rough-project-flow
version: 1.0.0
prerequisites:
  - name: GSD
    command: gsd-discuss-phase
    check: nonexistent-command-123
stages:
  - id: decision_discovery
    name: Decision discovery
    skill: gsd-discuss-phase
`;
    fs.writeFileSync(path.join(tempdir, '.ai/flows/rough-project-flow.yaml'), flowYaml, 'utf8');
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when prerequisite is missing');
    }
    const fail = report.failures.find(f => f.id === 'prereqs.gsd');
    if (!fail) {
      throw new Error('Expected failure with id "prereqs.gsd"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
    if (fail.category !== 'tool') {
      throw new Error(`Expected category "tool", got "${fail.category}"`);
    }
    if (!fail.guidance || !fail.guidance.purpose || !fail.guidance.verifyCommand) {
      throw new Error('Expected guidance to be populated from INSTRUCTIONS_DB');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

addTest('init-checks: missing declared prereq fails even when no stage references it', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    const flowYaml = `
name: rough-project-flow
version: 1.0.0
prerequisites:
  - name: Superpowers
    command: using-superpowers
    check: nonexistent-command-123
stages:
  - id: decision_discovery
    name: Decision discovery
    skill: project-flow
`;
    fs.writeFileSync(path.join(tempdir, '.ai/flows/rough-project-flow.yaml'), flowYaml, 'utf8');
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when a declared prerequisite is missing');
    }
    const fail = report.failures.find(f => f.id === 'prereqs.superpowers');
    if (!fail) {
      throw new Error('Expected failure with id "prereqs.superpowers"');
    }
    if (fail.required !== true) {
      throw new Error('Expected declared prerequisite to be required');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 9. localization scan flags @~/foo
addTest('init-checks: localization scan flags @~/foo inside <execution_context>', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    const badSkillMd = `---
name: gsd-test-skill
description: "Test description"
---
<execution_context>
@~/foo
</execution_context>
`;
    fs.mkdirSync(path.join(tempdir, '.agents/skills/gsd-test-skill'), { recursive: true });
    fs.writeFileSync(path.join(tempdir, '.agents/skills/gsd-test-skill/SKILL.md'), badSkillMd, 'utf8');

    const report = runStrictChecks(tempdir);
    const fail = report.failures.find(f => f.id === 'localization.localPaths');
    if (!fail) {
      throw new Error('Expected failure with id "localization.localPaths"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
    if (fail.category !== 'localization') {
      throw new Error(`Expected category "localization", got "${fail.category}"`);
    }
    if (!fail.evidence || !Array.isArray(fail.evidence.offendingLines) || !fail.evidence.offendingLines.includes('@~/foo')) {
      throw new Error('Evidence shape incorrect for localization.localPaths');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 10. localization scan IGNORES literal ~
addTest('init-checks: localization scan IGNORES literal ~ in documentation prose', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    const skillMd = `---
name: gsd-test-skill
description: "Test description"
---
Use ~ for home directory in shell commands.
<execution_context>
</execution_context>
`;
    fs.mkdirSync(path.join(tempdir, '.agents/skills/gsd-test-skill'), { recursive: true });
    fs.writeFileSync(path.join(tempdir, '.agents/skills/gsd-test-skill/SKILL.md'), skillMd, 'utf8');

    const report = runStrictChecks(tempdir);
    const localizationFailures = report.failures.filter(f => f.category === 'localization');
    if (localizationFailures.length > 0) {
      throw new Error(`Expected no localization failures, but got: ${JSON.stringify(localizationFailures)}`);
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 11. localization scan flags missing referenced file
addTest('init-checks: localization scan flags missing referenced file', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    const skillMd = `---
name: gsd-test-skill
description: "Test description"
---
<execution_context>
@.agents/skills/gsd-test-skill/missing-file.md
</execution_context>
`;
    fs.mkdirSync(path.join(tempdir, '.agents/skills/gsd-test-skill'), { recursive: true });
    fs.writeFileSync(path.join(tempdir, '.agents/skills/gsd-test-skill/SKILL.md'), skillMd, 'utf8');

    const report = runStrictChecks(tempdir);
    const fail = report.failures.find(f => f.id === 'localization.copiedRefs');
    if (!fail) {
      throw new Error('Expected failure with id "localization.copiedRefs"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
    if (!fail.evidence || !Array.isArray(fail.evidence.checkedPaths) || !fail.evidence.checkedPaths.includes('.agents/skills/gsd-test-skill/missing-file.md')) {
      throw new Error('Evidence shape incorrect for localization.copiedRefs');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 12. missing project-flow SKILL.md -> skill.projectFlow.exists
addTest('init-checks: missing project-flow SKILL.md produces failure with id=skill.projectFlow.exists', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.unlinkSync(path.join(tempdir, '.agents/skills/project-flow/SKILL.md'));
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when project-flow SKILL.md is missing');
    }
    const fail = report.failures.find(f => f.id === 'skill.projectFlow.exists');
    if (!fail) {
      throw new Error('Expected failure with id "skill.projectFlow.exists"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 13. instruction file missing subagent heading produces category=instruction (NOT tool)
addTest('init-checks: instruction file missing subagent heading produces category=instruction (NOT tool)', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.writeFileSync(path.join(tempdir, 'CLAUDE.md'), '# CLAUDE.md\nNo guidelines heading here', 'utf8');
    const report = runStrictChecks(tempdir);
    const fail = report.failures.find(f => f.id === 'instructions.subagentSection');
    if (!fail) {
      throw new Error('Expected failure with id "instructions.subagentSection"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
    if (fail.category !== 'instruction') {
      throw new Error(`Expected category "instruction", got "${fail.category}"`);
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 14. formatMarkdownGuide renders category=instruction failures with exact literal "Local workflow files incomplete"
addTest('init-checks: formatMarkdownGuide renders category=instruction failures with exact literal "Local workflow files incomplete"', () => {
  const mockReport = {
    ok: false,
    failures: [
      {
        id: 'instructions.subagentSection',
        category: 'instruction',
        required: true,
        passed: false,
        subject: 'CLAUDE.md',
        evidence: { parseError: 'Missing heading' }
      }
    ],
    warnings: []
  };
  const guide = formatMarkdownGuide(mockReport);
  if (!guide.includes('Local workflow files incomplete')) {
    throw new Error('Expected guide to contain exact literal "Local workflow files incomplete"');
  }
});

// 15. formatMarkdownGuide renders `~` literally, never resolves to absolute home
addTest('init-checks: formatMarkdownGuide renders `~` literally, never resolves to absolute home', () => {
  const mockReport = {
    ok: false,
    failures: [
      {
        id: 'prereqs.gsd',
        category: 'tool',
        required: true,
        passed: false,
        subject: 'GSD',
        evidence: { checkedCommand: 'command -v gsd' },
        guidance: {
          purpose: 'Scaffold',
          whyRequired: 'Required',
          detectionHint: 'Hint',
          checkedPaths: ['~/.gemini/config/skills'],
          installCommands: ['cp ~/...'],
          workspaceFallback: 'fallback',
          homeFallback: 'fallback with ~',
          verifyCommand: 'verify'
        }
      }
    ],
    warnings: []
  };
  const guide = formatMarkdownGuide(mockReport);
  if (!guide.includes('~')) {
    throw new Error('Expected guide to render literal "~"');
  }
  const home = os.homedir();
  if (home && guide.includes(home)) {
    throw new Error('Expected guide to not resolve "~" to absolute home path');
  }
});

// 16. runStrictChecks survives EACCES on a skill folder
addTest('init-checks: runStrictChecks survives EACCES on a skill folder', () => {
  if (process.platform === 'win32') return;
  if (process.getuid && process.getuid() === 0) return;

  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  const skillDir = path.join(tempdir, '.agents/skills/gsd-test-skill');
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  try {
    populateGreenfield(tempdir);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(skillMdPath, '---\nname: gsd-test-skill\n---\n', 'utf8');

    // Remove permissions from SKILL.md file
    fs.chmodSync(skillMdPath, 0o000);

    const report = runStrictChecks(tempdir);
    const fail = report.failures.find(f => f.id === 'localization.copiedRefs');
    if (!fail) {
      throw new Error('Expected a localization failure due to EACCES');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
    if (!fail.evidence || !fail.evidence.parseError || !fail.evidence.parseError.includes('EACCES')) {
      throw new Error(`Expected parseError to contain "EACCES", got: ${JSON.stringify(fail.evidence)}`);
    }
  } finally {
    // Restore permissions so we can clean up
    try {
      fs.chmodSync(skillMdPath, 0o600);
    } catch (e) {}
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 17. runStrictChecks survives ENOENT mid-scan
addTest('init-checks: runStrictChecks survives ENOENT mid-scan', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    const skillDir = path.join(tempdir, '.agents/skills/gsd-test-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillMdPath, '---\nname: gsd-test-skill\n---\n', 'utf8');
    
    // Delete it to simulate a missing file (best-effort race simulation)
    fs.unlinkSync(skillMdPath);

    const report = runStrictChecks(tempdir);
    if (report.ok) {
      // should run and not throw
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 18. formatTerminal output is ≤120 chars per line
addTest('init-checks: formatTerminal output is ≤120 chars per line', () => {
  const mockReport = {
    ok: false,
    summary: '3 failure(s), 0 warning(s)',
    failures: [
      {
        id: 'dirs.required',
        category: 'artifact',
        required: true,
        passed: false,
        subject: 'specs',
        evidence: { parseError: 'Directory does not exist: specs' }
      },
      {
        id: 'flow.yaml.exists',
        category: 'artifact',
        required: true,
        passed: false,
        subject: '.ai/flows/rough-project-flow.yaml',
        evidence: { parseError: 'Flow YAML file is missing.' }
      },
      {
        id: 'ledger.exists',
        category: 'artifact',
        required: true,
        passed: false,
        subject: '.ai/state/flow-ledger.json',
        evidence: { parseError: 'Flow ledger JSON file is missing.' }
      }
    ],
    warnings: []
  };
  const termOutput = formatTerminal(mockReport);
  const lines = termOutput.split('\n');
  for (const line of lines) {
    if (line.length > 120) {
      throw new Error(`Expected terminal format line to be <= 120 chars, but got line of length ${line.length}: "${line}"`);
    }
  }
});

// 19. constitution.exists passes when .ai/constitution.md present
addTest('init-checks: constitution.exists passes when .ai/constitution.md present', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    const report1 = runStrictChecks(tempdir);
    const fail1 = report1.failures.find(f => f.id === 'constitution.exists');
    if (fail1) {
      throw new Error('Expected constitution.exists to pass');
    }

    fs.unlinkSync(path.join(tempdir, '.ai/constitution.md'));
    const report2 = runStrictChecks(tempdir);
    const fail2 = report2.failures.find(f => f.id === 'constitution.exists');
    if (!fail2) {
      throw new Error('Expected constitution.exists to fail when file is deleted');
    }
    if (fail2.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 20. featurePointer.active skipped when .specify/feature.json absent
addTest('init-checks: featurePointer.active skipped when .specify/feature.json absent', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    const report1 = runStrictChecks(tempdir);
    const fail1 = report1.failures.find(f => f.id === 'featurePointer.active');
    if (fail1) {
      throw new Error('Expected featurePointer.active to be skipped when feature.json is absent');
    }

    fs.writeFileSync(
      path.join(tempdir, '.specify/feature.json'),
      JSON.stringify({ feature_directory: 'specs/does-not-exist' }),
      'utf8'
    );
    const report2 = runStrictChecks(tempdir);
    const fail2 = report2.failures.find(f => f.id === 'featurePointer.active');
    if (!fail2) {
      throw new Error('Expected featurePointer.active to fail when feature_directory does not exist');
    }
    if (fail2.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }

    fs.mkdirSync(path.join(tempdir, 'specs/valid-feature'), { recursive: true });
    fs.writeFileSync(
      path.join(tempdir, '.specify/feature.json'),
      JSON.stringify({ feature_directory: 'specs/valid-feature' }),
      'utf8'
    );
    const report3 = runStrictChecks(tempdir);
    const fail3 = report3.failures.find(f => f.id === 'featurePointer.active');
    if (fail3) {
      throw new Error('Expected featurePointer.active to pass when feature_directory exists');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// Run all tests
let failedCount = 0;
console.log('Running init-checks unit tests...\n');

for (const t of tests) {
  try {
    t.fn();
    console.log(`✅ PASS: ${t.name}`);
  } catch (err) {
    console.error(`❌ FAIL: ${t.name}`);
    console.error(`   Error: ${err.message}`);
    console.error(err.stack);
    failedCount++;
  }
}

console.log('\n--- Init Checks Test Summary ---');
console.log(`Passed: ${tests.length - failedCount}/${tests.length}`);
if (failedCount > 0) {
  console.error(`Failed: ${failedCount}`);
  process.exit(1);
} else {
  console.log('All init-checks unit tests passed successfully!');
  process.exit(0);
}
