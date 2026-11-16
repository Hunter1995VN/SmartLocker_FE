import { openLegal, openSupport } from '../utils/contact';
import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
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
  Star,
  CheckCircle,
  Timer,
  Lock,
  BadgeCheck,
  Sparkles,
  Ticket,
  X
} from 'lucide-react';
import { getStationById, type StationDetail } from '../api/stationService';
import { createBooking } from '../api/bookingService';
import adminPromotionService, {
  type AvailableVoucherItemDto,
  type VoucherValidationResultDto
} from '../api/adminPromotionService';
import CustomerHeader from '../components/layout/CustomerHeader';
import { bookingQuote } from '../utils/bookingQuote';
import { useT } from '../i18n';

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
    const t = useT();
  const [stationDetail, setStationDetail] = useState<StationDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

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

  const currentStation = stationDetail || {
    id: '', name: '', address: '', latitude: 0, longitude: 0,
    status: 'INACTIVE' as const, opensAt: '', closesAt: '',
    totalS: 0, totalM: 0, totalL: 0, availableS: 0, availableM: 0, availableL: 0,
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
    let cancelled = false;
    const fetchStation = async () => {
      setIsRefreshing(true);
      setApiError(null);
      try {
        const { start, end } = getBookingDates();
        const data = stationId ? await getStationById(stationId, start.toISOString(), end.toISOString()) : null;
        if (cancelled) return;
        setStationDetail(data);
        if (!data) setApiError(t('Không tải được dữ liệu trạm. Vui lòng thử lại.'));
      } catch {
        if (!cancelled) { setStationDetail(null); setApiError(t('Không tải được dữ liệu trạm.')); }
      } finally {
        if (!cancelled) { setIsLoading(false); setIsRefreshing(false); }
      }
    };
    void fetchStation();
    const timer = setInterval(fetchStation, 15000);
    return () => { cancelled = true; clearInterval(timer); };
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
  const dateFormatted = new Date(`${dropOffDate}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const displayStorageDate = isToday ? `Today, ${dateFormatted}` : dateFormatted;

  const formatTimeStr = (d: Date) => {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const isDifferentDay = startDateObj.toDateString() !== endDateObj.toDateString();
  const pickUpDisplay = `${formatTimeStr(endDateObj)} ${isDifferentDay ? '(Next Day)' : '(Today)'}`;

  const basePrices = { S: stationDetail?.priceS ?? 0, M: stationDetail?.priceM ?? 0, L: stationDetail?.priceL ?? 0 };

  const getPrice = (size: 'S' | 'M' | 'L' | null, duration: number) => {
    if (!size) return 0;
    return bookingQuote(stationDetail?.sizePricing, size, duration) ?? 0;
  };

  const currentPrice = getPrice(selectedSize, selectedDuration);

  // Promotion / Voucher States
  const [availableVouchers, setAvailableVouchers] = useState<AvailableVoucherItemDto[]>([]);
  const [voucherInput, setVoucherInput] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherValidationResultDto | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState<boolean>(false);
  const [voucherFeedback, setVoucherFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApplyVoucherCode = async (rawCode?: string) => {
    const codeToCheck = (rawCode ?? voucherInput).trim().toUpperCase();
    if (!codeToCheck || currentPrice <= 0) return;
    setIsApplyingVoucher(true);
    setVoucherFeedback(null);
    try {
      const res = await adminPromotionService.validateVoucher({
        code: codeToCheck,
        orderAmount: currentPrice,
        stationId: currentStation.id,
        size: selectedSize || undefined
      });
      if (res.success && res.data && res.data.isValid) {
        setAppliedVoucher(res.data);
        setVoucherInput(res.data.code);
        setVoucherFeedback({
          type: 'success',
          text: t('Đã áp dụng mã {code}: tiết kiệm {amount} VND', { code: res.data.code, amount: res.data.discountAmount.toLocaleString('vi-VN') })
        });
      } else {
        setAppliedVoucher(null);
        setVoucherFeedback({
          type: 'error',
          text: res.data?.message || res.message || t('Mã giảm giá không đủ điều kiện áp dụng.')
        });
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; data?: { message?: string } } } };
      setAppliedVoucher(null);
      setVoucherFeedback({
        type: 'error',
        text:
          axiosErr.response?.data?.data?.message ||
          axiosErr.response?.data?.message ||
          t('Mã Voucher không hợp lệ hoặc đã hết ngân sách khuyến mại.')
      });
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleClearVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput('');
    setVoucherFeedback(null);
  };

  // Fetch available vouchers & re-validate applied voucher when price/size/station changes
  useEffect(() => {
    let active = true;
    const syncVouchers = async () => {
      if (currentPrice <= 0) {
        setAvailableVouchers([]);
        setAppliedVoucher(null);
        return;
      }
      try {
        const availRes = await adminPromotionService.getAvailableVouchers({
          stationId: currentStation.id,
          size: selectedSize || undefined,
          orderAmount: currentPrice
        });
        if (active && availRes.success && availRes.data) {
          setAvailableVouchers(availRes.data);
        }
      } catch {
        // Non-blocking if promotions endpoint is unreachable
      }

      if (appliedVoucher?.code) {
        try {
          const valRes = await adminPromotionService.validateVoucher({
            code: appliedVoucher.code,
            orderAmount: currentPrice,
            stationId: currentStation.id,
            size: selectedSize || undefined
          });
          if (!active) return;
          if (valRes.success && valRes.data && valRes.data.isValid) {
            setAppliedVoucher(valRes.data);
          } else {
            setAppliedVoucher(null);
            setVoucherFeedback({
              type: 'error',
              text: valRes.data?.message || t('Mã giảm giá đã tự động gỡ do thay đổi giá trị đơn thuê.')
            });
          }
        } catch {
          if (active) setAppliedVoucher(null);
        }
      }
    };
    void syncVouchers();
    return () => {
      active = false;
    };
  }, [currentStation.id, selectedSize, currentPrice]);

  const discountAmount = appliedVoucher?.isValid ? appliedVoucher.discountAmount : 0;
  const finalPayableAmount = appliedVoucher?.isValid
    ? appliedVoucher.finalPayableAmount
    : currentPrice;

  // Format currency
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('vi-VN')} VND`;
  };

  // Real availability counts
  const totalS = currentStation.totalS;
  const availS = Math.min(totalS, currentStation.availableS);
  const hasPolicy = (size: 'S' | 'M' | 'L') => bookingQuote(stationDetail?.sizePricing, size, selectedDuration) !== null;
  const isSAvailable = !isRefreshing && availS > 0 && hasPolicy('S');

  const totalM = currentStation.totalM;
  const availM = Math.min(totalM, currentStation.availableM);
  const isMAvailable = !isRefreshing && availM > 0 && hasPolicy('M');

  const totalL = currentStation.totalL;
  const availL = Math.min(totalL, currentStation.availableL);
  const isLAvailable = !isRefreshing && availL > 0 && hasPolicy('L');
  const canBook = !!stationDetail && stationDetail.id === stationId && stationDetail.status === 'ACTIVE' && !isRefreshing && !isSubmitting
    && (selectedSize === 'S' ? isSAvailable : selectedSize === 'M' ? isMAvailable : selectedSize === 'L' ? isLAvailable : false);

  if (isLoading) {
    return (
      <div className="bg-slate-50 min-h-screen pb-20 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">{t('Đang tải thông tin trạm...')}</p>
        </div>
      </div>
    );
  }

  if (!stationDetail) return (
    <main className="min-h-screen grid place-content-center gap-4 p-8 text-center">
      <p role="alert">{apiError || t('Trạm chưa có dữ liệu.')}</p>
      <button onClick={() => window.location.reload()}>{t('Tải lại')}</button>
      <button onClick={() => onNavigate('find-station')}>{t('Chọn trạm khác')}</button>
    </main>
  );

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 pb-12">
      {/* 1. UNIFIED CUSTOMER HEADER */}
      <CustomerHeader
        currentPage="station-booking"
        onNavigate={onNavigate}
      />

      {/* 2. MAIN CONTENT CONTAINER */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 w-full">
        {/* STEP PROGRESS BAR - ĐỒNG BỘ 100% VỚI BOOKING PAYMENT PAGE */}
        <nav aria-label={t('Các bước đặt tủ')} className="mb-6 md:mb-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
            {/* Step 1 (Current / In Progress) */}
            <div className="flex items-center gap-2 sm:gap-3 text-left">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-blue-500/30">
                1
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs uppercase font-bold text-blue-600 tracking-wider">{t('Bước 1 (đang thực hiện)')}</span>
                <span className="text-sm font-semibold text-slate-900 truncate">
                  Select Size &amp; Duration
                </span>
              </div>
            </div>

            {/* Bước 2 (Upcoming) */}
            <div className="flex items-center gap-2 sm:gap-3 border-x border-slate-200 px-2 sm:px-4 text-left">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">{t('Bước 2')}</span>
                <span className="text-sm font-semibold text-slate-500 truncate">
                  PayOS VietQR Payment
                </span>
              </div>
            </div>

            {/* Bước 3 (Upcoming) */}
            <div className="flex items-center gap-2 sm:gap-3 text-left pl-1 sm:pl-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">{t('Bước 3')}</span>
                <span className="text-sm font-semibold text-slate-500 truncate">
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
                alt={t('Vị trí trạm')} 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg flex items-center text-xs font-medium">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
                {t('Cảm biến cửa từng ô tủ')}
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
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">{currentStation.name}</h1>
                  <div className="flex items-center text-slate-500 text-sm">
                    <MapPin className="w-4 h-4 mr-1.5 shrink-0 text-blue-600" />
                    <span>{currentStation.address}</span>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                  <div className="flex items-center text-amber-500 font-medium bg-amber-50 px-2 py-1 rounded text-sm mb-1">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    {currentStation.ratingCount ? currentStation.ratingAverage?.toFixed(1) : t('Chưa có đánh giá')}
                  </div>
                  <span className="text-xs text-slate-500">{currentStation.ratingCount ?? 0} {t('lượt đánh giá')}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 my-4"></div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">{t('Tiện ích & an ninh')}</p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center bg-slate-100 text-slate-600 text-xs px-3 py-1.5 rounded-full border border-slate-200">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> {t('Cảm biến cửa 24/7')}
                  </div>
                  <div className="flex items-center bg-slate-100 text-slate-600 text-xs px-3 py-1.5 rounded-full border border-slate-200">
                    <QrCode className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> QR Access
                  </div>
                  <div className="flex items-center bg-slate-100 text-slate-600 text-xs px-3 py-1.5 rounded-full border border-slate-200">
                    <Plug className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Power Sockets
                  </div>
                  <div className="flex items-center bg-slate-100 text-slate-600 text-xs px-3 py-1.5 rounded-full border border-slate-200">
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
            
            {/* Section A: Thời điểm gửi (Store Now vs Schedule in Advance) */}
            <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold mr-3 border border-blue-200">1</div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{t('Thời điểm gửi')}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{t('Bạn muốn gửi hành lý lúc nào?')}</p>
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
                  <span>{t('Gửi ngay (bắt đầu ngay)')}</span>
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
                  <span>{t('Đặt trước (chọn ngày & giờ)')}</span>
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
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">{t('Giờ bắt đầu')}</p>
                      <p className="text-base font-extrabold text-slate-900">
                        Starts Right Now <span className="text-slate-500 font-normal text-sm">({formatTimeStr(startDateObj)} Today)</span>
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">{t('Chỉ cần chọn thời lượng thuê bên dưới để tiếp tục')}</p>
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
                      <label className="text-xs font-semibold text-slate-500 cursor-pointer">{t('Ngày đến (ngày bắt đầu)')}</label>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{t('Tối thiểu: hôm nay')}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center text-slate-900 font-semibold text-sm">
                        <Calendar className="w-5 h-5 mr-2 text-blue-600 shrink-0" />
                        <span>{displayStorageDate}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <input aria-label={t('Ngày gửi đồ')}
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
                    <span className="text-xs text-slate-500 block mt-2">{t('Tối đa: đặt trước 30 ngày')}</span>
                  </div>
                  
                  {/* Arrival Time Box */}
                  <div className="relative border border-slate-200 rounded-xl p-4 hover:border-blue-500 transition-colors bg-white group shadow-xs">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-500">{t('Giờ đến (giờ bắt đầu)')}</label>
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Open: {currentStation.opensAt || '06:00'} - {currentStation.closesAt || '23:00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center text-slate-900 font-semibold text-sm w-full mr-2">
                        <Clock className="w-5 h-5 mr-2 text-blue-600 shrink-0" />
                        <select aria-label={t('Giờ gửi đồ')}
                          value={dropOffTime}
                          onChange={(e) => setDropOffTime(e.target.value)}
                          className="w-full bg-transparent font-semibold text-slate-900 text-sm outline-none cursor-pointer py-1"
                        >
                          {availableTimeSlots.map((timeSlot) => (
                            <option key={timeSlot} value={timeSlot}>
                              {timeSlot}
                            </option>
                          ))}
                        </select>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors pointer-events-none" />
                    </div>
                    <span className="text-xs text-slate-500 block mt-1">{t('Giờ dự kiến bạn đến tủ')}</span>
                  </div>
                </div>
              )}

              {/* Duration Selection */}
              <div>
                <label className="text-sm font-semibold text-slate-900 mb-3 block">{t('Thời lượng gửi (bạn cần bao lâu?)')}</label>
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
                      <input aria-label={t('Số giờ gửi (từ 1 đến 72)')}
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
                      <span className="text-xs font-semibold text-slate-500 mr-2">{t('giờ (tối đa 72)')}</span>
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
                      Custom <ArrowRight className="w-3.5 h-3.5 ml-1 text-slate-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Storage Schedule Timeline Banner */}
              <div className="mt-6 bg-blue-50/50 border border-blue-200/80 rounded-xl p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shrink-0 ring-4 ring-amber-100"></div>
                    <div>
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">{t('Thời gian giữ chỗ miễn phí')}</p>
                      <p className="text-sm font-extrabold text-slate-900">
                        30 Minutes to Arrive
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-white px-3.5 py-1.5 rounded-full border border-blue-200 shadow-xs shrink-0">
                    <Timer className="w-3.5 h-3.5 text-blue-600" />
                    <span>Duration: {selectedDuration} {selectedDuration === 1 ? 'Hour' : 'Hours'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-100"></div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Số lượng ngăn')}</p>
                      <p className="text-sm font-extrabold text-slate-900">
                        {t('Bắt đầu khi gửi đồ tại kiosk')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-blue-200/60 flex items-start text-xs text-blue-900 leading-relaxed bg-white/80 p-3 rounded-xl border border-blue-100">
                  <Info className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-blue-600" />
                  <span>
                    <strong>{t('Chính sách giữ tủ mới:')}</strong> {t('Bạn có 30 phút giữ tủ miễn phí sau khi thanh toán để di chuyển đến trạm. Thời gian thuê')} <strong>{selectedDuration} {t('tiếng')}</strong> {t('chỉ chính thức bắt đầu đếm ngược từ lúc bạn quét mã QR/nhập PIN mở tủ tại trạm.')}
                  </span>
                </div>
              </div>
            </section>

            {/* Section B: Choose Compartment Size */}
            <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <div className="flex items-center mb-2 sm:mb-0">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold mr-3 border border-blue-200">2</div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{t('Chọn cỡ ngăn tủ')}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{t('Chọn cỡ ngăn tủ phù hợp kích thước hành lý của bạn')}</p>
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
                        {isSAvailable ? `${availS}/${totalS} left` : t('Không khả dụng')}
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold ${!isSAvailable ? 'text-slate-500' : 'text-slate-900'}`}>{t('Nhỏ (S)')}</h3>
                    <div className={`flex items-center text-xs mt-1 mb-3 ${!isSAvailable ? 'text-slate-500' : 'text-slate-500'}`}>
                      <Ruler className="w-3.5 h-3.5 mr-1" /> 45 x 45 x 65 cm
                    </div>
                    <p className={`text-sm mb-4 ${!isSAvailable ? 'text-slate-500' : 'text-slate-600'}`}>{t('Vừa 1–2 balo tiêu chuẩn, túi xách hoặc túi mua sắm.')}</p>
                  </div>
                  <div className={`p-4 border-t relative z-0 ${!isSAvailable ? 'border-slate-200 bg-slate-100' : selectedSize === 'S' ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-baseline justify-between">
                      <span className={`text-lg font-bold ${!isSAvailable ? 'text-slate-500' : 'text-blue-600'}`}>{formatCurrency(basePrices.S)}</span>
                      <span className={`text-xs font-medium ${!isSAvailable ? 'text-slate-500' : 'text-slate-500'}`}>/ {stationDetail?.sizePricing?.find(p => p.size === 'S')?.blockHours ?? '—'} {t('giờ')}</span>
                    </div>
                    <button 
                      disabled={!isSAvailable} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSAvailable) setSelectedSize('S');
                      }}
                      className={`w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        !isSAvailable ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : selectedSize === 'S' ? 'bg-blue-600 text-white cursor-pointer shadow-sm shadow-blue-500/30' : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer'
                      }`}
                    >
                      {!isSAvailable ? t('Không khả dụng') : selectedSize === 'S' ? 'Selected' : 'Select'}
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
                  <div className="absolute top-0 left-0 bg-amber-400 text-amber-950 text-xs font-bold px-2 py-0.5 rounded-br-lg uppercase z-20">
                    Most Popular
                  </div>
                  <div className="p-5 flex-grow mt-2 relative z-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${selectedSize === 'M' && isMAvailable ? 'bg-blue-600/10 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Package className="w-6 h-6" />
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${isMAvailable ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-rose-700 bg-rose-50 border border-rose-200'}`}>
                        {isMAvailable ? `${availM}/${totalM} left` : t('Không khả dụng')}
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold ${!isMAvailable ? 'text-slate-500' : 'text-slate-900'}`}>{t('Vừa (M)')}</h3>
                    <div className={`flex items-center text-xs mt-1 mb-3 ${!isMAvailable ? 'text-slate-500' : 'text-slate-500'}`}>
                      <Ruler className="w-3.5 h-3.5 mr-1" /> 65 x 45 x 65 cm
                    </div>
                    <p className={`text-sm mb-4 ${!isMAvailable ? 'text-slate-500' : 'text-slate-600'}`}>{t('Vừa 1 vali cabin và 1 balo.')}</p>
                  </div>
                  <div className={`p-4 border-t relative z-0 ${!isMAvailable ? 'border-slate-200 bg-slate-100' : selectedSize === 'M' ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-baseline justify-between">
                      <span className={`text-lg font-bold ${!isMAvailable ? 'text-slate-500' : 'text-blue-600'}`}>{formatCurrency(basePrices.M)}</span>
                      <span className={`text-xs font-medium ${!isMAvailable ? 'text-slate-500' : 'text-slate-500'}`}>/ {stationDetail?.sizePricing?.find(p => p.size === 'M')?.blockHours ?? '—'} {t('giờ')}</span>
                    </div>
                    <button 
                      disabled={!isMAvailable} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMAvailable) setSelectedSize('M');
                      }}
                      className={`w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        !isMAvailable ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : selectedSize === 'M' ? 'bg-blue-600 text-white cursor-pointer shadow-sm shadow-blue-500/30' : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer'
                      }`}
                    >
                      {!isMAvailable ? t('Không khả dụng') : selectedSize === 'M' ? 'Selected' : 'Select'}
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
                        {isLAvailable ? `${availL}/${totalL} left` : t('Không khả dụng')}
                      </span>
                    </div>
                    <h3 className={`text-lg font-bold ${!isLAvailable ? 'text-slate-500' : 'text-slate-900'}`}>{t('Lớn (L)')}</h3>
                    <div className={`flex items-center text-xs mt-1 mb-3 ${!isLAvailable ? 'text-slate-500' : 'text-slate-500'}`}>
                      <Ruler className="w-3.5 h-3.5 mr-1" /> 95 x 55 x 65 cm
                    </div>
                    <p className={`text-sm mb-4 ${!isLAvailable ? 'text-slate-500' : 'text-slate-600'}`}>{t('Vừa vali ký gửi cỡ lớn và đồ cồng kềnh.')}</p>
                  </div>
                  <div className={`p-4 border-t relative z-0 ${!isLAvailable ? 'border-slate-200 bg-slate-100' : selectedSize === 'L' ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-baseline justify-between">
                      <span className={`text-lg font-bold ${!isLAvailable ? 'text-slate-500' : 'text-blue-600'}`}>{formatCurrency(basePrices.L)}</span>
                      <span className={`text-xs font-medium ${!isLAvailable ? 'text-slate-500' : 'text-slate-500'}`}>/ {stationDetail?.sizePricing?.find(p => p.size === 'L')?.blockHours ?? '—'} {t('giờ')}</span>
                    </div>
                    <button 
                      disabled={!isLAvailable} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isLAvailable) setSelectedSize('L');
                      }}
                      className={`w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        !isLAvailable ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : selectedSize === 'L' ? 'bg-blue-600 text-white cursor-pointer shadow-sm shadow-blue-500/30' : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer'
                      }`}
                    >
                      {!isLAvailable ? t('Không khả dụng') : selectedSize === 'L' ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl border border-slate-200">
              <h2 className="text-xl font-bold">{t('Các ngăn tủ tại trạm')}</h2>
              <p className="text-sm text-slate-500 my-3">{t('Chọn kích thước S, M hoặc L. Hệ thống gán ngăn đúng kích thước khi check-in, sau khi kiểm tra vé và thiết bị.')}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(stationDetail?.lockers ?? []).map(locker => (
                  <div key={locker.lockerId} className="rounded-xl border border-slate-200 p-4">
                    <strong>{locker.lockerCode} · {locker.size}</strong>
                    <p className="text-sm">{locker.businessStatus} · {locker.healthStatus}</p>
                    <p className="text-sm">{t('Cửa:')} {locker.doorState} · {locker.connectivityStatus}</p>
                  </div>
                ))}
              </div>
              {!stationDetail?.lockers?.length && <p>{t('Trạm chưa có ngăn tủ được kết nối.')}</p>}
            </section>
          </div>

          {/* Right Column (4/12) - Sticky Summary Card */}
          <div className="lg:col-span-4">
            <div className="sticky top-20">
              
              {/* Booking Summary Card */}
              <div className="bg-white rounded-2xl shadow-lg shadow-blue-900/5 border border-blue-200 overflow-hidden mb-6">
                <div className="bg-blue-600 p-5 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <h3 className="text-lg font-bold mb-1 relative z-10">{t('Tóm tắt đặt chỗ')}</h3>
                  <p className="text-blue-100 text-sm relative z-10">{t('Xem lại thông tin gửi đồ')}</p>
                </div>
                
                <div className="p-5 space-y-4">
                  {/* Line Items */}
                  <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                    <div>
                      <p className="text-sm text-slate-500 mb-0.5">{t('Vị trí trạm')}</p>
                      <p className="text-sm font-bold text-slate-900">{currentStation.name}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                    <div>
                      <p className="text-sm text-slate-500 mb-0.5">{t('Kích thước đã chọn')}</p>
                      <p className="text-sm font-bold text-blue-600 flex items-center">
                        {selectedSize === 'S' ? 'Small Unit (S)' : selectedSize === 'M' ? 'Medium Unit (M)' : selectedSize === 'L' ? 'Large Unit (L)' : 'None Selected'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                    <div>
                      <p className="text-sm text-slate-500 mb-0.5">Schedule</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {bookingMode === 'NOW' ? `Right Now (${formatTimeStr(startDateObj)})` : `${dropOffTime} (${displayStorageDate})`}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">Deadline: {pickUpDisplay}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 mb-0.5">Duration</p>
                      <p className="text-sm font-bold text-blue-600">{selectedDuration} {selectedDuration === 1 ? 'Hour' : 'Hours'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-sm">
                    <p className="text-slate-500">
                      {t('Chi phí theo chính sách giá (')}{selectedDuration} {t('giờ)')}
                    </p>
                    <p className="font-semibold text-slate-900">{formatCurrency(currentPrice)}</p>
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

                  {/* Promo Code & Voucher Selection */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                        Promo Code / Voucher
                      </span>
                      {availableVouchers.filter(v => v.isEligibleNow).length > 0 && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {availableVouchers.filter(v => v.isEligibleNow).length} {t('mã khả dụng')}
                        </span>
                      )}
                    </div>

                    {appliedVoucher ? (
                      <div className="flex items-center justify-between bg-emerald-50/90 border border-emerald-200 rounded-xl px-3 py-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                              {appliedVoucher.code}
                            </span>
                            <span className="text-xs font-bold text-emerald-700">
                              -{formatCurrency(appliedVoucher.discountAmount)}
                            </span>
                          </div>
                          <p className="text-sm text-emerald-700 truncate mt-0.5">{appliedVoucher.title}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearVoucher}
                          className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 cursor-pointer shrink-0"
                          title={t('Gỡ mã giảm giá')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <input aria-label={t('Mã giảm giá')}
                          type="text"
                          value={voucherInput}
                          onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleApplyVoucherCode();
                            }
                          }}
                          placeholder={t('Nhập mã (VD: DANANG20)')}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold uppercase focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={!voucherInput.trim() || isApplyingVoucher}
                          onClick={() => void handleApplyVoucherCode()}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-bold transition cursor-pointer"
                        >
                          {isApplyingVoucher ? '...' : t('Áp dụng')}
                        </button>
                      </div>
                    )}

                    {voucherFeedback && (
                      <p className={`text-xs font-medium ${voucherFeedback.type === 'success' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {voucherFeedback.text}
                      </p>
                    )}

                    {availableVouchers.length > 0 && !appliedVoucher && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {availableVouchers.slice(0, 4).map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            disabled={!v.isEligibleNow || isApplyingVoucher}
                            onClick={() => void handleApplyVoucherCode(v.code)}
                            title={v.isEligibleNow ? v.title : (v.ineligibleReason || v.title)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition ${
                              v.isEligibleNow
                                ? 'bg-blue-50/70 hover:bg-blue-100 text-blue-700 border-blue-200 cursor-pointer'
                                : 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed opacity-75'
                            }`}
                          >
                            <span className="font-mono">{v.code}</span>
                            {v.isEligibleNow ? (
                              <span className="text-emerald-600">(-{(v.estimatedDiscount / 1000).toFixed(0)}K)</span>
                            ) : (
                              <span className="text-xs font-normal">
                                {t('(Đơn từ')} {(v.minOrderAmount / 1000).toFixed(0)}K)
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl mt-5 border border-slate-200/80 space-y-1.5">
                    {discountAmount > 0 && (
                      <>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>Subtotal</span>
                          <span className="line-through">{formatCurrency(currentPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold text-emerald-600">
                          <span>Voucher ({appliedVoucher?.code})</span>
                          <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-end mb-1">
                      <p className="text-sm font-bold text-slate-900">{t('Tổng tiền')}</p>
                      <p className="text-2xl font-extrabold text-blue-600">{formatCurrency(finalPayableAmount)}</p>
                    </div>
                    <p className="text-sm text-slate-500 text-right">{t('Đã gồm VAT & dịch vụ tại trạm')}</p>
                  </div>

                  <div className="bg-emerald-50 p-3 rounded-lg flex items-start border border-emerald-200">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mr-2 mt-0.5 shrink-0" />
                    <p className="text-sm text-emerald-800">
                      <strong>{t('Hủy miễn phí')}</strong> up to 2 hours before scheduled drop-off time.
                    </p>
                  </div>

                  {apiError && <div className="text-rose-600 text-xs font-semibold mb-3 text-center bg-rose-50 p-2.5 rounded-lg border border-rose-200">{apiError}</div>}
                  <button 
                    disabled={!canBook}
                    onClick={async () => {
                      if (!canBook || !selectedSize || !currentStation.id) return;
                      setIsSubmitting(true);
                      setApiError(null);
                      try {
                        const { start, end } = getBookingDates();
                        
                        const res = await createBooking({
                          stationId: currentStation.id,
                          size: selectedSize,
                          startAt: start.toISOString(),
                          endAt: end.toISOString(),
                          voucherCode: appliedVoucher?.code || undefined
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
                              amount: res.data.amount,
                              originalAmount: res.data.originalAmount ?? currentPrice,
                              discountAmount: res.data.discountAmount ?? discountAmount,
                              appliedVoucherCode: res.data.appliedVoucherCode ?? appliedVoucher?.code,
                              paymentUrl: res.data.paymentUrl,
                              bookingId: res.data.bookingId,
                              bookingCode: res.data.bookingCode,
                              paymentExpiresAt: res.data.paymentExpiresAt,
                              qrCode: res.data.qrCode,
                              accountNumber: res.data.accountNumber,
                              accountName: res.data.accountName,
                              bin: res.data.bin,
                              orderCode: res.data.orderCode,
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
                      canBook ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 active:scale-[0.98]' : 'bg-slate-300 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('Đang xử lý...')}
                      </span>
                     ) : (
                      <>{t('Tiếp tục thanh toán')} <ArrowRight className="w-5 h-5 ml-2" /></>
                     )}
                  </button>

                  <div className="flex items-center justify-center text-xs text-slate-500 mt-4 space-x-4">
                    <span className="flex items-center"><Lock className="w-3.5 h-3.5 mr-1 text-slate-500" /> {t('Thanh toán bảo mật')}</span>
                    <span className="flex items-center"><BadgeCheck className="w-3.5 h-3.5 mr-1 text-blue-600" /> {t('Đối tác đã xác minh')}</span>
                  </div>
                </div>
              </div>

              {/* Help & Support Box */}
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-start">
                <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600 mr-3 shrink-0 border border-blue-100">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{t('Cần hỗ trợ?')}</h4>
                  <p className="text-sm text-slate-500 mb-2">{t('Đội hỗ trợ sẵn sàng 24/7 cho các câu hỏi về đặt chỗ.')}</p>
                  <a href="tel:+8419001234" className="text-sm font-bold text-blue-600 hover:underline">Hotline: 1900 1234</a>
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
                <span className="text-xs text-slate-500 font-medium">{t('Hệ thống tủ gửi hành lý thông minh')}</span>
              </div>
              <p className="text-sm text-slate-500">
                © {new Date().getFullYear()} {t('SmartLocker. Cổng thanh toán tích hợp PayOS & VietQR Napas 24/7.')}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
              <a className="hover:text-blue-600 transition-colors" href="#support" onClick={(e) => { e.preventDefault(); openLegal('privacy'); }}>{t('Chính sách bảo mật')}</a>
              <span>•</span>
              <a className="hover:text-blue-600 transition-colors" href="#support" onClick={(e) => { e.preventDefault(); openLegal('terms'); }}>{t('Điều khoản dịch vụ')}</a>
              <span>•</span>
              <a className="hover:text-blue-600 transition-colors" href="#support" onClick={(e) => { e.preventDefault(); openSupport(); }}>{t('Hỗ trợ khách hàng')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StationBookingPage;
