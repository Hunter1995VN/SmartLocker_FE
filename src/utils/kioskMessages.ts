import type { KioskLanguage } from './kioskI18n';

const messages = {
  "help": [
    "Trợ giúp",
    "Help",
    "ヘルプ",
    "도움말",
    "帮助"
  ],
  "book": [
    "Đặt tủ ngay",
    "Book a locker",
    "ロッカーを予約",
    "보관함 예약",
    "预订储物柜"
  ],
  "chooseAction": [
    "Chọn thao tác để bắt đầu",
    "Select an action to begin",
    "操作を選択してください",
    "작업을 선택하세요",
    "请选择操作"
  ],
  "chooseHint": [
    "Chạm Gửi đồ hoặc Lấy đồ để bắt đầu",
    "Tap Deposit or Retrieve to begin",
    "預け入れまたは取り出しを選択",
    "맡기기 또는 찾기를 선택하세요",
    "选择存放或取件"
  ],
  "depositTap": [
    "Chạm để gửi đồ",
    "Tap to deposit",
    "タップして預ける",
    "눌러서 맡기기",
    "点击存放"
  ],
  "retrieveTap": [
    "Chạm để lấy đồ",
    "Tap to retrieve",
    "タップして取り出す",
    "눌러서 찾기",
    "点击取件"
  ],
  "day": [
    "Chống chói",
    "Day mode",
    "昼間モード",
    "주간 모드",
    "日间模式"
  ],
  "night": [
    "Ban đêm",
    "Night mode",
    "夜間モード",
    "야간 모드",
    "夜间模式"
  ],
  "sound": [
    "Bật/tắt âm thanh",
    "Toggle sound",
    "音声切替",
    "소리 전환",
    "切换声音"
  ],
  "station": [
    "Trạm",
    "Station",
    "ステーション",
    "보관소",
    "站点"
  ],
  "order": [
    "Đơn",
    "Booking",
    "予約",
    "예약",
    "订单"
  ],
  "size": [
    "Kích cỡ",
    "Size",
    "サイズ",
    "크기",
    "尺寸"
  ],
  "elapsed": [
    "Thời gian chờ",
    "Time elapsed",
    "経過時間",
    "대기 시간",
    "等待时间"
  ],
  "staff": [
    "Cần nhân viên hỗ trợ",
    "Contact station staff",
    "スタッフに連絡",
    "직원에게 문의",
    "联系工作人员"
  ],
  "fee": [
    "Phụ phí phát sinh",
    "Overdue fee",
    "超過料金",
    "초과 요금",
    "超时费用"
  ],
  "pending": [
    "Đang chờ nhân viên duyệt",
    "Waiting for staff approval",
    "スタッフの承認待ち",
    "직원 승인 대기",
    "等待工作人员审核"
  ],
  "pendingHint": [
    "Ảnh đã gửi. Đơn chỉ hoàn tất sau khi nhân viên xác nhận.",
    "Photo submitted. Your booking completes after staff approval.",
    "写真を送信しました。承認後に予約が完了します。",
    "사진을 보냈습니다. 직원 승인 후 완료됩니다.",
    "照片已提交，工作人员确认后订单才会完成。"
  ],
  "home": [
    "Về màn hình chào",
    "Return to welcome",
    "最初の画面へ",
    "처음 화면으로",
    "返回欢迎页面"
  ],
  "sensorTitle": [
    "Gửi ảnh báo lỗi cảm biến",
    "Report a sensor fault",
    "センサー故障を報告",
    "센서 오류 신고",
    "报告传感器故障"
  ],
  "sensorHint": [
    "Chụp ảnh tủ đã lấy hết đồ và đóng cửa để nhân viên kiểm tra.",
    "Photograph the emptied locker and closed door for staff review.",
    "空のロッカーと閉じた扉を撮影してください。",
    "빈 보관함과 닫힌 문을 촬영하세요.",
    "请拍摄已清空的柜子和关闭的柜门供工作人员审核。"
  ],
  "sendPhoto": [
    "Gửi ảnh",
    "Submit photo",
    "写真を送信",
    "사진 전송",
    "提交照片"
  ],
  "sending": [
    "Đang gửi…",
    "Submitting…",
    "送信中…",
    "전송 중…",
    "提交中…"
  ],
  "support": [
    "Hỗ trợ trạm 24/7",
    "Station support 24/7",
    "24時間サポート",
    "24시간 지원",
    "全天候站点支持"
  ],
  "hotline": [
    "Đường dây hỗ trợ",
    "Support hotline",
    "サポート電話",
    "지원 전화",
    "客服热线"
  ],
  "supportHint": [
    "Liên hệ nhân viên tại trạm để được hỗ trợ.",
    "Contact the station attendant for assistance.",
    "現地スタッフにお問い合わせください。",
    "보관소 직원에게 문의하세요.",
    "请联系站点工作人员获取帮助。"
  ],
  "cameraError": [
    "Không truy cập được camera. Vui lòng liên hệ nhân viên.",
    "Camera unavailable. Contact staff.",
    "カメラを利用できません。スタッフに連絡してください。",
    "카메라를 사용할 수 없습니다. 직원에게 문의하세요.",
    "无法访问摄像头，请联系工作人员。"
  ],
  "networkError": [
    "Không kết nối được trạm. Vui lòng thử lại hoặc liên hệ nhân viên.",
    "Cannot connect. Retry or contact staff.",
    "接続できません。再試行するかスタッフに連絡してください。",
    "연결할 수 없습니다. 다시 시도하거나 직원에게 문의하세요.",
    "无法连接，请重试或联系工作人员。"
  ],
  "authError": [
    "Mã không hợp lệ hoặc đơn chưa sẵn sàng.",
    "Invalid credential or booking not ready.",
    "認証情報が無効か予約の準備ができていません。",
    "인증 코드가 잘못되었거나 예약이 준비되지 않았습니다.",
    "凭证无效或订单尚未就绪。"
  ],
  "submitError": [
    "Không gửi được yêu cầu. Vui lòng thử lại.",
    "Unable to submit. Please retry.",
    "送信できません。再試行してください。",
    "전송하지 못했습니다. 다시 시도하세요.",
    "提交失败，请重试。"
  ],
  "walkTitle": [
    "Đặt tủ tại trạm",
    "Book at this station",
    "この場所で予約",
    "이 보관소에서 예약",
    "在本站预订"
  ],
  "hours": [
    "Số giờ",
    "Hours",
    "時間",
    "시간",
    "小时"
  ],
  "phone": [
    "Số điện thoại liên hệ",
    "Contact phone",
    "連絡先電話番号",
    "연락처",
    "联系电话"
  ],
  "create": [
    "Tạo đơn và xem tiền thuê",
    "Create booking and see price",
    "予約して料金を確認",
    "예약 및 요금 확인",
    "创建订单并查看费用"
  ],
  "paid": [
    "Đã thanh toán",
    "Payment confirmed",
    "支払い確認済み",
    "결제 확인됨",
    "付款已确认"
  ],
  "savePin": [
    "Lưu mã PIN để lấy đồ. Mã không được gửi qua SMS.",
    "Save your PIN for pickup. It is not sent by SMS.",
    "受取用PINを保存してください。SMS送信はありません。",
    "찾을 때 쓸 PIN을 저장하세요. SMS로 전송되지 않습니다.",
    "请保存取件PIN，不会通过短信发送。"
  ],
  "ready": [
    "Đã lưu mã · Mở tủ gửi đồ",
    "PIN saved · Open locker",
    "PIN保存済み・扉を開く",
    "PIN 저장 완료 · 열기",
    "已保存PIN · 开柜存放"
  ],
  "scanPay": [
    "Quét bằng ứng dụng ngân hàng. Chỉ mở tủ sau khi xác nhận thanh toán.",
    "Scan with your banking app. The locker opens after payment confirmation.",
    "銀行アプリで読み取ってください。支払い確認後に開きます。",
    "은행 앱으로 스캔하세요. 결제 확인 후 열립니다.",
    "请用银行应用扫码，确认付款后才能开柜。"
  ],
  "noQr": [
    "Chưa có QR thanh toán. Vui lòng liên hệ nhân viên.",
    "Payment QR unavailable. Contact staff.",
    "決済QRがありません。スタッフに連絡してください。",
    "결제 QR이 없습니다. 직원에게 문의하세요.",
    "暂无付款二维码，请联系工作人员。"
  ],
  "status": [
    "Trạng thái",
    "Status",
    "状態",
    "상태",
    "状态"
  ],
  "return": [
    "Trở về (đơn chưa thanh toán tự hết hạn)",
    "Back (unpaid bookings expire automatically)",
    "戻る（未払い予約は自動失効）",
    "뒤로 (미결제 예약은 자동 만료)",
    "返回（未付款订单自动过期）"
  ],
  "checking": [
    "Chưa kiểm tra được thanh toán. Sẽ thử lại.",
    "Unable to check payment. Retrying.",
    "支払い確認を再試行します。",
    "결제를 확인할 수 없습니다. 재시도 중입니다.",
    "暂时无法查询付款，将重试。"
  ],
  "open": [
    "Mở",
    "Open",
    "開",
    "열림",
    "打开"
  ],
  "secure": [
    "Chốt điện an toàn",
    "Secure lock",
    "安全ロック",
    "안전 잠금",
    "安全锁"
  ],
  "clear": [
    "Xóa",
    "Clear",
    "消去",
    "지우기",
    "清除"
  ],
  "selectStation": [
    "Chọn trạm phục vụ",
    "Select a station",
    "ステーションを選択",
    "보관소 선택",
    "选择站点"
  ]
  , dimensions: ['Kích thước', 'Dimensions', '寸法', '크기', '尺寸'],
  capacity: ['Dung tích / Tải', 'Capacity / Load', '容量・耐荷重', '용량 / 하중', '容量 / 承重'],
  price: ['Đơn giá', 'Price', '料金', '요금', '价格'],
  padding: ['Đệm chống trầy xước', 'Protective padding', '保護パッド', '보호 패딩', '防刮衬垫'],
  damping: ['Trợ lực giảm chấn', 'Soft-close support', 'ソフトクローズ', '완충 장치', '缓冲装置'],
  previewHint: ['Chạm cánh tủ để xem mô phỏng', 'Tap a door to preview', '扉をタップしてプレビュー', '문을 눌러 미리 보기', '点击柜门查看演示'],
  previewOpen: ['Mô phỏng cửa mở', 'Door preview: open', '扉の開放プレビュー', '문 열림 미리 보기', '柜门打开演示']
  , voiceUnavailable: ['Thiết bị chưa có giọng đọc ngôn ngữ này. Vui lòng làm theo hướng dẫn trên màn hình.', 'This device has no voice for this language. Please follow the on-screen instructions.', 'この言語の音声は利用できません。画面の案内に従ってください。', '이 언어의 음성이 없습니다. 화면 안내를 따라주세요.', '设备暂无此语言语音，请按照屏幕说明操作。'],
  waitingDoor: ['Đang chờ cảm biến xác nhận cửa mở', 'Waiting for the door-open sensor', 'ドア開放センサーの確認待ち', '문 열림 센서 확인 대기', '等待传感器确认柜门打开']
  , sessionExpired: ['Phiên đã hết hạn. Liên hệ nhân viên nếu bạn đã thanh toán; không thanh toán lại.', 'Session expired. Contact staff if you have paid; do not pay again.', 'セッションの有効期限が切れました。支払い済みの場合はスタッフに連絡し、再度支払わないでください。', '세션이 만료되었습니다. 결제했다면 직원에게 문의하고 다시 결제하지 마세요.', '会话已过期。如果已付款，请联系工作人员，不要重复付款。'],
  paidMissingPin: ['Đã thanh toán nhưng chưa đọc được PIN. Liên hệ nhân viên, không thanh toán lại.', 'Payment confirmed, but PIN is unavailable. Contact staff; do not pay again.', '支払い確認済みですがPINを取得できません。再度支払わずスタッフに連絡してください。', '결제는 확인되었지만 PIN이 없습니다. 다시 결제하지 말고 직원에게 문의하세요.', '付款已确认，但暂时无法获取PIN。请联系工作人员，不要重复付款。']
  , cancelUnpaid: ['Hủy đơn chưa thanh toán', 'Cancel unpaid booking', '未払い予約をキャンセル', '미결제 예약 취소', '取消未付款订单'],
  cancelled: ['Đã hủy đơn và kết thúc phiên.', 'Booking cancelled and session ended.', '予約をキャンセルし、セッションを終了しました。', '예약이 취소되고 세션이 종료되었습니다.', '订单已取消，会话已结束。']
  , payFee: ['Thanh toán phụ phí', 'Pay overdue fee', '超過料金を支払う', '초과 요금 결제', '支付超时费用'],
  paymentPageQr: ['Quét mã để mở trang thanh toán. Chờ hệ thống xác minh trước khi lấy đồ.', 'Scan to open the payment page. Wait for server confirmation before pickup.', '読み取って支払いページを開き、確認が完了するまでお待ちください。', '스캔하여 결제 페이지를 여세요. 서버 확인 후 찾을 수 있습니다.', '扫码打开付款页面，等待系统确认后再取件。']
} as const;

export const kioskLocales: Record<KioskLanguage, string> = { VI: 'vi-VN', EN: 'en-US', JA: 'ja-JP', KO: 'ko-KR', ZH: 'zh-CN' };
export function kioskText(language: KioskLanguage) {
  const index = ['VI', 'EN', 'JA', 'KO', 'ZH'].indexOf(language);
  return (key: keyof typeof messages): string => messages[key][index] ?? messages[key][0];
}
