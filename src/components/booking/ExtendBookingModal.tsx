import React, { useState, useEffect } from 'react';
import {
  Timer,
  X,
  MapPin,
  CheckCircle,
  QrCode,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  extendBooking,
  getBookingById,
  syncPayment,
  type CreateBookingResponse
} from '../../api/bookingService';

interface ExtendBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  bookingCode?: string;
  lockerCode?: string;
  size?: string;
  stationName?: string;
  startAt?: string;
  currentEndAt?: string;
  currentEndTime?: string;
  hourlyRate?: number;
  maxHours?: number;
  overdueFee?: number;
  onExtended?: () => Promise<void> | void;
  onSuccess?: (addedHours: number, amount: number) => Promise<void> | void;
}

export const ExtendBookingModal: React.FC<ExtendBookingModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  bookingCode,
  lockerCode = 'Assigned Locker',
  size = 'M',
  stationName = 'SmartLocker Station',
  startAt,
  currentEndAt,
  currentEndTime,
  hourlyRate,
  maxHours = 72,
  overdueFee = 0,
  onExtended,
  onSuccess
}) => {
  const [selectedHours, setSelectedHours] = useState<number>(3);
  const [customHoursInput, setCustomHoursInput] = useState<string>('3');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 2: Live PayOS VietQR payment state
  const [paymentData, setPaymentData] = useState<CreateBookingResponse | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState<boolean>(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  // Reset modal state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setSelectedHours(3);
      setCustomHoursInput('3');
      setIsCustom(false);
      setErrorMsg(null);
      setPaymentData(null);
      setIsPaidSuccess(false);
      setStatusNote(null);
    }
  }, [isOpen, bookingId]);

  // Compute real base hourly rate (from PricingPolicy in DB, or default by size)
  const effectiveHourlyRate =
    hourlyRate && hourlyRate > 0
      ? hourlyRate
      : size === 'S'
        ? 10000
        : size === 'L'
          ? 20000
          : 15000;

  // Compute current end Date object from real booking.endAt
  const baseEndDate = currentEndAt ? new Date(currentEndAt) : new Date();
  const baseStartDate = startAt ? new Date(startAt) : baseEndDate;
  const currentTotalHours = Math.max(
    1,
    Math.round(((baseEndDate.getTime() - baseStartDate.getTime()) / 3600000) * 10) / 10
  );
  const maxAdditionalHours = Math.max(1, Math.floor(maxHours - currentTotalHours));

  const formatDateTime = (d: Date) => {
    const now = new Date();
    const isSameDay = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (isSameDay) return `${timeStr} Hôm nay`;
    return `${timeStr} (${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })})`;
  };

  const getNewEndDate = (hoursToAdd: number) => {
    return new Date(baseEndDate.getTime() + hoursToAdd * 3600000);
  };

  const getExtensionBaseFee = (hoursToAdd: number) => {
    return hoursToAdd * effectiveHourlyRate;
  };

  const extensionBaseFee = getExtensionBaseFee(selectedHours);
  const totalPayable = extensionBaseFee + (overdueFee > 0 ? overdueFee : 0);
  const newEndDateObj = getNewEndDate(selectedHours);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApplyCustomHours = () => {
    let val = parseInt(customHoursInput, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > maxAdditionalHours) val = maxAdditionalHours;
    setCustomHoursInput(val.toString());
    setSelectedHours(val);
  };

  // Step 1 -> Step 2: Create real extension payment via Backend & PayOS
  const handleCreateExtensionPayment = async () => {
    if (isSubmitting) return;
    setErrorMsg(null);

    if (selectedHours > maxAdditionalHours) {
      setErrorMsg(`Tổng thời gian lưu trữ tối đa là ${maxHours} giờ (còn có thể gia hạn tối đa +${maxAdditionalHours} giờ).`);
      return;
    }

    if (!bookingId) {
      if (onSuccess) {
        setIsSubmitting(true);
        try {
          await onSuccess(selectedHours, totalPayable);
        } finally {
          setIsSubmitting(false);
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const targetNewEndIso = getNewEndDate(selectedHours).toISOString();
      const res = await extendBooking(bookingId, { newEndAt: targetNewEndIso });
      if (res.success && res.data) {
        setPaymentData(res.data);
      } else {
        setErrorMsg(res.message || 'Không thể khởi tạo giao dịch gia hạn. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
          'Lỗi kết nối khi tạo yêu cầu gia hạn.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Automatic polling while on Step 2 (VietQR screen)
  useEffect(() => {
    if (!isOpen || !paymentData || !bookingId || isPaidSuccess) return;

    const oldEndTimeMs = baseEndDate.getTime();

    const interval = setInterval(async () => {
      try {
        if (paymentData.orderCode) {
          await syncPayment(paymentData.orderCode).catch(() => {});
        }
        const res = await getBookingById(bookingId);
        if (res.success && res.data) {
          const updatedEndMs = new Date(res.data.endAt).getTime();
          if (updatedEndMs > oldEndTimeMs + 60000) {
            clearInterval(interval);
            setIsPaidSuccess(true);
            if (onExtended) await onExtended();
          }
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, paymentData, bookingId, isPaidSuccess]);

  // Manual verify button on Step 2
  const handleVerifyPaymentNow = async () => {
    if (!bookingId || !paymentData) return;
    setIsCheckingPayment(true);
    setStatusNote(null);
    try {
      if (paymentData.orderCode) {
        await syncPayment(paymentData.orderCode).catch(() => {});
      }
      const res = await getBookingById(bookingId);
      if (res.success && res.data) {
        const updatedEndMs = new Date(res.data.endAt).getTime();
        if (updatedEndMs > baseEndDate.getTime() + 60000) {
          setIsPaidSuccess(true);
          if (onExtended) await onExtended();
          return;
        }
      }
      setStatusNote('Hệ thống đang chờ ngân hàng xác nhận giao dịch. Vui lòng đợi vài giây sau khi chuyển khoản.');
    } catch {
      setStatusNote('Không thể kiểm tra trạng thái lúc này. Vui lòng thử lại.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  if (!isOpen) return null;

  const displayCurrentExpiry = currentEndAt
    ? formatDateTime(baseEndDate)
    : currentEndTime || 'Hôm nay';

  const sizeLabel =
    size === 'S' ? 'Small (S)' : size === 'L' ? 'Large (L)' : 'Medium (M)';

  const vietQrImgUrl =
    paymentData?.bin && paymentData?.accountNumber
      ? `https://img.vietqr.io/image/${paymentData.bin}-${paymentData.accountNumber}-compact2.png?amount=${paymentData.amount || totalPayable}&addInfo=${encodeURIComponent(`Gia han ${bookingCode || paymentData.bookingCode}`)}&accountName=${encodeURIComponent(paymentData.accountName || '')}`
      : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 md:p-6 animate-fade-in-up">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all my-auto z-10">
        {/* 1. Modal Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <Timer className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl text-slate-900 font-bold tracking-tight">
                {isPaidSuccess
                  ? 'Extension Confirmed!'
                  : paymentData
                    ? 'Scan VietQR to Complete Extension'
                    : 'Extend Locker Rental Duration (UC-T14)'}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {isPaidSuccess
                  ? 'Your locker expiration time and QR access key have been updated'
                  : paymentData
                    ? 'Instant automatic confirmation via PayOS Napas 24/7'
                    : 'Add storage hours remotely without returning to the station'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[calc(86vh-120px)] overflow-y-auto">
          {/* 2. Current Locker Info Banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base text-slate-900 font-bold">
                  {lockerCode.startsWith('Locker') ? lockerCode : `Locker ${lockerCode}`}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  {sizeLabel} · {formatCurrency(effectiveHourlyRate)}đ/h
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="line-clamp-1">{stationName}</span>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">Current Expiration</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>{displayCurrentExpiry}</span>
              </div>
            </div>
          </div>

          {/* STATE A: EXTENSION PAID SUCCESSFULLY */}
          {isPaidSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Đã gia hạn thêm +{selectedHours} giờ thành công!
                </h3>
                <p className="text-xs text-slate-500">
                  Hạn trả tủ mới của bạn đã được cập nhật thành{' '}
                  <strong className="text-emerald-700">{formatDateTime(newEndDateObj)}</strong>.
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 max-w-md mx-auto">
                Mã QR và mã PIN 6 số mở tủ của bạn đã được tự động gia hạn hiệu lực đến thời điểm mới.
              </div>
            </div>
          ) : paymentData ? (
            /* STATE B: STEP 2 — LIVE PAYOS VIETQR SCAN & AUTO-SYNC */
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 border border-blue-200/80 rounded-2xl">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Real Scannable QR Box */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center shrink-0">
                    <div className="w-full flex justify-between items-center mb-1.5 px-0.5">
                      <span className="font-extrabold text-[10px] text-blue-700">VIETQR</span>
                      <span className="font-bold text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        PayOS 24/7
                      </span>
                    </div>
                    {paymentData.qrCode ? (
                      <QRCodeSVG value={paymentData.qrCode} size={156} level="M" />
                    ) : vietQrImgUrl ? (
                      <img
                        src={vietQrImgUrl}
                        alt="VietQR Extension"
                        className="w-40 h-40 object-contain"
                      />
                    ) : (
                      <QRCodeSVG value={paymentData.paymentUrl} size={156} level="M" />
                    )}
                    <span className="text-[10px] text-slate-400 font-semibold mt-1.5">
                      Quét bằng mọi App Ngân hàng
                    </span>
                  </div>

                  {/* Transfer Details */}
                  <div className="flex-1 w-full space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70">
                      <span className="text-slate-500">Gia hạn thêm:</span>
                      <span className="font-bold text-slate-900">
                        +{selectedHours} giờ (đến {formatDateTime(newEndDateObj)})
                      </span>
                    </div>

                    {paymentData.accountName && (
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70">
                        <span className="text-slate-500">Chủ tài khoản:</span>
                        <span className="font-bold text-slate-900">{paymentData.accountName}</span>
                      </div>
                    )}

                    {paymentData.accountNumber && (
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70">
                        <span className="text-slate-500">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900">
                            {paymentData.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(paymentData.accountNumber!, 'acc')}
                            className="p-1 rounded hover:bg-blue-100 text-blue-600 cursor-pointer"
                          >
                            {copiedField === 'acc' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70">
                      <span className="text-slate-500">Số tiền thanh toán:</span>
                      <span className="text-base font-extrabold text-blue-600">
                        {formatCurrency(paymentData.amount || totalPayable)} VND
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">Mã đơn PayOS:</span>
                      <span className="font-mono font-bold text-slate-800">
                        #{paymentData.orderCode || paymentData.bookingCode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Open PayOS Gateway in new tab if needed */}
                {paymentData.paymentUrl && (
                  <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Tự động cập nhật ngay khi chuyển khoản
                    </span>
                    <a
                      href={paymentData.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold"
                    >
                      <span>Mở trang cổng PayOS</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {statusNote && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                  {statusNote}
                </div>
              )}
            </div>
          ) : (
            /* STATE C: STEP 1 — SELECT EXTENSION HOURS & REAL COST BREAKDOWN */
            <>
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Select Extension Duration
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Max allowed: {maxHours}h total (up to +{maxAdditionalHours}h)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[1, 3, 6, 12].map((hrs) => {
                    const isSelected = !isCustom && selectedHours === hrs;
                    const isDisabled = hrs > maxAdditionalHours;
                    const priceForHrs = getExtensionBaseFee(hrs);
                    const endForHrs = getNewEndDate(hrs);
                    return (
                      <button
                        key={hrs}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          setIsCustom(false);
                          setSelectedHours(hrs);
                          setCustomHoursInput(hrs.toString());
                        }}
                        className={`relative flex flex-col p-3 rounded-xl border text-left transition-all ${
                          isDisabled
                            ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
                            : isSelected
                              ? 'bg-blue-50/70 border-2 border-blue-600 shadow-xs cursor-pointer'
                              : 'bg-white border-slate-200 hover:border-blue-400 cursor-pointer'
                        }`}
                      >
                        {hrs === 3 && (
                          <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-blue-600 text-white rounded text-[9px] font-bold uppercase">
                            Popular
                          </span>
                        )}
                        <span className="text-sm font-extrabold text-slate-900">
                          +{hrs} {hrs === 1 ? 'Hour' : 'Hours'}
                        </span>
                        <span className="text-xs font-bold text-blue-600 mt-1">
                          {formatCurrency(priceForHrs)} đ
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5 truncate">
                          → {endForHrs.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Hours Row */}
                <div className="mt-3 flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5">
                  <span className="text-xs font-semibold text-slate-700">
                    Hoặc nhập số giờ muốn gia hạn thêm:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={maxAdditionalHours}
                      value={customHoursInput}
                      onFocus={() => setIsCustom(true)}
                      onChange={(e) => {
                        setIsCustom(true);
                        setCustomHoursInput(e.target.value);
                        const parsed = parseInt(e.target.value, 10);
                        if (!isNaN(parsed) && parsed >= 1 && parsed <= maxAdditionalHours) {
                          setSelectedHours(parsed);
                        }
                      }}
                      onBlur={handleApplyCustomHours}
                      className="w-16 h-8 rounded-lg border border-slate-300 bg-white text-center text-xs font-bold text-blue-600 focus:outline-none focus:border-blue-600"
                    />
                    <span className="text-xs text-slate-500 font-medium">giờ</span>
                  </div>
                </div>
              </div>

              {/* 4. Schedule & Real Cost Calculation Summary */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>New End Time: {formatDateTime(newEndDateObj)}</span>
                  </div>
                  <span className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-bold">
                    +{selectedHours} {selectedHours === 1 ? 'Hour' : 'Hours'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>
                      Phí gia hạn (+{selectedHours} giờ × {formatCurrency(effectiveHourlyRate)} đ/h)
                    </span>
                    <span className="text-slate-900 font-semibold">
                      {formatCurrency(extensionBaseFee)} VND
                    </span>
                  </div>

                  {overdueFee > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Phí quá hạn hiện tại (tự động tất toán)
                      </span>
                      <span>+{formatCurrency(overdueFee)} VND</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Gia hạn hiệu lực mã QR &amp; PIN mở tủ</span>
                    <span className="text-emerald-700 font-semibold">Miễn phí (0 VND)</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-slate-900">Total Additional Fee</span>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-blue-600 tracking-tight">
                      {formatCurrency(totalPayable)} VND
                    </span>
                    <div className="text-slate-400 text-[11px]">Thanh toán qua PayOS VietQR</div>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* 6. Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
          {isPaidSuccess ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              Hoàn tất &amp; Quay lại đơn đặt tủ
            </button>
          ) : paymentData ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setPaymentData(null);
                  setStatusNote(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Đổi số giờ</span>
              </button>

              <button
                type="button"
                onClick={handleVerifyPaymentNow}
                disabled={isCheckingPayment}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isCheckingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang đối soát PayOS...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tôi đã chuyển khoản — Kiểm tra ngay</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateExtensionPayment}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PayOS VietQR...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>
                      Proceed to Payment ({formatCurrency(totalPayable)} VND)
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
