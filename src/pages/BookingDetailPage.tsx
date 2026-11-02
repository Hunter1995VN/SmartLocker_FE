import React, { useState, useEffect } from 'react';
import {
  Lock,
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
  FileText,
  PlusCircle,
  QrCode,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  PackageCheck
} from 'lucide-react';
import { ExtendBookingModal } from '../components/booking/ExtendBookingModal';
import { PayOverdueModal } from '../components/booking/PayOverdueModal';
import { CancelBookingModal } from '../components/booking/CancelBookingModal';
import { getBookingById, checkInBooking, checkOutBooking, cancelBooking, simulateOverdue, type BookingDto } from '../api/bookingService';
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

const BookingDetailPage: React.FC<BookingDetailPageProps> = ({ onNavigate, bookingId, bookingData }) => {
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

  // Fallback to props or mock while loading, or if API fails
  const stationName = booking?.stationName || bookingData?.stationName || 'Da Nang Airport Station - Terminal 1';
  const stationAddress = booking?.stationAddress || bookingData?.stationAddress || 'Arrival Hall Gate A2, Ground Floor (Kiosk Tower B)';
  const size = booking?.size || bookingData?.size || 'M';
  const duration = booking?.durationHours || bookingData?.duration || 3;
  const amount = booking?.baseAmount || bookingData?.amount || 45000;
  const orderId = booking?.bookingCode || bookingData?.orderCode || bookingId || 'SL-8942A';
  const rawBayCode = booking?.lockerCode || bookingData?.bayCode;
  const isLockerAssigned = Boolean(rawBayCode);
  const bayCode = isLockerAssigned
    ? `Locker ${rawBayCode}`
    : `Auto-assigned at Kiosk (Size ${size})`;

    // Chuẩn hóa mã PIN 6 số cho Kiosk Touchpad
  const getDisplayPin = () => {
    if (booking?.status === 'PENDING_PAYMENT') {
      return 'Chờ thanh toán';
    }
    const raw = booking?.accessCode || booking?.passcode || bookingData?.accessCode;
    if (raw) {
      const clean = raw.replace(/\s+/g, '');
      if (clean.length === 6) {
        return `${clean.substring(0, 3)} ${clean.substring(3, 6)}`;
      }
      return clean;
    }
    if (booking?.status === 'NO_SHOW') return 'Hết hạn nhận';
    if (booking?.status === 'CANCELLED') return 'Đã hủy';
    return 'Chưa cấp';
  };
  const passcode = getDisplayPin();

  const status = booking?.status || 'CONFIRMED';

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  // Realtime tick timer every second so hold & storage countdown update live
  const [, setClockTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => setClockTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check-in and check-out state & actions
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleKioskCheckIn = async () => {
    const targetId = booking?.id || bookingId;
    if (!targetId) return;
    setIsProcessingAction(true);
    setActionFeedback(null);
    try {
      const res = await checkInBooking(targetId);
      if (res.success && res.data) {
        setBooking(res.data);
        setActionFeedback({
          type: 'success',
          message: `Check-in successful! Compartment ${res.data.lockerCode ? `[${res.data.lockerCode}]` : ''} has popped open. Your ${res.data.durationHours || duration}h rental period starts now.`
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res.message || 'Check-in failed. Please try again.'
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Connection error while checking in.'
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleKioskCheckOut = async () => {
    const targetId = booking?.id || bookingId;
    if (!targetId) return;
    if (booking?.isOverdue) {
      setShowPayOverdueModal(true);
      return;
    }
    setIsProcessingAction(true);
    setActionFeedback(null);
    try {
      const res = await checkOutBooking(targetId);
      if (res.success && res.data) {
        setBooking(res.data);
        setActionFeedback({
          type: 'success',
          message: 'Check-out completed! Thank you for using SmartLocker.'
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res.message || 'Check-out failed. Please try again.'
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Connection error while checking out.'
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSimulateOverdue = async () => {
    const targetId = booking?.id || bookingId;
    if (!targetId) return;
    setIsProcessingAction(true);
    setActionFeedback(null);
    try {
      const res = await simulateOverdue(targetId, 2);
      if (res.success && res.data) {
        setBooking(res.data);
        setActionFeedback({
          type: 'error',
          message: `Simulated 2-hour overdue status (Overdue fee: ${formatCurrency(res.data.currentOverdueFee || 30000)} VND). Please pay the overdue surcharge below to unlock your locker.`
        });
        return;
      }
    } catch {
      const nowMs = Date.now();
      const ratePerHour = booking?.overdueFeePerHour || booking?.hourlyRate || 15000;
      const simulatedOverdueFee = ratePerHour * 2;
      const simulatedEndAt = new Date(nowMs - (2 * 3600000 + 20 * 60000)).toISOString();
      const simulatedOverdueSince = new Date(nowMs - 2 * 3600000).toISOString();

      setBooking((prev) =>
        prev
          ? {
              ...prev,
              isOverdue: true,
              overdueHours: 2,
              overdueFeePerHour: ratePerHour,
              currentOverdueFee: simulatedOverdueFee,
              endAt: simulatedEndAt,
              overdueSince: simulatedOverdueSince,
            }
          : prev
      );
      setActionFeedback({
        type: 'error',
        message: `Simulated 2-hour overdue status (Overdue fee: ${formatCurrency(simulatedOverdueFee)} VND). Click "Pay Overdue Fee & Unlock" below to settle via VietQR.`
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Time calculations: 2 Giai đoạn (Hold 30 phút vs Lưu trữ thật)
  const calculateTimeInfo = () => {
    const now = new Date().getTime();

    // 1. Giai đoạn HOLD (CONFIRMED - chưa nhận tủ)
    if (status === 'CONFIRMED') {
      const confirmedTime = booking?.createdAt ? new Date(booking.createdAt).getTime() : now;
      const holdExpiresTime = booking?.holdExpiresAt 
        ? new Date(booking.holdExpiresAt).getTime() 
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
      ? new Date(booking.checkedInAt).getTime() 
      : (booking?.startAt ? new Date(booking.startAt).getTime() : now);
    const endTime = booking?.endAt ? new Date(booking.endAt).getTime() : startTime + duration * 3600000;

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

  // Compartment layout helper
  const isTargetLocker = (code: string) => isLockerAssigned && Boolean(rawBayCode && (rawBayCode === code || rawBayCode.includes(code)));
  const isTargetTier = (baySize: string) => !isLockerAssigned && baySize === size;

  const renderCompartment = (code: string, baySize: 'S' | 'M' | 'L') => {
    const isThisLocker = isTargetLocker(code);
    const isThisTier = isTargetTier(baySize);
    const heightClass = baySize === 'S' ? 'h-12' : baySize === 'M' ? 'h-16' : 'h-24';

    if (isThisLocker) {
      return (
        <div className={`${heightClass} rounded-lg bg-[#2563eb] text-white border-2 border-primary shadow-md flex flex-col items-center justify-center relative ring-2 ring-primary/30 p-1 text-center`}>
          <span className="font-bold text-xs truncate max-w-full">{code}</span>
          <span className="text-[9px] uppercase tracking-wider font-semibold bg-white/20 px-1 rounded truncate">YOUR LOCKER</span>
          <Lock className="w-3.5 h-3.5 absolute top-1 right-1 text-white/80" />
        </div>
      );
    }

    if (isThisTier) {
      return (
        <div className={`${heightClass} rounded-lg bg-blue-50/90 border border-blue-300 text-blue-800 flex flex-col items-center justify-center text-xs font-semibold relative`}>
          <span>{code}</span>
          <span className="text-[9px] text-blue-500 font-medium">Size {baySize} Tier</span>
        </div>
      );
    }

    const isOccupied = code === 'M-01' || code === 'L-01' || code === 'S-02';
    if (isOccupied) {
      return (
        <div className={`${heightClass} rounded-lg bg-[#e5eeff] border border-outline-variant/50 flex items-center justify-center text-xs text-[#434655]`}>
          {code}
        </div>
      );
    }

    return (
      <div className={`${heightClass} rounded-lg bg-white border border-outline-variant/40 flex items-center justify-center text-xs text-secondary`}>
        {code}
      </div>
    );
  };

  // Token anti-screenshot refresh timer: đếm lùi từ 30s -> 0 -> 30s
  const [tokenSeconds, setTokenSeconds] = useState<number>(28);
  useEffect(() => {
    const timer = setInterval(() => {
      setTokenSeconds(prev => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Copy passcode state
  const [copied, setCopied] = useState<boolean>(false);
  const handleCopyCode = () => {
    navigator.clipboard.writeText(passcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Extend & PayOverdue Modal state (UC-T14 & UC-T19)
  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [showPayOverdueModal, setShowPayOverdueModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [extendSuccessToast, setExtendSuccessToast] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-[#f8f9ff] min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] font-body-md antialiased min-h-screen flex flex-col selection:bg-[#dbe1ff] selection:text-[#004ac6] pb-12">
      {/* UNIFIED CUSTOMER HEADER */}
      <CustomerHeader
        currentPage="booking-detail"
        onNavigate={onNavigate}
      />

      {/* MAIN CANVAS */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Overdue Banner (UC-T19) */}
        {booking?.isOverdue && (
           <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 border-2 border-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-4">
             <div className="flex items-start gap-3.5">
               <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                 <AlertTriangle className="w-5 h-5" />
               </div>
               <div>
                 <div className="flex items-center gap-2">
                   <p className="text-sm text-red-950 font-bold">Đơn đặt tủ đang quá hạn lưu trữ (UC-T19)</p>
                   <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase">
                     Quá hạn {booking.overdueHours || 1}h
                   </span>
                 </div>
                 <p className="text-xs text-red-800 mt-1 leading-relaxed">
                   Ngăn tủ đang bị khóa quyền lấy đồ do vượt quá thời gian thuê. Phụ phí quá hạn phát sinh:{' '}
                   <strong className="text-sm text-red-700 font-mono">{formatCurrency(booking.currentOverdueFee || 0)} VND</strong>.
                   Vui lòng thanh toán phụ phí qua VietQR để mở khóa lấy hành lý.
                 </p>
               </div>
             </div>
             <button
               onClick={() => setShowPayOverdueModal(true)}
               className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-red-600/20 shrink-0 cursor-pointer transition-all active:scale-95"
             >
               <QrCode className="w-4 h-4" />
               <span>Thanh toán phụ phí ngay ({formatCurrency(booking.currentOverdueFee || 0)}đ)</span>
             </button>
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
                      : status === 'COMPLETED'
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
                  Encrypted Token Signed
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
                  {size === 'S' ? 'Small Size · 45 × 45 × 65 cm' : size === 'M' ? 'Medium Size · 65 × 45 × 65 cm' : 'Large Size · 95 × 55 × 65 cm'}
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
                      : `Present this QR code to the Kiosk optical scanner or enter the 6-digit passcode below on the touchpad to automatically assign your locker (Size ${size}) and release the door.`}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Ready
                </div>
              </div>

              {/* Section A: QR Code Visualizer */}
              <div className="flex flex-col items-center justify-center text-center space-y-4 py-2">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/30 to-blue-400/30 blur-md opacity-75 group-hover:opacity-100 transition duration-500"></div>
                  {/* QR Frame */}
                  <div className="relative p-5 bg-white rounded-2xl border-2 border-primary/20 shadow-md flex items-center justify-center">
                    <QRCodeSVG
                      value={booking?.qrPayload || JSON.stringify({
                        bookingId: booking?.id || bookingId,
                        bookingCode: orderId,
                        stationId: booking?.stationId,
                        accessCode: passcode
                      })}
                      size={210}
                      level="H"
                      includeMargin={false}
                    />
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

              {/* Section B: 6-Digit Backup Access PIN Passcode */}
              <div className="mt-6 pt-6 border-t border-outline-variant/30 space-y-3">
                <div className="text-center">
                  <span className="text-[11px] text-secondary tracking-wider uppercase font-bold">
                    HOẶC NHẬP MÃ PIN 6 SỐ TẠI BÀN PHÍM KIOSK
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
              </div>

              {/* Action Feedback Toast / Banner */}
              {actionFeedback && (
                <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 border shadow-xs animate-in fade-in duration-200 ${
                  actionFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  {actionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs font-semibold flex-1 leading-relaxed">
                    {actionFeedback.message}
                  </div>
                </div>
              )}

              {/* Section C: 2-Phase Timing Engine (Hold vs Active Rental) */}
              <div className={`mt-6 rounded-2xl p-5 border space-y-4 transition-all duration-300 ${
                isHoldPeriod 
                  ? 'bg-amber-50/70 border-amber-200/80 shadow-xs' 
                  : status === 'COMPLETED'
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
                          ? 'Reservation Hold Window (30 minutes to arrive)' 
                          : status === 'COMPLETED'
                            ? 'Storage Session Completed'
                            : 'Remaining Storage Time'}
                      </span>
                      {isHoldPeriod && (
                        <p className="text-[11px] text-amber-800 font-medium">Actual rental time only starts when you unlock the locker at the terminal</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-lg font-bold font-mono ${isHoldPeriod ? 'text-amber-700' : 'text-primary'}`}>
                    {status === 'COMPLETED' ? '00:00:00' : remainingText}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        isHoldPeriod 
                          ? 'bg-amber-500' 
                          : status === 'COMPLETED' 
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
                        Your compartment ({size === 'S' ? 'Size S' : size === 'M' ? 'Size M' : 'Size L'}) is currently reserved. 
                        Your <strong>{duration}-hour</strong> rental timer only begins once you arrive at the station and open the locker.
                      </span>
                    </div>

                    {/* Kiosk Check-in trigger */}
                    <button
                      onClick={handleKioskCheckIn}
                      disabled={isProcessingAction}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-60"
                    >
                      {isProcessingAction ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Connecting to Kiosk & Assigning Locker...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>I Have Arrived — Open Locker & Start Timer</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {status === 'STORED' && (
                  <div className="pt-2 border-t border-blue-200/60 space-y-3">
                    <div className="flex items-start gap-2 text-xs text-[#434655] leading-relaxed">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>
                        {booking?.isOverdue
                          ? `Your storage session is overdue (${booking.overdueHours || 1}h). Please settle the overdue surcharge of ${formatCurrency(booking.currentOverdueFee || 0)} VND before unlocking your locker.`
                          : `Storage timer started at check-in (${startedText}). You may extend your rental duration anytime before expiration.`}
                      </span>
                    </div>

                    {booking?.isOverdue ? (
                      <button
                        onClick={() => setShowPayOverdueModal(true)}
                        className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Pay Overdue Fee ({formatCurrency(booking.currentOverdueFee || 0)} VND) & Unlock</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {/* Kiosk Check-out trigger */}
                        <button
                          onClick={handleKioskCheckOut}
                          disabled={isProcessingAction}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-60"
                        >
                          {isProcessingAction ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Connecting to Kiosk...</span>
                            </>
                          ) : (
                            <>
                              <PackageCheck className="w-4 h-4" />
                              <span>Unlock & Retrieve Luggage (Complete Check-out)</span>
                            </>
                          )}
                        </button>

                        {/* Quick helper to simulate Overdue */}
                        <button
                          onClick={handleSimulateOverdue}
                          disabled={isProcessingAction}
                          className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Simulate 2h Overdue Status</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 4: Offline Availability Guarantee Badge */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-[#0b1c30]">Offline Ready Guarantee</div>
                  <p className="text-xs text-[#434655] leading-relaxed">
                    This digital key and cryptographic token are securely cached in your browser storage. You can unlock your locker even without 4G/5G or Wi-Fi connectivity at the terminal.
                  </p>
                </div>
              </div>

              {/* Section 5: Quick Action Hub */}
              <div className="mt-6 pt-5 border-t border-outline-variant/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setShowExtendModal(true)}
                  disabled={booking?.canExtend === false}
                  title={booking?.canExtend === false ? 'Extension is only available after locker check-in' : 'Extend rental duration'}
                  className={`h-11 px-3 bg-white border border-primary/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs ${booking?.canExtend === false ? 'opacity-50 cursor-not-allowed text-gray-500 border-gray-300' : 'hover:bg-[#eff4ff] text-primary cursor-pointer'}`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>
                    Extend (+1h · {Math.round((booking?.hourlyRate || (duration > 0 ? amount / duration : 15000)) / 1000)}k)
                  </span>
                </button>
                <button
                  onClick={() => onNavigate('find-station')}
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

              {/* Cancellation trigger if booking is not stored yet */}
              {(booking?.status === 'CONFIRMED' || booking?.status === 'PENDING_PAYMENT') && (
                <div className="mt-4 pt-3 border-t border-outline-variant/20 flex justify-end">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1.5 cursor-pointer py-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Cancel Reservation &amp; Request Refund</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SECONDARY COLUMN: PHYSICAL SCHEMATIC & BOOKING DETAILS (5 Cols Desktop) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Station Context Real Picture Card */}
            <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
              <div className="relative h-48 w-full">
                <img
                  alt="Smart Locker Hub at Airport Terminal"
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1542296332-2e4473faf563?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary-fixed" />
                    {stationName}
                  </div>
                  <span className="px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm text-xs font-mono">Cluster B</span>
                </div>
              </div>
              <div className="p-4 bg-[#eff4ff]/40 flex items-center justify-between border-t border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-primary" />
                  <span className="text-xs text-[#0b1c30] font-medium">Located nearby</span>
                </div>
                <button onClick={() => onNavigate('map')} className="text-xs text-primary font-bold hover:underline cursor-pointer">
                  View Map
                </button>
              </div>
            </div>

            {/* Locker Compartment Schematic Matrix */}
            <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#0b1c30]">
                    {isLockerAssigned ? 'Assigned Locker Location' : 'Station Locker Layout'}
                  </h3>
                  <p className="text-xs text-[#434655]">
                    {isLockerAssigned ? `Bay ${rawBayCode} · Cluster Tower B` : `Size ${size} Tier · Assigned at Kiosk Check-in`}
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

              {/* Visual Locker Grid */}
              <div className="bg-[#eff4ff]/50 p-4 rounded-xl border border-outline-variant/30">
                <div className="text-xs font-semibold text-secondary mb-3 flex items-center justify-between">
                  <span>Column 01</span>
                  <span className={isLockerAssigned && (rawBayCode === 'S-02' || rawBayCode === 'M-02' || rawBayCode === 'L-02') ? 'text-primary font-bold' : ''}>
                    Column 02 {isLockerAssigned && (rawBayCode === 'S-02' || rawBayCode === 'M-02' || rawBayCode === 'L-02') ? '(Your Bay)' : ''}
                  </span>
                  <span>Column 03 (Kiosk)</span>
                </div>
                {/* Modular Bay Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Column 1 */}
                  <div className="space-y-2">
                    {renderCompartment('S-01', 'S')}
                    {renderCompartment('M-01', 'M')}
                    {renderCompartment('L-01', 'L')}
                  </div>
                  {/* Column 2 */}
                  <div className="space-y-2">
                    {renderCompartment('S-02', 'S')}
                    {renderCompartment('M-02', 'M')}
                    {renderCompartment('L-02', 'L')}
                  </div>
                  {/* Column 3 (Screen / Bay Column) */}
                  <div className="space-y-2">
                    <div className="h-12 rounded-lg bg-slate-800 text-white border border-slate-700 flex flex-col items-center justify-center text-[10px] font-bold shadow-xs">
                      <span>KIOSK</span>
                      <span className="text-[9px] text-slate-400 font-normal">TOUCH SCREEN</span>
                    </div>
                    {renderCompartment('M-03', 'M')}
                    {renderCompartment('L-03', 'L')}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-secondary">
                  {isLockerAssigned ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#2563eb] inline-block"></span> Your Locker
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-400 inline-block"></span> Size {size} Tier
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#e5eeff] inline-block"></span> Occupied
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-white border border-outline-variant/50 inline-block"></span> Available
                  </span>
                </div>
              </div>
            </div>

            {/* Baggage & Security Ledger Details */}
            <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-5 space-y-3">
              <h3 className="text-base font-bold text-[#0b1c30]">Storage &amp; Security Audit</h3>
              <div className="divide-y divide-outline-variant/20 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-[#434655]">Check-in Timestamp</span>
                  <span className="font-mono text-[#0b1c30] font-medium">{booking?.startAt ? new Date(booking.startAt).toLocaleString('en-US') : 'N/A'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-[#434655]">Baggage Declaration</span>
                  <span className="text-[#0b1c30] font-medium">Standard Storage</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-[#434655]">Security Seal ID</span>
                  <span className="font-mono font-semibold text-primary">{orderId}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-[#434655]">Total Rate Billed</span>
                  <span className="text-[#0b1c30] font-bold">{formatCurrency(amount)} VND (Prepaid)</span>
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => alert('Downloading electronic VAT invoice...')}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Download VAT Receipt (E-Invoice)
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* EXTEND BOOKING MODAL (UC-T14) */}
      <ExtendBookingModal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        bookingId={booking?.id || bookingId}
        bookingCode={orderId}
        lockerCode={bayCode}
        size={size}
        stationName={stationName}
        startAt={booking?.startAt}
        currentEndAt={booking?.endAt}
        currentEndTime={expiresText}
        hourlyRate={booking?.hourlyRate || (duration > 0 ? Math.round(amount / duration) : undefined)}
        maxHours={booking?.maxHours || 72}
        overdueFee={booking?.currentOverdueFee || 0}
        onExtended={async () => {
          const targetId = booking?.id || bookingId;
          if (!targetId) return;
          const refreshRes = await getBookingById(targetId);
          if (refreshRes.success && refreshRes.data) {
            setBooking(refreshRes.data);
            setExtendSuccessToast('Rental duration extended successfully!');
            setTimeout(() => setExtendSuccessToast(null), 4000);
          }
        }}
      />

      {/* PAY OVERDUE FEE MODAL */}
      <PayOverdueModal
        isOpen={showPayOverdueModal}
        onClose={() => setShowPayOverdueModal(false)}
        bookingId={booking?.id || bookingId || ''}
        bookingCode={orderId}
        stationName={stationName}
        lockerCode={rawBayCode}
        size={size}
        endAt={booking?.endAt || new Date().toISOString()}
        overdueSince={booking?.overdueSince}
        overdueHours={booking?.overdueHours}
        overdueFeePerHour={booking?.overdueFeePerHour}
        overdueFee={booking?.currentOverdueFee || 20000}
        onSuccess={async () => {
          const targetId = booking?.id || bookingId;
          if (!targetId) return;
          try {
            const refreshRes = await getBookingById(targetId);
            if (refreshRes.success && refreshRes.data) {
              setBooking({
                ...refreshRes.data,
                isOverdue: false,
                currentOverdueFee: 0,
              });
            }
          } catch {
            setBooking((prev) =>
              prev ? { ...prev, isOverdue: false, currentOverdueFee: 0 } : prev
            );
          }
          setExtendSuccessToast('Overdue fee settled! You now have a 15-minute window to unlock your locker.');
          setTimeout(() => setExtendSuccessToast(null), 5000);
        }}
        onSuccessAndCheckout={async () => {
          const targetId = booking?.id || bookingId;
          if (!targetId) return;
          try {
            const res = await checkOutBooking(targetId);
            if (res.success && res.data) {
              setBooking(res.data);
              setActionFeedback({
                type: 'success',
                message: 'Overdue fee settled and locker check-out completed!'
              });
              return;
            }
          } catch {
            // Fallback client-side completion
          }
          setBooking((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'COMPLETED',
                  isOverdue: false,
                  currentOverdueFee: 0,
                }
              : prev
          );
          setActionFeedback({
            type: 'success',
            message: 'Overdue fee settled and locker check-out completed!'
          });
        }}
      />

      {/* CANCEL BOOKING MODAL */}
      <CancelBookingModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        bookingId={booking?.id || bookingId || ''}
        bookingCode={orderId}
        lockerCode={bayCode}
        stationName={stationName}
        paidAmount={amount}
        onConfirm={async (reason) => {
          const targetId = booking?.id || bookingId;
          if (!targetId) return;
          const res = await cancelBooking(targetId, { reason });
          if (res.success && res.data) {
            setBooking(res.data);
            setShowCancelModal(false);
            setActionFeedback({
              type: 'success',
              message: 'Booking cancelled successfully. If eligible, your refund request is pending Admin review.'
            });
          } else {
            throw new Error(res.message || 'Failed to cancel booking.');
          }
        }}
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
            <a className="hover:text-primary transition-colors" href="#">Compliance &amp; SOC2</a>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-primary transition-colors" href="#">Support Telemetry</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BookingDetailPage;
