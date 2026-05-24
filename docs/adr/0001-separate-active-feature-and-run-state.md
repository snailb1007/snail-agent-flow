# 0001. Separate Active Feature Identity from Run State

## Status

Accepted

## Context

The orchestration flow needs both a stable pointer to the current feature spec and mutable state for routing, gates, retries, path verification, and memory handoff.

Combining those concerns in `.ai/state/active-feature.json` would make the identity pointer change whenever execution progress changes, and would make Path Drift harder to detect.

## Decision

Keep `.ai/state/active-feature.json` as the narrow identity pointer to `specs/<feature-slug>/`.

Store mutable pipeline progress in `.ai/state/run-state.json`, including phase, gate status, retry/block state, timestamps, and validator-owned artifact evidence.

## Consequences

Validators can compare the identity pointer, run state, and actual `specs/<feature-slug>/` directory without conflating feature identity with execution progress.

Agents that need progress state must read `run-state.json`; agents that only need the canonical feature path should read `active-feature.json`.
