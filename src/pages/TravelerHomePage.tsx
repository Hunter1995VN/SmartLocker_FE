import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import {
    MapPin, Search, Bell, ChevronRight, Clock, Package,
    LogOut, User, Zap, Navigation, Phone, Lock,
    CheckCircle, AlertTriangle, X, Menu, RefreshCw, ArrowRight,
} from 'lucide-react';
import { MOCK_STATIONS, MOCK_ACTIVE_BOOKING, calcDistance, getStations } from '../api/stationService';
import type { Station, Booking } from '../api/stationService';

// ─── Config ──────────────────────────────────────────────────────────────────
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string || '';
const MAP_CENTER_DEFAULT = { lat: 10.7769, lng: 106.7009 }; // TP.HCM

const SIZE_LABEL: Record<string, string> = { S: 'Nhỏ', M: 'Vừa', L: 'Lớn' };
const SIZE_COLOR: Record<string, string> = {
    S: 'bg-blue-100 text-blue-700',
    M: 'bg-violet-100 text-violet-700',
    L: 'bg-amber-100 text-amber-700',
};

const STATUS_BOOKING: Record<string, { label: string; color: string }> = {
    PENDING_PAYMENT: { label: 'Chờ thanh toán', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    CONFIRMED: { label: 'Đã xác nhận', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    CHECKED_IN: { label: 'Đang sử dụng', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    CHECKED_OUT: { label: 'Đã trả tủ', color: 'text-gray-600 bg-gray-50 border-gray-200' },
    OVERDUE: { label: 'Quá hạn!', color: 'text-red-600 bg-red-50 border-red-200' },
};

// ─── Auth data type ───────────────────────────────────────────────────────────
interface AuthUser {
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    avatarUrl?: string;
}

interface Props {
    onLogout: () => void;
    /** Chỉ dùng khi guest: điều hướng sang trang đăng nhập */
    onNavigateLogin?: () => void;
    /** Chỉ dùng khi guest: điều hướng sang trang đăng ký */
    onNavigateRegister?: () => void;
    /** Chỉ dùng khi traveler: quay về Dashboard */
    onNavigateDashboard?: () => void;
    /** Điều hướng sang trang Đặt tủ */
    onNavigateBooking?: (stationId?: string) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function TravelerHomePage({ onLogout, onNavigateLogin, onNavigateRegister, onNavigateDashboard, onNavigateBooking }: Props) {
    const user: AuthUser = JSON.parse(localStorage.getItem('smartlocker_user') || '{}');
    /** true nếu chưa đăng nhập (khách vãng lai) */
    const isGuest = !user.fullName;

    const [stations, setStations] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [activeBooking] = useState<Booking | null>(MOCK_ACTIVE_BOOKING);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [hoveredStation, setHoveredStation] = useState<Station | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapCenter, setMapCenter] = useState(MAP_CENTER_DEFAULT);
    const [mapZoom, setMapZoom] = useState(13);
    const [timeLeft, setTimeLeft] = useState('');
    const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
    const mapRef = useRef<google.maps.Map | null>(null);

    // Load Google Maps
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        language: 'vi',
        region: 'VN',
    });

    // Lấy vị trí user
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(loc);
                    setMapCenter(loc);
                    // Tính khoảng cách cho mỗi station
                    setStations(prev =>
                        [...prev]
                            .map(s => ({ ...s, distanceKm: calcDistance(loc.lat, loc.lng, s.latitude, s.longitude) }))
                            .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))
                    );
                },
                () => { /* permission denied → dùng default */ }
            );
        }
    }, []);

    // Fetch stations with debounce
    useEffect(() => {
        let isMounted = true;
        const fetchStations = async () => {
            setIsLoading(true);
            try {
                let data = await getStations(searchQuery || undefined);
                if (isMounted) {
                    if (userLocation) {
                        data = data
                            .map(s => ({ ...s, distanceKm: calcDistance(userLocation.lat, userLocation.lng, s.latitude, s.longitude) }))
                            .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
                    }
                    setStations(data);
                }
            } catch (err) {
                console.error("Failed to fetch stations, falling back to mock", err);
                if (isMounted) {
                    let fallback = MOCK_STATIONS;
                    if (userLocation) {
                        fallback = fallback
                            .map(s => ({ ...s, distanceKm: calcDistance(userLocation.lat, userLocation.lng, s.latitude, s.longitude) }))
                            .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
                    }
                    setStations(fallback);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchStations();
        }, 500);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [searchQuery, userLocation]);

    // Đếm ngược thời gian booking
    useEffect(() => {
        if (!activeBooking || activeBooking.status !== 'CHECKED_IN') return;
        const update = () => {
            const diff = new Date(activeBooking.endAt).getTime() - Date.now();
            if (diff <= 0) { setTimeLeft('Đã hết giờ'); return; }
            const h = Math.floor(diff / 3_600_000);
            const m = Math.floor((diff % 3_600_000) / 60_000);
            const s = Math.floor((diff % 60_000) / 1_000);
            setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [activeBooking]);

    const onMapLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

    const flyToStation = (station: Station) => {
        setSelectedStation(station);
        setMapCenter({ lat: station.latitude, lng: station.longitude });
        setMapZoom(16);
        if (mapRef.current) {
            mapRef.current.panTo({ lat: station.latitude, lng: station.longitude });
            mapRef.current.setZoom(16);
        }
    };

    const filtered = stations.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleLogout = () => {
        localStorage.clear();
        onLogout();
    };

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50 font-sans">

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* HEADER — Guest (khách vãng lai): giống Landing Page           */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {isGuest && (
                <header className="bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm z-30 shrink-0">
                    <div className="w-full px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-between h-[72px]">
                        {/* Logo */}
                        <a href="#" className="flex items-center gap-3 group">
                            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-all duration-200">
                                <Lock className="w-5 h-5" />
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-gray-900 tracking-tight leading-tight">
                                    SmartLocker
                                    <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                                        24/7 Online
                                    </span>
                                </span>
                                <span className="text-xs text-gray-500 leading-tight hidden sm:block">Mạng lưới tủ thông minh</span>
                            </div>
                        </a>

                        {/* Nav links desktop */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {[
                                { label: 'Trang chủ', href: '#' },
                                { label: 'Tìm trạm', href: '#', active: true },
                                { label: 'Cách hoạt động', href: '#' },
                                { label: 'Bảng giá', href: '#' },
                                { label: 'Hỗ trợ', href: '#' },
                            ].map(link => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                        link.active
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>

                        {/* Right actions */}
                        <div className="flex items-center gap-2 md:gap-3">
                            {/* Live status pill */}
                            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                                <span className="relative flex items-center justify-center">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                                </span>
                                <span>Tất cả trạm Online</span>
                            </div>

                            {/* Language pill */}
                            <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all text-xs font-bold">
                                <span className="text-base leading-none">🇻🇳</span>
                                <span>VND</span>
                                <span className="text-gray-300">|</span>
                                <span>EN</span>
                            </button>

                            {/* Đăng nhập */}
                            <button
                                onClick={() => onNavigateLogin?.()}
                                className="hidden md:inline-flex text-gray-600 hover:text-gray-900 px-4 py-2 text-sm font-semibold transition-colors rounded-lg hover:bg-gray-50"
                            >
                                Đăng nhập
                            </button>

                            {/* Đặt tủ ngay */}
                            <button
                                onClick={() => onNavigateRegister?.()}
                                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                <Zap className="w-4 h-4 hidden sm:block" />
                                <span>Đặt tủ ngay</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>

                            {/* Mobile menu toggle */}
                            <button
                                className="lg:hidden p-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                onClick={() => setSidebarOpen(v => !v)}
                                aria-label="Mở menu"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* HEADER — Traveler (đã đăng nhập): giống Dashboard             */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {!isGuest && (
                <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 md:px-6 lg:px-8 z-30 shrink-0 shadow-sm">
                    {/* Mobile sidebar toggle */}
                    <button
                        onClick={() => setSidebarOpen(v => !v)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors lg:hidden mr-2"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Logo + Nav */}
                    <div className="flex items-center gap-8 flex-1 min-w-0">
                        <a href="#" className="flex items-center gap-2 shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-sm">
                                <Lock className="w-[18px] h-[18px] text-white" />
                            </div>
                            <span className="font-bold text-[18px] leading-6 tracking-tight text-[#0b1c30] hidden sm:block">SmartLocker</span>
                        </a>
                        <nav className="hidden lg:flex items-center gap-1">
                            <button
                                onClick={() => onNavigateDashboard?.()}
                                className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff] transition-colors"
                            >
                                Dashboard
                            </button>
                            <span className="px-4 py-1.5 text-sm font-semibold rounded-xl bg-[#eff4ff] text-[#2563eb]">Tìm trạm</span>
                            <a href="#" className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff] transition-colors">Lịch sử</a>
                            <a href="#" className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff] transition-colors">Hỗ trợ</a>
                        </nav>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#434655] hover:bg-[#eff4ff] transition-colors">
                            <Search className="w-5 h-5" />
                        </button>
                        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[#434655] hover:bg-[#eff4ff] transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                        </button>
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
                </header>
            )}

            {/* ── BODY ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── SIDEBAR ── */}
                <aside className={`
                    ${sidebarOpen ? 'w-[360px]' : 'w-0'} 
                    shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden
                    transition-all duration-300 z-20
                    absolute lg:relative h-full lg:h-auto
                `}>
                    <div className="flex-1 overflow-y-auto">

                        {/* Active Booking Banner */}
                        {activeBooking && (
                            <ActiveBookingCard booking={activeBooking} timeLeft={timeLeft} />
                        )}

                        {/* Quick Actions */}
                        <div className="px-4 py-3 border-b border-gray-50">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Thao tác nhanh</p>
                            <div className="grid grid-cols-2 gap-2">
                                <QuickAction icon={<Zap className="w-4 h-4" />} label="Đặt tủ ngay" color="bg-blue-600" onClick={() => {}} />
                                <QuickAction icon={<Clock className="w-4 h-4" />} label="Lịch sử" color="bg-violet-600" onClick={() => {}} />
                                <QuickAction icon={<Package className="w-4 h-4" />} label="Đơn của tôi" color="bg-emerald-600" onClick={() => {}} />
                                <QuickAction icon={<User className="w-4 h-4" />} label="Hồ sơ" color="bg-amber-500" onClick={() => {}} />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-4 pt-3 pb-2">
                            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                                {(['map', 'list'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-primary shadow-elevation-1' : 'text-gray-400'}`}
                                    >
                                        {tab === 'map' ? '🗺️ Bản đồ' : '📋 Danh sách'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="px-4 py-1.5">
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm trạm tủ..."
                                    className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Station count */}
                        <div className="px-4 py-1.5 flex items-center justify-between">
                            <p className="text-xs text-gray-400">
                                <span className="font-bold text-on-surface">{filtered.length}</span> trạm tủ
                                {userLocation ? ' gần bạn' : ''}
                            </p>
                            <button
                                onClick={() => setStations([...MOCK_STATIONS])}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" /> Làm mới
                            </button>
                        </div>

                        {/* Station List */}
                        <div className="pb-4">
                            {isLoading ? (
                                <div className="px-4 py-2 space-y-4">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="animate-pulse flex items-start space-x-3">
                                            <div className="rounded-xl bg-gray-200 h-9 w-9 shrink-0"></div>
                                            <div className="flex-1 space-y-2 py-1">
                                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                                <div className="h-2 bg-gray-200 rounded w-full"></div>
                                                <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Không tìm thấy trạm tủ</p>
                                </div>
                            ) : (
                                filtered.map(station => (
                                    <StationCard
                                        key={station.id}
                                        station={station}
                                        isSelected={selectedStation?.id === station.id}
                                        onClick={() => flyToStation(station)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </aside>

                {/* Overlay for mobile sidebar */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/20 z-10 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* ── MAP AREA ── */}
                <main className="flex-1 relative overflow-hidden">
                    {/* Toggle sidebar button (on map) */}
                    <button
                        onClick={() => setSidebarOpen(v => !v)}
                        className="absolute top-3 left-3 z-10 bg-white shadow-elevation-2 rounded-xl p-2.5 hover:bg-gray-50 transition-colors hidden lg:flex items-center gap-2 text-sm font-semibold text-gray-600"
                    >
                        <Menu className="w-4 h-4" />
                        {sidebarOpen ? 'Ẩn' : 'Trạm tủ'}
                    </button>

                    {/* My Location button */}
                    {userLocation && (
                        <button
                            onClick={() => {
                                setMapCenter(userLocation);
                                setMapZoom(15);
                                mapRef.current?.panTo(userLocation);
                                mapRef.current?.setZoom(15);
                            }}
                            className="absolute bottom-6 right-4 z-10 bg-white shadow-elevation-3 rounded-full p-3 hover:bg-blue-50 transition-colors"
                            title="Vị trí của tôi"
                        >
                            <Navigation className="w-5 h-5 text-blue-600" />
                        </button>
                    )}

                    {/* Map count badge */}
                    <div className="absolute top-3 right-4 z-10 bg-white rounded-full px-3 py-1.5 shadow-elevation-2 text-xs font-bold text-gray-600">
                        📍 {filtered.filter(s => s.status === 'ACTIVE').length} trạm hoạt động
                    </div>

                    {/* Google Map */}
                    {loadError ? (
                        <MapErrorFallback stations={filtered} onSelect={flyToStation} />
                    ) : !isLoaded ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <div className="text-center">
                                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-gray-500">Đang tải bản đồ...</p>
                            </div>
                        </div>
                    ) : (
                        <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '100%' }}
                            center={mapCenter}
                            zoom={mapZoom}
                            onLoad={onMapLoad}
                            options={{
                                disableDefaultUI: false,
                                zoomControl: true,
                                mapTypeControl: false,
                                streetViewControl: false,
                                fullscreenControl: false,
                                styles: MAP_STYLES,
                            }}
                            onClick={() => { setSelectedStation(null); setHoveredStation(null); }}
                        >
                            {/* User location marker */}
                            {userLocation && (
                                <Marker
                                    position={userLocation}
                                    icon={{
                                        path: google.maps.SymbolPath.CIRCLE,
                                        scale: 10,
                                        fillColor: '#2563eb',
                                        fillOpacity: 1,
                                        strokeColor: '#ffffff',
                                        strokeWeight: 3,
                                    }}
                                    title="Vị trí của bạn"
                                />
                            )}

                            {/* Station markers */}
                            {filtered.map(station => (
                                <Marker
                                    key={station.id}
                                    position={{ lat: station.latitude, lng: station.longitude }}
                                    onClick={() => { setSelectedStation(station); setHoveredStation(null); }}
                                    onMouseOver={() => setHoveredStation(station)}
                                    onMouseOut={() => setHoveredStation(null)}
                                    icon={{
                                        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                                            markerSvg(
                                                station.status === 'ACTIVE'
                                                    ? selectedStation?.id === station.id ? '#1d4ed8' : '#2563eb'
                                                    : '#9ca3af',
                                                selectedStation?.id === station.id
                                            )
                                        )}`,
                                        scaledSize: new google.maps.Size(
                                            selectedStation?.id === station.id ? 44 : 36,
                                            selectedStation?.id === station.id ? 54 : 44
                                        ),
                                        anchor: new google.maps.Point(
                                            selectedStation?.id === station.id ? 22 : 18,
                                            selectedStation?.id === station.id ? 54 : 44
                                        ),
                                    }}
                                />
                            ))}

                            {/* Hover tooltip */}
                            {hoveredStation && hoveredStation.id !== selectedStation?.id && (
                                <InfoWindow
                                    position={{ lat: hoveredStation.latitude, lng: hoveredStation.longitude }}
                                    onCloseClick={() => setHoveredStation(null)}
                                    options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -48) }}
                                >
                                    <div className="font-sans text-xs font-semibold text-gray-800 max-w-[180px] py-0.5">
                                        {hoveredStation.name}
                                    </div>
                                </InfoWindow>
                            )}

                            {/* Selected station InfoWindow */}
                            {selectedStation && (
                                <InfoWindow
                                    position={{ lat: selectedStation.latitude, lng: selectedStation.longitude }}
                                    onCloseClick={() => setSelectedStation(null)}
                                    options={{ pixelOffset: new google.maps.Size(0, -52) }}
                                >
                                    <MapInfoWindow 
                                        station={selectedStation} 
                                        onBook={(s) => onNavigateBooking?.(s.id)}
                                    />
                                </InfoWindow>
                            )}
                        </GoogleMap>
                    )}
                </main>
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActiveBookingCard({ booking, timeLeft }: { booking: Booking; timeLeft: string }) {
    const st = STATUS_BOOKING[booking.status] ?? STATUS_BOOKING.CONFIRMED;
    const isCheckedIn = booking.status === 'CHECKED_IN';

    return (
        <div className={`mx-4 mt-4 mb-1 rounded-2xl border-2 p-4 ${isCheckedIn ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50' : 'border-blue-200 bg-blue-50'}`}>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Booking hiện tại</p>
                    <p className="font-bold text-on-surface mt-0.5">{booking.bookingCode}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${st.color}`}>
                    {st.label}
                </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-on-surface leading-tight">{booking.stationName}</p>
                    <p className="text-xs text-gray-400">{booking.stationAddress}</p>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    Tủ <strong className="text-on-surface">{booking.lockerCode}</strong>
                </span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${SIZE_COLOR[booking.size]}`}>
                    {SIZE_LABEL[booking.size]}
                </span>
            </div>

            {isCheckedIn && timeLeft && (
                <div className="bg-white/70 rounded-xl p-3 text-center mb-3">
                    <p className="text-xs text-gray-400 mb-0.5">Thời gian còn lại</p>
                    <p className="text-2xl font-mono font-bold text-emerald-600">{timeLeft}</p>
                </div>
            )}

            {isCheckedIn && (
                <button className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-95">
                    <CheckCircle className="w-4 h-4" />
                    Mở tủ
                </button>
            )}
        </div>
    );
}

function QuickAction({ icon, label, color, onClick }: {
    icon: React.ReactNode; label: string; color: string; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all active:scale-95 text-left w-full"
        >
            <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center text-white shrink-0`}>
                {icon}
            </div>
            <span className="text-xs font-semibold text-on-surface">{label}</span>
        </button>
    );
}

function StationCard({ station, isSelected, onClick }: {
    station: Station; isSelected: boolean; onClick: () => void;
}) {
    const availS = station.availableS ?? station.totalS;
    const availM = station.availableM ?? station.totalM;
    const availL = station.availableL ?? station.totalL;
    const totalAvail = availS + availM + availL;
    const isActive = station.status === 'ACTIVE';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-blue-50/50 transition-all
                ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5
                    ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <MapPin className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-on-surface leading-tight line-clamp-1">{station.name}</p>
                        {station.distanceKm != null && (
                            <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                                {station.distanceKm < 1
                                    ? `${Math.round(station.distanceKm * 1000)}m`
                                    : `${station.distanceKm.toFixed(1)}km`}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{station.address}</p>

                    <div className="flex items-center gap-2 mt-2">
                        {isActive ? (
                            <>
                                <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    {totalAvail} ô trống
                                </span>
                                <span className="text-gray-200">|</span>
                                <span className="text-xs text-gray-400">{station.opensAt || '06:00'}–{station.closesAt || '22:00'}</span>
                            </>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                                <AlertTriangle className="w-3 h-3" /> Bảo trì
                            </span>
                        )}
                    </div>

                    {isActive && (
                        <div className="flex gap-1.5 mt-2">
                            {[
                                { key: 'S', avail: availS, total: station.totalS },
                                { key: 'M', avail: availM, total: station.totalM },
                                { key: 'L', avail: availL, total: station.totalL },
                            ].map(({ key, avail, total }) => (
                                <div key={key} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${SIZE_COLOR[key]}`}>
                                    {key} <span className="opacity-70">{avail}/{total}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
            </div>
        </button>
    );
}

function MapInfoWindow({ station, onBook }: { station: Station; onBook?: (s: Station) => void }) {
    const availS = station.availableS ?? station.totalS;
    const availM = station.availableM ?? station.totalM;
    const availL = station.availableL ?? station.totalL;
    const totalAvail = availS + availM + availL;
    const isActive = station.status === 'ACTIVE';

    return (
        <div className="font-sans min-w-[220px] max-w-[260px]">
            <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-bold text-gray-900 text-sm leading-tight">{station.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isActive ? 'Hoạt động' : 'Bảo trì'}
                </span>
            </div>
            <p className="text-xs text-gray-500 mb-2">{station.address}</p>

            {isActive && (
                <div className="flex gap-1.5 mb-2">
                    {[
                        { key: 'S', avail: availS, total: station.totalS },
                        { key: 'M', avail: availM, total: station.totalM },
                        { key: 'L', avail: availL, total: station.totalL },
                    ].map(({ key, avail, total }) => (
                        <div key={key} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${(avail ?? 0) > 0 ? SIZE_COLOR[key] : 'bg-gray-100 text-gray-400'}`}>
                            {key}: {avail}/{total}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {station.opensAt || '06:00'}–{station.closesAt || '22:00'}
                </span>
                {station.contactPhone && (
                    <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {station.contactPhone}
                    </span>
                )}
            </div>

            {isActive && totalAvail > 0 && (
                <button 
                    onClick={() => onBook?.(station)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                >
                    Đặt tủ tại đây →
                </button>
            )}
            {isActive && totalAvail === 0 && (
                <p className="text-xs text-center text-gray-400 py-1">Hết ô trống — thử trạm khác</p>
            )}
        </div>
    );
}

// Fallback khi không có API key
function MapErrorFallback({ stations, onSelect }: { stations: Station[]; onSelect: (s: Station) => void }) {
    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center p-6">
                    <MapPin className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-500 text-sm mb-1">Cần Google Maps API Key</p>
                    <p className="text-xs text-gray-400 max-w-xs">
                        Thêm <code className="bg-white px-1 rounded text-blue-600">VITE_GOOGLE_MAPS_API_KEY</code> vào file <code className="bg-white px-1 rounded text-blue-600">.env</code>
                    </p>
                </div>
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 mb-2">DANH SÁCH TRẠM TỦ</p>
                <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-48">
                    {stations.map(s => (
                        <button key={s.id} onClick={() => onSelect(s)}
                            className="text-left p-2 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors">
                            <p className="text-xs font-semibold text-on-surface line-clamp-1">{s.name}</p>
                            <p className="text-xs text-gray-400 line-clamp-1">{s.address}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function markerSvg(color: string, selected: boolean): string {
    const w = selected ? 44 : 36;
    const h = selected ? 54 : 44;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter>
        <path d="M${w / 2} ${h - 4} C${w / 2} ${h - 4} 4 ${h * 0.65} 4 ${w * 0.5} A${w / 2 - 4} ${w / 2 - 4} 0 1 1 ${w - 4} ${w * 0.5} C${w - 4} ${h * 0.65} ${w / 2} ${h - 4} ${w / 2} ${h - 4}Z"
            fill="${color}" filter="url(#shadow)"/>
        <circle cx="${w / 2}" cy="${w * 0.5}" r="${w * 0.22}" fill="white"/>
    </svg>`;
}

// Google Maps custom style — clean, light
const MAP_STYLES: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e8e8e8' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8faff' }] },
];
