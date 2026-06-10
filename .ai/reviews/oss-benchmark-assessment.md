# SAF vs Best-in-Class OSS — Benchmark Assessment (2026-06-10)

Đánh giá khả năng snail-agent-flow (SAF) hỗ trợ "dự án đích" (target project) khi AI agent làm việc, so với frontier OSS: Spec-Kit (111k★), GSD (64k★), Ruflo/claude-flow (59k★), OpenSpec (54k★), BMAD (49k★), Taskmaster (27k★), Agent OS, Conductor-family, và guidance chính thức của Anthropic.

## Tổng điểm: **60 / 100**

| # | Chiều năng lực | Trọng số | Điểm | Căn cứ |
|---|----------------|---------|------|--------|
| 1 | Spec quality gates | 12 | **9** | validate-spec.js deterministic + placeholder scan + 3-strikes human-review packet = frontier-level. Thiếu: clarify loop, cross-artifact analysis (kiểu /speckit.analyze), ambiguity scoring. |
| 2 | Constitution / standards layer | 7 | **3.5** | Có constitution template nhưng chỉ là file tĩnh; không có standards-discovery từ codebase (Agent OS), không enforce bằng hooks. |
| 3 | Context budget management | 12 | **7** | context-policy.json (50KB/200KB/fresh-session) là differentiator hiếm trong OSS — nhưng spec 017 chưa xong: không có tool đo byte pressure thực tế, không có context-pack generator, không auto-enforce. |
| 4 | Durable memory | 10 | **6.5** | Ranh giới memory vs sessions rõ, 5 template, onboard-memory bridge. Thiếu: typed memory (decision/gotcha/pattern), extract-learnings sau mỗi phase, staleness handling, search. |
| 5 | Verification & eval loops | 12 | **6.5** | Checklist + atlas-gates/atlas-review tốt. Thiếu: goal-backward verification (GSD), fresh-context reviewer tự động, conversational UAT, CI re-validation loop. |
| 6 | Multi-agent orchestration | 10 | **6** | Claims/leases/disjoint-write/protected-ledger là thiết kế đúng "vật lý" của parallelism. Thiếu: worktree isolation tooling, wave scheduler từ dependency graph, [P] markers thực thi được. |
| 7 | Cross-platform / agent support | 7 | **4** | CLAUDE/AGENTS/GEMINI.md + non-intrusive init tốt. Lỗi: hardcoded Mac path trong CLAUDE.md:78 (file:///Volumes/D/...), check gstack bash-only, PowerShell không nhất quán, không pin Node version. |
| 8 | Onboarding & DX | 8 | **5.5** | init/doctor/status/handoff + bootstrap script 2 nền tảng. Thiếu: brownfield mapping (kiểu delta-spec OpenSpec / gsd-ingest-docs), quick-mode native, --verbose/--debug. |
| 9 | Observability | 6 | **2.5** | signal-logger ghi jsonl nhưng không có aggregation, không token/cost analytics, không forensics cho run hỏng. |
| 10 | Distribution & upgradability | 6 | **3** | npm pack + GitHub release + CI 5-suite tốt. Thiếu: plugin-format (skills+hooks+commands bundle), lệnh upgrade in-place có migration. |
| 11 | Security & guardrails | 6 | **3.5** | Bounded autonomy (3-strikes halt), advisory leases, non-intrusive init. Thiếu: enforcement bằng hooks (chạy bất kể model "nhớ" hay không), permission scoping cho subagent, threat-model stage. |
| 12 | Docs | 4 | **3** | 14 docs + CONTEXT.md + artifact-registry là chuẩn chỉ. Trừ điểm vì drift: flow-ledger vs flow-state, Mac path, README chưa theo kịp validate-spec. |

**Điểm mạnh nổi bật (đã ở mức frontier):**
- Deterministic gates + 3-strikes human-review packet — đúng meta-lesson #1 của 2026 ("determinism beats prompting").
- Context-policy với byte-pressure routing — rất ít OSS có, kể cả top-star.
- Test ratio 2:1 (8.6k LOC test / 4k LOC lib), CI matrix 5 suite.
- Non-intrusive init tôn trọng file chỉ dẫn sẵn có của team.

## Roadmap cải thiện

> **Ràng buộc (2026-06-10):** Mọi item dưới đây phải tuân thủ `docs/compatibility-policy.md`
> (additive-only schema, opt-in/report-only first, non-intrusive init, deprecation ≥ 1 minor,
> không xoá state người dùng). Hướng dẫn nâng cấp cho dự án đích bản cũ: `docs/migration.md`.
> Spec của từng item phải copy dòng tương ứng từ Per-Improvement Compatibility Matrix vào plan.md.

### P0 — Sửa ngay, đưa lên ~70 (1–2 ngày)
1. Xoá Mac path `file:///Volumes/D/...` ở CLAUDE.md:78; dùng đường dẫn tương đối.
2. Hợp nhất flow-ledger vs flow-state: xoá class FlowLedger chết hoặc viết migration; sửa CONTEXT.md drift.
3. Cross-platform hoá: check gstack có bản PowerShell, thêm `engines` vào package.json + .nvmrc.
4. Thêm `--verbose` cho CLI; validation failure in kèm trích đoạn file + dòng lỗi.

### P1 — Đạt chuẩn best OSS, lên ~80–85 (1–2 tuần)
5. **Hoàn thành 017-context-budget-gate**: lệnh `saf budget` đo byte thực tế của required artifacts, tự route inline/pack/fresh-session; `saf pack` generator tạo context-pack chuẩn.
6. **Goal-backward verification**: stage settle verify outcome vs phase goal, không chỉ tick tasks (học GSD); thêm fresh-context reviewer bắt buộc với profile FULL.
7. **Clarify + analyze gates**: port pattern /speckit.clarify (≤5 câu hỏi, encode ngược vào spec) và cross-artifact consistency check vào validate-spec pipeline.
8. **Hooks enforcement**: ship PreToolUse/Stop hooks chạy validate-spec + diff-hygiene deterministic — gate không thể bị model bỏ qua.
9. **Typed memory + extract-learnings**: phân loại decision/gotcha/pattern, lệnh `saf learn` mine artifacts của feature đã xong vào memory; staleness check trong doctor.
10. Brownfield mode: `saf ingest` map codebase hiện hữu thành memory + delta-spec thay vì giả định greenfield.

### P2 — Vượt OSS, 90+ (chiến lược)
11. **Plugin-format distribution**: đóng gói skills + hooks + commands + templates thành Claude Code plugin có version, marketplace-installable; lệnh `saf upgrade` migrate state không phá customization.
12. **Worktree-isolated parallelism**: `saf claim` cấp worktree riêng + wave scheduler từ dependency graph trong tasks.md; giữ protected ledger hiện có làm điểm khác biệt.
13. **Observability hoàn chỉnh**: `saf stats` aggregate signals jsonl → token/cost per stage, audit trail commit↔task↔requirement; forensics cho run fail.
14. **Eval harness cho AI-feature**: rubric evaluation-rubric.json hiện có nâng thành eval-coverage audit per phase.

Điểm "vượt OSS" khả thi nhất: SAF là toolkit duy nhất kết hợp (a) deterministic gates, (b) byte-pressure context routing, (c) claims/leases parallelism physics trong một package zero-dependency — hoàn thiện 3 trụ này trước khi mở rộng surface.

## Nguồn chính
- Anthropic: effective-context-engineering, multi-agent-research-system, agent-skills, plugins-reference, claude-code best-practices
- github/spec-kit · gsd-build/get-shit-done · ruvnet/ruflo · Fission-AI/OpenSpec · bmad-code-org/BMAD-METHOD · eyaltoledano/claude-task-master · buildermethods/agent-os · ComposioHQ/agent-orchestrator
