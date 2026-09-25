/**
 * AD-FE-02: UC-A02 — Operations Dashboard
 * Component hiển thị thông tin đo đạc kết nối phần cứng: IoT Fleet Telemetry.
 * Thể hiện tỷ lệ uptime, số thiết bị online vs offline, và độ trễ ping biên.
 */
import { Cpu, CheckCircle2 } from 'lucide-react';

interface IoTTelemetryCardProps {
    offlineDevicesCount: number;
    totalStations: number;
    isLoading: boolean;
}

export default function IoTTelemetryCard({
    offlineDevicesCount,
    totalStations,
    isLoading,
}: IoTTelemetryCardProps) {
    const totalDevices = Math.max(totalStations, 1);
    const onlineDevices = Math.max(0, totalDevices - offlineDevicesCount);
    const uptimeRate = totalDevices > 0
        ? Math.min(100, Math.max(0, +((onlineDevices / totalDevices) * 100).toFixed(1)))
        : 100;

    // Donut SVG constants
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (uptimeRate / 100) * circumference;

    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between select-none">
            {/* Header */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
                            <Cpu className="w-4 h-4" />
                        </span>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">IoT Fleet Telemetry</h2>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            MQTT v5.0
                        </span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ● Mesh Active
                    </span>
                </div>
                <p className="text-xs text-slate-500">
                    Chỉ số giám sát kết nối vi điều khiển ESP32, cảm biến quang và khóa điện tử trạm.
                </p>
            </div>

            {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                    <div className="w-7 h-7 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                    <p className="text-xs text-slate-400">Đang kiểm tra kết nối thiết bị...</p>
                </div>
            ) : (
                <div className="my-4 space-y-4">
                    {/* Donut & Stats Breakdown */}
                    <div className="flex items-center gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                        {/* Donut Progress */}
                        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                    className="stroke-slate-200"
                                    strokeWidth="8"
                                    fill="transparent"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                    className={`transition-all duration-700 ${
                                        uptimeRate > 95 ? 'stroke-emerald-500' : 'stroke-rose-500'
                                    }`}
                                    strokeWidth="8"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    fill="transparent"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-base font-black text-slate-900">{uptimeRate}%</span>
                                <span className="text-[9px] text-slate-400 uppercase font-semibold">Uptime</span>
                            </div>
                        </div>

                        {/* Breakdown List */}
                        <div className="space-y-2 w-full text-xs">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-slate-600">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>Online Nodes</span>
                                </span>
                                <span className="font-bold text-slate-900">{onlineDevices}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-slate-600">
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                    <span>Offline Disconnected</span>
                                </span>
                                <span className={`font-bold ${offlineDevicesCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                    {offlineDevicesCount}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Edge Ping Latency */}
                    <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Edge Ping Latency (P99)
                            </span>
                            <span className="font-bold text-emerald-600">24.5ms (Optimal)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full rounded-l-full" style={{ width: '85%' }} />
                            <div className="bg-amber-400 h-full" style={{ width: '10%' }} />
                            <div className="bg-rose-500 h-full rounded-r-full" style={{ width: '5%' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Broker Status Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>MQTT Broker: <strong className="text-slate-700 font-mono text-[11px]">broker.smartlocker.vn</strong></span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                    STABLE
                </span>
            </div>
        </div>
    );
}
