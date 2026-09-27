/**
 * AD-FE-02: UC-A02 — Operations Dashboard
 * Header điều khiển phía trên của Operations Dashboard.
 * Hiển thị đường dẫn (Breadcrumb), ô tìm kiếm, trạng thái telemetry thời gian thực, heartbeat và nút Refresh.
 */
import { Search, RefreshCw, Zap, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

interface DashboardHeaderProps {
    role: string;
    offlineDevicesCount: number;
    openIncidentsCount: number;
    lastUpdated: Date | null;
    isRefreshing: boolean;
    onRefresh: () => void;
}

export default function DashboardHeader({
    role,
    offlineDevicesCount,
    openIncidentsCount,
    lastUpdated,
    isRefreshing,
    onRefresh,
}: DashboardHeaderProps) {
    const isAdmin = role.toLowerCase() === 'admin';

    return (
        <div className="space-y-3.5">
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                {/* Left: Breadcrumbs & Search */}
                <div className="flex items-center gap-4 flex-1 max-w-xl">
                    <div className="flex items-center gap-1.5 text-slate-400 font-medium whitespace-nowrap">
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-800 font-semibold">Operations</span>
                    </div>

                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-3.5 h-3.5" />
                        </div>
                        <input
                            type="text"
                            readOnly
                            placeholder="Search station, locker bay, MAC, booking ID..."
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none cursor-default"
                        />
                    </div>
                </div>

                {/* Right: Telemetry Status Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Mesh Stream: Active</span>
                    </span>

                    {offlineDevicesCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[11px]">
                            <Zap className="w-3 h-3 text-rose-600" />
                            <span>{offlineDevicesCount} Fault / Offline</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[11px]">
                            <Zap className="w-3 h-3 text-slate-400" />
                            <span>0 Fault</span>
                        </span>
                    )}

                    {openIncidentsCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[11px]">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{openIncidentsCount} Incidents</span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[11px]">
                            <AlertTriangle className="w-3 h-3 text-slate-400" />
                            <span>0 Incidents</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Sync Heartbeat & Live Control Bar */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                        <Activity className="w-3 h-3" />
                        <span>LIVE TELEMETRY</span>
                    </span>
                    <span className="text-slate-500 font-mono text-[11px] hidden md:inline">
                        Sync Heartbeat: {lastUpdated ? lastUpdated.toISOString().replace('T', ' ').slice(0, 19) : '--'} UTC
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isAdmin ? 'ADMIN (FULL CONTROL)' : 'STAFF (OPERATIONS)'}</span>
                    </div>

                    <button
                        type="button"
                        disabled={isRefreshing}
                        onClick={onRefresh}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
