import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  WifiOff,
  ShieldCheck,
  Copy,
  Check,
  Download,
  MapPin,
  Clock,
  Key,
  QrCode,
  Sparkles,
  Info
} from 'lucide-react';
import type { OfflineTicketDto } from '../../api/bookingService';

interface OfflineTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: OfflineTicketDto | null;
  isLoading?: boolean;
}

export const OfflineTicketModal: React.FC<OfflineTicketModalProps> = ({
  isOpen,
  onClose,
  ticket,
  isLoading = false
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleCopyPin = () => {
    if (!ticket?.accessPin) return;
    navigator.clipboard.writeText(ticket.accessPin.replace(/\s+/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPin = (pin: string) => {
    const clean = pin.replace(/\s+/g, '');
    if (clean.length === 6) {
      return `${clean.substring(0, 3)} ${clean.substring(3, 6)}`;
    }
    return clean;
  };

  const handleDownloadPass = async () => {
    if (!ticket) return;
    setIsDownloading(true);
    try {
      // Tìm element SVG của QR
      const svgElement = qrRef.current?.querySelector('svg');
      if (!svgElement) {
        setIsDownloading(false);
        return;
      }

      // Tạo canvas để vẽ Boarding Pass offline
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 800;
      const height = 1100;
      canvas.width = width;
      canvas.height = height;

      // 1. Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.3, '#1e293b');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Card container
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(40, 40, width - 80, height - 80, 24);
      ctx.fill();

      // 3. Card Header
      const headerGrad = ctx.createLinearGradient(40, 40, width - 40, 40);
      headerGrad.addColorStop(0, '#1d4ed8');
      headerGrad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = headerGrad;
      ctx.beginPath();
      ctx.roundRect(40, 40, width - 80, 110, [24, 24, 0, 0]);
      ctx.fill();

      // Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('SMARTLOCKER · OFFLINE ACCESS PASS', 70, 95);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#bfdbfe';
      ctx.fillText('Vé mở khóa ngoại tuyến chuẩn HMAC-SHA256 (JWS RFC 7515)', 70, 125);

      // Station Info
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(ticket.stationName || 'Trạm SmartLocker', 70, 200);

      ctx.fillStyle = '#64748b';
      ctx.font = '16px sans-serif';
      ctx.fillText(ticket.stationAddress || 'Điểm đặt trạm thông minh', 70, 230);

      // Compartment Box
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(70, 260, width - 140, 90, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('MÃ ĐƠN HÀNG', 95, 295);
      ctx.fillText('Ô TỦ / KÍCH CỠ', 460, 295);

      ctx.fillStyle = '#1d4ed8';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(ticket.bookingCode, 95, 328);

      const lockerDisplay = ticket.lockerCode ? `Tủ ${ticket.lockerCode} (Size ${ticket.lockerSize})` : `Size ${ticket.lockerSize} Tier`;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(lockerDisplay, 460, 328);

      // Convert SVG QR to Image & Draw on Canvas
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const qrImg = new Image();
      qrImg.onload = () => {
        // Draw white frame for QR
        ctx.fillStyle = '#f1f5f9';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect((width - 340) / 2, 380, 340, 340, 20);
        ctx.fill();
        ctx.stroke();

        ctx.drawImage(qrImg, (width - 300) / 2, 400, 300, 300);

        // QR instruction
        ctx.fillStyle = '#475569';
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Đưa mã QR này cách camera Kiosk 10-15cm để quét mở tủ ngoại tuyến', width / 2, 755);

        // PIN section
        ctx.fillStyle = '#eff6ff';
        ctx.strokeStyle = '#bfdbfe';
        ctx.beginPath();
        ctx.roundRect((width - 420) / 2, 790, 420, 110, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e40af';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('HOẶC NHẬP MÃ PIN 6 SỐ TRÊN MÀN HÌNH KIOSK', width / 2, 825);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 36px monospace';
        ctx.fillText(formatPin(ticket.accessPin), width / 2, 875);

        // Footer / Expiry note
        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        const validText = `Vé có hiệu lực đến: ${new Date(ticket.validUntil).toLocaleString('vi-VN')}`;
        ctx.fillText(validText, width / 2, 940);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('✓ ĐÃ KÝ SỐ MẬT MÃ HMAC · HOẠT ĐỘNG 100% NGOẠI TUYẾN', width / 2, 970);

        // Export and Trigger download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `SmartLocker_Pass_${ticket.bookingCode}.png`;
        link.href = dataUrl;
        link.click();
        URL.revokeObjectURL(blobURL);
        setIsDownloading(false);
      };
      qrImg.src = blobURL;
    } catch (err) {
      console.error('Lỗi khi tải vé ngoại tuyến:', err);
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-xs font-semibold">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Hoạt động 100% Offline</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                Vé Mở Khóa Ngoại Tuyến
              </h3>
              <p className="text-xs text-blue-100">
                Chuẩn mã hóa HMAC-SHA256 (JWS RFC 7515)
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-slate-500 font-medium">Đang tải và xác thực vé mở khóa ngoại tuyến...</p>
            </div>
          ) : !ticket ? (
            <div className="py-12 text-center space-y-3">
              <Info className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">Không tìm thấy vé ngoại tuyến cho đơn đặt này.</p>
            </div>
          ) : (
            <>
              {/* Station & Compartment Info Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{ticket.stationName}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{ticket.stationAddress}</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                    {ticket.bookingCode}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Vị trí ô tủ được cấp:</span>
                  <span className="font-bold text-slate-900">
                    {ticket.lockerCode ? `Tủ ${ticket.lockerCode} (Size ${ticket.lockerSize})` : `Size ${ticket.lockerSize} (Tự động cấp tại Kiosk)`}
                  </span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center space-y-3">
                <div ref={qrRef} className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-md">
                  <QRCodeSVG
                    value={ticket.qrData || ticket.offlineHmacToken}
                    size={220}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 text-center">
                  <QrCode className="w-4 h-4 text-primary shrink-0" />
                  <span>Đưa mã QR này cách camera Kiosk 10–15 cm</span>
                </div>
              </div>

              {/* Monospace 6-Digit PIN */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2 text-center">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                  HOẶC NHẬP MÃ PIN 6 SỐ TRÊN MÀN HÌNH KIOSK
                </span>

                <div className="flex items-center justify-center gap-3">
                  <div className="px-5 py-2.5 bg-white border border-blue-200 rounded-xl flex items-center gap-2 shadow-xs">
                    <Key className="w-4 h-4 text-primary" />
                    <span className="font-mono text-2xl font-bold tracking-widest text-slate-900">
                      {formatPin(ticket.accessPin)}
                    </span>
                  </div>

                  <button
                    onClick={handleCopyPin}
                    className="h-11 px-4 rounded-xl bg-white hover:bg-blue-100/60 border border-blue-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Đã chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-primary" />
                        <span>Chép PIN</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Expiry & Local Cache Guarantee */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-100">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Thời hạn hiệu lực ngoại tuyến:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {new Date(ticket.validUntil).toLocaleString('vi-VN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-500 py-1 border-b border-slate-100">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Thuật toán xác thực:
                  </span>
                  <span className="font-mono font-medium text-slate-700">
                    {ticket.securityAlgorithm}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-start gap-2 text-emerald-900 leading-relaxed">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Vé này đã được đồng bộ tự động vào bộ nhớ trình duyệt thiết bị của bạn. Bạn vẫn có thể mở lại trang web và lấy vé này để mở tủ ngay cả khi điện thoại không có sóng 4G/Wifi.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <button
            onClick={handleDownloadPass}
            disabled={!ticket || isDownloading}
            className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Đang xuất ảnh vé...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Lưu vé vào máy (Ảnh PNG Pass)</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
