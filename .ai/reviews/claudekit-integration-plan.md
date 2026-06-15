# Kế hoạch cải tiến SAF từ đánh giá ClaudeKit (2026-06-15)

> Nguồn: đánh giá ClaudeKit của người dùng (đã xác minh tính năng thực tế).
> Tham chiếu roadmap hiện hữu: [`oss-benchmark-assessment.md`](./oss-benchmark-assessment.md).
> Hợp đồng ràng buộc: [`docs/compatibility-policy.md`](../../docs/compatibility-policy.md) — **mọi item dưới đây phải tuân thủ trước khi ship**; spec author copy nguyên dòng compat vào `plan.md` của feature.

## 0. Tóm tắt điều hành

4 đề xuất từ ClaudeKit, đối chiếu trạng thái codebase thực tế:

| # | Đề xuất | CLI/skill hiện có | Khoảng trống thực sự | Roadmap cũ |
|---|---|---|---|---|
| A | Silent Hooks (SessionStart/Stop/PreToolUse) | `status`, `lease`, `compact-memory` ĐÃ CÓ | Chưa có **wiring** vào Claude Code lifecycle; `lease` chưa có chế độ kiểm tra read-only | mở rộng P1 #8 |
| B | Checkpoint + Rollback cho Stage A (Act) | `checkpoint` ĐÃ CÓ nhưng là *profile-switch markdown*, KHÔNG phải git snapshot | Cần snapshot/restore git thật; tránh đụng tên `checkpoint` | MỚI |
| C | Profiling (latency + output size) cho hook/CLI | `budget` ước lượng byte; `signal-logger` ghi jsonl | Chưa đo thời gian thực thi & kích thước output thực của lệnh SAF | mở rộng P2 #13 |
| D | Session-based bypass cho gate khi debug gấp | `flow-state.json`, 3-strikes halt | Chưa có cơ chế bypass tạm theo phiên, có TTL + audit | MỚI (liên quan P1 #6 HIL) |

**Nguyên tắc xuyên suốt (từ compat policy §1.4, §1.5):** mọi enforcement mới ship **opt-in trước** (flag/lệnh mới), default không đổi, chỉ blocking sau cửa sổ deprecation. Lệnh/flag/exit-code cũ giữ nguyên nghĩa.

---

## Item A — ATLAS Gates thành Silent Hooks

### A.1 Trạng thái hiện tại (bằng chứng)
- `.claude/settings.json` chỉ có **một** hook: `PreToolUse` matcher `Skill` → `check-gstack.sh` (`.claude/settings.json:3-13`). Không có `SessionStart`, không có `Stop`, không có `PreToolUse` cho `Write`/`Edit`.
- Lệnh đích đã tồn tại: `handleStatus` (`bin/adp.js:779`), `handleLease` (`bin/adp.js:1814`), `handleCompactMemory` (`bin/adp.js:2315`).
- **Chặn kỹ thuật:** `LeaseManager.acquire()` *ném lỗi* khi file đang bị owner khác giữ (`lib/lease-manager.js:37` → `store.acquire`). Không có hàm đọc read-only ("ai đang giữ?") → một PreToolUse hook không thể kiểm tra mà không vô tình acquire lease.
- Hook mẫu hiện tại là `.sh` (bash). Môi trường target gồm **Windows**; cần hook portable.

### A.2 Ràng buộc compat (BẮT BUỘC — matrix dòng "P1: hooks enforcement", Risk **High**)
> Hooks **chỉ cài qua `saf hooks install`** tường minh, **không bao giờ** do `init`/`upgrade` tự ghi vào `.claude/settings.json` (vi phạm lời hứa non-intrusive). Phải có `saf hooks uninstall`.

⇒ Quyết định kiến trúc: KHÔNG tự động hoá ở `init`. Thêm lệnh `saf hooks <install|uninstall|status>`.

### A.3 Thiết kế
1. **Lệnh mới `saf hooks`** (`bin/adp.js` + `lib/hooks-installer.js`):
   - `install [--events <list>] [--dry-run]`: merge (không ghi đè) các block hook vào `.claude/settings.json`, idempotent, backup `.claude/settings.json.pre-hooks.bak` trước khi sửa. Mặc định `--dry-run` (in diff), cần `--apply` để ghi — đồng bộ tinh thần `saf upgrade` (compat §2).
   - `uninstall`: gỡ đúng các block do SAF thêm (đánh dấu bằng khóa `"_saf": "<event>"`), giữ nguyên hook của team.
   - `status`: liệt kê hook SAF đang active.
2. **Hook scripts portable** — viết `.cjs` chạy bằng `node` (chạy được cả win32 + posix), đặt tại `.claude/hooks/saf-*.cjs`:
   - `saf-session-start.cjs` → gọi `saf status`, in gọn (≤ ~15 dòng) stage hiện tại vào context SessionStart.
   - `saf-pre-write.cjs` (matcher `Write|Edit|MultiEdit`) → đọc `tool_input.file_path` từ stdin event JSON, map về repo-relative, gọi `saf lease --check <file>`. Nếu xung đột (owner khác đang giữ) → trả JSON deny đúng giao thức Claude Code: `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}}`. Không xung đột → exit 0 im lặng.
   - `saf-stop.cjs` (`Stop`) → chạy `saf compact-memory` (chỉ **prep** deterministic, không gọi LLM theo Snail Trail policy) để dựng sẵn input pack + scaffold `.ai/state/handoff.md`; in 1 dòng nhắc spawn subagent. **KHÔNG** chạy `saf handoff` (gate) ở Stop vì sẽ fail khi report chưa được author → chặn đóng phiên sai.
3. **`lease --check` (read-only, additive)** — thêm `LeaseManager.inspect(file)` (`lib/lease-manager.js`) trả `{held, owner, pid, acquired_at}` không mutate; thêm nhánh `--check` trong `handleLease` (`bin/adp.js:1814`): exit 0 nếu trống/own bởi chính mình, exit 3 + in owner nếu bị người khác giữ. Giữ nguyên hành vi `acquire`/`--release` cũ (compat §1.5).

### A.4 Tệp đụng tới
- Mới: `lib/hooks-installer.js`, `.claude/hooks/saf-session-start.cjs`, `.claude/hooks/saf-pre-write.cjs`, `.claude/hooks/saf-stop.cjs`, `.specify/templates/hooks/*` (nguồn để `hooks install` copy).
- Sửa: `bin/adp.js` (dispatch + `handleHooks` + nhánh `lease --check` + USAGE), `lib/lease-manager.js` (`inspect`).
- Test: `validators/scripts/test-hooks-installer.js` (merge/idempotent/uninstall/non-intrusive), `test-lease-check.js`.

### A.5 Compat row (copy vào plan.md feature)
`Hooks: cài chỉ qua saf hooks install (--apply), backup trước khi sửa, uninstall gỡ đúng block SAF, init/upgrade KHÔNG đụng settings.json. lease --check là flag mới, exit code mới (3); acquire/--release giữ nguyên.`

### A.6 Verify
`node bin/adp.js hooks install --dry-run` (in diff, không ghi) · `npm run test:cli` · `npm test`.

---

## Item B — Checkpoint snapshot + Rollback cho Stage A (Act)

### B.1 Trạng thái hiện tại
- `handleCheckpoint` (`bin/adp.js:1899`) hiện viết **profile-switch markdown** qua `lib/checkpoint-writer.js` (`--switch <from> <to> --reason`). Đây KHÔNG phải git snapshot. **Đụng tên** với ý đồ của đề xuất.
- Stage L chỉ ghi commit hash khởi điểm (không có rollback chuyên dụng giữa các lần thử của Stage A).

### B.2 Quyết định: KHÔNG tái dùng `checkpoint`
Để giữ CLI stability (compat §1.5), thêm verb mới **`saf snapshot`** / **`saf restore`** (git-based), `checkpoint` giữ nguyên nghĩa profile-switch.

### B.3 Thiết kế (`lib/act-snapshot.js`)
- `saf snapshot [--label <text>]`: từ chối nếu không phải git repo. Tạo snapshot **không phá working tree** bằng `git stash create` → trả sha của commit treo; lưu `{id, sha, label, stage, created_at}` vào `.ai/state/act-checkpoints.json` (artifact mới, additive). Snapshot gồm cả staged + unstaged.
- `saf restore <id> [--hard]`: mặc định `git stash apply <sha>` (non-destructive, giữ thay đổi hiện tại); `--hard` mới làm `git checkout`/reset về snapshot (in cảnh báo + yêu cầu xác nhận `--yes`).
- `saf snapshot --list`: liệt kê snapshot Stage A của feature hiện tại.
- Ghi tham chiếu additive vào `flow-state.json` (`act_snapshots: []`) — reader chấp nhận file cũ thiếu field (compat §1.2).
- Tích hợp skill Act: `atlas-gates`/Act-stage SKILL gợi ý chụp snapshot trước mỗi vòng thử rủi ro cao.

### B.4 Tệp đụng tới
- Mới: `lib/act-snapshot.js`, `validators/scripts/test-act-snapshot.js`.
- Sửa: `bin/adp.js` (dispatch `snapshot`/`restore` + USAGE), `.claude/skills/atlas-gates/SKILL.md` (hướng dẫn dùng trong Act), `lib/flow-state.js` (field `act_snapshots` optional).

### B.5 Compat row
`snapshot/restore là lệnh mới (git stash-based, an toàn, --hard cần --yes). checkpoint (profile-switch) KHÔNG đổi. act-checkpoints.json + flow-state.act_snapshots là additive; reader chấp nhận thiếu field.`

### B.6 Verify
`git init` fixture → `node bin/adp.js snapshot --label test` → sửa file → `node bin/adp.js restore <id>` · `node validators/scripts/test-act-snapshot.js`.

---

## Item C — Profiling latency + output size vào Context Budget Gate

### C.1 Trạng thái hiện tại
- `handleBudget` (`bin/adp.js:2045`) chỉ ước lượng **byte pressure tĩnh** (`lib/context-budget`), không đo thời gian chạy hay kích thước output thực.
- `signal-logger` (`handleSignal:1956`) đã ghi jsonl vào `.ai/signals/` — tái dùng được; format signal là additive-only (matrix P2).
- Rủi ro thật: hook chạy đồng bộ; nếu validator/hook in quá nhiều → bơm log lớn vào context AI.

### C.2 Thiết kế
1. **Wrapper đo lường `saf profile -- <cmd...>`** (`lib/cmd-profiler.js`): chạy lệnh con, đo `duration_ms` + `stdout_bytes` + `stderr_bytes` + `exit_code`; ghi 1 record jsonl vào `.ai/signals/profile.jsonl` (additive). In bảng gọn.
2. **Hook output budget:** thêm ngưỡng `hook_output_warn_bytes` (mặc định ví dụ 4096) vào `.ai/state/context-policy.json` (additive key; file cũ thiếu key ⇒ hành vi như cũ). Mỗi hook `.cjs` (Item A) tự cảnh báo stderr nếu output vượt ngưỡng — đảm bảo hook không bơm log lớn.
3. **`saf budget --profile`:** ngoài byte tĩnh, đính kèm thống kê p50/p95 latency + output size của các lệnh SAF gần đây đọc từ `profile.jsonl`. Mặc định `budget` cũ KHÔNG đổi output (compat: log parser cũ vẫn chạy).
4. Liên kết P2 #13: là bước đầu của `saf stats` (token/cost per stage, forensics).

### C.3 Tệp đụng tới
- Mới: `lib/cmd-profiler.js`, `validators/scripts/test-cmd-profiler.js`.
- Sửa: `bin/adp.js` (`handleProfile` + nhánh `--profile` cho budget + USAGE), `lib/context-budget.js` (đọc key `hook_output_warn_bytes` optional), hook `.cjs` (cảnh báo kích thước).

### C.4 Compat row
`profile là lệnh mới; budget --profile là flag mới (output budget mặc định KHÔNG đổi). profile.jsonl + hook_output_warn_bytes là additive; policy file cũ thiếu key chạy như hiện tại.`

### C.5 Verify
`node bin/adp.js profile -- node bin/adp.js status` → in latency+bytes, ghi `.ai/signals/profile.jsonl` · `node bin/adp.js budget --profile`.

---

## Item D — Session-based Bypass cho Human-in-the-Loop

### D.1 Trạng thái hiện tại
- Validator fail liên tiếp → 3-strikes halt + human-review packet (`.ai/reviews/<slug>/human-review.md`, theo CLAUDE.md). Không có cách bỏ qua **tạm thời** gate phụ khi debug gấp mà không sửa config chung.

### D.2 Thiết kế (an toàn là trọng tâm)
- `saf bypass <gate-id> [--ttl <sec>] [--reason "<text>"]`: ghi `.ai/state/session-bypass.json` (ephemeral, **gitignored**, có `expires_at`, `pid`, `reason`, `gate`). `--list` / `--clear`.
- **Sàn cứng KHÔNG bao giờ bypass được:** `validate-spec` core (compat §1.5: `0=pass/1=fail` vĩnh viễn) và mọi security gate. Chỉ gate phụ honor bypass: `diff-hygiene`, `budget --enforce`, `lease --check` (Item A).
- Gate/hook đọc bypass: nếu có entry hợp lệ & chưa hết hạn cho đúng `gate-id` → in cảnh báo "BYPASSED (lý do, hết hạn lúc …)" rồi cho qua. Hết TTL ⇒ tự vô hiệu.
- **Audit:** mỗi lần bypass append 1 record vào `.ai/signals/` (truy vết được sau này).
- Opt-in & additive hoàn toàn; không bật mặc định.

### D.3 Tệp đụng tới
- Mới: `lib/session-bypass.js`, `validators/scripts/test-session-bypass.js`.
- Sửa: `bin/adp.js` (`handleBypass` + USAGE), các gate phụ (`.claude/skills/atlas-gates/scripts/*.js`, diff-hygiene) đọc bypass, `updateGitignore` thêm `.ai/state/session-bypass.json`.

### D.4 Compat row
`bypass là lệnh mới, opt-in; session-bypass.json ephemeral + gitignored + TTL. KHÔNG bypass được validate-spec core & security gate (exit semantics giữ nguyên). Mỗi bypass được audit vào signals.`

### D.5 Verify
`node bin/adp.js bypass diff-hygiene --ttl 600 --reason "hotfix"` → `--list` → chạy gate phụ thấy "BYPASSED" → sau TTL tự hết.

---

## Thứ tự thực hiện (waves)

- **Wave 1 (nền tảng, không phụ thuộc nhau):**
  - A — `lease --check` + `LeaseManager.inspect` (đơn vị nhỏ, mở khoá Item A).
  - B — `saf snapshot/restore` (độc lập hoàn toàn).
  - C — `lib/cmd-profiler.js` + `saf profile` (độc lập).
- **Wave 2 (phụ thuộc Wave 1):**
  - A — `saf hooks install/uninstall` + 3 hook `.cjs` (dùng `lease --check` của W1; mỗi hook nhúng cảnh báo output-size từ C).
  - C — `budget --profile` + `hook_output_warn_bytes` (dùng dữ liệu profiler W1).
- **Wave 3:**
  - D — `saf bypass` + gate phụ đọc bypass (sau khi gate set ổn định).
- **Wave 4 (chốt chung):** CHANGELOG `### Upgrade notes`, cập nhật `README.md`/`docs/tool-routing.md`, chạy Release Gate Checklist (compat §6: `npm test` Node 20 & 22, Win + Linux).

> Wave 1 ba item **không chia sẻ file** → có thể chạy song song bằng subagent (mỗi subagent sở hữu danh sách file riêng + lệnh verify riêng, theo "Subagent & Parallel Execution Guidelines"). Chỉ orchestrator cập nhật `.ai/state/*` và ledger.

## Bootstrap thành feature packets SAF

Mỗi item nên thành một feature packet độc lập (chạy spec-validation gate trước khi code):

```bash
node bin/adp.js feature "saf hooks install command and lifecycle hook scripts (sessionstart status, stop compact-memory prep, prewrite lease check)"
node bin/adp.js feature "saf snapshot and restore git checkpoints for act stage rollback"
node bin/adp.js feature "command profiler and budget profile flag for hook and cli latency output size"
node bin/adp.js feature "session based bypass for secondary gates with ttl and audit"
```

Trước khi implement mỗi feature: `node validators/scripts/validate-spec.js` (theo CLAUDE.md, fail 3 lần ⇒ human-review packet).

## Non-goals
- Không tự wiring hook ở `init`/`upgrade` (vi phạm non-intrusive).
- Không đổi nghĩa lệnh `checkpoint`, `budget`, `lease acquire` hiện có.
- Không làm `validate-spec` cần network/LLM (compat §1.6).
- Không cho bypass gate cốt lõi/security.

## Việc cần xác minh khi vào từng feature (impact analysis)
- Chạy `impact({target, direction:"upstream"})` cho mỗi symbol sẽ sửa: `handleLease`, `handleCheckpoint`, `handleBudget`, `LeaseManager.acquire`, `flow-state.save`. Cảnh báo nếu HIGH/CRITICAL trước khi sửa.
- Đối chiếu ID với `oss-benchmark-assessment.md` để A↔P1#8, C↔P2#13 không tạo roadmap song song.
