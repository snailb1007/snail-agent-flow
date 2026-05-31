# PR 76 Review Comments Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two actionable review comments on `snailb1007/snail-agent-flow#76` in `.claude/skills/atlas-settle/scripts/settle-full.js`.

**Architecture:** Keep the fix local to `settle-full.js`: preserve the verify-command priority chain and make cleanup failure block completion. Add regression coverage in the existing assert-based validator test file so both comments fail before implementation and pass after.

**Tech Stack:** Node.js built-ins (`fs`, `path`, `child_process`), existing `lib/flow-state`, existing validator scripts.

---

## Review Threads

1. `[P2]` `.claude/skills/atlas-settle/scripts/settle-full.js:67`
   JavaScript regexes do not support `\z` as an end-of-string anchor in this context. When `settle` is the final stage in `atlas-flow.yaml`, the YAML `verify_command` block is not matched, so `settle-full.js` falls back to `npm test`.

2. `[P1]` `.claude/skills/atlas-settle/scripts/settle-full.js:169`
   A non-zero `release-locks.js` exit is recorded only as a warning. `settle-full.js` can still mark the flow `done` and add `settle.release`, leaving active locks or claims behind.

## Files

- Modify: `.claude/skills/atlas-settle/scripts/settle-full.js`
  - Fix `resolveVerifyCommand()` stage-block matching.
  - Treat `release-locks.js` non-zero or execution failure as blocking before done-state save.
- Modify: `validators/scripts/test-settle-full.js`
  - Add a regression test for YAML `verify_command` when `settle` is final.
  - Add a regression test for release failure preventing `done`.

## Preflight

- [ ] **Step 1: Run Spec-Kit validation before implementation**

```bash
node validators/scripts/validate-spec.js
```

Expected: exit `0`. If it fails, stop implementation and fix the spec/plan/checklist first. If this is the fourth attempt after three consecutive failures, resume only after the generated human review packet is handled:

```bash
node validators/scripts/validate-spec.js resume
```

- [ ] **Step 2: Refresh GitNexus if the new PR symbols are still missing**

GitNexus currently did not find `resolveVerifyCommand` or `main` in `.claude/skills/atlas-settle/scripts/settle-full.js`, so refresh the index before editing:

```bash
npx gitnexus analyze
```

Expected: command completes successfully and the repository index includes the new PR file.

- [ ] **Step 3: Run GitNexus impact analysis before editing symbols**

```text
gitnexus_impact({
  target: "resolveVerifyCommand",
  file_path: ".claude/skills/atlas-settle/scripts/settle-full.js",
  direction: "upstream",
  includeTests: true
})

gitnexus_impact({
  target: "main",
  file_path: ".claude/skills/atlas-settle/scripts/settle-full.js",
  direction: "upstream",
  includeTests: true
})
```

Expected: low or medium risk limited to settle-stage execution and `validators/scripts/test-settle-full.js`. If risk is high or critical, warn before editing.

## Task 1: Add Regression Test For Final-Stage YAML Verify Command

- [ ] **Step 1: Modify `validators/scripts/test-settle-full.js` constants**

Add `SETTLE_FULL_SCRIPT` next to `RELEASE_LOCKS_SCRIPT`:

```js
const SETTLE_FULL_SCRIPT = path.join(
  REPO_ROOT, '.claude', 'skills', 'atlas-settle', 'scripts', 'settle-full.js'
);
```

- [ ] **Step 2: Add the failing regression test before the final test runner loop**

```js
addTest('settle-full uses atlas-flow.yaml verify_command when settle is final stage', () => {
  const tempDir = createTempProject();

  try {
    const flowState = require('../../lib/flow-state');

    fs.mkdirSync(path.join(tempDir, '.specify', 'templates'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, '.specify', 'templates', 'atlas-flow.yaml'),
      [
        'name: atlas-flow',
        'stages:',
        '  - id: align',
        '    command: echo align',
        '  - id: settle',
        '    command: node .claude/skills/atlas-settle/scripts/settle-full.js',
        '    gate: node .claude/skills/atlas-settle/scripts/settle-full.js',
        '    verify_command: node verify-from-yaml.js'
      ].join('\n'),
      'utf8'
    );

    fs.writeFileSync(
      path.join(tempDir, 'verify-from-yaml.js'),
      [
        "'use strict';",
        "const fs = require('fs');",
        "const path = require('path');",
        "fs.writeFileSync(path.join(process.cwd(), '.ai', 'state', 'yaml-verify-ran.txt'), 'ok');"
      ].join('\n'),
      'utf8'
    );

    flowState.save(tempDir, createValidState());

    const res = cp.spawnSync(process.execPath, [SETTLE_FULL_SCRIPT, tempDir], {
      encoding: 'utf8',
      cwd: tempDir
    });

    assert.strictEqual(res.status, 0, `settle-full should pass, stderr: ${res.stderr}, stdout: ${res.stdout}`);
    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.status, 'PASS');
    assert.ok(
      fs.existsSync(path.join(tempDir, '.ai', 'state', 'yaml-verify-ran.txt')),
      'verify command from atlas-flow.yaml should run'
    );
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});
```

- [ ] **Step 3: Run the focused test and confirm it fails before implementation**

```bash
node validators/scripts/test-settle-full.js
```

Expected before fix: this new test fails because `resolveVerifyCommand()` does not match the final `settle` block and falls back to `npm test`.

## Task 2: Fix Final-Stage YAML Matching

- [ ] **Step 1: Replace the invalid regex end anchor**

In `.claude/skills/atlas-settle/scripts/settle-full.js`, replace:

```js
const settleMatch = yamlContent.match(/- id:\s*settle[\s\S]*?(?=- id:|\z)/);
```

with:

```js
const settleMatch = yamlContent.match(/- id:\s*settle[\s\S]*?(?=\n\s*- id:|$)/);
```

This keeps the local regex parser but makes the final stage match the end of the file.

- [ ] **Step 2: Run the focused test**

```bash
node validators/scripts/test-settle-full.js
```

Expected after this task: the YAML verify-command regression passes. The release-lock regression is not added yet, so no expectation for the second review comment at this step.

## Task 3: Add Regression Test For Release-Locks Failure

- [ ] **Step 1: Add the failing regression test before the final test runner loop**

```js
addTest('settle-full fails and does not mark done when release-locks fails', () => {
  const tempDir = createTempProject();

  try {
    const flowState = require('../../lib/flow-state');

    fs.writeFileSync(
      path.join(tempDir, 'verify-ok.js'),
      "'use strict';\nprocess.exit(0);\n",
      'utf8'
    );

    flowState.save(tempDir, createValidState({
      locks: [{ file: 'src/missing-lease.js', acquired_at: new Date().toISOString() }]
    }));

    const res = cp.spawnSync(process.execPath, [SETTLE_FULL_SCRIPT, '--cmd', 'node verify-ok.js', tempDir], {
      encoding: 'utf8',
      cwd: tempDir
    });

    assert.strictEqual(res.status, 1, 'settle-full should fail when release-locks fails');
    const output = JSON.parse(res.stdout);
    assert.strictEqual(output.status, 'FAIL');
    assert.ok(
      output.blocking.some((entry) => entry.includes('release-locks.js exited with status')),
      `blocking should include release-locks failure, got: ${JSON.stringify(output.blocking)}`
    );

    const updatedState = flowState.load(tempDir);
    assert.notStrictEqual(updatedState.status, 'done', 'state should not be marked done');
    assert.ok(
      !updatedState.completed_steps.includes('settle.release'),
      'settle.release should not be completed when release-locks fails'
    );
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
});
```

- [ ] **Step 2: Run the focused test and confirm it fails before implementation**

```bash
node validators/scripts/test-settle-full.js
```

Expected before fix: the new release-lock regression fails because `settle-full.js` records the non-zero release as a warning and exits `0`.

## Task 4: Make Release Failure Blocking

- [ ] **Step 1: Change non-zero `release-locks.js` handling**

In `.claude/skills/atlas-settle/scripts/settle-full.js`, replace the release block with:

```js
      if (result.status !== 0) {
        const releaseOutput = (result.stdout || result.stderr || '').trim();
        blocking.push(
          'release-locks.js exited with status ' + result.status +
          (releaseOutput ? ': ' + releaseOutput.substring(0, 500) : '')
        );
      }
```

- [ ] **Step 2: Change release spawn exceptions to blocking**

Replace:

```js
      warnings.push('Failed to run release-locks.js: ' + e.message);
```

with:

```js
      blocking.push('Failed to run release-locks.js: ' + e.message);
```

- [ ] **Step 3: Keep done-state save gated by `blocking.length === 0`**

No change is needed to this existing guard:

```js
if (verifySuccess && blocking.length === 0) {
```

With the new blocking entry, `state.status = 'done'` and `settle.release` are skipped when cleanup fails.

- [ ] **Step 4: Run the focused test**

```bash
node validators/scripts/test-settle-full.js
```

Expected: all settle-full tests pass.

## Task 5: Verification

- [ ] **Step 1: Run deterministic validation**

```bash
npm run validate
```

Expected: exit `0`.

- [ ] **Step 2: Run focused validator coverage**

```bash
node validators/scripts/test-settle-full.js
```

Expected: every test prints `[PASS]`.

- [ ] **Step 3: Run full suite if time budget allows**

```bash
npm test
```

Expected: exit `0`.

- [ ] **Step 4: Run GitNexus change detection before commit**

```text
gitnexus_detect_changes({ repo: "snail-agent-flow", scope: "all" })
```

Expected: changed scope is limited to `settle-full.js` and `test-settle-full.js`, affecting only settle-stage execution and validator coverage.

