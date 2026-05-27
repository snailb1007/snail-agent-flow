# PRD v4: Risk-Adaptive AI Delivery Operating System (RAOS)

Thin, layered protocol defining risk-based execution rigor, parallel-agent resource ownership, and decision-driven feedback loops.

---

## 1. Architecture: The 5 Layers

```text
Layer 4: Tool Adapters      (GStack, GSD, Spec-Kit, Custom Scripts)
      ↓
Layer 3: Observability      (Metrics feedback bus, profile escalations)
      ↓
Layer 2: Operating Profiles (FAST, STANDARD, FULL, BUGFIX, PROTOTYPE)
      ↓
Layer 1: Project Invariants  (Artifact leases, task claims, gates, handoff)
      ↓
Layer 0: Meta Knowledge     (Cross-project preferences, suggestions)
```

- **Layer 0 (Meta Knowledge)**: Preferences/validated patterns across projects. Suggests behaviors; never overrides local project facts (code, context, ADRs).
- **Layer 1 (Project Invariants)**: Core rules. Ownership primitives (claims, leases), validation gates, state handoffs. Source of truth is repo-versioned (not issues).
- **Layer 2 (Operating Profiles)**: Scopes execution rigor to match risk.
- **Layer 3 (Observability)**: Feedback bus. Signals dictate profile selection, escalation, and maintenance.
- **Layer 4 (Tool Adapters)**: Pluggable interfaces for tools. Tools are adapters, not the source of truth.

---

## 2. Risk-Adaptive Operating Profiles

Rigorous process is expensive; speed without validation is dangerous. RAOS dynamically selects profile based on risk score.

### 2.1. Scoring Rubric (0-2 scale per dimension)

| Score | Novelty | Blast Radius | Ambiguity | Reversibility | User/Biz Risk |
|---|---|---|---|---|---|
| **0** | Familiar, boilerplate | Single file / local | Clear, fully specified | Trivial to revert | No external impact |
| **1** | Semi-novel / extension | Module / subsystem | Minor open questions | Requires minor cleanup | Internal tool / low |
| **2** | Brand new technology | Cross-cutting / core | High, underspecified | Breaking / hard rollback | Customer-facing / high |

### 2.2. Profile Selection

$$\text{Total Score} = \text{Novelty} + \text{Blast Radius} + \text{Ambiguity} + \text{Reversibility} + \text{User/Biz Risk}$$

- **FAST (Total: 0-2)**: Low risk. Minimal rituals. No pre-implementation plan or review gates. Direct execution & verification.
- **STANDARD (Total: 3-5)**: Medium risk. Requires Spec-Kit checklist and local verification.
- **FULL (Total: 6+)**: High risk. Requires full Recon, GStack architecture critique, Spec-Kit specs + plans, and human review gates.
- **BUGFIX (Override)**: Defect handling. Skip feature spec; force root-cause diagnosis and reproduction test first.
- **PROTOTYPE (Override)**: Exploration. Throwaway branch; no production spec updates, no durable memory promotion.

---

## 3. Resource Ownership: Claims & Leases

Prevents race conditions, duplicate effort, and write conflicts in parallel agent environments.

### 3.1. Claim (Work Unit Ownership)
- **Target**: Task in `tasks.md` / work item.
- **Record**: `.ai/claims/<task-slug>.json`.
- **Properties**: `owner`, `task`, `profile`, `scope` (write targets), `start_time`, `status` (`active` | `completed`).

### 3.2. Lease (Shared Artifact Lock)
- **Target**: Source-of-truth files (`CONTEXT.md`, specs, roadmaps, ADRs).
- **Record**: `.ai/locks/<file-hash>.json`.
- **Properties**: `owner`, `target_file`, `purpose`, `acquired_time`, `expiry` (TTL), `heartbeat`.
- **Invariants**:
  - Writers must acquire lease before write.
  - Active lease blocks other writers.
  - Heartbeat extends TTL. Expired lease auto-releases.

---

## 4. State Transitions: Checkpoints & ADRs

- **Checkpoints (`.ai/state/profile-switch-*.md`)**: Transient state records for profile escalations (e.g., FAST → STANDARD) or context handoffs. Contains: transition reason, completed files, active risks, resume steps.
- **ADRs (`docs/adr/*.md`)**: Durable architectural or product decisions only. Never used for transient state tracking.

---

## 5. Observability: Decision-Linked Signals

Signals are tracked only when paired with a workflow decision.

| Signal | Location | Actionable Decision |
|---|---|---|
| **Phase Duration** | `.ai/signals/` | Split phase if duration exceeds 3 days. |
| **Revision Count** | `.ai/signals/` | Escalate profile / trigger human review if revision loop count > 2. |
| **Escalation Count** | `.ai/signals/` | Recalibrate scoring rubric thresholds if escalations > 20% of tasks. |
| **Test Pain Notes** | `.ai/signals/` | Schedule refactoring milestone if test friction increases. |
| **Recurring Review Flags** | `.ai/signals/` | Update Layer 0 constraints / add linters if same feedback repeats. |

---

## 6. Failure Recovery Policy

Mandatory state transitions for stuck pipelines:

| Failure Mode | Direct Transition | Recovery Requirement |
|---|---|---|
| **Gate / Validator Blocked** | `NEEDS_HUMAN_REVIEW` | Generate Human Review Packet after 3 consecutive failures. |
| **Spec Drift** | Return to Spec Stage | Halt implementation, update spec/plan, re-validate before resuming. |
| **Context Fragmentation** | Trigger Handoff | Save state to `.ai/state/context-handoff.json`, restart session. |
| **Lease Collision** | Back-off / Wait | Exponential back-off (max 3 retries), then notify operator. |

---

## 7. Minimal Kernel (MVP Scope)

```text
1. Task scoring on start.
2. Claim work before editing.
3. Lease files before writing.
4. Checkpoint on profile switch.
5. Log 5 starting signals.
6. Drop unlinked signals.
```

### Directory Structure

```text
.ai/
├── claims/                   # JSON task claims
├── locks/                    # JSON file leases
├── signals/
│   └── current-period.md     # 5 signals log
├── state/
│   ├── profile-switch-*.md   # Switch checkpoints
│   └── context-handoff.json  # Handoff target
docs/
└── flow/
    ├── profiles.md           # Scored rubric configuration
    ├── artifact-ownership.md # Lease policy
    └── recovery.md           # Failure policies
```
