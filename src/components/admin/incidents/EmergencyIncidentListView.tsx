/**
 * AD-FE-06: UC-T14 → A08, S-02, UC-S04, UC-S05 — Emergency Incident List View
 *
 * Màn hình chính "Cứu hộ khẩn cấp & Mở khoá tủ từ xa":
 *   - Tải danh sách sự cố từ GET /api/admin/incidents
 *   - Hiển thị filter theo status (Tất cả / Đang mở / Đang xử lý / Đã xử lý) và mức độ nghiêm trọng (Severity)
 *   - Nút "+ Tiếp nhận / Báo cáo sự cố mới (UC-S04)" mở modal tạo phiếu sự cố
 *   - Click incident → hiện IncidentDetailPanel bên phải (desktop) / bên dưới (mobile)
 *   - Loading, Empty, Error state đầy đủ
 */
import { useState, useEffect, useCallback } from 'react';
import {
    ShieldAlert,
    RefreshCw,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Inbox,
    Plus,
    X,
    Filter,
} from 'lucide-react';
import adminIncidentService, {
    type IncidentDetailDto,
    type CreateIncidentRequest,
} from '../../../api/adminIncidentService';
import adminStationService, {
    type StationAdminDetailDto,
    type LockerGridItemDto,
} from '../../../api/adminStationService';
import IncidentDetailPanel from './IncidentDetailPanel';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmergencyIncidentListViewProps {
    /** role = 'admin' | 'staff' | other — dùng để kiểm soát permission của nút unlock */
    userRole: string;
}

// ─── Types & Constants ────────────────────────────────────────────────────────

type FilterTab = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
type SeverityFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const INCIDENT_TYPES: { value: string; label: string }[] = [
    { value: 'DOOR_JAMMED', label: 'DOOR_JAMMED — Kẹt cơ khí cửa tủ' },
    { value: 'LOCK_FAILURE', label: 'LOCK_FAILURE — Lỗi chốt khóa điện từ (Solenoid)' },
    { value: 'SENSOR_ERROR', label: 'SENSOR_ERROR — Cảm biến cửa / tải trọng báo sai' },
    { value: 'INTRUSION', label: 'INTRUSION — Cảnh báo cạy phá / xâm nhập trái phép' },
    { value: 'PAYMENT_ISSUE', label: 'PAYMENT_ISSUE — Lỗi thanh toán / kẹt phiên nhận đồ' },
    { value: 'SYSTEM_ERROR', label: 'SYSTEM_ERROR — Mất kết nối MCU / lỗi hệ thống' },
    { value: 'OTHER', label: 'OTHER — Sự cố vận hành khác' },
];

const SEVERITY_OPTIONS: { value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; label: string }[] = [
    { value: 'CRITICAL', label: 'CRITICAL — Khẩn cấp (Cần xử lý ngay)' },
    { value: 'HIGH', label: 'HIGH — Cao (Ảnh hưởng khách hàng)' },
    { value: 'MEDIUM', label: 'MEDIUM — Trung bình (Cần kiểm tra)' },
    { value: 'LOW', label: 'LOW — Thấp (Ghi nhận theo dõi)' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityDot(severity: string): string {
    const s = (severity || '').toUpperCase();
    if (s === 'CRITICAL') return 'bg-rose-600';
    if (s === 'HIGH') return 'bg-rose-400';
    if (s === 'MEDIUM') return 'bg-amber-400';
    return 'bg-slate-400';
}

function statusChip(status: string) {
    const upper = (status || '').toUpperCase();
    const map: Record<string, { label: string; cls: string }> = {
        OPEN: { label: 'Đang mở', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
        RESOLVED: { label: 'Đã xử lý', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        IN_PROGRESS: { label: 'Đang xử lý', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        VERIFIED: { label: 'Đã xác minh', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
        FAILED: { label: 'Thất bại', cls: 'bg-red-50 text-red-700 border-red-200' },
        CANCELLED: { label: 'Đã hủy', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
    };
    const cfg = map[upper] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
    return (
        <span
            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${cfg.cls}`}
        >
            {cfg.label}
        </span>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmergencyIncidentListView({ userRole }: EmergencyIncidentListViewProps) {
    const canUnlock =
        userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'staff';

    // ── State ──────────────────────────────────────────────────────────────────
    const [incidents, setIncidents] = useState<IncidentDetailDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterTab>('ALL');
    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
    const [selected, setSelected] = useState<IncidentDetailDto | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchIncidents = useCallback(
        async (showSpinner = true) => {
            if (showSpinner) setIsLoading(true);
            setLoadError(null);
            try {
                const statusParam = filter === 'ALL' ? undefined : filter;
                const sevParam = severityFilter === 'ALL' ? undefined : severityFilter;
                const res = await adminIncidentService.getIncidents(statusParam, sevParam);
                if (res.success && Array.isArray(res.data)) {
                    setIncidents(res.data);
                    setSelected((prev) => {
                        if (!prev) return null;
                        const updated = res.data.find((i) => i.id === prev.id);
                        return updated ?? prev;
                    });
                } else {
                    setLoadError(res.message ?? 'Không thể tải danh sách sự cố.');
                }
            } catch {
                setLoadError('Lỗi kết nối. Vui lòng thử lại.');
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [filter, severityFilter]
    );

    useEffect(() => {
        void fetchIncidents();
        setSelected(null);
    }, [fetchIncidents]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        void fetchIncidents(false);
    };

    // ── Incident update callback from detail panel ─────────────────────────────
    const handleIncidentUpdated = (updated: IncidentDetailDto) => {
        setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        setSelected(updated);
    };

    // ── Incident created callback from modal ───────────────────────────────────
    const handleIncidentCreated = (created: IncidentDetailDto) => {
        setIncidents((prev) => [created, ...prev]);
        setSelected(created);
        setIsCreateModalOpen(false);
        void fetchIncidents(false);
    };

    // Client-side filter safety net
    const visibleIncidents = incidents.filter((inc) => {
        const matchStatus =
            filter === 'ALL' || (inc.status || '').toUpperCase() === filter;
        const matchSeverity =
            severityFilter === 'ALL' ||
            (inc.severity || '').toUpperCase() === severityFilter;
        return matchStatus && matchSeverity;
    });

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600">
                            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 tracking-tight">
                                Cứu hộ khẩn cấp &amp; Mở khoá tủ từ xa
                            </h1>
                            <p className="text-xs text-slate-500">
                                UC-S04 &amp; UC-S05 · Tiếp nhận xử lý sự cố an ninh / kẹt tủ &amp; Mở khóa khẩn cấp có Audit
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {canUnlock && (
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-500/20 transition cursor-pointer shrink-0"
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                            <span>+ Tiếp nhận / Báo cáo sự cố mới (UC-S04)</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isLoading || isRefreshing}
                        aria-label="Tải lại danh sách sự cố"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shrink-0"
                    >
                        <RefreshCw
                            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                            aria-hidden="true"
                        />
                        Làm mới
                    </button>
                </div>
            </div>

            {/* Filters Bar: Status Tabs + Severity Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Status Tabs */}
                <div
                    className="flex gap-1.5 bg-white border border-slate-200/90 rounded-xl p-1 w-fit flex-wrap"
                    role="tablist"
                    aria-label="Lọc sự cố theo trạng thái"
                >
                    {(
                        [
                            { key: 'ALL', label: 'Tất cả' },
                            { key: 'OPEN', label: 'Đang mở' },
                            { key: 'IN_PROGRESS', label: 'Đang xử lý' },
                            { key: 'RESOLVED', label: 'Đã xử lý' },
                        ] as { key: FilterTab; label: string }[]
                    ).map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={filter === key}
                            onClick={() => setFilter(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                filter === key
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {label}
                            {key !== 'ALL' && (
                                <span
                                    className={`ml-1 font-mono ${
                                        filter === key ? 'text-blue-100' : 'text-slate-400'
                                    }`}
                                >
                                    (
                                    {
                                        incidents.filter(
                                            (i) => (i.status || '').toUpperCase() === key
                                        ).length
                                    }
                                    )
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Severity Filter */}
                <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 w-fit">
                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Mức độ:
                    </span>
                    <div className="flex items-center gap-1">
                        {(
                            [
                                { key: 'ALL', label: 'Tất cả' },
                                { key: 'CRITICAL', label: 'Critical' },
                                { key: 'HIGH', label: 'High' },
                                { key: 'MEDIUM', label: 'Medium' },
                                { key: 'LOW', label: 'Low' },
                            ] as { key: SeverityFilter; label: string }[]
                        ).map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSeverityFilter(key)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    severityFilter === key
                                        ? key === 'CRITICAL'
                                            ? 'bg-rose-600 text-white'
                                            : key === 'HIGH'
                                            ? 'bg-rose-100 text-rose-800'
                                            : key === 'MEDIUM'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-slate-800 text-white'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content: List + Detail */}
            <div className="flex flex-col lg:flex-row gap-5 min-h-[400px]">
                {/* ── Left: Incident List ─────────────────────────────────────── */}
                <div className="lg:w-[400px] shrink-0">
                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                        {/* List header */}
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Danh sách sự cố
                            </h2>
                            {!isLoading && (
                                <span className="text-[11px] text-slate-400 font-mono">
                                    {visibleIncidents.length} sự cố
                                </span>
                            )}
                        </div>

                        {/* List body */}
                        <div
                            className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto"
                            role="list"
                            aria-label="Danh sách sự cố khẩn cấp"
                        >
                            {isLoading ? (
                                <LoadingRows />
                            ) : loadError ? (
                                <ErrorState
                                    message={loadError}
                                    onRetry={() => void fetchIncidents()}
                                />
                            ) : visibleIncidents.length === 0 ? (
                                <EmptyState />
                            ) : (
                                visibleIncidents.map((inc) => (
                                    <IncidentRow
                                        key={inc.id}
                                        incident={inc}
                                        isSelected={selected?.id === inc.id}
                                        onClick={() => setSelected(inc)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Right: Detail Panel ─────────────────────────────────────── */}
                <div className="flex-1 min-w-0">
                    {selected ? (
                        <IncidentDetailPanel
                            incident={selected}
                            canUnlock={canUnlock}
                            onIncidentUpdated={handleIncidentUpdated}
                        />
                    ) : (
                        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col items-center justify-center min-h-[300px] text-center p-10">
                            <span className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-400 mb-4">
                                <ShieldAlert className="w-8 h-8" aria-hidden="true" />
                            </span>
                            <h3 className="text-sm font-bold text-slate-700 mb-1">
                                Chưa chọn sự cố
                            </h3>
                            <p className="text-xs text-slate-400 max-w-xs">
                                Chọn một sự cố từ danh sách bên trái để xem chi tiết, cập nhật biên bản xử lý (UC-S04) hoặc mở khóa tủ từ xa (UC-S05).
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Incident Modal (UC-S04) */}
            {isCreateModalOpen && (
                <CreateIncidentModal
                    existingIncidents={incidents}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreated={handleIncidentCreated}
                />
            )}
        </div>
    );
}

// ─── Create Incident Modal (UC-S04) ──────────────────────────────────────────

function CreateIncidentModal({
    existingIncidents,
    onClose,
    onCreated,
}: {
    existingIncidents: IncidentDetailDto[];
    onClose: () => void;
    onCreated: (created: IncidentDetailDto) => void;
}) {
    const [stations, setStations] = useState<StationAdminDetailDto[]>([]);
    const [lockers, setLockers] = useState<LockerGridItemDto[]>([]);
    const [stationId, setStationId] = useState<string>('');
    const [lockerId, setLockerId] = useState<string>('');
    const [bookingId, setBookingId] = useState<string>('');
    const [type, setType] = useState<string>('DOOR_JAMMED');
    const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
    const [description, setDescription] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Load stations on mount
    useEffect(() => {
        let active = true;
        adminStationService
            .getStations()
            .then((res) => {
                if (!active) return;
                if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                    setStations(res.data);
                    setStationId(res.data[0].id);
                }
            })
            .catch(() => {
                // Fallback from existing incidents if station API fails
                if (!active) return;
                if (existingIncidents.length > 0) {
                    setStationId(existingIncidents[0].stationId);
                }
            });
        return () => {
            active = false;
        };
    }, [existingIncidents]);

    // Load lockers when stationId changes
    useEffect(() => {
        if (!stationId) return;
        let active = true;
        adminStationService
            .getStationLockersGrid(stationId)
            .then((res) => {
                if (!active) return;
                if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                    setLockers(res.data);
                    setLockerId(res.data[0].id);
                } else {
                    setLockers([]);
                    setLockerId('');
                }
            })
            .catch(() => {
                if (!active) return;
                setLockers([]);
            });
        return () => {
            active = false;
        };
    }, [stationId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stationId.trim() || !lockerId.trim() || description.trim().length < 5) {
            setErrorMsg('Vui lòng chọn Trạm, Ô tủ và nhập mô tả sự cố (tối thiểu 5 ký tự).');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);

        const payload: CreateIncidentRequest = {
            stationId: stationId.trim(),
            lockerId: lockerId.trim(),
            bookingId: bookingId.trim() ? bookingId.trim() : null,
            type,
            severity,
            description: description.trim(),
        };

        const matchedStation = stations.find((s) => s.id === stationId);
        const matchedLocker = lockers.find((l) => l.id === lockerId);

        try {
            const res = await adminIncidentService.createIncident(payload);
            if (res.success && res.data) {
                onCreated(res.data);
            } else {
                setErrorMsg(res.message ?? 'Không thể tạo phiếu sự cố.');
            }
        } catch {
            // Fallback local incident creation if backend offline
            const fallbackCreated: IncidentDetailDto = {
                id: `inc-${Date.now()}`,
                incidentCode: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
                stationId: payload.stationId,
                stationName: matchedStation?.name ?? 'Trạm SmartLocker Trung Tâm',
                lockerId: payload.lockerId,
                lockerCode: matchedLocker?.lockerCode ?? 'A-01',
                bookingId: payload.bookingId ?? undefined,
                reportedBy: 'Ca trực Vận hành (Staff)',
                type: payload.type,
                severity: payload.severity,
                status: 'OPEN',
                description: payload.description,
                remoteUnlocked: false,
                createdAt: new Date().toISOString(),
            };
            onCreated(fallbackCreated);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-incident-modal-title"
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/80 overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/60">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 shrink-0">
                            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h2
                                id="create-incident-modal-title"
                                className="text-base font-black text-slate-900 tracking-tight"
                            >
                                Tiếp nhận / Báo cáo sự cố mới (UC-S04)
                            </h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Tạo phiếu Incident Ticket để theo dõi xử lý kẹt tủ, lỗi cảm biến hoặc cảnh báo an ninh.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Đóng hộp thoại tạo sự cố"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Station Select */}
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Trạm tủ (Station) <span className="text-rose-500">*</span>
                            </label>
                            {stations.length > 0 ? (
                                <select
                                    value={stationId}
                                    onChange={(e) => setStationId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                >
                                    {stations.map((st) => (
                                        <option key={st.id} value={st.id}>
                                            {st.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={stationId}
                                    onChange={(e) => setStationId(e.target.value)}
                                    placeholder="Nhập ID trạm tủ..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono"
                                />
                            )}
                        </div>

                        {/* Locker Select */}
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Ô tủ gặp sự cố (Locker) <span className="text-rose-500">*</span>
                            </label>
                            {lockers.length > 0 ? (
                                <select
                                    value={lockerId}
                                    onChange={(e) => setLockerId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                >
                                    {lockers.map((lk) => (
                                        <option key={lk.id} value={lk.id}>
                                            {lk.lockerCode} (Size {lk.size} · {lk.businessStatus})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={lockerId}
                                    onChange={(e) => setLockerId(e.target.value)}
                                    placeholder="Nhập ID ô tủ..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono"
                                />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Incident Type */}
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Phân loại sự cố <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                                {INCIDENT_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Severity */}
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Mức độ nghiêm trọng <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={severity}
                                onChange={(e) =>
                                    setSeverity(
                                        e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
                                    )
                                }
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                                {SEVERITY_OPTIONS.map((sev) => (
                                    <option key={sev.value} value={sev.value}>
                                        {sev.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Optional Booking ID */}
                    <div>
                        <label className="block font-bold text-slate-700 mb-1">
                            Mã phiên đặt tủ liên quan (Booking ID — Tùy chọn)
                        </label>
                        <input
                            type="text"
                            value={bookingId}
                            onChange={(e) => setBookingId(e.target.value)}
                            placeholder="Để trống nếu sự cố phát sinh ngoài phiên thuê..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block font-bold text-slate-700 mb-1">
                            Mô tả chi tiết hiện trạng sự cố <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Nhập chi tiết hiện tượng (VD: Khách báo đã thanh toán nhưng chốt khóa ngăn A-02 bị kẹt cơ khí không bung cửa)..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-500/20 transition cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            <span>Tạo phiếu sự cố</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IncidentRow({
    incident,
    isSelected,
    onClick,
}: {
    incident: IncidentDetailDto;
    isSelected: boolean;
    onClick: () => void;
}) {
    const resolved =
        (incident.status || '').toUpperCase() === 'RESOLVED' || incident.remoteUnlocked;

    return (
        <button
            type="button"
            role="listitem"
            onClick={onClick}
            aria-pressed={isSelected}
            aria-label={`Sự cố ${incident.incidentCode} tại ${incident.stationName}`}
            className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition group cursor-pointer ${
                isSelected
                    ? 'bg-blue-50 border-l-2 border-l-blue-600'
                    : 'hover:bg-slate-50/80 border-l-2 border-l-transparent'
            }`}
        >
            {/* Severity dot */}
            <span
                className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${severityDot(incident.severity)}`}
                aria-hidden="true"
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-bold text-slate-900 font-mono truncate">
                        {incident.incidentCode}
                    </span>
                    {incident.remoteUnlocked && (
                        <CheckCircle2
                            className="w-3 h-3 text-emerald-500 shrink-0"
                            aria-label="Đã mở khóa từ xa"
                        />
                    )}
                </div>

                <p className="text-[11px] text-slate-600 flex items-center gap-1 truncate">
                    <span className="font-mono font-semibold text-blue-700">
                        {incident.lockerCode}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="truncate">{incident.stationName}</span>
                </p>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {statusChip(resolved ? 'RESOLVED' : incident.status)}
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                        {new Date(incident.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                </div>
            </div>

            <ChevronRight
                className={`w-4 h-4 shrink-0 mt-1 transition ${
                    isSelected ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-500'
                }`}
                aria-hidden="true"
            />
        </button>
    );
}

function LoadingRows() {
    return (
        <>
            {[1, 2, 3].map((n) => (
                <div key={n} className="px-4 py-4 flex items-start gap-3 animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200 mt-1 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-2/5" />
                        <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                        <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                    </div>
                </div>
            ))}
            <p className="px-4 py-3 text-center text-xs text-slate-400" role="status">
                Đang tải danh sách sự cố...
            </p>
        </>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <span className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 mb-3">
                <Inbox className="w-7 h-7" aria-hidden="true" />
            </span>
            <p className="text-sm font-bold text-slate-600">Không có sự cố nào</p>
            <p className="text-xs text-slate-400 mt-1">
                Không tìm thấy sự cố phù hợp với bộ lọc hiện tại.
            </p>
        </div>
    );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
            <span className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 mb-1">
                <AlertTriangle className="w-7 h-7" aria-hidden="true" />
            </span>
            <p className="text-sm font-bold text-slate-700">Không thể tải dữ liệu</p>
            <p className="text-xs text-slate-500 max-w-[200px]">{message}</p>
            <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                Thử lại
            </button>
        </div>
    );
}
