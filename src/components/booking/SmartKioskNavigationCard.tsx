import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Car,
  Footprints,
  AlertTriangle,
  Bell,
  Zap,
  RefreshCw,
  FlaskConical,
  X,
  Clock,
  LocateFixed,
} from 'lucide-react';
import { getStationById } from '../../api/stationService';
import {
  buildGoogleMapsDirectionsUrl,
  calcDistanceKm,
  estimateTravelTime,
  evaluateSmartExtensionAlert,
  formatDistance,
  sendSmartExpiryBrowserNotification,
  type TravelMode,
} from '../../utils/kioskNavigation';

export interface SmartKioskNavigationCardProps {
  bookingId: string;
  bookingCode?: string;
  stationId?: string;
  stationName: string;
  stationAddress: string;
  stationLat?: number;
  stationLng?: number;
  status: string;
  remainingMinutes: number;
  isOverdue?: boolean;
  canExtend?: boolean;
  size?: string;
  hourlyRate?: number;
  overdueFeePerHour?: number;
  onQuickExtend?: (hours: number, autoPay: boolean) => void;
  onOpenMap?: () => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

export const SmartKioskNavigationCard: React.FC<SmartKioskNavigationCardProps> = ({
  bookingId,
  stationId,
  stationName,
  stationAddress,
  stationLat: propLat,
  stationLng: propLng,
  status,
  remainingMinutes,
  isOverdue = false,
  canExtend = true,
  size = 'M',
  hourlyRate,
  overdueFeePerHour,
  onQuickExtend,
  onOpenMap,
}) => {
  const [stationCoords, setStationCoords] = useState<{ lat: number; lng: number } | null>(
    propLat != null && propLng != null ? { lat: Number(propLat), lng: Number(propLng) } : null
  );
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'ready' | 'denied' | 'unsupported'>('loading');
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');

  // Demo Simulator state for thesis defense presentation
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [showFloatingPush, setShowFloatingPush] = useState<boolean>(false);
  const [pushPermissionNote, setPushPermissionNote] = useState<string | null>(null);
  const hasAutoAlertedRef = useRef<string | null>(null);

  // Sync props into stationCoords and fallback to station detail API if coords are missing
  useEffect(() => {
    if (propLat != null && propLng != null && (propLat !== 0 || propLng !== 0)) {
      setStationCoords({ lat: Number(propLat), lng: Number(propLng) });
      return;
    }
    if (!stationId) return;
    let mounted = true;
    getStationById(stationId)
      .then((detail) => {
        if (mounted && detail && detail.latitude != null && detail.longitude != null) {
          setStationCoords({ lat: Number(detail.latitude), lng: Number(detail.longitude) });
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [stationId, propLat, propLng]);

  const requestGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unsupported');
      return;
    }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsStatus('ready');
      },
      () => {
        setGpsStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    requestGps();
  }, [requestGps]);

  const liveDistanceKm =
    userLocation && stationCoords
      ? calcDistanceKm(userLocation.lat, userLocation.lng, stationCoords.lat, stationCoords.lng)
      : null;

  const effectiveDistanceKm = isSimulated ? 6.0 : (liveDistanceKm ?? 0);
  const effectiveRemainingMinutes = isSimulated ? 30 : remainingMinutes;

  const travelEstimate =
    isSimulated || liveDistanceKm != null ? estimateTravelTime(effectiveDistanceKm) : null;

  // Auto-select sensible default mode on GPS load
  useEffect(() => {
    if (!isSimulated && liveDistanceKm != null) {
      setTravelMode(liveDistanceKm <= 0.8 ? 'walking' : 'driving');
    }
  }, [liveDistanceKm, isSimulated]);

  const smartAlert = evaluateSmartExtensionAlert({
    remainingMinutes: effectiveRemainingMinutes,
    distanceKm: effectiveDistanceKm,
    status,
    isOverdue,
    canExtend,
    size,
    hourlyRate,
    overdueFeePerHour,
    isSimulated,
  });

  // Trigger Push Notification automatically when real GPS detects risk
  useEffect(() => {
    if (isSimulated) return;
    if (!smartAlert.shouldAlert || liveDistanceKm == null) return;
    const key = `${bookingId}:${smartAlert.severity}`;
    if (hasAutoAlertedRef.current === key) return;
    hasAutoAlertedRef.current = key;

    setShowFloatingPush(true);
    void sendSmartExpiryBrowserNotification(
      bookingId,
      stationName,
      smartAlert.message,
      () => onQuickExtend?.(smartAlert.recommendedHours, true),
      false
    );
  }, [
    isSimulated,
    smartAlert.shouldAlert,
    smartAlert.severity,
    smartAlert.message,
    smartAlert.recommendedHours,
    liveDistanceKm,
    bookingId,
    stationName,
    onQuickExtend,
  ]);

  const handleToggleSimulation = async () => {
    if (isSimulated) {
      setIsSimulated(false);
      setShowFloatingPush(false);
      setPushPermissionNote(null);
      return;
    }

    setIsSimulated(true);
    setTravelMode('driving');
    setShowFloatingPush(true);

    const simResult = evaluateSmartExtensionAlert({
      remainingMinutes: 30,
      distanceKm: 6.0,
      status,
      isOverdue,
      canExtend,
      size,
      hourlyRate,
      overdueFeePerHour,
      isSimulated: true,
    });

    const sent = await sendSmartExpiryBrowserNotification(
      bookingId,
      stationName,
      simResult.message,
      () => onQuickExtend?.(simResult.recommendedHours, true),
      true
    );
    if (!sent) {
      setPushPermissionNote(
        'Đã bật thông báo giả lập trực tiếp trên màn hình (trình duyệt chưa cấp quyền Push hệ thống).'
      );
    } else {
      setPushPermissionNote(null);
    }
  };

  // For deep link origin in simulated mode if real GPS isn't available, still pass real userLocation if available
  const mapsDeepLink = buildGoogleMapsDirectionsUrl({
    userLat: userLocation?.lat,
    userLng: userLocation?.lng,
    stationLat: stationCoords?.lat,
    stationLng: stationCoords?.lng,
    stationName,
    stationAddress,
    travelMode,
  });

  return (
    <>
      <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-5 space-y-4">
        {/* Header: Station Info + GPS Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Điều hướng đến Kiosk</span>
            </div>
            <h3 className="font-bold text-[#0b1c30] text-base leading-snug">{stationName}</h3>
            <p className="text-xs text-[#434655] leading-relaxed">{stationAddress}</p>
          </div>

          <button
            type="button"
            onClick={requestGps}
            title="Cập nhật lại tọa độ GPS của bạn"
            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-primary text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${gpsStatus === 'loading' ? 'animate-spin' : ''}`} />
            <span>{gpsStatus === 'ready' ? 'GPS Live' : 'Định vị'}</span>
          </button>
        </div>

        {/* Distance & ETA Metrics */}
        <div className="rounded-xl bg-[#f8f9ff] border border-outline-variant/30 p-3.5 space-y-3">
          {travelEstimate ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-[#434655] font-medium block">
                    {isSimulated ? 'Khoảng cách giả lập (Demo)' : 'Khoảng cách từ vị trí bạn'}
                  </span>
                  <span className="text-lg font-extrabold text-[#0b1c30]">
                    Cách trạm {formatDistance(effectiveDistanceKm)}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    smartAlert.shouldAlert
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {smartAlert.shouldAlert ? 'Nguy cơ trễ giờ' : 'Di chuyển thuận lợi'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTravelMode('driving')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    travelMode === 'driving'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Car className="w-3.5 h-3.5 text-blue-600" />
                    <span>Đi xe</span>
                  </div>
                  <div className="text-xs font-semibold mt-0.5">
                    ~{travelEstimate.drivingMinutes} phút
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTravelMode('walking')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    travelMode === 'walking'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Footprints className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đi bộ</span>
                  </div>
                  <div className="text-xs font-semibold mt-0.5">
                    ~{travelEstimate.walkingMinutes} phút
                  </div>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3 text-xs text-[#434655]">
              <span>
                {gpsStatus === 'loading'
                  ? 'Đang xác định tọa độ GPS của bạn để tính thời gian về trạm...'
                  : 'Bấm "Chỉ đường đến Kiosk" để mở Google Maps tự động định vị & vạch lộ trình.'}
              </span>
              {gpsStatus !== 'loading' && (
                <button
                  type="button"
                  onClick={requestGps}
                  className="shrink-0 text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Thử lại
                </button>
              )}
            </div>
          )}

          {/* Deep Link Google Maps CTA */}
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={mapsDeepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99]"
            >
              <Navigation className="w-4 h-4" />
              <span>
                Chỉ đường đến Kiosk ({travelMode === 'walking' ? 'Đi bộ' : 'Đi xe'})
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            {onOpenMap && (
              <button
                type="button"
                onClick={onOpenMap}
                className="py-2.5 px-3.5 rounded-xl bg-white hover:bg-[#eff4ff] border border-outline-variant text-xs font-semibold text-[#0b1c30] transition-colors cursor-pointer"
              >
                Bản đồ trạm
              </button>
            )}
          </div>
        </div>

        {/* Smart Distance-Aware Expiry Alert & 1-Tap PayOS Upsell */}
        {smartAlert.shouldAlert && (
          <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50/70 to-white p-4 space-y-3 shadow-xs animate-fade-in-up">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-amber-950">
                    {smartAlert.title}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-bold">
                    <Clock className="w-3 h-3" /> Còn {smartAlert.remainingMinutes}p · ETA ~{smartAlert.etaMinutes}p
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">{smartAlert.message}</p>
              </div>
            </div>

            {/* Cost Comparison: Extension vs Overdue Fee (UC-T14 vs UC-T19) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                  Gia hạn +{smartAlert.recommendedHours} giờ (UC-T14)
                </span>
                <span className="text-sm font-extrabold text-emerald-800">
                  {formatCurrency(smartAlert.extensionFee)}đ
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold uppercase text-rose-700 block">
                  Phí quá hạn (UC-T19)
                </span>
                <span className="text-sm font-extrabold text-rose-700 line-through decoration-rose-500/70">
                  {formatCurrency(smartAlert.effectiveOverdueFee)}đ/h
                </span>
              </div>
            </div>

            {pushPermissionNote && (
              <p className="text-[11px] text-amber-800 bg-white/80 px-2.5 py-1.5 rounded-lg border border-amber-200">
                {pushPermissionNote}
              </p>
            )}

            {/* 1-Tap PayOS Upsell CTA */}
            <div className="flex flex-col sm:flex-row gap-2">
              {canExtend ? (
                <>
                  <button
                    type="button"
                    onClick={() => onQuickExtend?.(smartAlert.recommendedHours, true)}
                    className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>
                      Gia hạn +{smartAlert.recommendedHours} giờ ngay (PayOS)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickExtend?.(smartAlert.recommendedHours, false)}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Chọn giờ khác
                  </button>
                </>
              ) : (
                <div className="w-full p-2.5 rounded-xl bg-white/90 border border-amber-200 text-[11px] text-amber-900 font-medium">
                  💡 Lưu ý: Tính năng thanh toán gia hạn PayOS khả dụng khi đơn đang ở trạng thái{' '}
                  <strong>ĐANG GỬI ĐỒ (STORED)</strong>.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thesis Demo Simulator Toggle */}
        <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[#434655]">
            <FlaskConical className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Demo cảnh báo theo vị trí &amp; ETA</span>
          </div>
          <button
            type="button"
            onClick={handleToggleSimulation}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              isSimulated
                ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            {isSimulated
              ? 'Tắt giả lập (Về GPS thật)'
              : '🧪 Giả lập: Cách trạm 6km & Còn 30 phút'}
          </button>
        </div>
      </div>

      {/* Floating In-App Push Notification Toast with 1-Tap PayOS Action */}
      {showFloatingPush && smartAlert.shouldAlert && (
        <div
          role="alert"
          className="fixed top-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm bg-[#0b1c30] text-white rounded-2xl shadow-2xl border border-amber-400/50 p-4 space-y-3 animate-fade-in-up"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                  SmartLocker Push Alert
                </span>
                <button
                  type="button"
                  onClick={() => setShowFloatingPush(false)}
                  aria-label="Đóng thông báo"
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-100 mt-1 leading-relaxed">
                {smartAlert.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canExtend && (
              <button
                type="button"
                onClick={() => {
                  setShowFloatingPush(false);
                  onQuickExtend?.(smartAlert.recommendedHours, true);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0b1c30] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>
                  Thanh toán gia hạn PayOS (+{smartAlert.recommendedHours}h · {formatCurrency(smartAlert.extensionFee)}đ)
                </span>
              </button>
            )}
            <a
              href={mapsDeepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Chỉ đường</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartKioskNavigationCard;
