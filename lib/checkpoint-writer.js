const fs = require('fs');
const path = require('path');

const VALID_PROFILES = new Set(['FAST', 'STANDARD', 'FULL', 'BUGFIX', 'PROTOTYPE']);

/**
 * Writes a profile switch checkpoint.
 *
 * @param {object} params - Checkpoint details.
 * @param {string} params.from - The profile we are transitioning from.
 * @param {string} params.to - The profile we are transitioning to.
 * @param {string} params.reason - Reason for the profile switch.
 * @param {Array<string>} [params.completed_files] - List of files completed.
 * @param {Array<string>} [params.active_risks] - List of active risks.
 * @param {Array<string>} [params.resume_steps] - Next steps to resume.
 * @param {string} [targetDir] - Optional directory to write to.
 * @returns {string} The path to the written file.
 */
function writeProfileSwitch({ from, to, reason, completed_files, active_risks, resume_steps }, targetDir) {
  if (!VALID_PROFILES.has(from)) {
    throw new Error(`Invalid source profile: "${from}". Expected one of: ${Array.from(VALID_PROFILES).join(', ')}`);
  }
  if (!VALID_PROFILES.has(to)) {
    throw new Error(`Invalid target profile: "${to}". Expected one of: ${Array.from(VALID_PROFILES).join(', ')}`);
  }

  const now = new Date();
  const timestamp = now.toISOString();
  // Safe filename timestamp: replace ':' to avoid Windows path issues
  const safeTimestamp = timestamp.replace(/:/g, '-');
  
  const dirPath = targetDir || path.resolve(process.env.PROJECT_ROOT || process.cwd(), '.ai/state');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filename = `profile-switch-${safeTimestamp}.md`;
  const filePath = path.join(dirPath, filename);

  const completed = Array.isArray(completed_files) ? completed_files : [];
  const risks = Array.isArray(active_risks) ? active_risks : [];
  const steps = Array.isArray(resume_steps) ? resume_steps : [];

  const content = `---
Status: transient
From: ${from}
To: ${to}
Timestamp: ${timestamp}
---

# Profile Switch Checkpoint: ${from} → ${to}

## Transition Reason
${reason || 'Not specified'}

## Completed Files
${completed.length > 0 ? completed.map(f => `- ${f}`).join('\n') : '*None*'}

## Active Risks
${risks.length > 0 ? risks.map(r => `- ${r}`).join('\n') : '*None*'}

## Resume Steps
${steps.length > 0 ? steps.map(s => `- ${s}`).join('\n') : '*None*'}
`;

  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

module.exports = {
  writeProfileSwitch,
  VALID_PROFILES
};
