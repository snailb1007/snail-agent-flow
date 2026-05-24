## Spec Validation

Before starting implementation (e.g. before running GSD), you MUST validate the feature specification, plan, and checklist by running:
```bash
node validators/scripts/validate-spec.js
```
If this script fails, do not proceed with implementation. If it fails 3 times consecutively, it will halt and generate a human review packet at `.ai/reviews/<feature-slug>/human-review.md`. To resume, fix the files and run:
```bash
node validators/scripts/validate-spec.js resume
```

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->

# RTK Token Optimization Rules
You are integrated with RTK (Rust Token Killer). When executing or reading outputs of system commands, you must respect the compressed structural signatures to preserve context tokens:

- Git Status: Interpret short hex indicators and bulleted branches (e.g., "📌 master") as standard clean working trees.
- Test Runners: Expect failed assertions only. Ignore truncated lines for passing suites.
- File Tree/Operations: Recognize that boilerplate directories (node_modules, .git, target, target/debug) are hidden by default; do not re-run commands to find them unless explicitly requested.
- Error logs: Focus strictly on the core stack trace signals; summary formats contain the complete execution diagnostic.
