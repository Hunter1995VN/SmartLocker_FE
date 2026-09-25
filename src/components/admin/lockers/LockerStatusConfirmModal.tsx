/**
 * AD-FE-04: S-01 — Locker Status Change Confirmation Modal
 * Modal xác nhận trước khi cập nhật trạng thái ô tủ (đặc biệt khi chuyển sang MAINTENANCE hoặc DISABLED).
 */
import { AlertTriangle, Wrench, X } from 'lucide-react';
import type { LockerGridItemDto, UpdateLockerStatusRequest } from '../../../api/adminStationService';

interface LockerStatusConfirmModalProps {
    locker: LockerGridItemDto | null;
    pendingRequest: UpdateLockerStatusRequest | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isUpdating: boolean;
}

export default function LockerStatusConfirmModal({
    locker,
    pendingRequest,
    isOpen,
    onClose,
    onConfirm,
    isUpdating,
}: LockerStatusConfirmModalProps) {
    if (!isOpen || !locker || !pendingRequest) return null;

    const targetStatus = pendingRequest.businessStatus;
    const isMaintenance = targetStatus === 'MAINTENANCE';

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                            isMaintenance ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>
                            {isMaintenance ? <Wrench className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                                Xác nhận chuyển trạng thái
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                Áp dụng thay đổi cho ngăn tủ <b>{locker.lockerCode}</b>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3.5 text-xs text-slate-600 leading-relaxed">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Ngăn tủ:</span>
                            <span className="font-mono font-bold text-slate-900">{locker.lockerCode} (Size {locker.size})</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Trạng thái hiện tại:</span>
                            <span className="font-bold text-slate-700">{locker.businessStatus}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Chuyển sang:</span>
                            <span className={`font-bold ${isMaintenance ? 'text-amber-600' : 'text-blue-600'}`}>
                                {targetStatus}
                            </span>
                        </div>
                        {pendingRequest.reason && (
                            <div className="pt-1.5 border-t border-slate-200 text-[11px]">
                                <span className="text-slate-400 block mb-0.5">Lý do & ghi chú:</span>
                                <span className="font-semibold text-slate-800">{pendingRequest.reason}</span>
                            </div>
                        )}
                    </div>

                    {isMaintenance && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                            <b>Lưu ý:</b> Ngăn tủ này sẽ được cách ly ngay khỏi hệ thống phân bổ đặt chỗ. Khách hàng sẽ không thể đặt hoặc sử dụng ô tủ này cho đến khi được mở lại.
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        disabled={isUpdating}
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white border border-slate-200 transition cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => void onConfirm()}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm disabled:opacity-50 transition cursor-pointer ${
                            isMaintenance
                                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                        }`}
                    >
                        {isUpdating ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Wrench className="w-4 h-4" />
                        )}
                        <span>Xác nhận áp dụng</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
