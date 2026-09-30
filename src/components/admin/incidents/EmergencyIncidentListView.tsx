/**
 * AD-FE-06: UC-T14 → A08, S-02 — Emergency Incident List View
 *
 * Màn hình chính "Cứu hộ khẩn cấp & Mở khoá tủ từ xa":
 *   - Tải danh sách sự cố từ GET /api/admin/incidents
 *   - Hiển thị filter theo status (tất cả / đang mở / đã xử lý)
 *   - Click incident → hiện IncidentDetailPanel bên phải (desktop) / bên dưới (mobile)
 *   - Loading, Empty, Error state đầy đủ
 *
 * Tích hợp với:
 *   - adminIncidentService (API thực tế)
 *   - IncidentDetailPanel (chi tiết + nút unlock)
 *   - Existing AdminPortalPage architecture (activeMenu state)
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
} from 'lucide-react';
import adminIncidentService, { type IncidentDetailDto } from '../../../api/adminIncidentService';
import IncidentDetailPanel from './IncidentDetailPanel';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmergencyIncidentListViewProps {
    /** role = 'admin' | 'staff' | other — dùng để kiểm soát permission của nút unlock */
    userRole: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FilterTab = 'ALL' | 'OPEN' | 'RESOLVED';

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
    const [selected, setSelected] = useState<IncidentDetailDto | null>(null);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchIncidents = useCallback(async (showSpinner = true) => {
        if (showSpinner) setIsLoading(true);
        setLoadError(null);
        try {
            const statusParam = filter === 'ALL' ? undefined : filter;
            const res = await adminIncidentService.getIncidents(statusParam);
            if (res.success && Array.isArray(res.data)) {
                setIncidents(res.data);
                // Keep selected in sync if it was updated
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
    }, [filter]);

    useEffect(() => {
        void fetchIncidents();
        // When filter changes, deselect
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
                                UC-T14 → A08, S-02 · Xử lý sự cố không thể mở tủ
                            </p>
                        </div>
                    </div>
                </div>

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

            {/* Filter Tabs */}
            <div className="flex gap-1.5 bg-white border border-slate-200/90 rounded-xl p-1 w-fit" role="tablist" aria-label="Lọc sự cố theo trạng thái">
                {([
                    { key: 'ALL', label: 'Tất cả' },
                    { key: 'OPEN', label: 'Đang mở' },
                    { key: 'RESOLVED', label: 'Đã xử lý' },
                ] as { key: FilterTab; label: string }[]).map(({ key, label }) => (
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
                            <span className={`ml-1 font-mono ${filter === key ? 'text-blue-100' : 'text-slate-400'}`}>
                                ({incidents.filter((i) =>
                                    (i.status || '').toUpperCase() === key
                                ).length})
                            </span>
                        )}
                    </button>
                ))}
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
                                    {incidents.length} sự cố
                                </span>
                            )}
                        </div>

                        {/* List body */}
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto" role="list" aria-label="Danh sách sự cố khẩn cấp">
                            {isLoading ? (
                                <LoadingRows />
                            ) : loadError ? (
                                <ErrorState message={loadError} onRetry={() => void fetchIncidents()} />
                            ) : incidents.length === 0 ? (
                                <EmptyState />
                            ) : (
                                incidents.map((inc) => (
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
                                Chọn một sự cố từ danh sách bên trái để xem chi tiết và thực hiện
                                mở khóa tủ từ xa.
                            </p>
                        </div>
                    )}
                </div>
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
    const resolved = (incident.status || '').toUpperCase() === 'RESOLVED' || incident.remoteUnlocked;

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
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" aria-label="Đã mở khóa từ xa" />
                    )}
                </div>

                <p className="text-[11px] text-slate-600 flex items-center gap-1 truncate">
                    <span className="font-mono font-semibold text-blue-700">{incident.lockerCode}</span>
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
