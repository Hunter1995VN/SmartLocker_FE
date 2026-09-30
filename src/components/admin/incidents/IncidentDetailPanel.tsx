/**
 * AD-FE-06: UC-T14 → A08, S-02 — Emergency Incident Detail Panel
 *
 * Hiển thị đầy đủ thông tin của một sự cố đã chọn:
 *   - Incident metadata
 *   - Locker & Station
 *   - Customer/Reporter
 *   - Booking
 *   - Reported reason
 *   - Trạng thái sự cố
 *   - Nút "Mở khóa tủ từ xa" + confirmation dialog
 *   - Loading / Success / Error state sau khi gọi API
 *
 * Security rules bắt buộc:
 *   - Chỉ hiển thị nút unlock nếu incident chưa resolved & chưa remoteUnlocked.
 *   - Không gọi API trước khi user xác nhận trong dialog.
 *   - Disable button khi request đang xử lý (chống double-click).
 *   - Locker lấy từ incident (không nhập tay).
 *   - Chỉ hiển thị với Admin/Staff.
 */
import { useState, type ComponentType } from 'react';
import {
    MapPin,
    Box,
    User,
    Calendar,
    ShieldAlert,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Clock,
    RefreshCw,
    UnlockKeyhole,
} from 'lucide-react';
import type { IncidentDetailDto } from '../../../api/adminIncidentService';
import adminIncidentService from '../../../api/adminIncidentService';
import RemoteUnlockConfirmModal from './RemoteUnlockConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type UnlockPhase =
    | 'idle'
    | 'confirm'    // confirmation dialog mở
    | 'submitting' // đang gọi API
    | 'success'
    | 'pending'
    | 'error';

interface UnlockResult {
    phase: UnlockPhase;
    message?: string;
}

interface IncidentDetailPanelProps {
    incident: IncidentDetailDto;
    canUnlock: boolean; // role-based: chỉ true với Admin/Staff
    onIncidentUpdated?: (updated: IncidentDetailDto) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(status: string): string {
    const map: Record<string, string> = {
        OPEN: 'Đang mở',
        VERIFIED: 'Đã xác minh',
        IN_PROGRESS: 'Đang xử lý',
        RESOLVED: 'Đã xử lý',
        FAILED: 'Thất bại',
        CANCELLED: 'Đã hủy',
    };
    return map[status?.toUpperCase()] ?? status ?? '—';
}

function StatusBadge({ status }: { status: string }) {
    const upper = (status || '').toUpperCase();
    const cfg: Record<string, string> = {
        OPEN: 'bg-rose-50 text-rose-700 border-rose-200',
        VERIFIED: 'bg-blue-50 text-blue-700 border-blue-200',
        IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
        RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        FAILED: 'bg-red-50 text-red-700 border-red-200',
        CANCELLED: 'bg-slate-100 text-slate-600 border-slate-300',
    };
    const cls = cfg[upper] ?? 'bg-slate-100 text-slate-600 border-slate-200';
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold uppercase tracking-wide ${cls}`}
        >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {statusLabel(status)}
        </span>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const upper = (severity || '').toUpperCase();
    const cfg: Record<string, string> = {
        CRITICAL: 'bg-rose-600 text-white',
        HIGH: 'bg-rose-100 text-rose-800 border border-rose-300',
        MEDIUM: 'bg-amber-100 text-amber-800 border border-amber-300',
        LOW: 'bg-slate-100 text-slate-600 border border-slate-300',
    };
    const cls = cfg[upper] ?? 'bg-slate-100 text-slate-700';
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${cls}`}>
            {severity || 'UNKNOWN'}
        </span>
    );
}

function DetailRow({
    icon: Icon,
    label,
    value,
    mono = false,
    accent = false,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value?: string | null;
    mono?: boolean;
    accent?: boolean;
}) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
            <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                <p
                    className={`text-sm font-semibold mt-0.5 truncate ${
                        accent ? 'text-blue-700' : 'text-slate-800'
                    } ${mono ? 'font-mono' : ''}`}
                >
                    {value}
                </p>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IncidentDetailPanel({
    incident,
    canUnlock,
    onIncidentUpdated,
}: IncidentDetailPanelProps) {
    const [unlock, setUnlock] = useState<UnlockResult>({ phase: 'idle' });

    // Điều kiện cho phép mở nút unlock:
    //   - User có quyền (Admin/Staff)
    //   - Incident chưa RESOLVED
    //   - Chưa được remoteUnlocked trước đó
    //   - Không đang trong quá trình gửi lệnh
    const incidentResolved =
        incident.status?.toUpperCase() === 'RESOLVED' || incident.remoteUnlocked;
    const canTriggerUnlock =
        canUnlock &&
        !incidentResolved &&
        unlock.phase !== 'submitting' &&
        unlock.phase !== 'success';

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleRequestUnlock = () => {
        // Mở confirmation dialog — không gọi API tại đây
        setUnlock({ phase: 'confirm' });
    };

    const handleCancelConfirm = () => {
        setUnlock({ phase: 'idle' });
    };

    const handleConfirmUnlock = async () => {
        setUnlock({ phase: 'submitting' });

        try {
            const reason = incident.description || 'Khách hàng không thể mở tủ';
            const res = await adminIncidentService.remoteUnlockByIncident(incident.id, {
                reason,
            });

            if (res.success) {
                setUnlock({ phase: 'success', message: res.message ?? 'Lệnh mở khóa đã được gửi thành công.' });

                // Cập nhật incident object trong list cha nếu có callback
                if (onIncidentUpdated) {
                    onIncidentUpdated({
                        ...incident,
                        status: 'RESOLVED',
                        remoteUnlocked: true,
                        resolutionNote: res.message,
                    });
                }
            } else {
                // Backend trả success=false → thất bại / not allowed
                setUnlock({
                    phase: 'error',
                    message: res.message ?? 'Không thể thực hiện mở khóa từ xa.',
                });
            }
        } catch (err: unknown) {
            const axiosErr = err as {
                response?: { data?: { message?: string; success?: boolean } };
            };
            const msg =
                axiosErr.response?.data?.message ??
                'Lỗi kết nối. Vui lòng kiểm tra lại và thử lại.';
            setUnlock({ phase: 'error', message: msg });
        }
    };

    const handleRetry = () => {
        setUnlock({ phase: 'idle' });
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Confirmation dialog — only rendered when confirm phase */}
            {(unlock.phase === 'confirm' || unlock.phase === 'submitting') && (
                <RemoteUnlockConfirmModal
                    incident={incident}
                    isSubmitting={unlock.phase === 'submitting'}
                    onConfirm={handleConfirmUnlock}
                    onCancel={handleCancelConfirm}
                />
            )}

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 bg-slate-50/60 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-black text-slate-900 tracking-tight font-mono">
                                {incident.incidentCode}
                            </h2>
                            <SeverityBadge severity={incident.severity} />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Tạo lúc{' '}
                            {new Date(incident.createdAt).toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    </div>
                    <StatusBadge status={incident.status} />
                </div>

                {/* Details */}
                <div className="px-5 py-3 flex-1 overflow-y-auto space-y-0.5">
                    <DetailRow icon={MapPin} label="Trạm" value={incident.stationName} accent />
                    <DetailRow icon={Box} label="Tủ (Locker)" value={incident.lockerCode} mono />
                    <DetailRow icon={User} label="Báo cáo bởi" value={incident.reportedBy} />
                    {incident.bookingCode && (
                        <DetailRow
                            icon={Calendar}
                            label="Mã đặt tủ"
                            value={`#${incident.bookingCode}`}
                            mono
                        />
                    )}
                    <DetailRow icon={ShieldAlert} label="Loại sự cố" value={incident.type} />

                    {incident.description && (
                        <div className="py-3 border-b border-slate-100">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                                Mô tả sự cố
                            </p>
                            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                {incident.description}
                            </p>
                        </div>
                    )}

                    {/* Resolution info (if already resolved) */}
                    {incidentResolved && incident.resolutionNote && (
                        <div className="py-3">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                                Ghi chú xử lý
                            </p>
                            <p className="text-xs text-slate-700 leading-relaxed bg-emerald-50 p-3 rounded-xl border border-emerald-200/80">
                                {incident.resolutionNote}
                            </p>
                        </div>
                    )}

                    {incident.resolvedBy && (
                        <div className="flex items-center gap-2 py-2 text-xs text-slate-500 border-t border-slate-100">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>
                                Xử lý bởi <strong className="text-slate-700">{incident.resolvedBy}</strong>
                                {incident.resolvedAt && (
                                    <> lúc {new Date(incident.resolvedAt).toLocaleString('vi-VN')}</>
                                )}
                            </span>
                        </div>
                    )}
                </div>

                {/* Action Zone */}
                <div className="px-5 pb-5 pt-4 border-t border-slate-100 space-y-3">
                    {/* Result banners */}
                    {unlock.phase === 'success' && (
                        <div
                            role="status"
                            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800"
                        >
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
                            <div>
                                <p className="font-bold">Lệnh mở khóa đã được gửi thành công.</p>
                                {unlock.message && (
                                    <p className="mt-0.5 text-emerald-700">{unlock.message}</p>
                                )}
                                <p className="mt-1 text-emerald-600">
                                    Trạng thái sự cố đã cập nhật sang <strong>RESOLVED</strong>.
                                </p>
                            </div>
                        </div>
                    )}

                    {unlock.phase === 'pending' && (
                        <div
                            role="status"
                            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800"
                        >
                            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
                            <div>
                                <p className="font-bold">Lệnh đang chờ thiết bị phản hồi (Pending).</p>
                                {unlock.message && <p className="mt-0.5">{unlock.message}</p>}
                            </div>
                        </div>
                    )}

                    {unlock.phase === 'error' && (
                        <div
                            role="alert"
                            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800"
                        >
                            <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
                            <div className="flex-1">
                                <p className="font-bold">Lệnh mở khóa thất bại.</p>
                                {unlock.message && <p className="mt-0.5">{unlock.message}</p>}
                                <button
                                    type="button"
                                    onClick={handleRetry}
                                    className="mt-2 flex items-center gap-1 text-rose-700 hover:text-rose-900 font-semibold transition cursor-pointer"
                                >
                                    <RefreshCw className="w-3 h-3" aria-hidden="true" />
                                    Thử lại
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Already resolved info */}
                    {incidentResolved && unlock.phase !== 'success' && (
                        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" aria-hidden="true" />
                            <p>
                                Sự cố này đã được{' '}
                                <strong>{incident.remoteUnlocked ? 'mở khóa từ xa' : 'xử lý'}</strong> trước đó.
                            </p>
                        </div>
                    )}

                    {/* Permission notice for non-authorized users */}
                    {!canUnlock && !incidentResolved && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />
                            <p>Bạn không có quyền thực hiện mở khóa tủ từ xa.</p>
                        </div>
                    )}

                    {/* Primary action button */}
                    {canUnlock && !incidentResolved && (
                        <button
                            type="button"
                            onClick={handleRequestUnlock}
                            disabled={!canTriggerUnlock}
                            aria-label={`Mở khóa tủ từ xa cho sự cố ${incident.incidentCode}`}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white shadow-md transition
                                ${
                                    canTriggerUnlock
                                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25 cursor-pointer'
                                        : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                }`}
                        >
                            {unlock.phase === 'submitting' ? (
                                <>
                                    <span
                                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                                        aria-hidden="true"
                                    />
                                    Đang gửi lệnh...
                                </>
                            ) : (
                                <>
                                    <UnlockKeyhole className="w-4 h-4" aria-hidden="true" />
                                    Mở khóa tủ từ xa
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
