import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import {
    MapPin, Search, Bell, LogOut, Lock, Navigation,
    X, RefreshCw, ChevronDown, Plane, Train, ShoppingBag,
    Footprints, Clock, Shield, Phone, ArrowRight, Filter,
    ChevronRight, Zap,
} from 'lucide-react';
import { MOCK_STATIONS, calcDistance } from '../api/stationService';
import type { Station } from '../api/stationService';
import StationDetailPage from './StationDetailPage';

// ─── Config ──────────────────────────────────────────────────────────────────
const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
const MAP_CENTER_DEFAULT = { lat: 10.7769, lng: 106.7009 }; // TP.HCM

// ─── Types ────────────────────────────────────────────────────────────────────
type SizeFilter = 'ALL' | 'S' | 'M' | 'L';
type SortMode = 'nearest' | 'available';

interface AuthUser {
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
}

interface Props {
    onLogout: () => void;
    onNavigateDashboard?: () => void;
    onNavigateHistory?: () => void;
}

// ─── Station icon by name keyword ────────────────────────────────────────────
function getStationIcon(name: string) {
    const n = name.toLowerCase();
    if (n.includes('sân bay') || n.includes('airport')) return { icon: Plane, color: 'bg-sky-100 text-sky-600' };
    if (n.includes('metro') || n.includes('ga') || n.includes('tàu')) return { icon: Train, color: 'bg-violet-100 text-violet-600' };
    if (n.includes('vincom') || n.includes('mall') || n.includes('center') || n.includes('landmark'))
        return { icon: ShoppingBag, color: 'bg-amber-100 text-amber-600' };
    return { icon: Footprints, color: 'bg-emerald-100 text-emerald-600' };
}

// ─── Map Styles ───────────────────────────────────────────────────────────────
const MAP_STYLES: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e8e8e8' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8faff' }] },
];

// ─── Marker SVG ──────────────────────────────────────────────────────────────
function markerSvg(color: string, selected: boolean): string {
    const w = selected ? 48 : 38;
    const h = selected ? 58 : 48;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity="0.28"/></filter>
        <path d="M${w/2} ${h-4} C${w/2} ${h-4} 5 ${h*0.62} 5 ${w*0.5} A${w/2-5} ${w/2-5} 0 1 1 ${w-5} ${w*0.5} C${w-5} ${h*0.62} ${w/2} ${h-4} ${w/2} ${h-4}Z"
            fill="${color}" filter="url(#s)"/>
        <circle cx="${w/2}" cy="${w*0.5}" r="${w*0.21}" fill="white"/>
    </svg>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FindStationPage({ onLogout, onNavigateDashboard }: Props) {
    const user: AuthUser = JSON.parse(localStorage.getItem('smartlocker_user') || '{}');

    // State
    const [stations, setStations] = useState<Station[]>(MOCK_STATIONS);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [hoveredStation, setHoveredStation] = useState<Station | null>(null);
    const [detailStation, setDetailStation] = useState<Station | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sizeFilter, setSizeFilter] = useState<SizeFilter>('ALL');
    const [onlyOpen, setOnlyOpen] = useState(true);
    const [only24h, setOnly24h] = useState(false);
    const [sortMode, setSortMode] = useState<SortMode>('nearest');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapCenter, setMapCenter] = useState(MAP_CENTER_DEFAULT);
    const [mapZoom, setMapZoom] = useState(13);
    const [lastRefresh] = useState<string>('5 giây trước');
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const mapRef = useRef<google.maps.Map | null>(null);

    // Google Maps loader
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        language: 'vi',
        region: 'VN',
    });

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    // GPS: lấy vị trí user
    const fetchUserLocation = useCallback(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(loc);
                setMapCenter(loc);
                setMapZoom(14);
                mapRef.current?.panTo(loc);
                mapRef.current?.setZoom(14);
                setStations(prev =>
                    prev
                        .map(s => ({ ...s, distanceKm: calcDistance(loc.lat, loc.lng, s.latitude, s.longitude) }))
                        .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))
                );
            },
            () => { /* denied */ }
        );
    }, []);

    useEffect(() => { fetchUserLocation(); }, [fetchUserLocation]);

    // Filter + sort
    const isCurrentlyOpen = (s: Station): boolean => {
        if (s.opensAt === '00:00' && s.closesAt === '23:59') return true;
        const now = new Date();
        const [oh, om] = s.opensAt.split(':').map(Number);
        const [ch, cm] = s.closesAt.split(':').map(Number);
        const nowMin = now.getHours() * 60 + now.getMinutes();
        return nowMin >= oh * 60 + om && nowMin <= ch * 60 + cm;
    };

    const is24h = (s: Station) => s.opensAt === '00:00' && s.closesAt === '23:59';

    const filtered = stations
        .filter(s => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!s.name.toLowerCase().includes(q) && !s.address.toLowerCase().includes(q)) return false;
            }
            if (sizeFilter === 'S' && s.availableS === 0) return false;
            if (sizeFilter === 'M' && s.availableM === 0) return false;
            if (sizeFilter === 'L' && s.availableL === 0) return false;
            if (onlyOpen && s.status !== 'ACTIVE') return false;
            if (only24h && !is24h(s)) return false;
            return true;
        })
        .sort((a, b) => {
            if (sortMode === 'nearest') return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
            const availA = a.availableS + a.availableM + a.availableL;
            const availB = b.availableS + b.availableM + b.availableL;
            return availB - availA;
        });

    const flyToStation = (station: Station) => {
        setSelectedStation(station);
        setMapCenter({ lat: station.latitude, lng: station.longitude });
        setMapZoom(16);
        mapRef.current?.panTo({ lat: station.latitude, lng: station.longitude });
        mapRef.current?.setZoom(16);
    };

    const handleLogout = () => {
        localStorage.clear();
        onLogout();
    };

    // Show detail page when user clicks booking CTA
    if (detailStation) {
        return (
            <StationDetailPage
                station={detailStation}
                onBack={() => setDetailStation(null)}
                onLogout={onLogout}
                onNavigateDashboard={onNavigateDashboard}
            />
        );
    }

    const activeCount = stations.filter(s => s.status === 'ACTIVE').length;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#f8f9ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

            {/* ══════════════════════ HEADER ══════════════════════ */}
            <header className="h-16 bg-white border-b border-[#e5eeff] flex items-center px-4 md:px-6 lg:px-8 z-30 shrink-0 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
                {/* Logo + Nav */}
                <div className="flex items-center gap-8 flex-1 min-w-0">
                    <a href="#" className="flex items-center gap-2.5 shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-sm">
                            <Lock className="w-[18px] h-[18px] text-white" />
                        </div>
                        <span className="font-bold text-[18px] leading-6 tracking-tight text-[#0b1c30] hidden sm:block">
                            Smart<span className="text-[#2563eb]">Locker</span>
                        </span>
                    </a>

                    <nav className="hidden lg:flex items-center gap-1">
                        <button
                            onClick={onNavigateDashboard}
                            className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff] transition-colors"
                        >
                            Dashboard
                        </button>
                        <span className="px-4 py-1.5 text-sm font-semibold rounded-xl bg-[#eff4ff] text-[#2563eb]">
                            Tìm trạm
                        </span>
                        <a href="#" className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff] transition-colors">
                            Lịch sử
                        </a>
                        <a href="#" className="px-4 py-1.5 text-sm font-semibold rounded-xl text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff] transition-colors">
                            Hỗ trợ
                        </a>
                    </nav>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Search */}
                    <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#434655] hover:bg-[#eff4ff] transition-colors">
                        <Search className="w-5 h-5" />
                    </button>
                    {/* Notification */}
                    <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[#434655] hover:bg-[#eff4ff] transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                    </button>
                    {/* Language */}
                    <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#c3c6d7] text-[#434655] text-xs font-bold hover:bg-[#eff4ff] transition-colors">
                        <span className="text-sm">🌐</span>
                        <span>VIE / VND</span>
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {/* User */}
                    <div className="relative">
                        <button
                            id="find-station-user-menu"
                            onClick={() => setUserMenuOpen(v => !v)}
                            className="flex items-center gap-2 pl-2 py-1 pr-3 rounded-xl bg-white border border-[#c3c6d7] hover:bg-[#eff4ff] cursor-pointer transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#004ac6] flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {user.fullName?.charAt(0).toUpperCase() ?? 'U'}
                            </div>
                            <div className="hidden md:flex flex-col leading-none text-left">
                                <span className="text-xs font-semibold text-[#0b1c30]">{user.fullName}</span>
                                <span className="text-[11px] text-[#434655]">{user.role || 'Traveler'}</span>
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 text-[#737686]" />
                        </button>
                        {userMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#e5eeff] py-1 z-50">
                                <button
                                    onClick={() => { setUserMenuOpen(false); onNavigateDashboard?.(); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-[#434655] hover:bg-[#eff4ff] flex items-center gap-2"
                                >
                                    <Zap className="w-4 h-4 text-[#2563eb]" /> Dashboard
                                </button>
                                <hr className="my-1 border-[#f0f4ff]" />
                                <button
                                    onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" /> Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ══════════════════════ BREADCRUMB BAR ══════════════════════ */}
            <div className="bg-white border-b border-[#f0f4ff] px-4 md:px-8 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={onNavigateDashboard} className="text-[#434655] hover:text-[#2563eb] transition-colors flex items-center gap-1">
                        🏠 Trang chủ
                    </button>
                    <ChevronRight className="w-4 h-4 text-[#c3c6d7]" />
                    <span className="font-semibold text-[#0b1c30]">Tìm trạm SmartLocker</span>
                    <span className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-[#eff4ff] text-[#2563eb] text-xs font-semibold">
                        <MapPin className="w-3 h-3" /> TP. Hồ Chí Minh
                    </span>
                </div>
                {/* IoT Status */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#007d55]/10 border border-[#007d55]/20 text-xs font-bold text-[#007d55]">
                    <span className="relative flex">
                        <span className="w-2 h-2 rounded-full bg-[#007d55]" />
                        <span className="absolute w-2 h-2 rounded-full bg-[#007d55] animate-ping opacity-75" />
                    </span>
                    Hệ thống IoT trực tuyến &nbsp;|&nbsp; {activeCount} trạm sẵn sàng
                </div>
            </div>

            {/* ══════════════════════ BODY ══════════════════════ */}
            <div className="flex-1 flex overflow-hidden">

                {/* ══ LEFT SIDEBAR ══ */}
                <aside className="w-[400px] shrink-0 bg-white border-r border-[#f0f4ff] flex flex-col overflow-hidden shadow-[1px_0_4px_rgba(15,23,42,0.04)]">

                    {/* Search */}
                    <div className="px-4 pt-4 pb-3 border-b border-[#f0f4ff]">
                        <div className="relative flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737686]" />
                                <input
                                    id="find-station-search"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full h-10 pl-9 pr-8 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50 focus:border-[#2563eb] transition-all"
                                    placeholder="Ga Bến Thành, sân bay, Vincom..."
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#434655]"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <button
                                id="find-station-near-me"
                                onClick={fetchUserLocation}
                                className="shrink-0 flex items-center gap-1.5 h-10 px-3 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-[#1d4ed8] transition-colors shadow-sm"
                            >
                                <Navigation className="w-3.5 h-3.5" />
                                Gần tôi
                            </button>
                        </div>

                        {/* Size filter */}
                        <div className="flex items-center gap-1.5 mt-3">
                            <span className="text-xs text-[#737686] font-semibold shrink-0">Cỡ tủ:</span>
                            {(['ALL', 'S', 'M', 'L'] as SizeFilter[]).map(sz => (
                                <button
                                    key={sz}
                                    id={`filter-size-${sz}`}
                                    onClick={() => setSizeFilter(sz)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${sizeFilter === sz
                                        ? 'bg-[#2563eb] text-white shadow-sm'
                                        : 'bg-[#f0f4ff] text-[#434655] hover:bg-[#e5eeff]'
                                        }`}
                                >
                                    {sz === 'ALL' ? 'Tất cả' : `Size ${sz}`}
                                    {sizeFilter === sz && sz !== 'ALL' && ' ✓'}
                                </button>
                            ))}
                        </div>

                        {/* Status + sort row */}
                        <div className="flex items-center justify-between mt-2.5">
                            <div className="flex items-center gap-3">
                                <button
                                    id="filter-open-now"
                                    onClick={() => setOnlyOpen(v => !v)}
                                    className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${onlyOpen ? 'text-[#007d55]' : 'text-[#94a3b8]'}`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${onlyOpen ? 'bg-[#007d55] animate-pulse' : 'bg-[#94a3b8]'}`} />
                                    Đang mở cửa
                                </button>
                                <button
                                    id="filter-24h"
                                    onClick={() => setOnly24h(v => !v)}
                                    className={`text-xs font-semibold transition-colors ${only24h ? 'text-[#2563eb]' : 'text-[#94a3b8]'}`}
                                >
                                    Mở 24/7
                                </button>
                            </div>
                            <button
                                id="sort-nearest"
                                onClick={() => setSortMode(sortMode === 'nearest' ? 'available' : 'nearest')}
                                className="flex items-center gap-1 text-xs font-semibold text-[#434655] hover:text-[#2563eb] transition-colors"
                            >
                                <Filter className="w-3 h-3" />
                                {sortMode === 'nearest' ? 'Gần nhất (GPS)' : 'Nhiều ô trống'}
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Result count */}
                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#f0f4ff] bg-[#f8f9ff]/50">
                        <p className="text-xs text-[#434655]">
                            Tìm thấy{' '}
                            <span className="font-bold text-[#2563eb]">{filtered.filter(s => s.status === 'ACTIVE').length} trạm khả dụng</span>
                            {' '}quanh bạn
                        </p>
                        <span className="text-xs text-[#737686] font-medium">Bán kính &lt; 8km</span>
                    </div>

                    {/* Station list */}
                    <div className="flex-1 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] flex items-center justify-center mb-3">
                                    <MapPin className="w-7 h-7 text-[#2563eb] opacity-40" />
                                </div>
                                <p className="text-sm font-semibold text-[#0b1c30]">Không tìm thấy trạm</p>
                                <p className="text-xs text-[#737686] mt-1">Thử thay đổi bộ lọc hoặc tìm từ khóa khác</p>
                                <button
                                    onClick={() => { setSearchQuery(''); setSizeFilter('ALL'); setOnlyOpen(false); }}
                                    className="mt-3 text-xs text-[#2563eb] font-semibold hover:underline"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        ) : (
                            <div className="pb-4">
                                {filtered.map((station, idx) => (
                                    <StationCard
                                        key={station.id}
                                        station={station}
                                        isSelected={selectedStation?.id === station.id}
                                        sizeFilter={sizeFilter}
                                        isCurrentlyOpen={isCurrentlyOpen(station)}
                                        onClick={() => flyToStation(station)}
                                        onViewDetail={() => setDetailStation(station)}
                                        rank={idx + 1}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                {/* ══ MAP PANEL ══ */}
                <main className="flex-1 relative flex flex-col overflow-hidden">
                    {/* Map toolbar */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl shadow-[0_2px_8px_rgba(15,23,42,0.1)] border border-[#e5eeff] text-sm">
                            <span className="text-base">🗺️</span>
                            <span className="font-semibold text-[#0b1c30] text-xs">Bản đồ trực quan Metro &amp; CBD</span>
                            <span className="flex items-center gap-1 text-[#007d55] text-xs font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#007d55] animate-pulse" />
                                Cập nhật {lastRefresh}
                            </span>
                        </div>
                        <button
                            onClick={() => setStations([...MOCK_STATIONS])}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl shadow-[0_2px_8px_rgba(15,23,42,0.08)] border border-[#e5eeff] text-xs font-semibold text-[#434655] hover:bg-[#eff4ff] transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Làm mới số ô
                        </button>
                    </div>

                    {/* Station count badge (top right) */}
                    <div className="absolute top-3 right-4 z-10 bg-white rounded-xl px-3 py-2 shadow-[0_2px_8px_rgba(15,23,42,0.1)] border border-[#e5eeff] text-xs font-bold text-[#0b1c30]">
                        📍 {filtered.filter(s => s.status === 'ACTIVE').length} trạm hoạt động
                    </div>

                    {/* GPS button */}
                    {userLocation && (
                        <button
                            id="find-station-gps-btn"
                            onClick={() => {
                                setMapCenter(userLocation);
                                setMapZoom(15);
                                mapRef.current?.panTo(userLocation);
                                mapRef.current?.setZoom(15);
                            }}
                            className="absolute bottom-16 right-4 z-10 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.12)] rounded-full p-3.5 hover:bg-[#eff4ff] transition-colors border border-[#e5eeff]"
                            title="Vị trí của tôi"
                        >
                            <Navigation className="w-5 h-5 text-[#2563eb]" />
                        </button>
                    )}

                    {/* Legend bar */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full shadow-[0_2px_12px_rgba(15,23,42,0.1)] border border-[#e5eeff] text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-[#6d28d9]">
                            <span className="w-3 h-[3px] rounded-full bg-[#6d28d9]" />
                            Metro Tuyến 1
                        </span>
                        <span className="text-[#c3c6d7]">|</span>
                        <span className="flex items-center gap-1.5 text-[#007d55]">
                            <span className="w-2 h-2 rounded-full bg-[#007d55]" />
                            Sẵn sàng
                        </span>
                        <span className="text-[#c3c6d7]">|</span>
                        <span className="flex items-center gap-1.5 text-[#9ca3af]">
                            <span className="w-2 h-2 rounded-full bg-[#9ca3af]" />
                            Hết ô
                        </span>
                    </div>

                    {/* Map */}
                    {loadError ? (
                        <MapFallback
                            stations={filtered}
                            selectedStation={selectedStation}
                            onSelect={flyToStation}
                        />
                    ) : !isLoaded ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#f0f4ff]">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-sm text-[#434655] font-medium">Đang tải bản đồ...</p>
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
                            {/* User location */}
                            {userLocation && (
                                <Marker
                                    position={userLocation}
                                    icon={{
                                        path: google.maps.SymbolPath.CIRCLE,
                                        scale: 11,
                                        fillColor: '#2563eb',
                                        fillOpacity: 1,
                                        strokeColor: '#ffffff',
                                        strokeWeight: 3,
                                    }}
                                    title="Vị trí của bạn"
                                />
                            )}

                            {/* Station markers */}
                            {filtered.map(station => {
                                const isSelected = selectedStation?.id === station.id;
                                const color = station.status === 'ACTIVE'
                                    ? (isSelected ? '#1d4ed8' : '#2563eb')
                                    : '#9ca3af';
                                return (
                                    <Marker
                                        key={station.id}
                                        position={{ lat: station.latitude, lng: station.longitude }}
                                        onClick={() => { setSelectedStation(station); setHoveredStation(null); }}
                                        onMouseOver={() => setHoveredStation(station)}
                                        onMouseOut={() => setHoveredStation(null)}
                                        icon={{
                                            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg(color, isSelected))}`,
                                            scaledSize: new google.maps.Size(isSelected ? 48 : 38, isSelected ? 58 : 48),
                                            anchor: new google.maps.Point(isSelected ? 24 : 19, isSelected ? 58 : 48),
                                        }}
                                    />
                                );
                            })}

                            {/* Hover tooltip */}
                            {hoveredStation && hoveredStation.id !== selectedStation?.id && (
                                <InfoWindow
                                    position={{ lat: hoveredStation.latitude, lng: hoveredStation.longitude }}
                                    onCloseClick={() => setHoveredStation(null)}
                                    options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -52) }}
                                >
                                    <div className="font-sans text-xs font-semibold text-gray-800 max-w-[200px] py-0.5">
                                        {hoveredStation.name}
                                    </div>
                                </InfoWindow>
                            )}

                            {/* Selected station InfoWindow */}
                            {selectedStation && (
                                <InfoWindow
                                    position={{ lat: selectedStation.latitude, lng: selectedStation.longitude }}
                                    onCloseClick={() => setSelectedStation(null)}
                                    options={{ pixelOffset: new google.maps.Size(0, -58) }}
                                >
                                    <MapInfoWindow station={selectedStation} />
                                </InfoWindow>
                            )}
                        </GoogleMap>
                    )}
                </main>
            </div>
        </div>
    );
}

// ─── StationCard ──────────────────────────────────────────────────────────────
function StationCard({
    station, isSelected, sizeFilter, isCurrentlyOpen, onClick, onViewDetail, rank
}: {
    station: Station;
    isSelected: boolean;
    sizeFilter: SizeFilter;
    isCurrentlyOpen: boolean;
    onClick: () => void;
    onViewDetail: () => void;
    rank: number;
}) {
    const isActive = station.status === 'ACTIVE';
    const totalAvail = station.availableS + station.availableM + station.availableL;
    const { icon: StIcon, color: iconColor } = getStationIcon(station.name);
    const distLabel = station.distanceKm != null
        ? station.distanceKm < 1
            ? `${Math.round(station.distanceKm * 1000)}m`
            : `${station.distanceKm.toFixed(1)}km`
        : null;
    const walkMin = station.distanceKm != null ? Math.round(station.distanceKm * 12) : null;

    const sizes = [
        { key: 'S' as const, avail: station.availableS, total: station.totalS, label: 'Cỡ S' },
        { key: 'M' as const, avail: station.availableM, total: station.totalM, label: 'Cỡ M' },
        { key: 'L' as const, avail: station.availableL, total: station.totalL, label: 'Cỡ L' },
    ];

    return (
        <div
            className={`border-b border-[#f0f4ff] transition-all duration-200 cursor-pointer
                ${isSelected
                    ? 'bg-[#eff4ff] border-l-[3px] border-l-[#2563eb]'
                    : 'border-l-[3px] border-l-transparent hover:bg-[#f8f9ff]'
                }`}
            onClick={onClick}
        >
            <div className="px-4 py-4">
                {/* Top row: icon + name + distance */}
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isActive ? iconColor : 'bg-gray-100 text-gray-400'}`}>
                        <StIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-[#0b1c30] leading-tight line-clamp-2">{station.name}</p>
                            {distLabel && (
                                <span className="shrink-0 text-xs font-bold text-[#434655] bg-[#f0f4ff] px-2 py-0.5 rounded-full">
                                    {distLabel}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[#737686] mt-0.5 line-clamp-1">{station.address}</p>
                    </div>
                </div>

                {/* Status row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 ml-[52px]">
                    {walkMin != null && (
                        <span className="flex items-center gap-1 text-xs text-[#434655]">
                            <Footprints className="w-3 h-3" />
                            ~{walkMin} phút
                        </span>
                    )}
                    {isActive ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-[#007d55]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#007d55] animate-pulse" />
                            {isCurrentlyOpen ? `Đang mở (${station.opensAt}–${station.closesAt})` : 'Tạm đóng'}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                            ⚠ Đang bảo trì
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-[#737686]">
                        <Shield className="w-3 h-3" /> CCTV 24/7
                    </span>
                </div>

                {/* Locker availability */}
                {isActive && (
                    <div className="grid grid-cols-3 gap-2 mt-3 ml-[52px]">
                        {sizes.map(({ key, avail, total, label }) => {
                            const isFilteredSize = sizeFilter === key;
                            const isEmpty = avail === 0;
                            return (
                                <div
                                    key={key}
                                    className={`flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all
                                        ${isFilteredSize
                                            ? 'bg-[#2563eb] text-white ring-2 ring-[#2563eb]/30'
                                            : isEmpty
                                                ? 'bg-red-50 text-red-400 border border-red-100'
                                                : 'bg-[#f8f9ff] text-[#434655] border border-[#e5eeff]'
                                        }`}
                                >
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${isFilteredSize ? 'text-white/80' : isEmpty ? 'text-red-400' : 'text-[#737686]'}`}>
                                        {isFilteredSize ? `${label} (đã chọn)` : isEmpty ? `${label}: Hết ô` : label}
                                    </span>
                                    <span className={`text-lg font-bold leading-tight mt-0.5 ${isFilteredSize ? 'text-white' : isEmpty ? 'text-red-400' : 'text-[#0b1c30]'}`}>
                                        {avail}
                                    </span>
                                    <span className={`text-[10px] ${isFilteredSize ? 'text-white/70' : 'text-[#94a3b8]'}`}>
                                        / {total} trống
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* CTA button */}
                {isActive && totalAvail > 0 && (
                    <button
                        id={`book-station-${station.id}`}
                        onClick={e => { e.stopPropagation(); onViewDetail(); }}
                        className={`mt-3 ml-[52px] w-[calc(100%-52px)] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95
                            ${isSelected
                                ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-sm'
                                : 'bg-[#eff4ff] text-[#2563eb] hover:bg-[#e5eeff] border border-[#c3c6d7]'
                            }`}
                    >
                        Xem chi tiết &amp; Đặt chỗ
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}
                {isActive && totalAvail === 0 && (
                    <p className="mt-2 ml-[52px] text-xs text-[#94a3b8] text-center py-1">
                        Hết ô trống — thử trạm khác
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Map InfoWindow ────────────────────────────────────────────────────────────
function MapInfoWindow({ station }: { station: Station }) {
    const isActive = station.status === 'ACTIVE';
    const totalAvail = station.availableS + station.availableM + station.availableL;
    const distLabel = station.distanceKm != null
        ? station.distanceKm < 1
            ? `${Math.round(station.distanceKm * 1000)}m`
            : `${station.distanceKm.toFixed(1)}km`
        : null;

    return (
        <div className="font-sans min-w-[240px] max-w-[280px]">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-bold text-gray-900 text-sm leading-snug">{station.name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isActive ? 'Đang mở' : 'Bảo trì'}
                </span>
            </div>

            {/* Size badges */}
            {isActive && (
                <div className="flex gap-1.5 mb-2">
                    {[
                        { k: 'S', a: station.availableS, t: station.totalS },
                        { k: 'M', a: station.availableM, t: station.totalM },
                        { k: 'L', a: station.availableL, t: station.totalL },
                    ].map(({ k, a, t }) => (
                        <span key={k} className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${a > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                            {k}: {a}/{t}
                        </span>
                    ))}
                    {distLabel && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 ml-auto">
                            {distLabel}
                        </span>
                    )}
                </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {station.opensAt}–{station.closesAt}
                </span>
                {station.contactPhone && (
                    <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {station.contactPhone}
                    </span>
                )}
            </div>

            {/* CTA */}
            {isActive && totalAvail > 0 && (
                <button className="w-full py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5">
                    Giữ chỗ ngay
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            )}
            {isActive && totalAvail === 0 && (
                <p className="text-xs text-center text-gray-400 py-1">Hết ô trống</p>
            )}
        </div>
    );
}

// ─── Map Fallback (when no API key) ───────────────────────────────────────────
function MapFallback({
    stations, selectedStation, onSelect
}: { stations: Station[]; selectedStation: Station | null; onSelect: (s: Station) => void }) {
    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-[#dce9ff] via-[#e8f0fe] to-[#eff4ff] relative overflow-hidden">
            {/* Decorative grid */}
            <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

            <div className="flex-1 flex items-center justify-center relative z-10">
                <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg max-w-sm mx-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#eff4ff] flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-7 h-7 text-[#2563eb]" />
                    </div>
                    <p className="font-bold text-[#0b1c30] mb-1">Cần Google Maps API Key</p>
                    <p className="text-xs text-[#737686] mb-4">
                        Thêm <code className="bg-[#eff4ff] px-1.5 py-0.5 rounded text-[#2563eb] font-mono">VITE_GOOGLE_MAPS_API_KEY</code> vào file <code className="bg-[#eff4ff] px-1.5 py-0.5 rounded text-[#2563eb] font-mono">.env</code> để hiển thị bản đồ thực tế.
                    </p>
                    <p className="text-xs text-[#007d55] font-semibold">Danh sách trạm vẫn hoạt động đầy đủ ở panel trái →</p>
                </div>
            </div>

            {/* Mini station pins on fallback */}
            <div className="absolute inset-0 pointer-events-none">
                {stations.slice(0, 6).map((s, i) => {
                    const isSelected = selectedStation?.id === s.id;
                    const posX = 20 + ((s.longitude - 106.66) / 0.08) * 80;
                    const posY = 80 - ((s.latitude - 10.76) / 0.06) * 60;
                    return (
                        <button
                            key={s.id}
                            className="pointer-events-auto absolute transform -translate-x-1/2 -translate-y-full"
                            style={{ left: `${Math.max(5, Math.min(95, posX))}%`, top: `${Math.max(5, Math.min(90, posY))}%` }}
                            onClick={() => onSelect(s)}
                        >
                            <div className={`rounded-full px-2.5 py-1 text-xs font-bold shadow-md border-2 transition-all
                                ${isSelected
                                    ? 'bg-[#2563eb] text-white border-white scale-110'
                                    : s.status === 'ACTIVE'
                                        ? 'bg-white text-[#2563eb] border-[#2563eb]'
                                        : 'bg-white text-gray-400 border-gray-300'
                                }`}
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                {s.availableS + s.availableM + s.availableL} ô
                            </div>
                            <div className={`w-1.5 h-1.5 rounded-full mx-auto -mt-0.5 ${s.status === 'ACTIVE' ? 'bg-[#2563eb]' : 'bg-gray-400'}`} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
