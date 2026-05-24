# Gate Requirements Quality Checklist

**Purpose**: Validate specification completeness, clarity, and coverage for gate validation and routing requirements before planning and execution.
**Created**: 2026-05-24
**Feature**: [spec.md](file:///Volumes/D/snail-agent-flow/specs/002-routing-gates-memory/spec.md)

## Requirement Completeness

- [ ] CHK001: Are the required input and output files explicitly listed for every gate in the routing matrix? [Completeness, Spec §FR-001]
- [ ] CHK002: Are there explicit requirements specifying the behavior when a gate's required output file is missing? [Completeness, Spec §FR-007]
- [ ] CHK003: Does the spec document the required structure and file extension of the gate review reports? [Completeness, Spec §FR-002]

## Requirement Clarity

- [ ] CHK004: Is the term "non-blocking" for the `WARN` status quantified with specific bypass conditions? [Clarity, Spec §FR-002]
- [ ] CHK005: Are the exact values of the status headers (`PASS`, `BLOCKED`, `NEEDS_HUMAN_REVIEW`, `WARN`) case-sensitive, and is this specified? [Clarity, Spec §FR-002]
- [ ] CHK006: Is the format of the `Blocking Issues` key and its expected "none" value explicitly defined? [Clarity, Spec §FR-003]

## Requirement Consistency

- [ ] CHK007: Do the gate status outcomes in §FR-002 align with the transition rules defined in the failure taxonomy §FR-007? [Consistency]
- [ ] CHK008: Is the definition of validator-owned `verified_artifacts` in §FR-006 consistent with the permissions of execution agents? [Consistency]

## Acceptance Criteria Quality

- [ ] CHK009: Are the success criteria for the tool routing matrix (SC-001) objectively measurable without implementation details? [Measurability, Spec §SC-001]
- [ ] CHK010: Is there a verifiable method to test that 100% of review gates output explicit statuses conforming to the vocabulary? [Measurability, Spec §SC-002]

## Scenario & Edge Case Coverage

- [ ] CHK011: Does the spec define rollback or clean-up requirements if a routing step fails mid-execution? [Gap, Spec §FR-011]
- [ ] CHK012: Are requirements specified for handling concurrent runs or active feature pointer collisions? [Edge Case, Spec §FR-004]
- [ ] CHK013: Is the system behavior defined when the tool resume flag (`--resume`) is invoked but no active feature exists? [Edge Case, Spec §FR-011]

## Non-Functional Requirements

- [ ] CHK014: Are security boundary requirements specified to prevent unauthorized agents from modifying `verified_artifacts`? [Security, Spec §FR-006]
- [ ] CHK015: Are observability/logging requirements defined for gate evaluation results and transition logs? [Observability, Spec §FR-005]
