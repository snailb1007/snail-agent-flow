# ATLAS Refactor — Align

## Core problem

GSD flow 10-stage quá nặng, overlap. Cần flow risk-adaptive
6-stage tái dùng skill có sẵn.

## Anti-goals (KHÔNG làm)

- KHÔNG rewrite Pocock skills, chỉ wrap.
- KHÔNG đổi format `.planning/phases/` hiện có.
- KHÔNG migrate task GSD đang chạy — drain tự nhiên.
- KHÔNG build observability bus phức tạp ở slice đầu.

## Test strategy

- **Unit:** scoring function, stage resolver.
- **Integration:** flow-engine cho profile × stage matrix.
- **E2E:** chạy 1 task giả P-0 → S với FAST profile.
- **Manual:** dogfood chính task này (đang làm).

## DoR checklist

- [x] Problem statement rõ
- [x] Anti-goals liệt kê
- [x] Test strategy chọn

---

**Gate check** (align-gate thủ công): đọc lại 3 mục, có đủ không? ✅ Đủ. Pass.

**Insight:** Viết anti-goals ép nghĩ "có nên build observability bus ngay không" và quyết KHÔNG. Đây là value thật của Align — loại bỏ scope creep trước khi nó xâm nhập.
