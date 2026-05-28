# Risk-Adaptive Operating Profiles

This document defines the risk-adaptive profile selection scoring rubric and operating profile execution rigor for the AI delivery pipeline.

## 1. Scoring Rubric

Profiles are selected based on a total risk score calculated across five dimensions on a scale of 0 to 2:

| Score | Novelty | Blast Radius | Ambiguity | Reversibility | User/Biz Risk |
|---|---|---|---|---|---|
| **0** | Familiar, boilerplate | Single file / local | Clear, fully specified | Trivial to revert | No external impact |
| **1** | Semi-novel / extension | Module / subsystem | Minor open questions | Requires minor cleanup | Internal tool / low |
| **2** | Brand new technology | Cross-cutting / core | High, underspecified | Breaking / hard rollback | Customer-facing / high |

The total score is the sum of these dimensions:
$$\text{Total Score} = \text{Novelty} + \text{Blast Radius} + \text{Ambiguity} + \text{Reversibility} + \text{User/Biz Risk}$$

## 2. Operating Profiles

- **FAST (Total: 0-2)**: Low risk. Minimal rituals. No pre-implementation plan or review gates. Direct execution & verification.
- **STANDARD (Total: 3-5)**: Medium risk. Requires Spec-Kit checklist and local verification.
- **FULL (Total: 6+)**: High risk. Requires full Recon, GStack architecture critique, Spec-Kit specs + plans, and human review gates.
- **BUGFIX (Override)**: Defect handling. Skip feature spec; force root-cause diagnosis and reproduction test first.
- **PROTOTYPE (Override)**: Exploration. Throwaway branch; no production spec updates, no durable memory promotion.

## 3. Override Guidelines

When invoking the scorer, the profile can be overridden to `BUGFIX` or `PROTOTYPE` based on the intent of the work unit. Under these overrides, the execution rules are scoped to prioritize root cause isolation (for bugfixes) or rapid prototyping/experimentation (for prototypes).
