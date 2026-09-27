import { useState } from 'react';
import {
    ArrowLeft, MapPin, Phone, Navigation, Share2, CheckCircle,
    AlertTriangle, Clock, Shield, Wifi, QrCode, Video,
    ChevronRight, Lock, Bell, Search, LogOut, ChevronDown,
    Zap, Star,
} from 'lucide-react';
import type { Station } from '../api/stationService';

// ─── Pricing config ───────────────────────────────────────────────────────────
const SIZE_CONFIG = {
    S: {
        label: 'Cỡ Nhỏ (Size S)', desc: 'Balo, túi xách du lịch cá nhân',
        dims: '45 × 35 × 25 cm', maxKg: 5, rate: 10_000,
        overage: 5_000, color: 'text-emerald-600', bgSel: 'bg-[#2563eb] text-white',
        bg: 'bg-[#eff4ff]', badgeClass: 'bg-emerald-50 text-emerald-700',
        barColor: 'bg-emerald-500',
    },
    M: {
        label: 'Cỡ Vừa (Size M)', desc: 'Vali cabin xách tay 20 inch',
        dims: '55 × 40 × 25 cm', maxKg: 15, rate: 15_000,
        overage: 8_000, color: 'text-amber-600', bgSel: 'bg-[#2563eb] text-white',
        bg: 'bg-[#eff4ff]', badgeClass: 'bg-amber-50 text-amber-700',
        barColor: 'bg-amber-500',
    },
    L: {
        label: 'Cỡ Lớn (Size L)', desc: 'Vali ký gửi cỡ lớn 28 inch',
        dims: '70 × 50 × 30 cm', maxKg: 25, rate: 20_000,
        overage: 12_000, color: 'text-red-500', bgSel: 'bg-[#2563eb] text-white',
        bg: 'bg-[#eff4ff]', badgeClass: 'bg-red-50 text-red-600',
        barColor: 'bg-red-500',
    },
} as const;

type SizeKey = keyof typeof SIZE_CONFIG;
const DURATIONS = [2, 4, 8, 24] as const;

interface AuthUser { fullName: string; role: string; }

interface Props {
    station: Station;
    onBack: () => void;
    onLogout: () => void;
    onNavigateDashboard?: () => void;
}

// ─── Station photos (stock images by category) ───────────────────────────────
const STATION_PHOTOS = [
    {
        src: 'https://images.unsplash.com/photo-1581922819941-6ab31ab79afc?w=400&q=80',
        caption: 'Sảnh Trung Tâm B1',
    },
    {
        src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
        caption: 'Kiosk Cảm Ứng & QR Scan',
    },
    {
        src: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07a?w=400&q=80',
        caption: 'Bản đồ trạm',
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatVND(n: number) {
    return n.toLocaleString('vi-VN') + ' VNĐ';
}

function getStationCode(name: string) {
    const parts = name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(' ');
    return '#ST-HCM-' + parts.filter(Boolean).slice(0, 3).join('-').slice(0, 16);
}

function isCurrentlyOpen(s: Station) {
    if (s.opensAt === '00:00' && s.closesAt === '23:59') return true;
    const now = new Date();
    const [oh, om] = s.opensAt.split(':').map(Number);
    const [ch, cm] = s.closesAt.split(':').map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return nowMin >= oh * 60 + om && nowMin <= ch * 60 + cm;
}

function getAvailForSize(station: Station, size: SizeKey) {
    return size === 'S' ? station.availableS : size === 'M' ? station.availableM : station.availableL;
}

function getTotalForSize(station: Station, size: SizeKey) {
    return size === 'S' ? station.totalS : size === 'M' ? station.totalM : station.totalL;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StationDetailPage({ station, onBack, onLogout, onNavigateDashboard }: Props) {
    const user: AuthUser = JSON.parse(localStorage.getItem('smartlocker_user') || '{}');

    const [selectedSize, setSelectedSize] = useState<SizeKey>('M');
    const [selectedDuration, setSelectedDuration] = useState<number>(4);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [isBooking, setIsBooking] = useState(false);

    const cfg = SIZE_CONFIG[selectedSize];
    const totalAmount = cfg.rate * selectedDuration;
    const avail = getAvailForSize(station, selectedSize);
    const total = getTotalForSize(station, selectedSize);
    const isOpen = isCurrentlyOpen(station);
    const distLabel = station.distanceKm != null
        ? station.distanceKm < 1
            ? `${Math.round(station.distanceKm * 1000)}m`
            : `${station.distanceKm.toFixed(1)}km`
        : null;
    const walkMin = station.distanceKm != null ? Math.round(station.distanceKm * 12) : null;

    const handleBooking = () => {
        if (avail === 0) return;
        setIsBooking(true);
        setTimeout(() => {
            setIsBooking(false);
            setBookingSuccess(true);
        }, 1800);
    };

    // ─── Booking success state ────────────────────────────────────────────────
    if (bookingSuccess) {
        return (
            <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center animate-fade-in-up">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#0b1c30] mb-2">Đặt chỗ thành công! 🎉</h2>
                    <p className="text-[#434655] text-sm mb-1">Trạm: <strong>{station.name}</strong></p>
                    <p className="text-[#434655] text-sm mb-6">Size {selectedSize} · {selectedDuration}h · <strong className="text-[#2563eb]">{formatVND(totalAmount)}</strong></p>
                    <div className="w-48 h-48 bg-[#0b1c30] rounded-2xl mx-auto mb-6 flex items-center justify-center">
                        <QrCode className="w-32 h-32 text-white opacity-80" />
                    </div>
                    <p className="text-xs text-[#737686] mb-6">Mã QR JWS sẽ được gửi vào email của bạn. Xuất trình tại kiosk để nhận tủ.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onBack}
                            className="flex-1 py-3 rounded-xl bg-[#eff4ff] text-[#2563eb] font-bold text-sm hover:bg-[#e5eeff] transition-colors"
                        >
                            Tìm trạm khác
                        </button>
                        <button
                            onClick={onNavigateDashboard}
                            className="flex-1 py-3 rounded-xl bg-[#2563eb] text-white font-bold text-sm hover:bg-[#1d4ed8] transition-colors"
                        >
                            Về Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#f8f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

            {/* ══ HEADER ══ */}
            <header className="fixed top-0 left-0 w-full z-50 bg-white border-b border-[#e5eeff] shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
                <div className="h-16 w-full px-4 md:px-6 lg:px-8 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-8">
                        <a href="#" className="flex items-center gap-2.5 shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-sm">
                                <Lock className="w-[18px] h-[18px] text-white" />
                            </div>
                            <span className="font-bold text-[18px] tracking-tight text-[#0b1c30] hidden sm:block">
                                Smart<span className="text-[#2563eb]">Locker</span>
                            </span>
                        </a>
                        <nav className="hidden lg:flex items-center gap-1">
                            <button onClick={onNavigateDashboard} className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:bg-[#f0f4ff] transition-colors">Dashboard</button>
                            <button onClick={onBack} className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:bg-[#f0f4ff] transition-colors">Tìm trạm</button>
                            <a href="#" className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:bg-[#f0f4ff] transition-colors">Lịch sử</a>
                            <a href="#" className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:bg-[#f0f4ff] transition-colors">Hỗ trợ</a>
                        </nav>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#434655] hover:bg-[#eff4ff] transition-colors"><Search className="w-5 h-5" /></button>
                        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[#434655] hover:bg-[#eff4ff] transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(v => !v)}
                                className="flex items-center gap-2 pl-2 py-1 pr-3 rounded-xl bg-white border border-[#c3c6d7] hover:bg-[#eff4ff] cursor-pointer transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#004ac6] flex items-center justify-center text-white text-sm font-bold shrink-0">
                                    {user.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
                                </div>
                                <div className="hidden md:flex flex-col leading-none text-left">
                                    <span className="text-xs font-semibold text-[#0b1c30]">{user.fullName}</span>
                                    <span className="text-[11px] text-[#434655]">{user.role || 'Traveler'}</span>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-[#737686]" />
                            </button>
                            {userMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#e5eeff] py-1 z-50">
                                    <button onClick={() => { setUserMenuOpen(false); onNavigateDashboard?.(); }} className="w-full text-left px-4 py-2.5 text-sm text-[#434655] hover:bg-[#eff4ff] flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-[#2563eb]" /> Dashboard
                                    </button>
                                    <hr className="my-1 border-[#f0f4ff]" />
                                    <button onClick={() => { setUserMenuOpen(false); localStorage.clear(); onLogout(); }} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                                        <LogOut className="w-4 h-4" /> Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ══ BREADCRUMB / NAV BAR ══ */}
            <div className="fixed top-16 left-0 w-full z-40 bg-white border-b border-[#f0f4ff] shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                    <nav className="flex items-center gap-1.5 text-xs text-[#434655] font-medium">
                        <button onClick={onNavigateDashboard} className="hover:text-[#2563eb] transition-colors flex items-center gap-1">🏠 Trang chủ</button>
                        <ChevronRight className="w-3.5 h-3.5 text-[#c3c6d7]" />
                        <button onClick={onBack} className="hover:text-[#2563eb] transition-colors">Tìm trạm</button>
                        <ChevronRight className="w-3.5 h-3.5 text-[#c3c6d7]" />
                        <span className="font-semibold text-[#0b1c30] truncate max-w-[200px] md:max-w-xs">{station.name}</span>
                    </nav>
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#2563eb] text-xs font-bold transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Quay lại danh sách trạm
                    </button>
                </div>
            </div>

            {/* ══ MAIN CONTENT ══ */}
            <main className="w-full pt-[112px] pb-16">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* ════════════ LEFT COLUMN (8 cols) ════════════ */}
                        <div className="lg:col-span-8 flex flex-col gap-8 min-w-0">

                            {/* ── Station Hero ── */}
                            <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] p-6 md:p-8 relative overflow-hidden">
                                {/* Ambient glow */}
                                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#dbe1ff]/40 blur-3xl pointer-events-none" />

                                <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-2 py-0.5 rounded bg-[#e5eeff] text-[#434655] text-[11px] font-bold tracking-wider font-mono">
                                                {getStationCode(station.name)}
                                            </span>
                                            {station.status === 'ACTIVE' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#007d55] text-xs font-bold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#007d55] animate-pulse" />
                                                    {isOpen ? `Đang mở cửa (${station.opensAt} – ${station.closesAt})` : 'Tạm đóng'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                                                    <AlertTriangle className="w-3 h-3" /> Đang bảo trì
                                                </span>
                                            )}
                                            {distLabel && (
                                                <span className="inline-flex items-center gap-1 text-[#434655] text-xs">
                                                    <Navigation className="w-3.5 h-3.5 text-[#007d55]" />
                                                    Cách bạn {distLabel}{walkMin ? ` · ~${walkMin} phút` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-2xl md:text-[28px] font-bold text-[#0b1c30] tracking-tight mt-1 leading-tight">
                                            {station.name}
                                        </h1>
                                    </div>
                                    {/* Hotline */}
                                    {station.contactPhone && (
                                        <div className="flex items-center gap-2.5 bg-[#eff4ff] px-4 py-2 rounded-xl shrink-0">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                                <Phone className="w-4 h-4 text-[#2563eb]" />
                                            </div>
                                            <div className="flex flex-col leading-none">
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-[#737686]">Hotline Trực Tiếp</span>
                                                <span className="text-sm font-bold text-[#0b1c30]">{station.contactPhone}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Address + actions */}
                                <div className="mt-4 pt-4 border-t border-[#f0f4ff] flex flex-wrap items-center justify-between gap-3 relative z-10">
                                    <div className="flex items-start gap-2 text-[#434655] text-sm max-w-xl">
                                        <MapPin className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
                                        <span>{station.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`https://maps.google.com/?q=${station.latitude},${station.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#e5eeff] text-[#0b1c30] text-xs font-semibold hover:bg-[#dce9ff] transition-colors"
                                        >
                                            <Navigation className="w-3.5 h-3.5 text-[#2563eb]" /> Mở Google Maps
                                        </a>
                                        <button
                                            onClick={() => navigator.clipboard?.writeText(window.location.href)}
                                            className="w-9 h-9 rounded-xl bg-[#e5eeff] text-[#434655] hover:bg-[#dce9ff] flex items-center justify-center transition-colors"
                                            title="Chia sẻ"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Photo strip */}
                                <div className="mt-5 grid grid-cols-3 gap-3">
                                    {STATION_PHOTOS.map((p, i) => (
                                        <div key={i} className="h-36 rounded-xl overflow-hidden relative group bg-[#e5eeff]">
                                            <img
                                                src={p.src}
                                                alt={p.caption}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-[#0b1c30]/75 text-white text-[10px] font-semibold backdrop-blur-sm">
                                                {p.caption}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Section 1: Real-time Locker Status ── */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[18px] font-semibold text-[#0b1c30] flex items-center gap-2">
                                        <span className="text-xl">🔢</span> Tình trạng ô tủ trực tiếp
                                    </h2>
                                    <span className="flex items-center gap-1 text-[#737686] text-xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#007d55] animate-pulse" />
                                        Cập nhật tức thì (0.8s trước)
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(['S', 'M', 'L'] as SizeKey[]).map(sz => {
                                        const c = SIZE_CONFIG[sz];
                                        const a = getAvailForSize(station, sz);
                                        const t = getTotalForSize(station, sz);
                                        const pct = t > 0 ? (a / t) * 100 : 0;
                                        const urgency = a === 0 ? 'Hết ô' : a === 1 ? 'Chỉ còn 1 ô duy nhất!' : a <= 3 ? 'Sắp hết ô' : 'Ổn định';
                                        const urgencyClass = a === 0 ? 'bg-red-50 text-red-500 animate-pulse' : a === 1 ? 'bg-red-50 text-red-500 animate-pulse' : a <= 3 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';
                                        return (
                                            <div
                                                key={sz}
                                                onClick={() => a > 0 && setSelectedSize(sz)}
                                                className={`rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden
                                                    ${a > 0 ? 'cursor-pointer' : 'opacity-60'}
                                                    ${selectedSize === sz ? 'ring-2 ring-[#2563eb]' : ''}`}
                                            >
                                                {sz === 'M' && (
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full pointer-events-none flex items-start justify-end p-2">
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
                                                        <h3 className="font-bold text-[#0b1c30] text-sm">{c.label}</h3>
                                                        <p className="text-xs text-[#737686]">{c.desc}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between bg-[#f8f9ff] px-2.5 py-1.5 rounded-lg text-xs text-[#737686]">
                                                        <span>{c.dims}</span>
                                                        <span>Tối đa {c.maxKg} kg</span>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex flex-col gap-1.5">
                                                    <div className="flex items-baseline justify-between">
                                                        <span className={`text-4xl font-bold ${c.color}`}>
                                                            {a}
                                                            <span className="text-sm text-[#737686] font-normal ml-1">/ {t} trống</span>
                                                        </span>
                                                        <span className="text-base font-bold text-[#2563eb]">
                                                            {(c.rate / 1000).toFixed(0)}k<span className="text-xs text-[#737686] font-normal">/h</span>
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-[#e5eeff] h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${c.barColor}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Section 2: Availability Simulator ── */}
                            <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] p-6 flex flex-col gap-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">📊</span>
                                        <div>
                                            <h2 className="text-[18px] font-semibold text-[#0b1c30]">Mô phỏng & Dự báo ô trống theo khung giờ</h2>
                                            <p className="text-xs text-[#737686]">Lên kế hoạch gửi trước để hệ thống giữ chỗ thông minh</p>
                                        </div>
                                    </div>
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#dae2fd] text-[#434655] text-xs font-semibold self-start">
                                        ⚙️ Thuật toán IoT Dự Báo
                                    </span>
                                </div>

                                {/* Time selector UI */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#f8f9ff] p-4 rounded-xl border border-[#e5eeff]">
                                    {[
                                        { label: 'Ngày gửi dự kiến', value: `Hôm nay (${new Date().toLocaleDateString('vi-VN')})`, icon: '📅' },
                                        { label: 'Giờ gửi dự kiến', value: '17:00 Chiều', icon: '🕔' },
                                        { label: 'Giờ lấy đồ dự kiến', value: `${17 + selectedDuration}:00 ${17 + selectedDuration >= 18 ? 'Tối' : 'Chiều'}`, icon: '⏰' },
                                        { label: 'Thời lượng', value: `${selectedDuration} giờ`, icon: '⏱️', highlight: true },
                                    ].map((item, i) => (
                                        <div key={i} className="flex flex-col gap-1">
                                            <span className="text-[10px] uppercase font-bold text-[#737686] tracking-wide">{item.label}</span>
                                            <div className={`h-11 px-3 rounded-xl flex items-center gap-2 text-sm font-semibold
                                                ${item.highlight ? 'bg-[#2563eb] text-white' : 'bg-white text-[#0b1c30] shadow-sm border border-[#e5eeff]'}`}>
                                                <span>{item.icon}</span>
                                                <span>{item.value}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Availability bars */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-xs text-[#737686]">
                                        <span>Khả năng đáp ứng ô trống trong khung 17:00 – {17 + selectedDuration}:00</span>
                                        <span className="text-[#007d55] font-semibold flex items-center gap-1">
                                            <CheckCircle className="w-3.5 h-3.5" /> Sẵn sàng đặt chỗ
                                        </span>
                                    </div>
                                    {(['S', 'M', 'L'] as SizeKey[]).map(sz => {
                                        const a = getAvailForSize(station, sz);
                                        const t = getTotalForSize(station, sz);
                                        const c = SIZE_CONFIG[sz];
                                        const pct = t > 0 ? Math.max(10, (a / t) * 100) : 0;
                                        const totalCost = c.rate * selectedDuration;
                                        const badge = a === 0 ? { text: 'Hết ô', cls: 'bg-red-100 text-red-600' }
                                            : a <= 2 ? { text: 'Cần đặt sớm', cls: 'bg-amber-100 text-amber-700' }
                                                : a <= 5 ? { text: 'Được khuyên dùng', cls: 'bg-[#dbe1ff] text-[#004ac6]' }
                                                    : { text: 'Rất an toàn', cls: 'bg-emerald-100 text-emerald-700' };
                                        return (
                                            <div key={sz} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] transition-colors border border-[#e5eeff]">
                                                <div className="flex items-center gap-2 w-44 shrink-0">
                                                    <span className="w-6 h-6 rounded bg-white flex items-center justify-center text-xs font-bold text-[#434655] border border-[#e5eeff]">{sz}</span>
                                                    <span className="text-sm font-semibold text-[#0b1c30]">Tủ Size {sz}</span>
                                                    <span className="text-xs text-[#737686]">({a} dự kiến)</span>
                                                </div>
                                                <div className="flex-1 px-2">
                                                    <div className="w-full bg-[#e5eeff] h-3 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${c.barColor}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-end gap-3 w-48 shrink-0">
                                                    <span className="text-sm font-bold text-[#0b1c30]">{formatVND(totalCost)}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.cls}`}>{badge.text}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Section 3: Pricing Table ── */}
                            <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] p-6 flex flex-col gap-4">
                                <h2 className="text-[18px] font-semibold text-[#0b1c30] flex items-center gap-2">
                                    <span className="text-xl">🧾</span> Bảng giá cước & Quy định dịch vụ minh bạch
                                </h2>
                                <div className="overflow-x-auto rounded-xl border border-[#e5eeff]">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-[#f8f9ff] text-[#737686] text-[11px] font-bold uppercase tracking-wide">
                                                <th className="py-3 px-4 text-left rounded-tl-xl">Kích cỡ tủ</th>
                                                <th className="py-3 px-4 text-left">Giá theo giờ</th>
                                                <th className="py-3 px-4 text-left">Giờ tối thiểu</th>
                                                <th className="py-3 px-4 text-left">Phụ phí quá hạn</th>
                                                <th className="py-3 px-4 text-left rounded-tr-xl">Hoàn tiền hủy phòng</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f0f4ff]">
                                            {(['S', 'M', 'L'] as SizeKey[]).map(sz => {
                                                const c = SIZE_CONFIG[sz];
                                                return (
                                                    <tr key={sz} className="hover:bg-[#f8f9ff] transition-colors">
                                                        <td className="py-3.5 px-4 font-semibold text-[#0b1c30]">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold
                                                                    ${sz === 'S' ? 'bg-[#eff4ff] text-[#2563eb]' : sz === 'M' ? 'bg-[#e5eeff] text-[#004ac6]' : 'bg-red-50 text-red-500'}`}>
                                                                    {sz}
                                                                </span>
                                                                Size {sz} {sz === 'S' ? '(Balo)' : sz === 'M' ? "(Vali 20'')" : "(Vali 28'')"}
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-semibold text-[#2563eb]">{(c.rate / 1000).toFixed(0)}.000đ / giờ</td>
                                                        <td className="py-3.5 px-4 text-[#737686]">01 giờ</td>
                                                        <td className="py-3.5 px-4 text-[#737686]">+{(c.overage / 1000).toFixed(0)}.000đ / 30 phút</td>
                                                        <td className="py-3.5 px-4 text-[#007d55] font-semibold text-xs">100% trước 2h</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex items-start gap-2">
                                        <CheckCircle className="w-5 h-5 text-[#007d55] shrink-0 mt-0.5" />
                                        <p className="text-xs text-[#0b1c30]"><strong>Hoàn tiền linh hoạt:</strong> Huỷ lịch miễn phí và nhận hoàn tiền 100% nếu hủy trước 2 giờ so với lịch gửi đã chọn.</p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex items-start gap-2">
                                        <Clock className="w-5 h-5 text-[#2563eb] shrink-0 mt-0.5" />
                                        <p className="text-xs text-[#0b1c30]"><strong>Cảnh báo trễ giờ:</strong> Hệ thống tự động gửi SMS và thông báo ứng dụng 15 phút trước khi hết hạn giờ đặt tủ.</p>
                                    </div>
                                </div>
                            </div>

                            {/* ── Section 4: IoT Hardware Status ── */}
                            <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] p-6 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[18px] font-semibold text-[#0b1c30] flex items-center gap-2">
                                        <span className="text-xl">📡</span> Tình trạng phần cứng IoT & An ninh trạm
                                    </h2>
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Toàn bộ cảm biến hoạt động tốt
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { icon: Wifi, label: 'Kết nối Viễn thông', title: '3/3 Module Online', sub: 'RSSI: -55 dBm (Xuất sắc)', color: 'text-[#007d55]' },
                                        { icon: QrCode, label: 'Mã Hoá Offline', title: 'JWS Crypto QR', sub: 'Mở tủ không phụ thuộc internet', color: 'text-[#2563eb]' },
                                        { icon: Video, label: 'Giám sát An ninh AI', title: 'CCTV 24/7 Ghi hình', sub: 'Cảm biến nhiệt & chống cạy phá', color: 'text-[#007d55]' },
                                    ].map((item, i) => (
                                        <div key={i} className="p-4 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between text-[#737686]">
                                                <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
                                                <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
                                            </div>
                                            <span className="text-sm font-bold text-[#0b1c30]">{item.title}</span>
                                            <span className="text-xs text-[#737686]">{item.sub}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ════════════ RIGHT COLUMN — Sticky Booking (4 cols) ════════════ */}
                        <div className="lg:col-span-4 w-full lg:sticky lg:top-24 flex flex-col gap-4">

                            {/* Booking Card */}
                            <div className="rounded-2xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.1)] p-6 flex flex-col gap-5 border border-[#e5eeff]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb]">Đặt chỗ nhanh trạm này</p>
                                        <h3 className="text-lg font-bold text-[#0b1c30] mt-0.5">Cấu hình gửi đồ</h3>
                                    </div>
                                    <Shield className="w-6 h-6 text-[#737686]" />
                                </div>

                                {/* Step 1: Size selector */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-[#0b1c30]">1. Chọn kích thước ngăn tủ</label>
                                        <span className="text-xs text-[#737686]">Đã chọn: <strong className="text-[#2563eb]">Size {selectedSize}</strong></span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['S', 'M', 'L'] as SizeKey[]).map(sz => {
                                            const c = SIZE_CONFIG[sz];
                                            const a = getAvailForSize(station, sz);
                                            const isSelected = selectedSize === sz;
                                            return (
                                                <div key={sz} className="relative">
                                                    <button
                                                        id={`size-btn-${sz}`}
                                                        onClick={() => a > 0 && setSelectedSize(sz)}
                                                        disabled={a === 0}
                                                        className={`w-full p-3 rounded-xl flex flex-col items-center justify-center gap-0.5 text-center transition-all shadow-sm
                                                            ${isSelected ? 'bg-[#2563eb] text-white' : a === 0 ? 'bg-[#f8f9ff] text-[#c3c6d7] cursor-not-allowed' : 'bg-[#f0f4ff] text-[#434655] hover:bg-[#e5eeff]'}`}
                                                    >
                                                        <span className="text-xl font-bold">{sz}</span>
                                                        <span className="text-[11px] opacity-90">{(c.rate / 1000).toFixed(0)}k/h</span>
                                                    </button>
                                                    {sz === 'M' && a > 0 && (
                                                        <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-white text-[9px] font-extrabold uppercase">Gợi ý</span>
                                                    )}
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
                                                onClick={() => setSelectedDuration(d)}
                                                className={`py-2.5 rounded-xl text-xs font-bold transition-all
                                                    ${selectedDuration === d ? 'bg-[#2563eb] text-white shadow-sm' : 'bg-[#f0f4ff] text-[#434655] hover:bg-[#e5eeff]'}`}
                                            >
                                                {d}h
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Pricing breakdown */}
                                <div className="p-4 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between text-xs text-[#737686]">
                                        <span>Cước gửi cơ sở ({(SIZE_CONFIG[selectedSize].rate / 1000).toFixed(0)}.000đ × {selectedDuration}h)</span>
                                        <span className="font-semibold text-[#0b1c30]">{formatVND(totalAmount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-[#737686]">
                                        <span className="flex items-center gap-1">Bảo hiểm hàng hóa <CheckCircle className="w-3 h-3 text-[#007d55]" /></span>
                                        <span className="text-[#007d55] font-semibold">Miễn phí (0đ)</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-[#737686]">
                                        <span>Phí tiện ích công nghệ IoT</span>
                                        <span className="font-semibold text-[#0b1c30]">0 VNĐ</span>
                                    </div>
                                    <div className="pt-2.5 mt-1 border-t border-[#e5eeff] flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#737686]">Tạm tính thanh toán</span>
                                            <span className="text-[10px] text-[#94a3b8]">(Chỉ thanh toán khi kích hoạt)</span>
                                        </div>
                                        <span className="text-2xl font-bold text-[#2563eb]">{formatVND(totalAmount)}</span>
                                    </div>
                                </div>

                                {/* CTA button */}
                                <button
                                    id="booking-cta-btn"
                                    onClick={handleBooking}
                                    disabled={avail === 0 || isBooking || station.status !== 'ACTIVE'}
                                    className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md
                                        ${avail === 0 || station.status !== 'ACTIVE'
                                            ? 'bg-[#e5eeff] text-[#94a3b8] cursor-not-allowed'
                                            : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white active:scale-[0.98]'
                                        }`}
                                >
                                    {isBooking ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Đang khóa ô tủ...
                                        </>
                                    ) : avail === 0 ? 'Hết ô trống — thử cỡ khác' : (
                                        <>
                                            Tiếp tục đặt tủ & Nhận mã QR
                                            <span className="text-lg">→</span>
                                        </>
                                    )}
                                </button>

                                {/* Trust badges */}
                                <div className="flex flex-col gap-2 pt-1">
                                    <div className="flex items-center gap-2 text-xs text-[#434655]">
                                        <Shield className="w-4 h-4 text-[#007d55] shrink-0" />
                                        <span>Bảo hiểm hành lý toàn diện tới <strong>50.000.000 VNĐ</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[#434655]">
                                        <CheckCircle className="w-4 h-4 text-[#2563eb] shrink-0" />
                                        <span>Miễn phí huỷ lịch hẹn trước giờ nhận gửi đồ</span>
                                    </div>
                                </div>
                            </div>

                            {/* Emergency support */}
                            <div className="rounded-2xl bg-[#f8f9ff] border border-[#e5eeff] p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-red-500">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#737686]">Cứu trợ khẩn cấp 24/7</span>
                                        <span className="text-lg font-bold text-[#0b1c30] font-mono">1900 1234</span>
                                    </div>
                                </div>
                                <a
                                    href="tel:19001234"
                                    className="px-4 py-2 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-xs font-semibold hover:bg-[#eff4ff] transition-colors shadow-sm"
                                >
                                    Gọi ngay
                                </a>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            {/* ══ FOOTER ══ */}
            <footer className="border-t border-[#e5eeff] bg-white px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-[#737686]">© 2024 SmartLocker IoT Telemetry Platform. Bản quyền thuộc về SmartLocker.</p>
                <div className="flex items-center gap-4 text-xs text-[#434655]">
                    <a href="#" className="hover:text-[#2563eb] transition-colors">Chính sách bảo mật</a>
                    <a href="#" className="hover:text-[#2563eb] transition-colors">Điều khoản dịch vụ</a>
                    <a href="#" className="hover:text-[#2563eb] transition-colors flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Trợ giúp khẩn cấp 24/7
                    </a>
                </div>
            </footer>
        </div>
    );
}
