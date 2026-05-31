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
    '.ai/context-packs',
    '.ai/claims',
    '.ai/locks',
    '.ai/signals',
    '.claude/skills/atlas-auto-loop',
    '.claude/skills/atlas-routing',
    '.claude/skills/atlas-gates',
    '.claude/skills/atlas-settle',
    '.claude/skills/atlas-review',
    '.claude/skills/contracts'
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(tempdir, d), { recursive: true });
  }

  // Copy schemas to tempdir for drift validation
  fs.copyFileSync(
    path.resolve(__dirname, '../../.claude/skills/contracts/artifact-map.json'),
    path.join(tempdir, '.claude', 'skills', 'contracts', 'artifact-map.json')
  );
  fs.copyFileSync(
    path.resolve(__dirname, '../../.claude/skills/contracts/entities.schema.json'),
    path.join(tempdir, '.claude', 'skills', 'contracts', 'entities.schema.json')
  );
  fs.copyFileSync(
    path.resolve(__dirname, '../../.claude/skills/contracts/gate-result.schema.json'),
    path.join(tempdir, '.claude', 'skills', 'contracts', 'gate-result.schema.json')
  );

  for (const skill of ['atlas-auto-loop', 'atlas-routing', 'atlas-gates', 'atlas-settle', 'atlas-review']) {
    const src = path.resolve(__dirname, `../../.claude/skills/${skill}`);
    const dest = path.join(tempdir, '.claude', 'skills', skill);
    fs.cpSync(src, dest, { recursive: true });
  }

  // flow yaml
  const flowYaml = `
name: atlas-flow
version: 2.0.0
prerequisites: []
stages:
  - id: align
    name: Align
    skill: atlas-routing
`;
  fs.writeFileSync(path.join(tempdir, '.ai/flows/atlas-flow.yaml'), flowYaml, 'utf8');

  // state JSON
  const stateJson = {
    schema_version: "2.0",
    run_id: "run-123",
    feature_slug: "test-feature",
    risk_profile: "STANDARD",
    work_mode: "FEATURE",
    stage: "align",
    status: "running",
    attempt: 1,
    completed_steps: [],
    pending_step: "align.pending",
    locks: [],
    signals: [],
    consecutive_failures: 0,
    retry_count: 0,
    verified_artifacts: [],
    revision_history: []
  };
  fs.writeFileSync(path.join(tempdir, '.ai/state/flow-state.json'), JSON.stringify(stateJson, null, 2), 'utf8');

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
    fs.unlinkSync(path.join(tempdir, '.ai/flows/atlas-flow.yaml'));
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
    if (!fail.evidence || !fail.evidence.checkedPaths || !fail.evidence.checkedPaths.includes('.ai/flows/atlas-flow.yaml')) {
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
    fs.writeFileSync(path.join(tempdir, '.ai/flows/atlas-flow.yaml'), 'completely_broken_line_with_no_colon', 'utf8');
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

// 5. missing state -> state.exists
addTest('init-checks: missing state produces failure with id=state.exists', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.unlinkSync(path.join(tempdir, '.ai/state/flow-state.json'));
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when state is missing');
    }
    const fail = report.failures.find(f => f.id === 'state.exists');
    if (!fail) {
      throw new Error('Expected failure with id "state.exists"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 6. invalid state schema -> state.schema
addTest('init-checks: invalid state schema produces failure with id=state.schema and evidence.parseError', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    const badState = {
      schema_version: "2.0",
      run_id: "run-123"
      // missing required fields
    };
    fs.writeFileSync(path.join(tempdir, '.ai/state/flow-state.json'), JSON.stringify(badState, null, 2), 'utf8');
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when state schema is invalid');
    }
    const fail = report.failures.find(f => f.id === 'state.schema');
    if (!fail) {
      throw new Error('Expected failure with id "state.schema"');
    }
    if (fail.passed !== false) {
      throw new Error('Expected fail.passed to be false');
    }
    if (!fail.evidence || typeof fail.evidence.parseError !== 'string' || fail.evidence.parseError.length === 0) {
      throw new Error('Expected parseError string in evidence');
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
name: atlas-flow
version: 1.0.0
prerequisites:
  - name: Echo
    command: echo
    check: echo "ok"
stages:
  - id: align
    name: Align
    skill: echo
`;
    fs.writeFileSync(path.join(tempdir, '.ai/flows/atlas-flow.yaml'), flowYaml, 'utf8');
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
name: atlas-flow
version: 1.0.0
prerequisites:
  - name: GSD
    command: gsd-discuss-phase
    check: nonexistent-command-123
stages:
  - id: align
    name: Align
    skill: gsd-discuss-phase
`;
    fs.writeFileSync(path.join(tempdir, '.ai/flows/atlas-flow.yaml'), flowYaml, 'utf8');
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
name: atlas-flow
version: 1.0.0
prerequisites:
  - name: Superpowers
    command: using-superpowers
    check: nonexistent-command-123
stages:
  - id: align
    name: Align
    skill: atlas-routing
`;
    fs.writeFileSync(path.join(tempdir, '.ai/flows/atlas-flow.yaml'), flowYaml, 'utf8');
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

// 12. missing atlas-routing SKILL.md -> skill.atlas.exists
addTest('init-checks: missing atlas-routing SKILL.md produces failure with id=skill.atlas.exists', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.unlinkSync(path.join(tempdir, '.claude/skills/atlas-routing/SKILL.md'));
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when atlas-routing SKILL.md is missing');
    }
    const fail = report.failures.find(f => f.id === 'skill.atlas.exists');
    if (!fail) {
      throw new Error('Expected failure with id "skill.atlas.exists"');
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
        subject: '.ai/flows/atlas-flow.yaml',
        evidence: { parseError: 'Flow YAML file is missing.' }
      },
      {
        id: 'state.exists',
        category: 'artifact',
        required: true,
        passed: false,
        subject: '.ai/state/flow-state.json',
        evidence: { parseError: 'Flow state JSON file is missing.' }
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

// 21. policy.config.exists is warning when absent
addTest('init-checks: policy.config.exists is warning when absent', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    // policy config is absent, so policy.config.exists should fail but NOT ok=false because it is required: false (warning only)
    const report = runStrictChecks(tempdir);
    const failExists = report.results.find(f => f.id === 'policy.config.exists');
    if (!failExists) {
      throw new Error('Expected result with id "policy.config.exists"');
    }
    if (failExists.passed !== false) {
      throw new Error('Expected policy.config.exists to be passed=false');
    }
    if (failExists.required !== false) {
      throw new Error('Expected policy.config.exists to be required=false');
    }
    // policy.config.schema should pass (since it is absent)
    const failSchema = report.results.find(f => f.id === 'policy.config.schema');
    if (!failSchema || failSchema.passed !== true) {
      throw new Error('Expected policy.config.schema to pass when config is absent');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 22. policy.config.schema fails when malformed
addTest('init-checks: policy.config.schema fails when malformed', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.writeFileSync(
      path.join(tempdir, '.ai/state/context-policy.json'),
      JSON.stringify({ schema_version: '1.0', max_parallelism: 99 }), // fails validation
      'utf8'
    );
    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when policy config is malformed');
    }
    const failSchema = report.failures.find(f => f.id === 'policy.config.schema');
    if (!failSchema) {
      throw new Error('Expected failure with id "policy.config.schema"');
    }
    if (failSchema.passed !== false) {
      throw new Error('Expected failSchema.passed to be false');
    }
    if (!failSchema.evidence || typeof failSchema.evidence.parseError !== 'string' || failSchema.evidence.parseError.length === 0) {
      throw new Error('Expected parseError in evidence');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 23. context.packs schema and refs check
addTest('init-checks: context.packs validation fails when context pack has missing files or bad schema', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    // Write malformed context pack (missing required fields)
    fs.writeFileSync(
      path.join(tempdir, '.ai/context-packs/pack1.json'),
      JSON.stringify({ schema_version: '1.0' }),
      'utf8'
    );
    
    // Write a context pack with missing required files
    const validPack = {
      schema_version: '1.0.0',
      created_at: new Date().toISOString(),
      stage_id: 'align',
      objective: 'test',
      required_files: [{ path: 'missing-file-123.md' }],
      omissions: [],
      expected_outputs: [],
      validation_commands: [],
      stop_conditions: []
    };
    fs.writeFileSync(
      path.join(tempdir, '.ai/context-packs/pack2.json'),
      JSON.stringify(validPack),
      'utf8'
    );

    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when context packs are invalid');
    }
    const failSchema = report.failures.find(f => f.id === 'context.packs.schema');
    if (!failSchema || failSchema.passed !== false) {
      throw new Error('Expected context.packs.schema to fail');
    }
    const failRefs = report.failures.find(f => f.id === 'context.packs.refs');
    if (!failRefs || failRefs.passed !== false) {
      throw new Error('Expected context.packs.refs to fail');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 24. context.packs.fanout.conflicts fails when siblings overlap without coordination
addTest('init-checks: context.packs.fanout.conflicts fails when parallel subagents overlap without coordination', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    
    const packA = {
      schema_version: '1.0.0',
      created_at: new Date().toISOString(),
      stage_id: 'stage_a',
      objective: 'test',
      required_files: [],
      omissions: [],
      expected_outputs: [],
      validation_commands: [],
      stop_conditions: [],
      subagent_fanout: {
        group_id: 'group1',
        subagent_index: 0,
        total_subagents: 2,
        write_targets: ['shared-target.md'],
        sequential_inline_fallback: true,
        join_owner: 'parent'
      }
    };

    const packB = {
      schema_version: '1.0.0',
      created_at: new Date().toISOString(),
      stage_id: 'stage_b',
      objective: 'test',
      required_files: [],
      omissions: [],
      expected_outputs: [],
      validation_commands: [],
      stop_conditions: [],
      subagent_fanout: {
        group_id: 'group1',
        subagent_index: 1,
        total_subagents: 2,
        write_targets: ['shared-target.md'], // overlapping target
        sequential_inline_fallback: true,
        join_owner: 'parent'
      }
    };

    fs.writeFileSync(path.join(tempdir, '.ai/context-packs/packA.json'), JSON.stringify(packA), 'utf8');
    fs.writeFileSync(path.join(tempdir, '.ai/context-packs/packB.json'), JSON.stringify(packB), 'utf8');

    const report = runStrictChecks(tempdir);
    if (report.ok) {
      throw new Error('Expected report.ok to be false when sibling write targets overlap without coordination');
    }
    const failConflicts = report.failures.find(f => f.id === 'context.packs.fanout.conflicts');
    if (!failConflicts || failConflicts.passed !== false) {
      throw new Error('Expected context.packs.fanout.conflicts to fail');
    }
    if (!failConflicts.evidence.parseError.includes('Overlap in write targets detected')) {
      throw new Error('Expected overlap error message in conflict failure');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 25. handoff validation checks
addTest('init-checks: handoff.exists and handoff.schema checks works', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    
    // Handoff is absent -> warning only, schema passes
    const report1 = runStrictChecks(tempdir);
    const resultExists1 = report1.results.find(r => r.id === 'handoff.exists');
    if (resultExists1.passed !== false) throw new Error('Handoff exists should be false');
    if (resultExists1.required !== false) throw new Error('Handoff exists should not be required');
    const resultSchema1 = report1.results.find(r => r.id === 'handoff.schema');
    if (resultSchema1.passed !== true) throw new Error('Handoff schema should pass when absent');

    // Malformed handoff -> schema fails
    fs.writeFileSync(
      path.join(tempdir, '.ai/state/context-handoff.json'),
      JSON.stringify({ schema_version: '1.0' }),
      'utf8'
    );
    const report2 = runStrictChecks(tempdir);
    const resultExists2 = report2.results.find(r => r.id === 'handoff.exists');
    if (resultExists2.passed !== true) throw new Error('Handoff exists should be true');
    const resultSchema2 = report2.results.find(r => r.id === 'handoff.schema');
    if (resultSchema2.passed !== false) throw new Error('Handoff schema should fail when malformed');
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 26. instructions.contextPolicySection check
addTest('init-checks: instructions.contextPolicySection fails when heading is missing', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    // Create CLAUDE.md without the heading
    fs.writeFileSync(path.join(tempdir, 'CLAUDE.md'), '# CLAUDE.md\nNo context policy heading here', 'utf8');
    
    const report1 = runStrictChecks(tempdir);
    const failSection = report1.failures.find(f => f.id === 'instructions.contextPolicySection');
    if (!failSection || failSection.passed !== false) {
      throw new Error('Expected instructions.contextPolicySection to fail when heading is absent');
    }

    // Now write with the correct heading
    fs.writeFileSync(
      path.join(tempdir, 'CLAUDE.md'),
      '# CLAUDE.md\n## Context Budget and Subagent Orchestration Policy\n',
      'utf8'
    );
    const report2 = runStrictChecks(tempdir);
    const failSection2 = report2.failures.find(f => f.id === 'instructions.contextPolicySection');
    if (failSection2) {
      throw new Error('Expected instructions.contextPolicySection to pass when heading is present');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

// 27. instructions.behavioralCoreSection check
addTest('init-checks: instructions.behavioralCoreSection fails when heading is missing', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.writeFileSync(path.join(tempdir, 'AGENTS.md'), '# AGENTS.md\nNo behavioral core heading here', 'utf8');

    const report1 = runStrictChecks(tempdir);
    const failSection = report1.failures.find(f => f.id === 'instructions.behavioralCoreSection');
    if (!failSection || failSection.passed !== false) {
      throw new Error('Expected instructions.behavioralCoreSection to fail when heading is absent');
    }

    fs.writeFileSync(
      path.join(tempdir, 'AGENTS.md'),
      '# AGENTS.md\n## Behavioral Core\n',
      'utf8'
    );
    const report2 = runStrictChecks(tempdir);
    const failSection2 = report2.failures.find(f => f.id === 'instructions.behavioralCoreSection');
    if (failSection2) {
      throw new Error('Expected instructions.behavioralCoreSection to pass when heading is present');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

addTest('init-checks: instructions.behavioralCoreSection passes from .ai/instructions/ATLAS.md', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.mkdirSync(path.join(tempdir, '.ai/instructions'), { recursive: true });
    fs.writeFileSync(path.join(tempdir, 'CLAUDE.md'), '# CLAUDE.md\nNo behavioral core heading here', 'utf8');
    fs.writeFileSync(path.join(tempdir, '.ai/instructions/ATLAS.md'), '# ATLAS\n## Behavioral Core\n', 'utf8');

    const report = runStrictChecks(tempdir);
    const failSection = report.failures.find(f => f.id === 'instructions.behavioralCoreSection');
    if (failSection) {
      throw new Error('Expected instructions.behavioralCoreSection to pass from .ai/instructions/ATLAS.md');
    }
  } finally {
    fs.rmSync(tempdir, { recursive: true, force: true });
  }
});

addTest('init-checks: repair guide includes Behavioral Core manual block', () => {
  const tempdir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-init-checks-'));
  try {
    populateGreenfield(tempdir);
    fs.writeFileSync(path.join(tempdir, 'AGENTS.md'), '# AGENTS.md\nNo behavioral core heading here', 'utf8');

    const report = runStrictChecks(tempdir);
    const guide = formatMarkdownGuide(report, { source: 'doctor' });
    if (!guide.includes('## Behavioral Core')) {
      throw new Error('Expected repair guide to include Behavioral Core block');
    }
    if (!guide.includes('State assumptions before implementation')) {
      throw new Error('Expected repair guide to include Behavioral Core checklist text');
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
