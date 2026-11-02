/**
 * AD-FE-11: Modal Thẩm định, Phê duyệt / Từ chối & Xác nhận Giải ngân Lệnh Hoàn tiền Ngoại lệ
 * Dành cho Quản trị viên (ADMIN) thực hiện nguyên tắc 4 mắt & hạch toán bút toán chi hoàn vào CSDL.
 */
import { useState, useEffect } from 'react';
import {
    X,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Landmark,
    AlertTriangle,
    RefreshCw,
    FileCheck2,
    Lock,
} from 'lucide-react';
import type {
    ManualRefundItemDto,
    ApproveManualRefundRequest,
    ConfirmManualRefundDisbursementRequest,
} from '../../../api/adminManualRefundService';

interface ReviewManualRefundModalProps {
    item: ManualRefundItemDto | null;
    isOpen: boolean;
    onClose: () => void;
    isAdmin: boolean;
    onApprove: (refundId: string, body: ApproveManualRefundRequest) => Promise<void>;
    onReject: (refundId: string, reason: string) => Promise<void>;
    onConfirmDisbursement: (
        refundId: string,
        body: ConfirmManualRefundDisbursementRequest
    ) => Promise<void>;
}

const CATEGORY_TEXT: Record<string, string> = {
    HARDWARE_LOCK_JAM: 'Sự cố phần cứng / Kẹt chốt khóa IoT',
    STATION_OUTAGE: 'Mất điện / Mất kết nối trạm đột xuất',
    DUPLICATE_OR_OVERCHARGE: 'Thu trùng giao dịch / Lệch phụ phí PayOS',
    FORCE_MAJEURE_COMPLAINT: 'Bất khả kháng / Hỗ trợ thiện chí CSKH',
};

const formatVnd = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;

const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN');
};

export default function ReviewManualRefundModal({
    item,
    isOpen,
    onClose,
    isAdmin,
    onApprove,
    onReject,
    onConfirmDisbursement,
}: ReviewManualRefundModalProps) {
    const [approvedAmount, setApprovedAmount] = useState<number>(0);
    const [decisionNote, setDecisionNote] = useState('');
    const [disburseImmediately, setDisburseImmediately] = useState(true);
    const [gatewayTransferRef, setGatewayTransferRef] = useState('');
    const [cancelBookingAndReleaseLocker, setCancelBookingAndReleaseLocker] = useState(false);
    const [waiveRelatedOverdueDebt, setWaiveRelatedOverdueDebt] = useState(false);
    const [rejectMode, setRejectMode] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!item || !isOpen) return;
        setError(null);
        setRejectMode(false);
        setRejectionReason('');
        setApprovedAmount(item.approvedAmount ?? item.requestedAmount);
        setDecisionNote(
            item.adminDecisionNote ||
                'Đã đối chiếu log giao dịch PayOS & biên bản sự cố hiện trường, đủ điều kiện hoàn ngoại lệ.'
        );
        setDisburseImmediately(true);
        setGatewayTransferRef(item.gatewayTransferRef || '');
        setCancelBookingAndReleaseLocker(item.cancelBookingAndReleaseLocker);
        setWaiveRelatedOverdueDebt(item.waiveRelatedOverdueDebt);
    }, [item, isOpen]);

    if (!isOpen || !item) return null;

    const maxAllowed = Math.max(0, item.originalPaidAmount - item.previouslyRefundedAmount);

    const handleApproveSubmit = async () => {
        setError(null);
        if (approvedAmount < 1000 || approvedAmount > maxAllowed) {
            setError(`Số tiền phê duyệt phải từ 1.000đ đến tối đa ${formatVnd(maxAllowed)}.`);
            return;
        }
        if (decisionNote.trim().length < 5) {
            setError('Vui lòng nhập ghi chú quyết định thẩm định của Admin (tối thiểu 5 ký tự).');
            return;
        }

        try {
            setSubmitting(true);
            await onApprove(item.id, {
                approvedAmount: Number(approvedAmount),
                adminDecisionNote: decisionNote.trim(),
                disburseImmediately,
                gatewayTransferRef: gatewayTransferRef.trim() || undefined,
                cancelBookingAndReleaseLocker,
                waiveRelatedOverdueDebt,
            });
            onClose();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            setError(axiosErr.response?.data?.message || axiosErr.message || 'Phê duyệt thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRejectSubmit = async () => {
        setError(null);
        if (rejectionReason.trim().length < 5) {
            setError('Bắt buộc nhập lý do từ chối lệnh hoàn tiền (tối thiểu 5 ký tự).');
            return;
        }
        try {
            setSubmitting(true);
            await onReject(item.id, rejectionReason.trim());
            onClose();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            setError(axiosErr.response?.data?.message || axiosErr.message || 'Từ chối lệnh thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmPayoutSubmit = async () => {
        setError(null);
        if (gatewayTransferRef.trim().length < 4) {
            setError('Vui lòng nhập Mã tham chiếu bút toán chuyển khoản ngân hàng (VD: FT2630288412).');
            return;
        }
        try {
            setSubmitting(true);
            await onConfirmDisbursement(item.id, {
                gatewayTransferRef: gatewayTransferRef.trim(),
                note: decisionNote.trim() || undefined,
            });
            onClose();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            setError(
                axiosErr.response?.data?.message ||
                    axiosErr.message ||
                    'Xác nhận giải ngân thất bại.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                            <FileCheck2 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-extrabold tracking-tight">
                                    Hồ sơ Lệnh Hoàn Tiền Ngoại Lệ: {item.refundCode}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/15">
                                    {item.status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-300">
                                Đơn {item.bookingCode} · Order PayOS #{item.originalOrderCode} · Trạm{' '}
                                {item.stationName}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto text-xs">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Two-column dossier comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                            <p className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wider">
                                I. Đối chiếu Giao dịch Gốc (PayOS)
                            </p>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Khách hàng:</span>
                                <strong className="text-slate-900">{item.customerName}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Liên hệ:</span>
                                <span className="text-slate-700">
                                    {item.customerPhone || item.customerEmail}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Thực thu gốc ({item.originalPaymentKind}):</span>
                                <strong className="text-emerald-700">
                                    {formatVnd(item.originalPaidAmount)}
                                </strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Đã hoàn lũy kế trước đó:</span>
                                <strong className="text-slate-700">
                                    {formatVnd(item.previouslyRefundedAmount)}
                                </strong>
                            </div>
                            <div className="flex justify-between pt-1.5 border-t border-slate-200">
                                <span className="font-bold text-slate-700">Trần hoàn tối đa khả dụng:</span>
                                <strong className="text-blue-700">{formatVnd(maxAllowed)}</strong>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2">
                            <p className="font-extrabold text-purple-900 uppercase text-[11px] tracking-wider">
                                II. Đề xuất & Bằng chứng Ngoại lệ
                            </p>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Người lập phiếu:</span>
                                <strong className="text-slate-800">
                                    {item.requestedByName} ({item.requestedByRole})
                                </strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Thời điểm đề xuất:</span>
                                <span className="text-slate-700">{formatDateTime(item.requestedAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Nhóm ngoại lệ:</span>
                                <strong className="text-purple-800">
                                    {CATEGORY_TEXT[item.exceptionCategory] || item.exceptionCategory}
                                </strong>
                            </div>
                            {item.relatedIncidentCode && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Biên bản sự cố:</span>
                                    <span className="font-mono font-bold text-rose-700">
                                        {item.relatedIncidentCode}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between pt-1.5 border-t border-purple-200/70">
                                <span className="font-bold text-purple-900">Số tiền đề xuất hoàn:</span>
                                <strong className="text-sm text-purple-700">
                                    {formatVnd(item.requestedAmount)} ({item.refundPercentOfPaid}%)
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* Reason & Evidence Box */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                        <p className="font-bold text-slate-800">Lý do ngoại lệ: {item.reasonSummary}</p>
                        {item.evidenceNote && (
                            <p className="text-slate-600">
                                <strong>Bằng chứng hiện trường / Log:</strong> {item.evidenceNote}
                            </p>
                        )}
                        <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
                            <span className="flex items-center gap-1">
                                <Landmark className="w-3.5 h-3.5 text-blue-600" />
                                Kênh nhận: <strong>{item.refundMethod}</strong>
                                {item.bankName
                                    ? ` · ${item.bankName} — STK ${item.bankAccountNumber || '—'} (${
                                          item.bankAccountHolder || '—'
                                      })`
                                    : ''}
                            </span>
                        </div>
                    </div>

                    {/* CASE A: PENDING_APPROVAL */}
                    {item.status === 'PENDING_APPROVAL' && (
                        <>
                            {!isAdmin ? (
                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2.5">
                                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>
                                        Phiếu đang chờ <strong>Quản trị viên (ADMIN)</strong> thẩm định độc lập theo
                                        quy tắc kiểm soát nội bộ 4 mắt. Nhân viên vận hành (STAFF) không được tự duyệt
                                        chi hoàn tiền.
                                    </span>
                                </div>
                            ) : !rejectMode ? (
                                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                            <span>Quyết định Phê duyệt của Quản trị viên (ADMIN)</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setRejectMode(true)}
                                            className="text-rose-600 hover:underline font-bold cursor-pointer"
                                        >
                                            Chuyển sang Từ chối lệnh →
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">
                                                Số tiền phê duyệt thực tế (VND)
                                            </label>
                                            <input
                                                type="number"
                                                min={1000}
                                                max={maxAllowed}
                                                step={1000}
                                                value={approvedAmount}
                                                onChange={(e) =>
                                                    setApprovedAmount(Math.max(0, Number(e.target.value)))
                                                }
                                                className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white font-extrabold text-sm text-emerald-700"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">
                                                Chế độ giải ngân kế toán
                                            </label>
                                            <select
                                                value={disburseImmediately ? 'IMMEDIATE' : 'QUEUE'}
                                                onChange={(e) =>
                                                    setDisburseImmediately(e.target.value === 'IMMEDIATE')
                                                }
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                                            >
                                                <option value="IMMEDIATE">
                                                    Duyệt & Ghi sổ Đã Chuyển khoản Giải ngân ngay
                                                </option>
                                                <option value="QUEUE">
                                                    Duyệt lệnh → Chuyển hàng đợi Kế toán chi sau
                                                </option>
                                            </select>
                                        </div>
                                    </div>

                                    {disburseImmediately && (
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">
                                                Mã bút toán chuyển khoản NH / Napas247 (để trống tự sinh mã FT)
                                            </label>
                                            <input
                                                type="text"
                                                value={gatewayTransferRef}
                                                onChange={(e) =>
                                                    setGatewayTransferRef(e.target.value.toUpperCase())
                                                }
                                                placeholder="VD: FT2630299812"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800"
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={cancelBookingAndReleaseLocker}
                                                onChange={(e) =>
                                                    setCancelBookingAndReleaseLocker(e.target.checked)
                                                }
                                                className="accent-purple-600"
                                            />
                                            <span className="font-semibold text-slate-700">
                                                Hủy đơn & giải phóng/bảo trì ngăn tủ
                                            </span>
                                        </label>

                                        <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={waiveRelatedOverdueDebt}
                                                onChange={(e) =>
                                                    setWaiveRelatedOverdueDebt(e.target.checked)
                                                }
                                                className="accent-emerald-600"
                                            />
                                            <span className="font-semibold text-slate-700">
                                                Miễn trừ dư nợ quá hạn phát sinh oan
                                            </span>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">
                                            Ghi chú thẩm định của Admin (lưu Audit Log)
                                        </label>
                                        <input
                                            type="text"
                                            value={decisionNote}
                                            onChange={(e) => setDecisionNote(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-600 cursor-pointer"
                                        >
                                            Đóng
                                        </button>
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => void handleApproveSubmit()}
                                            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                                        >
                                            {submitting ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            <span>
                                                {disburseImmediately
                                                    ? `Phê duyệt & Hoàn ${formatVnd(approvedAmount)}`
                                                    : `Phê duyệt Lệnh (${formatVnd(approvedAmount)})`}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-rose-900 flex items-center gap-1.5">
                                            <XCircle className="w-4 h-4 text-rose-600" />
                                            <span>Từ chối Lệnh Hoàn Tiền Ngoại Lệ</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setRejectMode(false)}
                                            className="text-blue-600 hover:underline font-bold cursor-pointer"
                                        >
                                            ← Quay lại Phê duyệt
                                        </button>
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Nhập lý do từ chối cụ thể (VD: Khách tự ý hủy muộn không có sự cố kỹ thuật tại trạm)..."
                                        className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-slate-800"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => void handleRejectSubmit()}
                                            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                                        >
                                            Xác nhận Từ chối Lệnh
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* CASE B: APPROVED_PENDING_PAYOUT */}
                    {item.status === 'APPROVED_PENDING_PAYOUT' && isAdmin && (
                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
                            <p className="font-extrabold text-blue-950">
                                Xác nhận Đã Chuyển khoản Giải ngân ({formatVnd(item.approvedAmount ?? item.requestedAmount)})
                            </p>
                            <input
                                type="text"
                                value={gatewayTransferRef}
                                onChange={(e) => setGatewayTransferRef(e.target.value.toUpperCase())}
                                placeholder="Nhập mã bút toán ngân hàng Napas247 (VD: FT2630299481) *"
                                className="w-full px-3 py-2 rounded-xl border border-blue-300 bg-white font-mono font-bold text-slate-900"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => void handleConfirmPayoutSubmit()}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                                >
                                    Xác nhận Tất toán & Ghi Sổ Payments
                                </button>
                            </div>
                        </div>
                    )}

                    {/* CASE C: DISBURSED OR REJECTED AUDIT SUMMARY */}
                    {(item.status === 'DISBURSED' || item.status === 'REJECTED') && (
                        <div
                            className={`p-4 rounded-2xl border space-y-1.5 ${
                                item.status === 'DISBURSED'
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                    : 'bg-slate-100 border-slate-200 text-slate-800'
                            }`}
                        >
                            <p className="font-extrabold">
                                {item.status === 'DISBURSED'
                                    ? `ĐÃ HOÀN TIỀN THÀNH CÔNG: ${formatVnd(
                                          item.approvedAmount ?? item.requestedAmount
                                      )} · Mã FT: ${item.gatewayTransferRef || '—'}`
                                    : 'LỆNH ĐÃ BỊ TỪ CHỐI'}
                            </p>
                            <p className="text-[11px]">
                                Người thẩm định: <strong>{item.reviewedByName || item.reviewedByEmail}</strong> lúc{' '}
                                {formatDateTime(item.reviewedAt)}
                            </p>
                            {item.adminDecisionNote && (
                                <p className="text-[11px]">Ghi chú quyết định: {item.adminDecisionNote}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
