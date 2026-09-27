import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  QrCode,
  Plug,
  Snowflake,
  Info,
  ArrowRight,
  ShieldCheck,
  Headphones,
  Ruler,
  Backpack,
  Package,
  ChevronDown,
  ChevronRight,
  Navigation,
  Star,
  CheckCircle,
  Timer,
  Lock,
  BadgeCheck,
  Sparkles
} from 'lucide-react';
import { MOCK_STATIONS, getStationById, type StationDetail } from '../api/stationService';
import { createBooking } from '../api/bookingService';

interface StationBookingPageProps {
  onNavigate: (page: string, props?: any) => void;
  stationId?: string;
  initialBookingData?: {
    size?: 'S' | 'M' | 'L';
    duration?: number;
    bookingMode?: 'NOW' | 'SCHEDULE';
    dropOffDate?: string;
    dropOffTime?: string;
  };
}

const StationBookingPage: React.FC<StationBookingPageProps> = ({ onNavigate, stationId, initialBookingData }) => {
  const [stationDetail, setStationDetail] = useState<StationDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Track initial mount so subsequent changes don't flash/unmount the full page
  const isInitialMount = useRef(true);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Storage Mode: NOW (store immediately) vs SCHEDULE (schedule in advance)
  const [bookingMode, setBookingMode] = useState<'NOW' | 'SCHEDULE'>(
    initialBookingData?.bookingMode || 'NOW'
  );

  // Date, Time, Duration
  const todayStr = new Date().toISOString().split('T')[0];
  const maxDateObj = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  const [dropOffDate, setDropOffDate] = useState<string>(
    initialBookingData?.dropOffDate || todayStr
  );
  const [dropOffTime, setDropOffTime] = useState<string>(
    initialBookingData?.dropOffTime || '15:00'
  );
  const initialDuration = initialBookingData?.duration ?? 3;
  const [selectedDuration, setSelectedDuration] = useState<number>(initialDuration);
  const [customDurationInput, setCustomDurationInput] = useState<string>(initialDuration.toString());
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(
    ![1, 3, 6, 12, 24].includes(initialDuration)
  );

  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L' | null>(
    initialBookingData?.size ?? 'M'
  );

  // Compute start and end Dates based on selected mode
  const getBookingDates = () => {
    if (bookingMode === 'NOW') {
      const start = new Date();
      const end = new Date(start.getTime() + selectedDuration * 3600 * 1000);
      return { start, end };
    }
    const [hStr, mStr] = (dropOffTime || '15:00').split(':');
    const hours = parseInt(hStr || '15', 10);
    const minutes = parseInt(mStr || '0', 10);
    const [y, m, d] = (dropOffDate || todayStr).split('-').map(Number);
    const start = new Date(y, m - 1, d, hours, minutes, 0, 0);
    const end = new Date(start.getTime() + selectedDuration * 3600 * 1000);
    return { start, end };
  };

  const { start: startDateObj, end: endDateObj } = getBookingDates();

  const currentStation = stationDetail || MOCK_STATIONS.find(s => s.id === stationId) || {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'SmartLocker San Bay Tan Son Nhat',
    address: 'Domestic Terminal T1, Cong Hoa, Tan Binh, HCMC',
    latitude: 10.8172,
    longitude: 106.6600,
    status: 'ACTIVE' as const,
    opensAt: '00:00',
    closesAt: '23:59',
    totalS: 10, totalM: 8, totalL: 4,
    availableS: 10, availableM: 8, availableL: 4,
    contactPhone: '028 3848 5383',
  };

  // Generate available time slots based on station operating hours
  const generateAvailableTimeSlots = () => {
    const slots: string[] = [];
    const opens = currentStation.opensAt || '06:00';
    const closes = currentStation.closesAt || '23:00';
    const [startH] = opens.split(':').map(Number);
    let [endH] = closes.split(':').map(Number);
    if (endH === 0 || endH < startH) endH = 23;

    for (let h = startH; h <= endH; h++) {
      const hStr = String(h).padStart(2, '0');
      slots.push(`${hStr}:00`);
      if (h < endH) {
        slots.push(`${hStr}:30`);
      }
    }
    return slots.length > 0 ? slots : ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
  };

  const availableTimeSlots = generateAvailableTimeSlots();

  useEffect(() => {
    const fetchStation = async () => {
      if (!stationId) {
        setIsLoading(false);
        return;
      }
      // Only show full-screen spinner on very first mount
      if (isInitialMount.current) {
        setIsLoading(true);
      }
      setApiError(null);
      try {
        const { start, end } = getBookingDates();
        const data = await getStationById(stationId, start.toISOString(), end.toISOString());
        setStationDetail(data);

        // Auto-select available size if current selected size is full
        if (data) {
          const availS = data.availableS ?? data.totalS ?? 0;
          const availM = data.availableM ?? data.totalM ?? 0;
          const availL = data.availableL ?? data.totalL ?? 0;

          if (selectedSize === 'S' && availS <= 0) {
            if (availM > 0) setSelectedSize('M');
            else if (availL > 0) setSelectedSize('L');
            else setSelectedSize(null);
          } else if (selectedSize === 'M' && availM <= 0) {
            if (availS > 0) setSelectedSize('S');
            else if (availL > 0) setSelectedSize('L');
            else setSelectedSize(null);
          } else if (selectedSize === 'L' && availL <= 0) {
            if (availM > 0) setSelectedSize('M');
            else if (availS > 0) setSelectedSize('S');
            else setSelectedSize(null);
          }
        }
      } catch (error) {
        setApiError('Failed to load station information. Please try again later.');
      } finally {
        if (isInitialMount.current) {
          setIsLoading(false);
          isInitialMount.current = false;
        }
      }
    };
    fetchStation();
  }, [stationId, bookingMode, dropOffDate, dropOffTime, selectedDuration]);

  // Handle custom duration submission cleanly without triggering live reload while typing
  const handleApplyCustomDuration = () => {
    let num = parseInt(customDurationInput, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 72) num = 72;
    setCustomDurationInput(num.toString());
    setSelectedDuration(num);
  };

  // Formatted date string in English
  const now = new Date();
  const isToday = dropOffDate === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dateFormatted = new Date(`${dropOffDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const displayStorageDate = isToday ? `Today, ${dateFormatted}` : dateFormatted;

  const formatTimeStr = (d: Date) => {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const isDifferentDay = startDateObj.toDateString() !== endDateObj.toDateString();
  const pickUpDisplay = `${formatTimeStr(endDateObj)} ${isDifferentDay ? '(Next Day)' : '(Today)'}`;

  const basePrices = {
    S: stationDetail?.priceS ?? 15000,
    M: stationDetail?.priceM ?? 25000,
    L: stationDetail?.priceL ?? 40000
  };

  const getPrice = (size: 'S' | 'M' | 'L' | null, duration: number) => {
    if (!size) return 0;
    return basePrices[size] * duration;
  };

  const currentPrice = getPrice(selectedSize, selectedDuration);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('en-US')} VND`;
  };

  // Real availability counts
  const totalS = currentStation.totalS || 10;
  const availS = currentStation.availableS ?? currentStation.totalS ?? 10;
  const isSAvailable = availS > 0;

  const totalM = currentStation.totalM || 8;
  const availM = currentStation.availableM ?? currentStation.totalM ?? 8;
  const isMAvailable = availM > 0;

  const totalL = currentStation.totalL || 4;
  const availL = currentStation.availableL ?? currentStation.totalL ?? 4;
  const isLAvailable = availL > 0;

  // Generate locker slot arrays based on real station total counts
  const sLockers = Array.from({ length: totalS }, (_, i) => ({
    code: `S${String(i + 1).padStart(2, '0')}`,
    isAvail: i < availS,
  }));

  const mLockers = Array.from({ length: totalM }, (_, i) => ({
    code: `M${String(i + 1).padStart(2, '0')}`,
    isAvail: i < availM,
  }));

  const lLockers = Array.from({ length: totalL }, (_, i) => ({
    code: `L${String(i + 1).padStart(2, '0')}`,
    isAvail: i < availL,
  }));

  if (isLoading) {
    return (
      <div className="bg-[#F8FAFC] min-h-screen pb-20 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">Loading station details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 pb-12">
      {/* 1. HEADER APP BAR - ĐỒNG BỘ 100% VỚI BOOKING PAYMENT PAGE */}
      <header className="w-full bg-white sticky top-0 z-40 border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-lg font-extrabold text-blue-600 tracking-tight flex items-center gap-1.5">
                  SmartLocker
                  <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-normal">
                    Booking
                  </span>
                </span>
              </div>
            </button>
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200 text-slate-500 text-sm">
              <span onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors cursor-pointer">
                Home
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span onClick={() => onNavigate('map')} className="hover:text-blue-600 transition-colors cursor-pointer">
                Stations
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-900 font-semibold truncate max-w-[260px]">
                {currentStation.name}
              </span>
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
              <span>100% Secure via PayOS</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT CONTAINER */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 w-full">
        {/* STEP PROGRESS BAR - ĐỒNG BỘ 100% VỚI BOOKING PAYMENT PAGE */}
        <nav aria-label="Booking steps" className="mb-6 md:mb-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
            {/* Step 1 (Current / In Progress) */}
            <div className="flex items-center gap-2 sm:gap-3 text-left">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-blue-500/30">
                1
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Step 1 (In Progress)</span>
                <span className="text-sm font-semibold text-slate-900 truncate">
                  Select Size &amp; Duration
                </span>
              </div>
            </div>

            {/* Step 2 (Upcoming) */}
            <div className="flex items-center gap-2 sm:gap-3 border-x border-slate-200 px-2 sm:px-4 text-left">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Step 2</span>
                <span className="text-sm font-semibold text-slate-400 truncate">
                  PayOS VietQR Payment
                </span>
              </div>
            </div>

            {/* Step 3 (Upcoming) */}
            <div className="flex items-center gap-2 sm:gap-3 text-left pl-1 sm:pl-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Step 3</span>
                <span className="text-sm font-semibold text-slate-400 truncate">
                  Unlock Digital Access Key
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Station Hero Banner Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Left: Station Photo */}
            <div className="md:col-span-4 relative h-48 md:h-full min-h-[180px]">
              <img 
                src="https://images.unsplash.com/photo-1542296332-2e4473faf563?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Station Location" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg flex items-center text-xs font-medium">
                <Video className="w-4 h-4 mr-1.5 text-emerald-400" />
                24-Camera Guarded Vault
              </div>
            </div>
            
            {/* Right: Station Details */}
            <div className="md:col-span-8 p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md border border-blue-200">
                      HUB #{currentStation.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-md flex items-center border border-emerald-200">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></div>
                      ACTIVE
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-[#0F172A] mb-2">{currentStation.name}</h1>
                  <div className="flex items-center text-slate-500 text-sm">
                    <MapPin className="w-4 h-4 mr-1.5 shrink-0 text-blue-600" />
                    <span>{currentStation.address}</span>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                  <div className="flex items-center text-amber-500 font-medium bg-amber-50 px-2 py-1 rounded text-sm mb-1">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    4.9
                  </div>
                  <span className="text-xs text-slate-500">2.4k bookings</span>
                </div>
              </div>

              <div className="border-t border-slate-100 my-4"></div>

              <div>
                <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Amenities & Security Features</p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center bg-[#F1F5F9] text-[#475569] text-xs px-3 py-1.5 rounded-full border border-slate-200">
                    <Video className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> CCTV 24/7
                  </div>
                  <div className="flex items-center bg-[#F1F5F9] text-[#475569] text-xs px-3 py-1.5 rounded-full border border-slate-200">
                    <QrCode className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> QR Access
                  </div>
                  <div className="flex items-center bg-[#F1F5F9] text-[#475569] text-xs px-3 py-1.5 rounded-full border border-slate-200">
                    <Plug className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Power Sockets
                  </div>
                  <div className="flex items-center bg-[#F1F5F9] text-[#475569] text-xs px-3 py-1.5 rounded-full border border-slate-200">
                    <Snowflake className="w-3.5 h-3.5 mr-1.5 text-cyan-600" /> Air-Conditioned
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (8/12) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Section A: Storage Timing (Store Now vs Schedule in Advance) */}
            <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold mr-3 border border-blue-200">1</div>
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">Storage Timing</h2>
                    <p className="text-xs text-slate-500 mt-0.5">When do you want to deposit your luggage?</p>
                  </div>
                </div>
              </div>

              {/* Mode Toggle Tabs: Store Now vs Schedule Later */}
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setBookingMode('NOW')}
                  className={`py-3 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    bookingMode === 'NOW'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Store Right Now (Start Immediately)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingMode('SCHEDULE')}
                  className={`py-3 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    bookingMode === 'SCHEDULE'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Schedule in Advance (Choose Date &amp; Time)</span>
                </button>
              </div>

              {/* NOW Mode Quick Summary Banner */}
              {bookingMode === 'NOW' ? (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 sm:p-5 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Start Time</p>
                      <p className="text-base font-extrabold text-[#0F172A]">
                        Starts Right Now <span className="text-slate-500 font-normal text-sm">({formatTimeStr(startDateObj)} Today)</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Simply choose your rental duration below to proceed</p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-block text-xs font-bold text-emerald-700 bg-white px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
                    ⚡ Ready to Deposit
                  </span>
                </div>
              ) : (
                /* SCHEDULE Mode Inputs */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {/* Arrival Date Box */}
                  <div 
                    onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
                    className="relative border border-slate-200 rounded-xl p-4 hover:border-blue-500 transition-colors bg-white group cursor-pointer shadow-xs"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-500 cursor-pointer">Arrival Date (Start Date)</label>
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Min: Today</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center text-[#0F172A] font-semibold text-sm">
                        <Calendar className="w-5 h-5 mr-2 text-blue-600 shrink-0" />
                        <span>{displayStorageDate}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <input
                      ref={dateInputRef}
                      type="date"
                      min={todayStr}
                      max={maxDateStr}
                      value={dropOffDate}
                      onChange={(e) => {
                        if (e.target.value) setDropOffDate(e.target.value);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="text-[11px] text-slate-400 block mt-2">Max allowed: 30 days in advance</span>
                  </div>
                  
                  {/* Arrival Time Box */}
                  <div className="relative border border-slate-200 rounded-xl p-4 hover:border-blue-500 transition-colors bg-white group shadow-xs">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-500">Arrival Time (Start Hour)</label>
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Open: {currentStation.opensAt || '06:00'} - {currentStation.closesAt || '23:00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center text-[#0F172A] font-semibold text-sm w-full mr-2">
                        <Clock className="w-5 h-5 mr-2 text-blue-600 shrink-0" />
                        <select
                          value={dropOffTime}
                          onChange={(e) => setDropOffTime(e.target.value)}
                          className="w-full bg-transparent font-semibold text-[#0F172A] text-sm outline-none cursor-pointer py-1"
                        >
                          {availableTimeSlots.map((timeSlot) => (
                            <option key={timeSlot} value={timeSlot}>
                              {timeSlot}
                            </option>
                          ))}
                        </select>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors pointer-events-none" />
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">Expected time you will arrive at the locker</span>
                  </div>
                </div>
              )}

              {/* Duration Selection */}
              <div>
                <label className="text-sm font-semibold text-[#0F172A] mb-3 block">Storage Duration (How long do you need?)</label>
                <div className="flex flex-wrap items-center gap-3">
                  {[1, 3, 6, 12, 24].map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => {
                        setSelectedDuration(duration);
                        setCustomDurationInput(duration.toString());
                        setIsCustomDuration(false);
                      }}
                      className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                        !isCustomDuration && selectedDuration === duration
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-600 scale-[1.02]'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                      }`}
                    >
                      {duration} {duration === 1 ? 'Hour' : 'Hours'}
                    </button>
                  ))}
                  
                  {isCustomDuration ? (
                    <div className="flex items-center bg-white border-2 border-blue-600 rounded-full px-3 py-1 shadow-sm">
                      <input
                        type="number"
                        min="1"
                        max="72"
                        value={customDurationInput}
                        onChange={(e) => setCustomDurationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleApplyCustomDuration();
                        }}
                        onBlur={handleApplyCustomDuration}
                        placeholder="Hours"
                        autoFocus
                        className="w-16 text-sm font-bold text-center outline-none text-blue-600"
                      />
                      <span className="text-xs font-semibold text-slate-500 mr-2">hrs (max 72)</span>
                      <button
                        type="button"
                        onClick={handleApplyCustomDuration}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 px-2.5 py-1 bg-blue-50 rounded-full cursor-pointer hover:bg-blue-100 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDuration(true);
                        setCustomDurationInput(selectedDuration.toString());
                      }}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-slate-600 border border-slate-200 hover:border-blue-400 hover:bg-slate-50 flex items-center cursor-pointer transition-all"
                    >
                      Custom <ArrowRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Storage Schedule Timeline Banner */}
              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Start Deposit</p>
                      <p className="text-sm font-extrabold text-[#0F172A]">
                        {bookingMode === 'NOW' ? `Right Now (${formatTimeStr(startDateObj)})` : `${dropOffTime} (${displayStorageDate})`}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shrink-0">
                    <Timer className="w-3.5 h-3.5" />
                    <span>Duration: {selectedDuration} {selectedDuration === 1 ? 'Hour' : 'Hours'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0"></div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pick-up Deadline</p>
                      <p className="text-sm font-extrabold text-[#0F172A]">
                        {pickUpDisplay}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-start text-xs text-slate-500">
                  <Info className="w-3.5 h-3.5 mr-1.5 mt-0.5 shrink-0 text-blue-600" />
                  <span>You can pick up your luggage anytime before the deadline. If needed, extension is available 24/7 on this app.</span>
                </div>
              </div>
            </section>

            {/* Section B: Choose Compartment Size */}
            <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <div className="flex items-center mb-2 sm:mb-0">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold mr-3 border border-blue-200">2</div>
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">Choose Compartment Size</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Select a compartment tier that accommodates your luggage dimensions</p>
                  </div>
                </div>
                <div className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" /> Real-time Capacity Sync
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Small Size (S) */}
                <div 
                  onClick={() => {
                    if (isSAvailable) setSelectedSize('S');
                  }}
                  className={`relative rounded-xl border-2 transition-all flex flex-col overflow-hidden ${
                    !isSAvailable
                      ? 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed'
                      : selectedSize === 'S' 
                        ? 'border-blue-600 bg-blue-50/40 shadow-sm cursor-pointer scale-[1.01]' 
                        : 'border-slate-200 bg-white hover:border-blue-300 cursor-pointer'
                  }`}
                >
                  {!isSAvailable && <div className="absolute inset-0 bg-white/40 z-10"></div>}
                  {selectedSize === 'S' && isSAvailable && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white px-2 py-1 rounded-bl-lg z-20">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                  <div className="p-5 flex-grow relative z-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${selectedSize === 'S' && isSAvailable ? 'bg-blue-600/10 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Backpack className="w-6 h-6" />
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${isSAvailable ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200'}`}>
                        {isSAvailable ? `${availS}/${totalS} left` : 'Full'}
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold ${!isSAvailable ? 'text-slate-400' : 'text-[#0F172A]'}`}>Small (S)</h3>
                    <div className={`flex items-center text-xs mt-1 mb-3 ${!isSAvailable ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Ruler className="w-3.5 h-3.5 mr-1" /> 40 x 40 x 50 cm
                    </div>
                    <p className={`text-sm mb-4 ${!isSAvailable ? 'text-slate-400' : 'text-slate-600'}`}>Fits 1-2 standard backpacks, purses, or shopping bags.</p>
                  </div>
                  <div className={`p-4 border-t relative z-0 ${!isSAvailable ? 'border-slate-200 bg-slate-100' : selectedSize === 'S' ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-baseline justify-between">
                      <span className={`text-lg font-bold ${!isSAvailable ? 'text-slate-400' : 'text-blue-600'}`}>{formatCurrency(basePrices.S)}</span>
                      <span className={`text-xs font-medium ${!isSAvailable ? 'text-slate-400' : 'text-slate-500'}`}>/ hr</span>
                    </div>
                    <button 
                      disabled={!isSAvailable} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSAvailable) setSelectedSize('S');
                      }}
                      className={`w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        !isSAvailable ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : selectedSize === 'S' ? 'bg-blue-600 text-white cursor-pointer shadow-sm shadow-blue-500/30' : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer'
                      }`}
                    >
                      {!isSAvailable ? 'Unavailable (Full)' : selectedSize === 'S' ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>

                {/* Medium Size (M) */}
                <div 
                  onClick={() => {
                    if (isMAvailable) setSelectedSize('M');
                  }}
                  className={`relative rounded-xl border-2 transition-all flex flex-col overflow-hidden ${
                    !isMAvailable
                      ? 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed'
                      : selectedSize === 'M' 
                        ? 'border-blue-600 bg-blue-50/40 shadow-sm cursor-pointer scale-[1.01]' 
                        : 'border-slate-200 bg-white hover:border-blue-300 cursor-pointer'
                  }`}
                >
                  {!isMAvailable && <div className="absolute inset-0 bg-white/40 z-10"></div>}
                  {selectedSize === 'M' && isMAvailable && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white px-2 py-1 rounded-bl-lg z-20">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                  <div className="absolute top-0 left-0 bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-br-lg uppercase z-20">
                    Most Popular
                  </div>
                  <div className="p-5 flex-grow mt-2 relative z-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${selectedSize === 'M' && isMAvailable ? 'bg-blue-600/10 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Package className="w-6 h-6" />
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${isMAvailable ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-rose-700 bg-rose-50 border border-rose-200'}`}>
                        {isMAvailable ? `${availM}/${totalM} left` : 'Full'}
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold ${!isMAvailable ? 'text-slate-400' : 'text-[#0F172A]'}`}>Medium (M)</h3>
                    <div className={`flex items-center text-xs mt-1 mb-3 ${!isMAvailable ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Ruler className="w-3.5 h-3.5 mr-1" /> 60 x 40 x 50 cm
                    </div>
                    <p className={`text-sm mb-4 ${!isMAvailable ? 'text-slate-400' : 'text-slate-600'}`}>Fits 1 carry-on suitcase and a backpack.</p>
                  </div>
                  <div className={`p-4 border-t relative z-0 ${!isMAvailable ? 'border-slate-200 bg-slate-100' : selectedSize === 'M' ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-baseline justify-between">
                      <span className={`text-lg font-bold ${!isMAvailable ? 'text-slate-400' : 'text-blue-600'}`}>{formatCurrency(basePrices.M)}</span>
                      <span className={`text-xs font-medium ${!isMAvailable ? 'text-slate-400' : 'text-slate-500'}`}>/ hr</span>
                    </div>
                    <button 
                      disabled={!isMAvailable} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMAvailable) setSelectedSize('M');
                      }}
                      className={`w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        !isMAvailable ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : selectedSize === 'M' ? 'bg-blue-600 text-white cursor-pointer shadow-sm shadow-blue-500/30' : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer'
                      }`}
                    >
                      {!isMAvailable ? 'Unavailable (Full)' : selectedSize === 'M' ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>

                {/* Large Size (L) */}
                <div 
                  onClick={() => {
                    if (isLAvailable) setSelectedSize('L');
                  }}
                  className={`relative rounded-xl border-2 transition-all flex flex-col overflow-hidden ${
                    !isLAvailable
                      ? 'border-slate-200 bg-slate-50 opacity-70 cursor-not-allowed'
                      : selectedSize === 'L' 
                        ? 'border-blue-600 bg-blue-50/40 shadow-sm cursor-pointer scale-[1.01]' 
                        : 'border-slate-200 bg-white hover:border-blue-300 cursor-pointer'
                  }`}
                >
                  {!isLAvailable && <div className="absolute inset-0 bg-white/40 z-10"></div>}
                  {selectedSize === 'L' && isLAvailable && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white px-2 py-1 rounded-bl-lg z-20">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                  <div className="p-5 flex-grow relative z-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${selectedSize === 'L' && isLAvailable ? 'bg-blue-600/10 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Package className="w-6 h-6" />
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${isLAvailable ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200'}`}>
                        {isLAvailable ? `${availL}/${totalL} left` : 'Full'}
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold ${!isLAvailable ? 'text-slate-400' : 'text-[#0F172A]'}`}>Large (L)</h3>
                    <div className={`flex items-center text-xs mt-1 mb-3 ${!isLAvailable ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Ruler className="w-3.5 h-3.5 mr-1" /> 90 x 60 x 50 cm
                    </div>
                    <p className={`text-sm mb-4 ${!isLAvailable ? 'text-slate-400' : 'text-slate-600'}`}>Fits full-size check-in suitcases and bulky gear.</p>
                  </div>
                  <div className={`p-4 border-t relative z-0 ${!isLAvailable ? 'border-slate-200 bg-slate-100' : selectedSize === 'L' ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-baseline justify-between">
                      <span className={`text-lg font-bold ${!isLAvailable ? 'text-slate-400' : 'text-blue-600'}`}>{formatCurrency(basePrices.L)}</span>
                      <span className={`text-xs font-medium ${!isLAvailable ? 'text-slate-400' : 'text-slate-500'}`}>/ hr</span>
                    </div>
                    <button 
                      disabled={!isLAvailable} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isLAvailable) setSelectedSize('L');
                      }}
                      className={`w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        !isLAvailable ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : selectedSize === 'L' ? 'bg-blue-600 text-white cursor-pointer shadow-sm shadow-blue-500/30' : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer'
                      }`}
                    >
                      {!isLAvailable ? 'Unavailable (Full)' : selectedSize === 'L' ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section C: Locker Bank Schematic - CHUẨN NGHIỆP VỤ HỆ THỐNG: TỰ ĐỘNG GÁN THEO TẦNG TỐI ƯU */}
            <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold mr-3 border border-blue-200">3</div>
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">Locker Vault Layout &amp; Tier Preview</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Visual schematic reflects <strong>{totalS + totalM + totalL} physical compartments</strong> at this hub
                    </p>
                  </div>
                </div>
                <div className="text-xs bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-blue-800 font-semibold flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping mr-2"></span>
                  Assigned Tier: {selectedSize === 'S' ? 'Upper Level (Eye Level)' : selectedSize === 'M' ? 'Middle Level (Waist Level)' : selectedSize === 'L' ? 'Lower Level (Ground Level)' : 'None'}
                </div>
              </div>
              
              <div className="bg-[#0F172A] rounded-2xl p-6 sm:p-8 overflow-x-auto shadow-inner">
                <div className="min-w-[550px] space-y-6">
                  {/* Front Entry Indicator */}
                  <div className="flex justify-center">
                    <div className="bg-slate-800 border border-slate-700 px-4 py-1.5 rounded-full text-xs text-slate-300 font-semibold flex items-center shadow-xs">
                      <Navigation className="w-3.5 h-3.5 mr-1.5 text-blue-400 rotate-180" /> Front Locker Bank Face
                    </div>
                  </div>
                  
                  {/* TIER 1: UPPER LEVEL (S - Eye Level) */}
                  <div 
                    onClick={() => { if (isSAvailable) setSelectedSize('S'); }}
                    className={`p-3 rounded-xl transition-all cursor-pointer border ${
                      selectedSize === 'S' 
                        ? 'bg-blue-950/40 border-blue-500/80 shadow-[0_0_20px_rgba(37,99,235,0.2)]' 
                        : 'bg-transparent border-transparent hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center">
                        <span className={`w-2.5 h-2.5 rounded-full mr-2 ${selectedSize === 'S' ? 'bg-blue-500 animate-pulse' : 'bg-slate-500'}`}></span>
                        Upper Tier • Small Compartments ({totalS} Units)
                        {selectedSize === 'S' && (
                          <span className="ml-2.5 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Selected Tier
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold">{availS} Available</span>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {sLockers.map((locker, idx) => {
                        const isRepRepresentative = selectedSize === 'S' && idx === 0;
                        return (
                          <div
                            key={locker.code}
                            className={`h-11 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all ${
                              isRepRepresentative
                                ? 'bg-blue-600 border-2 border-white text-white shadow-[0_0_15px_rgba(37,99,235,0.8)] scale-105 z-10'
                                : selectedSize === 'S' && locker.isAvail
                                  ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300'
                                  : locker.isAvail
                                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                                    : 'bg-slate-800/60 border border-slate-700/60 text-slate-500'
                            }`}
                          >
                            <span>{locker.code}</span>
                            {isRepRepresentative && <span className="text-[8px] uppercase tracking-tighter">Assigned</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* TIER 2: MIDDLE LEVEL (M - Waist Level) */}
                  <div 
                    onClick={() => { if (isMAvailable) setSelectedSize('M'); }}
                    className={`p-3 rounded-xl transition-all cursor-pointer border ${
                      selectedSize === 'M' 
                        ? 'bg-blue-950/40 border-blue-500/80 shadow-[0_0_20px_rgba(37,99,235,0.2)]' 
                        : 'bg-transparent border-transparent hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center">
                        <span className={`w-2.5 h-2.5 rounded-full mr-2 ${selectedSize === 'M' ? 'bg-blue-500 animate-pulse' : 'bg-slate-500'}`}></span>
                        Middle Tier • Medium Compartments ({totalM} Units)
                        {selectedSize === 'M' && (
                          <span className="ml-2.5 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Selected Tier (Waist Level)
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold">{availM} Available</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {mLockers.map((locker, idx) => {
                        const isRepRepresentative = selectedSize === 'M' && idx === 0;
                        return (
                          <div
                            key={locker.code}
                            className={`h-14 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all ${
                              isRepRepresentative
                                ? 'bg-blue-600 border-2 border-white text-white shadow-[0_0_15px_rgba(37,99,235,0.8)] scale-105 z-10'
                                : selectedSize === 'M' && locker.isAvail
                                  ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300'
                                  : locker.isAvail
                                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                                    : 'bg-slate-800/60 border border-slate-700/60 text-slate-500'
                            }`}
                          >
                            <span>{locker.code}</span>
                            {isRepRepresentative && <span className="text-[9px] uppercase tracking-tighter">Assigned</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* TIER 3: LOWER LEVEL (L - Ground Level) */}
                  <div 
                    onClick={() => { if (isLAvailable) setSelectedSize('L'); }}
                    className={`p-3 rounded-xl transition-all cursor-pointer border ${
                      selectedSize === 'L' 
                        ? 'bg-blue-950/40 border-blue-500/80 shadow-[0_0_20px_rgba(37,99,235,0.2)]' 
                        : 'bg-transparent border-transparent hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center">
                        <span className={`w-2.5 h-2.5 rounded-full mr-2 ${selectedSize === 'L' ? 'bg-blue-500 animate-pulse' : 'bg-slate-500'}`}></span>
                        Lower Tier • Large Heavy Units ({totalL} Units)
                        {selectedSize === 'L' && (
                          <span className="ml-2.5 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Selected Tier
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold">{availL} Available</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {lLockers.map((locker, idx) => {
                        const isRepRepresentative = selectedSize === 'L' && idx === 0;
                        return (
                          <div
                            key={locker.code}
                            className={`h-20 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all ${
                              isRepRepresentative
                                ? 'bg-blue-600 border-2 border-white text-white shadow-[0_0_15px_rgba(37,99,235,0.8)] scale-105 z-10'
                                : selectedSize === 'L' && locker.isAvail
                                  ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300'
                                  : locker.isAvail
                                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                                    : 'bg-slate-800/60 border border-slate-700/60 text-slate-500'
                            }`}
                          >
                            <span>{locker.code}</span>
                            {isRepRepresentative && <span className="text-[9px] uppercase tracking-tighter">Assigned</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-center gap-6 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center text-xs text-slate-300">
                      <div className="w-3.5 h-3.5 bg-blue-600 border border-white rounded-xs mr-2 shadow-[0_0_8px_rgba(37,99,235,0.8)]"></div>
                      Assigned Tier ({selectedSize === 'S' ? 'Upper' : selectedSize === 'M' ? 'Middle' : selectedSize === 'L' ? 'Lower' : 'None'})
                    </div>
                    <div className="flex items-center text-xs text-slate-300">
                      <div className="w-3.5 h-3.5 bg-emerald-500/20 border border-emerald-500/50 rounded-xs mr-2"></div>
                      Available ({availS + availM + availL} slots)
                    </div>
                    <div className="flex items-center text-xs text-slate-300">
                      <div className="w-3.5 h-3.5 bg-slate-800 border border-slate-700 rounded-xs mr-2"></div>
                      Occupied / In Use
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4 flex items-start">
                <Info className="w-4 h-4 mr-1.5 mt-0.5 shrink-0 text-blue-600" />
                <span>
                  <strong>Smart Auto-Assignment:</strong> The system automatically assigns the optimal compartment for you in the selected tier to ensure effortless luggage check-in. Your specific compartment code and digital unlock QR key will be unlocked immediately upon payment confirmation.
                </span>
              </p>
            </section>
          </div>

          {/* Right Column (4/12) - Sticky Summary Card */}
          <div className="lg:col-span-4">
            <div className="sticky top-20">
              
              {/* Booking Summary Card */}
              <div className="bg-white rounded-2xl shadow-lg shadow-blue-900/5 border border-blue-200 overflow-hidden mb-6">
                <div className="bg-blue-600 p-5 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <h3 className="text-lg font-bold mb-1 relative z-10">Booking Summary</h3>
                  <p className="text-blue-100 text-xs relative z-10">Review your storage specifications</p>
                </div>
                
                <div className="p-5 space-y-4">
                  {/* Line Items */}
                  <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Station Location</p>
                      <p className="text-sm font-bold text-[#0F172A]">{currentStation.name}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Assigned Unit Tier</p>
                      <p className="text-sm font-bold text-blue-600 flex items-center">
                        {selectedSize === 'S' ? 'Small Unit (S)' : selectedSize === 'M' ? 'Medium Unit (M)' : selectedSize === 'L' ? 'Large Unit (L)' : 'None Selected'}
                        <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-extrabold">
                          {selectedSize === 'S' ? 'Upper' : selectedSize === 'M' ? 'Waist' : 'Lower'}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-0.5">Level Tier</p>
                      <p className="text-xs font-semibold text-slate-600">
                        {selectedSize === 'S' ? 'Eye Level' : selectedSize === 'M' ? 'Waist Level' : 'Ground Level'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Schedule</p>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {bookingMode === 'NOW' ? `Right Now (${formatTimeStr(startDateObj)})` : `${dropOffTime} (${displayStorageDate})`}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Deadline: {pickUpDisplay}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-0.5">Duration</p>
                      <p className="text-sm font-bold text-blue-600">{selectedDuration} {selectedDuration === 1 ? 'Hour' : 'Hours'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-sm">
                    <p className="text-slate-500">
                      Rate ({formatCurrency(selectedSize ? basePrices[selectedSize] : 0)}/hr × {selectedDuration}h)
                    </p>
                    <p className="font-semibold text-[#0F172A]">{formatCurrency(currentPrice)}</p>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-slate-500 flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Physical Protection Seal
                    </p>
                    <p className="font-semibold text-emerald-600">Included</p>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <p className="text-slate-500 flex items-center">
                      <BadgeCheck className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Digital Access Key & PIN
                    </p>
                    <p className="font-semibold text-emerald-600">Included</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl mt-5 border border-slate-200/80">
                    <div className="flex justify-between items-end mb-1">
                      <p className="text-sm font-bold text-[#0F172A]">Total Amount</p>
                      <p className="text-2xl font-extrabold text-blue-600">{formatCurrency(currentPrice)}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 text-right">Includes VAT & station facility services</p>
                  </div>

                  <div className="bg-emerald-50 p-3 rounded-lg flex items-start border border-emerald-200">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mr-2 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-800">
                      <strong>Free cancellation</strong> up to 2 hours before scheduled drop-off time.
                    </p>
                  </div>

                  {apiError && <div className="text-rose-600 text-xs font-semibold mb-3 text-center bg-rose-50 p-2.5 rounded-lg border border-rose-200">{apiError}</div>}
                  <button 
                    disabled={!selectedSize || isSubmitting}
                    onClick={async () => {
                      if (!selectedSize || !currentStation.id) return;
                      setIsSubmitting(true);
                      setApiError(null);
                      try {
                        const { start, end } = getBookingDates();
                        
                        const res = await createBooking({
                          stationId: currentStation.id,
                          size: selectedSize,
                          startAt: start.toISOString(),
                          endAt: end.toISOString()
                        });
                        
                        if (res.success && res.data) {
                          onNavigate('booking-payment', {
                            bookingData: {
                              stationId: currentStation.id,
                              stationName: currentStation.name,
                              stationAddress: currentStation.address,
                              size: selectedSize,
                              duration: selectedDuration,
                              bookingMode: bookingMode,
                              dropOffDate: dropOffDate,
                              dropOffTime: dropOffTime,
                              storageDate: bookingMode === 'NOW' ? 'Right Now' : displayStorageDate,
                              amount: res.data.amount || currentPrice,
                              paymentUrl: res.data.paymentUrl,
                              bookingId: res.data.bookingId,
                              bookingCode: res.data.bookingCode,
                              paymentExpiresAt: res.data.paymentExpiresAt,
                              qrCode: res.data.qrCode,
                              accountNumber: res.data.accountNumber,
                              accountName: res.data.accountName,
                              bin: res.data.bin,
                            }
                          });
                        } else {
                          setApiError(res.message || 'Failed to create booking. Please try again.');
                        }
                      } catch (error: any) {
                        let errorMsg = 'Server connection error. Please try again.';
                        if (error.response?.data) {
                          const data = error.response.data;
                          if (data.message) {
                            errorMsg = data.message;
                          } else if (data.errors && typeof data.errors === 'object') {
                            const errorList = Object.values(data.errors).flat();
                            errorMsg = errorList.join('; ') || data.title || errorMsg;
                          } else if (data.title) {
                            errorMsg = data.title;
                          }
                        } else if (error.message) {
                          errorMsg = error.message;
                        }
                        setApiError(errorMsg);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    className={`w-full py-3.5 rounded-xl text-white font-bold text-base flex items-center justify-center transition-all cursor-pointer ${
                      (selectedSize && !isSubmitting) ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 active:scale-[0.98]' : 'bg-slate-300 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                     ) : (
                      <>Continue to Payment <ArrowRight className="w-5 h-5 ml-2" /></>
                     )}
                  </button>

                  <div className="flex items-center justify-center text-xs text-slate-500 mt-4 space-x-4">
                    <span className="flex items-center"><Lock className="w-3.5 h-3.5 mr-1 text-slate-400" /> Secure Payment</span>
                    <span className="flex items-center"><BadgeCheck className="w-3.5 h-3.5 mr-1 text-blue-600" /> Verified Partner</span>
                  </div>
                </div>
              </div>

              {/* Help & Support Box */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-start">
                <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600 mr-3 shrink-0 border border-blue-100">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A] mb-1">Need assistance?</h4>
                  <p className="text-xs text-slate-500 mb-2">Our support team is available 24/7 for booking inquiries.</p>
                  <a href="tel:+8419001234" className="text-sm font-bold text-blue-600 hover:underline">1900 1234 (Hotline)</a>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* 4. FOOTER - ĐỒNG BỘ 100% VỚI BOOKING PAYMENT PAGE */}
      <footer className="w-full bg-slate-50 border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div className="space-y-1">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-base text-blue-600 font-extrabold tracking-tight">SmartLocker</span>
                <span className="text-xs text-slate-500 font-medium">Smart Luggage Storage Locker System</span>
              </div>
              <p className="text-xs text-slate-400">
                © 2026 SmartLocker Systems. Integrated PayOS &amp; VietQR Napas 24/7.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
              <a className="hover:text-blue-600 transition-colors" href="#">Privacy Policy</a>
              <span>•</span>
              <a className="hover:text-blue-600 transition-colors" href="#">Terms of Service</a>
              <span>•</span>
              <a className="hover:text-blue-600 transition-colors" href="#">Customer Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StationBookingPage;
