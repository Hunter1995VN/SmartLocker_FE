import { useState, useEffect, useCallback } from 'react';
import {
    LogOut, Search, Bell, Lock, MapPin, Navigation, Zap,
    Shield, User, Clock, RefreshCw, X, ChevronRight,
    Wifi, Info, ArrowRight, Phone, CheckCircle,
    Package, ReceiptText, AlertTriangle, Key,
} from 'lucide-react';
import { MOCK_STATIONS, MOCK_ACTIVE_BOOKING } from '../api/stationService';
import type { Station, Booking } from '../api/stationService';

// ─── Types ───────────────────────────────────────────────────────────────────
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
}

// ─── Mock recent bookings (sẽ thay bằng API call sau) ────────────────────────
const MOCK_RECENT_BOOKINGS = [
    {
        id: 'bk-001',
        bookingCode: 'SL20260918001',
        stationName: 'SmartLocker Sân bay Đà Nẵng (T1)',
        lockerCode: 'S-02',
        date: '14/09/2026 · 14:15 – 18:30 (4h15m)',
        amount: '35.000đ',
        status: 'COMPLETED' as const,
        type: 'airport',
        refundNote: null,
    },
    {
        id: 'bk-002',
        bookingCode: 'SL20260910001',
        stationName: 'SmartLocker Phố Đi Bộ Nguyễn Huệ',
        lockerCode: 'M-05',
        date: '10/09/2026 · 19:00 – 23:00 (4h00m)',
        amount: '40.000đ',
        status: 'COMPLETED' as const,
        type: 'walk',
        refundNote: null,
    },
    {
        id: 'bk-003',
        bookingCode: 'SL20260902001',
        stationName: 'Chợ Bến Thành Hub Central',
        lockerCode: 'L-01',
        date: '02/09/2026 · Đã hoàn tiền 100% về Ví MoMo',
        amount: '60.000đ',
        status: 'CANCELLED' as const,
        type: 'store',
        refundNote: 'Đã hoàn tiền 100%',
    },
];

// ─── Locker grid cells for the visualizer ────────────────────────────────────
const LOCKER_GRID = {
    small: [
        { code: 'S-01', status: 'AVAILABLE' },
        { code: 'S-02', status: 'AVAILABLE' },
        { code: 'S-03', status: 'OCCUPIED' },
        { code: 'S-04', status: 'AVAILABLE' },
        { code: 'S-05', status: 'OCCUPIED' },
        { code: 'S-06', status: 'AVAILABLE' },
    ],
    medium: [
        { code: 'M-011', status: 'OCCUPIED', span: 2 },
        { code: 'M-012', status: 'MINE', span: 2 },
        { code: 'M-013', status: 'AVAILABLE', span: 2 },
    ],
    large: [
        { code: 'L-021 (Vali lớn 28")', status: 'AVAILABLE', span: 3 },
        { code: 'L-022', status: 'MAINTENANCE', span: 3 },
    ],
};

// ─── Helper: format date ─────────────────────────────────────────────────────
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

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DashboardPage({ onLogout, onNavigateToMap }: DashboardPageProps) {
    const user: AuthUser = JSON.parse(localStorage.getItem('smartlocker_user') || '{}');
    const activeBooking: Booking | null = MOCK_ACTIVE_BOOKING;

    const [timeLeft, setTimeLeft] = useState('');
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [unlockState, setUnlockState] = useState<'idle' | 'unlocking' | 'success'>('idle');
    const [searchQuery, setSearchQuery] = useState('');

    // Countdown timer
    useEffect(() => {
        if (!activeBooking || activeBooking.status !== 'CHECKED_IN') return;
        const update = () => {
            const diff = new Date(activeBooking.endAt).getTime() - Date.now();
            if (diff <= 0) { setTimeLeft('Đã hết giờ'); return; }
            const h = Math.floor(diff / 3_600_000);
            const m = Math.floor((diff % 3_600_000) / 60_000);
            const s = Math.floor((diff % 60_000) / 1_000);
            setTimeLeft(
                `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
            );
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [activeBooking]);

    // Progress bar % for time remaining
    const timeProgress = useCallback((): number => {
        if (!activeBooking) return 0;
        const total = new Date(activeBooking.endAt).getTime() - new Date(activeBooking.startAt).getTime();
        const elapsed = Date.now() - new Date(activeBooking.startAt).getTime();
        return Math.min(100, Math.max(0, ((total - elapsed) / total) * 100));
    }, [activeBooking]);

    const handleLogout = () => {
        localStorage.clear();
        onLogout();
    };

    const handleRemoteUnlock = () => {
        setUnlockState('unlocking');
        setTimeout(() => {
            setUnlockState('success');
        }, 2000);
    };

    const nearbyStations = MOCK_STATIONS.filter(s => s.status === 'ACTIVE').slice(0, 2);

    if (!user.fullName) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Không tìm thấy dữ liệu đăng nhập.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f9ff] font-sans">
            {/* ── NAVBAR ─────────────────────────────────────────────────── */}
            <header className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
                <div className="h-16 w-full px-4 md:px-6 lg:px-8 flex items-center justify-between gap-4">
                    {/* Logo + Nav */}
                    <div className="flex items-center gap-8">
                        <a href="#" className="flex items-center gap-2 shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-sm">
                                <Lock className="w-[18px] h-[18px] text-white" />
                            </div>
                            <span className="font-bold text-[18px] leading-6 tracking-tight text-[#0b1c30]">SmartLocker</span>
                        </a>
                        <nav className="hidden lg:flex items-center gap-1">
                            <a href="#" className="px-4 py-1.5 text-sm font-semibold rounded-xl bg-[#eff4ff] text-[#2563eb] transition-colors">Dashboard</a>
                            <button onClick={onNavigateToMap} className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff] transition-colors">Tìm trạm</button>
                            <a href="#" className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff] transition-colors">Lịch sử</a>
                            <a href="#" className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff] transition-colors">Hỗ trợ</a>
                        </nav>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2">
                        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#434655] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors">
                            <Search className="w-5 h-5" />
                        </button>
                        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[#434655] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                        </button>
                        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-[#eff4ff] border border-[#c3c6d7] text-[#434655] text-xs font-semibold cursor-pointer hover:bg-[#e5eeff] transition-colors">
                            <span className="text-[11px]">🌐</span>
                            <span>VIE / VND</span>
                            <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                        </div>
                        {/* User badge */}
                        <div className="flex items-center gap-2 pl-2 py-1 pr-3 rounded-xl bg-white border border-[#c3c6d7] hover:bg-[#eff4ff] cursor-pointer transition-colors">
                            <div className="w-8 h-8 rounded-full bg-[#004ac6] flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {user.fullName?.charAt(0).toUpperCase() ?? 'U'}
                            </div>
                            <div className="hidden md:flex flex-col leading-none">
                                <span className="text-xs font-semibold text-[#0b1c30]">{user.fullName}</span>
                                <span className="text-[11px] text-[#434655]">{user.role || 'Traveler'}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="ml-2 p-1 rounded-lg hover:bg-red-50 text-[#737686] hover:text-red-500 transition-colors"
                                title="Đăng xuất"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
            <main className="w-full pt-16">
                <div className="w-full px-4 md:px-6 lg:px-8 py-8">
                    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">

                        {/* ── WELCOME HERO ───────────────────────────────── */}
                        <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 md:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            {/* Glows */}
                            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#dbe1ff] opacity-40 blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[#dae2fd] opacity-30 blur-2xl pointer-events-none" />

                            <div className="relative z-10 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl md:text-[28px] font-bold leading-9 tracking-tight text-[#0b1c30]">
                                        {getGreeting(user.fullName)} 
                                    </h1>
                                    <span className="animate-bounce text-2xl">👋</span>
                                </div>
                                <p className="text-sm text-[#434655] flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                    <span className="flex items-center gap-1">
                                        <span className="text-[#2563eb]">📅</span>
                                        {formatDate()}
                                    </span>
                                    <span className="text-[#c3c6d7]">·</span>
                                    <span className="flex items-center gap-1">
                                        <span className="text-[#007d55]">📍</span>
                                        TP. Hồ Chí Minh
                                    </span>
                                    <span className="text-[#c3c6d7]">·</span>
                                    <span className="text-xs font-semibold text-[#2563eb] bg-[#eff4ff] px-2 py-0.5 rounded-md">
                                        Trạm gần bạn: Ga Bến Thành (450m)
                                    </span>
                                </p>
                            </div>

                            {/* Stats pills */}
                            <div className="relative z-10 flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2 px-4 py-2 bg-[#007d55] text-white rounded-xl shadow-sm">
                                    <Lock className="w-5 h-5 animate-pulse" />
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Đang sử dụng</span>
                                        <span className="text-sm font-bold">1 Tủ đang gửi</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[#e5eeff] text-[#0b1c30] rounded-xl">
                                    <CheckCircle className="w-5 h-5 text-[#004ac6]" />
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#434655]">Lịch sử</span>
                                        <span className="text-sm font-bold">5 Lần gửi</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[#eff4ff] text-[#0b1c30] rounded-xl">
                                    <Zap className="w-5 h-5 text-[#2563eb]" />
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#434655]">Hạng Bạc</span>
                                        <span className="text-sm font-bold">350 Points</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tip bar */}
                        <div className="w-full rounded-xl bg-[#eff4ff] px-4 py-2.5 flex items-center justify-between gap-3 text-[#434655]">
                            <div className="flex items-center gap-2 min-w-0">
                                <Info className="w-5 h-5 text-[#2563eb] shrink-0" />
                                <p className="text-sm truncate md:whitespace-normal">
                                    <span className="font-semibold text-[#0b1c30]">Mẹo thao tác nhanh:</span>{' '}
                                    Bạn có thể mở khóa từ xa trực tiếp trên điện thoại bằng Bluetooth/Cloud hoặc nhập mã PIN dự phòng tại màn hình Kiosk cảm ứng.
                                </p>
                            </div>
                            <button className="shrink-0 text-xs font-bold text-[#004ac6] hover:text-[#0b1c30] transition-colors flex items-center gap-0.5">
                                Chi tiết <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* ── MAIN 2-COL GRID ──────────────────────────────── */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                            {/* ── LEFT COLUMN (8 cols) ──────────────────────── */}
                            <div className="lg:col-span-8 flex flex-col gap-8 min-w-0">

                                {/* SECTION: Active Booking */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006242] opacity-75" />
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#006242]" />
                                            </span>
                                            <h2 className="text-[18px] font-semibold uppercase tracking-wider text-[#0b1c30]">
                                                Đặt chỗ hiện tại (Active Booking)
                                            </h2>
                                        </div>
                                        <span className="text-[11px] font-bold text-[#434655]">Mã xác thực JWS: 49AF-882C</span>
                                    </div>

                                    {activeBooking ? (
                                        <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 md:p-8 flex flex-col gap-6">
                                            {/* Top bar */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#f1f5f9]">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#6ffbbe] text-[#002113] text-[11px] font-bold uppercase tracking-wider">
                                                        <span className="w-2 h-2 rounded-full bg-[#006242]" />
                                                        Đang sử dụng
                                                    </span>
                                                    <span className="text-sm text-[#434655] font-mono">#{activeBooking.bookingCode}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[#434655] text-sm">
                                                    <Wifi className="w-4 h-4 text-[#006242]" />
                                                    <span>Kết nối trạm ổn định · RSSI -58 dBm</span>
                                                </div>
                                            </div>

                                            {/* Station + countdown grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                                                {/* Station info */}
                                                <div className="md:col-span-7 flex flex-col justify-between gap-3 bg-[#eff4ff] p-4 rounded-xl">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 text-[#2563eb]">
                                                            <span className="text-xs">🔗</span>
                                                            <span className="text-[11px] font-bold uppercase tracking-wide">Trạm thông minh</span>
                                                        </div>
                                                        <h3 className="text-[22px] font-bold leading-7 text-[#0b1c30]">{activeBooking.stationName}</h3>
                                                        <p className="text-sm text-[#434655] flex items-start gap-1">
                                                            <Navigation className="w-4 h-4 text-[#737686] shrink-0 mt-0.5" />
                                                            <span>{activeBooking.stationAddress}</span>
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4 pt-2">
                                                        <div className="flex items-center gap-1.5 text-sm text-[#0b1c30]">
                                                            <Package className="w-4 h-4 text-[#004ac6]" />
                                                            <span>Ngăn: <strong className="font-bold text-[#2563eb]">Tủ {activeBooking.lockerCode}</strong></span>
                                                        </div>
                                                        <span className="text-[#c3c6d7]">|</span>
                                                        <span className="text-sm text-[#434655]">Size {activeBooking.size} (45×60×60 cm)</span>
                                                    </div>
                                                </div>

                                                {/* Countdown */}
                                                <div className="md:col-span-5 bg-[#e5eeff] p-4 rounded-xl flex flex-col justify-between gap-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#434655]">Thời gian còn lại</span>
                                                        <RefreshCw className="w-4 h-4 text-[#2563eb] animate-spin" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="text-[32px] font-bold font-mono text-[#004ac6] tracking-tight">
                                                            {timeLeft || '00:00:00'}
                                                        </div>
                                                        <span className="text-sm text-[#434655] mt-0.5">
                                                            Hết hạn lúc: {new Date(activeBooking.endAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} chiều nay
                                                        </span>
                                                    </div>
                                                    {/* Progress bar */}
                                                    <div className="w-full bg-[#d3e4fe] h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-[#2563eb] h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${timeProgress()}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* IoT Telemetry row */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#f8f9ff] rounded-xl text-center">
                                                <TelemetryCell label="Trạng thái chốt" value="Khóa an toàn" icon={<Lock className="w-4 h-4" />} valueClass="text-[#006242]" />
                                                <TelemetryCell label="Cảm biến trọng lượng" value="8.4 kg (Vali cabin)" mono />
                                                <TelemetryCell label="Cảm biến hồng ngoại" value="Có vật thể (Hành lý)" valueClass="text-[#004ac6]" />
                                                <TelemetryCell label="Mã PIN dự phòng" value="892041" mono bold />
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                                                <div className="flex flex-wrap items-center gap-2 flex-1">
                                                    <button
                                                        onClick={() => { setUnlockState('idle'); setShowKeyModal(true); }}
                                                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2563eb] text-white text-sm font-semibold shadow-sm hover:bg-[#1d4ed8] transition-all duration-150 active:scale-95"
                                                    >
                                                        <Lock className="w-5 h-5" />
                                                        Mở Tủ Ngay / QR Key
                                                    </button>
                                                    <button className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-[#e2e8f0] text-[#0b1c30] text-sm font-semibold hover:bg-[#eff4ff] transition-colors">
                                                        <Clock className="w-4 h-4 text-[#2563eb]" />
                                                        Gia hạn (+1h)
                                                    </button>
                                                    <button className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white border border-[#e2e8f0] text-[#0b1c30] text-sm font-semibold hover:bg-[#eff4ff] transition-colors">
                                                        <Navigation className="w-4 h-4 text-[#007d55]" />
                                                        Chỉ đường
                                                    </button>
                                                </div>
                                                <button className="text-sm text-[#434655] hover:text-[#004ac6] transition-colors flex items-center justify-center gap-1 py-2">
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
                                                <p className="font-semibold text-[#0b1c30]">Bạn chưa có booking nào đang hoạt động</p>
                                                <p className="text-sm text-[#434655] mt-1">Hãy tìm trạm tủ gần bạn để đặt chỗ ngay!</p>
                                            </div>
                                            <button
                                                onClick={onNavigateToMap}
                                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] transition-colors"
                                            >
                                                <MapPin className="w-4 h-4" />
                                                Tìm trạm ngay
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* SECTION: Recent Bookings */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[18px] font-semibold uppercase tracking-wider text-[#0b1c30]">
                                            Lịch sử đặt chỗ gần đây
                                        </h2>
                                        <a href="#" className="text-sm font-semibold text-[#004ac6] hover:underline flex items-center gap-1">
                                            Xem tất cả lịch sử (5) <ArrowRight className="w-4 h-4" />
                                        </a>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {MOCK_RECENT_BOOKINGS.map(b => (
                                            <BookingRow key={b.id} booking={b} />
                                        ))}
                                    </div>
                                </div>

                                {/* SECTION: Locker Visualizer */}
                                <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[18px] font-semibold text-[#0b1c30]">Mô hình ô tủ trực quan tại trạm Ga Bến Thành</span>
                                            <span className="text-sm text-[#434655]">Sơ đồ thực tế của trạm. Ô màu xanh dương là vị trí tủ của bạn.</span>
                                        </div>
                                        <span className="px-2 py-1 rounded bg-[#e5eeff] text-xs font-bold text-[#434655]">Kiosk Rack A-01</span>
                                    </div>

                                    {/* Grid */}
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-3 bg-[#eff4ff] rounded-xl">
                                        {/* Small lockers */}
                                        {LOCKER_GRID.small.map(cell => (
                                            <LockerCell key={cell.code} code={cell.code} status={cell.status as 'AVAILABLE' | 'OCCUPIED' | 'MINE'} span={1} />
                                        ))}
                                        {/* Medium lockers */}
                                        {LOCKER_GRID.medium.map(cell => (
                                            <LockerCell key={cell.code} code={cell.code} status={cell.status as 'AVAILABLE' | 'OCCUPIED' | 'MINE'} span={2} />
                                        ))}
                                        {/* Large lockers */}
                                        {LOCKER_GRID.large.map(cell => (
                                            <LockerCell key={cell.code} code={cell.code} status={cell.status as 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'} span={3} />
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* ── RIGHT COLUMN (4 cols) ─────────────────────── */}
                            <div className="lg:col-span-4 flex flex-col gap-6 min-w-0">

                                {/* Card: Find nearby */}
                                <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-5 h-5 text-[#004ac6]" />
                                            <h3 className="text-[18px] font-semibold text-[#0b1c30]">Tìm trạm gần bạn</h3>
                                        </div>
                                        <span className="w-2 h-2 rounded-full bg-[#006242]" />
                                    </div>

                                    {/* Location badge */}
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#eff4ff] text-[#0b1c30]">
                                        <Navigation className="w-4 h-4 text-[#006242] shrink-0" />
                                        <span className="text-sm truncate">Vị trí: <strong>Quận 1, TP. Hồ Chí Minh</strong></span>
                                    </div>

                                    {/* Search input */}
                                    <div className="relative w-full">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737686]" />
                                        <input
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] transition-all"
                                            placeholder="Nhập địa chỉ, tên ga, sân bay..."
                                            type="text"
                                        />
                                    </div>

                                    {/* Map placeholder */}
                                    <div className="w-full h-40 rounded-xl bg-gradient-to-br from-[#dce9ff] to-[#e5eeff] overflow-hidden relative">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <MapPin className="w-8 h-8 text-[#2563eb] opacity-30" />
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-ping" />
                                                    2 trạm khả dụng quanh bạn (&lt;2km)
                                                </span>
                                                <button onClick={onNavigateToMap} className="text-xs text-[#6ffbbe] underline hover:text-white transition-colors">
                                                    Mở Map lớn
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Station compact list */}
                                    <div className="flex flex-col gap-2">
                                        {nearbyStations.map(s => (
                                            <NearbyStationCard key={s.id} station={s} />
                                        ))}
                                    </div>

                                    <button
                                        onClick={onNavigateToMap}
                                        className="w-full py-2.5 rounded-xl bg-[#e5eeff] text-[#004ac6] text-sm font-semibold flex items-center justify-center gap-1 hover:bg-[#dce9ff] transition-colors"
                                    >
                                        Xem bản đồ toàn bộ trạm SmartLocker
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Card: Quick Actions */}
                                <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-6 flex flex-col gap-4">
                                    <h3 className="text-[18px] font-semibold text-[#0b1c30]">Thao tác nhanh</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <QuickActionCard
                                            icon={<MapPin className="w-5 h-5" />}
                                            iconBg="bg-[#dbe1ff]" iconColor="text-[#004ac6]"
                                            title="Tìm trạm quanh đây" desc="Xem bản đồ GPS"
                                            onClick={onNavigateToMap}
                                        />
                                        <QuickActionCard
                                            icon={<Zap className="w-5 h-5" />}
                                            iconBg="bg-[#6ffbbe]" iconColor="text-[#006242]"
                                            title="Đặt tủ mới 30s" desc="Giữ chỗ trước"
                                            onClick={onNavigateToMap}
                                        />
                                        <QuickActionCard
                                            icon={<Shield className="w-5 h-5" />}
                                            iconBg="bg-[#dae2fd]" iconColor="text-[#565e74]"
                                            title="Bảo hiểm 50.000K" desc="Quy chuẩn an toàn"
                                        />
                                        <QuickActionCard
                                            icon={<User className="w-5 h-5" />}
                                            iconBg="bg-[#dce9ff]" iconColor="text-[#0b1c30]"
                                            title="Hồ sơ & Ví" desc="Liên kết thẻ/eWallet"
                                        />
                                    </div>
                                </div>

                                {/* Card: Safety guarantee */}
                                <div className="rounded-2xl bg-[#eff4ff] p-4 flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center shrink-0">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[#0b1c30]">Cam kết an toàn SmartLocker Shield</span>
                                        <p className="text-sm text-[#434655] mt-0.5">
                                            Mọi hành lý lưu trữ đều được bảo hiểm tự động lên đến 50.000.000 VNĐ kết hợp hệ thống camera AI 24/7 và cảm biến chống cạy phá.
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* ── BOTTOM OFFLINE BANNER ──────────────────────────── */}
                        <div className="w-full rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#dbe1ff] flex items-center justify-center text-[#2563eb] shrink-0">
                                    <Wifi className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-[#0b1c30]">Bạn đang offline hoặc mất kết nối mạng?</span>
                                    <p className="text-sm text-[#434655]">
                                        Chứng chỉ chữ ký số JWS cục bộ cho phép bạn tạo mã mở tủ an toàn ngoại tuyến. Không lo sự cố mạng sân bay hay tầng hầm.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="flex flex-col text-right">
                                    <span className="text-xs text-[#434655]">Tổng đài cứu hộ 24/7</span>
                                    <span className="text-sm font-bold text-[#004ac6] font-mono">1900 1234</span>
                                </div>
                                <a href="tel:19001234" className="px-4 py-2.5 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] text-sm font-semibold flex items-center gap-1.5 transition-colors">
                                    <Phone className="w-4 h-4 text-[#2563eb]" />
                                    Gọi ngay
                                </a>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ── FOOTER ─────────────────────────────────────────────── */}
                <footer className="border-t border-[#e5eeff] mt-4 px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-[#737686]">© 2024 SmartLocker IoT Telemetry Platform. Bản quyền thuộc về SmartLocker.</p>
                    <div className="flex items-center gap-4 text-xs text-[#434655]">
                        <a href="#" className="hover:text-[#004ac6] transition-colors">Chính sách bảo mật</a>
                        <a href="#" className="hover:text-[#004ac6] transition-colors">Điều khoản dịch vụ</a>
                        <a href="#" className="hover:text-[#004ac6] transition-colors">Trợ giúp khẩn cấp 24/7</a>
                    </div>
                </footer>
            </main>

            {/* ── DIGITAL KEY MODAL ──────────────────────────────────────── */}
            {showKeyModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={e => { if (e.target === e.currentTarget) setShowKeyModal(false); }}
                >
                    <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
                        {/* Modal header */}
                        <div className="p-5 bg-[#2563eb] text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Key className="w-6 h-6" />
                                <span className="text-[18px] font-bold">Chìa Khóa Kỹ Thuật Số</span>
                            </div>
                            <button
                                onClick={() => setShowKeyModal(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="p-8 flex flex-col items-center text-center gap-5">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-[#0b1c30]">Ga Bến Thành · Ngăn M-012</span>
                                <span className="text-sm text-[#434655]">Đưa mã QR này trước ống kính camera tại Kiosk hoặc mở qua Bluetooth</span>
                            </div>

                            {/* QR Code */}
                            <div className="p-5 bg-white rounded-2xl shadow border border-[#e2e8f0] flex flex-col items-center">
                                <svg className="w-44 h-44 text-[#0b1c30]" fill="currentColor" viewBox="0 0 100 100">
                                    <path d="M0 0h30v30H0zm5 5v20h20V5zm5 5h10v10H10zM70 0h30v30H70zm5 5v20h20V5zm5 5h10v10H80zM0 70h30v30H0zm5 5v20h20V75zm5 5h10v10H10zM40 10h10v10H40zm15 5h10v5H55zm-15 20h5v15h-5zm10 5h15v10H50zm25-10h10v15H75zm-35 30h10v10H40zm15 5h20v10H55zm25 5h15v15H80zm-15 15h10v10H65zm-25 0h10v10H40z" />
                                </svg>
                                <span className="mt-2 font-mono font-bold text-xs text-[#434655] tracking-wider">#SL2026-918-0012</span>
                            </div>

                            {/* PIN code */}
                            <div className="w-full flex flex-col gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#434655]">Mã số PIN mở tủ trực tiếp:</span>
                                <div className="flex items-center justify-center gap-2">
                                    {['8', '9', '2', '0', '4', '1'].map((digit, i) => (
                                        <span key={i} className="w-10 h-12 rounded-xl bg-[#e5eeff] flex items-center justify-center text-[24px] font-bold text-[#004ac6] font-mono">
                                            {digit}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Unlock button */}
                            <button
                                onClick={handleRemoteUnlock}
                                disabled={unlockState !== 'idle'}
                                className={`w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                                    unlockState === 'success'
                                        ? 'bg-[#006242]'
                                        : 'bg-[#2563eb] hover:bg-[#1d4ed8]'
                                }`}
                            >
                                {unlockState === 'idle' && (
                                    <><Zap className="w-5 h-5" /> Bấm Mở Khóa Từ Xa Ngay (Cloud Unlock)</>
                                )}
                                {unlockState === 'unlocking' && (
                                    <><RefreshCw className="w-5 h-5 animate-spin" /> Đang truyền tín hiệu mở chốt...</>
                                )}
                                {unlockState === 'success' && (
                                    <><CheckCircle className="w-5 h-5" /> Cửa ngăn M-012 đã bật mở!</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TelemetryCell({ label, value, icon, valueClass = 'text-[#0b1c30]', mono = false, bold = false }: {
    label: string; value: string; icon?: React.ReactNode; valueClass?: string; mono?: boolean; bold?: boolean;
}) {
    return (
        <div className="flex flex-col items-center justify-center p-1">
            <span className="text-[11px] font-bold text-[#434655]">{label}</span>
            <span className={`text-xs mt-0.5 flex items-center gap-1 ${valueClass} ${mono ? 'font-mono' : ''} ${bold ? 'font-bold tracking-widest' : ''}`}>
                {icon}
                {value}
            </span>
        </div>
    );
}

function BookingRow({ booking }: { booking: typeof MOCK_RECENT_BOOKINGS[0] }) {
    const isCompleted = booking.status === 'COMPLETED';
    const isCancelled = booking.status === 'CANCELLED';

    const typeIcon: Record<string, React.ReactNode> = {
        airport: <span className="text-xl">✈️</span>,
        walk: <span className="text-xl">🚶</span>,
        store: <span className="text-xl">🏪</span>,
    };

    return (
        <div className={`rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] border border-[#f1f5f9] p-4 hover:bg-[#f8faff] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isCancelled ? 'opacity-80' : ''}`}>
            <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#e5eeff] flex items-center justify-center shrink-0">
                    {typeIcon[booking.type]}
                </div>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0b1c30] truncate">{booking.stationName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#dce9ff] text-[#434655] text-[11px] font-mono font-bold shrink-0">
                            Tủ {booking.lockerCode}
                        </span>
                    </div>
                    <p className="text-sm text-[#434655] flex flex-wrap items-center gap-2 mt-0.5">
                        <span>{booking.date}</span>
                        <span className="text-[#c3c6d7]">·</span>
                        <span className={`font-mono font-bold ${isCancelled ? 'line-through text-[#737686]' : 'text-[#0b1c30]'}`}>
                            {booking.amount}
                        </span>
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#6ffbbe] text-[#002113] text-[11px] font-bold uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#006242]" />
                        HOÀN THÀNH
                    </span>
                )}
                {isCancelled && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dce9ff] text-[#434655] text-[11px] font-bold uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#737686]" />
                        ĐÃ HỦY
                    </span>
                )}
                {isCompleted ? (
                    <button className="text-xs font-semibold text-[#2563eb] hover:text-[#004ac6] flex items-center gap-0.5 transition-colors">
                        Biên lai <ReceiptText className="w-4 h-4" />
                    </button>
                ) : (
                    <button className="text-xs font-semibold text-[#434655] hover:text-[#0b1c30] flex items-center gap-0.5 transition-colors">
                        Chi tiết <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

function LockerCell({ code, status, span }: { code: string; status: 'AVAILABLE' | 'OCCUPIED' | 'MINE' | 'MAINTENANCE'; span: number }) {
    const isAvailable = status === 'AVAILABLE';
    const isMine = status === 'MINE';
    const isMaintenance = status === 'MAINTENANCE';

    const colSpan = span === 2 ? 'col-span-2' : span === 3 ? 'col-span-3' : '';
    const aspect = span === 2 ? 'aspect-[2/1]' : span === 3 ? 'aspect-[3/1]' : 'aspect-square';

    if (isMine) {
        return (
            <div className={`${colSpan} ${aspect} rounded-xl bg-[#2563eb] text-white flex flex-col items-center justify-center p-2 shadow-md relative overflow-hidden ring-2 ring-[#2563eb] ring-offset-2`}>
                <span className="absolute top-1 right-2 text-[10px] font-bold uppercase bg-white/20 px-1.5 rounded">CỦA BẠN</span>
                <span className="text-sm font-mono font-bold">{code}</span>
                <span className="text-[10px] text-blue-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Khóa an toàn
                </span>
            </div>
        );
    }

    if (isMaintenance) {
        return (
            <div className={`${colSpan} ${aspect} rounded-xl bg-[#f1f5f9] border border-dashed border-[#e2e8f0] flex flex-col items-center justify-center p-2 opacity-70`}>
                <span className="text-xs font-mono text-[#737686]">{code}</span>
                <span className="text-[10px] text-[#434655]">Đang bảo dưỡng định kỳ</span>
            </div>
        );
    }

    if (isAvailable) {
        return (
            <div className={`${colSpan} ${aspect} rounded-xl bg-white border border-[#e2e8f0] flex flex-col items-center justify-center text-center p-1 hover:border-[#4edea3] transition-colors cursor-pointer`}>
                <span className="text-xs font-mono text-[#737686]">{code}</span>
                <span className="text-[10px] text-[#006242] font-bold">{span === 3 ? 'CÒN 1 VỊ TRÍ TRỐNG' : span === 2 ? 'TRỐNG · ĐẶT NGAY' : 'TRỐNG'}</span>
            </div>
        );
    }

    // OCCUPIED
    return (
        <div className={`${colSpan} ${aspect} rounded-xl bg-[#f1f5f9] flex flex-col items-center justify-center text-center p-1 opacity-70`}>
            <span className="text-xs font-mono text-[#737686]">{code}</span>
            <span className="text-[10px] text-[#434655]">{span > 1 ? 'Đang gửi' : 'BẬN'}</span>
        </div>
    );
}

function NearbyStationCard({ station }: { station: Station }) {
    const totalAvail = station.availableS + station.availableM + station.availableL;
    const isPrimary = station.distanceKm != null && station.distanceKm < 1;

    const distLabel = station.distanceKm != null
        ? station.distanceKm < 1
            ? `${Math.round(station.distanceKm * 1000)}m`
            : `${station.distanceKm.toFixed(1)}km`
        : '—';

    return (
        <div className="p-3 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] hover:bg-[#eff4ff] transition-colors flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#0b1c30]">{station.name}</span>
                <span className={`text-xs font-bold ${isPrimary ? 'text-[#004ac6]' : 'text-[#434655]'}`}>{distLabel}</span>
            </div>
            <p className="text-xs text-[#434655]">{station.address.split(',').slice(-2).join(',').trim()} · Mở {station.opensAt}–{station.closesAt}</p>
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#434655]">
                    <span>S: <strong className="text-[#006242]">{station.availableS}</strong></span>
                    <span>·</span>
                    <span>M: <strong className="text-[#006242]">{station.availableM}</strong></span>
                    <span>·</span>
                    <span>L: <strong className="text-[#006242]">{station.availableL}</strong></span>
                </div>
                <button
                    disabled={totalAvail === 0}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
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
            onClick={onClick}
            className="flex flex-col items-start gap-2 p-4 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] hover:bg-[#eff4ff] hover:border-[#c3c6d7] transition-all group text-left"
        >
            <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                {icon}
            </div>
            <span className="text-sm font-bold text-[#0b1c30]">{title}</span>
            <span className="text-xs text-[#434655]">{desc}</span>
        </button>
    );
}
