# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Người dùng chính: du khách.** Khách du lịch và người đi công tác ở ga tàu/metro, sân bay, phố đi bộ cần gửi hành lý vài giờ. Họ thường đang di chuyển, một tay cầm điện thoại, mang vali, có thể mất mạng, không có thời gian học cách dùng. Việc cần làm: tìm trạm gần, đặt tủ đúng cỡ (S/M/L) và thời gian, trả tiền, rồi mở tủ bằng QR/PIN tại kiosk để gửi và lấy đồ.

Đối tượng thứ hai (có trong sản phẩm, chưa được xếp ưu tiên khi quyết định thiết kế): nhân viên trạm (xử lý sự cố, xác nhận thủ công khi cảm biến lỗi, đồ thất lạc) và quản trị viên (doanh thu, thiết bị, hoàn tiền, đánh giá). Chưa xác nhận mức ưu tiên của hai nhóm này.

## Product Purpose

Mạng tủ gửi hành lý tự phục vụ: khách đặt và thanh toán trên web, đến trạm mở đúng ngăn tủ bằng mã QR hoặc PIN 8 số tại kiosk, không cần nhân viên. Thành công là khách gửi và lấy đồ trơn tru, trả đúng số tiền theo thời gian, và nhân viên xử lý được các tình huống bất thường (cảm biến lỗi, quá hạn, đồ thất lạc) mà không phải gọi kỹ thuật.

## Positioning

Khác biệt đã được nhóm xác nhận:
- Mở tủ bằng QR/PIN tại kiosk (QR đổi định kỳ, PIN 8 số lưu dạng băm, tủ mở thật qua ESP32/MQTT).
- Ủy quyền cho người khác lấy đồ bằng mã dùng một lần gửi qua email.
- Bảo hiểm và hoàn tiền là một phần cam kết của sản phẩm. Mức bồi thường cụ thể chưa có tài liệu, xem mục Capabilities and Constraints.

## Operating Context

- **Dự án đồ án tốt nghiệp, demo cho hội đồng.** Chạy thử với dữ liệu mẫu và cổng thanh toán PayOS thử nghiệm. Hotline, email hỗ trợ, chính sách và điều khoản trên giao diện là nội dung minh họa cho đồ án, chưa phải cam kết pháp lý.
- Ba bề mặt dùng chung một ứng dụng: web cho khách (điện thoại là chính), cổng quản trị cho nhân viên/quản trị, và màn hình kiosk/tablet đặt tại trạm (có nhiều ngôn ngữ và giọng đọc).
- Hạ tầng: backend .NET, SQL Server, MQTT tới vi điều khiển ESP32, SignalR cho lưới tủ thời gian thực, PayOS cho thanh toán, email SMTP cho mã ủy quyền.
- Tên miền triển khai: smartlocker.id.vn.

## Capabilities and Constraints

Chức năng có trong mã nguồn: tìm trạm trên bản đồ theo vị trí; đặt tủ S/M/L theo giờ; thanh toán PayOS; vé QR/PIN; kiosk nhận/trả đồ; thanh toán phụ phí quá hạn; hủy và hoàn tiền; đặt tại chỗ không cần tài khoản (kiosk/tablet); ủy quyền người nhận; báo đồ thất lạc; đánh giá trạm; xác nhận thủ công khi cảm biến lỗi; đăng nhập email và Google; kiosk 5 ngôn ngữ.

Ràng buộc thật cần giữ:
- Chỉ chủ đơn đã thanh toán mới thấy QR/PIN; người khác không đọc được vé.
- Mở tủ chỉ xác nhận bằng sự kiện cửa thật (mở rồi đóng) từ phần cứng, không tin nút bấm trên web.
- Số điện thoại ủy quyền không có kênh SMS: chủ đơn tự chuyển PIN; chỉ email được gửi tự động.
- Ảnh đại diện lưu trên đĩa máy chủ (có thể mất khi triển khai lại).

Chưa xác nhận (không được trình bày như sự thật trên giao diện): mức bảo hiểm cụ thể (10 triệu, 20 triệu, 50 triệu đồng xuất hiện rải rác trong nội dung cũ, không thống nhất), "mở tủ offline chuẩn JWS", số liệu quy mô mạng lưới ngoài số liệu thật lấy từ hệ thống, hotline `1900 1234`, email `support@smartlocker.vn`.

## Brand Commitments

Tên sản phẩm: SmartLocker. Giao diện bằng tiếng Việt; kiosk có thêm tiếng Anh, Nhật, Hàn, Trung. Giữ nguyên tên và các tên chức năng đã dùng trong tài liệu đặc tả.

## Evidence on Hand

- Tài liệu đặc tả `SMARTLOCKER_MASTER_SPECIFICATION_50_USE_CASES.docx` (50 use case, nằm ngoài repo FE).
- Bộ kiểm thử: `docs/hung-results/` (E2E cục bộ 61 kiểm tra API + 4 sự kiện cửa, kiểm tra trình duyệt), `tests/hung/ui-audit.js`, `tests/hung/color-snap.js`.
- Dữ liệu thật duy nhất: dữ liệu mẫu cục bộ (2 trạm, 12 tủ). Không có khách hàng thật, lời chứng thực, số liệu vận hành, đối tác hay báo chí; không được bịa các thứ này.

## Product Principles

1. **Một việc chính mỗi màn hình, dùng được bằng một tay.** Du khách đang di chuyển; hành động chính phải thấy ngay và chạm được.
2. **Chỉ nói điều hệ thống làm được.** Số liệu lấy từ hệ thống thật; cam kết chưa xác nhận không được đưa lên giao diện.
3. **Trạng thái tủ và thanh toán phải rõ ràng, nhất là khi lỗi.** Khách không bị kẹt: luôn có cách mở hỗ trợ, thử lại, hoặc nhờ nhân viên.
4. **Bảo mật mã mở tủ là mặc định.** Mã chỉ hiện cho đúng người, đúng lúc, và không lưu dạng thường.
5. **Vận hành trạm đủ cho nhân viên không chuyên.** Sự cố phần cứng phải xử lý được qua giao diện, có lý do và dấu vết kiểm tra.

## Accessibility & Inclusion

Chưa có yêu cầu bắt buộc từ nhóm. Hiện đang áp dụng làm chuẩn thực hành (theo audit ngày 2026-11-16): tương phản chữ tối thiểu 4,5:1, chữ không nhỏ hơn 12 px, vùng chạm 44 px trên màn cảm ứng, mọi ô nhập có nhãn, thứ tự tiêu đề hợp lệ, tôn trọng `prefers-reduced-motion`. Đây là cách làm hiện tại, chưa phải cam kết đã được xác nhận.
