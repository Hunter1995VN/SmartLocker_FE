/**
 * AD-FE-03: UC-A03, UC-A04 — Manage Stations & Lockers
 * Hàng 4 thẻ KPI tóm tắt toàn bộ mạng lưới trạm và ô tủ.
 * Chuẩn giao diện theo mockup Station Network & Compartment Configuration.
 */
import { Layers, Box, Tag, PieChart } from 'lucide-react';
import type { StationAdminDetailDto } from '../../../api/adminStationService';

interface StationKpiSummaryProps {
    stations: StationAdminDetailDto[];
    isLoading: boolean;
}

export default function StationKpiSummary({ stations, isLoading }: StationKpiSummaryProps) {
    const totalStations = stations.length;
    const onlineStations = stations.filter(s => s.status === 'ACTIVE').length;
    const maintenanceStations = stations.filter(s => s.status === 'MAINTENANCE' || s.status === 'INACTIVE').length;

    let totalS = 0;
    let totalM = 0;
    let totalL = 0;
    let availableS = 0;
    let availableM = 0;
    let availableL = 0;

    stations.forEach(s => {
        totalS += s.totalS || 0;
        totalM += s.totalM || 0;
        totalL += s.totalL || 0;
        availableS += s.availableS || 0;
        availableM += s.availableM || 0;
        availableL += s.availableL || 0;
    });

    const totalCompartments = totalS + totalM + totalL;
    const totalAvailable = availableS + availableM + availableL;
    const totalOccupied = Math.max(0, totalCompartments - totalAvailable);
    const occupancyRate = totalCompartments > 0
        ? ((totalOccupied / totalCompartments) * 100).toFixed(1)
        : '0.0';

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Card 1: Total Stations */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Total Stations
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                                {isLoading ? '—' : totalStations}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">locations</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                        <Layers className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2.5 text-[11px] font-medium">
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {onlineStations} Online
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1 text-rose-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        {maintenanceStations} Maintenance
                    </span>
                </div>
            </div>

            {/* Card 2: Compartments */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Compartments
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                                {isLoading ? '—' : totalCompartments.toLocaleString()}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">bays</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                        <Box className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        S: {isLoading ? '—' : totalS.toLocaleString()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        M: {isLoading ? '—' : totalM.toLocaleString()}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                        L: {isLoading ? '—' : totalL.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Card 3: Applied Pricing Policies */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Applied Pricing Policies
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                                {isLoading ? '—' : '03'}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">standard models</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                        <Tag className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold truncate">
                        Hourly (S, M, L) · Overdue Fees · Grace Period
                    </span>
                </div>
            </div>

            {/* Card 4: Avg Occupancy Rate */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Avg Occupancy Rate
                        </p>
                        <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                                {isLoading ? '—' : `${occupancyRate}%`}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                Realtime
                            </span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                        <PieChart className="w-5 h-5" />
                    </div>
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Đang sử dụng: <b className="text-slate-800">{totalOccupied}</b> ô</span>
                    <span>Trống: <b className="text-emerald-700">{totalAvailable}</b> ô</span>
                </div>
            </div>
        </div>
    );
}
