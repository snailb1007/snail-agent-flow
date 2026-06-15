'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { ClaimManager } = require('./claim-manager');

const INTERNAL_PREFIXES = [
  '.ai/claims/',
  '.ai/locks/',
  '.ai/signals/',
  '.ai/state/'
];

function normalizeRepoPath(repoRoot, value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const hadTrailingSlash = /[\\/]$/.test(trimmed);
  const rawPath = path.isAbsolute(trimmed)
    ? path.relative(repoRoot, trimmed)
    : trimmed;
  let normalized = rawPath.replace(/\\/g, '/').replace(/^\.\//, '');
  while (normalized.includes('//')) {
    normalized = normalized.replace(/\/\//g, '/');
  }
  if (hadTrailingSlash && normalized && !normalized.endsWith('/')) {
    normalized += '/';
  }
  return normalized;
}

function runGit(repoRoot, args, gitRunner) {
  if (typeof gitRunner === 'function') {
    return gitRunner(args, repoRoot);
  }
  return spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false
  });
}

function isOutsideGitRepository(result) {
  const text = `${result.stderr || ''}\n${result.stdout || ''}`;
  return /not a git repository/i.test(text);
}

function collectChangedFiles(repoRoot, gitRunner) {
  const tracked = runGit(repoRoot, ['diff', '--name-only', 'HEAD', '--'], gitRunner);
  if (tracked.status !== 0) {
    if (isOutsideGitRepository(tracked)) {
      return {
        skipped: true,
        warning: 'diff-hygiene: skipped outside git repository',
        files: []
      };
    }
    return {
      skipped: true,
      warning: `diff-hygiene: skipped, git diff failed: ${(tracked.stderr || tracked.stdout || '').trim()}`,
      files: []
    };
  }

  const untracked = runGit(repoRoot, ['ls-files', '--others', '--exclude-standard'], gitRunner);
  if (untracked.status !== 0) {
    if (isOutsideGitRepository(untracked)) {
      return {
        skipped: true,
        warning: 'diff-hygiene: skipped outside git repository',
        files: []
      };
    }
    return {
      skipped: true,
      warning: `diff-hygiene: skipped, git ls-files failed: ${(untracked.stderr || untracked.stdout || '').trim()}`,
      files: []
    };
  }

  const files = `${tracked.stdout || ''}\n${untracked.stdout || ''}`
    .split(/\r?\n/)
    .map((entry) => normalizeRepoPath(repoRoot, entry))
    .filter(Boolean)
    .filter((entry) => !INTERNAL_PREFIXES.some((prefix) => entry.startsWith(prefix)));

  return {
    skipped: false,
    warning: '',
    files: Array.from(new Set(files)).sort()
  };
}

function collectActiveClaimScopes(repoRoot) {
  const manager = new ClaimManager(path.join(repoRoot, '.ai', 'claims'));
  const activeClaims = manager.list()
    .filter((claim) => claim && claim.status === 'active');
  const scopes = [];

  for (const claim of activeClaims) {
    if (!Array.isArray(claim.scope)) {
      continue;
    }
    for (const scope of claim.scope) {
      const normalized = normalizeRepoPath(repoRoot, scope);
      if (normalized) {
        scopes.push(normalized);
      }
    }
  }

  return {
    activeClaimCount: activeClaims.length,
    claimScopes: Array.from(new Set(scopes)).sort()
  };
}

function isFileInScope(filePath, scopePath) {
  if (!scopePath) {
    return false;
  }
  if (filePath === scopePath) {
    return true;
  }
  return scopePath.endsWith('/') && filePath.startsWith(scopePath);
}

function checkDiffHygiene(repoRoot, opts = {}) {
  const { checkBypass } = require('./session-bypass');
  const bypassInfo = checkBypass(repoRoot, 'diff-hygiene');
  if (bypassInfo.bypassed) {
    const msg = `diff-hygiene: BYPASSED (reason: ${bypassInfo.reason}, expires at: ${bypassInfo.expires_at})`;
    console.warn(`WARNING: ${msg}`);
    return {
      ok: true,
      warnings: [msg],
      changedFiles: [],
      claimScopes: [],
      outOfScopeFiles: [],
      activeClaimCount: 0
    };
  }

  const warnings = [];
  const changed = collectChangedFiles(repoRoot, opts.gitRunner);
  if (changed.skipped) {
    return {
      ok: true,
      warnings: [changed.warning],
      changedFiles: [],
      claimScopes: [],
      outOfScopeFiles: [],
      activeClaimCount: 0
    };
  }

  const { activeClaimCount, claimScopes } = collectActiveClaimScopes(repoRoot);
  if (activeClaimCount === 0) {
    return {
      ok: true,
      warnings: ['diff-hygiene: skipped, no active claim scope'],
      changedFiles: changed.files,
      claimScopes: [],
      outOfScopeFiles: [],
      activeClaimCount
    };
  }

  if (activeClaimCount > 1) {
    warnings.push(`diff-hygiene: multiple active claim scopes detected (${activeClaimCount}); using union`);
  }

  const outOfScopeFiles = changed.files.filter((filePath) => {
    return !claimScopes.some((scopePath) => isFileInScope(filePath, scopePath));
  });

  if (outOfScopeFiles.length > 0) {
    warnings.push(`diff-hygiene: changed files outside active claim scope: ${outOfScopeFiles.join(', ')}`);
  }

  return {
    ok: outOfScopeFiles.length === 0,
    warnings,
    changedFiles: changed.files,
    claimScopes,
    outOfScopeFiles,
    activeClaimCount
  };
}

module.exports = {
  checkDiffHygiene,
  normalizeRepoPath,
  isFileInScope
};
