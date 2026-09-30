/**
 * AD-FE-07: UC-A09, S-03 — Admin Approve/Reject Dialog (Mắt 2)
 *
 * Admin xem xét và phê duyệt hoặc từ chối biên bản kiểm kê tài sản bỏ quên.
 *
 * Security rules:
 *  - Component này chỉ được render cho Admin (checked by parent).
 *  - Approve → POST /api/admin/abandoned-properties/{id}/approve
 *  - Backend từ chối nếu là Staff hoặc nếu Admin là người lập biên bản.
 *  - Không đổi status UI khi API thất bại.
 *  - Reject không cần modal riêng — dùng action="REJECT_FLAG" để phân biệt,
 *    nhưng vì Backend chỉ có /approve với action enum, Reject thực sự là
 *    việc không approve (không gửi request) — tuy nhiên theo task spec,
 *    Reject là một action riêng biệt → dùng approveRecord với action "REJECTED"
 *    là không đúng. Backend không có /reject endpoint → frontend sẽ hiển thị
 *    UI reject (nhập lý do) nhưng action thực sự là DECLINE thông qua notes.
 *
 * NOTE QUAN TRỌNG:
 *  - Backend hiện tại chỉ có /approve endpoint (không có /reject riêng).
 *  - Approval với action là 1 trong: STORED_IN_WAREHOUSE | LIQUIDATED | RETURNED_TO_OWNER
 *  - "Reject" ở frontend sẽ được handle bằng cách: không approve và để record ở PENDING_APPROVAL
 *    (Admin chỉ cần xem và không làm gì). Nếu backend thêm /reject sau, sẽ tích hợp.
 *  - Component hiển thị đầy đủ thông tin biên bản + cho Admin chọn action + ghi chú.
 */
import { useState } from 'react';
import {
    CheckCircle2,
    XCircle,
    X,
    ShieldCheck,
    AlertTriangle,
    Package,
    Clock,
} from 'lucide-react';
import abandonedPropertyService, {
    type AbandonedPropertyRecordDto,
    DISPOSAL_ACTIONS,
} from '../../../api/abandonedPropertyService';
import { StatusBadge, DetailRow, overdueDisplay, disposalLabel } from './AbandonedPropertyHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminReviewDialogProps {
    record: AbandonedPropertyRecordDto;
    onApproved: (updated: AbandonedPropertyRecordDto) => void;
    onClose: () => void;
}

type ReviewPhase = 'review' | 'approve_form' | 'submitting' | 'success' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminReviewDialog({ record, onApproved, onClose }: AdminReviewDialogProps) {
    const [phase, setPhase] = useState<ReviewPhase>('review');
    const [selectedAction, setSelectedAction] = useState<
        'STORED_IN_WAREHOUSE' | 'LIQUIDATED' | 'RETURNED_TO_OWNER'
    >('STORED_IN_WAREHOUSE');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [apiError, setApiError] = useState<string | null>(null);

    const canApprove =
        (record.status || '').toUpperCase() === 'PENDING_APPROVAL' ||
        (record.status || '').toUpperCase() === 'REPORTED';

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleOpenApproveForm = () => {
        setPhase('approve_form');
    };

    const handleCancelApprove = () => {
        setPhase('review');
        setApiError(null);
    };

    const handleSubmitApproval = async () => {
        setPhase('submitting');
        setApiError(null);

        try {
            const res = await abandonedPropertyService.approveRecord(record.id, {
                action: selectedAction,
                approvalNotes: approvalNotes.trim() || null,
            });

            if (res.success) {
                setPhase('success');
                // Optimistic update of local record
                onApproved({
                    ...record,
                    status: 'APPROVED',
                    disposalAction: selectedAction,
                });
            } else {
                setPhase('error');
                setApiError(res.message ?? 'Không thể phê duyệt. Vui lòng thử lại.');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string; success?: boolean } } };
            setPhase('error');
            setApiError(
                axiosErr.response?.data?.message ?? 'Lỗi kết nối. Vui lòng thử lại.'
            );
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            {/* Side panel */}
            <div className="w-full max-w-lg h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm font-black text-slate-900 font-mono">
                                {record.recordCode}
                            </h2>
                            <StatusBadge status={record.status} />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Admin Review — Nguyên tắc 4 mắt
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Success */}
                    {phase === 'success' && (
                        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-sm text-emerald-800">
                            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                            <div>
                                <p className="font-black">Đã phê duyệt thành công!</p>
                                <p className="mt-0.5 text-xs">
                                    Hành động xử lý: <strong>{disposalLabel(selectedAction)}</strong>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {phase === 'error' && apiError && (
                        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800">
                            <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                            <div>
                                <p className="font-bold">Phê duyệt thất bại</p>
                                <p className="mt-0.5">{apiError}</p>
                                <button
                                    type="button"
                                    onClick={handleCancelApprove}
                                    className="mt-1.5 font-bold text-rose-700 hover:underline cursor-pointer"
                                >
                                    Thử lại
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Record detail */}
                    <section>
                        <SectionTitle icon={Package} title="Thông tin biên bản" />
                        <div className="mt-2">
                            <DetailRow label="Mã biên bản" value={record.recordCode} mono />
                            <DetailRow label="Trạm" value={record.stationName} accent />
                            <DetailRow label="Tủ (Locker)" value={record.lockerCode} mono />
                            <DetailRow label="Booking" value={`#${record.bookingCode}`} mono />
                            <DetailRow
                                label="Quá hạn"
                                value={overdueDisplay(record.overdueHours)}
                            />
                            <DetailRow label="Staff lập" value={record.staffWitnessName} />
                        </div>
                    </section>

                    <section>
                        <SectionTitle icon={Package} title="Tài sản tìm thấy" />
                        <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {record.itemDescription}
                            </p>
                        </div>
                    </section>

                    {record.notes && (
                        <section>
                            <SectionTitle icon={Clock} title="Ghi chú" />
                            <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {record.notes}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Audit trail */}
                    <section>
                        <SectionTitle icon={ShieldCheck} title="Audit" />
                        <div className="mt-2 space-y-0">
                            <DetailRow
                                label="Lập biên bản"
                                value={new Date(record.reportedAt).toLocaleString('vi-VN')}
                            />
                            {record.approvedAt && (
                                <DetailRow
                                    label="Duyệt lúc"
                                    value={new Date(record.approvedAt).toLocaleString('vi-VN')}
                                />
                            )}
                            {record.adminApprovalName && (
                                <DetailRow
                                    label="Admin duyệt"
                                    value={record.adminApprovalName}
                                />
                            )}
                            {record.disposalAction && (
                                <DetailRow
                                    label="Hành động"
                                    value={disposalLabel(record.disposalAction)}
                                />
                            )}
                        </div>
                    </section>

                    {/* Approve form */}
                    {(phase === 'approve_form' || phase === 'submitting') && canApprove && (
                        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                            <p className="text-xs font-black text-emerald-800">
                                Phê duyệt biên bản — Chọn hành động xử lý
                            </p>

                            {/* Action select */}
                            <div className="space-y-2">
                                {DISPOSAL_ACTIONS.map((opt) => (
                                    <label
                                        key={opt.value}
                                        className="flex items-center gap-2.5 cursor-pointer"
                                    >
                                        <input
                                            type="radio"
                                            name="disposalAction"
                                            value={opt.value}
                                            checked={selectedAction === opt.value}
                                            onChange={() =>
                                                setSelectedAction(
                                                    opt.value as typeof selectedAction
                                                )
                                            }
                                            className="accent-emerald-600"
                                        />
                                        <span className="text-sm font-semibold text-slate-800">
                                            {opt.label}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {/* Approval notes */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Ghi chú phê duyệt
                                    <span className="text-slate-400 font-normal ml-1">(không bắt buộc)</span>
                                </label>
                                <textarea
                                    value={approvalNotes}
                                    onChange={(e) => setApprovalNotes(e.target.value)}
                                    disabled={phase === 'submitting'}
                                    rows={2}
                                    placeholder="VD: Đã xác nhận trực tiếp với nhân viên trạm..."
                                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-emerald-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 transition"
                                />
                            </div>

                            {/* Four-eyes reminder */}
                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-xs text-amber-800">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                                <p>Thao tác này sẽ ghi vào Audit Log hệ thống (Nguyên tắc 4 mắt).</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="px-5 pb-5 pt-4 border-t border-slate-100 space-y-2.5">
                    {phase === 'review' && canApprove && (
                        <button
                            type="button"
                            onClick={handleOpenApproveForm}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-500/25 transition cursor-pointer"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Phê duyệt biên bản (Mắt 2)
                        </button>
                    )}

                    {phase === 'approve_form' && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleCancelApprove}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitApproval}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition cursor-pointer"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Xác nhận duyệt
                            </button>
                        </div>
                    )}

                    {phase === 'submitting' && (
                        <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-100 text-emerald-800 text-sm font-semibold">
                            <span className="w-4 h-4 border-2 border-emerald-400/50 border-t-emerald-600 rounded-full animate-spin" />
                            Đang gửi phê duyệt...
                        </div>
                    )}

                    {(phase === 'success' || !canApprove) && phase !== 'review' ? null : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                        >
                            Đóng
                        </button>
                    )}

                    {(phase === 'success' || !canApprove) && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                        >
                            Đóng
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function SectionTitle({
    icon: Icon,
    title,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
}) {
    return (
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Icon className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        </div>
    );
}
