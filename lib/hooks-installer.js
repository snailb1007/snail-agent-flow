'use strict';

const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');

const SAF_SESSION_START_HOOK = {
  type: 'command',
  command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/saf-session-start.cjs"',
  _saf: 'SessionStart'
};

const SAF_STOP_HOOK = {
  type: 'command',
  command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/saf-stop.cjs"',
  _saf: 'Stop'
};

const SAF_PRE_WRITE_HOOK_BLOCK = {
  matcher: 'WriteFile|EditFile|ReplaceFileContent|MultiReplaceFileContent|WriteToFile',
  hooks: [
    {
      type: 'command',
      command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/saf-pre-write.cjs"',
      _saf: 'PreToolUse'
    }
  ]
};

function getSettingsPath(repoRoot) {
  return path.join(repoRoot, '.claude/settings.json');
}

function loadSettings(repoRoot) {
  const p = getSettingsPath(repoRoot);
  if (!fs.existsSync(p)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveSettings(repoRoot, settings) {
  const p = getSettingsPath(repoRoot);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(p, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

function installHooks(repoRoot, options = {}) {
  const apply = options.apply || false;
  const events = options.events || ['SessionStart', 'Stop', 'PreToolUse'];

  const sourceHooksDir = path.join(repoRoot, '.specify/templates/hooks');
  const targetHooksDir = path.join(repoRoot, '.claude/hooks');

  const settings = loadSettings(repoRoot);
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Merge SessionStart
  if (events.includes('SessionStart')) {
    if (!settings.hooks.SessionStart) {
      settings.hooks.SessionStart = [];
    }
    const exists = settings.hooks.SessionStart.some(h => h._saf === 'SessionStart');
    if (!exists) {
      settings.hooks.SessionStart.push(SAF_SESSION_START_HOOK);
    }
  }

  // Merge Stop
  if (events.includes('Stop')) {
    if (!settings.hooks.Stop) {
      settings.hooks.Stop = [];
    }
    const exists = settings.hooks.Stop.some(h => h._saf === 'Stop');
    if (!exists) {
      settings.hooks.Stop.push(SAF_STOP_HOOK);
    }
  }

  // Merge PreToolUse
  if (events.includes('PreToolUse')) {
    if (!settings.hooks.PreToolUse) {
      settings.hooks.PreToolUse = [];
    }
    const exists = settings.hooks.PreToolUse.some(block => 
      block.hooks && block.hooks.some(h => h._saf === 'PreToolUse')
    );
    if (!exists) {
      settings.hooks.PreToolUse.push(SAF_PRE_WRITE_HOOK_BLOCK);
    }
  }

  const oldSettings = loadSettings(repoRoot);
  const diff = !isDeepStrictEqual(settings, oldSettings);

  if (!apply) {
    console.log('[hooks] DRY-RUN: Merged settings JSON preview:');
    console.log(JSON.stringify(settings, null, 2));
    if (diff) {
      console.log('\n[hooks] Changes detected. Run with --apply to write changes.');
    } else {
      console.log('\n[hooks] No changes needed (hooks already installed).');
    }
    return;
  }

  // Write hooks cjs files
  if (!fs.existsSync(targetHooksDir)) {
    fs.mkdirSync(targetHooksDir, { recursive: true });
  }

  const hookFiles = [
    { name: 'saf-session-start.cjs', event: 'SessionStart' },
    { name: 'saf-pre-write.cjs', event: 'PreToolUse' },
    { name: 'saf-stop.cjs', event: 'Stop' }
  ];

  for (const h of hookFiles) {
    if (events.includes(h.event)) {
      const srcPath = path.join(sourceHooksDir, h.name);
      const destPath = path.join(targetHooksDir, h.name);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`[hooks] Copied ${h.name} to .claude/hooks/`);
      }
    }
  }

  // Write settings
  const settingsPath = getSettingsPath(repoRoot);
  if (fs.existsSync(settingsPath)) {
    const backupPath = settingsPath + '.pre-hooks.bak';
    fs.copyFileSync(settingsPath, backupPath);
    console.log(`[hooks] Backed up settings.json to settings.json.pre-hooks.bak`);
  }

  saveSettings(repoRoot, settings);
  console.log('[hooks] Successfully updated .claude/settings.json');
}

function uninstallHooks(repoRoot) {
  const settings = loadSettings(repoRoot);
  if (!settings.hooks) {
    console.log('[hooks] No hooks section in settings.json. Nothing to uninstall.');
    return;
  }

  let modified = false;

  // Uninstall SessionStart
  if (settings.hooks.SessionStart) {
    const origLen = settings.hooks.SessionStart.length;
    settings.hooks.SessionStart = settings.hooks.SessionStart.filter(h => h._saf !== 'SessionStart');
    if (settings.hooks.SessionStart.length !== origLen) {
      modified = true;
    }
    if (settings.hooks.SessionStart.length === 0) {
      delete settings.hooks.SessionStart;
    }
  }

  // Uninstall Stop
  if (settings.hooks.Stop) {
    const origLen = settings.hooks.Stop.length;
    settings.hooks.Stop = settings.hooks.Stop.filter(h => h._saf !== 'Stop');
    if (settings.hooks.Stop.length !== origLen) {
      modified = true;
    }
    if (settings.hooks.Stop.length === 0) {
      delete settings.hooks.Stop;
    }
  }

  // Uninstall PreToolUse
  if (settings.hooks.PreToolUse) {
    const origLen = settings.hooks.PreToolUse.length;
    settings.hooks.PreToolUse = settings.hooks.PreToolUse.map(block => {
      if (block.hooks) {
        block.hooks = block.hooks.filter(h => h._saf !== 'PreToolUse');
      }
      return block;
    }).filter(block => block.hooks && block.hooks.length > 0);

    if (settings.hooks.PreToolUse.length !== origLen) {
      modified = true;
    }
    if (settings.hooks.PreToolUse.length === 0) {
      delete settings.hooks.PreToolUse;
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
    modified = true;
  }

  if (modified) {
    const settingsPath = getSettingsPath(repoRoot);
    if (fs.existsSync(settingsPath)) {
      const backupPath = settingsPath + '.pre-uninstall.bak';
      fs.copyFileSync(settingsPath, backupPath);
      console.log(`[hooks] Backed up settings.json to settings.json.pre-uninstall.bak`);
    }
    saveSettings(repoRoot, settings);
    console.log('[hooks] Removed SAF hooks from .claude/settings.json');
  } else {
    console.log('[hooks] No SAF hooks found in settings.json to remove.');
  }

  // Clean up hooks files
  const targetHooksDir = path.join(repoRoot, '.claude/hooks');
  const filesToRemove = ['saf-session-start.cjs', 'saf-pre-write.cjs', 'saf-stop.cjs'];
  for (const f of filesToRemove) {
    const fp = path.join(targetHooksDir, f);
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
      console.log(`[hooks] Deleted .claude/hooks/${f}`);
    }
  }
}

function statusHooks(repoRoot) {
  const settings = loadSettings(repoRoot);
  const targetHooksDir = path.join(repoRoot, '.claude/hooks');

  const status = {
    SessionStart: {
      registered: false,
      file_exists: fs.existsSync(path.join(targetHooksDir, 'saf-session-start.cjs'))
    },
    Stop: {
      registered: false,
      file_exists: fs.existsSync(path.join(targetHooksDir, 'saf-stop.cjs'))
    },
    PreToolUse: {
      registered: false,
      file_exists: fs.existsSync(path.join(targetHooksDir, 'saf-pre-write.cjs'))
    }
  };

  if (settings.hooks) {
    if (settings.hooks.SessionStart) {
      status.SessionStart.registered = settings.hooks.SessionStart.some(h => h._saf === 'SessionStart');
    }
    if (settings.hooks.Stop) {
      status.Stop.registered = settings.hooks.Stop.some(h => h._saf === 'Stop');
    }
    if (settings.hooks.PreToolUse) {
      status.PreToolUse.registered = settings.hooks.PreToolUse.some(block =>
        block.hooks && block.hooks.some(h => h._saf === 'PreToolUse')
      );
    }
  }

  console.log('SAF Lifecycle Hooks Status:');
  console.log('----------------------------------------------------');
  console.log(`SessionStart: Registered=${status.SessionStart.registered ? 'YES' : 'NO'} | File=${status.SessionStart.file_exists ? 'YES' : 'NO'}`);
  console.log(`Stop:         Registered=${status.Stop.registered ? 'YES' : 'NO'} | File=${status.Stop.file_exists ? 'YES' : 'NO'}`);
  console.log(`PreToolUse:   Registered=${status.PreToolUse.registered ? 'YES' : 'NO'} | File=${status.PreToolUse.file_exists ? 'YES' : 'NO'}`);
}

module.exports = {
  installHooks,
  uninstallHooks,
  statusHooks
};
