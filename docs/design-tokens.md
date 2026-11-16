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

## Thành phần dùng chung (đã extract)

| Thành phần | Vị trí | Dùng khi |
|---|---|---|
| `ModalOverlay` | `src/components/ui/ModalOverlay.tsx` | Mọi hộp thoại. Chỉ thay lớp phủ ngoài cùng, nội dung giữ nguyên. Tự có `role="dialog"`, `aria-modal`, tên lấy từ tiêu đề đầu tiên, Esc đóng, khóa cuộn trang, nhốt Tab, trả focus khi đóng. Bấm nền để đóng là tùy chọn (`closeOnBackdrop`, mặc định tắt vì nhiều hộp thoại là form). |
| `Pagination` + `usePagination` | `src/components/admin/Pagination.tsx` | Bảng/danh sách dài ở admin, phân trang phía client. |
| `GlobalDialogs`, `openSupport()`, `openLegal()` | `src/components/support`, `src/utils/contact.ts` | Hộp thoại Liên hệ/Chính sách mở từ bất kỳ nút nào. |
| `useNetworkStats` | `src/utils/useNetworkStats.ts` | Số trạm/ô tủ thật thay cho con số quảng cáo viết cứng. |

Cách dùng `ModalOverlay`:

```tsx
<ModalOverlay onClose={onClose}>            {/* hoặc closeOnBackdrop, className="overflow-y-auto", zClass="z-[1000]" */}
  <div className="bg-white rounded-2xl ...">
    <h2>Tiêu đề hộp thoại</h2>
    ...
  </div>
</ModalOverlay>
```

Chưa chuyển sang `ModalOverlay` (còn tự viết lớp phủ): các hộp thoại nằm trong các view admin lớn (đồ thất lạc, lưới tủ, thiết bị IoT, RBAC, công nợ…), `CancelBookingModal`/`ExtendBookingModal` (có lớp nền riêng), `RemoteUnlockConfirmModal`, `AdminReviewDialog` (dạng panel bên phải) và các lớp phủ kiosk. Chuyển dần khi sửa từng file; mỗi cái chỉ cần đổi thẻ `div` ngoài cùng.

## Chữ (typography)

- Một họ chữ: **Plus Jakarta Sans** (có tiếng Việt). Tải 400/500/600/700/800 + italic 400; không tải 300 (không dùng). Không có weight 900: dùng `font-extrabold`, không dùng `font-black`.
- `font-sans` của Tailwind đã trỏ về Plus Jakarta Sans (`--font-sans` trong `@theme`). Trước đó 12 file (đăng nhập, đăng ký, Dashboard, Hồ sơ, admin, kiosk…) dùng `font-sans` và vô tình hiển thị chữ hệ thống.
- Vai trò và cỡ chữ: tiêu đề hero 36–60px; tiêu đề trang 24px; tiêu đề khối 16–18px semibold; **đoạn văn 14px** (`text-sm`); nhãn/siêu dữ liệu 12px (`text-xs`, tối thiểu); dữ liệu số dùng số cùng độ rộng.
- Chữ số cùng độ rộng (`font-variant-numeric: tabular-nums`) đặt ở `body`: tiền, đồng hồ đếm ngược, bảng không nhảy khi giá trị đổi (với số tỷ lệ "1111" và "0000" từng lệch 45%). Chỉ dùng `font-mono` cho mã (mã đơn, PIN, ID), không dùng cho số tiền/giờ.
- Ngắt dòng: `text-wrap: balance` cho h1–h3, `pretty` cho `p`, `li` (đặt ở `@layer base`).
- Chữ in hoa kèm giãn chữ chỉ dành cho nhãn ngắn; với tiếng Việt nhiều dấu, tránh in hoa cả câu.
