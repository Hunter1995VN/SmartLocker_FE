import { useState, useEffect, useCallback } from 'react';
import {
    MapPin, Search, Navigation,
    X, RefreshCw, ArrowRight,
    AlertCircle, LocateFixed, SlidersHorizontal,
} from 'lucide-react';
import { calcDistance, getStations } from '../api/stationService';
import type { Station } from '../api/stationService';
import CustomerHeader from '../components/layout/CustomerHeader';
import InteractiveStationMap from '../components/map/InteractiveStationMap';

// ─── Config ──────────────────────────────────────────────────────────────────
const MAP_CENTER_DANANG = { lat: 16.0544, lng: 108.2022 };
const MAP_CENTER_HCMC = { lat: 10.7755, lng: 106.7005 };

type CityFilter = 'ALL' | 'DANANG' | 'HCMC';
type SizeFilter = 'ALL' | 'S' | 'M' | 'L';

interface Props {
    onLogout: () => void;
    initialStationId?: string;
    onNavigateDashboard?: () => void;
    onNavigateHistory?: () => void;
    onNavigateStationDetail?: (stationId: string, station?: Station) => void;
    onNavigateBooking?: (stationId: string, initialData?: { size?: 'S' | 'M' | 'L'; duration?: number; station?: Station }) => void;
}

/** Loại bỏ các bản ghi trạm trùng tên + địa chỉ */
function deduplicateStations(raw: Station[]): Station[] {
    const map = new Map<string, Station>();
    for (const s of raw) {
        const key = `${s.name.trim().toLowerCase()}|${s.address.trim().toLowerCase()}`;
        const existing = map.get(key);
        if (!existing) {
            map.set(key, s);
        } else {
            const availNew = (s.availableS ?? 0) + (s.availableM ?? 0) + (s.availableL ?? 0);
            const availOld = (existing.availableS ?? 0) + (existing.availableM ?? 0) + (existing.availableL ?? 0);
            if (availNew > availOld) map.set(key, s);
        }
    }
    return Array.from(map.values());
}

function isDaNangStation(s: Station): boolean {
    const lat = Number(s.latitude);
    return lat >= 15.5 && lat <= 16.5;
}

export default function FindStationPage({
    onLogout,
    initialStationId,
    onNavigateDashboard,
    onNavigateHistory,
    onNavigateStationDetail,
    onNavigateBooking,
}: Props) {
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [cityFilter, setCityFilter] = useState<CityFilter>('ALL');
    const [sizeFilter, setSizeFilter] = useState<SizeFilter>('ALL');
    const [radiusKm, setRadiusKm] = useState<number | null>(null);
    const [showExtraFilters, setShowExtraFilters] = useState(false);

    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(MAP_CENTER_DANANG);
    const [mapCenter, setMapCenter] = useState(MAP_CENTER_DANANG);
    const [mapZoom, setMapZoom] = useState(13);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [apiError, setApiError] = useState<string | null>(null);

    const applyDistanceAndSort = useCallback((list: Station[], loc: { lat: number; lng: number }) => {
        return deduplicateStations(list)
            .map(s => ({
                ...s,
                distanceKm: calcDistance(loc.lat, loc.lng, Number(s.latitude), Number(s.longitude)),
            }))
            .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    }, []);

    const fetchStationsData = useCallback(async (query?: string) => {
        setIsLoading(true);
        setApiError(null);
        try {
            const rawData = await getStations({
                search: query || undefined,
                userLat: userLocation.lat,
                userLng: userLocation.lng,
            });
            const sorted = applyDistanceAndSort(rawData, userLocation);
            setStations(sorted);
            if (initialStationId) {
                const target = sorted.find(s => s.id === initialStationId || s.name.trim().toLowerCase() === initialStationId.trim().toLowerCase());
                if (target) {
                    setSelectedStation(target);
                    setMapCenter({ lat: Number(target.latitude), lng: Number(target.longitude) });
                    setMapZoom(16);
                }
            }
        } catch (err) {
            console.error('Lỗi tải danh sách trạm:', err);
            setStations([]);
            setApiError('Không thể kết nối máy chủ Backend.');
        } finally {
            setIsLoading(false);
        }
    }, [userLocation, applyDistanceAndSort, initialStationId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStationsData(searchQuery);
        }, 250);
        return () => clearTimeout(timer);
    }, [searchQuery, fetchStationsData]);

    const fetchUserLocation = useCallback(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const rawLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(rawLoc);
                if (!initialStationId) {
                    setMapCenter(rawLoc);
                    setMapZoom(14);
                }
            },
            () => {},
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [initialStationId]);

    useEffect(() => {
        fetchUserLocation();
    }, [fetchUserLocation]);

    const handleManualLocationChange = (newLoc: { lat: number; lng: number }) => {
        setUserLocation(newLoc);
        setMapCenter(newLoc);
        setStations(prev => {
            const updated = applyDistanceAndSort(prev, newLoc);
            if (selectedStation) {
                const found = updated.find(s => s.id === selectedStation.id);
                if (found) setSelectedStation(found);
            }
            return updated;
        });
    };

    const handleSelectCity = (city: CityFilter) => {
        setCityFilter(city);
        setSelectedStation(null);
        if (city === 'DANANG') {
            setMapCenter(MAP_CENTER_DANANG);
            setMapZoom(13);
        } else if (city === 'HCMC') {
            setMapCenter(MAP_CENTER_HCMC);
            setMapZoom(13);
        }
    };

    const filtered = stations
        .filter(s => {
            if (s.status !== 'ACTIVE') return false;
            if (cityFilter === 'DANANG' && !isDaNangStation(s)) return false;
            if (cityFilter === 'HCMC' && isDaNangStation(s)) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!s.name.toLowerCase().includes(q) && !s.address.toLowerCase().includes(q)) return false;
            }
            if (sizeFilter === 'S' && (s.availableS ?? 0) <= 0) return false;
            if (sizeFilter === 'M' && (s.availableM ?? 0) <= 0) return false;
            if (sizeFilter === 'L' && (s.availableL ?? 0) <= 0) return false;
            if (radiusKm != null && s.distanceKm != null && s.distanceKm > radiusKm) return false;
            return true;
        })
        .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

    const flyToStation = (station: Station) => {
        setSelectedStation(station);
        setMapCenter({ lat: Number(station.latitude), lng: Number(station.longitude) });
        setMapZoom(15);
    };

    const handleViewDetail = (station: Station) => {
        if (onNavigateStationDetail) {
            onNavigateStationDetail(station.id, station);
        } else if (onNavigateBooking) {
            onNavigateBooking(station.id, { station });
        }
    };

    const handleBookStation = (station: Station) => {
        if (onNavigateBooking) {
            const initialSize = sizeFilter !== 'ALL' ? sizeFilter : undefined;
            onNavigateBooking(station.id, { station, ...(initialSize ? { size: initialSize } : {}) });
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        onLogout();
    };

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <CustomerHeader
                currentPage="find-station"
                onNavigate={(page) => {
                    if (page === 'dashboard') onNavigateDashboard?.();
                    else if (page === 'my-bookings') onNavigateHistory?.();
                }}
                onLogout={handleLogout}
            />

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* ══ MINIMALIST LEFT SIDEBAR ══ */}
                <aside className="w-full lg:w-[390px] h-[48%] lg:h-full shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col overflow-hidden">

                    {/* Top Search & Compact Filter Bar */}
                    <div className="p-4 border-b border-slate-100 space-y-3">
                        {/* Search Input + Locate + Filter Toggle */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    id="find-station-search"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full h-10 pl-10 pr-8 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                                    placeholder="Tìm tên trạm, đường, quận..."
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <button
                                id="find-station-near-me"
                                onClick={() => fetchUserLocation()}
                                className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors cursor-pointer"
                                title="Định vị GPS của tôi"
                            >
                                <Navigation className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowExtraFilters(v => !v)}
                                className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                                    showExtraFilters || sizeFilter !== 'ALL' || radiusKm !== null
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                                title="Bộ lọc cỡ tủ & bán kính"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Clean City Tabs */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl flex-1">
                                {[
                                    { key: 'ALL' as CityFilter, label: 'Tất cả' },
                                    { key: 'DANANG' as CityFilter, label: 'Đà Nẵng' },
                                    { key: 'HCMC' as CityFilter, label: 'TP.HCM' },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => handleSelectCity(tab.key)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                            cityFilter === tab.key
                                                ? 'bg-white text-slate-900 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs font-medium text-slate-400 shrink-0 px-1">
                                {filtered.length} trạm
                            </span>
                        </div>

                        {/* Collapsible Extra Filters (Only shown when clicked) */}
                        {showExtraFilters && (
                            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 animate-fade-in-down">
                                <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-[11px] font-medium text-slate-400">Cỡ tủ:</span>
                                    <div className="flex items-center gap-1">
                                        {(['ALL', 'S', 'M', 'L'] as SizeFilter[]).map(sz => (
                                            <button
                                                key={sz}
                                                onClick={() => setSizeFilter(sz)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                    sizeFilter === sz
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {sz === 'ALL' ? 'Tất cả' : `Size ${sz}`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-[11px] font-medium text-slate-400">Bán kính:</span>
                                    <div className="flex items-center gap-1">
                                        {[
                                            { val: null, label: 'Mọi nơi' },
                                            { val: 5, label: '< 5km' },
                                            { val: 15, label: '< 15km' },
                                        ].map(({ val, label }) => (
                                            <button
                                                key={label}
                                                onClick={() => setRadiusKm(val)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                    radiusKm === val
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Station List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {isLoading && stations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                                <p className="text-xs font-medium text-slate-500">Đang tải danh sách trạm...</p>
                            </div>
                        ) : apiError ? (
                            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                                <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                                <p className="text-sm font-semibold text-slate-800">{apiError}</p>
                                <button
                                    onClick={() => fetchStationsData(searchQuery)}
                                    className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer flex items-center gap-1.5"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" /> Thử lại
                                </button>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                                <p className="text-sm font-semibold text-slate-700">Không tìm thấy trạm phù hợp</p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setCityFilter('ALL');
                                        setSizeFilter('ALL');
                                        setRadiusKm(null);
                                    }}
                                    className="mt-2 text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        ) : (
                            filtered.map((station) => (
                                <StationCard
                                    key={station.id}
                                    station={station}
                                    isSelected={selectedStation?.id === station.id}
                                    onClick={() => flyToStation(station)}
                                    onViewDetail={() => handleViewDetail(station)}
                                    onBook={() => handleBookStation(station)}
                                />
                            ))
                        )}
                    </div>
                </aside>

                {/* ══ MAP PANEL ══ */}
                <main className="flex-1 relative flex flex-col overflow-hidden">
                    <button
                        id="find-station-gps-btn"
                        onClick={() => {
                            setMapCenter({ ...userLocation });
                            setMapZoom(14);
                        }}
                        className="absolute bottom-24 right-3 z-[400] bg-white shadow-md rounded-full p-3 hover:bg-slate-50 transition-colors border border-slate-200 cursor-pointer"
                        title="Về vị trí của bạn"
                    >
                        <LocateFixed className="w-5 h-5 text-red-600" />
                    </button>

                    <InteractiveStationMap
                        stations={filtered}
                        selectedStation={selectedStation}
                        userLocation={userLocation}
                        center={mapCenter}
                        zoom={mapZoom}
                        radiusKm={radiusKm}
                        onSelectStation={(st) => {
                            if (st) flyToStation(st);
                            else setSelectedStation(null);
                        }}
                        onViewDetail={handleViewDetail}
                        onBookStation={handleBookStation}
                        onChangeUserLocation={(loc) => handleManualLocationChange(loc)}
                    />
                </main>
            </div>
        </div>
    );
}

// ─── Minimalist StationCard ───────────────────────────────────────────────────
function StationCard({
    station,
    isSelected,
    onClick,
    onViewDetail,
    onBook,
}: {
    station: Station;
    isSelected: boolean;
    onClick: () => void;
    onViewDetail: () => void;
    onBook: () => void;
}) {
    const availS = Math.min(station.totalS ?? 0, station.availableS ?? 0);
    const availM = Math.min(station.totalM ?? 0, station.availableM ?? 0);
    const availL = Math.min(station.totalL ?? 0, station.availableL ?? 0);
    const totalAvail = availS + availM + availL;

    const distLabel = station.distanceKm != null
        ? station.distanceKm < 1
            ? `${Math.round(station.distanceKm * 1000)} m`
            : `${station.distanceKm.toFixed(1)} km`
        : null;

    const minPrice = Math.min(
        ...[station.priceS, station.priceM, station.priceL].filter((p): p is number => p != null && p > 0)
    );

    return (
        <div
            onClick={onClick}
            className={`px-4 py-3.5 transition-all cursor-pointer ${
                isSelected
                    ? 'bg-blue-50/70 border-l-[3px] border-l-blue-600'
                    : 'hover:bg-slate-50/80 border-l-[3px] border-l-transparent'
            }`}
        >
            {/* Row 1: Title + Distance */}
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                    {station.name}
                </h3>
                {distLabel && (
                    <span className="shrink-0 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {distLabel}
                    </span>
                )}
            </div>

            {/* Row 2: Clean 1-line address */}
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {station.address}
            </p>

            {/* Row 3: Minimalist Badges (Total Available + S/M/L + Price) */}
            <div className="flex items-center justify-between mt-2.5 gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        totalAvail > 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${totalAvail > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {totalAvail > 0 ? `Còn ${totalAvail} ô` : 'Hết ô'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100">S: <b>{availS}</b></span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100">M: <b>{availM}</b></span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100">L: <b>{availL}</b></span>
                    </div>
                </div>

                {Number.isFinite(minPrice) && (
                    <span className="text-xs font-bold text-blue-600 shrink-0">
                        Từ {(minPrice / 1000).toFixed(0)}k/h
                    </span>
                )}
            </div>

            {/* Row 4: Action buttons (shown cleanly when selected, or subtle links) */}
            <div className="flex items-center gap-2 mt-3">
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        onViewDetail();
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors cursor-pointer"
                >
                    Chi tiết
                </button>
                {totalAvail > 0 && (
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation();
                            onBook();
                        }}
                        className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    >
                        Đặt tủ <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
