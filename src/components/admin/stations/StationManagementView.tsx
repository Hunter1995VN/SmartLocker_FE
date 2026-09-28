/**
 * AD-FE-03: UC-A03, UC-A04 — Manage Stations & Lockers
 * Màn hình quản lý trạm và cấu hình ô tủ, bảng giá: Station Network & Compartment Configuration.
 * Thiết kế giao diện hoàn toàn bám sát theo mockup media_1790349268540.png.
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Tag, CheckCircle2, AlertCircle } from 'lucide-react';
import adminStationService, {
    type StationAdminDetailDto,
    type CreateStationRequest,
    type UpdateStationRequest,
} from '../../../api/adminStationService';
import StationKpiSummary from './StationKpiSummary';
import StationListColumn from './StationListColumn';
import StationDetailPanel from './StationDetailPanel';
import AddStationModal from './AddStationModal';
import DeleteStationModal from './DeleteStationModal';
import BatchPricingModal from './BatchPricingModal';

export default function StationManagementView() {
    // 1. Data States
    const [stations, setStations] = useState<StationAdminDetailDto[]>([]);
    const [selectedStation, setSelectedStation] = useState<StationAdminDetailDto | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');

    // 2. Modals States
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [isBatchPricingOpen, setIsBatchPricingOpen] = useState<boolean>(false);

    // 3. Action In-Flight States
    const [isSubmittingAdd, setIsSubmittingAdd] = useState<boolean>(false);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // 4. Toast / Feedback
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    }, []);

    // 5. Fetch Station List
    const fetchStations = useCallback(async (selectIdAfterFetch?: string) => {
        try {
            const res = await adminStationService.getStations();
            if (res.success && res.data) {
                setStations(res.data);
                // Keep selected station or select the requested/first one
                if (selectIdAfterFetch) {
                    const found = res.data.find(s => s.id === selectIdAfterFetch);
                    setSelectedStation(found || res.data[0] || null);
                } else {
                    setSelectedStation(prev => {
                        if (!prev) return res.data[0] || null;
                        const match = res.data.find(s => s.id === prev.id);
                        return match || res.data[0] || null;
                    });
                }
            } else {
                setStations([]);
                setSelectedStation(null);
            }
        } catch {
            setStations([]);
            setSelectedStation(null);
            showToast('Không thể kết nối đến máy chủ lấy danh sách trạm', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            await fetchStations();
            if (!isMounted) return;
        };
        void load();
        return () => {
            isMounted = false;
        };
    }, [fetchStations]);

    // Handle Create Station
    const handleCreateStation = async (req: CreateStationRequest): Promise<boolean> => {
        setIsSubmittingAdd(true);
        try {
            const res = await adminStationService.createStation(req);
            if (res.success && res.data) {
                showToast(`Đã thêm mới thành công trạm "${res.data.name}"!`);
                setIsAddModalOpen(false);
                await fetchStations(res.data.id);
                return true;
            } else {
                showToast(res.message || 'Lỗi khi tạo trạm tủ', 'error');
                return false;
            }
        } catch {
            showToast('Lỗi máy chủ khi tạo trạm tủ', 'error');
            return false;
        } finally {
            setIsSubmittingAdd(false);
        }
    };

    // Handle Update Station
    const handleUpdateStation = async (req: UpdateStationRequest): Promise<boolean> => {
        if (!selectedStation) return false;
        setIsUpdating(true);
        try {
            const res = await adminStationService.updateStation(selectedStation.id, req);
            if (res.success && res.data) {
                showToast(`Đã cập nhật trạm "${res.data.name}" thành công!`);
                setSelectedStation(res.data);
                setStations(prev => prev.map(s => s.id === res.data.id ? res.data : s));
                return true;
            } else {
                showToast(res.message || 'Lỗi cập nhật trạm tủ', 'error');
                return false;
            }
        } catch {
            showToast('Lỗi máy chủ khi cập nhật trạm tủ', 'error');
            return false;
        } finally {
            setIsUpdating(false);
        }
    };

    // Handle Delete Station
    const handleDeleteStation = async () => {
        if (!selectedStation) return;
        setIsDeleting(true);
        try {
            const res = await adminStationService.deleteStation(selectedStation.id);
            if (res.success) {
                showToast(`Đã ngưng hoạt động trạm "${selectedStation.name}" thành công!`);
                setIsDeleteModalOpen(false);
                await fetchStations();
            } else {
                showToast(res.message || 'Không thể xóa trạm tủ', 'error');
            }
        } catch {
            showToast('Lỗi máy chủ khi xóa trạm tủ', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const activeStationsCount = stations.filter(s => s.status === 'ACTIVE').length;

    return (
        <div className="space-y-6">
            {/* Toast notification */}
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

            {/* Page Header matching mockup */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1">
                        Operations / <span className="text-blue-600 font-bold">Manage Stations & Lockers</span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                            Station Network & Compartment Configuration
                        </h1>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold tracking-wider uppercase border border-slate-200">
                            UC-A03 · UC-A04
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                        Add, edit station metadata, high-precision GPS coordinates, S/M/L compartment layout allocation, and multi-tier pricing policy matrix.
                    </p>
                </div>

                {/* Right Header Badges & Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Live Sync Status */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-mono font-semibold text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>MQTT Edge Sync: <b>{activeStationsCount} Stations Active</b></span>
                    </div>

                    {/* Batch Apply Pricing */}
                    <button
                        type="button"
                        onClick={() => setIsBatchPricingOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                        <Tag className="w-3.5 h-3.5 text-blue-600" />
                        <span>Batch Apply Pricing</span>
                    </button>

                    {/* Add New Station */}
                    <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>+ Add New Station</span>
                    </button>
                </div>
            </div>

            {/* Top 4 KPI Summary Cards */}
            <StationKpiSummary
                stations={stations}
                isLoading={isLoading}
            />

            {/* Main Content Split: Left (List) - Right (Detail Panel) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Station Network List (5 cols on large screen) */}
                <div className="lg:col-span-5 h-[760px]">
                    <StationListColumn
                        stations={stations}
                        selectedStationId={selectedStation?.id ?? null}
                        onSelectStation={(st) => setSelectedStation(st)}
                        isLoading={isLoading}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                    />
                </div>

                {/* Right Column: Station Detail & Configuration Panel (7 cols on large screen) */}
                <div className="lg:col-span-7">
                    <StationDetailPanel
                        station={selectedStation}
                        isLoading={isLoading}
                        onUpdateStation={handleUpdateStation}
                        onDeleteRequest={() => setIsDeleteModalOpen(true)}
                        onRefreshStation={() => void fetchStations(selectedStation?.id)}
                        isUpdating={isUpdating}
                    />
                </div>
            </div>

            {/* Bottom Status Bar: Edge Mesh Network Status */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        EDGE MESH NETWORK STATUS
                    </span>
                    <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[95.8%]" />
                    </div>
                    <span className="text-slate-400 font-medium">
                        {activeStationsCount}/{stations.length} Controllers responding &lt; 50ms
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        24ms Latency
                    </span>
                    <span className="font-bold text-slate-700">95.8% Ready</span>
                </div>
            </div>

            {/* Modals */}
            <AddStationModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleCreateStation}
                isSubmitting={isSubmittingAdd}
            />

            <DeleteStationModal
                station={selectedStation}
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteStation}
                isDeleting={isDeleting}
            />

            <BatchPricingModal
                isOpen={isBatchPricingOpen}
                onClose={() => setIsBatchPricingOpen(false)}
                stations={stations}
                onSuccess={() => void fetchStations(selectedStation?.id)}
            />
        </div>
    );
}
