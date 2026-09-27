/**
 * AD-FE-02: UC-A02 — Operations Dashboard
 * Thanh tiến trình phân bổ ngăn tủ (Locker Compartment Allocation) theo thiết kế mockup.
 * Thể hiện trực quan tỷ lệ khoang tủ: Sẵn sàng (Available), Đang dùng (Occupied), Bảo trì (Blocked/Maint).
 */
import { Layers } from 'lucide-react';

interface LockerCompartmentAllocationProps {
    totalLockers: number;
    availableLockers: number;
    occupiedLockers: number;
    maintenanceLockers: number;
    isLoading: boolean;
}

export default function LockerCompartmentAllocation({
    totalLockers,
    availableLockers,
    occupiedLockers,
    maintenanceLockers,
    isLoading,
}: LockerCompartmentAllocationProps) {
    const availablePct = totalLockers > 0 ? (availableLockers / totalLockers) * 100 : 0;
    const occupiedPct = totalLockers > 0 ? (occupiedLockers / totalLockers) * 100 : 0;
    const maintPct = totalLockers > 0 ? (maintenanceLockers / totalLockers) * 100 : 0;

    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs select-none">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
                            <Layers className="w-4 h-4" />
                        </span>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                            Locker Compartment Allocation
                        </h2>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                            {totalLockers.toLocaleString()} Total Units
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Tình trạng sử dụng và phân bổ ngăn tủ thông minh theo thời gian thực trên toàn bộ mạng lưới.
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : totalLockers === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Chưa có dữ liệu ô tủ trong hệ thống.</div>
            ) : (
                <div className="space-y-4">
                    {/* Multi-segment Progress Bar */}
                    <div className="w-full h-8 bg-slate-100 rounded-xl overflow-hidden flex p-0.5 gap-0.5 border border-slate-200/60 shadow-inner">
                        {availablePct > 0 && (
                            <div
                                style={{ width: `${availablePct}%` }}
                                className="h-full bg-emerald-500 rounded-lg flex items-center justify-center text-white text-[11px] font-bold transition-all duration-700 min-w-[50px] shadow-xs"
                                title={`Sẵn sàng: ${availableLockers} ô (${availablePct.toFixed(1)}%)`}
                            >
                                {availablePct.toFixed(1)}% AVAILABLE
                            </div>
                        )}

                        {occupiedPct > 0 && (
                            <div
                                style={{ width: `${occupiedPct}%` }}
                                className="h-full bg-blue-600 rounded-lg flex items-center justify-center text-white text-[11px] font-bold transition-all duration-700 min-w-[50px] shadow-xs"
                                title={`Đang dùng: ${occupiedLockers} ô (${occupiedPct.toFixed(1)}%)`}
                            >
                                {occupiedPct.toFixed(1)}% OCCUPIED
                            </div>
                        )}

                        {maintPct > 0 && (
                            <div
                                style={{ width: `${maintPct}%` }}
                                className="h-full bg-rose-500 rounded-lg flex items-center justify-center text-white text-[11px] font-bold transition-all duration-700 min-w-[30px] shadow-xs"
                                title={`Bảo trì: ${maintenanceLockers} ô (${maintPct.toFixed(1)}%)`}
                            >
                                {maintPct.toFixed(1)}% MAINT
                            </div>
                        )}
                    </div>

                    {/* Breakdown Stat Pills */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {/* Available */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">AVAILABLE</span>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                                        {availableLockers.toLocaleString()} <span className="text-xs font-normal text-slate-500">ô</span>
                                    </p>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                                {availablePct.toFixed(1)}%
                            </span>
                        </div>

                        {/* Occupied */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">OCCUPIED</span>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                                        {occupiedLockers.toLocaleString()} <span className="text-xs font-normal text-slate-500">ô</span>
                                    </p>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                                {occupiedPct.toFixed(1)}%
                            </span>
                        </div>

                        {/* Blocked / Maint */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">BLOCKED / MAINT</span>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                                        {maintenanceLockers.toLocaleString()} <span className="text-xs font-normal text-slate-500">ô</span>
                                    </p>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                                {maintPct.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
