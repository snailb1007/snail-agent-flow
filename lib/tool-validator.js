const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

function splitCommandLine(command) {
  const args = [];
  let current = '';
  let quote = null;
  let escaped = false;

  for (const ch of String(command || '')) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }

  if (escaped) {
    current += '\\';
  }
  if (current) {
    args.push(current);
  }
  return args;
}

function expandHome(value, homeDir) {
  if (value === '~') {
    return homeDir;
  }
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(homeDir, value.slice(2));
  }
  return value;
}

function commandExists(command, repoRoot) {
  if (!command) {
    return false;
  }

  const pathDirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const hasPathSegment = command.includes('/') || command.includes('\\');
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : [''];
  const hasExtension = path.extname(command) !== '';
  const candidates = process.platform === 'win32' && !hasExtension
    ? [...extensions.map(ext => command + ext.toLowerCase()), ...extensions.map(ext => command + ext.toUpperCase()), command]
    : [command];
  const dirs = hasPathSegment ? [''] : [repoRoot, ...pathDirs];

  for (const dir of dirs) {
    for (const candidate of candidates) {
      const fullPath = hasPathSegment
        ? path.resolve(repoRoot, candidate)
        : path.join(dir, candidate);
      try {
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          return true;
        }
      } catch (e) {}
    }
  }

  return false;
}

function runCheckPart(part, repoRoot, homeDir) {
  const tokens = splitCommandLine(part);
  if (tokens.length === 0) {
    return false;
  }

  if (tokens[0] === 'echo') {
    return true;
  }

  if (tokens[0] === 'command' && tokens[1] === '-v' && tokens[2] && tokens.length === 3) {
    return commandExists(tokens[2], repoRoot);
  }

  if (tokens[0] === 'test' && tokens[1] === '-d' && tokens[2] && tokens.length === 3) {
    const target = expandHome(tokens[2], homeDir);
    const fullPath = path.isAbsolute(target) ? target : path.join(repoRoot, target);
    try {
      return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    } catch (e) {
      return false;
    }
  }

  // On Windows, run the original check through the shell so quoted inline
  // commands such as `node -e "..."` keep their quoting while still using repoRoot.
  const res = process.platform === 'win32'
    ? spawnSync(part, { shell: true, encoding: 'utf8', cwd: repoRoot })
    : spawnSync(tokens[0], tokens.slice(1), { shell: false, encoding: 'utf8', cwd: repoRoot });
  return res.status === 0;
}

function runPrerequisiteCheck(checkCommand, repoRoot, homeDir) {
  return String(checkCommand || '')
    .split('||')
    .some(part => runCheckPart(part.trim(), repoRoot, homeDir));
}

/**
 * Validates the availability of prerequisite tools or skills.
 * Checks local workspace directories, home config directories, and the system PATH.
 *
 * Resolution order per prerequisite:
 *   1. If `check` is provided, run it (authoritative) with cwd=repoRoot.
 *   2. Else: probe `.agents/skills/<slug>`, `.claude/skills/<slug>`,
 *      `~/.gemini/config/skills/<slug>` where <slug> is derived from
 *      `command` (preferred, first whitespace token) or `name`.
 *   3. Fallback: `command -v <command-first-token>` with cwd=repoRoot.
 *
 * @param {Array<{name: string, command?: string, check?: string}>} prerequisites
 * @param {string} repoRoot - Project repository root path
 * @returns {Array<{name: string, available: boolean, reason?: string}>}
 */
function validatePrerequisites(prerequisites, repoRoot = process.cwd()) {
  const results = [];
  const homeDir = os.homedir();

  for (const pre of prerequisites) {
    let available = false;
    const checkedPaths = [];
    let checkedCommand = '';

    // Derive the skill slug from the actual command (first whitespace token),
    // falling back to `name`. This avoids matching alias dirs like
    // `.agents/skills/gsd` when the real skill is `gsd-discuss-phase`.
    const commandFirstToken = (pre.command || '').trim().split(/\s+/)[0] || '';
    const slug = (commandFirstToken || pre.name || '').toLowerCase();

    // 1. Authoritative explicit check (if provided) — honor cwd.
    if (pre.check) {
      checkedCommand = pre.check;
      available = runPrerequisiteCheck(pre.check, repoRoot, homeDir);
    } else if (slug) {
      // 2. Probe known skill directories using the command-derived slug.
      const localAgentsPath = path.join(repoRoot, '.agents/skills', slug);
      const localClaudePath = path.join(repoRoot, '.claude/skills', slug);
      const geminiConfigPath = path.join(homeDir, '.gemini/config/skills', slug);
      checkedPaths.push(localAgentsPath, localClaudePath, geminiConfigPath);

      if (
        fs.existsSync(localAgentsPath) ||
        fs.existsSync(localClaudePath) ||
        fs.existsSync(geminiConfigPath)
      ) {
        available = true;
      }

      if (!available && slug === 'plan-ceo-review') {
        const altAgents = path.join(repoRoot, '.agents/skills', 'gstack-plan-ceo-review');
        const altClaude = path.join(repoRoot, '.claude/skills', 'gstack-plan-ceo-review');
        const altGemini = path.join(homeDir, '.gemini/config/skills', 'gstack-plan-ceo-review');
        checkedPaths.push(altAgents, altClaude, altGemini);
        if (fs.existsSync(altAgents) || fs.existsSync(altClaude) || fs.existsSync(altGemini)) {
          available = true;
        }
      }

      // 3. Fallback to PATH lookup of the command's first token.
      if (!available && commandFirstToken) {
        checkedCommand = `command -v ${commandFirstToken}`;
        available = commandExists(commandFirstToken, repoRoot);
      }
    }

    results.push({
      name: pre.name,
      available,
      reason: available
        ? undefined
        : checkedPaths.length
          ? `Could not find skill folder in: [${checkedPaths.join(', ')}]${checkedCommand ? ` and command "${checkedCommand}" not found on system PATH.` : '.'}`
          : `Check command "${checkedCommand}" did not succeed.`
    });
  }

  return results;
}

const INSTRUCTIONS_DB = {
  gsd: {
    description: "Scaffold phases, record decisions, and run execution tasks.",
    instructions: "Download and copy the GSD skill folder to `.agents/skills/gsd-discuss-phase` or home directory `~/.gemini/config/skills/gsd-discuss-phase`",
    purpose: "Scaffold phases, record decisions, and run execution tasks.",
    whyRequired: "Legacy flows may use gsd-discuss-phase / gsd-plan-phase / gsd-execute-phase for phase orchestration.",
    detectionHint: "Looks for `gsd-discuss-phase` skill folder or `gsd` on PATH.",
    checkedPaths: [
      ".agents/skills/gsd-discuss-phase",
      ".claude/skills/gsd-discuss-phase",
      "~/.gemini/config/skills/gsd-discuss-phase"
    ],
    installCommands: [
      "mkdir -p .agents/skills && cp -R <gsd-source>/skills/gsd-discuss-phase .agents/skills/"
    ],
    workspaceFallback: "Copy to `.agents/skills/gsd-discuss-phase` for sandboxed agents.",
    homeFallback: "Copy to `~/.gemini/config/skills/gsd-discuss-phase` for system-wide use.",
    verifyCommand: "adp doctor"
  },
  superpowers: {
    description: "Standard developer capabilities and tool discoverability instructions.",
    instructions: "Download and copy the Superpowers skill folder to `.agents/skills/using-superpowers` or home directory `~/.gemini/config/skills/using-superpowers`",
    purpose: "Standard developer capabilities and tool discoverability instructions.",
    whyRequired: "Required to provide capabilities and standard instructions to the AI agent.",
    detectionHint: "Looks for `using-superpowers` skill folder or `superpowers` on PATH.",
    checkedPaths: [
      ".agents/skills/using-superpowers",
      ".claude/skills/using-superpowers",
      "~/.gemini/config/skills/using-superpowers"
    ],
    installCommands: [
      "mkdir -p .agents/skills && cp -R <superpowers-source>/skills/using-superpowers .agents/skills/"
    ],
    workspaceFallback: "Copy to `.agents/skills/using-superpowers` for sandboxed agents.",
    homeFallback: "Copy to `~/.gemini/config/skills/using-superpowers` for system-wide use.",
    verifyCommand: "adp doctor"
  },
  'spec-kit': {
    description: "Author, update, and validate the canonical project specs, plans, and checklists.",
    instructions: "Download and copy the Spec-Kit skill folder to `.agents/skills/speckit-specify` or home directory `~/.gemini/config/skills/speckit-specify`",
    purpose: "Author, update, and validate the canonical project specs, plans, and checklists.",
    whyRequired: "Used to validate specs, plans, and checklists before, during, and after implementation.",
    detectionHint: "Looks for `speckit-specify` skill folder or `spec-kit` on PATH.",
    checkedPaths: [
      ".agents/skills/speckit-specify",
      ".claude/skills/speckit-specify",
      "~/.gemini/config/skills/speckit-specify"
    ],
    installCommands: [
      "mkdir -p .agents/skills && cp -R <spec-kit-source>/skills/speckit-specify .agents/skills/"
    ],
    workspaceFallback: "Copy to `.agents/skills/speckit-specify` for sandboxed agents.",
    homeFallback: "Copy to `~/.gemini/config/skills/speckit-specify` for system-wide use.",
    verifyCommand: "adp doctor"
  },
  gstack: {
    description: "Conduct product and engineering critiques and assess ship readiness.",
    instructions: "Download and copy the GStack skill folder to `.agents/skills/plan-ceo-review` or home directory `~/.gemini/config/skills/plan-ceo-review`",
    purpose: "Conduct product and engineering critiques and assess ship readiness.",
    whyRequired: "Used to run CEO, engineering, and visual design critiques, and assess PR ship readiness.",
    detectionHint: "Looks for `plan-ceo-review` skill folder or `gstack` on PATH.",
    checkedPaths: [
      ".agents/skills/plan-ceo-review",
      ".claude/skills/plan-ceo-review",
      "~/.gemini/config/skills/plan-ceo-review"
    ],
    installCommands: [
      "mkdir -p .agents/skills && cp -R <gstack-source>/skills/plan-ceo-review .agents/skills/"
    ],
    workspaceFallback: "Copy to `.agents/skills/plan-ceo-review` for sandboxed agents.",
    homeFallback: "Copy to `~/.gemini/config/skills/plan-ceo-review` for system-wide use.",
    verifyCommand: "adp doctor"
  },
  atlas: {
    description: "Run the 5-stage ATLAS Loop and deterministic routing, gate, review, and settle controls.",
    instructions: "Run `saf init` again to copy packaged ATLAS skills into `.claude/skills/atlas-*` and contracts into `.claude/skills/contracts`.",
    purpose: "Run the 5-stage ATLAS Loop.",
    whyRequired: "atlas-flow uses atlas-auto-loop, atlas-routing, atlas-gates, atlas-review, and atlas-settle for autonomous stage transitions.",
    detectionHint: "Looks for `.claude/skills/atlas-*` skill folders.",
    checkedPaths: [
      ".claude/skills/atlas-auto-loop",
      ".claude/skills/atlas-routing",
      ".claude/skills/atlas-gates",
      ".claude/skills/atlas-settle",
      ".claude/skills/atlas-review",
      ".claude/skills/contracts"
    ],
    installCommands: [
      "saf init"
    ],
    workspaceFallback: "Re-run `saf init` from the target project to restore packaged ATLAS assets.",
    homeFallback: "ATLAS skills are packaged workspace assets; use `saf init` in each target project.",
    verifyCommand: "adp doctor"
  }
};

/**
 * Returns platform instructions and description for a prerequisite tool.
 * 
 * @param {string} name - Tool name
 * @returns {{description: string, instructions: string}|null}
 */
function getToolInstructions(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(INSTRUCTIONS_DB)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
  }
  return null;
}

module.exports = {
  validatePrerequisites,
  getToolInstructions,
  INSTRUCTIONS_DB,
  splitCommandLine,
  runPrerequisiteCheck
};
