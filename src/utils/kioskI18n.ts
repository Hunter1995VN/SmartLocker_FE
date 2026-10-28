export type KioskLanguage = 'VI' | 'EN' | 'KO' | 'ZH' | 'JA';

export interface LanguageOption {
  code: KioskLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'VI', name: 'Tiếng Việt', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'EN', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'KO', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ZH', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'JA', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
];

export interface KioskDictionary {
  welcomeTitle: string;
  welcomeSubtitle: string;
  selectLanguagePrompt: string;
  stationLabel: string;
  allDayOpen: string;
  depositTitle: string;
  depositDesc: string;
  depositAction: string;
  retrieveTitle: string;
  retrieveDesc: string;
  retrieveAction: string;
  changeLanguage: string;
  viewSizes: string;
  cancel: string;
  scanQr: string;
  enterPin: string;
  qrPlaceholder: string;
  confirmUnlock: string;
  unlocking: string;
  doorOpenedTitle: string;
  doorOpenedDepositDesc: string;
  doorOpenedRetrieveDesc: string;
  doorCloseInstruction: string;
  sensorAlertButton: string;
  successTitle: string;
  successDepositDesc: string;
  successRetrieveDesc: string;
  finishButton: string;
  autoReturnPrompt: string;
  secondsSuffix: string;
  overdueTitle: string;
  overdueSubtitle: string;
  close: string;
  sizeS: string;
  sizeM: string;
  sizeL: string;
  hourPriceSuffix: string;
  dayPriceSuffix: string;
  suitableLuggage: string;
}

export const I18N_DICTIONARY: Record<KioskLanguage, KioskDictionary> = {
  VI: {
    welcomeTitle: 'Chào mừng đến với SmartLocker',
    welcomeSubtitle: 'Hệ thống tủ gửi đồ thông minh tự phục vụ 24/7',
    selectLanguagePrompt: 'Vui lòng chọn ngôn ngữ để bắt đầu',
    stationLabel: 'Trạm',
    allDayOpen: 'Hoạt động 24/7',
    depositTitle: 'Gửi Hành Lý',
    depositDesc: 'Quét mã QR đặt chỗ hoặc nhập mã PIN để mở ngăn cất đồ an toàn.',
    depositAction: 'Bắt đầu gửi đồ',
    retrieveTitle: 'Lấy Hành Lý',
    retrieveDesc: 'Nhập mã đặt chỗ hoặc quét mã để nhận lại toàn bộ hành lý đã lưu.',
    retrieveAction: 'Bắt đầu lấy đồ',
    changeLanguage: 'Đổi ngôn ngữ',
    viewSizes: 'Kích cỡ tủ',
    cancel: 'Hủy / Quay lại',
    scanQr: 'Quét mã QR',
    enterPin: 'Nhập mã PIN',
    qrPlaceholder: 'Dán mã đặt chỗ / QR để kiểm tra...',
    confirmUnlock: 'Xác nhận mở tủ',
    unlocking: 'Đang mở khóa...',
    doorOpenedTitle: 'Cửa tủ đã mở',
    doorOpenedDepositDesc: 'Vui lòng cất gọn hành lý vào trong ngăn và đẩy chặt cửa lại.',
    doorOpenedRetrieveDesc: 'Vui lòng kiểm tra kỹ và lấy hết hành lý trước khi đóng cửa.',
    doorCloseInstruction: 'Chốt điện sẽ tự động khóa an toàn ngay khi cửa đóng hoàn toàn.',
    sensorAlertButton: 'Đã đóng cửa nhưng màn hình chưa nhận?',
    successTitle: 'Giao dịch hoàn tất',
    successDepositDesc: 'Hành lý của bạn đã được cất giữ an toàn trong hệ thống.',
    successRetrieveDesc: 'Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ SmartLocker.',
    finishButton: 'Hoàn tất',
    autoReturnPrompt: 'Tự động quay về màn hình chọn ngôn ngữ sau',
    secondsSuffix: 'giây',
    overdueTitle: 'Đơn đặt bị quá hạn',
    overdueSubtitle: 'Vui lòng thanh toán phụ phí phát sinh trước khi lấy lại đồ.',
    close: 'Đóng',
    sizeS: 'Cỡ S (Nhỏ)',
    sizeM: 'Cỡ M (Vừa)',
    sizeL: 'Cỡ L (Lớn)',
    hourPriceSuffix: 'đ/giờ',
    dayPriceSuffix: 'đ/ngày',
    suitableLuggage: 'Vật dụng phù hợp',
  },
  EN: {
    welcomeTitle: 'Welcome to SmartLocker',
    welcomeSubtitle: 'Self-service 24/7 automated luggage storage terminal',
    selectLanguagePrompt: 'Please select your language to begin',
    stationLabel: 'Station',
    allDayOpen: 'Open 24/7',
    depositTitle: 'Deposit Luggage',
    depositDesc: 'Scan booking QR code or enter PIN to open deposit bay securely.',
    depositAction: 'Start Deposit',
    retrieveTitle: 'Retrieve Luggage',
    retrieveDesc: 'Enter booking code or scan QR to unlock and retrieve your luggage.',
    retrieveAction: 'Start Retrieval',
    changeLanguage: 'Language',
    viewSizes: 'Locker Sizes',
    cancel: 'Back / Cancel',
    scanQr: 'Scan QR Code',
    enterPin: 'Enter PIN Code',
    qrPlaceholder: 'Paste booking code / QR to verify...',
    confirmUnlock: 'Confirm & Unlock',
    unlocking: 'Unlocking bay...',
    doorOpenedTitle: 'Locker Door Unlocked',
    doorOpenedDepositDesc: 'Please place your luggage inside and push the door firmly shut.',
    doorOpenedRetrieveDesc: 'Please retrieve all your belongings and push the door firmly shut.',
    doorCloseInstruction: 'The electronic latch will automatically lock once closed.',
    sensorAlertButton: 'Door is closed but screen did not update?',
    successTitle: 'Transaction Completed',
    successDepositDesc: 'Your luggage has been securely stored in the locker.',
    successRetrieveDesc: 'Thank you for using SmartLocker self-service terminal.',
    finishButton: 'Done',
    autoReturnPrompt: 'Returning to language selection screen in',
    secondsSuffix: 'sec',
    overdueTitle: 'Storage Time Overdue',
    overdueSubtitle: 'Please settle the overtime fee before retrieving your belongings.',
    close: 'Close',
    sizeS: 'Size S (Compact)',
    sizeM: 'Size M (Medium)',
    sizeL: 'Size L (Large)',
    hourPriceSuffix: 'VND/hr',
    dayPriceSuffix: 'VND/day',
    suitableLuggage: 'Suitable items',
  },
  KO: {
    welcomeTitle: 'SmartLocker에 오신 것을 환영합니다',
    welcomeSubtitle: '24시간 무인 스마트 수하물 보관함 시스템',
    selectLanguagePrompt: '시작하려면 사용하실 언어를 선택해 주세요',
    stationLabel: '스테이션',
    allDayOpen: '24시간 운영',
    depositTitle: '짐 보관하기',
    depositDesc: '예약 QR 코드를 스캔하거나 PIN을 입력하여 보관함을 안전하게 엽니다.',
    depositAction: '보관 시작하기',
    retrieveTitle: '짐 찾기',
    retrieveDesc: '예약 코드를 입력하거나 QR을 스캔하여 보관된 짐을 찾습니다.',
    retrieveAction: '짐 찾기 시작',
    changeLanguage: '언어 변경',
    viewSizes: '보관함 크기',
    cancel: '취소 / 뒤로',
    scanQr: 'QR 코드 스캔',
    enterPin: 'PIN 번호 입력',
    qrPlaceholder: '예약 코드 입력...',
    confirmUnlock: '보관함 열기 확인',
    unlocking: '잠금 해제 중...',
    doorOpenedTitle: '보관함 문이 열렸습니다',
    doorOpenedDepositDesc: '짐을 넣은 후 문을 찰칵 소리가 나도록 꼭 닫아주세요.',
    doorOpenedRetrieveDesc: '짐을 모두 꺼내신 후 문을 닫아주시기 바랍니다.',
    doorCloseInstruction: '문이 완전히 닫히면 전동 잠금장치가 자동 체결됩니다.',
    sensorAlertButton: '문을 닫았으나 센서 인식이 안 되나요?',
    successTitle: '이용이 완료되었습니다',
    successDepositDesc: '수하물이 안전하게 보관되었습니다.',
    successRetrieveDesc: 'SmartLocker 서비스를 이용해 주셔서 감사합니다.',
    finishButton: '완료',
    autoReturnPrompt: '잠시 후 언어 선택 화면으로 자동 전환됩니다',
    secondsSuffix: '초',
    overdueTitle: '보관 시간 초과',
    overdueSubtitle: '초과 요금을 결제하신 후 짐을 수령해 주시기 바랍니다.',
    close: '닫기',
    sizeS: 'S 사이즈 (소형)',
    sizeM: 'M 사이즈 (중형)',
    sizeL: 'L 사이즈 (대형)',
    hourPriceSuffix: 'VND/시간',
    dayPriceSuffix: 'VND/일',
    suitableLuggage: '적합한 수하물',
  },
  ZH: {
    welcomeTitle: '欢迎使用 SmartLocker 智能行李寄存',
    welcomeSubtitle: '24小时自助智能行李寄存终端',
    selectLanguagePrompt: '请选择您的首选语言以开始',
    stationLabel: '服务站点',
    allDayOpen: '24小时运营',
    depositTitle: '存入行李',
    depositDesc: '扫描预订二维码或输入密码即可安全开启寄存柜。',
    depositAction: '开始存件',
    retrieveTitle: '取出行李',
    retrieveDesc: '输入预订码或扫描二维码即可开柜取走您的行李。',
    retrieveAction: '开始取件',
    changeLanguage: '切换语言',
    viewSizes: '柜格规格',
    cancel: '取消 / 返回',
    scanQr: '扫描二维码',
    enterPin: '输入存件密码',
    qrPlaceholder: '粘贴预订码 / 二维码...',
    confirmUnlock: '确认开门',
    unlocking: '正在解锁...',
    doorOpenedTitle: '柜门已成功弹开',
    doorOpenedDepositDesc: '请将行李整齐放置于柜内，并用力推紧关好柜门。',
    doorOpenedRetrieveDesc: '请检查并带走全部随身行李，离开前请关紧柜门。',
    doorCloseInstruction: '柜门完全闭合后将自动上锁，确保安全。',
    sensorAlertButton: '已关门但屏幕未感应更新？',
    successTitle: '操作已成功完成',
    successDepositDesc: '您的行李已妥善存入智能寄存系统中。',
    successRetrieveDesc: '感谢您选择使用 SmartLocker 自助寄存服务。',
    finishButton: '完成',
    autoReturnPrompt: '即将自动返回语言选择界面',
    secondsSuffix: '秒',
    overdueTitle: '寄存已超出预约时间',
    overdueSubtitle: '开柜取件前请先补缴超时附加费用。',
    close: '关闭',
    sizeS: 'S 号规格 (小型)',
    sizeM: 'M 号规格 (中型)',
    sizeL: 'L 号规格 (大型)',
    hourPriceSuffix: '越盾/小时',
    dayPriceSuffix: '越盾/天',
    suitableLuggage: '推荐存放物品',
  },
  JA: {
    welcomeTitle: 'SmartLockerへようこそ',
    welcomeSubtitle: '24時間年中無休 自動スマート荷物預かりロッカー',
    selectLanguagePrompt: '開始するには言語を選択してください',
    stationLabel: '設置場所',
    allDayOpen: '24時間営業',
    depositTitle: '荷物を預ける',
    depositDesc: '予約QRコードをスキャンするか、暗証番号を入力して扉を開けます。',
    depositAction: '預け入れ開始',
    retrieveTitle: '荷物を取り出す',
    retrieveDesc: '予約番号を入力またはQRコードをスキャンして荷物を取り出します。',
    retrieveAction: '取り出し開始',
    changeLanguage: '言語切替',
    viewSizes: 'ロッカーサイズ',
    cancel: '戻る / キャンセル',
    scanQr: 'QRコード読み取り',
    enterPin: '暗証番号を入力',
    qrPlaceholder: '予約番号を入力...',
    confirmUnlock: 'ロック解除の確認',
    unlocking: '開錠中...',
    doorOpenedTitle: '扉が開きました',
    doorOpenedDepositDesc: 'お荷物を入れ、カチッと音がするまでしっかりと扉を閉めてください。',
    doorOpenedRetrieveDesc: 'お忘れ物のないようお荷物を取り出し、扉をしっかり閉めてください。',
    doorCloseInstruction: '扉が完全に閉まると自動的に電子ロックされます。',
    sensorAlertButton: '扉を閉めましたが画面が更新されませんか？',
    successTitle: '手続きが完了しました',
    successDepositDesc: 'お荷物は安全にロッカー内に保管されました。',
    successRetrieveDesc: 'SmartLockerをご利用いただき誠にありがとうございます。',
    finishButton: '完了',
    autoReturnPrompt: 'まもなく言語選択画面に自動で戻ります',
    secondsSuffix: '秒',
    overdueTitle: '利用時間が超過しています',
    overdueSubtitle: 'お荷物を取り出す前に延長料金をお支払いください。',
    close: '閉じる',
    sizeS: 'Sサイズ (小型)',
    sizeM: 'Mサイズ (中型)',
    sizeL: 'Lサイズ (大型)',
    hourPriceSuffix: 'VND/時間',
    dayPriceSuffix: 'VND/日',
    suitableLuggage: '収納目安',
  },
};
