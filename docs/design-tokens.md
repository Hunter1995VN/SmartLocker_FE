# Design tokens (màu)

Nguồn duy nhất: khối `@theme` trong `src/index.css` (Tailwind v4). Dùng class có tên ngữ nghĩa thay cho mã hex:
`text-on-surface`, `bg-surface-container-low`, `border-outline-variant`...

| Mục đích | Token | Giá trị |
|---|---|---|
| Chữ chính | `on-surface` | `#0b1c30` |
| Chữ phụ (đủ tương phản ≥ 4.5:1) | `on-surface-variant` / `on-surface-muted` | `#434655` / `#5c5f70` |
| Nền trang | `surface-bright`, `background` | `#f8f9ff` |
| Nền khối nhạt / hover | `surface-container-low` / `surface-container` / `surface-container-high` | `#eff4ff` / `#e5eeff` / `#dce9ff` |
| Hành động chính | `primary-container` (nút) / `primary` (chữ, link) | `#2563eb` / `#004ac6` |
| Thành công, tủ trống | `tertiary` / `tertiary-container` / `tertiary-fixed` | `#006242` / `#007d55` / `#6ffbbe` |
| Lỗi | `error`, `error-container`, `on-error-container` | `#ba1a1a`, `#ffdad6`, `#93000a` |
| Cảnh báo không chặn | `warning-container` / `on-warning-container` | `#fff6d6` / `#6b4a00` |
| Viền mềm | `outline-soft`, `outline-variant` | `#dce3f1`, `#c3c6d7` |

Quy tắc:
- `outline` (`#737686`) chỉ dùng cho viền và biểu tượng, **không** dùng làm màu chữ nhỏ (chỉ đạt khoảng 4,1:1). Chữ phụ dùng `on-surface-muted`.
- Không viết `text-[#...]`, `bg-[#...]` mới. Cần màu mới thì thêm token có nghĩa vào `@theme`.
- Còn khoảng 48 mã hex ngoại lệ: màn hình kiosk nền tối (`#131b28`, `#354664`...), bản đồ và biểu tượng SVG. Có thể gom thành token `kiosk-*` ở bước sau.
- Màn cảm ứng (`pointer: coarse`) tự có vùng chạm tối thiểu 44px (khối cuối phần `@layer base` trong `index.css`).
- Kiểm tra khi đổi màu: `tests/hung/color-snap.js` chụp màu tính toán của từng phần tử trước/sau để chứng minh không đổi giao diện; `tests/hung/ui-audit.js` đo tương phản, cỡ chữ, vùng chạm.
