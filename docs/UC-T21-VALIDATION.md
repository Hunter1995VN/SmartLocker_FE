# UC-T21 — giao diện đánh giá đã kiểm thử

Nhánh tách từ dev a582b51, giữ các phần voucher/refund/RBAC mới của nhóm. Chỉ thêm StationReviewPanel sau checkout, lịch sử COMPLETED_MANUAL, điểm trạm từ API và staff rating summary; không đưa delegation, Lost & Found, Walk-in hay logic mở tủ vào nhánh này.

- Production build PASS.
- 7 nhóm API/UI thật PASS trong `validation/uc-t21-actual.json`, dùng DB thật và component production của nhánh này, không mock.
- Form chờ tải dữ liệu trước hiển thị, chặn gửi lại khi busy; review đã lưu thay cho form. API unique BookingId xử lý hai lượt gửi cạnh tranh.
- Giá trị count/average đối chiếu API staff/public và SQL review TEST đã được chủ tài khoản cho phép. Không thay review đã có.
- Review TEST 3 sao còn trong tổng điểm trạm, được đánh dấu trong comment; không gọi là trải nghiệm dịch vụ thực tế.

Chạy `node tests/hung/run-uc-t21.mjs` với HUNG_NODE_PACKAGES và các HUNG_TRAVELER_/HUNG_ADMIN_ env từ tài khoản được phép. Mặc định API 5001, FE 5187; có thể đổi HUNG_API_URL/HUNG_FRONTEND_URL. Runner chỉ dùng review TEST đã có, không tạo/xóa review hay chuyển tiền.
