#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// --- Header Constants ---
const BUDGETS = { '.claude/CLAUDE.md': 2048 };
const SKILL_BUDGET = 3072;
export const BOOTSTRAP_TEMPLATE = 'templates/target-agent-bootstrap.md';
export const ADAPTER_FILES = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'];
export const MANAGED_START_MARKER = '<!-- snailb-skills:start -->';
export const MANAGED_END_MARKER = '<!-- snailb-skills:end -->';
export const IN_SCOPE_SKILLS = [
  '.claude/skills/code-search/SKILL.md',
  '.claude/skills/project-onboarding/SKILL.md',
  '.claude/skills/memory-recall/SKILL.md',
  '.claude/skills/external-research/SKILL.md',
  '.claude/skills/repo-ops/SKILL.md'
];

const REQUIRED_ANTIPATTERNS = {
  '.claude/CLAUDE.md': ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13'],
  '.claude/skills/code-search/SKILL.md': ['A1','A2','A3','A10','A11'],
  '.claude/skills/project-onboarding/SKILL.md': ['A2','A7','A10','A11'],
  '.claude/skills/memory-recall/SKILL.md': ['A4','A7','A8','A9'],
  '.claude/skills/external-research/SKILL.md': ['A3','A6','A10','A12'],
  '.claude/skills/repo-ops/SKILL.md': ['A2','A10','A13']
};

const TYPE_ENUM = new Set(['decision', 'bug', 'pattern', 'api', 'gotcha', 'todo']);
const AID_RE = /\bA([1-9]|1[0-3])\b/g;
const TAGS_LINE_RE = /^\s*(?:example\s+)?tags:/i;
const FENCE_RE = /^```/;
const MARK = '✗';
const REQUIRED_BOOTSTRAP_PHRASES = [
  'Auto-route by default',
  'Users should not manually tag skills',
  'Broad actions like analysis, find, search, and research are operations',
  'Use Context7 MCP',
  'Prefer `rg` and code-search',
  'Use context-mode',
  'Use scoped/tagged memory recall',
  'Skills are internal execution modules selected by the router'
];

// Resident instruction surface guarded against re-forked transport rules and
// machine-specific absolute paths (improvement-plan Phase 2A; §6 "zero drift",
// "zero hardcoded absolute paths"). ADAPTER_FILES are the agent-facing roots;
// .claude/CLAUDE.md is the always-resident routing core.
const RESIDENT_INSTRUCTION_FILES = [...ADAPTER_FILES, '.claude/CLAUDE.md'];
const FORBIDDEN_TRANSPORT_RE = /RTK Token Optimization|Rust Token Killer/;
const ABSOLUTE_PATH_PATTERNS = [
  { re: /file:\/\//, label: 'file:// URI' },
  { re: /\/Volumes\//, label: 'macOS /Volumes/ path' },
  { re: /\/(?:home|Users)\/[A-Za-z0-9._-]+\//, label: 'absolute home-directory path' },
  { re: /\b[A-Za-z]:\\(?:Users|home)\b/i, label: 'Windows absolute user path' }
];
const FORBIDDEN_IMPACT_PATTERNS = [
  { re: /must run impact analysis before editing any symbol/i, label: 'unconditional impact before editing' },
  { re: /never edit a function, class, or method without first running.*impact/i, label: 'unconditional impact before editing' }
];

// --- Helper Functions ---
function getRelativePath(absolutePath, rootDir) {
  return path.relative(rootDir, absolutePath);
}

function getSkillMarkdownFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

// Read a file with line endings normalized to LF. The lint must be deterministic
// across platforms: with git's core.autocrlf=true a Windows checkout yields CRLF
// while Linux CI yields LF, which would otherwise flip exact-byte block matches
// and inflate byte budgets. Comparisons and budgets are measured on LF content.
function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function byteLen(filePath) {
  return Buffer.byteLength(readText(filePath), 'utf8');
}

function countOccurrences(haystack, needle) {
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count += 1;
    idx += needle.length;
  }
  return count;
}

function renderManagedBlock(template) {
  return `${MANAGED_START_MARKER}\n${template.trimEnd()}\n${MANAGED_END_MARKER}`;
}

function validateBootstrapText(content, relPath, violations) {
  for (const phrase of REQUIRED_BOOTSTRAP_PHRASES) {
    if (!content.includes(phrase)) {
      violations.push({
        relPath,
        rule: 'LINT-04',
        detail: `missing bootstrap policy phrase "${phrase}"`
      });
    }
  }
}

function validateManagedAdapter(content, relPath, expectedBlock, violations) {
  const starts = countOccurrences(content, MANAGED_START_MARKER);
  const ends = countOccurrences(content, MANAGED_END_MARKER);
  const startIdx = content.indexOf(MANAGED_START_MARKER);
  const endIdx = content.indexOf(MANAGED_END_MARKER);

  if (starts !== 1 || ends !== 1 || startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    violations.push({
      relPath,
      rule: 'LINT-04',
      detail: 'managed block markers must appear exactly once and in order'
    });
    return;
  }

  const actualBlock = content.slice(startIdx, endIdx + MANAGED_END_MARKER.length);
  if (actualBlock !== expectedBlock) {
    violations.push({
      relPath,
      rule: 'LINT-04',
      detail: 'managed block differs from bootstrap template'
    });
  }
}

// --- Core Lint Function ---
export function lintTree(rootDir) {
  const violations = [];
  const filesChecked = new Set();

  // 1. Byte-budget enforcement (LINT-01 -> BUDG-01, BUDG-02)
  // CLAUDE.md check (BUDG-01)
  const claudePath = '.claude/CLAUDE.md';
  const fullClaudePath = path.join(rootDir, claudePath);
  if (!fs.existsSync(fullClaudePath)) {
    violations.push({
      relPath: claudePath,
      rule: 'LINT-01',
      detail: 'file not found'
    });
  } else {
    filesChecked.add(claudePath);
    const size = byteLen(fullClaudePath);
    if (size > BUDGETS[claudePath]) {
      const delta = size - BUDGETS[claudePath];
      violations.push({
        relPath: claudePath,
        rule: 'BUDG-01',
        detail: `(${size} bytes > 2048)`,
        hint: `Trim ~${delta} bytes from the core routing block.`
      });
    }
  }

  // SKILL.md checks (BUDG-02)
  for (const skillPath of IN_SCOPE_SKILLS) {
    const fullSkillPath = path.join(rootDir, skillPath);
    if (!fs.existsSync(fullSkillPath)) {
      violations.push({
        relPath: skillPath,
        rule: 'LINT-01',
        detail: 'file not found'
      });
    } else {
      filesChecked.add(skillPath);
      const size = byteLen(fullSkillPath);
      if (size > SKILL_BUDGET) {
        const delta = size - SKILL_BUDGET;
        violations.push({
          relPath: skillPath,
          rule: 'BUDG-02',
          detail: `(${size} bytes > 3072)`,
          hint: `Trim ~${delta} bytes.`
        });
      }
    }
  }

  // Bootstrap template + multi-agent adapter validation (LINT-04)
  const templatePath = path.join(rootDir, BOOTSTRAP_TEMPLATE);
  let expectedBlock = null;
  if (!fs.existsSync(templatePath)) {
    violations.push({
      relPath: BOOTSTRAP_TEMPLATE,
      rule: 'LINT-04',
      detail: 'bootstrap template not found'
    });
  } else {
    filesChecked.add(BOOTSTRAP_TEMPLATE);
    const template = readText(templatePath);
    validateBootstrapText(template, BOOTSTRAP_TEMPLATE, violations);
    expectedBlock = renderManagedBlock(template);
  }

  for (const adapterPath of ADAPTER_FILES) {
    const fullAdapterPath = path.join(rootDir, adapterPath);
    if (!fs.existsSync(fullAdapterPath)) {
      violations.push({
        relPath: adapterPath,
        rule: 'LINT-04',
        detail: 'adapter file not found'
      });
      continue;
    }
    filesChecked.add(adapterPath);
    if (expectedBlock) {
      const content = readText(fullAdapterPath);
      validateManagedAdapter(content, adapterPath, expectedBlock, violations);
    }
  }

  // 1b. Anti-regression content checks on the resident instruction surface.
  // LINT-05: no re-forked transport/compression rules (e.g. RTK) — those are a
  // personal global hook, not repo policy. LINT-06: no machine-specific absolute
  // paths — keep instruction files portable across clones and runtimes.
  for (const relPath of RESIDENT_INSTRUCTION_FILES) {
    const fullPath = path.join(rootDir, relPath);
    if (!fs.existsSync(fullPath)) {
      // Missing-file is already reported by the budget / adapter checks above.
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');

    if (FORBIDDEN_TRANSPORT_RE.test(content)) {
      violations.push({
        relPath,
        rule: 'LINT-05',
        detail: 'contains re-forked transport/compression rules (RTK)',
        hint: 'RTK is a personal global hook, not repo policy — remove it from committed instruction files.'
      });
    }

    for (const { re, label } of ABSOLUTE_PATH_PATTERNS) {
      const m = content.match(re);
      if (m) {
        violations.push({
          relPath,
          rule: 'LINT-06',
          detail: `hardcoded absolute path (${label}): "${m[0]}"`,
          hint: 'Use a repo-relative path.'
        });
        break;
      }
    }
  }

  // LINT-07: prevents unconditional "impact before every edit" in instruction and skill files
  const skillFiles = [
    ...getSkillMarkdownFiles(path.join(rootDir, '.claude/skills')),
    ...getSkillMarkdownFiles(path.join(rootDir, '.agents/skills'))
  ].map(p => path.relative(rootDir, p));

  const allInstructionAndSkillFiles = Array.from(new Set([
    ...RESIDENT_INSTRUCTION_FILES,
    ...skillFiles
  ]));

  for (const relPath of allInstructionAndSkillFiles) {
    const fullPath = path.join(rootDir, relPath);
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');

    for (const { re, label } of FORBIDDEN_IMPACT_PATTERNS) {
      if (re.test(content)) {
        violations.push({
          relPath,
          rule: 'LINT-07',
          detail: `contains ${label}`,
          hint: 'Use risk-tiered impact rules instead of unconditional impact before every edit.'
        });
        break;
      }
    }
  }

  // 2. Per-file required anti-pattern presence (LINT-02)
  for (const [relPath, requiredIds] of Object.entries(REQUIRED_ANTIPATTERNS)) {
    const fullPath = path.join(rootDir, relPath);
    if (!fs.existsSync(fullPath)) {
      // Already reported as missing in budget check
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const matches = new Set();
    let match;
    // Reset regex lastIndex
    AID_RE.lastIndex = 0;
    while ((match = AID_RE.exec(content)) !== null) {
      matches.add(match[0]);
    }

    for (const reqId of requiredIds) {
      if (!matches.has(reqId)) {
        violations.push({
          relPath,
          rule: 'LINT-02',
          detail: `missing required anti-pattern ${reqId}`,
          hint: `Add a refusal line referencing ${reqId}.`
        });
      }
    }
  }

  // 3. Tag-schema validation (LINT-03)
  for (const relPath of Object.keys(REQUIRED_ANTIPATTERNS)) {
    const fullPath = path.join(rootDir, relPath);
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);
    let inFence = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNo = i + 1;

      if (FENCE_RE.test(line)) {
        inFence = !inFence;
        continue;
      }

      if (inFence || TAGS_LINE_RE.test(line)) {
        const tokens = line.split(/\s+/).filter(Boolean);
        const candidateTokens = [];
        
        for (const token of tokens) {
          // Strip leading and trailing ` " , ( )
          const stripped = token.replace(/^[`"(),]+|[`"(),]+$/g, '');
          if (stripped.includes('proj:') || stripped.includes('type:')) {
            candidateTokens.push({ original: token, stripped });
          }
        }

        if (candidateTokens.length === 0) {
          continue;
        }

        // Validate collected tokens on this line
        let hasProj = false;
        let hasType = false;
        let hasInvalidType = false;

        for (const { original, stripped } of candidateTokens) {
          if (stripped.startsWith('proj:')) {
            const val = stripped.substring(5);
            if (val.length > 0) {
              hasProj = true;
            }
          } else if (stripped.startsWith('type:')) {
            const val = stripped.substring(5);
            if (TYPE_ENUM.has(val)) {
              hasType = true;
            } else {
              hasInvalidType = true;
              violations.push({
                relPath,
                lineNo,
                rule: 'LINT-03',
                detail: `malformed tag \`${original}\` (type:${val} not in enum decision|bug|pattern|api|gotcha|todo)`
              });
            }
          }
        }

        if (!hasProj) {
          violations.push({
            relPath,
            lineNo,
            rule: 'LINT-03',
            detail: 'malformed tag (missing proj:)'
          });
        }

        if (!hasType && !hasInvalidType) {
          violations.push({
            relPath,
            lineNo,
            rule: 'LINT-03',
            detail: 'malformed tag (missing type:)'
          });
        }
      }
    }
  }

  // Generate formatting and summary
  const formattedViolations = violations.map(v => {
    const lineStr = v.lineNo ? `:${v.lineNo}` : '';
    const hintStr = v.hint ? ` ${v.hint}` : '';
    return `${MARK} ${v.relPath}${lineStr}: ${v.rule} ${v.detail}.${hintStr}`;
  });

  const uniqueFiles = new Set(violations.map(v => v.relPath));
  const summary = formattedViolations.length > 0
    ? `FAIL: ${formattedViolations.length} violation(s) across ${uniqueFiles.size} file(s).`
    : '';

  return { violations: formattedViolations, summary };
}

// --- Self-Test Driver ---
function runSelfTest() {
  const FIXTURES = [
    { dir: 'tests/fixtures/good', expectExit: 0, expectSubstrings: [] },
    { dir: 'tests/fixtures/bad-budget', expectExit: 1, expectSubstrings: ['BUDG-01', 'BUDG-02'] },
    { dir: 'tests/fixtures/bad-antipattern-missing', expectExit: 1, expectSubstrings: ['LINT-02'] },
    { dir: 'tests/fixtures/bad-tag-malformed', expectExit: 1, expectSubstrings: ['LINT-03'] }
  ];

  const __filename = fileURLToPath(import.meta.url);
  const scriptPath = __filename;

  let passed = true;
  const details = [];

  for (const fix of FIXTURES) {
    const fixtureDir = path.resolve(fix.dir);
    if (!fs.existsSync(fixtureDir)) {
      console.error(`SELF-TEST FAIL: fixture not found at ${fix.dir}`);
      process.exit(1);
    }

    const result = spawnSync('node', [scriptPath, '--root', fixtureDir], { encoding: 'utf8' });
    
    if (result.status !== fix.expectExit) {
      passed = false;
      details.push(`${fix.dir}: expected exit ${fix.expectExit}, got ${result.status}`);
      continue;
    }

    let subCheck = true;
    for (const sub of fix.expectSubstrings) {
      if (!result.stdout.includes(sub)) {
        passed = false;
        subCheck = false;
        details.push(`${fix.dir}: output missing expected substring "${sub}"`);
      }
    }

    if (subCheck) {
      console.log(`✓ ${fix.dir} passed.`);
    }
  }

  if (passed) {
    console.log('SELF-TEST PASS (4/4 fixtures).');
    process.exit(0);
  } else {
    console.error('SELF-TEST FAIL:', details.join('; '));
    process.exit(1);
  }
}

// --- Main Entry ---
function main() {
  const args = process.argv.slice(2);
  let selfTest = false;
  let rootDir = process.cwd();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--self-test') {
      selfTest = true;
    } else if (arg === '--root') {
      if (i + 1 < args.length) {
        rootDir = args[++i];
      } else {
        console.error('Usage: npm run validate [-- --self-test] [-- --root <path>]');
        process.exit(2);
      }
    } else {
      console.error('Usage: npm run validate [-- --self-test] [-- --root <path>]');
      process.exit(2);
    }
  }

  if (selfTest) {
    runSelfTest();
  } else {
    const { violations, summary } = lintTree(rootDir);
    if (violations.length > 0) {
      for (const v of violations) {
        console.log(v);
      }
      console.log(summary);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

// If executed directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
