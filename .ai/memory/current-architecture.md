# Current Architecture

Snail Agent Flow operates on a file-based state structure:

## Directory Structure
- `specs/<feature-slug>/`: Source of truth containing `spec.md`, `plan.md`, and `tasks.md`.
- `.specify/`: Spec-Kit presets, templates, and orchestration scripts.
- `.ai/`: Local state, review files, sessions, and durable memory files.

## State Pointers
- `.ai/state/active-feature.json`: Static identity pointer referencing the active feature slug and its path.
- `.ai/state/run-state.json`: Mutable execution metrics including current phase, retries, and verified artifacts.
