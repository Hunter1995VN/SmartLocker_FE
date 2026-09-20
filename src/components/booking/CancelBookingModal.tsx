import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  MapPin,
  CheckCircle,
  Building,
  ChevronDown,
  Info,
  XCircle
} from 'lucide-react';

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reason: string, refundAmount: number) => void;
  bookingCode?: string;
  lockerCode?: string;
  stationName?: string;
  paidAmount?: number;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  bookingCode = '#BK24080101',
  lockerCode = 'Locker M-04 (Medium Size)',
  stationName = 'Da Nang Airport Station - Terminal 1',
  paidAmount = 35000
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('Change of plans / Flight delayed');

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
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
              <p className="text-xs text-secondary mt-0.5">Release compartment reservation &amp; request automated refund</p>
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
                <span className="text-xs text-secondary block">Original Paid Amount</span>
                <span className="text-sm text-[#0b1c30] font-bold">{formatCurrency(paidAmount)} VND</span>
              </div>
            </div>
            <div className="pt-1 border-t border-outline-variant/20 flex items-center gap-1.5 text-secondary text-xs">
              <MapPin className="w-3.5 h-3.5 text-secondary" />
              <span>{stationName}</span>
            </div>
          </div>

          {/* 3. Refund Policy Calculation Card (Rule BR-T06) */}
          <div className="p-4 rounded-xl bg-emerald-50/75 border border-emerald-300 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Eligible for 100% Full Refund</span>
              </div>
              <span className="text-[11px] text-emerald-800 font-bold">Rule BR-T06 Applied</span>
            </div>
            <p className="text-xs text-[#0b1c30] leading-relaxed">
              Cancellations requested more than 2 hours prior to scheduled booking start time receive a complete 100% refund ({formatCurrency(paidAmount)} VND) without penalty fees.
            </p>
            <div className="mt-3 pt-2.5 border-t border-emerald-200 flex items-center justify-between text-xs">
              <span className="text-secondary">Cancellation Timestamp:</span>
              <span className="text-emerald-700 font-bold">11:30 (2h 30m prior to 14:00 start)</span>
            </div>
          </div>

          {/* 4. Refund Destination & Timeline */}
          <div className="p-3.5 rounded-xl bg-white border border-outline-variant/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center shrink-0 mt-0.5 text-primary">
              <Building className="w-4 h-4" />
            </div>
            <div className="text-xs text-[#0b1c30] leading-snug">
              <span className="font-semibold text-[#0b1c30] block mb-0.5">Automated Bank Credit</span>
              <p className="text-secondary">
                <span className="font-semibold text-[#0b1c30]">{formatCurrency(paidAmount)} VND</span> will be credited back to your original payment method <span className="font-semibold text-[#0b1c30]">(MB Bank ****3210)</span> within 24 business hours.
              </p>
            </div>
          </div>

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
                <option>Other personal circumstance</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-secondary">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Caution Banner */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-snug">
              Once cancelled, <strong className="font-semibold">{lockerCode.split('(')[0].trim()}</strong> will immediately be released to public travelers and your cryptographic digital key will become invalid.
            </p>
          </div>
        </div>

        {/* 6. Modal Actions Footer */}
        <div className="px-6 py-4 bg-[#eff4ff] border-t border-outline-variant/20 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-[#0b1c30] text-xs font-semibold border border-outline-variant/60 rounded-xl transition active:scale-[0.98] cursor-pointer"
          >
            Keep Booking
          </button>
          <button
            onClick={() => onSuccess(selectedReason, paidAmount)}
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>Confirm Cancellation (Refund {formatCurrency(paidAmount)} VND)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
