import React, { useState } from 'react';
import {
  Timer,
  X,
  MapPin,
  CheckCircle,
  QrCode,
  Copy,
  Lock,
  Check
} from 'lucide-react';

interface ExtendBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (addedHours: number, amount: number) => void;
  lockerCode?: string;
  stationName?: string;
  currentEndTime?: string;
}

export const ExtendBookingModal: React.FC<ExtendBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lockerCode = 'Locker M-04',
  stationName = 'Da Nang Airport Terminal 1 - Domestic Arrival Bay',
  currentEndTime = '17:00 Today'
}) => {
  const [selectedHours, setSelectedHours] = useState<number>(3);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const getPrice = (hours: number) => {
    switch (hours) {
      case 1: return 15000;
      case 3: return 35000;
      case 6: return 60000;
      default: return hours * 15000;
    }
  };

  const getNewEndTime = (hours: number) => {
    switch (hours) {
      case 1: return '18:00 Today';
      case 3: return '20:00 Today';
      case 6: return '23:00 Today';
      default: return `+${hours}h Today`;
    }
  };

  const currentPrice = getPrice(selectedHours);
  const transferCode = `EXT-${lockerCode.replace('Locker ', '').replace('Bay ', '')}-${selectedHours}H`;

  const handleCopy = () => {
    navigator.clipboard.writeText(transferCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 md:p-6 animate-fade-in-up">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-outline-variant/40 overflow-hidden transform transition-all my-auto z-10">
        {/* 1. Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant/30 flex items-start justify-between bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center text-primary-container border border-[#e5eeff]">
              <Timer className="w-6 h-6 text-primary-container" />
            </div>
            <div>
              <h2 className="text-xl text-[#0b1c30] font-bold tracking-tight">Extend Your Rental Time</h2>
              <p className="text-secondary text-xs mt-0.5">Keep your locker reserved without interruption</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-secondary hover:text-[#0b1c30] hover:bg-[#eff4ff] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[calc(86vh-120px)] overflow-y-auto">
          {/* 2. Current Locker Info Card */}
          <div className="bg-[#eff4ff]/80 border border-outline-variant/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base text-[#0b1c30] font-bold">{lockerCode}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#e5eeff] text-secondary font-semibold">Medium Size</span>
              </div>
              <div className="flex items-center gap-1.5 text-secondary text-xs">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{stationName}</span>
              </div>
            </div>
            <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 border-outline-variant/30">
              <span className="text-[11px] text-secondary">Current Expiration</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>{currentEndTime}</span>
              </div>
            </div>
          </div>

          {/* 3. Extension Duration Selector */}
          <div>
            <label className="block text-xs font-bold text-[#0b1c30] mb-2.5">
              Select Extension Duration
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* +1 Hour Card */}
              <div
                onClick={() => setSelectedHours(1)}
                className={`cursor-pointer relative flex flex-col p-3.5 rounded-xl border transition-all text-left ${
                  selectedHours === 1
                    ? 'bg-[#eff4ff]/70 border-2 border-primary-container shadow-xs'
                    : 'bg-white border-outline-variant/60 hover:border-primary/40 hover:bg-[#eff4ff]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[#0b1c30]">+1 Hour</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedHours === 1 ? 'border-primary-container bg-primary-container' : 'border-outline'
                  }`}>
                    {selectedHours === 1 && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                  </div>
                </div>
                <span className="text-xs text-primary font-bold">15,000 VND</span>
                <span className="text-secondary text-[11px] mt-0.5">Until 18:00</span>
              </div>

              {/* +3 Hours Card (Selected Default) */}
              <div
                onClick={() => setSelectedHours(3)}
                className={`cursor-pointer relative flex flex-col p-3.5 rounded-xl border transition-all text-left ${
                  selectedHours === 3
                    ? 'bg-[#eff4ff]/70 border-2 border-primary-container shadow-xs'
                    : 'bg-white border-outline-variant/60 hover:border-primary/40 hover:bg-[#eff4ff]/40'
                }`}
              >
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary-container text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-xs">
                  RECOMMENDED
                </div>
                <div className="flex items-center justify-between mb-2 mt-1">
                  <span className="text-sm font-bold text-primary-container">+3 Hours</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedHours === 3 ? 'border-primary-container bg-primary-container' : 'border-outline'
                  }`}>
                    {selectedHours === 3 && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                  </div>
                </div>
                <span className="text-xs text-primary font-bold">35,000 VND</span>
                <span className="text-secondary text-[11px] mt-0.5">Until 20:00</span>
              </div>

              {/* +6 Hours Card */}
              <div
                onClick={() => setSelectedHours(6)}
                className={`cursor-pointer relative flex flex-col p-3.5 rounded-xl border transition-all text-left ${
                  selectedHours === 6
                    ? 'bg-[#eff4ff]/70 border-2 border-primary-container shadow-xs'
                    : 'bg-white border-outline-variant/60 hover:border-primary/40 hover:bg-[#eff4ff]/40'
                }`}
              >
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#e5eeff] text-primary text-[10px] font-bold uppercase tracking-wider border border-outline-variant/40 rounded-full">
                  BEST VALUE
                </div>
                <div className="flex items-center justify-between mb-2 mt-1">
                  <span className="text-sm font-bold text-[#0b1c30]">+6 Hours</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedHours === 6 ? 'border-primary-container bg-primary-container' : 'border-outline'
                  }`}>
                    {selectedHours === 6 && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                  </div>
                </div>
                <span className="text-xs text-primary font-bold">60,000 VND</span>
                <span className="text-secondary text-[11px] mt-0.5">Until 23:00</span>
              </div>
            </div>
          </div>

          {/* 4. Schedule & Cost Calculation Summary */}
          <div className="p-4 bg-white border border-outline-variant/50 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>New End Time: {getNewEndTime(selectedHours)}</span>
              </div>
              <span className="text-[11px] text-secondary bg-[#e5eeff] px-2 py-0.5 rounded font-medium">
                {selectedHours} Hours Added
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-secondary">
              <div className="flex justify-between">
                <span>Base extension fee (+{selectedHours} Hours)</span>
                <span className="text-[#0b1c30] font-medium">{formatCurrency(currentPrice)} VND</span>
              </div>
              <div className="flex justify-between">
                <span>Luggage protection &amp; insurance</span>
                <span className="text-emerald-700 font-medium">Included (0 VND)</span>
              </div>
              <div className="flex justify-between">
                <span>Napas 24/7 Processing surcharge</span>
                <span className="text-emerald-700 font-medium">0 VND</span>
              </div>
            </div>
            <div className="pt-2 border-t border-outline-variant/30 flex items-baseline justify-between">
              <span className="text-sm font-bold text-[#0b1c30]">Total Additional Fee</span>
              <div className="text-right">
                <span className="text-xl font-extrabold text-primary-container tracking-tight">
                  {formatCurrency(currentPrice)} VND
                </span>
                <div className="text-outline text-[11px] mt-0.5">Inclusive of VAT</div>
              </div>
            </div>
          </div>

          {/* 5. Integrated Payment via VietQR */}
          <div className="p-4 bg-[#eff4ff]/50 border border-outline-variant/40 rounded-xl">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Real Scannable VietQR Box */}
              <div className="relative w-32 h-32 bg-white p-2 rounded-xl border border-outline-variant/60 shadow-xs flex flex-col items-center justify-center shrink-0">
                <div className="w-full flex justify-between items-center px-1">
                  <span className="font-bold text-[8px] text-primary">VIETQR</span>
                  <span className="font-bold text-[7px] text-red-600 bg-red-50 px-1 rounded">napas 247</span>
                </div>
                <QrCode className="w-20 h-20 text-[#0b1c30]" />
                <div className="text-[7px] text-secondary font-bold uppercase mt-1">Auto-Reconcile</div>
              </div>

              {/* QR Transfer Details */}
              <div className="space-y-2 flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1 text-emerald-700 text-xs font-semibold">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Scan with any VN Banking app</span>
                </div>
                <p className="text-secondary text-xs">
                  Open Vietcombank, Techcombank, MB, Momo or any Napas app to scan and extend instantly.
                </p>
                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <div className="bg-white border border-outline-variant/60 rounded-lg px-2.5 py-1 flex items-center gap-2 shadow-xs">
                    <span className="text-xs text-outline">Code:</span>
                    <span className="text-xs font-bold font-mono text-[#0b1c30]">{transferCode}</span>
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded text-primary hover:bg-[#eff4ff] transition-colors cursor-pointer"
                      title="Copy Transfer Code"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Instant Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Modal Actions */}
        <div className="px-6 py-4 bg-[#eff4ff]/60 border-t border-outline-variant/30 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-outline-variant bg-white text-[#0b1c30] text-xs font-semibold hover:bg-[#eff4ff] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onSuccess(selectedHours, currentPrice)}
            className="px-6 py-2.5 rounded-xl bg-primary-container text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Confirm &amp; Pay Extension ({formatCurrency(currentPrice)} VND)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
