import React, { useState, useEffect } from 'react';
import {
  Check,
  ChevronRight,
  Phone,
  ShieldCheck,
  DoorOpen,
  MapPin,
  Luggage,
  Clock,
  Verified,
  Info,
  User,
  Edit,
  Badge,
  MessageSquare,
  Mail,
  Copy,
  CheckCircle,
  QrCode,
  Lock,
  Headphones,
  ArrowRight,
  X
} from 'lucide-react';

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
  };
}

const BookingPaymentPage: React.FC<BookingPaymentPageProps> = ({ onNavigate, bookingData }) => {
  // Lấy thông tin user đăng nhập nếu có
  const savedUser = JSON.parse(localStorage.getItem('smartlocker_user') || '{}');

  const stationName = bookingData?.stationName || 'Da Nang Airport Station (Terminal 1)';
  const stationAddress = bookingData?.stationAddress || 'Gate 3, Arrival Hall Gate A2, Da Nang Airport (DAD)';
  const size = bookingData?.size || 'M';
  const duration = bookingData?.duration || 3;
  const amount = bookingData?.amount || 35000;
  const storageDate = bookingData?.storageDate || 'Hôm nay';
  const dropOffTime = bookingData?.dropOffTime || '14:00';

  const travelerName = savedUser.fullName || 'Nguyen Van A';
  const travelerPhone = savedUser.phone || '0901 234 567';
  const travelerEmail = savedUser.email || 'nguyenvana@gmail.com';

  const orderCode = 'BK' + Math.floor(10000000 + Math.random() * 90000000).toString().substring(0, 8);

  // Countdown timer: 10 phút (600 giây)
  const [secondsLeft, setSecondsLeft] = useState<number>(9 * 60 + 45);
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}: ${text}`);
  };

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [agreedTerms, setAgreedTerms] = useState<boolean>(true);

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] font-body-md text-body-md antialiased min-h-screen flex flex-col justify-between selection:bg-primary-container selection:text-white pb-12">
      {/* TOP APP BAR */}
      <header className="w-full bg-white sticky top-0 z-50 border-b border-outline-variant/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo & Breadcrumbs */}
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-2.5 transition-transform active:scale-[0.98]">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 flex items-center justify-center p-1.5 border border-[#2563EB]/20">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-headline-md text-headline-md text-primary tracking-tight font-extrabold flex items-center gap-1.5">
                  SmartLocker
                  <span className="bg-primary-container/10 text-primary-container text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-normal">Pay</span>
                </span>
              </div>
            </button>
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-outline-variant/40 text-[#64748B] text-sm">
              <span onClick={() => onNavigate('home')} className="hover:text-primary transition-colors cursor-pointer">Home</span>
              <ChevronRight className="w-3.5 h-3.5 text-outline" />
              <span onClick={() => onNavigate('map')} className="hover:text-primary transition-colors cursor-pointer">Stations</span>
              <ChevronRight className="w-3.5 h-3.5 text-outline" />
              <span onClick={() => onNavigate('station-booking')} className="hover:text-primary transition-colors cursor-pointer">{stationName.split('(')[0].trim()}</span>
              <ChevronRight className="w-3.5 h-3.5 text-outline" />
              <span className="text-[#0F172A] font-semibold">Checkout &amp; Payment</span>
            </div>
          </div>
          {/* Right: Hotline, Currency, Trust Badge */}
          <div className="flex items-center gap-3 sm:gap-5">
            <a className="hidden sm:flex items-center gap-1.5 text-[#434655] hover:text-primary transition-colors text-sm" href="tel:19001234">
              <Headphones className="w-4 h-4 text-[#2563EB]" />
              <span>Hotline <strong className="text-[#0F172A]">1900 1234</strong></span>
            </a>
            <div className="hidden md:flex items-center gap-1 bg-[#F1F5F9] px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-sm text-[#434655]">
              <span className="font-semibold text-[#0F172A]">VND ₫</span>
              <span className="text-outline-variant">|</span>
              <span>EN</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#ECFDF5] text-[#047857] px-3 py-1.5 rounded-full border border-[#A7F3D0] text-sm font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CANVAS */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 w-full">
        {/* PROGRESS STEPPER */}
        <nav aria-label="Progress Steps" className="mb-6 md:mb-8 bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
            {/* Step 1 */}
            <button onClick={() => onNavigate('station-booking')} className="flex items-center gap-2 sm:gap-3 text-left">
              <div className="w-8 h-8 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">Step 1</span>
                <span className="text-sm font-semibold text-[#0F172A] truncate">Station &amp; Size</span>
              </div>
            </button>
            {/* Step 2 (Active) */}
            <div className="flex items-center gap-2 sm:gap-3 border-x border-[#E2E8F0] px-2 sm:px-4">
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-[#2563EB]/30">
                2
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-[#2563EB] tracking-wider">Step 2 (Active)</span>
                <span className="text-sm font-bold text-[#2563EB] truncate">Review &amp; Payment</span>
              </div>
            </div>
            {/* Step 3 (Upcoming) */}
            <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start opacity-70">
              <div className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div className="hidden sm:flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">Step 3</span>
                <span className="text-sm font-medium text-[#64748B] truncate">Access PIN</span>
              </div>
            </div>
          </div>
        </nav>

        {/* TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT COLUMN: Order Details & Information (5 cols) */}
          <section className="lg:col-span-5 space-y-6">
            {/* Card 1: Booking Summary Card */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#F1F5F9] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <DoorOpen className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-[#0F172A]">Booking Summary</h2>
                </div>
                <span className="bg-[#EFF6FF] text-[#1D4ED8] text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-[#BFDBFE]">
                  Airport Terminal
                </span>
              </div>
              {/* Station Info */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
                  <MapPin className="text-[#2563EB] w-5 h-5 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#0F172A]">{stationName}</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">{stationAddress}</p>
                  </div>
                </div>
                {/* Compartment Details */}
                <div className="border border-[#E2E8F0] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center border border-[#DBEAFE] shrink-0">
                      <Luggage className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0F172A]">
                          {size === 'S' ? 'Small (S)' : size === 'M' ? 'Medium (M)' : 'Large (L)'}
                        </span>
                        <span className="bg-[#ECFDF5] text-[#047857] text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-[#A7F3D0]">
                          {size === 'S' ? 'Backpack' : size === 'M' ? 'Cabin Size' : 'Checked Bag'}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {size === 'S' ? 'Dimensions: 35 x 45 x 50 cm' : size === 'M' ? 'Dimensions: 45 x 60 x 60 cm' : 'Dimensions: 60 x 85 x 80 cm'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-[#64748B] block">Assignment</span>
                    <span className="text-xs text-primary font-bold">On Check-in</span>
                  </div>
                </div>
                {/* Schedule */}
                <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">Duration</span>
                    <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                      {duration} Hours
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">Time Window</span>
                    <span className="text-xs font-bold text-[#0F172A] mt-1 block">
                      {storageDate}, {dropOffTime} - +{duration}h
                    </span>
                  </div>
                </div>
                {/* Price Breakdown */}
                <div className="pt-2 border-t border-[#F1F5F9] space-y-2.5">
                  <div className="flex justify-between items-center text-xs text-[#434655]">
                    <span>Base Locker Storage Fee ({duration}h)</span>
                    <span className="font-mono text-sm text-[#0F172A]">{formatCurrency(amount)} VND</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#434655]">
                    <span className="flex items-center gap-1.5">
                      Luggage Protection Insurance
                      <Verified className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                    <span className="text-emerald-700 font-medium">Included (0 VND)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#434655]">
                    <span>Electronic Access &amp; SMS Notification</span>
                    <span className="text-emerald-700 font-medium">Free</span>
                  </div>
                  {/* Total */}
                  <div className="pt-3 border-t border-[#E2E8F0] flex justify-between items-baseline">
                    <div>
                      <span className="text-base font-bold text-[#0F172A]">Total Amount</span>
                      <span className="block text-[11px] text-[#64748B]">VAT inclusive (10%)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-2xl font-bold text-[#2563EB] tracking-tight">{formatCurrency(amount)}</span>
                      <span className="text-sm font-bold text-[#0F172A] ml-1">VND</span>
                    </div>
                  </div>
                </div>
                {/* Smart Notice Pill */}
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 flex items-start gap-2.5">
                  <Info className="text-[#2563EB] w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-xs text-[#1E40AF] leading-relaxed">
                    Your physical locker compartment number (e.g. <strong>M-04</strong>) will be automatically assigned upon check-in at the station kiosk or via web access link.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Traveler Contact Information */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
                <div className="flex items-center gap-2">
                  <User className="text-[#2563EB] w-5 h-5" />
                  <h3 className="text-base font-bold text-[#0F172A]">Traveler Contact Details</h3>
                </div>
                <button className="text-[#2563EB] hover:text-primary text-xs font-semibold flex items-center gap-1 hover:underline" type="button">
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#F8FAFC]">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#64748B]">
                    <Badge className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-[#64748B] uppercase font-bold block">Primary Traveler</span>
                    <span className="text-sm font-bold text-[#0F172A]">{travelerName}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9]">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-semibold uppercase">
                      <MessageSquare className="w-3 h-3 text-emerald-600" />
                      Phone (SMS Access)
                    </div>
                    <span className="font-mono text-sm font-bold text-[#0F172A] mt-1 block">{travelerPhone}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9]">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] font-semibold uppercase">
                      <Mail className="w-3 h-3 text-[#2563EB]" />
                      E-Receipt &amp; QR Backup
                    </div>
                    <span className="text-xs font-semibold text-[#0F172A] mt-1 block truncate">{travelerEmail}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms Acceptance Card */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-sm space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] focus:ring-offset-0 cursor-pointer"
                  type="checkbox"
                />
                <span className="text-sm text-[#0F172A]">
                  I agree to the <a className="text-[#2563EB] font-semibold hover:underline" href="#">SmartLocker Terms of Service</a> &amp; <a className="text-[#2563EB] font-semibold hover:underline" href="#">Locker Usage Policy</a>.
                </span>
              </label>
              <p className="text-[12px] text-[#64748B] leading-relaxed pl-8">
                • <strong>Free cancellation:</strong> Up to 2 hours before 14:00.<br/>
                • <strong>Security policy:</strong> Hazardous materials, flammables, and perishable goods are strictly prohibited.
              </p>
            </div>
          </section>

          {/* RIGHT COLUMN: VietQR Instant Payment (7 cols) */}
          <section className="lg:col-span-7 space-y-6">
            {/* Countdown Timer Alert */}
            <div className="bg-[#FFFBEB] border-2 border-[#FDE68A] rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative w-10 h-10 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#EF4444] rounded-full ring-2 ring-white animate-ping"></span>
                </div>
                <div>
                  <p className="text-sm text-[#92400E] font-bold">
                    Locker Slot Reserved: Complete payment in{' '}
                    <span className="font-mono text-[#B45309] font-bold text-base bg-white/80 px-2 py-0.5 rounded border border-[#FCD34D]">
                      {formatTimer(secondsLeft)}
                    </span>
                  </p>
                  <p className="text-xs text-[#B45309]/90 mt-0.5">
                    Physical compartment releases automatically back to public inventory if unpaid.
                  </p>
                </div>
              </div>
            </div>

            {/* Main Payment Card */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-md">
              {/* Payment Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-[#F1F5F9]">
                <div>
                  <div className="flex items-center gap-2">
                    <QrCode className="text-[#2563EB] w-6 h-6" />
                    <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Instant Bank Transfer via VietQR</h2>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Scan with any Vietnam Banking App or E-Wallet (Napas 247 Instant Settlement)
                  </p>
                </div>
                {/* VietQR & Napas Badges */}
                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                  <span className="bg-[#003B7A] text-white font-bold text-[10px] px-2 py-1 rounded tracking-wider shadow-sm">VIETQR</span>
                  <span className="bg-[#D9251D] text-white font-bold text-[10px] px-2 py-1 rounded tracking-wider shadow-sm">NAPAS 247</span>
                </div>
              </div>

              {/* Supported Banks Pills */}
              <div className="py-3 px-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] my-6 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#64748B]">
                <span className="text-[#0F172A] font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-[#2563EB]" />
                  Instant Recognition:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['Vietcombank', 'MB Bank', 'Techcombank', 'ACB', 'MoMo', 'ZaloPay'].map(b => (
                    <span key={b} className="bg-white px-2 py-0.5 rounded border border-[#E2E8F0] text-[#0F172A]">
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* VietQR Code Presentation */}
              <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#F8FAFC] to-white rounded-2xl border-2 border-dashed border-[#CBD5E1] relative">
                <div className="relative p-4 bg-white rounded-2xl shadow-md border border-[#E2E8F0]">
                  <div className="w-64 h-64 sm:w-72 sm:h-72 relative flex items-center justify-center bg-white rounded-xl overflow-hidden border border-[#E2E8F0]/60 p-2">
                    {/* SVG VietQR Authentic Display */}
                    <svg className="w-full h-full" fill="none" viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
                      <rect fill="white" height="280" width="280"></rect>
                      <rect fill="#003B7A" height="64" rx="8" width="64" x="16" y="16"></rect>
                      <rect fill="white" height="48" rx="4" width="48" x="24" y="24"></rect>
                      <rect fill="#2563EB" height="28" rx="3" width="28" x="34" y="34"></rect>
                      <rect fill="#003B7A" height="64" rx="8" width="64" x="200" y="16"></rect>
                      <rect fill="white" height="48" rx="4" width="48" x="208" y="24"></rect>
                      <rect fill="#2563EB" height="28" rx="3" width="28" x="218" y="34"></rect>
                      <rect fill="#003B7A" height="64" rx="8" width="64" x="16" y="200"></rect>
                      <rect fill="white" height="48" rx="4" width="48" x="24" y="208"></rect>
                      <rect fill="#2563EB" height="28" rx="3" width="28" x="34" y="218"></rect>
                      <g fill="#0F172A">
                        <rect height="12" rx="2" width="12" x="92" y="44"></rect>
                        <rect height="12" rx="2" width="12" x="116" y="44"></rect>
                        <rect height="12" rx="2" width="12" x="144" y="44"></rect>
                        <rect height="12" rx="2" width="12" x="168" y="44"></rect>
                        <rect height="12" rx="2" width="20" x="92" y="68"></rect>
                        <rect height="12" rx="2" width="12" x="132" y="68"></rect>
                        <rect height="12" rx="2" width="20" x="156" y="68"></rect>
                        <rect height="20" rx="2" width="12" x="44" y="92"></rect>
                        <rect height="12" rx="2" width="12" x="68" y="92"></rect>
                        <rect height="12" rx="2" width="12" x="92" y="92"></rect>
                        <rect height="12" rx="2" width="12" x="176" y="92"></rect>
                        <rect height="12" rx="2" width="20" x="204" y="92"></rect>
                        <rect height="12" rx="2" width="12" x="236" y="92"></rect>
                        <rect height="12" rx="2" width="20" x="44" y="124"></rect>
                        <rect height="12" rx="2" width="12" x="76" y="124"></rect>
                        <rect height="12" rx="2" width="12" x="192" y="124"></rect>
                        <rect height="12" rx="2" width="20" x="220" y="124"></rect>
                        <rect height="12" rx="2" width="12" x="44" y="148"></rect>
                        <rect height="12" rx="2" width="20" x="68" y="148"></rect>
                        <rect height="12" rx="2" width="24" x="180" y="148"></rect>
                        <rect height="20" rx="2" width="12" x="216" y="148"></rect>
                        <rect height="12" rx="2" width="12" x="240" y="148"></rect>
                        <rect height="12" rx="2" width="12" x="44" y="172"></rect>
                        <rect height="12" rx="2" width="12" x="68" y="172"></rect>
                        <rect height="12" rx="2" width="12" x="92" y="172"></rect>
                        <rect height="12" rx="2" width="12" x="116" y="172"></rect>
                        <rect height="12" rx="2" width="20" x="160" y="172"></rect>
                        <rect height="12" rx="2" width="12" x="240" y="172"></rect>
                        <rect height="12" rx="2" width="12" x="92" y="196"></rect>
                        <rect height="12" rx="2" width="20" x="116" y="196"></rect>
                        <rect height="12" rx="2" width="12" x="148" y="196"></rect>
                        <rect height="20" rx="2" width="12" x="172" y="196"></rect>
                        <rect height="12" rx="2" width="24" x="196" y="196"></rect>
                        <rect height="12" rx="2" width="12" x="232" y="196"></rect>
                        <rect height="12" rx="2" width="20" x="92" y="220"></rect>
                        <rect height="12" rx="2" width="12" x="124" y="220"></rect>
                        <rect height="12" rx="2" width="12" x="148" y="220"></rect>
                        <rect height="12" rx="2" width="12" x="196" y="220"></rect>
                        <rect height="12" rx="2" width="24" x="220" y="220"></rect>
                        <rect height="12" rx="2" width="12" x="92" y="244"></rect>
                        <rect height="12" rx="2" width="12" x="116" y="244"></rect>
                        <rect height="12" rx="2" width="24" x="140" y="244"></rect>
                        <rect height="12" rx="2" width="12" x="176" y="244"></rect>
                        <rect height="12" rx="2" width="12" x="200" y="244"></rect>
                        <rect height="12" rx="2" width="20" x="224" y="244"></rect>
                      </g>
                      <rect fill="white" height="68" rx="14" stroke="#2563EB" strokeWidth="2.5" width="68" x="106" y="106"></rect>
                      <rect fill="#003B7A" height="56" rx="10" width="56" x="112" y="112"></rect>
                      <text fill="white" fontFamily="Plus Jakarta Sans" fontSize="11" fontWeight="800" letterSpacing="1" textAnchor="middle" x="140" y="136">VIET</text>
                      <text fill="#FEF08A" fontFamily="Plus Jakarta Sans" fontSize="13" fontWeight="900" letterSpacing="1" textAnchor="middle" x="140" y="152">QR</text>
                    </svg>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#047857] px-3.5 py-1.5 rounded-full border border-[#A7F3D0] shadow-sm mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold">Exact Amount: {formatCurrency(amount)} VND</span>
                  </div>
                  <p className="text-xs text-[#434655] font-medium">
                    Open banking app → Tap <strong className="text-[#0F172A]">Scan QR</strong> → Confirm transfer
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="relative my-8 text-center">
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E2E8F0]"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    Or pay via manual bank transfer
                  </span>
                </div>
              </div>

              {/* Manual Bank Transfer Details Table */}
              <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
                {/* Bank Name */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-[#64748B] font-medium">Receiving Bank:</span>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#003B7A] text-white font-bold text-[10px] flex items-center justify-center">MB</span>
                    <span className="text-xs font-bold text-[#0F172A]">MB Bank (Military Joint Stock Bank)</span>
                  </div>
                </div>
                {/* Account Number */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#64748B] font-medium">Account Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-[#0F172A] tracking-wider">9876543210</span>
                    <button
                      onClick={() => handleCopy('9876543210', 'Số tài khoản')}
                      className="bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#2563EB] text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
                {/* Account Name */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#64748B] font-medium">Account Name:</span>
                  <span className="font-mono text-sm font-bold text-[#0F172A] tracking-wide text-right">CONG TY CP SMARTLOCKER</span>
                </div>
                {/* Transfer Amount */}
                <div className="p-3.5 flex items-center justify-between gap-3 bg-[#EFF6FF]/40">
                  <span className="text-xs text-[#1D4ED8] font-semibold">Amount to Transfer:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-[#2563EB]">{formatCurrency(amount)} VND</span>
                    <button
                      onClick={() => handleCopy(amount.toString(), 'Số tiền')}
                      className="bg-white hover:bg-[#F1F5F9] border border-[#93C5FD] text-[#2563EB] text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
                {/* Transfer Memo */}
                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FFFBEB]/50">
                  <div>
                    <span className="text-xs text-[#92400E] font-bold block">Transfer Description / Memo:</span>
                    <span className="text-[11px] text-[#B45309]">Crucial for automated 2-second locker release</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-extrabold text-[#B45309] tracking-widest bg-[#FEF3C7] px-2.5 py-1 rounded border border-[#FDE68A]">
                      {orderCode}
                    </span>
                    <button
                      onClick={() => handleCopy(orderCode, 'Nội dung chuyển khoản')}
                      className="bg-white hover:bg-[#FEF3C7] border border-[#FCD34D] text-[#B45309] text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Webhook Status Box */}
              <div className="mt-6 p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                    <div className="w-8 h-8 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin"></div>
                    <div className="w-2 h-2 rounded-full bg-[#2563EB] absolute"></div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#0F172A]">
                        Listening for bank webhook confirmation...
                      </p>
                      <span className="inline-block w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
                    </div>
                    <p className="text-xs text-[#434655] mt-0.5">
                      System auto-detects transfer in 2–5 seconds. Please do not close or refresh this tab.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSuccessModal(true)}
                  className="shrink-0 w-full sm:w-auto px-4 py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#2563EB] text-[#2563EB] text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                  type="button"
                >
                  I have transferred
                </button>
              </div>

              {/* Security Footer Badge */}
              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#64748B]">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                <span>256-bit Encrypted Settlement • Official VietQR Partner • Napas 24/7 Verified</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* SUCCESS MODAL POPUP */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#E2E8F0] shadow-2xl p-6 text-center transform transition-all animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-[#ECFDF5] text-[#047857] border-2 border-[#A7F3D0] mx-auto flex items-center justify-center mb-4">
              <CheckCircle className="w-9 h-9 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-[#0F172A]">Payment Confirmed!</h3>
            <p className="text-sm text-[#434655] mt-1">
              We have received {formatCurrency(amount)} VND for booking <strong className="text-[#0F172A]">{orderCode}</strong>.
            </p>
            <div className="my-5 p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[#64748B]">Assigned Locker Bay:</span>
                <span className="font-mono text-base font-bold text-[#2563EB]">BAY M-04</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#64748B]">Access One-Time PIN:</span>
                <span className="font-mono text-xl font-extrabold text-[#0F172A] tracking-widest">729 416</span>
              </div>
            </div>
            <p className="text-xs text-[#64748B] mb-5">
              A copy of your access barcode and PIN has been sent via SMS to <strong>{travelerPhone}</strong>.
            </p>
            <div className="flex gap-3">
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
                      accessCode: 'LK-' + orderCode.substring(2, 7) + 'A',
                      bayCode: size === 'S' ? 'Bay S-02' : size === 'M' ? 'Bay M-04' : 'Bay L-02',
                    }
                  });
                }}
                className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Open Digital Locker Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#0F172A] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-[#334155] z-50 flex items-center gap-2 animate-fade-in-up">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full bg-surface-container-low border-t border-outline-variant/30 mt-12">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div className="space-y-1.5">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-lg text-primary tracking-tight font-extrabold">SmartLocker</span>
                <span className="text-xs text-[#64748B] font-medium">VietQR Instant Luggage Storage</span>
              </div>
              <p className="text-xs text-[#64748B]">
                © 2025 SmartLocker Systems Inc. Telemetry &amp; Cryptographic Access Active. All rights reserved.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-[#434655]">
              <a className="hover:text-primary transition-colors" href="#">Security Architecture</a>
              <span className="text-outline-variant/60">•</span>
              <a className="hover:text-primary transition-colors" href="#">Compliance &amp; SOC2</a>
              <span className="text-outline-variant/60">•</span>
              <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
              <span className="text-outline-variant/60">•</span>
              <a className="hover:text-primary transition-colors" href="#">Support Telemetry</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BookingPaymentPage;
