const fs = require('fs');
const path = 'README.md';
let content = fs.readFileSync(path, 'utf8');

// Add missing CLI commands after checkpoint
const missingCommands = `
  signal <type> <val>     Log observability signal.
  onboard-memory          Promote ONBOARDING.md content into .ai/memory/ files.
  budget                  Report estimated context byte pressure and policy outcome.
                          Options: --stage <id>, --json, --enforce (exit 1 unless inline), --profile.
  pack                    Generate a context pack manifest under .ai/context-packs/.
                          Options: --objective <text>, --stage <id>, --out <path>.`;

content = content.replace(
  '  checkpoint            Write profile-switch checkpoint.\n\n```',
  '  checkpoint            Write profile-switch checkpoint.' + missingCommands + '\n```'
);

fs.writeFileSync(path, content);
console.log('Added missing CLI commands');