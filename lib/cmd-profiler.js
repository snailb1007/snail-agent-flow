'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch (e) {
    return false;
  }
}

function resolveWindowsCommand(repoRoot, cmd) {
  if (process.platform !== 'win32') {
    return cmd;
  }

  const hasExtension = path.extname(cmd) !== '';
  const pathExts = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .filter(Boolean);
  const candidates = hasExtension
    ? [cmd]
    : [...pathExts.map(ext => cmd + ext.toLowerCase()), ...pathExts.map(ext => cmd + ext.toUpperCase()), cmd];
  const hasPathSegment = cmd.includes('/') || cmd.includes('\\');

  if (hasPathSegment) {
    for (const candidate of candidates) {
      const abs = path.isAbsolute(candidate) ? candidate : path.resolve(repoRoot, candidate);
      if (fileExists(abs)) {
        return abs;
      }
    }
    return cmd;
  }

  const pathDirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const dir of [repoRoot, ...pathDirs]) {
    for (const candidate of candidates) {
      const abs = path.join(dir, candidate);
      if (fileExists(abs)) {
        return abs;
      }
    }
  }

  return cmd;
}

function resolveNpmShim(executable) {
  if (process.platform !== 'win32') {
    return null;
  }

  const basename = path.basename(executable).toLowerCase();
  const cliName = basename.startsWith('npm.') || basename === 'npm'
    ? 'npm-cli.js'
    : basename.startsWith('npx.') || basename === 'npx'
      ? 'npx-cli.js'
      : null;
  if (!cliName) {
    return null;
  }

  const cliPath = path.join(path.dirname(executable), 'node_modules', 'npm', 'bin', cliName);
  return fileExists(cliPath) ? cliPath : null;
}

function resolveProfileCommand(repoRoot, cmd, args) {
  const executable = resolveWindowsCommand(repoRoot, cmd);
  if (process.platform === 'win32') {
    const npmShim = resolveNpmShim(executable);
    if (npmShim) {
      return { executable: process.execPath, args: [npmShim, ...args] };
    }

    if (/\.(?:cmd|bat)$/i.test(executable)) {
      return {
        error: `Refusing to profile Windows batch command "${cmd}" without an explicit shell. Use a real executable or profile npm/npx directly.`
      };
    }
  }

  return { executable, args };
}

function profileCommand(repoRoot, cmdArgs) {
  if (cmdArgs.length === 0) {
    console.error('Error: Missing command to profile. Usage: adp profile -- <command...>');
    process.exit(1);
  }

  const cmd = cmdArgs[0];
  const args = cmdArgs.slice(1);
  const resolved = resolveProfileCommand(repoRoot, cmd, args);
  if (resolved.error) {
    console.error(`[profile] Error executing command: ${resolved.error}`);
    return Promise.resolve(1);
  }
  const fullCommandStr = cmdArgs.join(' ');

  const start = Date.now();
  let stdoutBytes = 0;
  let stderrBytes = 0;

  const child = spawn(resolved.executable, resolved.args, {
    cwd: repoRoot,
    shell: false,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => {
    stdoutBytes += data.length;
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    stderrBytes += data.length;
    process.stderr.write(data);
  });

  return new Promise((resolve) => {
    child.on('close', (code) => {
      const durationMs = Date.now() - start;
      const metrics = {
        timestamp: new Date().toISOString(),
        command: fullCommandStr,
        duration_ms: durationMs,
        stdout_bytes: stdoutBytes,
        stderr_bytes: stderrBytes,
        exit_code: code === null ? -1 : code
      };

      // Log to .ai/signals/profile.jsonl
      try {
        const logPath = path.join(repoRoot, '.ai/signals/profile.jsonl');
        const dir = path.dirname(logPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.appendFileSync(logPath, JSON.stringify(metrics) + '\n', 'utf8');
      } catch (logErr) {
        console.warn(`[profile] Warning: Could not write to profile.jsonl: ${logErr.message}`);
      }

      console.log('\n--- Execution Profile ---');
      console.log(`Command:   ${fullCommandStr}`);
      console.log(`Duration:  ${durationMs} ms`);
      console.log(`Stdout:    ${stdoutBytes} bytes`);
      console.log(`Stderr:    ${stderrBytes} bytes`);
      console.log(`Exit Code: ${code === null ? -1 : code}`);
      console.log('-------------------------');

      resolve(code === null ? -1 : code);
    });

    child.on('error', (err) => {
      console.error(`[profile] Error executing command: ${err.message}`);
      resolve(1);
    });
  });
}

module.exports = {
  profileCommand,
  resolveWindowsCommand,
  resolveProfileCommand
};
