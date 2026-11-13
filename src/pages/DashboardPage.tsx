import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Search, MapPin, Navigation, Zap,
    Shield, User, Clock, RefreshCw, ChevronRight,
    ArrowRight, Phone, Package, ReceiptText, Lock, CheckCircle,
} from 'lucide-react';
import { getStations, calcDistance } from '../api/stationService';
import type { Station } from '../api/stationService';
import { getMyBookings } from '../api/bookingService';
import type { BookingListItemDto } from '../api/bookingService';
import { getApiErrorMessage, resolveAssetUrl } from '../api/client';
import CustomerHeader from '../components/layout/CustomerHeader';
import { CONTACT, openLegal, openSupport } from '../utils/contact';
import { parseServerTime } from '../utils/serverTime';
import { classifyGeoError, watchGeoAvailability, GEO_OS_BLOCKED_HINT } from '../utils/geolocation';

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
    PENDING_PAYMENT: { label: 'CHỜ THANH TOÁN', className: 'bg-[#fff1c2] text-[#6b4a00]' },
    CONFIRMED: { label: 'ĐÃ THANH TOÁN', className: 'bg-[#dbe1ff] text-[#00174b]' },
    STORED: { label: 'ĐANG GỬI ĐỒ', className: 'bg-[#6ffbbe] text-[#002113]' },
    COMPLETED: { label: 'HOÀN THÀNH', className: 'bg-[#6ffbbe] text-[#002113]' },
    COMPLETED_MANUAL: { label: 'HOÀN THÀNH', className: 'bg-[#6ffbbe] text-[#002113]' },
    CANCELLED: { label: 'ĐÃ HỦY', className: 'bg-[#dce9ff] text-[#434655]' },
    NO_SHOW: { label: 'KHÔNG ĐẾN', className: 'bg-[#ffdad6] text-[#93000a]' },
    EXPIRED: { label: 'HẾT HẠN', className: 'bg-[#dce9ff] text-[#434655]' },
};

const SIZE_DIMENSIONS: Record<string, string> = { S: '45×45×65', M: '65×45×65', L: '95×55×65' };

// ─── Helpers ───────────────────────────────────────────────
function getGreeting(name: string): string {
    const h = new Date().getHours();
    if (h < 12) return `Chào buổi sáng, ${name}!`;
    if (h < 18) return `Chào buổi chiều, ${name}!`;
    return `Chào buổi tối, ${name}!`;
}

function formatDate(): string {
    return new Date().toLocaleDateString('vi-VN', {
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
    const [user, setUser] = useState<AuthUser>(readUser);
    const isAdminOrStaff = (user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'staff';

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
    const [locState, setLocState] = useState<LocationState>('locating');

    // Ảnh đại diện/tên mới từ trang Hồ sơ hiện ngay, không cần tải lại trang
    useEffect(() => {
        const refresh = () => setUser(readUser());
        window.addEventListener('smartlocker:profile-updated', refresh);
        return () => window.removeEventListener('smartlocker:profile-updated', refresh);
    }, []);

    const loadData = useCallback(async () => {
        setIsLoadingBookings(true);
        setIsLoadingStations(true);
        setBookingsError('');
        setStationsError('');
        const [bookingsResult, stationsResult] = await Promise.allSettled([getMyBookings(undefined, 1, 20), getStations()]);
        if (bookingsResult.status === 'fulfilled' && bookingsResult.value.success) {
            setBookings(bookingsResult.value.data.items);
            setTotalBookings(bookingsResult.value.data.totalCount);
        } else {
            setBookings([]);
            setBookingsError(bookingsResult.status === 'rejected'
                ? getApiErrorMessage(bookingsResult.reason, 'Không tải được lịch sử đặt chỗ.')
                : 'Không tải được lịch sử đặt chỗ.');
        }
        setIsLoadingBookings(false);
        if (stationsResult.status === 'fulfilled') {
            setStations(stationsResult.value);
        } else {
            setStations([]);
            setStationsError(getApiErrorMessage(stationsResult.reason, 'Không tải được danh sách trạm.'));
        }
        setIsLoadingStations(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Vị trí thật của người dùng (một lần khi mở trang, có thể bấm thử lại)
    const locate = useCallback(() => {
        if (!navigator.geolocation) { setLocState('unsupported'); return; }
        setLocState('locating');
        navigator.geolocation.getCurrentPosition(
            (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocState('granted'); },
            (err) => { void classifyGeoError(err).then(setLocState); },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        );
    }, []);
    useEffect(() => { locate(); }, [locate]);
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
    const storedCount = useMemo(() => bookings.filter((b) => b.status === 'STORED').length, [bookings]);
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

    const handleLogout = () => {
        localStorage.clear();
        onLogout();
    };

    const goDetail = (id: string) => onNavigate?.('booking-detail', { bookingId: id });
    const goMap = () => { if (onNavigateToMap) onNavigateToMap(); else onNavigate?.('find-station'); };
    const goBook = (stationId: string) => onNavigate?.('station-booking', { stationId });

    const openDirections = (station?: Station) => {
        if (!station) return;
        window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${Number(station.latitude)},${Number(station.longitude)}`,
            '_blank', 'noopener,noreferrer',
        );
    };

    const locationText = (() => {
        if (locState === 'locating') return 'Đang xác định vị trí...';
        if (locState === 'granted') return nearestStation ? `Trạm gần bạn: ${nearestStation.name} (${formatDistance(nearestStation.distanceKm ?? 0)})` : 'Đã xác định vị trí của bạn';
        if (locState === 'denied') return 'Vị trí đang bị chặn. Cho phép vị trí để thấy trạm gần bạn.';
        if (locState === 'os-blocked') return GEO_OS_BLOCKED_HINT;
        if (locState === 'unsupported') return 'Trình duyệt không hỗ trợ định vị.';
        return 'Chưa xác định được vị trí của bạn.';
    })();

    if (!user.fullName) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Không tìm thấy dữ liệu đăng nhập.</p>
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
        <div className="min-h-screen bg-[#f8f9ff] font-sans">
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
                            <div className="w-full bg-blue-600 text-white rounded-2xl p-4 md:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                                        <Shield className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-sm md:text-base">
                                            Bạn đang đăng nhập bằng tài khoản {user.role || 'Quản trị viên'}
                                        </h3>
                                        <p className="text-xs text-blue-100 mt-0.5">
                                            Để quản lý trạm, giám sát thiết bị, cảnh báo sự cố và doanh thu, vui lòng mở Operations Dashboard
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onNavigateToAdmin ? onNavigateToAdmin : () => { window.location.href = '/admin'; }}
                                    className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2"
                                >
                                    <span>Mở Admin Portal (Dashboard)</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* ── WELCOME HERO ── */}
                        <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 md:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#dbe1ff] opacity-40 blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[#dae2fd] opacity-30 blur-2xl pointer-events-none" />

                            <div className="relative z-10 flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-[#004ac6] text-white flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
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
                                    <h1 className="text-2xl md:text-[28px] font-bold leading-9 tracking-tight text-[#0b1c30] truncate">
                                        {getGreeting(user.fullName)} <span aria-hidden="true">👋</span>
                                    </h1>
                                    <p className="text-sm text-[#434655] flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                        <span className="flex items-center gap-1">
                                            <span className="text-[#2563eb]">📅</span>
                                            {formatDate()}
                                        </span>
                                        <span className="text-[#c3c6d7]">·</span>
                                        <span
                                            role="status"
                                            className={`text-xs font-semibold px-2 py-0.5 rounded-md ${locState === 'granted' ? 'text-[#2563eb] bg-[#eff4ff]' : 'text-[#6b4a00] bg-[#fff6d6]'}`}
                                        >
                                            {locationText}
                                        </span>
                                        {(locState === 'denied' || locState === 'os-blocked' || locState === 'unavailable' || locState === 'timeout') && (
                                            <button type="button" onClick={locate} className="text-xs font-bold text-[#004ac6] underline cursor-pointer">Thử lại</button>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="relative z-10 flex flex-wrap items-center gap-2">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${storedCount > 0 ? 'bg-[#007d55] text-white shadow-sm' : 'bg-[#e5eeff] text-[#0b1c30]'}`}>
                                    <Lock className="w-5 h-5" />
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Đang sử dụng</span>
                                        <span className="text-sm font-bold">{storedCount > 0 ? `${storedCount} tủ đang gửi` : 'Chưa gửi tủ nào'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[#e5eeff] text-[#0b1c30] rounded-xl">
                                    <CheckCircle className="w-5 h-5 text-[#004ac6]" />
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#434655]">Lịch sử</span>
                                        <span className="text-sm font-bold">{isLoadingBookings ? '...' : `${totalBookings} đơn đặt`}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tip bar */}
                        <div className="w-full rounded-xl bg-[#eff4ff] px-4 py-2.5 flex items-center justify-between gap-3 text-[#434655]">
                            <p className="text-sm min-w-0">
                                <span className="font-semibold text-[#0b1c30]">Mẹo thao tác nhanh:</span>{' '}
                                Mã QR và mã PIN mở tủ nằm trong trang chi tiết đặt chỗ. Đưa mã trước kiosk tại trạm để mở tủ.
                            </p>
                            <button
                                type="button"
                                onClick={() => onNavigate?.('my-bookings')}
                                className="shrink-0 text-xs font-bold text-[#004ac6] hover:text-[#0b1c30] transition-colors flex items-center gap-0.5 cursor-pointer"
                            >
                                Xem đặt chỗ <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                            {/* ── LEFT COLUMN ── */}
                            <div className="lg:col-span-8 flex flex-col gap-8 min-w-0">

                                {/* Active Booking */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-3 w-3">
                                            {activeBooking && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006242] opacity-75" />}
                                            <span className={`relative inline-flex rounded-full h-3 w-3 ${activeBooking ? 'bg-[#006242]' : 'bg-[#94a3b8]'}`} />
                                        </span>
                                        <h2 className="text-[18px] font-semibold uppercase tracking-wider text-[#0b1c30]">Đặt chỗ hiện tại</h2>
                                    </div>

                                    {isLoadingBookings ? (
                                        <div className="rounded-2xl bg-white p-8 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-[#2563eb]" /></div>
                                    ) : bookingsError ? (
                                        <div className="rounded-2xl bg-white p-8 flex flex-col items-center gap-3 text-center">
                                            <p className="text-sm text-[#93000a]">{bookingsError}</p>
                                            <button type="button" onClick={loadData} className="px-4 py-2 rounded-xl bg-[#e5eeff] text-[#004ac6] text-sm font-semibold cursor-pointer">Thử lại</button>
                                        </div>
                                    ) : activeBooking ? (
                                        <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 md:p-8 flex flex-col gap-6">
                                            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#f1f5f9]">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${STATUS_LABEL[activeBooking.status]?.className ?? 'bg-[#dce9ff] text-[#434655]'}`}>
                                                        {STATUS_LABEL[activeBooking.status]?.label ?? activeBooking.status}
                                                    </span>
                                                    <span className="text-sm text-[#434655] font-mono">#{activeBooking.bookingCode}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                                                <div className="md:col-span-7 flex flex-col justify-between gap-3 bg-[#eff4ff] p-4 rounded-xl">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[11px] font-bold uppercase tracking-wide text-[#2563eb]">Trạm thông minh</span>
                                                        <h3 className="text-[22px] font-bold leading-7 text-[#0b1c30]">{activeBooking.stationName}</h3>
                                                        {activeBooking.stationAddress && (
                                                            <p className="text-sm text-[#434655] flex items-start gap-1">
                                                                <Navigation className="w-4 h-4 text-[#737686] shrink-0 mt-0.5" />
                                                                <span>{activeBooking.stationAddress}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2">
                                                        <div className="flex items-center gap-1.5 text-sm text-[#0b1c30]">
                                                            <Package className="w-4 h-4 text-[#004ac6]" />
                                                            <span>
                                                                {activeBooking.lockerCode
                                                                    ? <>Ngăn: <strong className="font-bold text-[#2563eb]">Tủ {activeBooking.lockerCode}</strong></>
                                                                    : 'Ngăn sẽ được gán khi bạn gửi đồ tại kiosk'}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm text-[#434655]">Size {activeBooking.size} ({SIZE_DIMENSIONS[activeBooking.size] ?? '—'} cm)</span>
                                                    </div>
                                                </div>

                                                <div className="md:col-span-5 bg-[#e5eeff] p-4 rounded-xl flex flex-col justify-between gap-3">
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#434655]">
                                                        {isStored ? 'Thời gian còn lại' : 'Giữ chỗ còn'}
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <div className={`text-[32px] font-bold font-mono tracking-tight ${timeLeftMs <= 0 && isStored ? 'text-[#ba1a1a]' : 'text-[#004ac6]'}`}>
                                                            {timeLeftMs > 0 ? formatDuration(timeLeftMs) : isStored ? 'Đã hết giờ' : '00:00:00'}
                                                        </div>
                                                        <span className="text-sm text-[#434655] mt-0.5">
                                                            {isStored ? `Hết hạn lúc ${formatTime(activeBooking.endAt)}` : `Bắt đầu từ ${formatTime(activeBooking.startAt)}`}
                                                        </span>
                                                    </div>
                                                    {isStored && (
                                                        <div className="w-full bg-[#d3e4fe] h-2 rounded-full overflow-hidden">
                                                            <div className="bg-[#2563eb] h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#f8f9ff] rounded-xl text-center">
                                                <InfoCell label="Mã đơn" value={activeBooking.bookingCode} mono />
                                                <InfoCell label="Cỡ tủ" value={`Size ${activeBooking.size}`} />
                                                <InfoCell label="Thời lượng" value={activeBooking.durationHours ? `${activeBooking.durationHours} giờ` : '—'} />
                                                <InfoCell label="Đã thanh toán" value={`${activeBooking.baseAmount.toLocaleString('vi-VN')}đ`} mono />
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                                                <div className="flex flex-wrap items-center gap-2 flex-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => goDetail(activeBooking.id)}
                                                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] transition-colors cursor-pointer"
                                                    >
                                                        <Lock className="w-5 h-5" />
                                                        Xem vé &amp; mã mở tủ
                                                    </button>
                                                    {activeBooking.canExtend && (
                                                        <button
                                                            type="button"
                                                            onClick={() => goDetail(activeBooking.id)}
                                                            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-[#e2e8f0] text-[#0b1c30] text-sm font-semibold hover:bg-[#f8faff] transition-colors cursor-pointer"
                                                        >
                                                            <Clock className="w-4 h-4 text-[#2563eb]" />
                                                            Gia hạn
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => openDirections(activeStation)}
                                                        disabled={!activeStation}
                                                        title={activeStation ? 'Mở Google Maps chỉ đường tới trạm' : 'Chưa có tọa độ trạm'}
                                                        className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-[#e2e8f0] text-[#0b1c30] text-sm font-semibold hover:bg-[#f8faff] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Navigation className="w-4 h-4 text-[#007d55]" />
                                                        Chỉ đường
                                                    </button>
                                                </div>
                                                <button type="button" onClick={openSupport} className="text-sm text-[#434655] hover:text-[#004ac6] transition-colors flex items-center justify-center gap-1 py-2 cursor-pointer">
                                                    <Phone className="w-4 h-4" />
                                                    Cần trợ giúp khẩn cấp?
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-8 flex flex-col items-center text-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] flex items-center justify-center">
                                                <Package className="w-7 h-7 text-[#2563eb]" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[#0b1c30]">Bạn chưa có đặt chỗ nào đang hoạt động</p>
                                                <p className="text-sm text-[#434655] mt-1">Hãy tìm trạm tủ gần bạn để đặt chỗ ngay!</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={goMap}
                                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] transition-colors cursor-pointer"
                                            >
                                                <MapPin className="w-4 h-4" />
                                                Tìm trạm ngay
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Recent Bookings */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[18px] font-semibold uppercase tracking-wider text-[#0b1c30]">Lịch sử đặt chỗ gần đây</h2>
                                        <button type="button" onClick={() => onNavigate?.('my-bookings')} className="text-sm font-semibold text-[#004ac6] hover:underline flex items-center gap-1 cursor-pointer">
                                            Xem tất cả lịch sử ({totalBookings}) <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {isLoadingBookings ? (
                                            <div className="flex justify-center p-4"><RefreshCw className="w-5 h-5 animate-spin text-[#2563eb]" /></div>
                                        ) : bookingsError ? null : recentBookings.length > 0 ? (
                                            recentBookings.map((b) => <BookingRow key={b.id} booking={b} onOpen={() => goDetail(b.id)} />)
                                        ) : (
                                            <p className="text-sm text-[#434655] text-center p-4">Chưa có lịch sử đặt chỗ.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Locker model (live availability) */}
                                <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[18px] font-semibold text-[#0b1c30]">
                                                Mô hình ô tủ trực tuyến{modelStation ? ` tại ${modelStation.name}` : ''}
                                            </span>
                                            <span className="text-sm text-[#434655]">
                                                Số ô trống lấy trực tiếp từ hệ thống{activeBooking ? '; cỡ tủ của bạn được đánh dấu' : ''}.
                                            </span>
                                        </div>
                                        <button type="button" onClick={loadData} aria-label="Làm mới" className="p-2 rounded-lg bg-[#e5eeff] text-[#004ac6] hover:bg-[#dce9ff] cursor-pointer shrink-0">
                                            <RefreshCw className={`w-4 h-4 ${isLoadingStations ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>

                                    {isLoadingStations ? (
                                        <div className="flex justify-center p-6"><RefreshCw className="w-5 h-5 animate-spin text-[#2563eb]" /></div>
                                    ) : stationsError ? (
                                        <div className="p-4 rounded-xl bg-[#fff1f0] text-sm text-[#93000a] flex items-center justify-between gap-3">
                                            <span>{stationsError}</span>
                                            <button type="button" onClick={loadData} className="font-bold underline cursor-pointer">Thử lại</button>
                                        </div>
                                    ) : modelStation ? (
                                        <div className="flex flex-col gap-3 p-3 bg-[#eff4ff] rounded-xl">
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
                                        <p className="text-sm text-[#434655] text-center p-4">Chưa có dữ liệu trạm.</p>
                                    )}
                                </div>
                            </div>

                            {/* ── RIGHT COLUMN ── */}
                            <div className="lg:col-span-4 flex flex-col gap-6 min-w-0">

                                <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-[#004ac6]" />
                                        <h3 className="text-[18px] font-semibold text-[#0b1c30]">Tìm trạm gần bạn</h3>
                                    </div>

                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30]">
                                        <Navigation className={`w-4 h-4 shrink-0 ${locState === 'granted' ? 'text-[#006242]' : 'text-[#94a3b8]'}`} />
                                        <span className="text-sm">
                                            {locState === 'granted' ? 'Đang dùng vị trí hiện tại của bạn' : locationText}
                                        </span>
                                    </div>

                                    <div className="relative w-full">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737686]" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-hidden focus:border-[#2563eb]"
                                            placeholder="Nhập địa chỉ, tên ga, sân bay..."
                                            type="text"
                                            aria-label="Tìm trạm theo tên hoặc địa chỉ"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {isLoadingStations ? (
                                            <div className="flex justify-center p-4"><RefreshCw className="w-5 h-5 animate-spin text-[#2563eb]" /></div>
                                        ) : nearbyStations.length > 0 ? (
                                            nearbyStations.map((s) => <NearbyStationCard key={s.id} station={s} onBook={() => goBook(s.id)} />)
                                        ) : (
                                            <p className="text-sm text-[#434655] text-center p-4">
                                                {stationsError || (searchQuery ? 'Không có trạm khớp từ khóa.' : 'Chưa có trạm nào đang hoạt động.')}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={goMap}
                                        className="w-full py-2.5 rounded-xl bg-[#e5eeff] text-[#004ac6] text-sm font-semibold flex items-center justify-center gap-1 hover:bg-[#dce9ff] transition-colors cursor-pointer"
                                    >
                                        Xem bản đồ toàn bộ trạm SmartLocker
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
                                    <h3 className="text-[18px] font-semibold text-[#0b1c30]">Thao tác nhanh</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <QuickActionCard
                                            icon={<MapPin className="w-5 h-5" />}
                                            iconBg="bg-[#dbe1ff]" iconColor="text-[#004ac6]"
                                            title="Tìm trạm quanh đây" desc="Xem bản đồ GPS"
                                            onClick={goMap}
                                        />
                                        <QuickActionCard
                                            icon={<Zap className="w-5 h-5" />}
                                            iconBg="bg-[#6ffbbe]" iconColor="text-[#006242]"
                                            title="Đặt tủ mới" desc="Chọn trạm & cỡ tủ"
                                            onClick={goMap}
                                        />
                                        <QuickActionCard
                                            icon={<Shield className="w-5 h-5" />}
                                            iconBg="bg-[#dae2fd]" iconColor="text-[#565e74]"
                                            title="Điều khoản & bảo mật" desc="Quy định sử dụng"
                                            onClick={() => openLegal('terms')}
                                        />
                                        <QuickActionCard
                                            icon={<User className="w-5 h-5" />}
                                            iconBg="bg-[#dce9ff]" iconColor="text-[#0b1c30]"
                                            title="Hồ sơ cá nhân" desc="Ảnh, SĐT, dư nợ"
                                            onClick={() => onNavigate?.('profile')}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-[#eff4ff] p-4 flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center shrink-0">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[#0b1c30]">Cần hỗ trợ?</span>
                                        <p className="text-sm text-[#434655] mt-0.5">
                                            Cửa tủ không mở, mất mã PIN hoặc cần lấy đồ khẩn cấp: gọi {CONTACT.hotlineLabel} (24/7).
                                        </p>
                                        <button type="button" onClick={openSupport} className="mt-2 self-start text-xs font-bold text-[#004ac6] hover:underline cursor-pointer">
                                            Xem cách liên hệ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-[#0b1c30]">Bạn đang offline hoặc mất kết nối mạng?</span>
                                <p className="text-sm text-[#434655]">
                                    Vé ngoại tuyến có thể tải sẵn trong trang chi tiết đặt chỗ để mở tủ khi không có mạng. Cần gấp hãy gọi tổng đài.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="flex flex-col text-right">
                                    <span className="text-xs text-[#434655]">Tổng đài hỗ trợ 24/7</span>
                                    <span className="text-sm font-bold text-[#004ac6] font-mono">{CONTACT.hotlineLabel}</span>
                                </div>
                                <button type="button" onClick={openSupport} className="px-4 py-2.5 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
                                    <Phone className="w-4 h-4 text-[#2563eb]" />
                                    Liên hệ ngay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="border-t border-[#e5eeff] mt-4 px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-[#737686]">© {new Date().getFullYear()} SmartLocker. Bản quyền thuộc về SmartLocker.</p>
                    <div className="flex items-center gap-4 text-xs text-[#434655]">
                        <button type="button" onClick={() => openLegal('privacy')} className="hover:text-[#004ac6] transition-colors cursor-pointer">Chính sách bảo mật</button>
                        <button type="button" onClick={() => openLegal('terms')} className="hover:text-[#004ac6] transition-colors cursor-pointer">Điều khoản dịch vụ</button>
                        <button type="button" onClick={openSupport} className="hover:text-[#004ac6] transition-colors cursor-pointer">Trợ giúp khẩn cấp 24/7</button>
                    </div>
                </footer>
            </main>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────

function InfoCell({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center p-1">
            <span className="text-[11px] font-bold text-[#434655]">{label}</span>
            <span className={`text-xs mt-0.5 text-[#0b1c30] ${mono ? 'font-mono' : ''}`}>{value}</span>
        </div>
    );
}

function BookingRow({ booking, onOpen }: { booking: BookingListItemDto; onOpen: () => void }) {
    const status = STATUS_LABEL[booking.status] ?? { label: booking.status, className: 'bg-[#dce9ff] text-[#434655]' };
    const isCancelled = booking.status === 'CANCELLED';
    const start = new Date(parseServerTime(booking.startAt));
    const date = `${start.toLocaleDateString('vi-VN')} · ${formatTime(booking.startAt)} – ${formatTime(booking.endAt)}`;

    return (
        <div className="rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] border border-[#f1f5f9] p-4 hover:bg-[#f8faff] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#e5eeff] flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-[#2563eb]" />
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0b1c30] truncate">{booking.stationName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#dce9ff] text-[#434655] text-[11px] font-mono font-bold shrink-0">
                            {booking.lockerCode ? `Tủ ${booking.lockerCode}` : `Size ${booking.size}`}
                        </span>
                    </div>
                    <p className="text-sm text-[#434655] flex flex-wrap items-center gap-2 mt-0.5">
                        <span>{date}</span>
                        <span className="text-[#c3c6d7]">·</span>
                        <span className={`font-mono font-bold ${isCancelled ? 'line-through text-[#737686]' : 'text-[#0b1c30]'}`}>
                            {booking.baseAmount.toLocaleString('vi-VN')}đ
                        </span>
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${status.className}`}>
                    {status.label}
                </span>
                <button type="button" onClick={onOpen} className="text-xs font-semibold text-[#2563eb] hover:text-[#004ac6] flex items-center gap-0.5 transition-colors cursor-pointer">
                    {booking.status === 'COMPLETED' ? <>Biên lai <ReceiptText className="w-4 h-4" /></> : <>Chi tiết <ChevronRight className="w-4 h-4" /></>}
                </button>
            </div>
        </div>
    );
}

/** Một hàng của mô hình tủ: mỗi ô là một tủ thật của trạm (xanh = trống, xám = đang dùng). */
function LockerRow({ size, total, available, mine }: { size: 'S' | 'M' | 'L'; total: number; available: number; mine: boolean }) {
    const cells = Array.from({ length: total }, (_, i) => i < available);
    const label = size === 'S' ? 'Nhỏ (balo)' : size === 'M' ? 'Vừa (vali cabin)' : 'Lớn (vali 28")';
    return (
        <div className={`rounded-xl p-3 ${mine ? 'bg-white ring-2 ring-[#2563eb]' : 'bg-white/70'}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#0b1c30]">
                    Size {size} <span className="font-normal text-[#434655]">· {label}</span>
                    {mine && <span className="ml-2 text-[10px] font-bold uppercase bg-[#2563eb] text-white px-1.5 py-0.5 rounded">Cỡ của bạn</span>}
                </span>
                <span className={`text-xs font-bold ${available > 0 ? 'text-[#006242]' : 'text-[#ba1a1a]'}`}>{available}/{total} trống</span>
            </div>
            {total === 0 ? (
                <p className="text-xs text-[#737686]">Trạm không có tủ cỡ này.</p>
            ) : (
                <div className="flex flex-wrap gap-1.5" aria-label={`${available} trên ${total} tủ cỡ ${size} còn trống`}>
                    {cells.map((free, i) => (
                        <span
                            key={i}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold ${free ? 'bg-[#6ffbbe] text-[#002113]' : 'bg-[#e2e8f0] text-[#737686]'}`}
                            title={free ? 'Trống' : 'Đang dùng'}
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
    const availS = station.availableS ?? 0;
    const availM = station.availableM ?? 0;
    const availL = station.availableL ?? 0;
    const totalAvail = availS + availM + availL;
    const isPrimary = station.distanceKm != null && station.distanceKm < 1;
    const distLabel = station.distanceKm != null ? formatDistance(station.distanceKm) : '—';

    return (
        <div className="p-3 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] hover:bg-[#eff4ff] transition-colors flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-[#0b1c30] truncate">{station.name}</span>
                <span className={`text-xs font-bold shrink-0 ${isPrimary ? 'text-[#004ac6]' : 'text-[#434655]'}`}>{distLabel}</span>
            </div>
            <p className="text-xs text-[#434655]">{station.address} · Mở {station.opensAt || '--'}–{station.closesAt || '--'}</p>
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#434655]">
                    <span>S: <strong className="text-[#006242]">{availS}</strong></span>
                    <span>·</span>
                    <span>M: <strong className="text-[#006242]">{availM}</strong></span>
                    <span>·</span>
                    <span>L: <strong className="text-[#006242]">{availL}</strong></span>
                </div>
                <button
                    type="button"
                    disabled={totalAvail === 0}
                    onClick={onBook}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        totalAvail > 0
                            ? isPrimary
                                ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
                                : 'bg-[#dce9ff] text-[#0b1c30] hover:bg-[#2563eb] hover:text-white'
                            : 'bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed'
                    }`}
                >
                    {totalAvail > 0 ? 'Đặt tủ' : 'Hết chỗ'}
                </button>
            </div>
        </div>
    );
}

function QuickActionCard({ icon, iconBg, iconColor, title, desc, onClick }: {
    icon: React.ReactNode; iconBg: string; iconColor: string; title: string; desc: string; onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex flex-col items-start gap-2 p-4 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] hover:bg-[#eff4ff] hover:border-[#c3c6d7] transition-all group text-left cursor-pointer"
        >
            <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                {icon}
            </div>
            <span className="text-sm font-bold text-[#0b1c30]">{title}</span>
            <span className="text-xs text-[#434655]">{desc}</span>
        </button>
    );
}
