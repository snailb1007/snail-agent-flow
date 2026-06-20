const { spawnSync } = require('child_process');
const path = require('path');

let cachedBashType = null;

function detectBashType() {
  if (cachedBashType) return cachedBashType;
  try {
    const check = spawnSync('bash', ['-c', 'uname'], { encoding: 'utf8' });
    const stdout = (check.stdout || '').trim().toLowerCase();
    if (stdout.includes('linux')) {
      cachedBashType = 'wsl';
    } else if (stdout.includes('mingw') || stdout.includes('msys') || stdout.includes('cygwin')) {
      cachedBashType = 'msys';
    } else {
      cachedBashType = 'unknown';
    }
  } catch (e) {
    cachedBashType = 'unknown';
  }
  return cachedBashType;
}

function toBashPath(filePath) {
  if (process.platform !== 'win32') {
    return filePath;
  }
  const normalized = filePath.replace(/\\/g, '/');
  const match = normalized.match(/^([A-Za-z]):\/(.*)$/);
  if (!match) {
    return normalized;
  }
  const drive = match[1].toLowerCase();
  const rest = match[2];
  
  const bashType = detectBashType();
  if (bashType === 'wsl') {
    return `/mnt/${drive}/${rest}`;
  }
  if (bashType === 'msys') {
    return `/${drive}/${rest}`;
  }
  return normalized;
}

function run() {
  const scriptPath = path.resolve(__dirname, '../../.specify/scripts/bash/simulate-phase2-pipeline.sh');
  
  // Try running bash version check
  const check = spawnSync('bash', ['--version'], { encoding: 'utf8' });
  const hasWSLError = (check.stderr || '').includes('WSL') || (check.stderr || '').includes('execvpe');
  
  if (check.status !== 0 || hasWSLError) {
    console.log('Skipping pipeline simulation test: bash / WSL is not available or not functioning properly on this machine.');
    process.exit(0);
  }

  console.log('Running Phase 2 pipeline simulation...');
  const res = spawnSync('bash', [toBashPath(scriptPath)], { stdio: 'inherit' });
  process.exit(res.status === null ? 1 : res.status);
}

run();
