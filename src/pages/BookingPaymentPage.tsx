import React, { useState, useEffect } from 'react';
import {
  Check,
  ChevronRight,
  ShieldCheck,
  DoorOpen,
  MapPin,
  Luggage,
  Clock,
  Verified,
  Info,
  User,
  MessageSquare,
  Mail,
  Copy,
  CheckCircle,
  Lock,
  Headphones,
  ExternalLink,
  RefreshCw,
  CreditCard,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { getBookingById } from '../api/bookingService';

interface BookingPaymentPageProps {
  onNavigate: (page: string, props?: any) => void;
  bookingData?: {
    stationId?: string;
    stationName?: string;
    stationAddress?: string;
    size?: 'S' | 'M' | 'L';
    duration?: number;
    storageDate?: string;
    dropOffTime?: string;
    amount?: number;
    paymentUrl?: string;
    bookingId?: string;
    bookingCode?: string;
    paymentExpiresAt?: string;
  };
}

const BookingPaymentPage: React.FC<BookingPaymentPageProps> = ({ onNavigate, bookingData }) => {
  // Lấy thông tin user đăng nhập nếu có
  const savedUser = JSON.parse(localStorage.getItem('smartlocker_user') || '{}');

  const stationName = bookingData?.stationName || 'Trạm Sân Bay Đà Nẵng (Ga T1)';
  const stationAddress = bookingData?.stationAddress || 'Cửa 3, Sảnh đến A2, Sân bay Quốc tế Đà Nẵng (DAD)';
  const size = bookingData?.size || 'M';
  const duration = bookingData?.duration || 3;
  const amount = bookingData?.amount || 75000;
  const storageDate = bookingData?.storageDate || 'Hôm nay';
  const dropOffTime = bookingData?.dropOffTime || '14:00';

  const travelerName = savedUser.fullName || 'Nguyễn Văn A';
  const travelerPhone = savedUser.phone || '0901 234 567';
  const travelerEmail = savedUser.email || 'nguyenvana@gmail.com';

  const orderCode = bookingData?.bookingCode || 'BK' + Math.floor(10000000 + Math.random() * 90000000).toString().substring(0, 8);

  // Đếm ngược thời gian giữ chỗ
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!bookingData?.paymentExpiresAt) return 600;
      const diff = new Date(bookingData.paymentExpiresAt).getTime() - new Date().getTime();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setSecondsLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setSecondsLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [bookingData?.paymentExpiresAt]);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}: ${text}`);
  };

  // Trạng thái modal thành công
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [agreedTerms, setAgreedTerms] = useState<boolean>(true);
  const [successData, setSuccessData] = useState<{ lockerCode?: string; accessCode?: string } | null>(null);

  // Trạng thái kiểm tra thủ công
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);

  // Polling tự động kiểm tra trạng thái thanh toán mỗi 5 giây
  useEffect(() => {
    if (!bookingData?.bookingId) return;

    const interval = setInterval(async () => {
      try {
        const res = await getBookingById(bookingData.bookingId!);
        if (res.success && res.data) {
          if (res.data.status === 'CONFIRMED' || res.data.status === 'STORED' || res.data.status === 'CHECKED_IN') {
            clearInterval(interval);
            setSuccessData({
              lockerCode: res.data.lockerCode || 'N/A',
              accessCode: res.data.passcode || (res.data.lockerCode ? `LK-${res.data.lockerCode}` : '729 416')
            });
            setShowSuccessModal(true);
          } else if (res.data.status !== 'PENDING_PAYMENT') {
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Polling payment error:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [bookingData?.bookingId]);

  // Hàm kiểm tra thanh toán ngay khi người dùng bấm nút
  const handleCheckPaymentNow = async () => {
    if (!bookingData?.bookingId) {
      showToast('Không có mã đơn để kiểm tra.');
      return;
    }
    setIsCheckingStatus(true);
    try {
      const res = await getBookingById(bookingData.bookingId);
      if (res.success && res.data) {
        if (res.data.status === 'CONFIRMED' || res.data.status === 'STORED' || res.data.status === 'CHECKED_IN') {
          setSuccessData({
            lockerCode: res.data.lockerCode || 'N/A',
            accessCode: res.data.passcode || (res.data.lockerCode ? `LK-${res.data.lockerCode}` : '729 416')
          });
          setShowSuccessModal(true);
        } else {
          showToast('Chưa nhận được giao dịch. Vui lòng thanh toán trên PayOS.');
        }
      } else {
        showToast('Chưa ghi nhận thanh toán. Vui lòng thử lại sau vài giây.');
      }
    } catch (error) {
      showToast('Lỗi khi kiểm tra. Vui lòng thử lại sau.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleOpenPayOS = () => {
    if (bookingData?.paymentUrl) {
      window.open(bookingData.paymentUrl, '_blank');
    } else {
      showToast('Chưa có liên kết thanh toán PayOS.');
    }
  };

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 pb-12">
      {/* HEADER APP BAR */}
      <header className="w-full bg-white sticky top-0 z-40 border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 transition-transform active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-lg font-extrabold text-blue-600 tracking-tight flex items-center gap-1.5">
                  SmartLocker
                  <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-normal">
                    Thanh toán
                  </span>
                </span>
              </div>
            </button>
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200 text-slate-500 text-sm">
              <span onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors cursor-pointer">
                Trang chủ
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span onClick={() => onNavigate('map')} className="hover:text-blue-600 transition-colors cursor-pointer">
                Danh sách trạm
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span
                onClick={() => onNavigate('station-booking')}
                className="hover:text-blue-600 transition-colors cursor-pointer"
              >
                {stationName.split('(')[0].trim()}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-900 font-semibold">Xác nhận &amp; Thanh toán</span>
            </div>
          </div>

          {/* Hotline & Security Badge */}
          <div className="flex items-center gap-3 sm:gap-5">
            <a
              className="hidden sm:flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors text-sm"
              href="tel:19001234"
            >
              <Headphones className="w-4 h-4 text-blue-600" />
              <span>
                Hotline <strong className="text-slate-900">1900 1234</strong>
              </span>
            </a>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bảo mật 100% qua PayOS</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 w-full">
        {/* STEP PROGRESS BAR */}
        <nav aria-label="Tiến trình đặt tủ" className="mb-6 md:mb-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
            {/* Bước 1 */}
            <button
              onClick={() => onNavigate('station-booking')}
              className="flex items-center gap-2 sm:gap-3 text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bước 1</span>
                <span className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                  Chọn trạm &amp; Tủ
                </span>
              </div>
            </button>

            {/* Bước 2 (Hiện tại) */}
            <div className="flex items-center gap-2 sm:gap-3 border-x border-slate-200 px-2 sm:px-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-blue-500/30">
                2
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Bước 2 (Đang thực hiện)</span>
                <span className="text-sm font-bold text-blue-600 truncate">Thanh toán PayOS</span>
              </div>
            </div>

            {/* Bước 3 */}
            <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start opacity-70">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div className="hidden sm:flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bước 3</span>
                <span className="text-sm font-medium text-slate-500 truncate">Nhận mã mở tủ</span>
              </div>
            </div>
          </div>
        </nav>

        {/* CỘT ĐÔI CÂN XỨNG: BÊN TRÁI THÔNG TIN ĐƠN, BÊN PHẢI THANH TOÁN PAYOS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* CỘT TRÁI (5 CỘT): CHI TIẾT ĐƠN HÀNG */}
          <section className="lg:col-span-5 space-y-5">
            {/* Card 1: Tóm tắt đơn đặt */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <DoorOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Thông tin đặt tủ</h2>
                    <span className="text-xs text-slate-500">Mã đơn: <strong className="font-mono text-slate-800">{orderCode}</strong></span>
                  </div>
                </div>
                <span className="bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border border-blue-200">
                  Chờ thanh toán
                </span>
              </div>

              <div className="space-y-4">
                {/* Trạm lưu trữ */}
                <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <MapPin className="text-blue-600 w-5 h-5 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{stationName}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{stationAddress}</p>
                  </div>
                </div>

                {/* Ngăn tủ đã chọn */}
                <div className="border border-slate-200 rounded-xl p-3.5 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                      <Luggage className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {size === 'S' ? 'Ngăn Nhỏ (S)' : size === 'M' ? 'Ngăn Vừa (M)' : 'Ngăn Lớn (L)'}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-emerald-200">
                          {size === 'S' ? 'Balo / Túi xách' : size === 'M' ? 'Vali xách tay' : 'Vali ký gửi'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {size === 'S'
                          ? 'Kích thước: 35 x 45 x 50 cm'
                          : size === 'M'
                          ? 'Kích thước: 45 x 60 x 60 cm'
                          : 'Kích thước: 60 x 85 x 80 cm'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-semibold text-slate-400 block">Số ô tủ</span>
                    <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      Cấp tự động
                    </span>
                  </div>
                </div>

                {/* Thời gian lưu trữ */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Thời lượng</span>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {duration} Giờ
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Khung giờ sử dụng</span>
                    <span className="text-xs font-bold text-slate-900 mt-1 block">
                      {storageDate}, {dropOffTime}
                    </span>
                  </div>
                </div>

                {/* Chi tiết thanh toán */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Phí thuê tủ ({duration} giờ)</span>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(amount)} ₫</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      Bảo hiểm an toàn hành lý
                      <Verified className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                    <span className="text-emerald-600 font-medium">Đã bao gồm (0 ₫)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Mã khóa điện tử &amp; Thông báo SMS</span>
                    <span className="text-emerald-600 font-medium">Miễn phí</span>
                  </div>

                  {/* Tổng tiền */}
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                    <div>
                      <span className="text-sm font-bold text-slate-900">Tổng thanh toán</span>
                      <span className="block text-[11px] text-slate-400">Đã bao gồm thuế GTGT (VAT)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-2xl font-extrabold text-blue-600 tracking-tight">
                        {formatCurrency(amount)}
                      </span>
                      <span className="text-sm font-bold text-slate-700 ml-1">₫</span>
                    </div>
                  </div>
                </div>

                {/* Ghi chú nhận ô tủ */}
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
                  <Info className="text-blue-600 w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-900 leading-relaxed">
                    Sau khi thanh toán thành công, hệ thống sẽ tự động gán vị trí ô tủ (ví dụ: <strong>M-04</strong>) và cấp mã PIN mở tủ ngay trên màn hình.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Thông tin liên hệ khách hàng */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <User className="text-blue-600 w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-900">Thông tin người sử dụng</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 sm:col-span-2">
                  <span className="text-slate-400 block text-[11px]">Họ và tên người sử dụng</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">{travelerName}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                    Số điện thoại nhận mã
                  </span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block">{travelerPhone}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-600" />
                    Email nhận biên lai
                  </span>
                  <span className="font-medium text-slate-800 mt-0.5 block truncate">{travelerEmail}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Điều khoản & Cam kết */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  type="checkbox"
                />
                <span className="text-xs text-slate-700 leading-snug">
                  Tôi đồng ý với <span className="text-blue-600 font-semibold hover:underline">Điều khoản dịch vụ</span> &amp;{' '}
                  <span className="text-blue-600 font-semibold hover:underline">Chính sách sử dụng tủ SmartLocker</span>.
                </span>
              </label>
              <div className="text-[11px] text-slate-500 leading-relaxed pl-6 space-y-1">
                <p>• <strong>Hủy miễn phí:</strong> Được hỗ trợ hủy trước 2 giờ so với thời điểm nhận tủ.</p>
                <p>• <strong>An toàn:</strong> Nghiêm cấm lưu trữ chất dễ cháy nổ, đồ tươi sống hoặc hàng cấm.</p>
              </div>
            </div>
          </section>

          {/* CỘT PHẢI (7 CỘT): CỔNG THANH TOÁN PAYOS CHÍNH THỨC */}
          <section className="lg:col-span-7 space-y-5">
            {/* Thanh đếm ngược giữ chỗ */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-amber-900 font-bold">
                    Vị trí ngăn tủ đang được giữ chỗ trong:{' '}
                    <span className="font-mono text-amber-900 font-extrabold text-sm sm:text-base bg-white/90 px-2 py-0.5 rounded border border-amber-300">
                      {formatTimer(secondsLeft)}
                    </span>
                  </p>
                  <p className="text-[11px] text-amber-800/80 mt-0.5">
                    Sau thời gian này, ô tủ sẽ tự động được giải phóng để phục vụ khách hàng khác.
                  </p>
                </div>
              </div>
            </div>

            {/* Thẻ thanh toán PayOS trung tâm */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              {/* Header Cổng Thanh toán */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">Thanh toán qua PayOS</h2>
                      <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded">Cổng bảo mật</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quét mã VietQR tiện lợi với 40+ ứng dụng ngân hàng và ví điện tử Việt Nam
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                  <span className="bg-[#003B7A] text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-xs">VIETQR</span>
                  <span className="bg-[#D9251D] text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-xs">NAPAS 247</span>
                </div>
              </div>

              {/* Tóm tắt nhanh số tiền & mã đơn */}
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                  <span className="text-xs text-slate-500 font-medium">Mã đơn thanh toán:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {orderCode}
                    </span>
                    <button
                      onClick={() => handleCopy(orderCode, 'Mã đơn')}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-colors"
                      title="Sao chép mã"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs text-slate-500 font-medium">Số tiền chuyển:</span>
                  <span className="font-mono text-lg font-extrabold text-blue-600">
                    {formatCurrency(amount)} ₫
                  </span>
                </div>
              </div>

              {/* Nút Hero CTA mở PayOS */}
              <div className="my-6 p-6 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/40 to-blue-50 border border-blue-200/80 text-center">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 text-blue-700 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cổng thanh toán tự động PayOS</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Nhấn để mở giao diện thanh toán bảo mật
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Trang thanh toán chính thức của PayOS sẽ hiển thị mã VietQR động cùng thông tin số tiền chính xác, giúp bạn thanh toán nhanh chóng chỉ bằng 1 thao tác quét mã.
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <button
                      onClick={handleOpenPayOS}
                      className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/25 hover:shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      <span>Mở trang thanh toán PayOS</span>
                      <ExternalLink className="w-4 h-4 ml-0.5 opacity-80" />
                    </button>

                    {bookingData?.paymentUrl && (
                      <button
                        onClick={() => handleCopy(bookingData.paymentUrl!, 'Liên kết PayOS')}
                        className="w-full sm:w-auto px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all shadow-2xs active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-4 h-4 text-slate-400" />
                        <span>Sao chép link</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Hướng dẫn 3 bước thanh toán */}
              <div className="space-y-3 pt-2 pb-6 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quy trình thanh toán đơn giản:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                      1
                    </div>
                    <h5 className="text-xs font-bold text-slate-900">Mở cổng PayOS</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Bấm nút màu xanh ở trên để mở trang thanh toán chính thức của PayOS.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                      2
                    </div>
                    <h5 className="text-xs font-bold text-slate-900">Quét mã VietQR</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Dùng app ngân hàng bất kỳ để quét mã QR (số tiền &amp; nội dung được điền tự động).
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mb-2">
                      3
                    </div>
                    <h5 className="text-xs font-bold text-slate-900">Nhận mã mở tủ</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Sau khi chuyển khoản, màn hình này sẽ tự động cập nhật và cấp mã PIN nhận tủ.
                    </p>
                  </div>
                </div>
              </div>

              {/* Khung trạng thái lắng nghe Webhook thời gian thực */}
              <div className="mt-6 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 absolute"></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">
                        Đang đợi xác nhận thanh toán từ ngân hàng...
                      </p>
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Hệ thống tự động phát hiện trong 2 – 5 giây khi giao dịch thành công. Không cần tải lại trang.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCheckPaymentNow}
                  disabled={isCheckingStatus}
                  className="shrink-0 w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 text-blue-600 text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                  type="button"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  <span>{isCheckingStatus ? 'Đang kiểm tra...' : 'Kiểm tra ngay'}</span>
                </button>
              </div>

              {/* Footer bảo mật */}
              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Thanh toán an toàn với mã hóa SSL 256-bit • Cổng thanh toán đối tác PayOS</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* POPUP XÁC NHẬN THANH TOÁN THÀNH CÔNG */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 text-center transform transition-all animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-200 mx-auto flex items-center justify-center mb-4 shadow-sm">
              <CheckCircle className="w-9 h-9 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Thanh toán thành công!</h3>
            <p className="text-sm text-slate-600 mt-1">
              Đã nhận thành công <strong className="text-blue-600">{formatCurrency(amount)} ₫</strong> cho đơn đặt{' '}
              <strong className="text-slate-900">{orderCode}</strong>.
            </p>

            <div className="my-5 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-left space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Vị trí ngăn tủ được cấp:</span>
                <span className="font-mono text-base font-bold text-blue-600 bg-white px-2.5 py-0.5 rounded border border-blue-200">
                  {successData?.lockerCode || (size === 'S' ? 'Ngăn S-02' : size === 'M' ? 'Ngăn M-04' : 'Ngăn L-02')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Mã PIN mở tủ một lần:</span>
                <span className="font-mono text-xl font-extrabold text-slate-900 tracking-wider">
                  {successData?.accessCode || '729 416'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              Thông tin ngăn tủ và mã khóa đã được lưu vào mục quản lý đơn đặt của bạn.
            </p>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                onNavigate('booking-detail', {
                  bookingData: {
                    stationName,
                    stationAddress,
                    size,
                    duration,
                    amount,
                    orderCode,
                    accessCode: successData?.accessCode || ('LK-' + orderCode.substring(2, 7) + 'A'),
                    bayCode: successData?.lockerCode || (size === 'S' ? 'Ngăn S-02' : size === 'M' ? 'Ngăn M-04' : 'Ngăn L-02'),
                  }
                });
              }}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Xem chi tiết tủ &amp; Mã mở</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TOAST THÔNG BÁO */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 z-50 flex items-center gap-2 animate-fade-in-up">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full bg-slate-50 border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div className="space-y-1">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-base text-blue-600 font-extrabold tracking-tight">SmartLocker</span>
                <span className="text-xs text-slate-500 font-medium">Hệ thống tủ lưu trữ hành lý thông minh</span>
              </div>
              <p className="text-xs text-slate-400">
                © 2026 SmartLocker Systems. Cổng thanh toán tích hợp PayOS &amp; VietQR Napas 24/7.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
              <a className="hover:text-blue-600 transition-colors" href="#">Chính sách bảo mật</a>
              <span>•</span>
              <a className="hover:text-blue-600 transition-colors" href="#">Điều khoản sử dụng</a>
              <span>•</span>
              <a className="hover:text-blue-600 transition-colors" href="#">Hỗ trợ khách hàng</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BookingPaymentPage;
