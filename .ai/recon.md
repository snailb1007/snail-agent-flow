# Recon Report

## Problem

Users are confused by scattered AI coding frameworks, skills, and tools.

## Existing Pain

- Too many separate tools: GSD, Superpowers, GStack, Spec-Kit, OpenSpec, Serena, Context7, Promptfoo.
- No clear order of execution.
- Agents can write specs without reading code.
- Agents can implement invalid specs.
- Agents can loop between spec and validation.
- Memory is lost after each session.

## Source of Truth

- PRD / blueprint file.
- Constitution.
- Current task.

## MVP Boundary

The first repo should provide:
- templates;
- manual pipeline;
- CLAUDE.md / AGENTS.md;
- spec validation checklist;
- memory handoff rules.

## Risks

- Overbuilding into a new heavy framework.
- Too much ceremony.
- Hard dependency on one agent.
- Validation depending too much on LLM judgment.
