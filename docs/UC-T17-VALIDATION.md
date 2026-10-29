# UC-T17 — form tìm đồ, ảnh minh họa và phản hồi

Nhánh `hunglqde180096/uc-t17-verified` dựa trên dev đã merge UC-T21. Chỉ thêm LostItemPanel, queue ảnh/kết quả cho ADMIN/STAFF và harness kiểm thử; không gộp ủy quyền, Walk-in, camera cảm biến lỗi hoặc mở tủ.

Validation 29/10/2026:
- Production build PASS; backend 33/33 tests (21 cho T17, 12 hồi quy T21).
- Ca thật dùng form production và API/SQL thật, không mock HTTP. Người dùng cho phép bản ghi TEST; ảnh là screenshot lịch sử dùng làm minh họa, không phải ảnh đồ vật hay bằng chứng tủ trống.
- Lần đầu form gửi ảnh, duplicate OPEN và decode ảnh trên queue PASS; dừng khi nhãn select chưa rõ. Phiếu được đóng NOT_FOUND qua API để không bỏ treo. Giữ kết quả lịch sử tại `validation/uc-t17-attempt1.json`.
- Đã sửa aria-label và cách chọn đúng phiếu; tiếp tục chính phiếu TEST đó từ NOT_FOUND → FOUND → RETURNED, không tạo thêm phiếu. Kết quả 6 nhóm kiểm tra PASS tại `validation/uc-t17-actual.json`.
- Kiểm tra Traveler không gọi được API staff, chưa FOUND không RETURNED, FOUND không tạo yêu cầu trùng, staff save lặp không gửi thêm thông báo, RETURNED không sửa lại. Khách nhận/đọc cả phản hồi FOUND và RETURNED qua UI.
- SQL xác nhận ảnh lưu thật, phiếu RETURNED, incident RESOLVED, ba thông báo của ca TEST (gồm cleanup ban đầu) READ. Booking/check-out/review gốc không đổi; không có browser exception hoặc API 5xx trong luồng T17.
- Chạy lại 7 nhóm kiểm tra T21 sau tích hợp T17: PASS (`validation/uc-t21-actual.json`).

Báo cáo đẩy Git đã bỏ booking/report ID và dữ liệu cá nhân. Bản bằng chứng đầy đủ giữ cục bộ trong thư mục App_Data bị Git bỏ qua. Không chuyển tiền, không có đồ thất lạc/bàn giao thực tế và không phát lệnh mở tủ trong các ca TEST này.

Runner: `node tests/hung/run-uc-t17.mjs`, yêu cầu `HUNG_ALLOW_TEST_WRITES=1` cùng tài khoản được cấp qua env. Mặc định chạy API 5001/FE 5187. Không chạy lại tùy tiện: runner mặc định tạo phiếu TEST; tùy chọn HUNG_T17_RESUME_ID chỉ cho phiếu TEST thuộc đúng chủ, còn trạng thái được phép xử lý. Phiếu RETURNED không thể dùng lại cho ca sửa trạng thái.
