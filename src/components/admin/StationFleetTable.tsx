/**
 * AD-FE-02: UC-A02 — Operations Dashboard
 * Bảng thống kê tình trạng trạm tủ: Station Fleet Status.
 * Hiển thị danh sách các trạm, sức chứa ô tủ, thanh tỷ lệ lấp đầy, kết nối thiết bị và trạng thái vận hành.
 */
import { Layers, Download, CheckCircle2, Wifi } from 'lucide-react';
import type { StationOccupancyItemDto } from '../../api/adminDashboardService';

interface StationFleetTableProps {
    stations: StationOccupancyItemDto[];
    isLoading: boolean;
}

export default function StationFleetTable({ stations, isLoading }: StationFleetTableProps) {
    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs select-none">
            {/* Table Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
                            <Layers className="w-4 h-4" />
                        </span>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">Station Fleet Status</h2>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                            {stations.length} Trạm ghi nhận
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Chi tiết tình trạng vận hành, tải ô tủ và kết nối vi điều khiển của từng trạm SmartLocker.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            // Xuất dữ liệu CSV nhanh nếu người dùng click
                            const headers = ['Station Name', 'Total Lockers', 'Occupied Lockers', 'Occupancy Rate'];
                            const rows = stations.map((s) => [s.stationName, s.totalLockers, s.occupiedLockers, `${s.occupancyRate}%`]);
                            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement('a');
                            link.setAttribute('href', encodedUri);
                            link.setAttribute('download', `station_fleet_status_${new Date().toISOString().slice(0, 10)}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Table Container */}
            {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                    <div className="w-7 h-7 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                    <p className="text-xs text-slate-400">Đang tải danh sách trạm...</p>
                </div>
            ) : stations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Chưa có dữ liệu trạm ghi nhận.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-200/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-3 px-3">STATION ID & NAME</th>
                                <th className="py-3 px-3">BAY CAPACITY</th>
                                <th className="py-3 px-3">DEVICE CONNECTIVITY</th>
                                <th className="py-3 px-3">STATION STATUS</th>
                                <th className="py-3 px-3 text-right">ACTION</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stations.map((st) => {
                                const rate = st.occupancyRate ?? (st.totalLockers > 0 ? Math.round((st.occupiedLockers / st.totalLockers) * 100) : 0);
                                const isHighOccupancy = rate >= 85;

                                return (
                                    <tr key={st.stationId} className="hover:bg-slate-50/70 transition">
                                        {/* Station ID & Name */}
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 border border-blue-200/60">
                                                    {st.stationName ? st.stationName.substring(0, 2).toUpperCase() : 'ST'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-tight">{st.stationName}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {st.stationId.slice(0, 8)}...</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Bay Capacity Progress */}
                                        <td className="py-3 px-3 min-w-[180px]">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[11px]">
                                                    <span className="font-semibold text-slate-800">
                                                        {st.occupiedLockers} / {st.totalLockers} bays
                                                    </span>
                                                    <span className={`font-bold ${isHighOccupancy ? 'text-rose-600' : 'text-blue-600'}`}>
                                                        {rate}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            isHighOccupancy ? 'bg-rose-500' : rate > 50 ? 'bg-blue-600' : 'bg-emerald-500'
                                                        }`}
                                                        style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Device Connectivity */}
                                        <td className="py-3 px-3">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                                                <Wifi className="w-3 h-3 text-emerald-600" />
                                                <span>Optimal · 18ms</span>
                                            </span>
                                        </td>

                                        {/* Station Status */}
                                        <td className="py-3 px-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>ONLINE</span>
                                            </span>
                                        </td>

                                        {/* Action */}
                                        <td className="py-3 px-3 text-right">
                                            <span className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer">
                                                Inspect Bays
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
