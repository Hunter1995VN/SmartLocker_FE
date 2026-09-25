/**
 * AD-FE-02: UC-A02 — Operations Dashboard
 * Component hiển thị Cảnh báo sự cố khẩn cấp: Real-time Critical Triage.
 * Thể hiện danh sách sự cố phần cứng, lỗi ô tủ hoặc mất kết nối thiết bị theo thời gian thực.
 */
import { ShieldAlert, CheckCircle2, MapPin, Wrench } from 'lucide-react';
import type { IncidentDto } from '../../api/adminDashboardService';

interface CriticalTriageCardProps {
    incidents: IncidentDto[];
    maintenanceLockers: number;
    isLoading: boolean;
}

export default function CriticalTriageCard({
    incidents,
    maintenanceLockers,
    isLoading,
}: CriticalTriageCardProps) {
    const criticalCount = incidents.filter(
        (i) => i.severity?.toUpperCase() === 'CRITICAL' || i.severity?.toUpperCase() === 'HIGH'
    ).length;

    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between select-none">
            {/* Header */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/60">
                            <ShieldAlert className="w-4 h-4" />
                        </span>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">Real-time Critical Triage</h2>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {criticalCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                                {criticalCount} P1 Critical
                            </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                            {incidents.length} Active
                        </span>
                    </div>
                </div>
                <p className="text-xs text-slate-500">
                    Cảnh báo sự cố phần cứng, kẹt chốt khóa điện tử và các bất thường cần can thiệp xử lý.
                </p>
            </div>

            {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                    <div className="w-7 h-7 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
                    <p className="text-xs text-slate-400">Đang quét danh sách sự cố...</p>
                </div>
            ) : incidents.length === 0 && maintenanceLockers === 0 ? (
                <div className="my-6 p-6 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-emerald-800">Không ghi nhận sự cố hoạt động</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">
                        Tất cả các trạm và ô tủ đang hoạt động ổn định, không có phiếu cảnh báo.
                    </p>
                </div>
            ) : (
                <div className="my-3 space-y-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                    {incidents.map((item) => {
                        const isCritical =
                            item.severity?.toUpperCase() === 'CRITICAL' || item.severity?.toUpperCase() === 'HIGH';

                        return (
                            <div
                                key={item.id}
                                className={`p-3 rounded-xl border text-xs flex flex-col gap-2 transition ${
                                    isCritical
                                        ? 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/70'
                                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                                                isCritical
                                                    ? 'bg-rose-600 text-white'
                                                    : 'bg-amber-100 text-amber-800 border border-amber-300/60'
                                            }`}
                                        >
                                            {item.severity || 'ELEVATED'}
                                        </span>
                                        <span className="font-bold text-slate-800">{item.type || 'Lỗi ô tủ'}</span>
                                        <span className="text-[11px] text-slate-500 font-mono">
                                            {item.lockerCode ? `Bay: ${item.lockerCode}` : ''}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {item.createdAt ? new Date(item.createdAt).toLocaleTimeString('vi-VN') : ''}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{item.stationName || 'Trạm SmartLocker'}</span>
                                </div>

                                {item.description && (
                                    <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        );
                    })}

                    {incidents.length === 0 && maintenanceLockers > 0 && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Ghi nhận {maintenanceLockers} ô tủ đang trong danh sách tạm dừng để bảo dưỡng.</span>
                        </div>
                    )}
                </div>
            )}

            {/* Footer Notice */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px]">Cơ chế cứu hộ từ xa sẵn sàng qua phân hệ Incident Center</span>
                <span className="text-[11px] font-semibold text-blue-600">Incident Triage v2.1</span>
            </div>
        </div>
    );
}
