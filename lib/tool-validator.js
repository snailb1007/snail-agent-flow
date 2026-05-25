const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

/**
 * Validates the availability of prerequisite tools or skills.
 * Checks local workspace directories, home config directories, and the system PATH.
 * 
 * @param {Array<{name: string, command?: string, check?: string}>} prerequisites
 * @param {string} repoRoot - Project repository root path
 * @returns {Array<{name: string, available: boolean, reason?: string}>}
 */
function validatePrerequisites(prerequisites, repoRoot = process.cwd()) {
  const results = [];

  for (const pre of prerequisites) {
    let available = false;
    let checkedPaths = [];
    let checkedCommand = '';

    // 1. Check local workspace skills
    const localAgentsPath = path.join(repoRoot, '.agents/skills', pre.name.toLowerCase());
    const localClaudePath = path.join(repoRoot, '.claude/skills', pre.name.toLowerCase());
    checkedPaths.push(localAgentsPath, localClaudePath);

    if (fs.existsSync(localAgentsPath) || fs.existsSync(localClaudePath)) {
      available = true;
    }

    // 2. Check user home config skills
    if (!available) {
      const homeDir = os.homedir();
      const geminiConfigPath = path.join(homeDir, '.gemini/config/skills', pre.name.toLowerCase());
      checkedPaths.push(geminiConfigPath);
      if (fs.existsSync(geminiConfigPath)) {
        available = true;
      }
    }

    // 3. Fallback to system PATH check if check command exists
    if (!available && pre.command) {
      checkedCommand = pre.command;
      const checkCmd = pre.check || `command -v ${pre.command}`;
      // Execute the command in the shell
      const res = spawnSync(checkCmd, { shell: true, encoding: 'utf8' });
      if (res.status === 0) {
        available = true;
      }
    }

    results.push({
      name: pre.name,
      available,
      reason: available 
        ? undefined 
        : `Could not find skill folder in: [${checkedPaths.join(', ')}]${checkedCommand ? ` and command "${checkedCommand}" not found on system PATH.` : '.'}`
    });
  }

  return results;
}

const INSTRUCTIONS_DB = {
  gsd: {
    description: "Scaffold phases, record decisions, and run execution tasks.",
    instructions: "Download and copy the GSD skill folder to `.agents/skills/gsd-discuss-phase` or home directory `~/.gemini/config/skills/gsd-discuss-phase`"
  },
  superpowers: {
    description: "Standard developer capabilities and tool discoverability instructions.",
    instructions: "Download and copy the Superpowers skill folder to `.agents/skills/using-superpowers` or home directory `~/.gemini/config/skills/using-superpowers`"
  },
  'spec-kit': {
    description: "Author, update, and validate the canonical project specs, plans, and checklists.",
    instructions: "Download and copy the Spec-Kit skill folder to `.agents/skills/speckit-specify` or home directory `~/.gemini/config/skills/speckit-specify`"
  },
  gstack: {
    description: "Conduct product and engineering critiques and assess ship readiness.",
    instructions: "Download and copy the GStack skill folder to `.agents/skills/plan-ceo-review` or home directory `~/.gemini/config/skills/plan-ceo-review`"
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
  INSTRUCTIONS_DB
};
