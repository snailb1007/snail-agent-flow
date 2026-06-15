const { spawnSync } = require('child_process');
const path = require('path');

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
  const res = spawnSync('bash', [scriptPath], { stdio: 'inherit' });
  process.exit(res.status === null ? 1 : res.status);
}

run();
