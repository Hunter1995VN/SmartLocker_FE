import React, { useState, useEffect } from 'react';
import {
  Lock,
  Clock,
  MapPin,
  HelpCircle,
  ShieldCheck,
  Bell,
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
  Compass,
  FileText,
  PlusCircle,
  QrCode,
  AlertTriangle
} from 'lucide-react';
import { ExtendBookingModal } from '../components/booking/ExtendBookingModal';
import { getBookingById, type BookingDto } from '../api/bookingService';
import { QRCodeSVG } from 'qrcode.react';

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
  // Lấy thông tin user đăng nhập nếu có
  const savedUser = JSON.parse(localStorage.getItem('smartlocker_user') || '{}');
  const userInitials = savedUser.fullName
    ? savedUser.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'NV';
  const userName = savedUser.fullName || 'Nguyen Van A';

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
  const isLockerAssigned = Boolean(booking?.lockerCode || bookingData?.bayCode);
  const bayCode = isLockerAssigned
    ? `Ngăn ${booking?.lockerCode || bookingData?.bayCode}`
    : `Cấp tại Kiosk (Size ${size})`;
  const passcode = booking?.accessCode || booking?.passcode || bookingData?.accessCode || 'Chờ cấp tại trạm';
  const status = booking?.status || 'CONFIRMED';

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  // Time calculations
  const calculateTimeInfo = () => {
    if (!booking) return { remainingText: '02h 15m remaining', progress: 35, startedText: '14:00 Today', expiresText: '17:00 Today' };
    const now = new Date().getTime();
    const start = new Date(booking.startAt).getTime();
    const end = new Date(booking.endAt).getTime();
    
    const startedText = new Date(booking.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(booking.startAt).toLocaleDateString('vi-VN');
    const expiresText = new Date(booking.endAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(booking.endAt).toLocaleDateString('vi-VN');
    
    if (now >= end) {
      return { remainingText: '0m remaining', progress: 100, startedText, expiresText };
    }
    if (now <= start) {
      return { remainingText: `${duration}h 0m remaining`, progress: 0, startedText, expiresText };
    }

    const total = end - start;
    const elapsed = now - start;
    const remaining = end - now;
    
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));

    return { 
      remainingText: `${hours}h ${minutes}m remaining`, 
      progress, 
      startedText, 
      expiresText 
    };
  };

  const { remainingText, progress, startedText, expiresText } = calculateTimeInfo();

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

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] font-body-md antialiased min-h-screen flex flex-col selection:bg-[#dbe1ff] selection:text-[#004ac6] pb-12">
      {/* TOP APP BAR */}
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-outline-variant/30">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center h-16">
          {/* Brand & Primary Destination Links */}
          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-2.5 transition-all duration-150 active:scale-[0.98]">
              <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 flex items-center justify-center p-1.5 border border-[#2563EB]/20">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg text-primary tracking-tight font-bold">SmartLocker</span>
            </button>
            {/* Desktop Navigation Cluster */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onNavigate('my-bookings')}
                className="px-3.5 py-1.5 rounded-lg text-primary font-bold text-sm bg-[#eff4ff] transition-colors duration-150 flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-primary" />
                <span>My Bookings</span>
              </button>
              <button
                onClick={() => onNavigate('map')}
                className="px-3.5 py-1.5 rounded-lg text-[#434655] font-medium text-sm hover:bg-[#eff4ff] transition-colors duration-150 flex items-center gap-1.5 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Find Lockers</span>
              </button>
              <a
                href="tel:19001234"
                className="px-3.5 py-1.5 rounded-lg text-[#434655] font-medium text-sm hover:bg-[#eff4ff] transition-colors duration-150 flex items-center gap-1.5"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Support</span>
              </a>
            </nav>
          </div>

          {/* Trailing Status & User Profile */}
          <div className="flex items-center gap-3">
            {/* Telemetry Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#eff4ff] rounded-full border border-outline-variant/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="text-xs text-[#434655] font-semibold">System Status: Online</span>
            </div>
            {/* Help icon action */}
            <button className="w-9 h-9 flex items-center justify-center rounded-lg text-secondary hover:bg-[#eff4ff] transition-colors" title="Help">
              <HelpCircle className="w-5 h-5" />
            </button>
            {/* Shield Security */}
            <button className="w-9 h-9 flex items-center justify-center rounded-lg text-secondary hover:bg-[#eff4ff] transition-colors" title="Cryptographic Access Active">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </button>
            {/* Notification Bell */}
            <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-secondary hover:bg-[#eff4ff] transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-white"></span>
            </button>
            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/30">
              <div className="w-8 h-8 rounded-full bg-[#dce9ff] flex items-center justify-center text-primary font-bold text-xs border border-outline-variant/40">
                {userInitials}
              </div>
              <span className="hidden lg:inline-block text-sm text-[#0b1c30] font-medium">{userName}</span>
            </div>
          </div>
        </div>
      </header>

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
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] text-emerald-800 text-xs uppercase tracking-wider font-bold border border-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <span>{status.replace('_', ' ')}</span>
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
                  {size === 'S' ? 'Small Size · 35 × 45 × 50 cm' : size === 'M' ? 'Medium Size · 45 × 60 × 60 cm' : 'Large Size · 60 × 85 × 80 cm'}
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
                      ? `Đưa mã QR này vào trước camera quét tại trạm Kiosk hoặc nhập mã mở tủ để mở ô ${bayCode}.`
                      : `Đưa mã QR này vào trước camera quét của trạm Kiosk hoặc nhập mã mở tủ 8 ký tự bên dưới để trạm tự động cấp ô tủ và mở cửa gửi đồ.`}
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

              {/* Section B: 8-Character Backup Access Passcode */}
              <div className="mt-6 pt-6 border-t border-outline-variant/30 space-y-3">
                <div className="text-center">
                  <span className="text-[11px] text-secondary tracking-wider uppercase font-bold">
                    OR ENTER 8-CHARACTER CODE ON TOUCHPAD
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

              {/* Section C: Rental Time Remaining & Countdown */}
              <div className="mt-8 bg-[#eff4ff]/70 rounded-xl p-5 border border-outline-variant/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-primary" />
                    <span className="text-sm font-bold text-[#0b1c30]">Remaining Duration</span>
                  </div>
                  <span className="text-lg font-bold text-primary">{remainingText}</span>
                </div>
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="w-full bg-[#d3e4fe] rounded-full h-2.5 overflow-hidden">
                    <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-secondary">
                    <span>Started: {startedText}</span>
                    <span>Expires: {expiresText}</span>
                  </div>
                </div>
                {/* Grace Note Callout */}
                <div className="flex items-start gap-2 pt-2 text-xs text-[#434655] border-t border-outline-variant/20">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <span><strong>Grace period applies</strong>. Overdue fee of 15,000 VND per 30 minutes applies automatically after the grace period expires.</span>
                </div>
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
                  className={`h-11 px-3 bg-white border border-primary/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs ${booking?.canExtend === false ? 'opacity-50 cursor-not-allowed text-gray-500 border-gray-300' : 'hover:bg-[#eff4ff] text-primary cursor-pointer'}`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Extend (+1h · 15k)</span>
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
                  <h3 className="text-base font-bold text-[#0b1c30]">Locker Bank Matrix</h3>
                  <p className="text-xs text-[#434655]">Cluster Tower B · Layout Schematic</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-[#e5eeff] rounded-md font-mono text-secondary font-bold">
                  Slot {bayCode.replace('Bay ', '')}
                </span>
              </div>

              {/* Visual Locker Grid Mock */}
              <div className="bg-[#eff4ff]/50 p-4 rounded-xl border border-outline-variant/30">
                <div className="text-xs font-semibold text-secondary mb-3 flex items-center justify-between">
                  <span>Column 01</span>
                  <span className="text-primary font-bold">Column 02 (Your Bay)</span>
                  <span>Column 03</span>
                </div>
                {/* Modular Bay Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Column 1 */}
                  <div className="space-y-2">
                    <div className="h-12 rounded-lg bg-white border border-outline-variant/40 flex items-center justify-center text-xs text-secondary">
                      S-01
                    </div>
                    <div className="h-16 rounded-lg bg-[#e5eeff] border border-outline-variant/50 flex items-center justify-center text-xs text-[#434655]">
                      M-01
                    </div>
                    <div className="h-24 rounded-lg bg-[#e5eeff] border border-outline-variant/50 flex items-center justify-center text-xs text-[#434655]">
                      L-01
                    </div>
                  </div>
                  {/* Column 2 (Contains User's Bay) */}
                  <div className="space-y-2">
                    <div className="h-12 rounded-lg bg-white border border-outline-variant/40 flex items-center justify-center text-xs text-secondary">
                      S-02
                    </div>
                    {/* Highlighted Active Bay */}
                    <div className="h-16 rounded-lg bg-[#2563eb] text-white border-2 border-primary shadow-md flex flex-col items-center justify-center relative ring-2 ring-primary/30">
                      <span className="font-bold text-xs">{bayCode.replace('Bay ', '')}</span>
                      <span className="text-[9px] uppercase tracking-wider font-semibold bg-white/20 px-1 rounded">YOUR LOCKER</span>
                      <Lock className="w-3.5 h-3.5 absolute top-1 right-1 text-white/80" />
                    </div>
                    <div className="h-24 rounded-lg bg-[#e5eeff] border border-outline-variant/50 flex items-center justify-center text-xs text-[#434655]">
                      L-02
                    </div>
                  </div>
                  {/* Column 3 (Screen / Bay Column) */}
                  <div className="space-y-2">
                    <div className="h-12 rounded-lg bg-slate-800 text-white border border-slate-700 flex items-center justify-center text-[10px] font-bold">
                      TOUCH SCREEN
                    </div>
                    <div className="h-16 rounded-lg bg-[#e5eeff] border border-outline-variant/50 flex items-center justify-center text-xs text-[#434655]">
                      M-03
                    </div>
                    <div className="h-24 rounded-lg bg-[#e5eeff] border border-outline-variant/50 flex items-center justify-center text-xs text-[#434655]">
                      XL-01
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-secondary">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#2563eb] inline-block"></span> Your Locker</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#e5eeff] inline-block"></span> Occupied</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-white border border-outline-variant/50 inline-block"></span> Available</span>
                </div>
              </div>
            </div>

            {/* Baggage & Security Ledger Details */}
            <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-5 space-y-3">
              <h3 className="text-base font-bold text-[#0b1c30]">Storage &amp; Security Audit</h3>
              <div className="divide-y divide-outline-variant/20 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-[#434655]">Check-in Timestamp</span>
                  <span className="font-mono text-[#0b1c30] font-medium">{booking?.startAt ? new Date(booking.startAt).toLocaleString('vi-VN') : 'N/A'}</span>
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
                  onClick={() => alert('Đang tải hóa đơn điện tử VAT...')}
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

      {/* EXTEND BOOKING MODAL (UC-T07) */}
      <ExtendBookingModal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        onSuccess={(addedHours, fee) => {
          setShowExtendModal(false);
          setExtendSuccessToast(`Gia hạn thành công thêm +${addedHours} giờ (${new Intl.NumberFormat('vi-VN').format(fee)} VND)! Mã mở khóa đã cập nhật.`);
          setTimeout(() => {
            setExtendSuccessToast(null);
          }, 4000);
          // Optional: we can reload the booking details here if needed, but typically window will redirect to payment
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
