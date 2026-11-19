import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Search, MapPin, Navigation, Zap,
    Shield, Clock, RefreshCw, ChevronRight,
    ArrowRight, Phone, Package, ReceiptText, Lock, Star, Calendar, ExternalLink, AlertTriangle,
} from 'lucide-react';
import { getStations, calcDistance } from '../api/stationService';
import type { Station } from '../api/stationService';
import { getMyBookings } from '../api/bookingService';
import type { BookingListItemDto } from '../api/bookingService';
import { getApiErrorMessage, resolveAssetUrl } from '../api/client';
import { ExtendBookingModal } from '../components/booking/ExtendBookingModal';
import {
    buildGoogleMapsDirectionsUrl,
    calcDistanceKm,
    estimateTravelTime,
    evaluateSmartExtensionAlert,
    sendSmartExpiryBrowserNotification,
} from '../utils/kioskNavigation';
import CustomerHeader from '../components/layout/CustomerHeader';
import { CONTACT, openLegal, openSupport } from '../utils/contact';
import { parseServerTime } from '../utils/serverTime';
import { classifyGeoError, watchGeoAvailability, GEO_OS_BLOCKED_HINT } from '../utils/geolocation';
import { useT, useLanguage } from '../i18n';

// ─── Types ───────────────────────────────────────────────
interface AuthUser {
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    avatarUrl?: string;
}

interface DashboardPageProps {
    onLogout: () => void;
    onNavigateToMap?: () => void;
    onNavigateToAdmin?: () => void;
    onNavigate?: (page: string, data?: any) => void;
}

type LocationState = 'locating' | 'granted' | 'denied' | 'os-blocked' | 'unavailable' | 'timeout' | 'unsupported';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
    PENDING_PAYMENT: { label: 'CHỜ THANH TOÁN', className: 'bg-warning-container text-on-warning-container' },
    CONFIRMED: { label: 'ĐÃ THANH TOÁN', className: 'bg-primary-fixed text-on-primary-fixed' },
    STORED: { label: 'ĐANG GỬI ĐỒ', className: 'bg-tertiary-fixed text-on-tertiary-fixed' },
    COMPLETED: { label: 'HOÀN THÀNH', className: 'bg-tertiary-fixed text-on-tertiary-fixed' },
    COMPLETED_MANUAL: { label: 'HOÀN THÀNH', className: 'bg-tertiary-fixed text-on-tertiary-fixed' },
    CANCELLED: { label: 'ĐÃ HỦY', className: 'bg-surface-container-high text-on-surface-variant' },
    NO_SHOW: { label: 'KHÔNG ĐẾN', className: 'bg-error-container text-on-error-container' },
    EXPIRED: { label: 'HẾT HẠN', className: 'bg-surface-container-high text-on-surface-variant' },
};

function fetchDashboardData() {
    return Promise.allSettled([getMyBookings(undefined, 1, 20), getStations()]);
}
type DashboardResults = Awaited<ReturnType<typeof fetchDashboardData>>;

const SIZE_DIMENSIONS: Record<string, string> = { S: '45×45×65', M: '65×45×65', L: '95×55×65' };

// ─── Helpers ───────────────────────────────────────────────
function getGreeting(name: string, t: ReturnType<typeof useT>): string {
    const h = new Date().getHours();
    if (h < 12) return t('Chào buổi sáng, {name}!', { name });
    if (h < 18) return t('Chào buổi chiều, {name}!', { name });
    return t('Chào buổi tối, {name}!', { name });
}

function formatDate(lang: string): string {
    return new Date().toLocaleDateString(lang === 'EN' ? 'en-GB' : 'vi-VN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
}

function formatDistance(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function formatDuration(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTime(iso?: string): string {
    if (!iso) return '--:--';
    return new Date(parseServerTime(iso)).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function readUser(): AuthUser {
    try {
        return JSON.parse(localStorage.getItem('smartlocker_user') || '{}');
    } catch {
        return {} as AuthUser;
    }
}

const availableOf = (s: Station, size: 'S' | 'M' | 'L') =>
    (size === 'S' ? s.availableS : size === 'M' ? s.availableM : s.availableL) ?? 0;
const totalOf = (s: Station, size: 'S' | 'M' | 'L') => (size === 'S' ? s.totalS : size === 'M' ? s.totalM : s.totalL) ?? 0;

// ─── Main Component ───────────────────────────────────────────────
export default function DashboardPage({ onLogout, onNavigateToMap, onNavigateToAdmin, onNavigate }: DashboardPageProps) {
    const t = useT();
    const { lang } = useLanguage();
    const [user, setUser] = useState<AuthUser>(readUser);
    const isAdminOrStaff = (user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'staff';
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [autoExtendPayOS, setAutoExtendPayOS] = useState(false);
    const [extendHours, setExtendHours] = useState(1);

    const [bookings, setBookings] = useState<BookingListItemDto[]>([]);
    const [totalBookings, setTotalBookings] = useState(0);
    const [stations, setStations] = useState<Station[]>([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(true);
    const [isLoadingStations, setIsLoadingStations] = useState(true);
    const [bookingsError, setBookingsError] = useState('');
    const [stationsError, setStationsError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [now, setNow] = useState(() => Date.now());

    const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [locState, setLocState] = useState<LocationState>(() => (typeof navigator !== 'undefined' && navigator.geolocation ? 'locating' : 'unsupported'));

    // Ảnh đại diện/tên mới từ trang Hồ sơ hiện ngay, không cần tải lại trang
    useEffect(() => {
        const refresh = () => setUser(readUser());
        window.addEventListener('smartlocker:profile-updated', refresh);
        return () => window.removeEventListener('smartlocker:profile-updated', refresh);
    }, []);

    // Gọi API (không đặt state) và áp kết quả (đặt state) tách riêng: effect chỉ đặt state trong callback `.then`, không đồng bộ.
    const applyResults = useCallback(([bookingsResult, stationsResult]: DashboardResults) => {
        if (bookingsResult.status === 'fulfilled' && bookingsResult.value.success) {
            setBookings(bookingsResult.value.data.items);
            setTotalBookings(bookingsResult.value.data.totalCount);
            setBookingsError('');
        } else {
            setBookings([]);
            setBookingsError(bookingsResult.status === 'rejected'
                ? getApiErrorMessage(bookingsResult.reason, t('Không tải được lịch sử đặt chỗ.'))
                : t('Không tải được lịch sử đặt chỗ.'));
        }
        setIsLoadingBookings(false);
        if (stationsResult.status === 'fulfilled') {
            setStations(stationsResult.value);
            setStationsError('');
        } else {
            setStations([]);
            setStationsError(getApiErrorMessage(stationsResult.reason, t('Không tải được danh sách trạm.')));
        }
        setIsLoadingStations(false);
    }, []);

    // Bấm "Thử lại" / làm mới: bật lại trạng thái đang tải rồi tải lại.
    const loadData = useCallback(() => {
        setIsLoadingBookings(true);
        setIsLoadingStations(true);
        setBookingsError('');
        setStationsError('');
        void fetchDashboardData().then(applyResults);
    }, [applyResults]);

    // Lần đầu: trạng thái "đang tải" đã là true từ useState.
    useEffect(() => {
        let alive = true;
        void fetchDashboardData().then((results) => { if (alive) applyResults(results); });
        return () => { alive = false; };
    }, [applyResults]);

    // Vị trí thật của người dùng (một lần khi mở trang, có thể bấm thử lại)
    const onPosition = useCallback((pos: GeolocationPosition) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocState('granted'); }, []);
    const onPositionError = useCallback((err: GeolocationPositionError) => { void classifyGeoError(err).then(setLocState); }, []);
    // Bấm "Thử lại": đặt lại trạng thái "đang xác định" rồi hỏi vị trí.
    const locate = useCallback(() => {
        if (!navigator.geolocation) { setLocState('unsupported'); return; }
        setLocState('locating');
        navigator.geolocation.getCurrentPosition(onPosition, onPositionError, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    }, [onPosition, onPositionError]);
    // Lần đầu: trạng thái khởi tạo đã là "locating" (hoặc "unsupported"), chỉ cần hỏi vị trí.
    useEffect(() => {
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(onPosition, onPositionError, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    }, [onPosition, onPositionError]);
    // Allowing location in the address bar or switching on OS location services takes effect without a reload.
    const locStateRef = useRef(locState);
    useEffect(() => { locStateRef.current = locState; }, [locState]);
    useEffect(() => watchGeoAvailability(() => {
        if (['denied', 'os-blocked', 'unavailable', 'timeout'].includes(locStateRef.current)) locate();
    }), [locate]);

    // Đơn đang hoạt động thật: ưu tiên đơn đang gửi đồ, sau đó đơn đã thanh toán chờ gửi
    const activeBooking = useMemo(
        () => bookings.find((b) => b.status === 'STORED') ?? bookings.find((b) => b.status === 'CONFIRMED') ?? null,
        [bookings],
    );
    const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings]);

    // Đồng hồ chỉ chạy khi có đơn đang hoạt động
    useEffect(() => {
        if (!activeBooking) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [activeBooking]);

    const stationsWithDistance = useMemo(
        () => stations
            .filter((s) => s.status === 'ACTIVE')
            .map((s) => ({ ...s, distanceKm: userLoc ? calcDistance(userLoc.lat, userLoc.lng, Number(s.latitude), Number(s.longitude)) : undefined })),
        [stations, userLoc],
    );

    const nearbyStations = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const list = stationsWithDistance.filter((s) => !q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
        const sorted = userLoc ? [...list].sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)) : list;
        return sorted.slice(0, 3);
    }, [stationsWithDistance, searchQuery, userLoc]);

    const nearestStation = useMemo(
        () => (userLoc ? [...stationsWithDistance].sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))[0] : undefined),
        [stationsWithDistance, userLoc],
    );

    // Trạm hiển thị mô hình tủ: trạm của đơn đang hoạt động, nếu không có thì trạm gần nhất
    const modelStation = useMemo(
        () => stationsWithDistance.find((s) => s.id === activeBooking?.stationId) ?? nearestStation ?? stationsWithDistance[0],
        [stationsWithDistance, activeBooking, nearestStation],
    );

    const activeStation = stationsWithDistance.find((s) => s.id === activeBooking?.stationId);

    // Compute live distance, ETA & smart alert for activeBooking
    const activeStationLat = activeBooking?.stationLatitude ?? (activeStation ? Number(activeStation.latitude) : undefined);
    const activeStationLng = activeBooking?.stationLongitude ?? (activeStation ? Number(activeStation.longitude) : undefined);
    const activeDistanceKm =
        activeBooking && userLoc && activeStationLat != null && activeStationLng != null
            ? calcDistanceKm(userLoc.lat, userLoc.lng, activeStationLat, activeStationLng)
            : null;
    const activeTravel = activeDistanceKm != null ? estimateTravelTime(activeDistanceKm) : null;
    const activeRemainingMinutes = activeBooking
        ? Math.max(0, Math.round((new Date(parseServerTime(activeBooking.endAt)).getTime() - now) / 60000))
        : 0;
    const activeSmartAlert =
        activeBooking && activeDistanceKm != null
            ? evaluateSmartExtensionAlert({
                remainingMinutes: activeRemainingMinutes,
                distanceKm: activeDistanceKm,
                status: activeBooking.status,
                isOverdue: activeBooking.isOverdue,
                canExtend: activeBooking.canExtend ?? activeBooking.status === 'STORED',
                size: activeBooking.size,
                hourlyRate: activeBooking.hourlyRate,
                overdueFeePerHour: activeBooking.overdueFeePerHour,
            })
            : null;

    useEffect(() => {
        if (activeBooking && activeSmartAlert?.shouldAlert) {
            void sendSmartExpiryBrowserNotification(
                activeBooking.id,
                activeBooking.stationName,
                activeSmartAlert.message,
                () => {
                    setExtendHours(activeSmartAlert.recommendedHours);
                    setAutoExtendPayOS(true);
                    setShowExtendModal(true);
                },
                false
            );
        }
    }, [activeBooking?.id, activeSmartAlert?.shouldAlert]);

    const handleLogout = () => {
        localStorage.clear();
        onLogout();
    };

    const goDetail = (id: string) => onNavigate?.('booking-detail', { bookingId: id });
    const goMap = () => { if (onNavigateToMap) onNavigateToMap(); else onNavigate?.('find-station'); };
    const goBook = (stationId: string) => onNavigate?.('station-booking', { stationId });

    const locationText = (() => {
        if (locState === 'locating') return t('Đang xác định vị trí...');
        if (locState === 'granted') return nearestStation ? t('Trạm gần bạn: {name} ({d})', { name: nearestStation.name, d: formatDistance(nearestStation.distanceKm ?? 0) }) : t('Đã xác định vị trí của bạn');
        if (locState === 'denied') return t('Vị trí đang bị chặn. Cho phép vị trí để thấy trạm gần bạn.');
        if (locState === 'os-blocked') return GEO_OS_BLOCKED_HINT;
        if (locState === 'unsupported') return t('Trình duyệt không hỗ trợ định vị.');
        return t('Chưa xác định được vị trí của bạn.');
    })();

    if (!user.fullName) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-bright">
                <p className="text-on-surface-variant">{t('Không tìm thấy dữ liệu đăng nhập.')}</p>
            </div>
        );
    }

    const isStored = activeBooking?.status === 'STORED';
    const countdownTarget = isStored ? activeBooking?.endAt : activeBooking?.holdExpiresAt ?? activeBooking?.startAt;
    const timeLeftMs = countdownTarget ? parseServerTime(countdownTarget) - now : 0;
    const progress = (() => {
        if (!activeBooking || !isStored) return 0;
        const total = parseServerTime(activeBooking.endAt) - parseServerTime(activeBooking.startAt);
        if (total <= 0) return 0;
        return Math.min(100, Math.max(0, ((parseServerTime(activeBooking.endAt) - now) / total) * 100));
    })();

    return (
        <div className="min-h-screen bg-surface-bright font-sans">
            <CustomerHeader
                currentPage="dashboard"
                onNavigate={(page, data) => {
                    if (page === 'find-station') goMap();
                    else if (onNavigate) onNavigate(page, data);
                }}
                onLogout={handleLogout}
            />

            <main className="w-full">
                <div className="w-full px-4 md:px-6 lg:px-8 py-8">
                    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">

                        {isAdminOrStaff && (
                            <div className="w-full bg-primary-container text-white rounded-2xl p-4 md:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                                        <Shield className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-sm md:text-base">
                                            {t('Bạn đang đăng nhập bằng tài khoản')} {user.role || t('Quản trị viên')}
                                        </h3>
                                        <p className="text-sm text-primary-fixed mt-0.5">
                                            {t('Để quản lý trạm, giám sát thiết bị, cảnh báo sự cố và doanh thu, vui lòng mở Operations Dashboard')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onNavigateToAdmin ? onNavigateToAdmin : () => { window.location.href = '/admin'; }}
                                    className="px-5 py-2.5 bg-white text-primary hover:bg-primary-fixed font-bold text-sm min-h-11 rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2"
                                >
                                    <span>{t('Mở Admin Portal (Dashboard)')}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* ── WELCOME HERO ── */}
                        <div className="relative overflow-hidden rounded-2xl bg-white shadow-xs p-4 sm:p-6 md:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">

                            <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                                    {user.avatarUrl ? (
                                        <img
                                            src={resolveAssetUrl(user.avatarUrl)}
                                            alt={user.fullName}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        (user.fullName || 'U').charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 min-w-0">
                                    <h1 className="text-xl sm:text-2xl md:text-[28px] font-bold leading-8 sm:leading-9 tracking-tight text-on-surface break-words">
                                        {getGreeting(user.fullName, t)} <span aria-hidden="true">👋</span>
                                    </h1>
                                    <p className="text-sm text-on-surface-variant flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-primary-container" aria-hidden="true" />
                                            {formatDate(lang)}
                                        </span>
                                        <span className="text-outline-variant hidden sm:inline">·</span>
                                        <span
                                            role="status"
                                            className={`hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-md ${locState === 'granted' ? 'text-primary-container bg-surface-container-low' : 'text-on-warning-container bg-warning-container'}`}
                                        >
                                            {locationText}
                                        </span>
                                        {(locState === 'denied' || locState === 'os-blocked' || locState === 'unavailable' || locState === 'timeout') && (
                                            <button type="button" onClick={locate} className="link-target hidden sm:inline-flex text-xs font-bold text-primary underline cursor-pointer">{t('Thử lại')}</button>
                                        )}
                                    </p>
                                </div>
                            </div>

                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                            {/* ── LEFT COLUMN ── */}
                            <div className="lg:col-span-8 flex flex-col gap-8 min-w-0">

                                {/* Active Booking */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-[18px] font-semibold text-on-surface">{t('Đặt chỗ hiện tại')}</h2>
                                    </div>

                                    {isLoadingBookings ? (
                                        <div className="rounded-2xl bg-white p-8 flex justify-center" role="status" aria-label={t('Đang tải')}><RefreshCw className="w-6 h-6 animate-spin motion-reduce:animate-none text-primary-container" aria-hidden="true" /></div>
                                    ) : bookingsError ? (
                                        <div className="rounded-2xl bg-white p-8 flex flex-col items-center gap-3 text-center">
                                            <p className="text-sm text-on-error-container">{bookingsError}</p>
                                            <button type="button" onClick={loadData} className="px-4 py-2 rounded-xl bg-surface-container text-primary text-sm font-semibold cursor-pointer">{t('Thử lại')}</button>
                                        </div>
                                    ) : activeBooking ? (
                                        <div className="relative overflow-hidden rounded-2xl bg-white shadow-xs p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6">
                                            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-outline-soft">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${STATUS_LABEL[activeBooking.status]?.className ?? 'bg-surface-container-high text-on-surface-variant'}`}>
                                                        {STATUS_LABEL[activeBooking.status] ? t(STATUS_LABEL[activeBooking.status].label) : activeBooking.status}
                                                    </span>
                                                    <span className="text-sm text-on-surface-variant font-mono">#{activeBooking.bookingCode}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                                                <div className="md:col-span-7 flex flex-col justify-between gap-3 bg-surface-container-low p-4 rounded-xl">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                                            <h3 className="text-[22px] font-bold leading-7 text-on-surface">{activeBooking.stationName}</h3>
                                                            {activeDistanceKm != null && activeTravel && (
                                                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-primary border border-blue-200">
                                                                    {formatDistance(activeDistanceKm)} · ~{activeTravel.recommendedMode === 'walking' ? activeTravel.walkingMinutes : activeTravel.drivingMinutes}p
                                                                </span>
                                                            )}
                                                        </div>
                                                        {activeBooking.stationAddress && (
                                                            <p className="text-sm text-on-surface-variant flex items-start gap-1">
                                                                <Navigation className="w-4 h-4 text-on-surface-muted shrink-0 mt-0.5" />
                                                                <span>{activeBooking.stationAddress}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2">
                                                        <div className="flex items-center gap-1.5 text-sm text-on-surface">
                                                            <Package className="w-4 h-4 text-primary" />
                                                            <span>
                                                                {activeBooking.lockerCode
                                                                    ? <>{t('Ngăn:')} <strong className="font-bold text-primary-container">{t('Tủ')} {activeBooking.lockerCode}</strong></>
                                                                    : t('Ngăn sẽ được gán khi bạn gửi đồ tại kiosk')}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm text-on-surface-variant">Size {activeBooking.size} ({SIZE_DIMENSIONS[activeBooking.size] ?? '—'} cm)</span>
                                                    </div>
                                                </div>

                                                <div className="md:col-span-5 bg-surface-container p-4 rounded-xl flex flex-col justify-between gap-3">
                                                    <span className="text-xs font-bold text-on-surface-variant">
                                                        {isStored ? t('Thời gian còn lại') : t('Giữ chỗ còn')}
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <div className={`text-[32px] font-bold tracking-tight ${timeLeftMs <= 0 && isStored ? 'text-error' : 'text-primary'}`}>
                                                            {timeLeftMs > 0 ? formatDuration(timeLeftMs) : isStored ? t('Đã hết giờ') : '00:00:00'}
                                                        </div>
                                                        <span className="text-sm text-on-surface-variant mt-0.5">
                                                            {isStored ? t('Hết hạn lúc {time}', { time: formatTime(activeBooking.endAt) }) : t('Bắt đầu từ {time}', { time: formatTime(activeBooking.startAt) })}
                                                        </span>
                                                    </div>
                                                    {isStored && (
                                                        <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                                                            <div className="bg-primary-container h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Smart Distance & ETA Alert Banner */}
                                            {activeSmartAlert?.shouldAlert && (
                                                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex items-start gap-2.5">
                                                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-xs font-extrabold text-amber-950">{activeSmartAlert.title}</p>
                                                            <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">{activeSmartAlert.message}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setExtendHours(activeSmartAlert.recommendedHours);
                                                            setAutoExtendPayOS(true);
                                                            setShowExtendModal(true);
                                                        }}
                                                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                                                    >
                                                        <Zap className="w-4 h-4" />
                                                        <span>Gia hạn +{activeSmartAlert.recommendedHours}h ngay (PayOS)</span>
                                                    </button>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-surface-bright rounded-xl text-center">
                                                <InfoCell label={t('Thời lượng')} value={activeBooking.durationHours ? t('{n} giờ', { n: activeBooking.durationHours }) : '—'} />
                                                <InfoCell label={t('Đã thanh toán')} value={`${activeBooking.baseAmount.toLocaleString('vi-VN')}đ`} />
                                                <InfoCell label={t('Khoảng cách & ETA')} value={activeDistanceKm != null && activeTravel ? `${formatDistance(activeDistanceKm)} (~${activeTravel.drivingMinutes}p)` : '—'} />
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                                                <div className="flex flex-wrap items-center gap-2 flex-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => goDetail(activeBooking.id)}
                                                        className="basis-full sm:basis-auto sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-container text-white text-sm font-semibold hover:bg-on-primary-fixed-variant transition-colors cursor-pointer"
                                                    >
                                                        <Lock className="w-5 h-5" />
                                                        {t('Xem vé & mã mở tủ')}
                                                    </button>
                                                    {activeBooking.canExtend && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setExtendHours(1);
                                                                setAutoExtendPayOS(false);
                                                                setShowExtendModal(true);
                                                            }}
                                                            className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-4 py-3 min-h-11 rounded-xl bg-white border border-outline-soft text-on-surface text-sm font-semibold hover:bg-surface-bright transition-colors cursor-pointer"
                                                        >
                                                            <Clock className="w-4 h-4 text-primary-container" />
                                                            {t('Gia hạn')}
                                                        </button>
                                                    )}
                                                    <a
                                                        href={buildGoogleMapsDirectionsUrl({
                                                            userLat: userLoc?.lat,
                                                            userLng: userLoc?.lng,
                                                            stationLat: activeStationLat,
                                                            stationLng: activeStationLng,
                                                            stationName: activeBooking.stationName,
                                                            stationAddress: activeBooking.stationAddress,
                                                            travelMode: activeTravel?.recommendedMode ?? 'driving',
                                                        })}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-4 py-3 min-h-11 rounded-xl bg-white border border-outline-soft text-on-surface text-sm font-semibold hover:bg-surface-bright transition-colors cursor-pointer"
                                                    >
                                                        <Navigation className="w-4 h-4 text-tertiary-container" />
                                                        <span>{t('Chỉ đường đến Kiosk')}</span>
                                                        <ExternalLink className="w-3.5 h-3.5 text-on-surface-muted" />
                                                    </a>
                                                </div>
                                                <button type="button" onClick={openSupport} className="text-sm text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1 py-2 cursor-pointer">
                                                    <Phone className="w-4 h-4" />
                                                    {t('Cần trợ giúp khẩn cấp?')}
                                                </button>
                                            </div>
                                            <p className="text-sm text-on-surface-variant -mt-2">{t('Đưa mã QR hoặc PIN trước kiosk tại trạm để mở tủ.')}</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl bg-white shadow-xs p-8 flex flex-col items-center text-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center">
                                                <Package className="w-7 h-7 text-primary-container" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-on-surface">{t('Bạn chưa có đặt chỗ nào đang hoạt động')}</p>
                                                <p className="text-sm text-on-surface-variant mt-1">{t('Hãy tìm trạm tủ gần bạn để đặt chỗ ngay!')}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={goMap}
                                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-container text-white text-sm font-semibold hover:bg-on-primary-fixed-variant transition-colors cursor-pointer"
                                            >
                                                <MapPin className="w-4 h-4" />
                                                {t('Tìm trạm ngay')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Recent Bookings */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[18px] font-semibold text-on-surface">{t('Lịch sử đặt chỗ gần đây')}</h2>
                                        <button type="button" onClick={() => onNavigate?.('my-bookings')} className="link-target text-sm font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer">
                                            {t('Xem tất cả lịch sử (')}{totalBookings}) <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {isLoadingBookings ? (
                                            <div className="flex justify-center p-4" role="status" aria-label={t('Đang tải')}><RefreshCw className="w-5 h-5 animate-spin motion-reduce:animate-none text-primary-container" aria-hidden="true" /></div>
                                        ) : bookingsError ? null : recentBookings.length > 0 ? (
                                            recentBookings.map((b) => <BookingRow key={b.id} booking={b} onOpen={() => goDetail(b.id)} />)
                                        ) : (
                                            <p className="text-sm text-on-surface-variant text-center p-4">{t('Chưa có lịch sử đặt chỗ.')}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Locker model (live availability) */}
                                <div className="rounded-2xl bg-white shadow-xs p-6 flex flex-col gap-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[18px] font-semibold text-on-surface">
                                                {t('Mô hình ô tủ trực tuyến')}{modelStation ? t(' tại {name}', { name: modelStation.name }) : ''}
                                            </span>
                                            <span className="text-sm text-on-surface-variant">
                                                {t('Số ô trống lấy trực tiếp từ hệ thống')}{activeBooking ? t('; cỡ tủ của bạn được đánh dấu') : ''}.
                                            </span>
                                        </div>
                                        <button type="button" onClick={loadData} aria-label={t('Làm mới')} className="p-2 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high cursor-pointer shrink-0">
                                            <RefreshCw className={`w-4 h-4 ${isLoadingStations ? 'animate-spin motion-reduce:animate-none' : ''}`} />
                                        </button>
                                    </div>

                                    {isLoadingStations ? (
                                        <div className="flex justify-center p-6" role="status" aria-label={t('Đang tải')}><RefreshCw className="w-5 h-5 animate-spin motion-reduce:animate-none text-primary-container" aria-hidden="true" /></div>
                                    ) : stationsError ? (
                                        <div className="p-4 rounded-xl bg-error-container text-sm text-on-error-container flex items-center justify-between gap-3">
                                            <span>{stationsError}</span>
                                            <button type="button" onClick={loadData} className="link-target font-bold underline cursor-pointer">{t('Thử lại')}</button>
                                        </div>
                                    ) : modelStation ? (
                                        <div className="flex flex-col gap-3 p-3 bg-surface-container-low rounded-xl">
                                            {(['S', 'M', 'L'] as const).map((size) => (
                                                <LockerRow
                                                    key={size}
                                                    size={size}
                                                    total={totalOf(modelStation, size)}
                                                    available={availableOf(modelStation, size)}
                                                    mine={activeBooking?.stationId === modelStation.id && activeBooking.size === size}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-on-surface-variant text-center p-4">{t('Chưa có dữ liệu trạm.')}</p>
                                    )}
                                </div>
                            </div>

                            {/* ── RIGHT COLUMN ── */}
                            <div className="lg:col-span-4 flex flex-col gap-6 min-w-0">

                                <div className="rounded-2xl bg-white shadow-xs p-6 flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-primary" />
                                        <h3 className="text-[18px] font-semibold text-on-surface">{t('Tìm trạm gần bạn')}</h3>
                                    </div>

                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low text-on-surface">
                                        <Navigation className={`w-4 h-4 shrink-0 ${locState === 'granted' ? 'text-tertiary' : 'text-on-surface-muted'}`} />
                                        <span className="text-sm">
                                            {locState === 'granted' ? t('Đang dùng vị trí hiện tại của bạn') : locationText}
                                        </span>
                                    </div>

                                    <div className="relative w-full">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-muted" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-bright border border-outline-soft text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-hidden focus:border-primary-container"
                                            placeholder={t('Nhập địa chỉ, tên ga, sân bay...')}
                                            type="text"
                                            aria-label={t('Tìm trạm theo tên hoặc địa chỉ')}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {isLoadingStations ? (
                                            <div className="flex justify-center p-4" role="status" aria-label={t('Đang tải')}><RefreshCw className="w-5 h-5 animate-spin motion-reduce:animate-none text-primary-container" aria-hidden="true" /></div>
                                        ) : nearbyStations.length > 0 ? (
                                            nearbyStations.map((s) => <NearbyStationCard key={s.id} station={s} onBook={() => goBook(s.id)} />)
                                        ) : (
                                            <p className="text-sm text-on-surface-variant text-center p-4">
                                                {stationsError || (searchQuery ? t('Không có trạm khớp từ khóa.') : t('Chưa có trạm nào đang hoạt động.'))}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={goMap}
                                        className="w-full py-2.5 rounded-xl bg-surface-container text-primary text-sm font-semibold flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors cursor-pointer"
                                    >
                                        {t('Xem bản đồ toàn bộ trạm SmartLocker')}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                            </div>
                        </div>

                        <div className="w-full rounded-2xl bg-white shadow-xs p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-on-surface">{t('Bạn đang offline hoặc mất kết nối mạng?')}</span>
                                <p className="text-sm text-on-surface-variant">
                                    {t('Vé ngoại tuyến có thể tải sẵn trong trang chi tiết đặt chỗ để mở tủ khi không có mạng. Cần gấp hãy gọi tổng đài.')}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="flex flex-col text-right">
                                    <span className="text-xs text-on-surface-variant">{t('Tổng đài hỗ trợ 24/7')}</span>
                                    <span className="text-sm font-bold text-primary">{CONTACT.hotlineLabel}</span>
                                </div>
                                <button type="button" onClick={openSupport} className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
                                    <Phone className="w-4 h-4 text-primary-container" />
                                    {t('Liên hệ ngay')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="border-t border-surface-container mt-4 px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-on-surface-muted">© {new Date().getFullYear()} {t('SmartLocker. Bản quyền thuộc về SmartLocker.')}</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-2 text-xs text-on-surface-variant">
                        <a href="/?view=reviews" className="link-target hover:text-primary transition-colors">{t('Đánh giá khách hàng')}</a>
                        <button type="button" onClick={() => openLegal('privacy')} className="link-target hover:text-primary transition-colors cursor-pointer">{t('Chính sách bảo mật')}</button>
                        <button type="button" onClick={() => openLegal('terms')} className="link-target hover:text-primary transition-colors cursor-pointer">{t('Điều khoản dịch vụ')}</button>
                        <button type="button" onClick={openSupport} className="link-target hover:text-primary transition-colors cursor-pointer">{t('Trợ giúp khẩn cấp 24/7')}</button>
                    </div>
                </footer>
            </main>
            {activeBooking && (
                <ExtendBookingModal
                    isOpen={showExtendModal}
                    onClose={() => {
                        setShowExtendModal(false);
                        setAutoExtendPayOS(false);
                    }}
                    bookingId={activeBooking.id}
                    bookingCode={activeBooking.bookingCode}
                    lockerCode={activeBooking.lockerCode || `Size ${activeBooking.size}`}
                    size={activeBooking.size}
                    stationName={activeBooking.stationName}
                    startAt={activeBooking.startAt}
                    currentEndAt={activeBooking.endAt}
                    currentEndTime={new Date(parseServerTime(activeBooking.endAt)).toLocaleString('vi-VN')}
                    hourlyRate={activeBooking.hourlyRate}
                    maxHours={activeBooking.maxHours}
                    overdueFee={activeBooking.currentOverdueFee}
                    initialHours={extendHours}
                    autoCreatePayment={autoExtendPayOS}
                    onExtended={async () => {
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────

function InfoCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-1">
            <span className="text-xs font-bold text-on-surface-variant">{label}</span>
            <span className="text-xs mt-0.5 text-on-surface">{value}</span>
        </div>
    );
}

function BookingRow({ booking, onOpen }: { booking: BookingListItemDto; onOpen: () => void }) {
    const t = useT();
    const status = STATUS_LABEL[booking.status] ? { ...STATUS_LABEL[booking.status], label: t(STATUS_LABEL[booking.status].label) } : { label: booking.status, className: 'bg-surface-container-high text-on-surface-variant' };
    const isCancelled = booking.status === 'CANCELLED';
    const start = new Date(parseServerTime(booking.startAt));
    const date = `${start.toLocaleDateString('vi-VN')} · ${formatTime(booking.startAt)} – ${formatTime(booking.endAt)}`;

    return (
        <div className="rounded-xl bg-white shadow-xs border border-outline-soft p-4 hover:bg-surface-bright transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-primary-container" />
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface truncate">{booking.stationName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-xs font-mono font-bold shrink-0">
                            {booking.lockerCode ? t('Tủ {code}', { code: booking.lockerCode }) : `Size ${booking.size}`}
                        </span>
                    </div>
                    <p className="text-sm text-on-surface-variant flex flex-wrap items-center gap-2 mt-0.5">
                        <span>{date}</span>
                        <span className="text-outline" aria-hidden="true">·</span>
                        <span className={`font-bold ${isCancelled ? 'line-through text-on-surface-muted' : 'text-on-surface'}`}>
                            {booking.baseAmount.toLocaleString('vi-VN')}{t('đ')}
                        </span>
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${status.className}`}>
                    {status.label}
                </span>
                {(booking.status === 'COMPLETED' || booking.status === 'COMPLETED_MANUAL') && (
                    <button type="button" onClick={onOpen} title={t('Đánh giá trạm sau khi lấy đồ')}
                        className="text-xs font-semibold text-on-warning-container bg-warning-container border border-outline-soft px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer">
                        <Star className="w-3.5 h-3.5 fill-on-warning-container text-on-warning-container" />{t('Đánh giá')}
                    </button>
                )}
                <button type="button" onClick={onOpen} className="link-target text-xs font-semibold text-primary-container hover:text-primary flex items-center gap-0.5 transition-colors cursor-pointer">
                    {booking.status === 'COMPLETED' ? <>{t('Biên lai')} <ReceiptText className="w-4 h-4" /></> : <>{t('Chi tiết')} <ChevronRight className="w-4 h-4" /></>}
                </button>
            </div>
        </div>
    );
}

/** Một hàng của mô hình tủ: mỗi ô là một tủ thật của trạm (xanh = trống, xám = đang dùng). */
function LockerRow({ size, total, available, mine }: { size: 'S' | 'M' | 'L'; total: number; available: number; mine: boolean }) {
    const t = useT();
    const cells = Array.from({ length: total }, (_, i) => i < available);
    const label = size === 'S' ? t('Nhỏ (balo)') : size === 'M' ? t('Vừa (vali cabin)') : t('Lớn (vali 28")');
    return (
        <div className={`rounded-xl p-3 ${mine ? 'bg-white ring-2 ring-primary-container' : 'bg-white/70'}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-on-surface">
                    Size {size} <span className="font-normal text-on-surface-variant">· {label}</span>
                    {mine && <span className="ml-2 text-xs font-bold uppercase bg-primary-container text-white px-1.5 py-0.5 rounded">{t('Cỡ của bạn')}</span>}
                </span>
                <span className={`text-xs font-bold ${available > 0 ? 'text-tertiary' : 'text-error'}`}>{available}/{total} {t('trống')}</span>
            </div>
            {total === 0 ? (
                <p className="text-sm text-on-surface-muted">{t('Trạm không có tủ cỡ này.')}</p>
            ) : (
                <div className="flex flex-wrap gap-1.5" aria-label={t('{available} trên {total} tủ cỡ {size} còn trống', { available, total, size })}>
                    {cells.map((free, i) => (
                        <span
                            key={i}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${free ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-surface-container-high text-on-surface-muted'}`}
                            title={free ? t('Trống') : t('Đang dùng')}
                        >
                            {size}{i + 1}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function NearbyStationCard({ station, onBook }: { station: Station; onBook: () => void }) {
    const t = useT();
    const availS = station.availableS ?? 0;
    const availM = station.availableM ?? 0;
    const availL = station.availableL ?? 0;
    const totalAvail = availS + availM + availL;
    const isPrimary = station.distanceKm != null && station.distanceKm < 1;
    const distLabel = station.distanceKm != null ? formatDistance(station.distanceKm) : '';

    return (
        <div className="p-3 rounded-xl bg-surface-bright border border-outline-soft hover:bg-surface-container-low transition-colors flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-on-surface truncate">{station.name}</span>
                {distLabel && <span className={`text-xs font-bold shrink-0 ${isPrimary ? 'text-primary' : 'text-on-surface-variant'}`}>{distLabel}</span>}
            </div>
            <p className="text-sm text-on-surface-variant">{station.address} {t('· Mở')} {station.opensAt || '--'}–{station.closesAt || '--'}</p>
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span>S: <strong className="text-tertiary">{availS}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>M: <strong className="text-tertiary">{availM}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>L: <strong className="text-tertiary">{availL}</strong></span>
                </div>
                <button
                    type="button"
                    disabled={totalAvail === 0}
                    onClick={onBook}
                    className={`px-4 py-2 min-h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        totalAvail > 0
                            ? isPrimary
                                ? 'bg-primary-container text-white hover:bg-on-primary-fixed-variant'
                                : 'bg-surface-container-high text-on-surface hover:bg-primary-container hover:text-white'
                            : 'bg-surface-container text-on-surface-muted cursor-not-allowed'
                    }`}
                >
                    {totalAvail > 0 ? t('Đặt tủ') : t('Hết chỗ')}
                </button>
            </div>
        </div>
    );
}
