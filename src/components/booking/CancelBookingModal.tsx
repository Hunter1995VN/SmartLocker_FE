import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  MapPin,
  CheckCircle,
  Building,
  ChevronDown,
  Info,
  XCircle,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { getCancelPreview, type CancelPreviewDto } from '../../api/bookingService';

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (reason: string) => Promise<void>;
  onSuccess?: (reason: any, _refundAmount?: any) => Promise<void>;
  bookingId?: string;
  bookingCode: string;
  lockerCode?: string;
  stationName?: string;
  paidAmount?: number;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onSuccess,
  bookingId,
  bookingCode,
  lockerCode = 'Standard Locker',
  stationName = 'SmartLocker Station',
  paidAmount = 0,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('Change of plans / Flight delayed');
  const [customReason, setCustomReason] = useState<string>('');
  const [preview, setPreview] = useState<CancelPreviewDto | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(val));
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!bookingId) {
      setPreview({
        bookingId: '',
        bookingCode,
        status: 'CONFIRMED',
        canCancel: true,
        paidAmount: paidAmount || 0,
        refundRate: 1.0,
        refundAmount: paidAmount || 0,
        dailyCancellationCount: 0,
        isDailyLimitExceeded: false,
        policyTier: 'FULL',
        policyDescription: 'Eligible for 100% full refund. Refund request will be sent to Admin for approval.',
      });
      setIsLoadingPreview(false);
      return;
    }

    let isMounted = true;
    setIsLoadingPreview(true);
    setErrorMsg(null);

    getCancelPreview(bookingId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setPreview(res.data);
        } else {
          // Fallback calculation client-side
          setPreview({
            bookingId,
            bookingCode,
            status: 'CONFIRMED',
            canCancel: true,
            paidAmount: paidAmount || 0,
            refundRate: 1.0,
            refundAmount: paidAmount || 0,
            dailyCancellationCount: 0,
            isDailyLimitExceeded: false,
            policyTier: 'FULL',
            policyDescription: 'Eligible for 100% full refund. Refund request will be sent to Admin for approval.',
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setPreview({
          bookingId,
          bookingCode,
          status: 'CONFIRMED',
          canCancel: true,
          paidAmount: paidAmount || 0,
          refundRate: 1.0,
          refundAmount: paidAmount || 0,
          dailyCancellationCount: 0,
          isDailyLimitExceeded: false,
          policyTier: 'FULL',
          policyDescription: 'Eligible for 100% full refund. Refund request will be sent to Admin for approval.',
        });
      })
      .finally(() => {
        if (isMounted) setIsLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, bookingId, bookingCode, paidAmount]);

  if (!isOpen) return null;

  const actualPaid = preview ? preview.paidAmount : (paidAmount || 0);
  const calculatedRefund = preview ? preview.refundAmount : actualPaid;
  const isLimitExceeded = preview?.isDailyLimitExceeded || false;

  const handleSubmit = async () => {
    const finalReason = selectedReason === 'Other' 
      ? (customReason.trim() || 'Other personal circumstances') 
      : selectedReason;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (onConfirm) await onConfirm(finalReason);
      else if (onSuccess) await onSuccess(finalReason, preview?.refundAmount);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 md:p-6 animate-fade-in-up">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-outline-variant/40 overflow-hidden transform transition-all my-auto z-10">
        {/* 1. Modal Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-outline-variant/20 bg-[#f8f9ff]">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-200 shadow-xs">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h2 className="text-xl text-[#0b1c30] font-bold tracking-tight">Cancel Locker Booking</h2>
              <p className="text-xs text-secondary mt-0.5">Release locker reservation &amp; submit automated refund request</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-[#0b1c30] hover:bg-[#eff4ff] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Canvas */}
        <div className="p-6 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 2. Booking Summary Card */}
          <div className="p-4 rounded-xl bg-[#eff4ff] border border-outline-variant/30 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-secondary font-bold">Active Reservation</span>
              <span className="text-xs font-bold text-primary bg-[#dbe1ff]/60 px-2.5 py-0.5 rounded-md font-mono">{bookingCode}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-xs text-secondary block">Compartment</span>
                <span className="text-sm text-[#0b1c30] font-semibold">{lockerCode}</span>
              </div>
              <div>
                <span className="text-xs text-secondary block">Total Paid Amount</span>
                <span className="text-sm text-[#0b1c30] font-bold">{formatCurrency(actualPaid)} VND</span>
              </div>
            </div>
            <div className="pt-1 border-t border-outline-variant/20 flex items-center gap-1.5 text-secondary text-xs">
              <MapPin className="w-3.5 h-3.5 text-secondary" />
              <span>{stationName}</span>
            </div>
          </div>

          {/* 3. Refund Policy Calculation Card */}
          {isLoadingPreview ? (
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500 font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              <span>Evaluating refund policy &amp; abuse-prevention rules...</span>
            </div>
          ) : isLimitExceeded ? (
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  <span>Daily Cancellation Limit Reached (0% Refund)</span>
                </div>
                <span className="text-[11px] text-amber-800 font-mono font-bold">Attempt #{preview ? preview.dailyCancellationCount + 1 : 3} Today</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                To prevent automated reservation spamming, customers who have cancelled 2 bookings today are charged 100% reservation retention on subsequent cancellations. No refund will be credited.
              </p>
              <div className="mt-3 pt-2.5 border-t border-amber-200/80 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Calculated Refund Amount:</span>
                <span className="text-amber-800 font-mono text-sm">0 VND</span>
              </div>
            </div>
          ) : actualPaid <= 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-700 uppercase">Unpaid Booking Cancellation</span>
                <span className="text-xs font-bold text-slate-500">0 VND</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This reservation has not been paid. Cancelling will release the reserved locker compartment immediately without charge.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50/75 border border-emerald-300 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Eligible for 100% Full Refund</span>
                </div>
                <span className="text-[11px] text-emerald-800 font-bold">SmartLocker Policy</span>
              </div>
              <p className="text-xs text-[#0b1c30] leading-relaxed">
                You are cancelling before storage check-in. You will receive a 100% refund of <strong>{formatCurrency(calculatedRefund)} VND</strong>.
              </p>
              <div className="mt-3 pt-2.5 border-t border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-secondary font-medium">Total Refund Payable:</span>
                <span className="text-emerald-700 font-mono font-black text-sm">{formatCurrency(calculatedRefund)} VND</span>
              </div>
            </div>
          )}

          {/* 4. Refund Destination & Admin Workflow Timeline */}
          {actualPaid > 0 && calculatedRefund > 0 && (
            <div className="p-3.5 rounded-xl bg-white border border-outline-variant/30 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center shrink-0 mt-0.5 text-primary">
                <Building className="w-4 h-4" />
              </div>
              <div className="text-xs text-[#0b1c30] leading-snug">
                <span className="font-semibold text-[#0b1c30] block mb-0.5">Admin Review &amp; PayOS Refund</span>
                <p className="text-secondary">
                  A refund ticket for <span className="font-semibold text-[#0b1c30]">{formatCurrency(calculatedRefund)} VND</span> will be automatically submitted to Operations Administration for verification and credited to your original payment account.
                </p>
              </div>
            </div>
          )}

          {/* 5. Cancellation Reason Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#0b1c30]" htmlFor="cancellation-reason">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="cancellation-reason"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full h-11 bg-white border border-outline-variant/60 rounded-xl px-3.5 text-xs text-[#0b1c30] focus:border-primary-container focus:ring-2 focus:ring-primary-container focus:outline-none transition appearance-none pr-10 cursor-pointer"
              >
                <option>Change of plans / Flight delayed</option>
                <option>Booked wrong compartment size</option>
                <option>Trip rescheduled</option>
                <option>Found alternative luggage storage</option>
                <option>Other</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-secondary">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            {selectedReason === 'Other' && (
              <input
                type="text"
                placeholder="Please describe your reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-outline-variant/60 rounded-xl text-xs focus:ring-2 focus:ring-primary-container focus:outline-none"
              />
            )}
          </div>

          {/* Caution Banner */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-snug">
              Once cancelled, the assigned locker compartment will immediately be unlocked and returned to public inventory. Your PIN/QR digital key will be revoked permanently.
            </p>
          </div>
        </div>

        {/* 6. Modal Actions Footer */}
        <div className="px-6 py-4 bg-[#eff4ff] border-t border-outline-variant/20 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-[#0b1c30] text-xs font-semibold border border-outline-variant/60 rounded-xl transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            Keep Reservation
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingPreview}
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Cancellation...</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>
                  Confirm Cancellation {calculatedRefund > 0 ? `(Refund ${formatCurrency(calculatedRefund)} VND)` : ''}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
