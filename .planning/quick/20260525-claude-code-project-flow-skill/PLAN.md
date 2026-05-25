# Quick Task: Claude Code project-flow Skill Visibility

Ensure `project-flow` skill is discoverable/taggable in Claude Code by making it available under `.claude/skills/project-flow/SKILL.md`.

## Proposed Changes
- Copy `.agents/skills/project-flow` directory to `.claude/skills/project-flow`.
- Modify `bin/adp.js` `handleInit` to copy `project-flow-skill-template.md` to `.claude/skills/project-flow/SKILL.md` as well during project initialization.
- Modify `validators/scripts/test-cli.js` to assert the creation and retention of `.claude/skills/project-flow/SKILL.md` in the init tests.
