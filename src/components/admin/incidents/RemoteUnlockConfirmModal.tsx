/**
 * AD-FE-06: UC-T14 → A08, S-02 — Confirmation Dialog for Remote Unlock / Locker Access Request
 *
 * Hiển thị thông tin Incident đầy đủ trước khi Admin/Staff xác nhận gửi lệnh mở khóa.
 * API chỉ được gọi sau khi user bấm "Xác nhận".
 */
import { X, ShieldAlert, AlertTriangle } from 'lucide-react';
import type { IncidentDetailDto } from '../../../api/adminIncidentService';

interface RemoteUnlockConfirmModalProps {
    incident: IncidentDetailDto;
    isSubmitting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function RemoteUnlockConfirmModal({
    incident,
    isSubmitting,
    onConfirm,
    onCancel,
}: RemoteUnlockConfirmModalProps) {
    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlock-modal-title"
        >
            {/* Dialog card */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200/80 overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 shrink-0">
                            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h2
                                id="unlock-modal-title"
                                className="text-base font-black text-slate-900 tracking-tight"
                            >
                                Xác nhận mở khóa tủ từ xa
                            </h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Thao tác này có thể tác động trực tiếp đến tài sản khách hàng.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        aria-label="Đóng hộp thoại xác nhận"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Incident Detail Summary */}
                <div className="px-6 py-5 space-y-3 text-sm">
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                        <InfoRow label="Mã sự cố" value={incident.incidentCode} mono />
                        {incident.bookingCode && (
                            <InfoRow label="Booking" value={`#${incident.bookingCode}`} mono />
                        )}
                        <InfoRow label="Trạm" value={incident.stationName} />
                        <InfoRow label="Tủ" value={incident.lockerCode} mono />
                        <InfoRow label="Loại sự cố" value={incident.type} />
                        {incident.description && (
                            <InfoRow label="Lý do báo cáo" value={incident.description} />
                        )}
                    </div>

                    {/* Warning message */}
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" aria-hidden="true" />
                        <p>
                            Vui lòng xác minh đầy đủ thông tin sự cố trước khi tiếp tục. Lệnh mở
                            khóa sẽ được ghi vào Audit Log hệ thống.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-5 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                        Hủy
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        aria-label="Xác nhận gửi lệnh mở khóa tủ từ xa"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md shadow-rose-500/25 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <span
                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                                    aria-hidden="true"
                                />
                                <span>Đang gửi lệnh...</span>
                            </>
                        ) : (
                            <>
                                <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                                <span>Xác nhận mở khóa</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function InfoRow({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-3 text-xs">
            <span className="text-slate-500 shrink-0 font-medium">{label}</span>
            <span className={`text-right text-slate-900 font-semibold ${mono ? 'font-mono' : ''}`}>
                {value}
            </span>
        </div>
    );
}
