export type TravelMode = 'walking' | 'driving';

export interface TravelTimeEstimate {
  distanceKm: number;
  roadKm: number;
  walkingMinutes: number;
  drivingMinutes: number;
  recommendedMode: TravelMode;
}

export interface GoogleMapsDirectionsParams {
  userLat?: number | null;
  userLng?: number | null;
  stationLat?: number | null;
  stationLng?: number | null;
  stationName?: string;
  stationAddress?: string;
  travelMode?: TravelMode;
}

export interface SmartExtensionAlertParams {
  remainingMinutes: number;
  distanceKm: number;
  status: string;
  isOverdue?: boolean;
  canExtend?: boolean;
  size?: string;
  hourlyRate?: number;
  overdueFeePerHour?: number;
  isSimulated?: boolean;
}

export interface SmartExtensionAlertResult {
  shouldAlert: boolean;
  severity: 'none' | 'warning' | 'urgent';
  distanceKm: number;
  etaMinutes: number;
  walkingMinutes: number;
  drivingMinutes: number;
  remainingMinutes: number;
  recommendedHours: number;
  extensionFee: number;
  effectiveHourlyRate: number;
  effectiveOverdueFee: number;
  title: string;
  message: string;
}

/** Tính khoảng cách Haversine (km) làm tròn 2 chữ số thập phân */
export function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(km * 100) / 100;
}

/** Định dạng hiển thị khoảng cách: "450 m" hoặc "2.5 km" */
export function formatDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return '—';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/** Ước tính thời gian di chuyển thực tế theo đường bộ (đi bộ & đi xe) */
export function estimateTravelTime(distanceKm: number): TravelTimeEstimate {
  const safeKm = Math.max(0, Number.isFinite(distanceKm) ? distanceKm : 0);
  const roadKm = Math.round(safeKm * 1.3 * 100) / 100;
  const walkingMinutes = Math.max(2, Math.round((roadKm / 4.8) * 60));
  const drivingMinutes = Math.max(3, Math.round((roadKm / 35) * 60 + 2));
  const recommendedMode: TravelMode = safeKm <= 0.8 ? 'walking' : 'driving';

  return {
    distanceKm: safeKm,
    roadKm,
    walkingMinutes,
    drivingMinutes,
    recommendedMode,
  };
}

/** Tạo Google Maps Universal Deep Link để mở trực tiếp ứng dụng Google Maps với lộ trình vạch sẵn */
export function buildGoogleMapsDirectionsUrl({
  userLat,
  userLng,
  stationLat,
  stationLng,
  stationName,
  stationAddress,
  travelMode = 'driving',
}: GoogleMapsDirectionsParams): string {
  const params = new URLSearchParams({
    api: '1',
    travelmode: travelMode,
  });

  if (
    userLat != null &&
    userLng != null &&
    Number.isFinite(userLat) &&
    Number.isFinite(userLng)
  ) {
    params.set('origin', `${userLat},${userLng}`);
  }

  if (
    stationLat != null &&
    stationLng != null &&
    Number.isFinite(stationLat) &&
    Number.isFinite(stationLng) &&
    (stationLat !== 0 || stationLng !== 0)
  ) {
    params.set('destination', `${stationLat},${stationLng}`);
  } else {
    const query = `${stationName || ''} ${stationAddress || ''}`.trim() || 'SmartLocker';
    params.set('destination', query);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Đánh giá nguy cơ trễ giờ dựa trên khoảng cách GPS thực tế + ETA và đưa ra gợi ý gia hạn PayOS */
export function evaluateSmartExtensionAlert({
  remainingMinutes,
  distanceKm,
  status,
  isOverdue = false,
  canExtend = true,
  size = 'M',
  hourlyRate,
  overdueFeePerHour,
  isSimulated = false,
}: SmartExtensionAlertParams): SmartExtensionAlertResult {
  const travel = estimateTravelTime(distanceKm);
  const etaMinutes =
    travel.recommendedMode === 'walking' ? travel.walkingMinutes : travel.drivingMinutes;

  const effectiveHourlyRate =
    hourlyRate && hourlyRate > 0
      ? hourlyRate
      : size === 'S'
        ? 10000
        : size === 'L'
          ? 20000
          : 15000;

  const effectiveOverdueFee =
    overdueFeePerHour && overdueFeePerHour > 0
      ? overdueFeePerHour
      : effectiveHourlyRate * 2;

  const isEligibleStatus = isSimulated || (status === 'STORED' && !isOverdue && canExtend);
  const safeRemaining = Math.max(0, Math.round(remainingMinutes));

  const isRisky =
    isEligibleStatus &&
    safeRemaining > 0 &&
    (safeRemaining <= etaMinutes + 10 || (safeRemaining <= 45 && distanceKm >= 2.5));

  const recommendedHours = Math.max(1, Math.ceil((etaMinutes + 25 - safeRemaining) / 60));
  const extensionFee = recommendedHours * effectiveHourlyRate;

  if (!isRisky) {
    return {
      shouldAlert: false,
      severity: 'none',
      distanceKm,
      etaMinutes,
      walkingMinutes: travel.walkingMinutes,
      drivingMinutes: travel.drivingMinutes,
      remainingMinutes: safeRemaining,
      recommendedHours,
      extensionFee,
      effectiveHourlyRate,
      effectiveOverdueFee,
      title: '',
      message: '',
    };
  }

  const severity = safeRemaining <= etaMinutes ? 'urgent' : 'warning';
  const title =
    severity === 'urgent'
      ? '⚠️ Nguy cơ quá hạn: Bạn đang ở khá xa trạm!'
      : '⏰ Nhắc nhở: Thời gian thuê sắp hết';
  const message = `Thời gian gửi đồ sắp hết (còn ${safeRemaining} phút) nhưng bạn đang ở khá xa trạm (${distanceKm.toFixed(1)} km — ước tính ~${etaMinutes} phút di chuyển). Bạn có muốn gia hạn thêm +${recommendedHours} giờ để tránh phí phạt quá hạn không?`;

  return {
    shouldAlert: true,
    severity,
    distanceKm,
    etaMinutes,
    walkingMinutes: travel.walkingMinutes,
    drivingMinutes: travel.drivingMinutes,
    remainingMinutes: safeRemaining,
    recommendedHours,
    extensionFee,
    effectiveHourlyRate,
    effectiveOverdueFee,
    title,
    message,
  };
}

/** Bắn Browser Push Notification (kèm chống spam theo phiên trừ khi force=true khi demo) */
export async function sendSmartExpiryBrowserNotification(
  bookingId: string,
  stationName: string,
  message: string,
  onClickExtend?: () => void,
  force: boolean = false
): Promise<boolean> {
  const storageKey = `smartlocker_eta_alert_${bookingId}`;
  try {
    if (!force && sessionStorage.getItem(storageKey)) {
      return false;
    }
    sessionStorage.setItem(storageKey, new Date().toISOString());
  } catch {
    // Ignore sessionStorage errors in restricted browser contexts
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      return false;
    }

    const notification = new Notification(
      `⚠️ SmartLocker · ${stationName}`,
      {
        body: message,
        icon: '/smartlocker_icon.jpg',
        tag: `smartlocker-eta-${bookingId}`,
      }
    );

    notification.onclick = () => {
      try {
        window.focus();
      } catch {}
      if (onClickExtend) onClickExtend();
      notification.close();
    };

    return true;
  } catch {
    return false;
  }
}
