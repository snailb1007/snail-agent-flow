---
slug: claude-code-project-flow-skill
status: complete
completed: 2026-05-25
---

# Summary — Claude Code project-flow Skill Visibility

## Findings verified

Claude Code discovers project-specific skills from the `.claude/skills/` directory. Although the `project-flow` skill was defined under `.agents/skills/project-flow/`, it was missing from `.claude/skills/project-flow/`. This made the skill invisible when attempting to tag it in Claude Code.

## Changes

- **Repository Workspace**
  - Copied `.agents/skills/project-flow/` to `.claude/skills/project-flow/` to ensure it is immediately available for Claude Code in the active repository.
- `bin/adp.js` (`handleInit`)
  - Updated the project initialization logic to also copy `project-flow-skill-template.md` to `.claude/skills/project-flow/SKILL.md` (creating directories if missing) so it is automatically set up in new or adopted projects.
- `validators/scripts/test-cli.js`
  - Added assertions to the CLI test suite ensuring `.claude/skills/project-flow/SKILL.md` is successfully created in greenfield initialization and retained without modification in brownfield projects.

## Verification

Ran full test suite:
- `npm test` passed successfully (all 20/20 CLI tests, 9/9 flow parser tests, and 89/89 flow engine tests green).
