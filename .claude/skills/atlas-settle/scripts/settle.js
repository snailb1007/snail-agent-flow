'use strict';

const { execSync } = require('child_process');

function main() {
  const mode = process.argv[2] || 'verify'; // 'verify' (S1) or 'validate' (S3)
  const command = mode === 'validate' ? 'npm run validate' : 'npm test';

  let success = true;
  let output = '';

  try {
    output = execSync(command, { stdio: 'pipe' }).toString();
  } catch (err) {
    success = false;
    output = err.stdout ? err.stdout.toString() : err.message;
  }

  const gateResult = {
    stage_id: 'settle',
    status: success ? 'PASS' : 'FAIL',
    blocking: success ? [] : [`Settle checks failed running command '${command}'`],
    warnings: [],
    artifacts_produced: []
  };

  console.log(JSON.stringify(gateResult, null, 2));
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}
