/**
 * AD-FE-03: UC-A04 — Manage Lockers
 * Tab 2: S/M/L Compartments & Visual Locker Grid.
 * Hiển thị cấu hình số lượng ngăn tủ theo cỡ S, M, L, tổng số ngăn, và sơ đồ ô tủ thực tế từ Backend.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box,
    Layers,
    CheckCircle2,
    RefreshCw,
    DoorClosed,
    DoorOpen,
} from 'lucide-react';
import adminStationService, {
    type StationAdminDetailDto,
    type LockerGridItemDto,
} from '../../../api/adminStationService';

interface StationCompartmentsTabProps {
    station: StationAdminDetailDto;
}

export default function StationCompartmentsTab({ station }: StationCompartmentsTabProps) {
    const [lockers, setLockers] = useState<LockerGridItemDto[]>([]);
    const [isLoadingLockers, setIsLoadingLockers] = useState<boolean>(true);
    const [filterSize, setFilterSize] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedLocker, setSelectedLocker] = useState<LockerGridItemDto | null>(null);
    const [updatingLockerId, setUpdatingLockerId] = useState<string | null>(null);
    const [statusChangeSuccess, setStatusChangeSuccess] = useState<string | null>(null);

    // Fetch lockers for station
    const fetchLockers = useCallback(async () => {
        try {
            const res = await adminStationService.getStationLockersGrid(station.id);
            if (res.success && res.data) {
                setLockers(res.data);
            } else {
                setLockers([]);
            }
        } catch {
            setLockers([]);
        } finally {
            setIsLoadingLockers(false);
        }
    }, [station.id]);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
                const res = await adminStationService.getStationLockersGrid(station.id);
                if (isMounted) {
                    if (res.success && res.data) {
                        setLockers(res.data);
                    } else {
                        setLockers([]);
                    }
                    setIsLoadingLockers(false);
                }
            } catch {
                if (isMounted) {
                    setLockers([]);
                    setIsLoadingLockers(false);
                }
            }
        };
        void load();
        return () => {
            isMounted = false;
        };
    }, [station.id]);

    // Computed totals from props and backend
    const totalS = station.totalS || 0;
    const totalM = station.totalM || 0;
    const totalL = station.totalL || 0;
    const totalBays = totalS + totalM + totalL;

    const availableCount = station.availableS + station.availableM + station.availableL;
    const occupiedCount = Math.max(0, totalBays - availableCount);

    // Filtered lockers
    const filteredLockers = useMemo(() => {
        return lockers.filter(l => {
            if (filterSize !== 'all' && l.size !== filterSize) return false;
            if (filterStatus !== 'all' && l.businessStatus !== filterStatus) return false;
            return true;
        });
    }, [lockers, filterSize, filterStatus]);

    // Handle changing status of a locker
    const handleToggleMaintenance = async (locker: LockerGridItemDto) => {
        setUpdatingLockerId(locker.id);
        const newStatus = locker.businessStatus === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
        const newHealth = newStatus === 'MAINTENANCE' ? 'WARNING' : 'HEALTHY';

        try {
            const res = await adminStationService.updateLockerStatus(locker.id, {
                businessStatus: newStatus,
                healthStatus: newHealth,
                reason: newStatus === 'MAINTENANCE' ? 'Bảo trì thủ công từ Admin' : 'Khôi phục sẵn sàng hoạt động',
            });

            if (res.success) {
                setStatusChangeSuccess(`Đã chuyển ô tủ ${locker.lockerCode} sang ${newStatus}`);
                setTimeout(() => setStatusChangeSuccess(null), 3000);
                await fetchLockers();
            }
        } catch {
            // Error handling
        } finally {
            setUpdatingLockerId(null);
            setSelectedLocker(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Row: S/M/L Allocation Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Small */}
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80">
                    <div className="flex items-center justify-between text-blue-700 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider">Cỡ Small (S)</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100/80">Tủ nhỏ</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-900">{totalS}</span>
                        <span className="text-xs text-slate-500 font-medium">ô tủ</span>
                    </div>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                        {station.availableS} ô sẵn sàng
                    </p>
                </div>

                {/* Medium */}
                <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200/80">
                    <div className="flex items-center justify-between text-indigo-700 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider">Cỡ Medium (M)</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100/80">Tủ vừa</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-900">{totalM}</span>
                        <span className="text-xs text-slate-500 font-medium">ô tủ</span>
                    </div>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                        {station.availableM} ô sẵn sàng
                    </p>
                </div>

                {/* Large */}
                <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200/80">
                    <div className="flex items-center justify-between text-purple-700 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider">Cỡ Large (L)</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100/80">Tủ lớn</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-900">{totalL}</span>
                        <span className="text-xs text-slate-500 font-medium">ô tủ</span>
                    </div>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                        {station.availableL} ô sẵn sàng
                    </p>
                </div>

                {/* Total */}
                <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-slate-700 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider">Tổng số ô (Total)</span>
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-900">{totalBays}</span>
                        <span className="text-xs text-slate-500 font-medium">ngăn tủ</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                        S:{totalS} + M:{totalM} + L:{totalL}
                    </p>
                </div>
            </div>

            {/* Visual Allocation Segment Bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Phân bổ tình trạng ô tủ thực tế</span>
                    <span className="text-slate-500 font-normal">
                        Trống: <b className="text-emerald-600">{availableCount}</b> | Đang dùng: <b className="text-blue-600">{occupiedCount}</b>
                    </span>
                </div>
                <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                        style={{ width: `${totalBays > 0 ? (availableCount / totalBays) * 100 : 0}%` }}
                        className="bg-emerald-500 transition-all duration-500"
                        title={`Sẵn sàng: ${availableCount}`}
                    />
                    <div
                        style={{ width: `${totalBays > 0 ? (occupiedCount / totalBays) * 100 : 0}%` }}
                        className="bg-blue-600 transition-all duration-500"
                        title={`Đang lưu trữ: ${occupiedCount}`}
                    />
                </div>
            </div>

            {/* Success Feedback banner */}
            {statusChangeSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{statusChangeSuccess}</span>
                </div>
            )}

            {/* Filter & Lockers Grid Header */}
            <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-slate-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Sơ đồ ô tủ ({filteredLockers.length} / {lockers.length || totalBays} ô)
                        </h4>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Size Filter */}
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => setFilterSize('all')}
                                className={`px-2 py-0.5 rounded-md cursor-pointer ${filterSize === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                All Size
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterSize('S')}
                                className={`px-2 py-0.5 rounded-md cursor-pointer ${filterSize === 'S' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                S
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterSize('M')}
                                className={`px-2 py-0.5 rounded-md cursor-pointer ${filterSize === 'M' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                M
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterSize('L')}
                                className={`px-2 py-0.5 rounded-md cursor-pointer ${filterSize === 'L' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                L
                            </button>
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => setFilterStatus('all')}
                                className={`px-2 py-0.5 rounded-md cursor-pointer ${filterStatus === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                            >
                                All Status
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('AVAILABLE')}
                                className={`px-2 py-0.5 rounded-md cursor-pointer ${filterStatus === 'AVAILABLE' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                            >
                                Sẵn sàng
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('OCCUPIED')}
                                className={`px-2 py-0.5 rounded-md cursor-pointer ${filterStatus === 'OCCUPIED' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                            >
                                Đang dùng
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('MAINTENANCE')}
                                className={`px-2 py-0.5 rounded-md cursor-pointer ${filterStatus === 'MAINTENANCE' ? 'bg-white shadow text-amber-600' : 'text-slate-500'}`}
                            >
                                Bảo trì
                            </button>
                        </div>

                        {/* Refresh */}
                        <button
                            type="button"
                            onClick={() => void fetchLockers()}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                            title="Tải lại sơ đồ ô tủ"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLockers ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Locker Grid */}
                {isLoadingLockers ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 py-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                            <div key={n} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredLockers.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <Box className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                        <p className="text-xs font-semibold text-slate-600">Chưa có ô tủ nào trong bộ lọc này</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Trạm này chưa có ô tủ hoặc không khớp điều kiện tìm</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[380px] overflow-y-auto p-1">
                        {filteredLockers.map(locker => {
                            const isAvailable = locker.businessStatus === 'AVAILABLE';
                            const isOccupied = locker.businessStatus === 'OCCUPIED' || locker.businessStatus === 'RESERVED';
                            const isDoorOpen = locker.doorState === 'OPEN';

                            return (
                                <div
                                    key={locker.id}
                                    onClick={() => setSelectedLocker(locker)}
                                    className={`p-2.5 rounded-xl border transition text-left cursor-pointer relative group ${
                                        isAvailable
                                            ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                                            : isOccupied
                                            ? 'bg-blue-50/40 border-blue-200 hover:border-blue-300'
                                            : 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono text-xs font-black text-slate-900">
                                            {locker.lockerCode}
                                        </span>
                                        <span className="text-[10px] font-black px-1 rounded bg-white border border-slate-200 text-slate-700">
                                            {locker.size}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] mt-1.5">
                                        <span className={`font-bold ${
                                            isAvailable
                                                ? 'text-emerald-700'
                                                : isOccupied
                                                ? 'text-blue-700'
                                                : 'text-amber-700'
                                        }`}>
                                            {isAvailable ? 'Sẵn sàng' : isOccupied ? 'Đang dùng' : 'Bảo trì'}
                                        </span>

                                        <span title={`Cửa: ${locker.doorState}`} className="text-slate-400">
                                            {isDoorOpen ? (
                                                <DoorOpen className="w-3.5 h-3.5 text-amber-500" />
                                            ) : (
                                                <DoorClosed className="w-3.5 h-3.5 text-slate-400" />
                                            )}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quick Locker Action Modal / Popover */}
            {selectedLocker && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {selectedLocker.lockerCode}
                                </span>
                                <span className="text-xs font-bold text-slate-800">
                                    Cỡ: {selectedLocker.size}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLocker(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600">
                            <p><b>Trạng thái:</b> {selectedLocker.businessStatus}</p>
                            <p><b>Sức khỏe cảm biến:</b> {selectedLocker.healthStatus}</p>
                            <p><b>Trạng thái cửa chốt:</b> {selectedLocker.doorState}</p>
                            {selectedLocker.currentBooking && (
                                <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 space-y-0.5">
                                    <p><b>Khách:</b> {selectedLocker.currentBooking.customerName}</p>
                                    <p><b>SĐT:</b> {selectedLocker.currentBooking.customerPhone}</p>
                                    <p><b>Mã đơn:</b> {selectedLocker.currentBooking.bookingCode}</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setSelectedLocker(null)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                                Đóng
                            </button>

                            <button
                                type="button"
                                disabled={updatingLockerId === selectedLocker.id}
                                onClick={() => void handleToggleMaintenance(selectedLocker)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition cursor-pointer ${
                                    selectedLocker.businessStatus === 'MAINTENANCE'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                            >
                                {updatingLockerId === selectedLocker.id ? (
                                    'Đang cập nhật...'
                                ) : selectedLocker.businessStatus === 'MAINTENANCE' ? (
                                    'Bật Sẵn sàng (Available)'
                                ) : (
                                    'Chuyển Bảo trì (Maintenance)'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
