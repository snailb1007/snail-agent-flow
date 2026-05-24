#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Resolve repo root, supporting override for testing
const repoRoot = process.env.PROJECT_ROOT || process.env.REPO_ROOT || path.resolve(__dirname, '../..');

const runStatePath = path.join(repoRoot, '.ai/state/run-state.json');
const activeFeaturePath = path.join(repoRoot, '.ai/state/active-feature.json');
const specifyFeaturePath = path.join(repoRoot, '.specify/feature.json');

// Helper to update json key value
function updateJsonFile(filePath, key, value) {
  let data = {};
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (content) {
        data = JSON.parse(content);
      }
    } catch (e) {
      // ignore
    }
  }
  data[key] = value;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// 1. Handle resume command/flag
const args = process.argv.slice(2);
const isResume = args.includes('resume') || args.includes('--resume');

if (isResume) {
  if (fs.existsSync(runStatePath)) {
    try {
      const content = fs.readFileSync(runStatePath, 'utf8');
      const runState = JSON.parse(content);
      runState.retry_count = 0;
      runState.consecutive_failures = 0;
      runState.retry_scope = 'none';
      runState.last_gate_status = 'RESUMED';
      runState.last_failed_step = null;
      runState.last_failed_rule = null;
      runState.last_validator_output = null;
      runState.updated_at = new Date().toISOString();
      fs.writeFileSync(runStatePath, JSON.stringify(runState, null, 2), 'utf8');
      console.log('[validator] Resumed successfully. Reset retry counters.');
      process.exit(0);
    } catch (e) {
      console.error('[validator] Error parsing run-state.json during resume:', e.message);
      process.exit(1);
    }
  } else {
    // If run-state does not exist, initialize it to resumed
    const runState = {
      feature_slug: 'unknown',
      spec_path: 'unknown',
      current_phase: 'Spec-Validation',
      last_gate: 'Spec-Validation',
      last_gate_status: 'RESUMED',
      consecutive_failures: 0,
      last_failed_step: null,
      last_failed_rule: null,
      last_validator_output: null,
      retry_count: 0,
      retry_scope: 'none',
      verified_artifacts: [],
      updated_at: new Date().toISOString()
    };
    fs.mkdirSync(path.dirname(runStatePath), { recursive: true });
    fs.writeFileSync(runStatePath, JSON.stringify(runState, null, 2), 'utf8');
    console.log('[validator] Initialized run-state.json as RESUMED.');
    process.exit(0);
  }
}

// 2. Resolve active feature path & slug
let featureSlug = '';
let specPath = '';
let featureDirectory = '';
let pointerSource = '';

// Check .specify/feature.json
if (fs.existsSync(specifyFeaturePath)) {
  try {
    const raw = fs.readFileSync(specifyFeaturePath, 'utf8');
    const data = JSON.parse(raw);
    if (data.feature_directory) {
      featureDirectory = data.feature_directory;
      // Normalize featureDirectory path (e.g. specs/foo/ -> specs/foo)
      const normDir = featureDirectory.replace(/\/+$/, '');
      featureSlug = path.basename(normDir);
      specPath = normDir + '/';
      pointerSource = '.specify/feature.json';
    }
  } catch (e) {
    // ignore
  }
}

// Check .ai/state/active-feature.json if not found
if (!featureSlug && fs.existsSync(activeFeaturePath)) {
  try {
    const raw = fs.readFileSync(activeFeaturePath, 'utf8');
    const data = JSON.parse(raw);
    if (data.spec_path) {
      const normPath = data.spec_path.replace(/\/+$/, '');
      specPath = normPath + '/';
      featureSlug = data.feature_slug || path.basename(normPath);
      featureDirectory = specPath;
      pointerSource = '.ai/state/active-feature.json';
    } else if (data.feature_slug) {
      featureSlug = data.feature_slug;
      specPath = `specs/${featureSlug}/`;
      featureDirectory = specPath;
      pointerSource = '.ai/state/active-feature.json';
    }
  } catch (e) {
    // ignore
  }
}

// Setup state tracking variables
let runState = {};
let runStateValid = true;
let runStateParsingError = null;

// Read run-state.json
if (fs.existsSync(runStatePath)) {
  try {
    const raw = fs.readFileSync(runStatePath, 'utf8').trim();
    if (raw !== '') {
      runState = JSON.parse(raw);
    }
  } catch (e) {
    runStateValid = false;
    runStateParsingError = e.message;
  }
}

// Helper to save run state and ensure its parent directory exists
function saveRunState(state) {
  try {
    fs.mkdirSync(path.dirname(runStatePath), { recursive: true });
    fs.writeFileSync(runStatePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('[validator] Error writing run-state.json:', e.message);
  }
}

// Helper function to handle validation failure
function fail(classification, message, details = '') {
  const prevFailures = runStateValid ? (runState.consecutive_failures || 0) : 0;
  const newFailures = prevFailures + 1;
  
  if (runStateValid) {
    runState.feature_slug = featureSlug || runState.feature_slug || 'unknown';
    runState.spec_path = specPath || runState.spec_path || 'unknown';
    runState.current_phase = runState.current_phase || 'Spec-Validation';
    runState.last_gate = 'Spec-Validation';
    runState.consecutive_failures = newFailures;
    runState.retry_count = newFailures;
    runState.last_failed_step = 'Spec-Validation';
    runState.last_failed_rule = classification;
    
    const fullOutput = message + (details ? '\n' + details : '');
    runState.last_validator_output = fullOutput;
    runState.updated_at = new Date().toISOString();
  }

  console.error(`[validator] Validation FAILED: ${classification}`);
  console.error(message + (details ? '\n' + details : ''));

  if (runStateValid) {
    if (newFailures >= 3) {
      runState.last_gate_status = 'NEEDS_HUMAN_REVIEW';
      // Generate Human Review Packet
      generateHumanReviewPacket(classification, message + (details ? '\n' + details : ''));
      saveRunState(runState);
      process.exit(10);
    } else {
      runState.last_gate_status = 'BLOCKED';
      saveRunState(runState);
      process.exit(1);
    }
  } else {
    // If run-state.json is malformed, we can't write to it reliably without fixing it,
    // but the spec says "fail with Invalid JSON State but still gracefully report the failure".
    // Let's attempt to overwrite it with a fresh clean status
    const cleanState = {
      feature_slug: featureSlug || 'unknown',
      spec_path: specPath || 'unknown',
      current_phase: 'Spec-Validation',
      last_gate: 'Spec-Validation',
      last_gate_status: 'BLOCKED',
      consecutive_failures: 1,
      last_failed_step: 'Spec-Validation',
      last_failed_rule: classification,
      last_validator_output: message + (details ? '\n' + details : ''),
      retry_count: 1,
      retry_scope: 'none',
      verified_artifacts: [],
      updated_at: new Date().toISOString()
    };
    saveRunState(cleanState);
    process.exit(1);
  }
}

// Helper to write human review packet
function generateHumanReviewPacket(failedRule, validatorOutput) {
  const reviewDir = path.join(repoRoot, '.ai/reviews', featureSlug || 'unknown');
  fs.mkdirSync(reviewDir, { recursive: true });
  const reviewPath = path.join(reviewDir, 'human-review.md');
  
  const templatePath = path.join(repoRoot, '.specify/templates/human-review-packet-template.md');
  let templateContent = '';
  
  if (fs.existsSync(templatePath)) {
    templateContent = fs.readFileSync(templatePath, 'utf8');
  } else {
    templateContent = `# Human Review Packet

## Feature
- Feature Slug: \${FEATURE_SLUG}
- Spec Path: \${SPEC_PATH}

## Status
- Current Phase: \${CURRENT_PHASE}
- Failed Gate: \${FAILED_GATE}
- Status: NEEDS_HUMAN_REVIEW

## Blocking Question
The system has paused after 3 consecutive validation failures. What is the blocking issue and recommended action?

## Recommended Answer
[Draft recommended resolution or options for the user]

## Options Considered
1. Retry with modified plan.
2. Defer this validation rule.
3. Accept current validation status manually.

## Affected Artifacts
- Run State: \`.ai/state/run-state.json\`
- Feature Specs: \${SPEC_PATH}spec.md

## Resume Instructions
To resume pipeline execution, resolve the block, reset retries by running:
\`\`\`bash
node validators/scripts/validate-spec.js resume
\`\`\`
`;
  }
  
  let content = templateContent
    .replace(/\${FEATURE_SLUG}/g, featureSlug || 'unknown')
    .replace(/\${SPEC_PATH}/g, specPath || 'unknown')
    .replace(/\${CURRENT_PHASE}/g, (runStateValid && runState.current_phase) || 'Spec-Validation')
    .replace(/\${FAILED_GATE}/g, 'Spec-Validation');
    
  // Inject rule and output details
  content = content.replace(
    'The system has paused after 3 consecutive validation failures. What is the blocking issue and recommended action?',
    `The system has paused after 3 consecutive validation failures.\n\n### Failed Rule\n${failedRule}\n\n### Validator Output\n\`\`\`\n${validatorOutput}\n\`\`\``
  );
  
  content = content.replace(
    '[Draft recommended resolution or options for the user]',
    `Please review the failed rule "${failedRule}" and correct the spec files under ${specPath || 'unknown'}.`
  );
  
  fs.writeFileSync(reviewPath, content, 'utf8');
}

// --- Execution Validation Checks ---

// Check: Malformed run-state.json
if (!runStateValid) {
  fail('Invalid JSON State', `run-state.json is malformed: ${runStateParsingError}`);
}

// Check: Invalid Active Feature Pointer
if (!featureSlug || !specPath || !fs.existsSync(path.join(repoRoot, specPath))) {
  fail('Invalid Active Feature Pointer', `Could not resolve a valid active feature directory from .specify/feature.json or .ai/state/active-feature.json. Resolved path: ${specPath ? path.join(repoRoot, specPath) : 'none'}`);
}

const resolvedSpecDir = path.join(repoRoot, specPath);

// Check 1: Path Drift Checks (FR-004)
// Recursively scan for markdown files in legacy folders
function getMarkdownFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(getMarkdownFiles(fullPath));
    } else if (file.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

const legacyDirs = [
  path.join(repoRoot, '.specify/specs'),
  path.join(repoRoot, 'specs/current'),
  path.join(repoRoot, '.ai/specs')
];

let driftedFiles = [];
for (const dir of legacyDirs) {
  if (fs.existsSync(dir)) {
    driftedFiles = driftedFiles.concat(getMarkdownFiles(dir));
  }
}

if (driftedFiles.length > 0) {
  const fileList = driftedFiles.map(f => path.relative(repoRoot, f)).join(', ');
  fail('Path Drift', `Path Drift detected! Files exist in legacy folders: ${fileList}`);
}

// Check: Competing Spec-Kit files in root or .specify
const competingFiles = ['spec.md', 'plan.md', 'tasks.md'];
for (const file of competingFiles) {
  const rootFilePath = path.join(repoRoot, file);
  if (fs.existsSync(rootFilePath)) {
    fail('Path Drift', `Path Drift detected! Competing Spec-Kit file found in repository root: ${file}`);
  }
  const specifyFilePath = path.join(repoRoot, '.specify', file);
  if (fs.existsSync(specifyFilePath)) {
    fail('Path Drift', `Path Drift detected! Competing Spec-Kit file found in .specify/: ${file}`);
  }
}

// Check 2: Spec-Kit Ownership & Existence of Files (FR-005)
const requiredFiles = ['spec.md', 'plan.md', 'tasks.md'];
const missingFiles = [];

for (const file of requiredFiles) {
  const filePath = path.join(resolvedSpecDir, file);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  fail('Missing Required File', `Missing or empty required files in feature spec directory: ${missingFiles.join(', ')}`);
}

// Check 3: spec.md Heading Rules (FR-006)
const specMdPath = path.join(resolvedSpecDir, 'spec.md');
const specContent = fs.readFileSync(specMdPath, 'utf8');
const specLines = specContent.split(/\r?\n/).map(l => l.trim());

const hasH1 = specLines.some(line => /^#\s+.+/.test(line));
const hasH2Goal = specLines.includes('## Goal');

if (!hasH1 && !hasH2Goal) {
  fail('Missing Required Heading', 'spec.md must contain either an H1 title ("# Title") or H2 heading "## Goal"');
}

const requiredSpecHeadings = [
  '## Non-Goals',
  '## Acceptance Criteria',
  '## Test Strategy',
  '## Behavior-Preservation Rules'
];
const missingSpecHeadings = [];

for (const heading of requiredSpecHeadings) {
  if (!specLines.includes(heading)) {
    missingSpecHeadings.push(heading);
  }
}

if (missingSpecHeadings.length > 0) {
  fail('Missing Required Heading', `spec.md is missing required headings: ${missingSpecHeadings.join(', ')}`);
}

// Check 4: plan.md Heading Rules (FR-007)
const planMdPath = path.join(resolvedSpecDir, 'plan.md');
const planContent = fs.readFileSync(planMdPath, 'utf8');
const planLines = planContent.split(/\r?\n/).map(l => l.trim());

const requiredPlanHeadings = [
  '## Proposed Changes',
  '## Verification Plan'
];
const missingPlanHeadings = [];

for (const heading of requiredPlanHeadings) {
  if (!planLines.includes(heading)) {
    missingPlanHeadings.push(heading);
  }
}

if (missingPlanHeadings.length > 0) {
  fail('Missing Required Heading', `plan.md is missing required headings: ${missingPlanHeadings.join(', ')}`);
}

// Check 5: tasks.md Checklist Rules (FR-008)
const tasksMdPath = path.join(resolvedSpecDir, 'tasks.md');
const tasksContent = fs.readFileSync(tasksMdPath, 'utf8');
const tasksLines = tasksContent.split(/\r?\n/).map(l => l.trim());

const hasChecklist = tasksLines.some(line => /^-\s+\[[ x\/]\]/i.test(line));

if (!hasChecklist) {
  fail('Missing Required Heading', 'tasks.md must contain a checklist of tasks (e.g. lines starting with "- [ ]" or "- [x]")');
}

// Check 6: Placeholder Scan (FR-009)
const forbiddenPlaceholders = [
  'TODO',
  'TBD',
  'NEEDS CLARIFICATION',
  'FIXME',
  'XXX'
];

const placeholderMatches = [];
const filesToScan = [
  { name: 'spec.md', path: specMdPath },
  { name: 'plan.md', path: planMdPath },
  { name: 'tasks.md', path: tasksMdPath }
];

for (const fileObj of filesToScan) {
  const content = fs.readFileSync(fileObj.path, 'utf8');
  const lines = content.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    for (const ph of forbiddenPlaceholders) {
      let isMatch = false;
      if (ph === 'NEEDS CLARIFICATION') {
        if (upperLine.includes('NEEDS CLARIFICATION') || upperLine.includes('[NEEDS CLARIFICATION]')) {
          isMatch = true;
        }
      } else {
        // Use word boundary to avoid false positives in comments/text
        const regex = new RegExp('\\b' + ph + '\\b', 'i');
        if (regex.test(line)) {
          isMatch = true;
        }
      }
      
      if (isMatch) {
        placeholderMatches.push({
          file: fileObj.name,
          lineNum: i + 1,
          content: line.trim(),
          placeholder: ph
        });
      }
    }
  }
}

if (placeholderMatches.length > 0) {
  const details = placeholderMatches
    .map(m => ` - ${m.file}:${m.lineNum}: found "${m.placeholder}" in line: "${m.content}"`)
    .join('\n');
  fail('Open Clarification', `Placeholder scan found forbidden placeholders:`, details);
}

// If all checks pass!
// 1. Reset consecutive_failures, set status to PASS
runState.feature_slug = featureSlug;
runState.spec_path = specPath;
runState.current_phase = runState.current_phase || 'Spec-Validation';
runState.last_gate = 'Spec-Validation';
runState.last_gate_status = 'PASS';
runState.consecutive_failures = 0;
runState.retry_count = 0;
runState.last_failed_step = null;
runState.last_failed_rule = null;
runState.last_validator_output = null;
runState.updated_at = new Date().toISOString();

if (!Array.isArray(runState.verified_artifacts)) {
  runState.verified_artifacts = [];
}

saveRunState(runState);
console.log('[validator] Validation PASSED.');
process.exit(0);
