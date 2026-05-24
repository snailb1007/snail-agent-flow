# Memory vs Sessions Boundary

This document outlines what belongs in temporary session logs versus durable project memory.

## Session Logs (Temporary)
- **Path**: `.ai/sessions/`
- **Contents**: Full compiler traces, command outputs, temporary debugging attempts, verbose test logs, and intermediate reasoning.
- **Lifespan**: Auditing only; not referenced by future features.

## Durable Memory (Long-Lived)
- **Path**: `.ai/memory/`
- **Contents**: Promoted architecture designs, decisions with rationale, active risks, and verification logs.
- **Rules**: Zero placeholders. Updated only at the Memory Handoff Gate (D-10) to reflect the actual codebase state.
