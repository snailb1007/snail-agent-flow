# Phase 14: Improve AI for Spawn Subagent Support — Challenge Notes

**Date:** 2026-05-26
**Phase:** 14-improve-ai-for-spawn-subagent-support

## Design Verification

### 1. Robust Home Directory Resolution
- **Challenge:** How does `adp init` safely resolve `~` in path strings?
- **Analysis:** Node.js `path.join` does not automatically expand `~` to the home directory. We must check if the path starts with `~` and replace it with `os.homedir()`.
- **Remediation:** Implement a clean path-resolution helper:
  ```javascript
  const os = require('os');
  function resolveHomePath(filePath) {
    if (filePath.startsWith('~')) {
      return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
  }
  ```

### 2. Regular Expression Parsing of execution_context
- **Challenge:** How does the CLI parse the `<execution_context>` block in `SKILL.md` to extract paths?
- **Analysis:** The `<execution_context>` block contains lines starting with `@` followed by a file path. We need to parse these lines, check if they start with `~` or reference `antigravity`, and rewrite them.
- **Remediation:** We can extract the `<execution_context>...</execution_context>` block using regex:
  ```javascript
  const contextMatch = content.match(/<execution_context>([\s\S]*?)<\/execution_context>/);
  ```
  If found, split the block by newline. For each line:
  - Trim whitespace.
  - If it starts with `@`, extract the path.
  - Check if the path matches `~/.gemini/antigravity` or is a global path.
  - Copy the file to local `.agents/skills/<skill-slug>/workflows/` or `/references/` depending on the file's parent folder.
  - Rewrite the line in the context block to point to the local path.
  - Finally, replace the context block in `SKILL.md` with the updated lines.

### 3. Missing Global Files Graceful Handling
- **Challenge:** What if a skill references a file that does not exist in the global folder on the user's system?
- **Analysis:** If a referenced file is missing, throwing an error might block `adp init` completely.
- **Remediation:** Log a warning (e.g. `[init] WARNING: Global context file not found: <path>`) and skip copying/rewriting for that specific file, but continue processing the remaining files and skills.

### 4. Appending to Existing Instruction Files
- **Challenge:** If `CLAUDE.md`, `GEMINI.md`, or `AGENTS.md` already exist, how do we append the subagent guidelines without duplicating the section?
- **Analysis:** If the user already has custom instructions in these files, we must not overwrite them. We should append the guidelines only if they are not already present.
- **Remediation:** Read the existing file content. Check if it contains `## Subagent & Parallel Execution Guidelines` (case-insensitive or exact match). If it does not, append the section to the end of the file.

## Risk Registry

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sandbox file copy fails due to system permissions on global folders | High | Use try-catch blocks for all directory read, file copy, and file write operations. Log warnings instead of crashing. |
| Global file naming conflicts | Medium | Maintain the original folder structure (e.g. `/workflows` or `/references`) under the local skill directory to prevent name collisions. |
| Committing localized GSD files bloats Git history | Low | GSD workflows are small markdown files (~10-30KB). The trade-off is acceptable because local files are required for sandbox compliance. |
| Non-Unix path separator issues on Windows | Medium | Use `path.posix` or standard `path.join` and replace backslashes `\` with forward slashes `/` in `SKILL.md` paths since AI runtimes require forward slashes. |
