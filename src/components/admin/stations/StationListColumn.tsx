/**
 * AD-FE-03: UC-A03 — Manage Stations
 * Danh sách trạm tủ bên cột trái: Station Network List.
 * Cho phép tìm kiếm, lọc theo thành phố, hiển thị mã trạm, địa chỉ, GPS, số lượng ô tủ và trạng thái.
 */
import { useState, useMemo } from 'react';
import { Search, X, MapPin, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import type { StationAdminDetailDto } from '../../../api/adminStationService';

interface StationListColumnProps {
    stations: StationAdminDetailDto[];
    selectedStationId: string | null;
    onSelectStation: (station: StationAdminDetailDto) => void;
    isLoading: boolean;
    searchTerm: string;
    onSearchChange: (value: string) => void;
}

export default function StationListColumn({
    stations,
    selectedStationId,
    onSelectStation,
    isLoading,
    searchTerm,
    onSearchChange,
}: StationListColumnProps) {
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const PAGE_SIZE = 5;

    // Detect cities from addresses
    const cityCounts = useMemo(() => {
        let daNang = 0;
        let hcm = 0;
        let haNoi = 0;
        let other = 0;

        stations.forEach(s => {
            const addr = (s.address || '').toLowerCase();
            const name = (s.name || '').toLowerCase();
            if (addr.includes('đà nẵng') || addr.includes('da nang') || name.includes('da nang')) daNang++;
            else if (addr.includes('hồ chí minh') || addr.includes('ho chi minh') || addr.includes('hcm') || addr.includes('sài gòn')) hcm++;
            else if (addr.includes('hà nội') || addr.includes('ha noi')) haNoi++;
            else other++;
        });

        return { daNang, hcm, haNoi, other };
    }, [stations]);

    // Filter stations by search and selected city
    const filteredStations = useMemo(() => {
        return stations.filter(s => {
            const addr = (s.address || '').toLowerCase();
            const name = (s.name || '').toLowerCase();

            // City filter
            if (selectedCity === 'danang') {
                if (!addr.includes('đà nẵng') && !addr.includes('da nang') && !name.includes('da nang')) return false;
            } else if (selectedCity === 'hcm') {
                if (!addr.includes('hồ chí minh') && !addr.includes('ho chi minh') && !addr.includes('hcm') && !addr.includes('sài gòn')) return false;
            } else if (selectedCity === 'hanoi') {
                if (!addr.includes('hà nội') && !addr.includes('ha noi')) return false;
            }

            // Search filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchName = name.includes(term);
                const matchAddr = addr.includes(term);
                const matchId = s.id.toLowerCase().includes(term);
                if (!matchName && !matchAddr && !matchId) return false;
            }

            return true;
        });
    }, [stations, selectedCity, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredStations.length / PAGE_SIZE));
    const paginatedStations = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredStations.slice(start, start + PAGE_SIZE);
    }, [filteredStations, currentPage]);

    // Format a short station code from name or ID
    const getStationCode = (station: StationAdminDetailDto, index: number) => {
        const name = station.name.toUpperCase();
        if (name.includes('DA NANG') || name.includes('ĐÀ NẴNG')) {
            if (name.includes('AIRPORT') || name.includes('SÂN BAY')) return 'DAD-T1';
            if (name.includes('RAILWAY') || name.includes('GA')) return 'DAD-RAIL';
            return 'DAD-PED';
        }
        if (name.includes('HỒ CHÍ MINH') || name.includes('SÂN BAY') || name.includes('TÂN SƠN NHẤT')) {
            return 'SGN-T2';
        }
        if (name.includes('HÀ NỘI') || name.includes('NỘI BÀI')) {
            return 'HAN-T1';
        }
        return `ST-${String(index + 1).padStart(2, '0')}`;
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-full overflow-hidden">
            {/* Header: Title & Total Count */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                            Station Network ({filteredStations.length})
                        </h2>
                        <p className="text-[11px] text-slate-400">Danh sách các trạm vận hành</p>
                    </div>
                </div>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-100">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên trạm, địa chỉ, ID..."
                        value={searchTerm}
                        onChange={(e) => {
                            onSearchChange(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => {
                                onSearchChange('');
                                setCurrentPage(1);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* City Filter Pills */}
                <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto scrollbar-none pb-0.5">
                    <button
                        type="button"
                        onClick={() => { setSelectedCity('all'); setCurrentPage(1); }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                            selectedCity === 'all'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Tất cả ({stations.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSelectedCity('danang'); setCurrentPage(1); }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                            selectedCity === 'danang'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Đà Nẵng ({cityCounts.daNang})
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSelectedCity('hcm'); setCurrentPage(1); }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                            selectedCity === 'hcm'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        TP.HCM ({cityCounts.hcm})
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSelectedCity('hanoi'); setCurrentPage(1); }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                            selectedCity === 'hanoi'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Hà Nội ({cityCounts.haNoi})
                    </button>
                </div>
            </div>

            {/* Station List Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {isLoading ? (
                    <div className="space-y-3 p-2">
                        {[1, 2, 3, 4].map(n => (
                            <div key={n} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 animate-pulse space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-1/3" />
                                <div className="h-3 bg-slate-200 rounded w-3/4" />
                                <div className="h-3 bg-slate-200 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : paginatedStations.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                        <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                        <p className="text-xs font-semibold text-slate-600">Không tìm thấy trạm tủ nào</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Thử đổi từ khóa hoặc bộ lọc</p>
                    </div>
                ) : (
                    paginatedStations.map((station, idx) => {
                        const isSelected = station.id === selectedStationId;
                        const code = getStationCode(station, (currentPage - 1) * PAGE_SIZE + idx);
                        const totalBays = (station.totalS || 0) + (station.totalM || 0) + (station.totalL || 0);
                        const isOnline = station.status === 'ACTIVE';

                        return (
                            <div
                                key={station.id}
                                onClick={() => onSelectStation(station)}
                                className={`p-3.5 rounded-xl border transition cursor-pointer text-left relative ${
                                    isSelected
                                        ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                                }`}
                            >
                                {/* Top Row: Code Badge & Status */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-black tracking-tight ${
                                        isSelected
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}>
                                        {code}
                                    </span>

                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        isOnline
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        {isOnline ? 'ACTIVE / ONLINE' : station.status}
                                    </span>
                                </div>

                                {/* Station Name */}
                                <h3 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1 mb-1">
                                    {station.name}
                                </h3>

                                {/* Address & GPS Snippet */}
                                <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1 mb-2">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{station.address}</span>
                                </p>

                                {/* Bottom Info: Bays Breakdown & Pricing Model */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-slate-700">
                                        <b className="text-blue-600">{totalBays}</b> bays{' '}
                                        <span className="text-slate-400 font-normal">
                                            (S:{station.totalS} · M:{station.totalM} · L:{station.totalL})
                                        </span>
                                    </span>

                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                        {station.priceS ? `${(station.priceS).toLocaleString()}đ/h` : 'STANDARD'}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px]">
                    Hiển thị {filteredStations.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} -{' '}
                    {Math.min(currentPage * PAGE_SIZE, filteredStations.length)} / {filteredStations.length} trạm
                </span>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-bold text-slate-700 px-1">
                        {currentPage} / {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
