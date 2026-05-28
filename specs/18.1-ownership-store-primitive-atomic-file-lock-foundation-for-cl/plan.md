# Implementation Plan: Ownership-Store Primitive

## Proposed Changes

### Core Library

#### [NEW] [ownership-store.js](file:///Volumes/D/snail-agent-flow/lib/ownership-store.js)
Atomic, crash-safe, and race-proof file locking store primitive.

#### [MODIFY] [init-checks.js](file:///Volumes/D/snail-agent-flow/lib/init-checks.js)
Integrate directory checks for `.ai/claims` and `.ai/locks`.

### CLI

#### [MODIFY] [adp.js](file:///Volumes/D/snail-agent-flow/bin/adp.js)
Integrate active locks checks into `adp doctor` and directory initialization in `adp init`.

### Tests

#### [NEW] [test-ownership-store.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-ownership-store.js)
Unit test coverage for OwnershipStore.

#### [MODIFY] [test-cli.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-cli.js)
Add tests for context policy configuration and CLI doctor error cases.

#### [MODIFY] [test-init-checks.js](file:///Volumes/D/snail-agent-flow/validators/scripts/test-init-checks.js)
Add unit tests for strict initialization checks.

#### [MODIFY] [package.json](file:///Volumes/D/snail-agent-flow/package.json)
Wire `test-ownership-store.js` into the `test` script.

## Verification Plan

### Automated Tests
- Run unit tests: `node validators/scripts/test-ownership-store.js`
- Run full verification: `npm test`

### Manual Verification
- Run `node bin/adp.js init` to verify directories are created.
- Run `node bin/adp.js doctor --check-locks` to check active counts.
