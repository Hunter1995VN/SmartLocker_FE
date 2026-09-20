import React, { useState } from 'react';
import {
  ShieldCheck,
  HelpCircle,
  Bell,
  ChevronRight,
  Plus,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Phone,
  QrCode,
  PlusCircle,
  Navigation,
  XCircle,
  Search,
  SlidersHorizontal,
  LockOpen,
  Ban,
  CheckCircle
} from 'lucide-react';
import { ExtendBookingModal } from '../components/booking/ExtendBookingModal';
import { CancelBookingModal } from '../components/booking/CancelBookingModal';

interface MyBookingsPageProps {
  onNavigate: (page: string, props?: any) => void;
}

interface HistoryBooking {
  id: string;
  code: string;
  date: string;
  stationName: string;
  lockerDetail: string;
  amount: number;
  status: 'COMPLETED' | 'CANCELLED';
  refundNote?: string;
}

const INITIAL_HISTORY: HistoryBooking[] = [
  {
    id: '1',
    code: '#SL-88219',
    date: '22 Oct 2025, 09:30 – 12:30',
    stationName: 'Da Nang International Airport (Terminal 1)',
    lockerDetail: 'Locker: Small (S-02) · Duration: 3 Hours',
    amount: 20000,
    status: 'COMPLETED'
  },
  {
    id: '2',
    code: '#SL-87940',
    date: '18 Oct 2025',
    stationName: 'Han Market Station – Tran Phu St',
    lockerDetail: 'Locker: Medium (M-01)',
    amount: 35000,
    status: 'CANCELLED',
    refundNote: 'Refunded 100% (35,000 VND) to MB Bank'
  },
  {
    id: '3',
    code: '#SL-86512',
    date: '12 Oct 2025, 13:00 – 19:00',
    stationName: 'Hoi An Ancient Town Hub',
    lockerDetail: 'Locker: Large (L-01) · Duration: 6 Hours',
    amount: 50000,
    status: 'COMPLETED'
  },
  {
    id: '4',
    code: '#SL-84201',
    date: '05 Oct 2025, 08:00 – 14:00',
    stationName: 'Da Nang Railway Station (Ga Da Nang)',
    lockerDetail: 'Locker: Medium (M-03) · Duration: 6 Hours',
    amount: 36000,
    status: 'COMPLETED'
  }
];

const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ onNavigate }) => {
  // Lấy thông tin user đăng nhập nếu có
  const savedUser = JSON.parse(localStorage.getItem('smartlocker_user') || '{}');
  const userInitials = savedUser.fullName
    ? savedUser.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'NV';
  const userName = savedUser.fullName || 'Nguyen Van A';

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showOverdueModal, setShowOverdueModal] = useState<boolean>(false);
  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [overduePaid, setOverduePaid] = useState<boolean>(false);
  const [bookingCancelled, setBookingCancelled] = useState<boolean>(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  // Filter history
  const filteredHistory = INITIAL_HISTORY.filter(item =>
    item.stationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] font-body-md antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-white pb-12">
      {/* TOP APP BAR */}
      <header className="bg-white border-b border-outline-variant/30 shadow-sm sticky top-0 z-40">
        <div className="w-full px-4 md:px-8 flex justify-between items-center h-16 max-w-7xl mx-auto">
          {/* Brand & Navigation Cluster */}
          <div className="flex items-center gap-8">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-2.5 font-bold text-slate-900 tracking-tight cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-primary-container text-white flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">SmartLocker</span>
            </button>
            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
              <button
                onClick={() => onNavigate('map')}
                className="px-3.5 py-1.5 rounded-lg text-secondary hover:bg-[#eff4ff] transition-colors cursor-pointer"
              >
                Find Lockers
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className="px-3.5 py-1.5 rounded-lg text-primary-container font-bold bg-[#eff4ff] flex items-center gap-1.5 cursor-pointer"
              >
                <span>My Bookings</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
              </button>
              <a
                href="tel:19001234"
                className="px-3.5 py-1.5 rounded-lg text-secondary hover:bg-[#eff4ff] transition-colors"
              >
                Support
              </a>
            </nav>
          </div>

          {/* Right Utility Actions */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Live System Status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#eff4ff] rounded-full border border-outline-variant/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="text-xs text-secondary font-medium">System Status: Online</span>
            </div>
            {/* Currency & Language */}
            <div className="hidden lg:flex items-center gap-1 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-[#eff4ff] transition-colors cursor-pointer">
              <span>VND ₫ | EN</span>
            </div>
            {/* Help icon */}
            <button className="p-2 text-secondary hover:bg-[#eff4ff] rounded-full transition-colors" title="Help">
              <HelpCircle className="w-5 h-5" />
            </button>
            {/* Notification Bell */}
            <button className="relative p-2 text-secondary hover:bg-[#eff4ff] rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>
            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-outline-variant/30">
              <div className="w-8 h-8 rounded-full bg-[#dbe1ff] text-primary text-xs flex items-center justify-center font-bold">
                {userInitials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs text-[#0b1c30] leading-tight font-semibold">{userName}</p>
                <p className="text-[11px] text-secondary leading-tight">Verified Traveler</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CANVAS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Breadcrumb & Header Section */}
        <div className="space-y-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <button onClick={() => onNavigate('home')} className="hover:text-primary transition-colors cursor-pointer">Home</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#0b1c30] font-semibold">My Bookings</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">My Lockers &amp; Bookings</h1>
              <p className="text-sm text-secondary mt-1">Manage your active storage sessions and view past booking receipts</p>
            </div>
            {/* Action Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('map')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-container text-white text-sm font-bold rounded-xl shadow-sm hover:bg-primary transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Book a New Locker</span>
              </button>
            </div>
          </div>
        </div>

        {/* NOTICES & ALERTS SECTION */}
        <div className="space-y-3">
          {/* Amber Grace Period Notice */}
          <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-3.5 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-amber-900 font-bold">Locker Bay M-04 Session Active</p>
              <p className="text-xs text-amber-800 mt-0.5">Complimentary 15-minute grace period ends at <strong>17:15 today</strong>. Retrieval after this cutoff will incur hourly standard rates.</p>
            </div>
            <button onClick={() => alert('Chính sách lưu trữ: Miễn phí 15 phút ân hạn sau giờ kết thúc. Sau 15 phút, tính phí 15,000 VND mỗi 30 phút.')} className="text-xs text-amber-900 underline hover:text-amber-950 self-center hidden sm:block cursor-pointer">
              View Policies
            </button>
          </div>

          {/* Overdue Fee Notice (UC-T09) */}
          {!overduePaid && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in-up">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-900 font-bold">
                    Booking #BK24080102 is Overdue by 25 mins
                  </p>
                  <p className="text-xs text-secondary">
                    Locker Bay L-01 (Hoi An Ancient Town). Additional accrued charge: <span className="font-semibold text-slate-900">15,000 VND</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOverdueModal(true)}
                className="self-end sm:self-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors duration-150 shrink-0 shadow-xs cursor-pointer active:scale-95"
              >
                Pay Overdue Fee Now
              </button>
            </div>
          )}
        </div>

        {/* NAVIGATION TABS */}
        <div className="border-b border-outline-variant/30 flex gap-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'active'
                ? 'text-primary-container border-b-2 border-primary-container'
                : 'text-secondary hover:text-slate-900'
            }`}
          >
            <span>Active Bookings</span>
            <span className="px-2 py-0.5 rounded-full bg-[#dbe1ff] text-primary text-xs font-bold">
              {bookingCancelled ? '0' : '1'}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'history'
                ? 'text-primary-container border-b-2 border-primary-container'
                : 'text-secondary hover:text-slate-900'
            }`}
          >
            <span>Past History</span>
            <span className="px-2 py-0.5 rounded-full bg-[#e5eeff] text-secondary text-xs">
              {bookingCancelled ? INITIAL_HISTORY.length + 1 : INITIAL_HISTORY.length}
            </span>
          </button>
        </div>

        {/* TAB 1: CURRENTLY ACTIVE LOCKERS */}
        {activeTab === 'active' && !bookingCancelled && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Currently Active Lockers</h2>
                <span className="text-xs text-slate-500 uppercase tracking-wider">· Real-time Telemetry</span>
              </div>
              <span className="text-xs text-secondary font-medium">Refreshed 10s ago</span>
            </div>

            {/* Hero Active Locker Card */}
            <div className="bg-white border-2 border-primary-container/70 rounded-2xl p-5 md:p-6 shadow-sm relative overflow-hidden bg-gradient-to-b from-blue-50/30 to-white">
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary-container"></div>
              {/* Card Header Meta */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-outline-variant/30 gap-3">
                <div className="flex items-center flex-wrap gap-3">
                  {/* Status Badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs uppercase font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    STORED - IN USE
                  </span>
                  <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                  {/* Compartment Details */}
                  <h3 className="text-lg text-slate-900 font-bold">
                    Compartment M-04
                  </h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md font-semibold">
                    Medium Size · 45 x 60 x 60 cm
                  </span>
                </div>
                {/* Booking ID */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-secondary font-medium">Booking ID:</span>
                  <span className="font-mono text-sm tracking-wider font-bold text-slate-900 bg-[#eff4ff] px-2.5 py-1 rounded-lg border border-outline-variant/40">
                    #SL-8942A
                  </span>
                </div>
              </div>

              {/* Card Grid Body: 3 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-6 border-b border-outline-variant/30">
                {/* Column 1: Station Info (5 cols) */}
                <div className="md:col-span-5 space-y-3">
                  <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Pickup &amp; Access Station</p>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary-container flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm text-slate-900 font-bold">Da Nang Airport Station (Terminal 1)</h4>
                      <p className="text-xs text-secondary">Gate 3, Arrival Hall Gate A2, Ground Floor (Kiosk Tower B)</p>
                      <div className="pt-1.5 flex items-center gap-3 text-xs text-primary-container font-semibold">
                        <a className="hover:underline flex items-center gap-1" href="tel:19001234">
                          <Phone className="w-3.5 h-3.5" />
                          Hotline: 1900 1234
                        </a>
                        <span>·</span>
                        <span className="text-slate-500 font-normal">24/7 Security Guarded</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Storage Timeline & Remaining Countdown (4 cols) */}
                <div className="md:col-span-4 space-y-3 md:border-l md:border-r border-outline-variant/30 md:px-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Session Timeline</p>
                    <span className="text-xs text-primary-container font-bold bg-blue-50 px-2 py-0.5 rounded">
                      Remaining: 01h 45m
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-900 font-semibold">Today, 14:00 – 17:00</p>
                    <p className="text-xs text-secondary">3 Hours Total Scheduled</p>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary-container h-full rounded-full transition-all duration-500" style={{ width: '42%' }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Start: 14:00</span>
                      <span className="text-amber-700 font-semibold">Grace ends: 17:15</span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Payment & Mini Key Preview (3 cols) */}
                <div className="md:col-span-3 space-y-3 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-secondary font-bold">Payment &amp; Digital Pass</p>
                    <p className="text-lg text-slate-900 font-bold mt-1">35,000 VND</p>
                    <p className="text-xs text-emerald-700 flex items-center gap-1 mt-0.5 font-medium">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Prepaid via VietQR
                    </p>
                  </div>
                  {/* Mini QR Preview snippet */}
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-[#eff4ff] border border-outline-variant/30">
                    <div className="w-10 h-10 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                      <QrCode className="w-6 h-6 text-slate-900" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs text-slate-900 font-bold truncate">Quick Scan at Kiosk</p>
                      <p className="text-[11px] text-secondary truncate font-mono">PIN: •••• 4291</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Action Row */}
              <div className="pt-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Primary CTA: View Digital Key */}
                  <button
                    onClick={() => onNavigate('booking-detail', { bookingId: 'SL-8942A' })}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-container text-white text-sm font-bold rounded-xl shadow-sm hover:bg-primary transition-colors cursor-pointer active:scale-95"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>View Digital Key (QR Code)</span>
                  </button>
                  {/* Outline Action: Extend Time */}
                  <button
                    onClick={() => setShowExtendModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4 text-slate-500" />
                    <span>Extend Time (+1h)</span>
                  </button>
                  {/* Directions Link */}
                  <button
                    onClick={() => onNavigate('map')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-95"
                  >
                    <Navigation className="w-4 h-4 text-slate-500" />
                    <span>Get Terminal Directions</span>
                  </button>
                </div>
                {/* Danger Action: Cancel Booking */}
                <div>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancel Booking</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Empty state when active cancelled */}
        {activeTab === 'active' && bookingCancelled && (
          <div className="text-center py-12 bg-white rounded-2xl border border-outline-variant/30 p-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Không có đơn đặt tủ nào đang hoạt động</h3>
            <p className="text-xs text-secondary max-w-sm mx-auto">Bạn có thể tìm trạm và đặt tủ mới bất cứ lúc nào.</p>
            <button
              onClick={() => onNavigate('map')}
              className="mt-2 px-5 py-2.5 bg-primary-container text-white text-xs font-bold rounded-xl shadow-xs hover:bg-primary cursor-pointer"
            >
              Tìm trạm đặt tủ ngay
            </button>
          </div>
        )}

        {/* TAB 2: PAST HISTORY */}
        {activeTab === 'history' && (
          <section className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Booking History</h2>
                <p className="text-xs text-secondary">Verified locker drop-offs, completed stays, and electronic invoices</p>
              </div>
              {/* Search & Filter Controls */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary-container focus:border-primary-container bg-white w-56"
                    placeholder="Search by station or ID..."
                    type="text"
                  />
                </div>
                <button className="h-9 px-3 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700 flex items-center gap-1 hover:bg-slate-50 cursor-pointer">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filter
                </button>
              </div>
            </div>

            {/* Past Bookings List */}
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-outline-variant/30 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {item.status === 'COMPLETED' ? <LockOpen className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {item.status}
                          </span>
                          <span className="font-mono text-xs text-slate-900 font-bold">{item.code}</span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-secondary">{item.date}</span>
                        </div>
                        <h4 className="text-sm text-slate-900 font-bold">{item.stationName}</h4>
                        <p className="text-xs text-secondary">
                          {item.lockerDetail}
                          {item.refundNote && (
                            <> · <span className="text-emerald-700 font-medium">{item.refundNote}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-left lg:text-right">
                        <p className="text-[11px] text-secondary uppercase font-semibold">Amount</p>
                        <p className={`text-sm font-bold ${item.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {formatCurrency(item.amount)} VND
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status === 'COMPLETED' && (
                          <>
                            <button
                              onClick={() => showToast(`Đang tải hóa đơn VAT cho đơn ${item.code}...`)}
                              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                            >
                              View Receipt / VAT
                            </button>
                            <button
                              onClick={() => onNavigate('map')}
                              className="px-3.5 py-2 bg-[#eff4ff] text-primary-container hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              Book Again
                            </button>
                          </>
                        )}
                        {item.status === 'CANCELLED' && (
                          <button
                            onClick={() => alert(`Chi tiết hủy đơn ${item.code}: Đã hoàn trả 100% (35,000 VND) về tài khoản MB Bank của bạn.`)}
                            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                          >
                            Cancellation Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* OVERDUE PAYMENT MODAL (UC-T09) */}
      {showOverdueModal && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-outline-variant/30 shadow-2xl p-6 space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-[#0b1c30]">Thanh toán phí phạt quá hạn</h3>
              </div>
              <button onClick={() => setShowOverdueModal(false)} className="text-secondary hover:text-[#0b1c30]">✕</button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1 text-xs">
              <p className="font-bold text-rose-900">Đơn hàng #BK24080102 quá hạn 25 phút</p>
              <p className="text-rose-700">Trạm Hội An Ancient Town · Ô tủ Bay L-01</p>
              <p className="text-rose-600">Theo quy định: Phí phạt 15,000 VND cho mỗi 30 phút quá hạn.</p>
            </div>

            <div className="bg-[#eff4ff] p-4 rounded-xl flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Tổng phí cần nộp:</span>
              <span className="font-mono text-xl font-extrabold text-rose-600">15,000 VND</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowOverdueModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-secondary hover:bg-slate-50 cursor-pointer"
              >
                Để sau
              </button>
              <button
                onClick={() => {
                  setShowOverdueModal(false);
                  setOverduePaid(true);
                  showToast('Thanh toán phí phạt 15,000 VND thành công! Ô tủ đã được mở khóa.');
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Xác nhận thanh toán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND BOOKING MODAL (UC-T07) */}
      <ExtendBookingModal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        onSuccess={(addedHours, amount) => {
          setShowExtendModal(false);
          showToast(`Đã gia hạn thành công thêm +${addedHours} giờ (${formatCurrency(amount)} VND)! Ô tủ tiếp tục sẵn sàng.`);
        }}
        lockerCode="Locker M-04"
        stationName="Sân bay Quốc tế Đà Nẵng (Nhà ga T1)"
        currentEndTime="17:00 Hôm nay"
      />

      {/* CANCEL BOOKING MODAL (UC-T08) */}
      <CancelBookingModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={(_reason, refundAmount) => {
          setShowCancelModal(false);
          setBookingCancelled(true);
          showToast(`Đã hủy đơn thành công. ${formatCurrency(refundAmount)} VND sẽ được hoàn về MB Bank trong 24h.`);
        }}
        bookingCode="#SL-8942A"
        lockerCode="Locker M-04 (Medium Size)"
        stationName="Sân bay Quốc tế Đà Nẵng (Nhà ga T1)"
        paidAmount={35000}
      />


      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#0b1c30] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-[#334155] z-50 flex items-center gap-2 animate-fade-in-up">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-outline-variant/30 mt-12">
        <div className="w-full py-6 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left max-w-7xl mx-auto">
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="text-base text-primary font-bold">SmartLocker</span>
            </div>
            <p className="text-xs text-[#434655]">
              © 2025 SmartLocker Systems Inc. Telemetry &amp; Cryptographic Access Active. All rights reserved.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-xs text-[#434655]">
            <a className="hover:text-primary transition-colors" href="#">Security Architecture</a>
            <a className="hover:text-primary transition-colors" href="#">Compliance &amp; SOC2</a>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-primary transition-colors" href="#">Support Telemetry</a>
            <span className="text-primary font-bold hidden md:inline">Hotline: 1900 1234</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MyBookingsPage;
