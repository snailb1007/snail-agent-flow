# HIL Review Surface Prototype

This folder is a throwaway Human-in-the-Loop prototype for Snail Agent Flow.

The goal is to test the review shape before wiring it into the CLI:

- keep Markdown and JSON artifacts as the source of truth
- render a human-readable review surface in HTML
- show ATLAS stage progress, gate state, retry state, locks, and review actions
- make `tasks.md` scannable as rows with status instead of a long Markdown checklist

## Open

Open `index.html` directly in a browser.

No server or dependencies are required. The page includes sample data from the current repository state and also lets you import:

- `.ai/state/flow-state.json`
- `.ai/state/run-state.json`
- `specs/<feature>/tasks.md`

## Intended Next Step

If the shape feels right, convert this into a generated artifact command such as:

```bash
saf hil
```

That command should read the canonical project files and write:

```text
.ai/reviews/<feature-slug>/index.html
```

The generated HTML should remain a projection of the canonical artifacts, not a new source of truth.
