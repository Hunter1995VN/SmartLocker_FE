/**
 * AD-FE-03: UC-A03 — Delete Station Confirmation Modal
 * Modal xác nhận trước khi ngưng hoạt động (soft-delete) trạm tủ.
 */
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { StationAdminDetailDto } from '../../../api/adminStationService';

interface DeleteStationModalProps {
    station: StationAdminDetailDto | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isDeleting: boolean;
}

export default function DeleteStationModal({
    station,
    isOpen,
    onClose,
    onConfirm,
    isDeleting,
}: DeleteStationModalProps) {
    if (!isOpen || !station) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                                Ngưng Hoạt Động Trạm Tủ?
                            </h3>
                            <p className="text-[11px] text-slate-400">Xác nhận chuyển trạng thái INACTIVE</p>
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
                <div className="p-5 space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Bạn có chắc chắn muốn ngưng hoạt động trạm tủ{' '}
                        <b className="text-slate-900 font-bold">"{station.name}"</b>?
                    </p>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Lưu ý quan trọng:</span>
                        </p>
                        <p>
                            Trạm sẽ chuyển sang trạng thái <b>INACTIVE</b> và không còn hiển thị cho khách hàng đặt tủ trên ứng dụng di động. Các ô tủ đang chứa hàng sẽ cần được xử lý trước.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        disabled={isDeleting}
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white border border-slate-200 transition cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void onConfirm()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-500/20 disabled:opacity-50 transition cursor-pointer"
                    >
                        {isDeleting ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                        <span>Xác nhận ngưng hoạt động</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
