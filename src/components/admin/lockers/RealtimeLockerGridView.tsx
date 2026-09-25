/**
 * AD-FE-04: UC-A05 + S-01 — Realtime Locker Grid & Status Control
 * Màn hình Sơ đồ ô tủ trực quan & Điều khiển trạng thái thời gian thực.
 * Thiết kế giao diện hoàn toàn bám sát theo mockup media_1790351385226.png.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    RotateCw,
    CheckCircle2,
    AlertCircle,
    Sliders,
} from 'lucide-react';
import adminStationService, {
    type StationAdminDetailDto,
    type LockerGridItemDto,
    type UpdateLockerStatusRequest,
} from '../../../api/adminStationService';
import LockerStatusSummaryCards from './LockerStatusSummaryCards';
import LockerFilterBar from './LockerFilterBar';
import LockerBayGrid from './LockerBayGrid';
import LockerDetailControlPanel from './LockerDetailControlPanel';
import LockerStatusConfirmModal from './LockerStatusConfirmModal';
import { normalizeLockerStatus } from './lockerStatusConstants';

export default function RealtimeLockerGridView() {
    // 1. Station Selection State
    const [stations, setStations] = useState<StationAdminDetailDto[]>([]);
    const [selectedStationId, setSelectedStationId] = useState<string>('');
    const [isLoadingStations, setIsLoadingStations] = useState<boolean>(true);

    // 2. Lockers State for Selected Station
    const [lockers, setLockers] = useState<LockerGridItemDto[]>([]);
    const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);
    const [isLoadingLockers, setIsLoadingLockers] = useState<boolean>(true);

    // 3. Filter States
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sizeFilter, setSizeFilter] = useState<string>('all');

    // 4. Polling & Live Refresh Interval
    const [pollingInterval, setPollingInterval] = useState<number>(5000); // 5s default
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // 5. Update Status Modal State
    const [pendingRequest, setPendingRequest] = useState<UpdateLockerStatusRequest | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

    // 6. Toast Notification
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    // 7. Load Stations
    const loadStations = useCallback(async () => {
        try {
            const res = await adminStationService.getStations();
            if (res.success && res.data && res.data.length > 0) {
                setStations(res.data);
                setSelectedStationId((prev) => (prev ? prev : res.data[0].id));
            } else {
                setStations([]);
            }
        } catch {
            setStations([]);
            showToast('Không thể kết nối danh sách trạm tủ', 'error');
        } finally {
            setIsLoadingStations(false);
        }
    }, [showToast]);

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            await loadStations();
            if (!isMounted) return;
        };
        void init();
        return () => {
            isMounted = false;
        };
    }, [loadStations]);

    // 8. Fetch Lockers for Selected Station
    const fetchLockers = useCallback(async (stationId: string, isSilent = false) => {
        if (!stationId) return;

        try {
            const res = await adminStationService.getStationLockersGrid(stationId);
            if (res.success && res.data) {
                setLockers(res.data);
                setLastRefreshedAt(new Date());

                // Auto-select first locker if none selected
                setSelectedLockerId((curr) => {
                    if (curr && res.data.some((l) => l.id === curr)) return curr;
                    return res.data[0]?.id || null;
                });
            } else {
                setLockers([]);
                setSelectedLockerId(null);
            }
        } catch {
            if (!isSilent) {
                setLockers([]);
                setSelectedLockerId(null);
                showToast('Không thể tải trạng thái sơ đồ ô tủ', 'error');
            }
        } finally {
            if (!isSilent) setIsLoadingLockers(false);
            setIsRefreshing(false);
        }
    }, [showToast]);

    // Trigger locker fetch on station change
    useEffect(() => {
        let isMounted = true;
        if (!selectedStationId) return;

        const load = async () => {
            await fetchLockers(selectedStationId);
            if (!isMounted) return;
        };
        void load();
        return () => {
            isMounted = false;
        };
    }, [selectedStationId, fetchLockers]);

    // 9. Realtime Polling Mechanism (Infrastructure fallback)
    const pollingRef = useRef<number | null>(null);

    useEffect(() => {
        if (pollingInterval <= 0 || !selectedStationId) return;

        pollingRef.current = window.setInterval(() => {
            void fetchLockers(selectedStationId, true);
        }, pollingInterval);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [selectedStationId, pollingInterval, fetchLockers]);

    // Manual Refresh
    const handleManualRefresh = () => {
        if (!selectedStationId) return;
        setIsRefreshing(true);
        void fetchLockers(selectedStationId);
    };

    // Selected Station Object
    const selectedStation = useMemo(() => {
        return stations.find((s) => s.id === selectedStationId) || null;
    }, [stations, selectedStationId]);

    // Selected Locker Object
    const selectedLocker = useMemo(() => {
        return lockers.find((l) => l.id === selectedLockerId) || null;
    }, [lockers, selectedLockerId]);

    // Calculate Status Counts
    const { availableCount, occupiedCount, maintenanceCount, disabledCount } = useMemo(() => {
        let avail = 0;
        let occ = 0;
        let maint = 0;
        let dis = 0;

        lockers.forEach((l) => {
            const st = normalizeLockerStatus(l.businessStatus);
            if (st === 'AVAILABLE') avail++;
            else if (st === 'OCCUPIED') occ++;
            else if (st === 'MAINTENANCE') maint++;
            else dis++;
        });

        return {
            availableCount: avail,
            occupiedCount: occ,
            maintenanceCount: maint,
            disabledCount: dis,
        };
    }, [lockers]);

    // Filtered Lockers List
    const filteredLockers = useMemo(() => {
        return lockers.filter((l) => {
            const st = normalizeLockerStatus(l.businessStatus);
            if (statusFilter !== 'all' && st !== statusFilter) return false;
            if (sizeFilter !== 'all' && l.size !== sizeFilter) return false;
            return true;
        });
    }, [lockers, statusFilter, sizeFilter]);

    // Handle Open Status Update Request
    const handleUpdateStatusRequest = (req: UpdateLockerStatusRequest) => {
        setPendingRequest(req);
        setIsConfirmModalOpen(true);
    };

    // Handle Confirm Status Update
    const handleConfirmStatusUpdate = async () => {
        if (!selectedLocker || !pendingRequest) return;
        setIsUpdatingStatus(true);

        try {
            const res = await adminStationService.updateLockerStatus(selectedLocker.id, pendingRequest);
            if (res.success) {
                showToast(`Đã chuyển trạng thái ô tủ ${selectedLocker.lockerCode} sang ${pendingRequest.businessStatus}!`);
                setIsConfirmModalOpen(false);

                // Update local state immediately upon API success
                setLockers((prev) =>
                    prev.map((l) =>
                        l.id === selectedLocker.id
                            ? {
                                  ...l,
                                  businessStatus: pendingRequest.businessStatus,
                                  healthStatus: pendingRequest.healthStatus,
                                  notes: pendingRequest.reason || l.notes,
                              }
                            : l
                    )
                );

                // Refetch to sync full database state
                if (selectedStationId) {
                    void fetchLockers(selectedStationId, true);
                }
            } else {
                showToast(res.message || 'Không thể cập nhật trạng thái ô tủ', 'error');
            }
        } catch {
            showToast('Lỗi máy chủ khi cập nhật trạng thái ô tủ. Giữ nguyên trạng thái cũ.', 'error');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Toast feedback */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                    toast.type === 'success'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                        : 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20'
                }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-white" />
                    )}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Top Page Header matching media_1790351385226.png */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                        <span>Quản trị</span>
                        <span>/</span>
                        <span>Vận hành</span>
                        <span>/</span>
                        <span className="text-blue-600 font-bold">Sơ đồ Tủ đồ Thời gian thực</span>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                            Sơ Đồ Ô Tủ Trực Quan & Điều Khiển Trạng Thái
                        </h1>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold tracking-wider uppercase border border-slate-200">
                            UC-A05 · S-01
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Realtime Mesh MQTT (18ms)
                        </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                        Giám sát trạng thái vật lý từng ngăn tủ theo thời gian thực (Live telemetry), cách ly sự cố, và chuyển đổi trạng thái bảo trì / khóa an toàn.
                    </p>
                </div>

                {/* Top Right Controls: Station Selector + Polling Toggle + Refresh */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Station Selector Dropdown */}
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-200/90 shadow-xs">
                        <div className="text-left">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                                Trạm điều khiển
                            </span>
                            <select
                                value={selectedStationId}
                                onChange={(e) => setSelectedStationId(e.target.value)}
                                disabled={isLoadingStations || stations.length === 0}
                                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer max-w-[210px] truncate"
                            >
                                {stations.map((st) => (
                                    <option key={st.id} value={st.id}>
                                        {st.name} ({st.id.slice(0, 6).toUpperCase()})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 whitespace-nowrap">
                            {lockers.length}/{lockers.length} Online
                        </span>
                    </div>

                    {/* Live Polling Interval Selector */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/90 shadow-xs text-xs">
                        <button
                            type="button"
                            onClick={() => setPollingInterval((prev) => (prev === 2000 ? 5000 : prev === 5000 ? 10000 : 2000))}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 cursor-pointer"
                            title="Nhấp để đổi chu kỳ cập nhật tự động (2s / 5s / 10s)"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Live: {pollingInterval / 1000}s</span>
                        </button>

                        {/* Manual Refresh Button */}
                        <button
                            type="button"
                            onClick={handleManualRefresh}
                            className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                            title="Tải lại ngay"
                        >
                            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                        </button>
                    </div>

                    {/* Batch Action Button */}
                    <button
                        type="button"
                        onClick={() => showToast('Chế độ thao tác hàng loạt đang khả dụng')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition cursor-pointer"
                    >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>+ Thao tác hàng loạt</span>
                    </button>
                </div>
            </div>

            {/* Status Summary & Legend Cards Row (4 cards) */}
            <LockerStatusSummaryCards
                total={lockers.length}
                availableCount={availableCount}
                occupiedCount={occupiedCount}
                maintenanceCount={maintenanceCount}
                disabledCount={disabledCount}
                selectedFilter={statusFilter}
                onSelectFilter={setStatusFilter}
                isLoading={isLoadingLockers}
            />

            {/* Filter Bar */}
            <LockerFilterBar
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sizeFilter={sizeFilter}
                onSizeFilterChange={setSizeFilter}
                total={lockers.length}
                availableCount={availableCount}
                occupiedCount={occupiedCount}
                maintenanceCount={maintenanceCount}
                disabledCount={disabledCount}
            />

            {/* Main Content Split: Grid (7 cols) - Detail Panel (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Locker Bay Grid (7 cols) */}
                <div className="lg:col-span-7">
                    <LockerBayGrid
                        lockers={filteredLockers}
                        selectedLocker={selectedLocker}
                        onSelectLocker={(l) => setSelectedLockerId(l.id)}
                        isLoading={isLoadingLockers}
                        stationName={selectedStation?.name}
                        stationAddress={selectedStation?.address}
                    />
                </div>

                {/* Right Column: Detail & Status Control Panel (5 cols) */}
                <div className="lg:col-span-5">
                    <LockerDetailControlPanel
                        key={selectedLocker?.id}
                        locker={selectedLocker}
                        stationName={selectedStation?.name}
                        onUpdateStatusRequest={handleUpdateStatusRequest}
                        isUpdating={isUpdatingStatus}
                        onRefreshLockerTelemetry={handleManualRefresh}
                    />
                </div>
            </div>

            {/* Bottom Realtime Activity Log Strip */}
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-700">Nhật ký trực tiếp:</span>
                    <span className="text-slate-500 truncate">
                        Kỹ thuật viên ca trực đang giám sát lưới điều khiển ô tủ. Lần đồng bộ gần nhất lúc{' '}
                        {lastRefreshedAt.toLocaleTimeString('vi-VN')}.
                    </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
                    <span className="text-slate-400">Firmware: LockCore-OS 4.2.1-prod</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-blue-600 font-bold hover:underline cursor-pointer">
                        Toàn bộ Audit Log
                    </span>
                </div>
            </div>

            {/* Confirmation Modal */}
            <LockerStatusConfirmModal
                locker={selectedLocker}
                pendingRequest={pendingRequest}
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmStatusUpdate}
                isUpdating={isUpdatingStatus}
            />
        </div>
    );
}
