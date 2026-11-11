# Hoàn thiện UC-T15, UC-T16, UC-T23 (2026-11-11)

Nhánh `hunglqde180096/finish-t15-t16-t23-20261111`, tách từ `origin/dev` (FE `199c55e`, BE `343869c`). Chưa push, chưa merge.

## UC-T16 – Ủy quyền lấy hộ
**Thiếu trước đây:** mã 8 số chỉ hiển thị cho chủ đơn, hệ thống không gửi cho người nhận; kiểm tra số điện thoại chấp nhận `++++12345678`.

**Đã làm**
- BE: `IPickupDelegationNotifier` + `EmailPickupDelegationNotifier` (dùng `SmtpSettings` sẵn có). Liên hệ là email → gửi thư chứa mã, hạn dùng, tên trạm và mã đơn; gửi **sau khi** giao dịch lưu thành công. Liên hệ là số điện thoại → `channel = MANUAL` (chưa có nhà cung cấp SMS). Lỗi SMTP không làm hỏng việc tạo ủy quyền. Mã PIN không ghi log.
- API `POST /api/bookings/{id}/support/delegations` trả thêm `delivery { channel, sent, reason }`.
- `SupportInput.IsContact`: tối đa một dấu `+` ở đầu, 8–15 chữ số (đồng thời siết luồng walk-in T15).
- FE: `PickupDelegationPanel` hiển thị đúng kết quả: đã gửi email / chưa gửi được (kèm lý do) / số điện thoại cần tự chuyển mã / backend cũ không có `delivery`.

## UC-T15 – Đặt tủ vãng lai tại kiosk
Phần FE/BE trên `dev` đã đủ (phiên 45 phút, hủy khi chưa thanh toán, khách vãng lai tách khỏi tài khoản thật, mã bí mật 64 ký tự). Phần thiếu là **kiểm thử**:
- BE: thêm 13 test cho hủy đơn, đơn đã thanh toán không được hủy tại kiosk, kiểm tra mã bí mật/hết hạn, PIN chỉ trả cho người giữ mã, trạm không có ô sẵn sàng, liên hệ phải là số điện thoại.
- FE: 5 kịch bản trình duyệt (hủy, thanh toán xong, thiếu PIN, hết hạn, 5 ngôn ngữ).

## UC-T23 – Kiosk 5 ngôn ngữ
Kiểm kê trên `dev`: 83 khóa dịch, đủ 5 ngôn ngữ, không khóa nào bị thiếu. Đã bổ sung:
- Đọc hướng dẫn bằng giọng nói theo ngôn ngữ đã chọn (`kioskSpeech.ts`, gắn vào `KioskPage`); tôn trọng nút bật/tắt âm thanh; thiết bị không có giọng → hiện thông báo bằng chữ, kiosk vẫn dùng bình thường.
- Địa phương hóa chuỗi cứng còn sót: nút xác nhận lấy hành lý ngoại tuyến, chân trang máy tính bảng walk-in (bỏ chữ "UC-T15" khỏi giao diện).

## Kết quả kiểm thử
| Phạm vi | Kết quả | Mức kiểm chứng |
|---|---|---|
| BE `Hung.UseCases.Tests` (Support, Kiosk, Walk-in) | **83/83 đạt** (trước khi sửa: 54/56) | EF InMemory, mock notifier/MQTT/thanh toán |
| FE `tests/hung/run-finish.mjs` | **15/15 đạt** (`docs/hung-results/finish-browser.json`) | Component React thật trong Edge headless, API và Web Speech giả lập |
| FE build, typecheck, oxlint | Đạt, 0 lỗi lint | |

Hai test lỗi ban đầu trên `dev`: `++++12345678` bị chấp nhận (lỗi thật, đã sửa) và test kỳ vọng QR sống 60 giây trong khi `dev` đã đổi thành 120 giây (đã cập nhật test).
Kiểm tra phản biện: cố ý làm hỏng ngôn ngữ giọng nói và thông báo gửi mã thì 5 test fail đúng chỗ.

## Chưa kiểm chứng trên hệ thống thật
- Gửi email thật qua SMTP (chưa có tài khoản SMTP hợp lệ trong môi trường kiểm thử; không có kênh SMS).
- Walk-in với PayOS thật, kiosk với MQTT/ESP32/cảm biến thật, SQL Server thật.
- Giọng nói trên máy kiosk thật: phụ thuộc giọng đọc ngôn ngữ đã cài trên Windows/Chrome của thiết bị đó (kiểm tra trước khi demo, đặc biệt JA/KO/ZH).

## Ghi chú nhánh
- `dev` ở BE không có thư mục `tests`; bộ `Hung.UseCases.Tests` (Support, Kiosk, Walk-in) được đưa sang nhánh này. Ba file test cũ (Ticket, PinProtection, BookingLifecycleJob) không khớp mã `dev` nên chưa đưa sang.
- Các thay đổi chưa commit ở `SmartLocker_FE` (nhánh `uc-t23`) và `SmartLocker_BE` (nhánh `uc-t21`) **không bị đụng tới**.
