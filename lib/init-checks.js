const fs = require('fs');
const path = require('path');
const os = require('os');
const { extractExecutionContextBlocks, findSuspiciousAtLines } = require('./skill-md-parser');

/**
 * Runs strict deterministic post-init validation checks.
 *
 * @param {string} repoRoot - Absolute path to the repository root.
 * @param {object} [opts] - Optional parameters.
 * @returns {object} Structured report: { ok, summary, results, failures, warnings }
 */
function runStrictChecks(repoRoot, opts = {}) {
  const results = [];

  // 1. dirs.required: Check required directories
  const dirs = [
    '.ai/sessions',
    '.ai/memory',
    '.ai/reviews',
    '.ai/state',
    '.ai/flows',
    '.specify/templates',
    'specs',
    '.ai/context-packs'
  ];

  for (const d of dirs) {
    const fullPath = path.join(repoRoot, d);
    let passed = false;
    let errCode = '';
    let errMsg = '';
    try {
      passed = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    } catch (e) {
      passed = false;
      errCode = e.code || 'FS_ERROR';
      errMsg = e.message;
    }
    results.push({
      id: 'dirs.required',
      category: 'artifact',
      required: true,
      passed,
      subject: d,
      evidence: {
        checkedPaths: [d],
        parseError: passed ? undefined : (errMsg ? `${errCode}: ${errMsg}` : `Directory does not exist: ${d}`)
      },
      guidance: null
    });
  }

  // 2. flow.yaml.exists & flow.yaml.parse
  const flowPath = '.ai/flows/rough-project-flow.yaml';
  const fullFlowPath = path.join(repoRoot, flowPath);
  let flowExists = false;
  try {
    flowExists = fs.existsSync(fullFlowPath);
  } catch (e) {
    flowExists = false;
  }

  results.push({
    id: 'flow.yaml.exists',
    category: 'artifact',
    required: true,
    passed: flowExists,
    subject: flowPath,
    evidence: {
      checkedPaths: [flowPath],
      parseError: flowExists ? undefined : 'Flow YAML file is missing.'
    },
    guidance: null
  });

  let flowDef = null;
  let flowParseError = null;
  if (flowExists) {
    try {
      const { parseYaml } = require('./yaml-parser');
      const flowYaml = fs.readFileSync(fullFlowPath, 'utf8');
      flowDef = parseYaml(flowYaml);
    } catch (e) {
      flowParseError = e.message;
    }

    results.push({
      id: 'flow.yaml.parse',
      category: 'artifact',
      required: true,
      passed: !flowParseError && !!flowDef,
      subject: flowPath,
      evidence: {
        parseError: flowParseError || undefined
      },
      guidance: null
    });
  }

  // 3. ledger.exists & ledger.schema
  const ledgerPath = '.ai/state/flow-ledger.json';
  const fullLedgerPath = path.join(repoRoot, ledgerPath);
  let ledgerExists = false;
  try {
    ledgerExists = fs.existsSync(fullLedgerPath);
  } catch (e) {
    ledgerExists = false;
  }

  results.push({
    id: 'ledger.exists',
    category: 'artifact',
    required: true,
    passed: ledgerExists,
    subject: ledgerPath,
    evidence: {
      checkedPaths: [ledgerPath],
      parseError: ledgerExists ? undefined : 'Flow ledger JSON file is missing.'
    },
    guidance: null
  });

  if (ledgerExists) {
    let ledgerValid = false;
    let ledgerParseError = null;
    let ledgerErrors = [];
    try {
      const { validateLedger } = require('./flow-engine');
      const ledgerJson = fs.readFileSync(fullLedgerPath, 'utf8');
      const ledger = JSON.parse(ledgerJson);
      const valResult = validateLedger(ledger);
      ledgerValid = valResult.valid;
      ledgerErrors = valResult.errors || [];
    } catch (e) {
      ledgerParseError = e.message;
    }

    results.push({
      id: 'ledger.schema',
      category: 'artifact',
      required: true,
      passed: ledgerValid && !ledgerParseError,
      subject: ledgerPath,
      evidence: {
        parseError: ledgerParseError || (ledgerErrors.length ? ledgerErrors.join('; ') : undefined),
        offendingLines: ledgerErrors.length ? ledgerErrors : undefined
      },
      guidance: null
    });
  }

  // 4. prereqs.<tool> Checks
  if (flowDef && Array.isArray(flowDef.prerequisites)) {
    try {
      const { validatePrerequisites, getToolInstructions } = require('./tool-validator');
      const prereqResults = validatePrerequisites(flowDef.prerequisites, repoRoot);

      for (const res of prereqResults) {
        const pre = flowDef.prerequisites.find(p => p.name === res.name);
        const consumingStages = [];

        if (pre && Array.isArray(flowDef.stages)) {
          const preName = (pre.name || '').toLowerCase();
          const preCmd = (pre.command || '').toLowerCase();
          for (const stage of flowDef.stages) {
            const skill = (stage.skill || '').toLowerCase();
            const command = (stage.command || '').toLowerCase();
            const matchesSkill = skill && (skill.includes(preName) || (preCmd && skill.includes(preCmd)));
            const matchesCmd = command && (command.includes(preName) || (preCmd && command.includes(preCmd)));
            if (matchesSkill || matchesCmd) {
              consumingStages.push(stage.name || stage.id);
            }
          }
        }

        const guidance = getToolInstructions(res.name);

        results.push({
          id: `prereqs.${res.name.toLowerCase()}`,
          category: 'tool',
          required: true,
          passed: res.available,
          subject: res.name,
          evidence: {
            checkedPaths: guidance ? guidance.checkedPaths : undefined,
            checkedCommand: pre ? pre.check || (pre.command ? `command -v ${pre.command.split(/\s+/)[0]}` : undefined) : undefined,
            stage: consumingStages.length ? consumingStages.join(', ') : undefined,
            parseError: res.available ? undefined : (res.reason ? `${res.reason} (MISSING)` : `Tool "${res.name}" is missing. (MISSING)`)
          },
          guidance
        });
      }
    } catch (e) {
      results.push({
        id: 'prereqs.validation',
        category: 'tool',
        required: true,
        passed: false,
        subject: 'prerequisites',
        evidence: { parseError: e.message },
        guidance: null
      });
    }
  }

  // 5. localization.copiedRefs & localization.localPaths
  const skillBases = ['.agents/skills', '.claude/skills'];
  for (const base of skillBases) {
    const fullBase = path.join(repoRoot, base);
    let entries = [];
    let baseExists = false;
    try {
      baseExists = fs.existsSync(fullBase);
      if (baseExists) {
        entries = fs.readdirSync(fullBase, { withFileTypes: true });
      }
    } catch (e) {
      results.push({
        id: 'localization.copiedRefs',
        category: 'localization',
        required: true,
        passed: false,
        subject: base,
        evidence: { parseError: `${e.code}: ${e.message}` },
        guidance: null
      });
    }

    if (baseExists) {
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillSlug = entry.name;
          const skillMdRelative = path.join(base, skillSlug, 'SKILL.md');
          const skillMdPath = path.join(repoRoot, skillMdRelative);
          let exists = false;
          try {
            exists = fs.existsSync(skillMdPath);
          } catch (e) {
            results.push({
              id: 'localization.copiedRefs',
              category: 'localization',
              required: true,
              passed: false,
              subject: skillMdRelative,
              evidence: { parseError: `${e.code}: ${e.message}` },
              guidance: null
            });
            continue;
          }

          if (exists) {
            let content = '';
            try {
              content = fs.readFileSync(skillMdPath, 'utf8');
            } catch (e) {
              results.push({
                id: 'localization.copiedRefs',
                category: 'localization',
                required: true,
                passed: false,
                subject: skillMdRelative,
                evidence: { parseError: `${e.code}: ${e.message}` },
                guidance: null
              });
              continue;
            }

            const blocks = extractExecutionContextBlocks(content);
            let copiedRefsPassed = true;
            const missingFiles = [];
            let localPathsPassed = true;
            const offendingLines = [];

            for (const block of blocks) {
              const lines = block.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('@')) {
                  const rawPath = trimmed.slice(1).trim();
                  let resolvedPath = '';
                  if (rawPath.startsWith('~') || rawPath.startsWith('$HOME')) {
                    resolvedPath = rawPath.replace(/^~/, os.homedir()).replace(/^\$HOME/, os.homedir());
                  } else {
                    resolvedPath = path.join(repoRoot, rawPath);
                  }

                  let fileExists = false;
                  try {
                    fileExists = fs.existsSync(resolvedPath);
                  } catch (e) {
                    fileExists = false;
                  }

                  if (!fileExists) {
                    copiedRefsPassed = false;
                    missingFiles.push(rawPath);
                  }
                }
              }

              const hits = findSuspiciousAtLines(block);
              if (hits.length > 0) {
                localPathsPassed = false;
                for (const hit of hits) {
                  offendingLines.push(hit.line);
                }
              }
            }

            results.push({
              id: 'localization.copiedRefs',
              category: 'localization',
              required: true,
              passed: copiedRefsPassed,
              subject: skillMdRelative,
              evidence: {
                checkedPaths: missingFiles.length ? missingFiles : undefined,
                parseError: missingFiles.length ? `Missing files: ${missingFiles.join(', ')}` : undefined
              },
              guidance: null
            });

            results.push({
              id: 'localization.localPaths',
              category: 'localization',
              required: true,
              passed: localPathsPassed,
              subject: skillMdRelative,
              evidence: {
                offendingLines: offendingLines.length ? offendingLines : undefined,
                parseError: offendingLines.length ? `Remaining global path references: ${offendingLines.join(', ')}` : undefined
              },
              guidance: null
            });
          }
        }
      }
    }
  }

  // 6. skill.projectFlow.exists
  const pfPaths = [
    '.agents/skills/project-flow/SKILL.md',
    '.claude/skills/project-flow/SKILL.md'
  ];
  for (const p of pfPaths) {
    const fullPath = path.join(repoRoot, p);
    let exists = false;
    try {
      exists = fs.existsSync(fullPath);
    } catch (e) {}
    results.push({
      id: 'skill.projectFlow.exists',
      category: 'localization',
      required: true,
      passed: exists,
      subject: p,
      evidence: {
        checkedPaths: [p],
        parseError: exists ? undefined : `Project flow SKILL.md missing at ${p}`
      },
      guidance: null
    });
  }

  // 7. instructions.subagentSection
  const filesToCheck = ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md'];
  for (const f of filesToCheck) {
    const fullPath = path.join(repoRoot, f);
    let exists = false;
    try {
      exists = fs.existsSync(fullPath);
    } catch (e) {}
    if (exists) {
      let content = '';
      let passed = false;
      try {
        content = fs.readFileSync(fullPath, 'utf8');
        passed = content.includes('## Subagent & Parallel Execution Guidelines');
      } catch (e) {
        passed = false;
      }
      results.push({
        id: 'instructions.subagentSection',
        category: 'instruction',
        required: true,
        passed,
        subject: f,
        evidence: {
          parseError: passed ? undefined : `Missing heading "## Subagent & Parallel Execution Guidelines" in ${f}`
        },
        guidance: null
      });
    }
  }

  // 8. constitution.exists
  const constPath = '.ai/constitution.md';
  const fullConstPath = path.join(repoRoot, constPath);
  let constExists = false;
  try {
    constExists = fs.existsSync(fullConstPath);
  } catch (e) {}
  results.push({
    id: 'constitution.exists',
    category: 'artifact',
    required: true,
    passed: constExists,
    subject: constPath,
    evidence: {
      checkedPaths: [constPath],
      parseError: constExists ? undefined : 'Constitution file is missing.'
    },
    guidance: null
  });

  // 9. featurePointer.active
  const featJsonPath = '.specify/feature.json';
  const fullFeatJsonPath = path.join(repoRoot, featJsonPath);
  let featJsonExists = false;
  try {
    featJsonExists = fs.existsSync(fullFeatJsonPath);
  } catch (e) {}
  if (featJsonExists) {
    let passed = false;
    let parseError = null;
    let featureDir = '';
    try {
      const raw = fs.readFileSync(fullFeatJsonPath, 'utf8');
      const data = JSON.parse(raw);
      featureDir = data.feature_directory;
      if (featureDir) {
        passed = fs.existsSync(path.join(repoRoot, featureDir));
      }
    } catch (e) {
      parseError = e.message;
    }
    results.push({
      id: 'featurePointer.active',
      category: 'artifact',
      required: true,
      passed: passed && !parseError,
      subject: featJsonPath,
      evidence: {
        checkedPaths: featureDir ? [featureDir] : undefined,
        parseError: parseError || (passed ? undefined : `Feature directory does not exist: ${featureDir}`)
      },
      guidance: null
    });
  }

  // 10. policy.config.exists & policy.config.schema
  const { validatePolicyConfig, validateContextPack, validateHandoffArtifact } = require('./context-policy-validator');
  
  const policyConfigPath = '.ai/state/context-policy.json';
  const fullPolicyConfigPath = path.join(repoRoot, policyConfigPath);
  let policyConfigExists = false;
  try {
    policyConfigExists = fs.existsSync(fullPolicyConfigPath);
  } catch (e) {
    policyConfigExists = false;
  }

  results.push({
    id: 'policy.config.exists',
    category: 'artifact',
    required: false,
    passed: policyConfigExists,
    subject: policyConfigPath,
    evidence: {
      checkedPaths: [policyConfigPath],
      parseError: policyConfigExists ? undefined : 'Context policy configuration file is missing.'
    },
    guidance: null
  });

  let policyConfigSchemaPassed = true;
  let policyConfigSchemaError = undefined;

  if (policyConfigExists) {
    const valResult = validatePolicyConfig(fullPolicyConfigPath);
    policyConfigSchemaPassed = valResult.valid;
    if (!valResult.valid) {
      policyConfigSchemaError = valResult.errors.join('; ');
    }
  }

  results.push({
    id: 'policy.config.schema',
    category: 'artifact',
    required: true,
    passed: policyConfigSchemaPassed,
    subject: policyConfigPath,
    evidence: {
      parseError: policyConfigSchemaError
    },
    guidance: null
  });

  // 11. context.packs.schema, context.packs.refs, context.packs.fanout.conflicts
  const contextPacksDir = path.join(repoRoot, '.ai/context-packs');
  let packFiles = [];
  try {
    if (fs.existsSync(contextPacksDir) && fs.statSync(contextPacksDir).isDirectory()) {
      packFiles = fs.readdirSync(contextPacksDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(contextPacksDir, f));
    }
  } catch (e) {
    // Ignore error
  }

  const packSchemaErrors = [];
  const packRefsErrors = [];
  const packConflictsErrors = [];

  for (const packPath of packFiles) {
    const relativePackPath = path.relative(repoRoot, packPath);
    const siblings = packFiles.filter(p => p !== packPath);
    const valResult = validateContextPack(packPath, siblings);
    if (!valResult.valid) {
      for (const err of valResult.errors) {
        const formattedErr = `${relativePackPath}: ${err}`;
        if (
          err.includes('does not exist') ||
          err.includes('Path traversal') ||
          err.includes('embeds file body') ||
          err.includes('Error checking existence')
        ) {
          packRefsErrors.push(formattedErr);
        } else if (err.includes('Overlap in write targets')) {
          packConflictsErrors.push(formattedErr);
        } else {
          packSchemaErrors.push(formattedErr);
        }
      }
    }
  }

  results.push({
    id: 'context.packs.schema',
    category: 'artifact',
    required: true,
    passed: packSchemaErrors.length === 0,
    subject: '.ai/context-packs',
    evidence: {
      parseError: packSchemaErrors.length ? packSchemaErrors.join('; ') : undefined
    },
    guidance: null
  });

  results.push({
    id: 'context.packs.refs',
    category: 'artifact',
    required: true,
    passed: packRefsErrors.length === 0,
    subject: '.ai/context-packs',
    evidence: {
      parseError: packRefsErrors.length ? packRefsErrors.join('; ') : undefined
    },
    guidance: null
  });

  results.push({
    id: 'context.packs.fanout.conflicts',
    category: 'artifact',
    required: true,
    passed: packConflictsErrors.length === 0,
    subject: '.ai/context-packs',
    evidence: {
      parseError: packConflictsErrors.length ? packConflictsErrors.join('; ') : undefined
    },
    guidance: null
  });

  // 12. handoff.exists & handoff.schema
  const handoffPath = '.ai/state/context-handoff.json';
  const fullHandoffPath = path.join(repoRoot, handoffPath);
  let handoffExists = false;
  try {
    handoffExists = fs.existsSync(fullHandoffPath);
  } catch (e) {
    handoffExists = false;
  }

  results.push({
    id: 'handoff.exists',
    category: 'artifact',
    required: false,
    passed: handoffExists,
    subject: handoffPath,
    evidence: {
      checkedPaths: [handoffPath],
      parseError: handoffExists ? undefined : 'Handoff file is missing.'
    },
    guidance: null
  });

  const knownStageIds = flowDef && Array.isArray(flowDef.stages)
    ? flowDef.stages.map(s => s.id)
    : undefined;

  let handoffSchemaPassed = true;
  let handoffSchemaError = undefined;

  if (handoffExists) {
    const valResult = validateHandoffArtifact(fullHandoffPath, knownStageIds);
    handoffSchemaPassed = valResult.valid;
    if (!valResult.valid) {
      handoffSchemaError = valResult.errors.join('; ');
    }
  }

  results.push({
    id: 'handoff.schema',
    category: 'artifact',
    required: true,
    passed: handoffSchemaPassed,
    subject: handoffPath,
    evidence: {
      parseError: handoffSchemaError
    },
    guidance: null
  });

  // 13. instructions.contextPolicySection
  for (const f of filesToCheck) {
    const fullPath = path.join(repoRoot, f);
    let exists = false;
    try {
      exists = fs.existsSync(fullPath);
    } catch (e) {}
    if (exists) {
      let content = '';
      let passed = false;
      try {
        content = fs.readFileSync(fullPath, 'utf8');
        passed = content.includes('## Context Budget and Subagent Orchestration Policy');
      } catch (e) {
        passed = false;
      }
      results.push({
        id: 'instructions.contextPolicySection',
        category: 'instruction',
        required: true,
        passed,
        subject: f,
        evidence: {
          parseError: passed ? undefined : `Missing heading "## Context Budget and Subagent Orchestration Policy" in ${f}`
        },
        guidance: null
      });
    }
  }

  const failures = results.filter(r => r.required && !r.passed);
  const warnings = results.filter(r => !r.required && !r.passed);

  return {
    ok: failures.length === 0,
    summary: `${failures.length} failure(s), ${warnings.length} warning(s)`,
    results,
    failures,
    warnings
  };
}

/**
 * Formats a check report for terminal output.
 *
 * @param {object} report - The structured report from runStrictChecks.
 * @param {string} [source] - Command source: 'init' | 'doctor'.
 * @returns {string} Formatted terminal output.
 */
function formatTerminal(report, source = '') {
  const prefix = source ? `[${source}] ` : '';
  const lines = [];

  if (!report.ok) {
    lines.push(`${prefix}Static checks FAILED: ${report.summary}`);
  } else {
    lines.push(`${prefix}Static sanity checks PASSED.`);
    return lines.join('\n') + '\n';
  }

  let index = 1;
  if (report.failures.length > 0) {
    for (const fail of report.failures) {
      const reason = fail.evidence && fail.evidence.parseError || 'check failed';
      const line = `${prefix}ERROR: ${fail.id} (${fail.subject}): ${reason}`;
      lines.push(line);
    }
  }

  if (report.warnings.length > 0) {
    for (const warn of report.warnings) {
      const reason = warn.evidence && warn.evidence.parseError || 'warning';
      const line = `${prefix}WARNING: ${warn.id} (${warn.subject}): ${reason}`;
      lines.push(line);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Formats a check report as a Markdown repair guide.
 *
 * @param {object} report - The structured report from runStrictChecks.
 * @param {object} meta - Metadata including { source }.
 * @returns {string} Markdown repair guide content.
 */
function formatMarkdownGuide(report, meta = {}) {
  const lines = [];
  const timestamp = new Date().toISOString();
  const source = meta.source || 'adp';

  lines.push('# Repair Guide');
  lines.push('');
  lines.push(`**Generated:** ${timestamp}`);
  lines.push(`**Source:** adp ${source}`);
  lines.push(`**Status:** ${report.failures.length} failure(s), ${report.warnings.length} warning(s)`);
  lines.push('');
  lines.push('> This file is automatically regenerated by `adp init` / `adp doctor`. Delete after fixing.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| # | Category | Subject | One-line reason |');
  lines.push('|---|----------|---------|-----------------|');

  let index = 1;
  for (const fail of report.failures) {
    const reason = fail.evidence && fail.evidence.parseError || 'Check failed';
    lines.push(`| ${index++} | ${fail.category} | ${fail.subject} | ${reason.replace(/\n/g, ' ')} |`);
  }

  lines.push('');
  lines.push('## Failures');
  lines.push('');

  index = 1;
  for (const fail of report.failures) {
    if (fail.category === 'instruction') {
      // D-15-15 wording pin (F4 wording pin)
      lines.push(`### ${index++}. Local workflow files incomplete  *(category: instruction)*`);
      lines.push('');
      lines.push(`**Subject:** ${fail.subject}`);
      lines.push(`**Detected failure:** ${fail.evidence && fail.evidence.parseError || 'Instruction file incomplete.'}`);
      lines.push('**Manual action:** Open the instruction file and append the following block:');
      lines.push('```markdown');
      if (fail.id === 'instructions.contextPolicySection') {
        lines.push('## Context Budget and Subagent Orchestration Policy');
        lines.push('- Estimate byte pressure before starting work to decide execution path.');
        lines.push('- Create structured context packs for isolated subagents.');
        lines.push('- Pause and write a handoff artifact when fresh session is required.');
      } else {
        lines.push('## Subagent & Parallel Execution Guidelines');
        lines.push('- Detect independent tasks and spawn specialized subagents in parallel.');
        lines.push('- Keep subagent contexts lightweight to limit context size.');
      }
      lines.push('```');
      lines.push('**Verify:** `adp doctor`');
      lines.push('');
    } else if (fail.category === 'tool') {
      const guidance = fail.guidance;
      const purpose = guidance && guidance.purpose ? guidance.purpose : '_(field not documented)_';
      const whyRequired = guidance && guidance.whyRequired ? guidance.whyRequired : '_(field not documented)_';
      const detectHint = guidance && guidance.detectionHint ? guidance.detectionHint : '_(field not documented)_';
      const checkedPaths = guidance && Array.isArray(guidance.checkedPaths) && guidance.checkedPaths.length > 0
        ? guidance.checkedPaths.map(p => `- \`${p}\``).join('\n')
        : '_(none documented)_';
      const installCommands = guidance && Array.isArray(guidance.installCommands) && guidance.installCommands.length > 0
        ? guidance.installCommands.join('\n')
        : '_(none documented)_';
      const workspaceFallback = guidance && guidance.workspaceFallback ? guidance.workspaceFallback : '_(field not documented)_';
      const homeFallback = guidance && guidance.homeFallback ? guidance.homeFallback : '_(field not documented)_';
      const verifyCmd = guidance && guidance.verifyCommand ? guidance.verifyCommand : '_(field not documented)_';

      lines.push(`### ${index++}. Tool missing — ${fail.subject}  *(category: tool)*`);
      lines.push('');
      lines.push(`**Purpose:** ${purpose}`);
      lines.push(`**Why required:** ${whyRequired}`);
      if (fail.evidence && fail.evidence.stage) {
        lines.push(`**Needed by stage:** ${fail.evidence.stage}`);
      }
      lines.push(`**Detected failure:** ${detectHint}`);
      lines.push('**Checked paths:**');
      lines.push(checkedPaths);
      if (fail.evidence && fail.evidence.checkedCommand) {
        lines.push(`**Checked command:** \`${fail.evidence.checkedCommand}\``);
      }
      lines.push('');
      lines.push('**Install — workspace-local (preferred):**');
      lines.push('```bash');
      lines.push(installCommands);
      lines.push('```');
      lines.push('');
      lines.push('**Install — home directory fallback:**');
      lines.push(`*Workspace fallback:* ${workspaceFallback}`);
      lines.push(`*Home fallback:* ${homeFallback}`);
      lines.push('');
      lines.push(`**Verify:** \`${verifyCmd}\``);
      lines.push('');
    } else if (fail.category === 'localization') {
      const offending = fail.evidence && Array.isArray(fail.evidence.offendingLines) && fail.evidence.offendingLines.length > 0
        ? fail.evidence.offendingLines.map(l => `- \`${l}\``).join('\n')
        : '_(none)_';
      lines.push(`### ${index++}. Localized SKILL.md still references global path  *(category: localization)*`);
      lines.push('');
      lines.push(`**Subject:** ${fail.subject}`);
      lines.push(`**Detected failure:** ${fail.evidence && fail.evidence.parseError || 'Missing or malformed local skill reference.'}`);
      if (fail.evidence && fail.evidence.offendingLines) {
        lines.push('**Offending lines:**');
        lines.push(offending);
      }
      lines.push('**Manual action:** Re-run `adp init` after removing `.agents/skills/` and `.claude/skills/` folders to let localization run again.');
      lines.push('**Verify:** `adp doctor`');
      lines.push('');
    } else {
      lines.push(`### ${index++}. Required artifact missing or invalid — ${fail.subject}  *(category: ${fail.category})*`);
      lines.push('');
      lines.push(`**Subject:** ${fail.subject}`);
      lines.push(`**Detected failure:** ${fail.evidence && fail.evidence.parseError || 'Artifact missing or invalid.'}`);
      lines.push(`**Manual action:** Ensure that \`${fail.subject}\` is correctly created and configured.`);
      lines.push('**Verify:** `adp doctor`');
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  lines.push('## Warnings  *(do not block init)*');
  lines.push('');
  if (report.warnings.length === 0) {
    lines.push('(none)');
  } else {
    let wIndex = 1;
    for (const warn of report.warnings) {
      lines.push(`### ${wIndex++}. ${warn.id} (${warn.subject})`);
      lines.push(`**Reason:** ${warn.evidence && warn.evidence.parseError || 'warning'}`);
      lines.push('');
    }
  }

  return lines.join('\n') + '\n';
}

module.exports = {
  runStrictChecks,
  formatTerminal,
  formatMarkdownGuide
};
