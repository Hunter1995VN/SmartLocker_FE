/**
 * AD-FE-03: UC-A04 — Batch Apply Pricing Modal
 * Modal cho phép Admin áp dụng bảng giá hàng loạt (Batch Pricing) cho toàn bộ hoặc nhiều trạm được chọn.
 */
import { useState } from 'react';
import { X, Tag, CheckCircle2, Layers } from 'lucide-react';
import type { StationAdminDetailDto } from '../../../api/adminStationService';
import adminStationService from '../../../api/adminStationService';

interface BatchPricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    stations: StationAdminDetailDto[];
    onSuccess: () => void;
}

export default function BatchPricingModal({
    isOpen,
    onClose,
    stations,
    onSuccess,
}: BatchPricingModalProps) {
    const [priceS, setPriceS] = useState('10000');
    const [priceM, setPriceM] = useState('15000');
    const [priceL, setPriceL] = useState('20000');
    const [applyToAll, setApplyToAll] = useState(true);
    const [isApplying, setIsApplying] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsApplying(true);
        setFeedback(null);

        try {
            const targetStations = applyToAll ? stations : stations.filter(s => s.status === 'ACTIVE');
            
            // Apply for each station
            for (const st of targetStations) {
                await Promise.all([
                    adminStationService.updatePricingPolicy(st.id, {
                        size: 'S',
                        pricePerBlock: Number(priceS),
                        blockHours: 1,
                        overdueFeePerHour: Number(priceS) * 1.5,
                        gracePeriodMinutes: 15,
                    }),
                    adminStationService.updatePricingPolicy(st.id, {
                        size: 'M',
                        pricePerBlock: Number(priceM),
                        blockHours: 1,
                        overdueFeePerHour: Number(priceM) * 1.5,
                        gracePeriodMinutes: 15,
                    }),
                    adminStationService.updatePricingPolicy(st.id, {
                        size: 'L',
                        pricePerBlock: Number(priceL),
                        blockHours: 1,
                        overdueFeePerHour: Number(priceL) * 1.5,
                        gracePeriodMinutes: 15,
                    }),
                ]);
            }

            setFeedback(`Đã áp dụng bảng giá mới thành công cho ${targetStations.length} trạm!`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1200);
        } catch {
            setFeedback('Có lỗi khi cập nhật bảng giá hàng loạt');
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                            <Tag className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                                Batch Apply Pricing
                            </h3>
                            <p className="text-[11px] text-slate-400">Áp dụng bảng giá hàng loạt cho các trạm</p>
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

                <form onSubmit={handleApply} className="p-6 space-y-4">
                    {feedback && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>{feedback}</span>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Giá cỡ S (VNĐ / giờ)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                value={priceS}
                                onChange={(e) => setPriceS(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Giá cỡ M (VNĐ / giờ)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                value={priceM}
                                onChange={(e) => setPriceM(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Giá cỡ L (VNĐ / giờ)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                value={priceL}
                                onChange={(e) => setPriceL(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                            />
                        </div>

                        <div className="pt-2">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={applyToAll}
                                    onChange={(e) => setApplyToAll(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span>Áp dụng cho tất cả {stations.length} trạm trong hệ thống</span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isApplying}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
                        >
                            {isApplying ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Layers className="w-4 h-4" />
                            )}
                            <span>Áp dụng ngay</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
