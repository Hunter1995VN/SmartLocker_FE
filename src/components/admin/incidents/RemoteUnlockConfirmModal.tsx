/**
 * AD-FE-06: UC-T14 → A08, S-02, UC-S05 — Confirmation Dialog for Remote Unlock / Locker Access Request
 *
 * Hiển thị thông tin Incident đầy đủ và bắt buộc nhập lý do Audit (UC-S05)
 * trước khi Admin/Staff xác nhận gửi lệnh mở khóa.
 * API chỉ được gọi sau khi user nhập lý do hợp lệ (>= 5 ký tự) và bấm "Xác nhận".
 */
import { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, FileCheck2 } from 'lucide-react';
import type { IncidentDetailDto } from '../../../api/adminIncidentService';

interface RemoteUnlockConfirmModalProps {
    incident: IncidentDetailDto;
    isSubmitting: boolean;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

const QUICK_REASONS: string[] = [
    'Khách hàng kẹt hành lý do lỗi chốt điện từ',
    'Cảm biến cửa báo sai trạng thái vật lý',
    'Hỗ trợ mở khóa khẩn cấp theo biên bản xác minh tại Kiosk',
    'Xử lý sự cố kẹt cơ khí sau khi đối chiếu CCCD khách hàng',
];

export default function RemoteUnlockConfirmModal({
    incident,
    isSubmitting,
    onConfirm,
    onCancel,
}: RemoteUnlockConfirmModalProps) {
    const [reason, setReason] = useState<string>('');
    const trimmedReason = reason.trim();
    const isReasonValid = trimmedReason.length >= 5;

    const handleConfirmClick = () => {
        if (!isReasonValid || isSubmitting) return;
        onConfirm(trimmedReason);
    };

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlock-modal-title"
        >
            {/* Dialog card */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/80 overflow-hidden">
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
                                Xác nhận mở khóa tủ từ xa (UC-S05)
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

                {/* Incident Detail Summary & Mandatory Audit Input */}
                <div className="px-6 py-5 space-y-4 text-sm max-h-[75vh] overflow-y-auto">
                    {/* Audit Warning Badge */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
                        <p className="font-semibold leading-relaxed">
                            Bắt buộc nhập lý do Audit (UC-S05) — Thao tác này sẽ phát lệnh mở chốt MQTT và ghi vết vĩnh viễn vào Audit Logs
                        </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
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

                    {/* Mandatory Audit Reason Input */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label
                                htmlFor="audit-unlock-reason"
                                className="text-xs font-bold text-slate-800 flex items-center gap-1.5"
                            >
                                <FileCheck2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>
                                    Lý do mở tủ khẩn cấp (Audit Reason){' '}
                                    <span className="text-rose-600">*</span>
                                </span>
                            </label>
                            <span
                                className={`text-[10px] font-mono font-semibold ${
                                    isReasonValid ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                            >
                                {trimmedReason.length}/5+ ký tự
                            </span>
                        </div>

                        <textarea
                            id="audit-unlock-reason"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="Nhập chi tiết lý do xác minh và căn cứ mở khóa từ xa (tối thiểu 5 ký tự)..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition"
                        />

                        {/* Quick reason chips */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Chọn nhanh mẫu lý do chuẩn:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {QUICK_REASONS.map((sample) => (
                                    <button
                                        key={sample}
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => setReason(sample)}
                                        className={`text-left text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                            reason === sample
                                                ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                                        }`}
                                    >
                                        {sample}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-5 pt-2 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end border-t border-slate-100">
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
                        onClick={handleConfirmClick}
                        disabled={isSubmitting || !isReasonValid}
                        aria-label="Xác nhận gửi lệnh mở khóa tủ từ xa"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md shadow-rose-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
