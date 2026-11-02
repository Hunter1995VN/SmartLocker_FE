import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, MapPin, Phone, Navigation, Share2, CheckCircle,
    AlertTriangle, Clock, Shield, Wifi, QrCode, Video,
    ChevronRight, Star, RefreshCw, ExternalLink, Calendar,
} from 'lucide-react';
import { getStationById, calcDistance } from '../api/stationService';
import type { Station, StationDetail } from '../api/stationService';
import CustomerHeader from '../components/layout/CustomerHeader';
import InteractiveStationMap from '../components/map/InteractiveStationMap';

// ─── Size static metadata (dimensions & descriptions) ─────────────────────────
const SIZE_META = {
    S: {
        label: 'Cỡ Nhỏ (Size S)',
        desc: 'Balo, túi xách du lịch cá nhân',
        dims: '45 × 45 × 65 cm',
        maxKg: 10,
        color: 'text-emerald-600',
        barColor: 'bg-emerald-500',
    },
    M: {
        label: 'Cỡ Vừa (Size M)',
        desc: 'Vali cabin xách tay 20 inch',
        dims: '65 × 45 × 65 cm',
        maxKg: 20,
        color: 'text-amber-600',
        barColor: 'bg-amber-500',
    },
    L: {
        label: 'Cỡ Lớn (Size L)',
        desc: 'Vali ký gửi cỡ lớn 28 inch',
        dims: '95 × 55 × 65 cm',
        maxKg: 35,
        color: 'text-red-500',
        barColor: 'bg-red-500',
    },
} as const;

type SizeKey = keyof typeof SIZE_META;
const DURATIONS = [2, 4, 8, 24] as const;

interface Props {
    stationId?: string;
    station?: Station;
    onBack: () => void;
    onLogout: () => void;
    onNavigateDashboard?: () => void;
    onNavigateHistory?: () => void;
    onNavigateBooking?: (stationId: string, initialData?: { size?: 'S' | 'M' | 'L'; duration?: number }) => void;
}

function formatVND(n: number) {
    return Math.round(n).toLocaleString('vi-VN') + ' VNĐ';
}

function getStationCode(name: string) {
    const parts = name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(' ');
    return '#ST-' + parts.filter(Boolean).slice(0, 3).join('-').slice(0, 16);
}

function isCurrentlyOpen(opensAt?: string, closesAt?: string, status?: string) {
    if (status && status !== 'ACTIVE') return false;
    if (!opensAt || !closesAt) return true;
    if (opensAt === '00:00' && (closesAt === '23:59' || closesAt === '00:00')) return true;
    const now = new Date();
    const [oh, om] = opensAt.split(':').map(Number);
    const [ch, cm] = closesAt.split(':').map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    if (closeMin >= openMin) return nowMin >= openMin && nowMin <= closeMin;
    return nowMin >= openMin || nowMin <= closeMin;
}

export default function StationDetailPage({
    stationId,
    station: initialStation,
    onBack,
    onLogout,
    onNavigateDashboard,
    onNavigateHistory,
    onNavigateBooking,
}: Props) {
    const targetId = stationId || initialStation?.id || '';

    const [detail, setDetail] = useState<StationDetail | null>(
        initialStation
            ? {
                  ...initialStation,
                  opensAt: initialStation.opensAt || '06:00',
                  closesAt: initialStation.closesAt || '22:00',
                  availableS: initialStation.availableS ?? 0,
                  availableM: initialStation.availableM ?? 0,
                  availableL: initialStation.availableL ?? 0,
              }
            : null
    );
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<SizeKey>('M');
    const [selectedDuration, setSelectedDuration] = useState<number>(4);
    const [simStartHourOffset, setSimStartHourOffset] = useState<number>(0); // 0 = Ngay bây giờ
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [copiedShare, setCopiedShare] = useState<boolean>(false);

    // Get user GPS for distance calculation
    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            () => {}
        );
    }, []);

    // Fetch real station details + pricing + availability from Backend
    const fetchDetail = useCallback(async () => {
        if (!targetId) {
            setError('Không xác định được mã trạm cần xem.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const start = new Date(Date.now() + simStartHourOffset * 3600_000);
            const end = new Date(start.getTime() + selectedDuration * 3600_000);
            const data = await getStationById(targetId, start.toISOString(), end.toISOString());
            if (!data) {
                setError('Không tìm thấy thông tin trạm từ cơ sở dữ liệu.');
            } else {
                setDetail(data);
            }
        } catch (err) {
            console.error('Lỗi tải chi tiết trạm:', err);
            setError('Không thể kết nối đến máy chủ để tải thông tin chi tiết trạm.');
        } finally {
            setIsLoading(false);
        }
    }, [targetId, simStartHourOffset, selectedDuration]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const handleLogout = () => {
        localStorage.clear();
        onLogout();
    };

    if (isLoading && !detail) {
        return (
            <div className="min-h-screen bg-[#f8f9ff] flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <CustomerHeader currentPage="find-station" onNavigate={(p) => {
                    if (p === 'dashboard') onNavigateDashboard?.();
                    else if (p === 'my-bookings') onNavigateHistory?.();
                    else if (p === 'find-station') onBack();
                }} onLogout={handleLogout} />
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-base font-bold text-[#0b1c30]">Đang tải thông tin trạm từ cơ sở dữ liệu...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !detail) {
        return (
            <div className="min-h-screen bg-[#f8f9ff] flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <CustomerHeader currentPage="find-station" onNavigate={(p) => {
                    if (p === 'dashboard') onNavigateDashboard?.();
                    else if (p === 'my-bookings') onNavigateHistory?.();
                    else if (p === 'find-station') onBack();
                }} onLogout={handleLogout} />
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl shadow-md border border-[#e5eeff] p-8 max-w-md w-full text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <h2 className="text-lg font-bold text-[#0b1c30] mb-1">Không thể tải thông tin trạm</h2>
                        <p className="text-xs text-[#737686] mb-5">{error}</p>
                        <div className="flex items-center gap-3 justify-center">
                            <button
                                onClick={onBack}
                                className="px-4 py-2.5 rounded-xl bg-[#eff4ff] text-[#2563eb] text-xs font-bold hover:bg-[#dce9ff] cursor-pointer"
                            >
                                Quay lại bản đồ
                            </button>
                            <button
                                onClick={fetchDetail}
                                className="px-4 py-2.5 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-[#1d4ed8] cursor-pointer flex items-center gap-1.5"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Thử lại
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!detail) return null;

    const getRateForSize = (sz: SizeKey): number => {
        if (sz === 'S') return detail.priceS ?? 0;
        if (sz === 'M') return detail.priceM ?? 0;
        return detail.priceL ?? 0;
    };

    const getOverdueForSize = (sz: SizeKey): number => {
        if (sz === 'S') return detail.overdueFeeS ?? (detail.priceS ? detail.priceS * 1.5 : 0);
        if (sz === 'M') return detail.overdueFeeM ?? (detail.priceM ? detail.priceM * 1.5 : 0);
        return detail.overdueFeeL ?? (detail.priceL ? detail.priceL * 1.5 : 0);
    };

    const getAvailForSize = (sz: SizeKey): number => {
        if (sz === 'S') return detail.availableS ?? 0;
        if (sz === 'M') return detail.availableM ?? 0;
        return detail.availableL ?? 0;
    };

    const getTotalForSize = (sz: SizeKey): number => {
        if (sz === 'S') return detail.totalS ?? 0;
        if (sz === 'M') return detail.totalM ?? 0;
        return detail.totalL ?? 0;
    };

    const currentRate = getRateForSize(selectedSize);
    const totalAmount = currentRate * selectedDuration;
    const avail = getAvailForSize(selectedSize);
    const isOpen = isCurrentlyOpen(detail.opensAt, detail.closesAt, detail.status);

    const distanceKm = userLocation
        ? calcDistance(userLocation.lat, userLocation.lng, Number(detail.latitude), Number(detail.longitude))
        : detail.distanceKm;

    const distLabel = distanceKm != null
        ? distanceKm < 1
            ? `${Math.round(distanceKm * 1000)}m`
            : `${distanceKm.toFixed(1)}km`
        : null;
    const walkMin = distanceKm != null ? Math.max(1, Math.round(distanceKm * 12)) : null;

    const simStartDate = new Date(Date.now() + simStartHourOffset * 3600_000);
    const simEndDate = new Date(simStartDate.getTime() + selectedDuration * 3600_000);

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/station-detail?stationId=${detail.id}`;
        navigator.clipboard?.writeText(shareUrl);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
    };

    const handleBooking = () => {
        if (avail === 0 || detail.status !== 'ACTIVE') return;
        onNavigateBooking?.(detail.id, { size: selectedSize, duration: selectedDuration });
    };

    return (
        <div className="min-h-screen bg-[#f8f9ff] flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

            {/* ══ UNIFIED CUSTOMER HEADER ══ */}
            <CustomerHeader
                currentPage="find-station"
                onNavigate={(page) => {
                    if (page === 'dashboard') onNavigateDashboard?.();
                    else if (page === 'my-bookings') onNavigateHistory?.();
                    else if (page === 'find-station') onBack();
                }}
                onLogout={handleLogout}
            />

            {/* ══ BREADCRUMB / NAV BAR ══ */}
            <div className="bg-white border-b border-[#f0f4ff] shadow-xs sticky top-16 z-30">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                    <nav className="flex items-center gap-1.5 text-xs text-[#434655] font-medium">
                        <button onClick={onNavigateDashboard} className="hover:text-[#2563eb] transition-colors flex items-center gap-1 cursor-pointer">
                            🏠 Trang chủ
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-[#c3c6d7]" />
                        <button onClick={onBack} className="hover:text-[#2563eb] transition-colors cursor-pointer">
                            Bản đồ tìm trạm
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-[#c3c6d7]" />
                        <span className="font-semibold text-[#0b1c30] truncate max-w-[220px] md:max-w-md">{detail.name}</span>
                    </nav>
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#2563eb] text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Quay lại bản đồ GPS
                    </button>
                </div>
            </div>

            {/* ══ MAIN CONTENT ══ */}
            <main className="flex-1 w-full pb-16">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* ════════════ LEFT COLUMN (8 cols) ════════════ */}
                        <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">

                            {/* ── Station Hero & GPS Info ── */}
                            <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] p-6 md:p-8 relative overflow-hidden border border-[#e5eeff]">
                                <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-2 py-0.5 rounded bg-[#e5eeff] text-[#434655] text-[11px] font-bold tracking-wider font-mono">
                                                {getStationCode(detail.name)}
                                            </span>
                                            {detail.status === 'ACTIVE' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#007d55] text-xs font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#007d55] animate-pulse" />
                                                    {isOpen ? `Đang mở cửa (${detail.opensAt} – ${detail.closesAt})` : `Tạm đóng (${detail.opensAt} – ${detail.closesAt})`}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                                                    <AlertTriangle className="w-3 h-3" /> Đang bảo trì
                                                </span>
                                            )}
                                            {distLabel && (
                                                <span className="inline-flex items-center gap-1 text-[#2563eb] bg-[#eff4ff] px-2.5 py-0.5 rounded-full text-xs font-bold">
                                                    <Navigation className="w-3 h-3" />
                                                    Cách bạn {distLabel}{walkMin ? ` (~${walkMin} phút)` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-2xl md:text-[26px] font-bold text-[#0b1c30] tracking-tight mt-1 leading-tight">
                                            {detail.name}
                                        </h1>
                                    </div>
                                    {/* Hotline */}
                                    {detail.contactPhone && (
                                        <a
                                            href={`tel:${detail.contactPhone}`}
                                            className="flex items-center gap-2.5 bg-[#eff4ff] hover:bg-[#dce9ff] px-4 py-2 rounded-xl shrink-0 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-xs">
                                                <Phone className="w-4 h-4 text-[#2563eb]" />
                                            </div>
                                            <div className="flex flex-col leading-none">
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-[#737686]">Hotline Trạm</span>
                                                <span className="text-sm font-bold text-[#0b1c30]">{detail.contactPhone}</span>
                                            </div>
                                        </a>
                                    )}
                                </div>

                                {/* Address + GPS actions */}
                                <div className="mt-4 pt-4 border-t border-[#f0f4ff] flex flex-wrap items-center justify-between gap-3 relative z-10">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-start gap-2 text-[#434655] text-sm">
                                            <MapPin className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
                                            <span>{detail.address}</span>
                                        </div>
                                        <span className="text-[11px] text-[#737686] font-mono ml-6">
                                            Tọa độ GPS: {Number(detail.latitude).toFixed(5)}, {Number(detail.longitude).toFixed(5)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${detail.latitude},${detail.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-[#1d4ed8] transition-colors shadow-xs"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" /> Chỉ đường Google Maps
                                        </a>
                                        <button
                                            type="button"
                                            onClick={handleShare}
                                            className="px-3 py-2 rounded-xl bg-[#eff4ff] text-[#2563eb] hover:bg-[#dce9ff] flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
                                            title="Sao chép liên kết trạm"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                            {copiedShare ? 'Đã chép link!' : 'Chia sẻ'}
                                        </button>
                                    </div>
                                </div>

                                {/* Interactive Mini Map showing exact GPS pin */}
                                <div className="mt-5 h-60 rounded-xl overflow-hidden border border-[#dce9ff] relative">
                                    <InteractiveStationMap
                                        stations={[detail]}
                                        selectedStation={null}
                                        userLocation={userLocation}
                                        center={{ lat: Number(detail.latitude), lng: Number(detail.longitude) }}
                                        zoom={16}
                                        onSelectStation={() => {}}
                                        onViewDetail={() => {}}
                                        onBookStation={() => handleBooking()}
                                    />
                                </div>
                            </div>

                            {/* ── Section 1: Real-time Locker Status from DB ── */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[18px] font-semibold text-[#0b1c30] flex items-center gap-2">
                                        <span className="text-xl">🔢</span> Số lượng ô tủ trống &amp; Giá niêm yết thực tế
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={fetchDetail}
                                        className="flex items-center gap-1.5 text-[#2563eb] text-xs font-semibold hover:underline cursor-pointer"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                                        Làm mới dữ liệu
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(['S', 'M', 'L'] as SizeKey[]).map(sz => {
                                        const meta = SIZE_META[sz];
                                        const a = getAvailForSize(sz);
                                        const t = getTotalForSize(sz);
                                        const price = getRateForSize(sz);
                                        const pct = t > 0 ? (a / t) * 100 : 0;
                                        const urgency = a === 0 ? 'Hết ô' : a === 1 ? 'Còn 1 ô duy nhất!' : a <= 3 ? 'Sắp hết ô' : 'Sẵn sàng';
                                        const urgencyClass = a === 0 ? 'bg-red-50 text-red-500' : a <= 3 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';

                                        return (
                                            <div
                                                key={sz}
                                                onClick={() => a > 0 && setSelectedSize(sz)}
                                                className={`rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-[#e5eeff] hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden
                                                    ${a > 0 ? 'cursor-pointer' : 'opacity-60'}
                                                    ${selectedSize === sz ? 'ring-2 ring-[#2563eb]' : ''}`}
                                            >
                                                {sz === 'M' && (
                                                    <div className="absolute top-0 right-0 w-14 h-14 bg-amber-50 rounded-bl-full pointer-events-none flex items-start justify-end p-2">
                                                        <Star className="w-4 h-4 text-amber-500" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold
                                                            ${sz === 'S' ? 'bg-[#eff4ff] text-[#2563eb]' : sz === 'M' ? 'bg-[#e5eeff] text-[#004ac6]' : 'bg-red-50 text-red-500'}`}>
                                                            {sz}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgencyClass}`}>{urgency}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-[#0b1c30] text-sm">{meta.label}</h3>
                                                        <p className="text-xs text-[#737686]">{meta.desc}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between bg-[#f8f9ff] px-2.5 py-1.5 rounded-lg text-xs text-[#737686]">
                                                        <span>{meta.dims}</span>
                                                        <span>Tối đa {meta.maxKg} kg</span>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex flex-col gap-1.5">
                                                    <div className="flex items-baseline justify-between">
                                                        <span className={`text-3xl font-bold ${meta.color}`}>
                                                            {Math.min(t, a)}
                                                            <span className="text-sm text-[#737686] font-normal ml-1">/ {t} trống</span>
                                                        </span>
                                                        <span className="text-base font-bold text-[#2563eb]">
                                                            {price > 0 ? `${(price / 1000).toFixed(0)}.000đ` : 'Liên hệ'}
                                                            <span className="text-xs text-[#737686] font-normal">/h</span>
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-[#e5eeff] h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${meta.barColor}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Section 2: Real Time-Window Availability Check ── */}
                            <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-[#e5eeff] p-6 flex flex-col gap-5">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-[#2563eb]" />
                                        <div>
                                            <h2 className="text-[18px] font-semibold text-[#0b1c30]">Kiểm tra ô trống theo khung giờ</h2>
                                            <p className="text-xs text-[#737686]">Dữ liệu tính toán trực tiếp từ các đơn đặt chỗ trong cơ sở dữ liệu</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {[
                                            { offset: 0, label: 'Ngay bây giờ' },
                                            { offset: 2, label: '+2 giờ tới' },
                                            { offset: 6, label: '+6 giờ tới' },
                                            { offset: 24, label: 'Ngày mai' },
                                        ].map(opt => (
                                            <button
                                                key={opt.offset}
                                                type="button"
                                                onClick={() => setSimStartHourOffset(opt.offset)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    simStartHourOffset === opt.offset
                                                        ? 'bg-[#2563eb] text-white'
                                                        : 'bg-[#eff4ff] text-[#434655] hover:bg-[#dce9ff]'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f8f9ff] p-4 rounded-xl border border-[#e5eeff] text-xs">
                                    <div>
                                        <span className="text-[#737686] uppercase font-bold text-[10px]">Bắt đầu gửi</span>
                                        <p className="font-bold text-[#0b1c30] text-sm mt-0.5">
                                            {simStartDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {simStartDate.toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[#737686] uppercase font-bold text-[10px]">Dự kiến nhận lại</span>
                                        <p className="font-bold text-[#0b1c30] text-sm mt-0.5">
                                            {simEndDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {simEndDate.toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[#737686] uppercase font-bold text-[10px]">Thời lượng thuê</span>
                                        <p className="font-bold text-[#2563eb] text-sm mt-0.5">{selectedDuration} giờ liên tục</p>
                                    </div>
                                </div>
                            </div>

                            {/* ── Section 3: Real Pricing Table from DB ── */}
                            <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-[#e5eeff] p-6 flex flex-col gap-4">
                                <h2 className="text-[18px] font-semibold text-[#0b1c30] flex items-center gap-2">
                                    <span className="text-xl">🧾</span> Bảng giá cước &amp; Chính sách trạm (Dữ liệu Hệ thống)
                                </h2>
                                <div className="overflow-x-auto rounded-xl border border-[#e5eeff]">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-[#f8f9ff] text-[#737686] text-[11px] font-bold uppercase tracking-wide">
                                                <th className="py-3 px-4 text-left">Kích cỡ tủ</th>
                                                <th className="py-3 px-4 text-left">Giá thuê / giờ</th>
                                                <th className="py-3 px-4 text-left">Thời gian thuê</th>
                                                <th className="py-3 px-4 text-left">Phí phạt quá hạn</th>
                                                <th className="py-3 px-4 text-left">Hoàn tiền hủy sớm</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f0f4ff]">
                                            {(['S', 'M', 'L'] as SizeKey[]).map(sz => {
                                                const rate = getRateForSize(sz);
                                                const overdue = getOverdueForSize(sz);
                                                return (
                                                    <tr key={sz} className="hover:bg-[#f8f9ff] transition-colors">
                                                        <td className="py-3.5 px-4 font-semibold text-[#0b1c30]">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold
                                                                    ${sz === 'S' ? 'bg-[#eff4ff] text-[#2563eb]' : sz === 'M' ? 'bg-[#e5eeff] text-[#004ac6]' : 'bg-red-50 text-red-500'}`}>
                                                                    {sz}
                                                                </span>
                                                                {SIZE_META[sz].label}
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-bold text-[#2563eb]">
                                                            {rate > 0 ? `${formatVND(rate)} / giờ` : 'Chưa cấu hình'}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-[#737686]">
                                                            {detail.minHours ?? 1}h – {detail.maxHours ?? 72}h
                                                        </td>
                                                        <td className="py-3.5 px-4 text-amber-700 font-medium">
                                                            {overdue > 0 ? `+${formatVND(overdue)} / giờ` : 'Theo quy định'}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-[#007d55] font-semibold text-xs">
                                                            {Math.round((detail.refundRateEarly ?? 1) * 100)}% (trước {detail.refundCutoffHours ?? 2}h)
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-[#007d55] shrink-0 mt-0.5" />
                                        <p className="text-xs text-[#0b1c30]">
                                            <strong>Thời gian ân hạn (Grace Period):</strong> Miễn phí {detail.gracePeriodMinutes ?? 15} phút đầu tiên sau khi hết giờ thuê trước khi tính phụ phí quá hạn.
                                        </p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex items-start gap-2">
                                        <Clock className="w-5 h-5 text-[#2563eb] shrink-0 mt-0.5" />
                                        <p className="text-xs text-[#0b1c30]">
                                            <strong>Hỗ trợ Kiosk &amp; Offline QR:</strong> Mở khóa ngăn tủ bằng mã PIN 6 số hoặc mã QR động tại màn hình Kiosk trạm.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ── Section 4: IoT Hardware & Security Amenities ── */}
                            <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] border border-[#e5eeff] p-6 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[18px] font-semibold text-[#0b1c30] flex items-center gap-2">
                                        <span className="text-xl">📡</span> Tiện ích &amp; An ninh tại trạm
                                    </h2>
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Trạm trực tuyến
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { icon: Wifi, label: 'Kết nối IoT MQTT', title: 'Đồng bộ Thời gian thực', sub: 'Phản hồi mở khóa < 1 giây', color: 'text-[#007d55]' },
                                        { icon: QrCode, label: 'Xác thực Đa phương thức', title: 'QR Code & Mã PIN', sub: 'Hỗ trợ mở khóa ngoại tuyến', color: 'text-[#2563eb]' },
                                        { icon: Video, label: 'Giám sát An ninh', title: 'Camera CCTV 24/7', sub: 'Cảm biến từ trường cửa tủ', color: 'text-[#007d55]' },
                                    ].map((item, i) => (
                                        <div key={i} className="p-4 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between text-[#737686]">
                                                <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
                                                <item.icon className={`w-4 h-4 ${item.color}`} />
                                            </div>
                                            <span className="text-sm font-bold text-[#0b1c30]">{item.title}</span>
                                            <span className="text-xs text-[#737686]">{item.sub}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ════════════ RIGHT COLUMN — Sticky Booking (4 cols) ════════════ */}
                        <div className="lg:col-span-4 w-full lg:sticky lg:top-28 flex flex-col gap-4">

                            {/* Booking Card */}
                            <div className="rounded-2xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.1)] p-6 flex flex-col gap-5 border border-[#e5eeff]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb]">Đặt chỗ nhanh trạm này</p>
                                        <h3 className="text-lg font-bold text-[#0b1c30] mt-0.5">Cấu hình gửi hành lý</h3>
                                    </div>
                                    <Shield className="w-6 h-6 text-[#2563eb]" />
                                </div>

                                {/* Step 1: Size selector */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-[#0b1c30]">1. Chọn kích thước ngăn tủ</label>
                                        <span className="text-xs text-[#737686]">Đã chọn: <strong className="text-[#2563eb]">Size {selectedSize}</strong></span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['S', 'M', 'L'] as SizeKey[]).map(sz => {
                                            const r = getRateForSize(sz);
                                            const a = getAvailForSize(sz);
                                            const isSelected = selectedSize === sz;
                                            return (
                                                <div key={sz} className="relative">
                                                    <button
                                                        id={`size-btn-${sz}`}
                                                        type="button"
                                                        onClick={() => a > 0 && setSelectedSize(sz)}
                                                        disabled={a === 0}
                                                        className={`w-full p-3 rounded-xl flex flex-col items-center justify-center gap-0.5 text-center transition-all shadow-xs cursor-pointer
                                                            ${isSelected ? 'bg-[#2563eb] text-white' : a === 0 ? 'bg-[#f8f9ff] text-[#c3c6d7] cursor-not-allowed' : 'bg-[#f0f4ff] text-[#434655] hover:bg-[#e5eeff]'}`}
                                                    >
                                                        <span className="text-xl font-bold">{sz}</span>
                                                        <span className="text-[11px] opacity-90">{r > 0 ? `${(r / 1000).toFixed(0)}k/h` : '--'}</span>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Step 2: Duration */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-[#0b1c30]">2. Thời gian gửi dự kiến</label>
                                        <span className="text-xs text-[#2563eb] font-semibold">{selectedDuration} Giờ</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {DURATIONS.map(d => (
                                            <button
                                                key={d}
                                                id={`duration-btn-${d}`}
                                                type="button"
                                                onClick={() => setSelectedDuration(d)}
                                                className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
                                                    ${selectedDuration === d ? 'bg-[#2563eb] text-white shadow-xs' : 'bg-[#f0f4ff] text-[#434655] hover:bg-[#e5eeff]'}`}
                                            >
                                                {d}h
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Pricing breakdown */}
                                <div className="p-4 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between text-xs text-[#737686]">
                                        <span>Đơn giá ({formatVND(currentRate)} × {selectedDuration}h)</span>
                                        <span className="font-semibold text-[#0b1c30]">{formatVND(totalAmount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-[#737686]">
                                        <span className="flex items-center gap-1">Số ô Size {selectedSize} khả dụng</span>
                                        <span className="text-[#007d55] font-bold">{avail} ô trống</span>
                                    </div>
                                    <div className="pt-2.5 mt-1 border-t border-[#e5eeff] flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#737686]">Tạm tính thanh toán</span>
                                            <span className="text-[10px] text-[#94a3b8]">(Giá chính thức từ hệ thống)</span>
                                        </div>
                                        <span className="text-2xl font-bold text-[#2563eb]">{formatVND(totalAmount)}</span>
                                    </div>
                                </div>

                                {/* CTA button */}
                                <button
                                    id="booking-cta-btn"
                                    type="button"
                                    onClick={handleBooking}
                                    disabled={avail === 0 || detail.status !== 'ACTIVE'}
                                    className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer
                                        ${avail === 0 || detail.status !== 'ACTIVE'
                                            ? 'bg-[#e5eeff] text-[#94a3b8] cursor-not-allowed'
                                            : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white active:scale-[0.98]'
                                        }`}
                                >
                                    {avail === 0 ? 'Hết ô trống — vui lòng chọn cỡ khác' : (
                                        <>
                                            Tiếp tục đặt tủ tại trạm này
                                            <span className="text-lg">→</span>
                                        </>
                                    )}
                                </button>

                                {/* Trust badges */}
                                <div className="flex flex-col gap-2 pt-1">
                                    <div className="flex items-center gap-2 text-xs text-[#434655]">
                                        <Shield className="w-4 h-4 text-[#007d55] shrink-0" />
                                        <span>Giám sát an ninh 24/7 &amp; khóa từ tự động</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[#434655]">
                                        <CheckCircle className="w-4 h-4 text-[#2563eb] shrink-0" />
                                        <span>Thanh toán trực tuyến an toàn qua PayOS QR</span>
                                    </div>
                                </div>
                            </div>

                            {/* Emergency support */}
                            {detail.contactPhone && (
                                <div className="rounded-2xl bg-[#f8f9ff] border border-[#e5eeff] p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs text-[#2563eb]">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col leading-none">
                                            <span className="text-[10px] font-bold uppercase tracking-wide text-[#737686]">Hỗ trợ tại trạm</span>
                                            <span className="text-base font-bold text-[#0b1c30] font-mono mt-0.5">{detail.contactPhone}</span>
                                        </div>
                                    </div>
                                    <a
                                        href={`tel:${detail.contactPhone}`}
                                        className="px-4 py-2 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-xs font-semibold hover:bg-[#eff4ff] transition-colors shadow-xs"
                                    >
                                        Gọi ngay
                                    </a>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
