# Settle Contract & Profile Mappings

This contract defines the execution requirements for the **Stage S: Settle** phase of the ATLAS Loop.

---

## 1. Settle Sub-steps

The settlement phase consists of six distinct sub-steps, combining automated verification and human/agent judgment.

| Sub-step | Name | Type | Description |
|---|---|---|---|
| **S1** | **Verify** | Automated | Runs the local project test/validation suite. |
| **S2** | **Ship** | Automated/Action | Pushes changes to the remote repository and creates a PR. |
| **S2.5** | **Review** | Judgment | Triggers PR code review (Codex or peer agent) and secures necessary human reviews. |
| **S3** | **Validate** | Automated/Verify | Runs smoke tests or post-deployment monitoring. |
| **S4** | **Close** | Automated (Mandatory) | Releases all acquired claims and file leases. |
| **S5** | **Learn** | Judgment | Logs feature attempt/duration metrics to signals, writes summary reports. |

---

## 2. Profile Mappings (Rigor Matrix)

The sub-steps executed depend on the task's **Risk Profile** (FAST, STANDARD, FULL) and **Work Mode** (PROTOTYPE):

### 2.1. FAST Profile
* **S1 Verify**: Mandatory (runs targeted tests).
* **S2 Ship**: Skipped (no PR / directly merged if applicable, or no branch).
* **S2.5 Review**: Skipped.
* **S3 Validate**: Skipped.
* **S4 Close**: Mandatory lock release.
* **S5 Learn**: Lite metrics logging, skip detailed retrospective.

### 2.2. STANDARD Profile
* **S1 Verify**: Mandatory (runs full test suite).
* **S2 Ship**: Mandatory (create PR branch and push).
* **S2.5 Review**: Mandatory Codex review pass (non-blocking if warning-only, blocking on errors).
* **S3 Validate**: Mandatory local smoke verification.
* **S4 Close**: Mandatory lock release.
* **S5 Learn**: Complete signal logging + retrospective summary.

### 2.3. FULL Profile
* **S1 Verify**: Mandatory (runs full test suite + validation scripts).
* **S2 Ship**: Mandatory (PR creation).
* **S2.5 Review**: Mandatory Codex review AND formal Human review gate sign-off (BLOCKING).
* **S3 Validate**: Mandatory validation smoke test + production canary check.
* **S4 Close**: Mandatory lock release.
* **S5 Learn**: Complete signal logging + retrospective summary + lessons learned database update.

### 2.4. PROTOTYPE Work Mode
* Skips **S2 Ship** and **S2.5 Review** (never merged to main/production).
* Force-runs **S4 Close** (cleanup is critical to free up shared workspace resources).

---

## 3. Automation Contracts

All automated verification scripts under `scripts/` MUST return a JSON payload conforming to the `gate-result.schema.json` contract:

```json
{
  "stage_id": "settle",
  "status": "PASS",
  "blocking": [],
  "warnings": [],
  "artifacts_produced": []
}
```
