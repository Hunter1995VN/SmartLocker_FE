import StationReviewPanel from '../components/booking/StationReviewPanel';
import LostItemPanel from '../components/booking/LostItemPanel';
import { parseServerTime } from '../utils/serverTime';
import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ShieldCheck,
  ChevronRight,
  Verified,
  DoorOpen,
  Key,
  Copy,
  Check,
  Timer,
  Info,
  Navigation,
  Headphones,
  PlusCircle,
  QrCode,
  AlertTriangle,
  Clock,
  WifiOff
} from 'lucide-react';
import { ExtendBookingModal } from '../components/booking/ExtendBookingModal';
import { OfflineTicketModal } from '../components/booking/OfflineTicketModal';
import { getBookingById, extendBooking, getOfflineTicket, upgradeOnlineTicket, type BookingDto, type OfflineTicketDto } from '../api/bookingService';
import { offlineTicketStore } from '../utils/offlineTicketStore';
import { QRCodeSVG } from 'qrcode.react';
import CustomerHeader from '../components/layout/CustomerHeader';

interface BookingDetailPageProps {
  onNavigate: (page: string, props?: any) => void;
  bookingId?: string;
  bookingData?: {
    stationId?: string;
    stationName?: string;
    stationAddress?: string;
    size?: 'S' | 'M' | 'L';
    duration?: number;
    amount?: number;
    orderCode?: string;
    accessCode?: string;
    bayCode?: string;
  };
}

const BookingDetailPage: React.FC<BookingDetailPageProps> = ({ onNavigate, bookingId }) => {
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const fetchBooking = async () => {
      if (!bookingId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setBooking(null);
      try {
        const response = await getBookingById(bookingId);
        if (mounted && response.success && response.data) {
          setBooking(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch booking', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchBooking();
    return () => { mounted = false; };
  }, [bookingId]);

  // Refresh expired online tickets while this page stays open. Serialize retries.
  useEffect(() => {
    if (!bookingId || !booking || !['CONFIRMED', 'STORED'].includes(booking.status)) return;
    let disposed = false;
    let pending = false;
    const refresh = async () => {
      if (pending || disposed) return;
      try {
        if (booking.qrPayload) {
          const expiry = String(JSON.parse(atob(booking.qrPayload)).expiresAt);
          const expiresAt = Date.parse(/Z|[+-]\d\d:\d\d$/.test(expiry) ? expiry : `${expiry}Z`);
          if (expiresAt > Date.now()) return;
        }
      } catch { /* Fetch a valid ticket when the current payload cannot be read. */ }
      pending = true;
      try {
        const response = await getBookingById(bookingId);
        if (!disposed && response.success && response.data) setBooking(response.data);
      } catch { /* Keep the expired QR hidden and retry on the next tick. */ }
      finally { pending = false; }
    };
    const timer = window.setInterval(() => { void refresh(); }, 3000);
    void refresh();
    return () => { disposed = true; window.clearInterval(timer); };
  }, [bookingId, booking]);

  // Only display credentials returned for the current booking.
  const stationName = booking?.stationName || 'Chưa có tên trạm';
  const stationAddress = booking?.stationAddress || 'Chưa có địa chỉ';
  const size = booking?.size || '';
  const duration = booking?.durationHours ?? 0;
  const amount = booking?.baseAmount ?? 0;
  const orderId = booking?.bookingCode || 'Chưa có mã đơn';
  const rawBayCode = booking?.lockerCode;
  const isLockerAssigned = Boolean(rawBayCode);
  const bayCode = isLockerAssigned
    ? `Locker ${rawBayCode}`
    : `Auto-assigned at Kiosk (Size ${size})`;

  // Only a valid eight-digit PIN returned for the current booking may be copied.
  const getDisplayPin = () => {
    if (booking?.status === 'PENDING_PAYMENT') {
      return 'Chờ thanh toán';
    }
    if (!booking || !['CONFIRMED', 'STORED'].includes(booking.status)) return 'Vé không còn hiệu lực';
    const raw = booking.accessCode;
    if (raw) {
      const clean = raw.replace(/\s+/g, '');
      if (/^\d{8}$/.test(clean)) {
        return `${clean.substring(0, 4)} ${clean.substring(4, 8)}`;
      }
      return 'Chưa có PIN hợp lệ';
    }
    if (booking?.status === 'NO_SHOW') return 'Hết hạn nhận';
    if (booking?.status === 'CANCELLED') return 'Đã hủy';
    return 'Chưa cấp';
  };
  const passcode = getDisplayPin();

  const status = booking?.status || '';
  const ticketEligible = booking?.id === bookingId && ['CONFIRMED', 'STORED'].includes(status);
  const validPin = ticketEligible && /^\d{8}$/.test(booking?.accessCode || '') ? booking!.accessCode! : null;

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  // Realtime tick timer every second so hold & storage countdown update live
  const [, setClockTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => setClockTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Offline Ticket Modal state
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [offlineTicket, setOfflineTicket] = useState<OfflineTicketDto | null>(null);
  const [isLoadingOfflineTicket, setIsLoadingOfflineTicket] = useState<boolean>(false);

  useEffect(() => {
    let disposed = false;
    setOfflineTicket(null); setIsOfflineModalOpen(false);
    if (!bookingId || !ticketEligible) {
      if (booking?.id === bookingId && bookingId) offlineTicketStore.removeTicket(bookingId);
      return;
    }
    const cached = offlineTicketStore.getTicket(bookingId);
    if (cached && parseServerTime(cached.validUntil) > Date.now()) setOfflineTicket(cached);
    getOfflineTicket(bookingId).then(res => {
      if (!disposed && res.success && res.data?.bookingId === bookingId) setOfflineTicket(res.data);
    }).catch(() => { /* The explicit offline view can retry without replacing the online QR. */ });
    return () => { disposed = true; };
  }, [bookingId, ticketEligible, booking?.id]);

  const handleOpenOfflineTicket = async () => {
    if (!ticketEligible) return;
    setIsOfflineModalOpen(true);
    const targetId = booking?.id || bookingId;
    if (!targetId) return;

    if (!offlineTicket) {
      setIsLoadingOfflineTicket(true);
      try {
        const res = await getOfflineTicket(targetId);
        if (res.success && res.data) {
          setOfflineTicket(res.data);
        }
      } catch (err) {
        console.warn('Lá»—i táº£i vÃ© ngoáº¡i tuyáº¿n:', err);
      } finally {
        setIsLoadingOfflineTicket(false);
      }
    }
  };

  // Time calculations: 2 Giai đoạn (Hold 30 phút vs Lưu trữ thật)
  const calculateTimeInfo = () => {
    const now = new Date().getTime();

    // 1. Giai đoạn HOLD (CONFIRMED - chưa nhận tủ)
    if (status === 'CONFIRMED') {
      const confirmedTime = booking?.createdAt ? new Date(parseServerTime(booking.createdAt)).getTime() : now;
      const holdExpiresTime = booking?.holdExpiresAt
        ? new Date(parseServerTime(booking.holdExpiresAt)).getTime()
        : confirmedTime + 30 * 60 * 1000;

      const holdTotal = 30 * 60 * 1000;
      const holdRemaining = Math.max(0, holdExpiresTime - now);
      const holdElapsed = Math.min(holdTotal, Math.max(0, holdTotal - holdRemaining));
      const holdProgress = Math.min(100, Math.max(0, (holdElapsed / holdTotal) * 100));

      const minutes = Math.floor(holdRemaining / 60000);
      const seconds = Math.floor((holdRemaining % 60000) / 1000);

      const holdExpiresText = new Date(holdExpiresTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      return {
        isHoldPeriod: true,
        remainingText: holdRemaining > 0 ? `${minutes}m ${seconds}s remaining` : 'Hold expired',
        progress: holdProgress,
        startedText: 'Booking confirmed',
        expiresText: `Hold until ${holdExpiresText}`,
        holdMinutes: minutes,
      };
    }

    // 2. Giai đoạn STORED / OTHER (Đã nhận tủ - tính theo CheckedInAt)
    const startTime = booking?.checkedInAt
      ? new Date(parseServerTime(booking.checkedInAt)).getTime()
      : (booking?.startAt ? new Date(parseServerTime(booking.startAt)).getTime() : now);
    const endTime = booking?.endAt ? new Date(parseServerTime(booking.endAt)).getTime() : startTime + duration * 3600000;

    const startedText = new Date(startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(startTime).toLocaleDateString('en-US');
    const expiresText = new Date(endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(endTime).toLocaleDateString('en-US');

    if (now >= endTime) {
      return { isHoldPeriod: false, remainingText: '0m remaining (Overdue)', progress: 100, startedText, expiresText };
    }

    const total = Math.max(1, endTime - startTime);
    const elapsed = Math.max(0, now - startTime);
    const remaining = Math.max(0, endTime - now);

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));

    return {
      isHoldPeriod: false,
      remainingText: `${hours}h ${minutes}m remaining`,
      progress,
      startedText,
      expiresText
    };
  };

  const { isHoldPeriod, remainingText, progress, startedText, expiresText } = calculateTimeInfo();

  // UC-T09: Dynamic QR token expiry countdown (xoay vòng mã mỗi 60s)
  let tokenSeconds = 0;
  if (booking?.qrPayload) {
    try {
      const ticket = JSON.parse(atob(booking.qrPayload));
      const expiry = String(ticket.expiresAt);
      tokenSeconds = Math.max(0, Math.ceil((Date.parse(/Z|[+-]\d\d:\d\d$/.test(expiry) ? expiry : `${expiry}Z`) - Date.now()) / 1000));
    } catch {
      // In case qrPayload is unreadable or plain string
    }
  }

  // Copy passcode state
  const [copied, setCopied] = useState<boolean>(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [upgradingTicket, setUpgradingTicket] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const handleCopyCode = async () => {
    if (!validPin) return;
    try {
      await navigator.clipboard.writeText(validPin);
      setCopyFailed(false); setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { setCopied(false); setCopyFailed(true); }
  };

  // Extend Modal state (UC-T07 preview)
  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [extendSuccessToast, setExtendSuccessToast] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-[#f8f9ff] min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!booking || booking.id !== bookingId) return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-lg font-bold">Không tải được thông tin đơn đặt tủ</h1>
      <p>Vui lòng kiểm tra kết nối và quyền truy cập đơn.</p>
      <button className="rounded bg-blue-700 text-white px-4 py-2" onClick={() => window.location.reload()}>Thử lại</button>
      <button onClick={() => onNavigate('my-bookings')}>Về danh sách đơn</button>
    </main>
  );

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] font-body-md antialiased min-h-screen flex flex-col selection:bg-[#dbe1ff] selection:text-[#004ac6] pb-12">
      {/* UNIFIED CUSTOMER HEADER */}
      <CustomerHeader
        currentPage="booking-detail"
        onNavigate={onNavigate}
      />

      {/* MAIN CANVAS */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Overdue Banner */}
        {booking?.isOverdue && (
           <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3.5 shadow-xs mb-4">
             <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
             <div className="flex-1">
               <p className="text-xs text-red-900 font-bold">Locker Overdue</p>
               <p className="text-xs text-red-800 mt-0.5">This locker is currently overdue. Current overdue fee: <strong>{formatCurrency(booking.currentOverdueFee || 0)} VND</strong>.</p>
             </div>
           </div>
        )}

        {/* BREADCRUMB & STATUS HEADER */}
        <section className="space-y-3">
          {/* Breadcrumb trail */}
          <nav className="flex items-center gap-2 text-[#434655] text-xs">
            <button onClick={() => onNavigate('home')} className="hover:text-primary transition-colors cursor-pointer">Home</button>
            <ChevronRight className="w-3.5 h-3.5 text-outline" />
            <button onClick={() => onNavigate('my-bookings')} className="hover:text-primary transition-colors cursor-pointer">My Bookings</button>
            <ChevronRight className="w-3.5 h-3.5 text-outline" />
            <span className="text-[#0b1c30] font-semibold">Booking #{orderId}</span>
          </nav>

          {/* Active Status Banner & Station Meta Card */}
          <div className="bg-white rounded-2xl p-5 md:p-6 border border-outline-variant/30 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Active Status Chip */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs uppercase tracking-wider font-bold border ${
                  status === 'CONFIRMED'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : status === 'STORED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : ['COMPLETED', 'COMPLETED_MANUAL'].includes(status)
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      status === 'CONFIRMED' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      status === 'CONFIRMED' ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}></span>
                  </span>
                  <span>
                    {status === 'CONFIRMED'
                      ? 'ĐANG GIỮ CHỖ (30M HOLD)'
                      : status === 'STORED'
                        ? 'ĐANG GỬI ĐỒ (STORED)'
                        : status.replace('_', ' ')}
                  </span>
                </div>
                {/* Booking Reference ID Badge */}
                <span className="px-2.5 py-0.5 rounded-md bg-[#e5eeff] text-xs text-secondary font-mono font-bold">ID: #{orderId}</span>
                <span className="hidden sm:inline-block text-outline-variant">•</span>
                <span className="text-[#434655] text-xs flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Vé xác thực tại Kiosk
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0b1c30] tracking-tight">
                {stationName}
              </h1>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[#434655] text-xs">
                <span className="flex items-center gap-1 text-[#0b1c30] font-medium">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  {stationAddress}
                </span>
              </div>
            </div>

            {/* Locker Unit Identifier Pill (Elevated) */}
            <div className="flex items-center gap-3 bg-[#eff4ff] border border-primary/20 p-3.5 rounded-xl lg:self-center shadow-xs">
              <div className="w-12 h-12 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
                <DoorOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-secondary font-bold">Assigned Bay</div>
                <div className="text-lg text-primary font-bold">{bayCode}</div>
                <div className="text-xs text-[#434655]">
                  {size === 'S' ? 'Cỡ nhỏ (S)' : size === 'M' ? 'Cỡ vừa (M)' : 'Cỡ lớn (L)'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TWO-COLUMN WORKSPACE: LEFT MAIN PASS & RIGHT TELEMETRY/MAP */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* HERO DIGITAL KEY CARD (Centerpiece Focus) - 7 Cols Desktop */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-6 sm:p-8 relative overflow-hidden">
              {/* Top Accent Light Bar */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary to-[#2563eb]"></div>

              {/* Card Header */}
              <div className="flex items-start justify-between border-b border-outline-variant/20 pb-5 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-[#0b1c30]">Digital Access Pass &amp; Unlock Key</h2>
                  </div>
                  <p className="text-xs text-[#434655]">
                    {isLockerAssigned
                      ? `Present this QR code to the Kiosk optical scanner or enter the passcode below to release ${bayCode}.`
                      : `Present this QR code to the Kiosk optical scanner or enter the 8-digit passcode below on the touchpad to automatically assign your locker (Size ${size}) and release the door.`}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-600" />
                  {ticketEligible && tokenSeconds > 0 ? 'Vé đang có hiệu lực' : 'Vé chưa sẵn sàng'}
                </div>
              </div>

              {/* Section A: QR Code Visualizer */}
              <div className="flex flex-col items-center justify-center text-center space-y-4 py-2">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/30 to-blue-400/30 blur-md opacity-75 group-hover:opacity-100 transition duration-500"></div>
                  {/* QR Frame */}
                  <div className="relative p-5 bg-white rounded-2xl border-2 border-primary/20 shadow-md flex items-center justify-center">
                    {ticketEligible && booking?.qrPayload && tokenSeconds > 0 ? (
                      <QRCodeSVG
                        role="img"
                        aria-label="Mã QR mở tủ trực tuyến"
                        value={booking!.qrPayload!}
                        size={210}
                        level="H"
                        includeMargin={false}
                      />
                    ) : booking?.status === 'PENDING_PAYMENT' ? (
                      <div className="p-8 text-center text-xs text-amber-700 font-medium">
                        Đang chờ thanh toán để kích hoạt vé mở tủ
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500 font-medium">
                        Vé chưa sẵn sàng hoặc đang xoay mã bảo mật…
                      </div>
                    )}
                  </div>
                </div>

                {/* Optical Scanner Cue */}
                <div className="flex items-center justify-center gap-2 text-[#434655] text-xs pt-1">
                  <QrCode className="w-4 h-4 text-primary" />
                  <span>Hold 10–15 cm under the Station Kiosk optical scanner</span>
                </div>

                {/* Real-time Refresh Pulse Indicator */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eff4ff] rounded-full text-xs font-medium text-secondary">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span>Token refreshes in <strong className="text-[#0b1c30]">{tokenSeconds}s</strong> (Anti-screenshot security)</span>
                </div>
              </div>

              {/* Section B: 8-Digit Backup Access PIN Passcode */}
              <div className="mt-6 pt-6 border-t border-outline-variant/30 space-y-3">
                <div className="text-center">
                  <span className="text-[11px] text-secondary tracking-wider uppercase font-bold">
                    HOẶC NHẬP MÃ PIN 8 SỐ TẠI BÀN PHÍM KIOSK
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  {/* Monospace Code Field */}
                  <div className="w-full sm:w-auto px-6 py-3 bg-[#eff4ff] border border-outline-variant/50 rounded-xl flex items-center justify-center gap-3">
                    <Key className="w-4 h-4 text-secondary" />
                    <span className="font-mono text-2xl font-bold text-[#0b1c30] tracking-widest">
                      {passcode}
                    </span>
                  </div>
                  {/* Copy Button */}
                  <button
                    onClick={handleCopyCode}
                    disabled={!validPin}
                    className="w-full sm:w-auto h-[54px] px-5 bg-white hover:bg-[#eff4ff] border border-outline-variant rounded-xl text-sm font-semibold text-[#0b1c30] flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 shadow-xs cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-primary" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-center text-xs text-[#434655]">Tap &quot;Unlock Locker&quot; on the terminal screen, then type this code.</p>
                {copyFailed && <p role="status">Không sao chép được. Bạn có thể nhập 8 số đang hiển thị tại Kiosk.</p>}
                {ticketEligible && status === 'CONFIRMED' && !validPin && <div className="text-sm space-y-2">
                  <p>Vé chưa có PIN 8 số hợp lệ. Thay vé cũ sẽ làm PIN và QR online cũ hết hiệu lực.</p>
                  <button disabled={upgradingTicket} className="border rounded px-4 py-2" onClick={async () => {
                    if (!bookingId || upgradingTicket) return;
                    setUpgradingTicket(true); setTicketError('');
                    try {
                      await upgradeOnlineTicket(bookingId);
                      const result = await getBookingById(bookingId);
                      if (result.success && result.data) setBooking(result.data);
                    } catch (error) {
                      setTicketError((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Không thay được vé. Vui lòng liên hệ nhân viên.');
                    } finally { setUpgradingTicket(false); }
                  }}>{upgradingTicket ? 'Đang thay vé…' : 'Thay vé cũ bằng PIN 8 số'}</button>
                  {ticketError && <p role="alert">{ticketError}</p>}
                </div>}
              </div>

              {/* Section C: 2-Phase Timing Engine (Hold vs Active Rental) */}
              <div className={`mt-6 rounded-2xl p-5 border space-y-4 transition-all duration-300 ${
                isHoldPeriod
                  ? 'bg-amber-50/70 border-amber-200/80 shadow-xs'
                  : ['COMPLETED', 'COMPLETED_MANUAL'].includes(status)
                    ? 'bg-emerald-50/70 border-emerald-200 shadow-xs'
                    : 'bg-[#eff4ff]/80 border-blue-200/80 shadow-xs'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isHoldPeriod ? (
                      <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                    ) : (
                      <Timer className="w-5 h-5 text-primary" />
                    )}
                    <div>
                      <span className="text-sm font-bold text-[#0b1c30]">
                        {isHoldPeriod
                          ? 'Thời gian giữ chỗ tủ (30 phút để đến trạm)'
                          : ['COMPLETED', 'COMPLETED_MANUAL'].includes(status)
                            ? 'Lượt thuê tủ đã hoàn tất'
                            : 'Thời gian lưu trữ còn lại'}
                      </span>
                      {isHoldPeriod && (
                        <p className="text-[11px] text-amber-800 font-medium">Giờ thuê thực tế chỉ bắt đầu tính khi bạn mở tủ tại trạm</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-lg font-bold font-mono ${isHoldPeriod ? 'text-amber-700' : 'text-primary'}`}>
                    {['COMPLETED', 'COMPLETED_MANUAL'].includes(status) ? '00:00:00' : remainingText}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        isHoldPeriod
                          ? 'bg-amber-500'
                          : ['COMPLETED', 'COMPLETED_MANUAL'].includes(status)
                            ? 'bg-emerald-500'
                            : 'bg-primary'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-secondary font-medium">
                    <span>{startedText}</span>
                    <span>{expiresText}</span>
                  </div>
                </div>

                {/* Explanatory callouts & Live action triggers */}
                {isHoldPeriod && (
                  <div className="pt-2 border-t border-amber-200/60 space-y-3">
                    <div className="flex items-start gap-2 text-xs text-amber-900 leading-relaxed bg-white/70 p-3 rounded-xl border border-amber-200/50">
                      <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <span>
                        Hệ thống đang giữ chỗ ô tủ ({size === 'S' ? 'Size S' : size === 'M' ? 'Size M' : 'Size L'}) cho bạn.
                        Thời gian đặt thuê <strong>{duration} tiếng</strong> chỉ được bắt đầu đếm khi bạn có mặt tại trạm và mở tủ.
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-blue-900 bg-blue-50 border border-blue-200 p-3 rounded-xl">Tại Kiosk của trạm, chọn Gửi đồ rồi quét QR hoặc nhập PIN trên vé. Đặt hành lý vào tủ và đóng chặt cửa để xác nhận gửi đồ.</p>
                  </div>
                )}

                {status === 'STORED' && (
                  <div className="pt-2 border-t border-blue-200/60 space-y-3">
                    <div className="flex items-start gap-2 text-xs text-[#434655] leading-relaxed">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>
                        Thời gian thuê đang được tính từ khoảnh khắc bạn check-in lúc {startedText}.
                        Gia hạn thêm giờ bất cứ lúc nào trước khi hết hạn.
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-blue-900 bg-blue-50 border border-blue-200 p-3 rounded-xl">Tại Kiosk của trạm, chọn Lấy đồ rồi quét QR hoặc nhập PIN. Thanh toán phụ phí nếu có, lấy hết hành lý và đóng chặt cửa để hoàn tất.</p>
                  </div>
                )}
              </div>

              {/* Section 4: Offline Availability Guarantee Badge */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-[#0b1c30] flex items-center gap-1.5">
                      <span>Vé ngoại tuyến</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">HMAC JWS</span>
                    </div>
                    <p className="text-xs text-[#434655] leading-relaxed">
                      Vé ngoại tuyến được hiển thị riêng. Mã QR động phía trên chỉ dùng để xác thực trực tuyến.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOpenOfflineTicket}
                  disabled={!ticketEligible}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <WifiOff className="w-4 h-4 text-primary" />
                  <span>Xem vé ngoại tuyến</span>
                </button>
              </div>

              {/* Section 5: Quick Action Hub */}
              <div className="mt-6 pt-5 border-t border-outline-variant/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setShowExtendModal(true)}
                  disabled={booking?.canExtend === false}
                  className={`h-11 px-3 bg-white border border-primary/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs ${booking?.canExtend === false ? 'opacity-50 cursor-not-allowed text-gray-500 border-gray-300' : 'hover:bg-[#eff4ff] text-primary cursor-pointer'}`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Gia hạn thời gian</span>
                </button>
                <button
                  onClick={() => onNavigate('map')}
                  className="h-11 px-3 bg-white hover:bg-[#eff4ff] border border-outline-variant rounded-xl text-xs text-[#0b1c30] font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-primary" />
                  <span>Terminal Route</span>
                </button>
                <a
                  href="tel:19001234"
                  className="h-11 px-3 bg-white hover:bg-[#eff4ff] border border-outline-variant rounded-xl text-xs text-[#0b1c30] font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Headphones className="w-4 h-4 text-secondary" />
                  <span>Help: 1900 1234</span>
                </a>
              </div>
            </div>
          </div>

          {/* SECONDARY COLUMN: PHYSICAL SCHEMATIC & BOOKING DETAILS (5 Cols Desktop) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border p-5 space-y-2">
              <h3 className="font-bold">{stationName}</h3><p className="text-sm">{stationAddress}</p>
              <button className="text-primary" onClick={() => onNavigate('map')}>Xem bản đồ trạm</button>
            </div>

            {/* Locker Compartment Schematic Matrix */}
            <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#0b1c30]">
                    {isLockerAssigned ? 'Assigned Locker Location' : 'Station Locker Layout'}
                  </h3>
                  <p className="text-xs text-[#434655]">
                    {isLockerAssigned ? `Ô tủ ${rawBayCode}` : `Size ${size} Tier · Assigned at Kiosk Check-in`}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold ${
                  isLockerAssigned
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-[#e5eeff] text-secondary'
                }`}>
                  {isLockerAssigned ? `Locker ${rawBayCode}` : `Size ${size} Tier`}
                </span>
              </div>

              {!isLockerAssigned && (
                <div className="p-3 bg-blue-50/80 border border-blue-200/70 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Your physical locker compartment (<strong>Size {size}</strong>) will be assigned dynamically and popped open when you scan your QR Code or enter your PIN at the station kiosk touch screen.
                  </span>
                </div>
              )}

              <p className="text-sm text-secondary">{isLockerAssigned ? 'Ô tủ được cấp: ' + rawBayCode : 'Mã ô tủ sẽ xuất hiện sau khi xác thực tại Kiosk.'}</p>
            </div>

            {/* Baggage & Security Ledger Details */}
            <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-5 space-y-3">
              <h3 className="text-base font-bold text-[#0b1c30]">Storage &amp; Security Audit</h3>
              <div className="divide-y divide-outline-variant/20 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-[#434655]">Thời điểm gửi đồ</span>
                  <span className="font-mono text-[#0b1c30] font-medium">{booking?.checkedInAt ? new Date(parseServerTime(booking.checkedInAt)).toLocaleString('vi-VN') : 'Chưa gửi đồ'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-[#434655]">Kích cỡ tủ</span>
                  <span className="text-[#0b1c30] font-medium">{size}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-[#434655]">Mã đơn đặt tủ</span>
                  <span className="font-mono font-semibold text-primary">{orderId}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-[#434655]">Total Rate Billed</span>
                  <span className="text-[#0b1c30] font-bold">{formatCurrency(amount)} VND ({booking.payments?.some(p => p.kind === 'BASE' && p.status === 'PAID') ? 'Đã thanh toán' : 'Chưa thanh toán'})</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* OFFLINE TICKET PASS MODAL */}
      <OfflineTicketModal
        isOpen={ticketEligible && isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        ticket={offlineTicket}
        isLoading={isLoadingOfflineTicket}
      />

      {/* EXTEND BOOKING MODAL (UC-T07) */}
      {booking && <StationReviewPanel bookingId={booking.id} status={booking.status} />}
        {booking && <LostItemPanel bookingId={booking.id} status={booking.status} checkedOutAt={booking.checkedOutAt} />}
      <ExtendBookingModal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        onSuccess={async (addedHours, _fee) => {
          if (!bookingId) {
            setShowExtendModal(false);
            return;
          }
          try {
            const currentEnd = booking?.endAt ? new Date(parseServerTime(booking.endAt)) : new Date();
            const newEndAt = new Date(currentEnd.getTime() + addedHours * 3600000).toISOString();
            const res = await extendBooking(bookingId, { newEndAt });
            if (res.success && res.data?.paymentUrl) {
              window.open(res.data.paymentUrl, '_blank');
              setExtendSuccessToast(`Đang chuyển hướng thanh toán gia hạn +${addedHours} giờ...`);
            } else {
              setExtendSuccessToast(res.message || 'Gia hạn thành công.');
            }
            setShowExtendModal(false);
            const refreshRes = await getBookingById(bookingId);
            if (refreshRes.success && refreshRes.data) setBooking(refreshRes.data);
            setTimeout(() => {
              setExtendSuccessToast(null);
            }, 4000);
          } catch {
            setExtendSuccessToast('Có lỗi xảy ra khi gia hạn đơn hàng.');
          }
        }}
        lockerCode={bayCode}
        stationName={stationName}
        currentEndTime={expiresText}
      />

      {/* EXTEND SUCCESS TOAST */}
      {extendSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-[#0b1c30] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-[#334155] z-50 flex items-center gap-2 animate-fade-in-up">
          <Verified className="w-4 h-4 text-emerald-400" />
          <span>{extendSuccessToast}</span>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-outline-variant/30 mt-12">
        <div className="w-full max-w-7xl mx-auto py-6 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <span className="text-base text-primary font-bold">SmartLocker SLMS</span>
            <span className="hidden sm:inline-block text-outline-variant">•</span>
            <p className="text-xs text-[#434655]">
              © 2025 SmartLocker Systems Inc. Telemetry &amp; Cryptographic Access Active. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#434655]">
            <a className="hover:text-primary transition-colors" href="#">Security Architecture</a>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-primary transition-colors" href="#">Support Telemetry</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BookingDetailPage;
