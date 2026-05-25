const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

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
      const res = spawnSync(pre.check, {
        shell: true,
        encoding: 'utf8',
        cwd: repoRoot
      });
      available = res.status === 0;
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

      // 3. Fallback to PATH lookup of the command's first token.
      if (!available && commandFirstToken) {
        checkedCommand = `command -v ${commandFirstToken}`;
        const res = spawnSync(checkedCommand, {
          shell: true,
          encoding: 'utf8',
          cwd: repoRoot
        });
        if (res.status === 0) {
          available = true;
        }
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

module.exports = {
  validatePrerequisites
};
