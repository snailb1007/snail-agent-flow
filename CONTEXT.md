# AI Delivery Pipeline

This context defines the language for the orchestration protocol that coordinates AI-agent tools from idea to release.

## Language

**Superpowers Constitution**:
The global rule layer that defines non-negotiable engineering behavior for every later step.
_Avoid_: Superpowers execution engine

**Spec-Kit**:
The canonical spec system for the MVP.
_Avoid_: OpenSpec as parallel source of truth

**Feature Spec Source of Truth**:
The `specs/<feature-slug>/` directory that owns feature requirements, plan, tasks, and related design artifacts.
_Avoid_: `.ai/specs/current`

**Orchestration State**:
The `.ai/` project area that stores session notes, reviews, handoff state, and durable memory.
_Avoid_: feature spec source of truth

**GSD**:
The execution and workflow-state layer that consumes the canonical spec artifacts and performs implementation, verification support, and handoff.
_Avoid_: release owner, competing spec owner

**GStack Review**:
The critique layer for product, architecture, design, developer experience, QA, and release readiness.
_Avoid_: implementation executor

**GStack Ship**:
The release-readiness owner for the final handoff.
_Avoid_: executor self-approval

**Failure-mode Policy**:
The mandatory state-transition rules that define what must happen when the pipeline cannot proceed normally.
_Avoid_: recovery checklist

**Failure-mode Runbook**:
The operational procedure for handling a specific failure mode.
_Avoid_: system invariant

**Spec Drift**:
A mismatch between the accepted spec and implementation or repository reality.
_Avoid_: local implementation bug

**Context Fragmentation**:
Loss or scattering of durable work state across sessions, agents, or notes.
_Avoid_: normal session notes
