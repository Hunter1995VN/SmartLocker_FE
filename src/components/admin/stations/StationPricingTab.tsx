/**
 * AD-FE-03: UC-A04 — Manage Lockers, Pricing, Overdue Penalty & Refund Policies
 * Tab 3: Pricing Matrix & Overdue / Cancellation Refund Policies Management (UC-A04).
 * Cho phép cấu hình giá thuê theo giờ/ngày, mức phí phạt quá hạn, thời gian ân hạn
 * và tỷ lệ hoàn tiền khi hủy đơn (trước/sau mốc cutoff, No-Show) cho từng cỡ tủ S, M, L.
 */
import { useState, useEffect } from 'react';
import {
    Tag,
    Save,
    CheckCircle2,
    AlertCircle,
    Clock,
    RotateCcw,
    AlertTriangle,
    Percent,
    Timer,
} from 'lucide-react';
import adminStationService, {
    type StationAdminDetailDto,
} from '../../../api/adminStationService';

interface StationPricingTabProps {
    station: StationAdminDetailDto;
    onPricingUpdated: () => void;
    onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

function toPercentageString(rateValue: number | undefined, fallbackPct: number): string {
    if (rateValue === undefined || rateValue === null || Number.isNaN(Number(rateValue))) {
        return String(fallbackPct);
    }
    const num = Number(rateValue);
    // If stored as decimal 0..1 (e.g. 1.0 or 0.5), convert to 0..100
    const pct = num <= 1 && num >= 0 ? Math.round(num * 100) : Math.round(num);
    return String(Math.min(100, Math.max(0, pct)));
}

export default function StationPricingTab({ station, onPricingUpdated, onShowToast }: StationPricingTabProps) {
    const policyS = station.pricingPolicies?.find((p) => (p.size || '').toUpperCase() === 'S');
    const policyM = station.pricingPolicies?.find((p) => (p.size || '').toUpperCase() === 'M');
    const policyL = station.pricingPolicies?.find((p) => (p.size || '').toUpperCase() === 'L');
    const basePolicy = policyS || policyM || policyL;

    const [pricingMode, setPricingMode] = useState<'hourly' | 'daily'>(
        basePolicy?.blockHours === 24 ? 'daily' : 'hourly'
    );

    // Price state for S, M, L
    const [priceS, setPriceS] = useState<string>(
        String(policyS?.pricePerBlock ?? station.priceS ?? 10000)
    );
    const [priceM, setPriceM] = useState<string>(
        String(policyM?.pricePerBlock ?? station.priceM ?? 15000)
    );
    const [priceL, setPriceL] = useState<string>(
        String(policyL?.pricePerBlock ?? station.priceL ?? 20000)
    );

    // UC-A04: Overdue fee per hour for S, M, L & Grace period
    const [overdueFeeS, setOverdueFeeS] = useState<string>(
        String(policyS?.overdueFeePerHour ?? (station.priceS ?? 10000) * 1.5)
    );
    const [overdueFeeM, setOverdueFeeM] = useState<string>(
        String(policyM?.overdueFeePerHour ?? (station.priceM ?? 15000) * 1.5)
    );
    const [overdueFeeL, setOverdueFeeL] = useState<string>(
        String(policyL?.overdueFeePerHour ?? (station.priceL ?? 20000) * 1.5)
    );
    const [graceMinutes, setGraceMinutes] = useState<string>(
        String(basePolicy?.gracePeriodMinutes ?? 15)
    );

    // UC-A04: Cancellation Refund Rate & No-Show Policy states
    const [refundCutoffHours, setRefundCutoffHours] = useState<string>(
        String(basePolicy?.refundCutoffHours ?? 2)
    );
    const [refundRateEarlyPct, setRefundRateEarlyPct] = useState<string>(
        toPercentageString(basePolicy?.refundRateEarly, 100)
    );
    const [refundRateLatePct, setRefundRateLatePct] = useState<string>(
        toPercentageString(basePolicy?.refundRateLate, 50)
    );
    const [noShowWindowMinutes, setNoShowWindowMinutes] = useState<string>(
        String(basePolicy?.noShowWindowMinutes ?? 30)
    );

    // Sync state when station changes
    useEffect(() => {
        const pS = station.pricingPolicies?.find((p) => (p.size || '').toUpperCase() === 'S');
        const pM = station.pricingPolicies?.find((p) => (p.size || '').toUpperCase() === 'M');
        const pL = station.pricingPolicies?.find((p) => (p.size || '').toUpperCase() === 'L');
        const bp = pS || pM || pL;

        setPricingMode(bp?.blockHours === 24 ? 'daily' : 'hourly');
        setPriceS(String(pS?.pricePerBlock ?? station.priceS ?? 10000));
        setPriceM(String(pM?.pricePerBlock ?? station.priceM ?? 15000));
        setPriceL(String(pL?.pricePerBlock ?? station.priceL ?? 20000));
        setOverdueFeeS(String(pS?.overdueFeePerHour ?? (station.priceS ?? 10000) * 1.5));
        setOverdueFeeM(String(pM?.overdueFeePerHour ?? (station.priceM ?? 15000) * 1.5));
        setOverdueFeeL(String(pL?.overdueFeePerHour ?? (station.priceL ?? 20000) * 1.5));
        setGraceMinutes(String(bp?.gracePeriodMinutes ?? 15));
        setRefundCutoffHours(String(bp?.refundCutoffHours ?? 2));
        setRefundRateEarlyPct(toPercentageString(bp?.refundRateEarly, 100));
        setRefundRateLatePct(toPercentageString(bp?.refundRateLate, 50));
        setNoShowWindowMinutes(String(bp?.noShowWindowMinutes ?? 30));
    }, [station]);

    // UI states
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const validate = () => {
        const errs: { [key: string]: string } = {};

        const numS = Number(priceS);
        if (Number.isNaN(numS) || numS < 0) {
            errs.priceS = 'Giá cỡ S phải là số không âm';
        }

        const numM = Number(priceM);
        if (Number.isNaN(numM) || numM < 0) {
            errs.priceM = 'Giá cỡ M phải là số không âm';
        }

        const numL = Number(priceL);
        if (Number.isNaN(numL) || numL < 0) {
            errs.priceL = 'Giá cỡ L phải là số không âm';
        }

        const feeS = Number(overdueFeeS);
        if (Number.isNaN(feeS) || feeS < 0) {
            errs.overdueFeeS = 'Phụ phí quá hạn phải là số >= 0';
        }

        const feeM = Number(overdueFeeM);
        if (Number.isNaN(feeM) || feeM < 0) {
            errs.overdueFeeM = 'Phụ phí quá hạn phải là số >= 0';
        }

        const feeL = Number(overdueFeeL);
        if (Number.isNaN(feeL) || feeL < 0) {
            errs.overdueFeeL = 'Phụ phí quá hạn phải là số >= 0';
        }

        const grace = Number(graceMinutes);
        if (Number.isNaN(grace) || grace < 0) {
            errs.graceMinutes = 'Thời gian ân hạn phải là số phút >= 0';
        }

        const cutoff = Number(refundCutoffHours);
        if (Number.isNaN(cutoff) || cutoff < 0) {
            errs.refundCutoffHours = 'Mốc thời gian hủy đơn phải >= 0 giờ';
        }

        const earlyPct = Number(refundRateEarlyPct);
        if (Number.isNaN(earlyPct) || earlyPct < 0 || earlyPct > 100) {
            errs.refundRateEarlyPct = 'Tỷ lệ hoàn tiền hủy sớm phải từ 0% đến 100%';
        }

        const latePct = Number(refundRateLatePct);
        if (Number.isNaN(latePct) || latePct < 0 || latePct > 100) {
            errs.refundRateLatePct = 'Tỷ lệ hoàn tiền hủy sát giờ phải từ 0% đến 100%';
        }

        const noShow = Number(noShowWindowMinutes);
        if (Number.isNaN(noShow) || noShow < 5) {
            errs.noShowWindowMinutes = 'Thời gian giữ chỗ No-Show phải >= 5 phút';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSavePricing = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);

                if (!validate()) {
            const errMsg = 'Vui lòng kiểm tra lại các ô nhập liệu có viền đỏ phía trên trước khi lưu!';
            setFeedback({
                type: 'error',
                message: errMsg,
            });
            onShowToast?.(errMsg, 'error');
            setTimeout(() => {
                const firstErr = document.querySelector('.border-rose-400');
                if (firstErr) {
                    firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return;
        }

        setIsSaving(true);
        try {
            const blockHours = pricingMode === 'hourly' ? 1 : 24;
            const grace = parseInt(graceMinutes, 10) || 15;
            const cutoffHours = Math.max(0, Number(refundCutoffHours) || 2);
            const rateEarly = Math.min(1, Math.max(0, Number(refundRateEarlyPct) / 100));
            const rateLate = Math.min(1, Math.max(0, Number(refundRateLatePct) / 100));
            const noShowMins = Math.max(5, parseInt(noShowWindowMinutes, 10) || 30);

            // Update S, M, L in parallel including UC-A04 Overdue & Refund parameters
            await Promise.all([
                adminStationService.updatePricingPolicy(station.id, {
                    size: 'S',
                    pricePerBlock: Number(priceS),
                    blockHours,
                    overdueFeePerHour: Number(overdueFeeS),
                    gracePeriodMinutes: grace,
                    refundCutoffHours: cutoffHours,
                    refundRateEarly: rateEarly,
                    refundRateLate: rateLate,
                    noShowWindowMinutes: noShowMins,
                }),
                adminStationService.updatePricingPolicy(station.id, {
                    size: 'M',
                    pricePerBlock: Number(priceM),
                    blockHours,
                    overdueFeePerHour: Number(overdueFeeM),
                    gracePeriodMinutes: grace,
                    refundCutoffHours: cutoffHours,
                    refundRateEarly: rateEarly,
                    refundRateLate: rateLate,
                    noShowWindowMinutes: noShowMins,
                }),
                adminStationService.updatePricingPolicy(station.id, {
                    size: 'L',
                    pricePerBlock: Number(priceL),
                    blockHours,
                    overdueFeePerHour: Number(overdueFeeL),
                    gracePeriodMinutes: grace,
                    refundCutoffHours: cutoffHours,
                    refundRateEarly: rateEarly,
                    refundRateLate: rateLate,
                    noShowWindowMinutes: noShowMins,
                }),
            ]);

            const succMsg = `Đã lưu thành công bảng giá (${pricingMode === 'hourly' ? 'Theo giờ' : 'Theo ngày'}), phí phạt quá hạn và chính sách hoàn tiền cho trạm!`;
            setFeedback({
                type: 'success',
                message: succMsg,
            });
            onShowToast?.(succMsg, 'success');
            onPricingUpdated();
        } catch {
            const errMsg = 'Có lỗi xảy ra khi lưu cấu hình giá & chính sách hoàn tiền. Vui lòng kiểm tra lại.';
            setFeedback({
                type: 'error',
                message: errMsg,
            });
            onShowToast?.(errMsg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSavePricing} className="space-y-6">
            {feedback && (
                <div
                    className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                >
                    {feedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Pricing Mode Toggle: Hourly vs Daily */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-blue-600" />
                        <span>Chế độ định giá (Pricing Model — UC-A04)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Lựa chọn áp dụng đơn vị tính block thời gian thuê tủ cho S, M, L
                    </p>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setPricingMode('hourly')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                            pricingMode === 'hourly'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Theo Giờ (1h/block)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPricingMode('daily')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                            pricingMode === 'daily'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Theo Ngày (24h/block)</span>
                    </button>
                </div>
            </div>

            {/* Pricing Table by Locker Size */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-4">Kích thước (Size)</th>
                            <th className="py-3 px-4">
                                {pricingMode === 'hourly' ? 'Giá theo giờ (VNĐ / block)' : 'Giá theo ngày (VNĐ / block)'}
                            </th>
                            <th className="py-3 px-4">Phí phạt quá hạn (VNĐ / giờ)</th>
                            <th className="py-3 px-4">Xem trước hiển thị</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {/* Size S */}
                        <tr className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-black flex items-center justify-center">
                                        S
                                    </span>
                                    <div>
                                        <p className="font-bold text-slate-800">Small (Tủ nhỏ)</p>
                                        <p className="text-[10px] text-slate-400">Balo, túi xách cá nhân</p>
                                    </div>
                                </div>
                            </td>
                            <td className="py-3.5 px-4">
                                <div className="relative max-w-[170px]">
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={priceS}
                                        onChange={(e) => {
                                            setPriceS(e.target.value);
                                            setOverdueFeeS(String(Number(e.target.value) * 1.5));
                                            if (errors.priceS) setErrors((prev) => ({ ...prev, priceS: '' }));
                                        }}
                                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 ${
                                            errors.priceS
                                                ? 'border-rose-400 focus:ring-rose-200'
                                                : 'border-slate-200 focus:ring-blue-200'
                                        }`}
                                    />
                                    {errors.priceS && <p className="text-[10px] text-rose-500 mt-0.5">{errors.priceS}</p>}
                                </div>
                            </td>
                            <td className="py-3.5 px-4">
                                <div className="relative max-w-[170px]">
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={overdueFeeS}
                                        onChange={(e) => setOverdueFeeS(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-rose-700 bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                    />
                                    {errors.overdueFeeS && (
                                        <p className="text-[10px] text-rose-500 mt-0.5">{errors.overdueFeeS}</p>
                                    )}
                                </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                                <div className="font-bold text-blue-600">
                                    {Number(priceS || 0).toLocaleString('vi-VN')} đ / {pricingMode === 'hourly' ? 'giờ' : 'ngày'}
                                </div>
                                <div className="text-[10px] text-rose-600 font-semibold">
                                    Quá hạn: +{Number(overdueFeeS || 0).toLocaleString('vi-VN')} đ/giờ
                                </div>
                            </td>
                        </tr>

                        {/* Size M */}
                        <tr className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-black flex items-center justify-center">
                                        M
                                    </span>
                                    <div>
                                        <p className="font-bold text-slate-800">Medium (Tủ vừa)</p>
                                        <p className="text-[10px] text-slate-400">Vali cabin, túi hành lý 20-inch</p>
                                    </div>
                                </div>
                            </td>
                            <td className="py-3.5 px-4">
                                <div className="relative max-w-[170px]">
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={priceM}
                                        onChange={(e) => {
                                            setPriceM(e.target.value);
                                            setOverdueFeeM(String(Number(e.target.value) * 1.5));
                                            if (errors.priceM) setErrors((prev) => ({ ...prev, priceM: '' }));
                                        }}
                                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 ${
                                            errors.priceM
                                                ? 'border-rose-400 focus:ring-rose-200'
                                                : 'border-slate-200 focus:ring-blue-200'
                                        }`}
                                    />
                                    {errors.priceM && <p className="text-[10px] text-rose-500 mt-0.5">{errors.priceM}</p>}
                                </div>
                            </td>
                            <td className="py-3.5 px-4">
                                <div className="relative max-w-[170px]">
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={overdueFeeM}
                                        onChange={(e) => setOverdueFeeM(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-rose-700 bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                    />
                                    {errors.overdueFeeM && (
                                        <p className="text-[10px] text-rose-500 mt-0.5">{errors.overdueFeeM}</p>
                                    )}
                                </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                                <div className="font-bold text-indigo-600">
                                    {Number(priceM || 0).toLocaleString('vi-VN')} đ / {pricingMode === 'hourly' ? 'giờ' : 'ngày'}
                                </div>
                                <div className="text-[10px] text-rose-600 font-semibold">
                                    Quá hạn: +{Number(overdueFeeM || 0).toLocaleString('vi-VN')} đ/giờ
                                </div>
                            </td>
                        </tr>

                        {/* Size L */}
                        <tr className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-black flex items-center justify-center">
                                        L
                                    </span>
                                    <div>
                                        <p className="font-bold text-slate-800">Large (Tủ lớn)</p>
                                        <p className="text-[10px] text-slate-400">Vali cỡ lớn 28-inch, kiện hàng nặng</p>
                                    </div>
                                </div>
                            </td>
                            <td className="py-3.5 px-4">
                                <div className="relative max-w-[170px]">
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={priceL}
                                        onChange={(e) => {
                                            setPriceL(e.target.value);
                                            setOverdueFeeL(String(Number(e.target.value) * 1.5));
                                            if (errors.priceL) setErrors((prev) => ({ ...prev, priceL: '' }));
                                        }}
                                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 ${
                                            errors.priceL
                                                ? 'border-rose-400 focus:ring-rose-200'
                                                : 'border-slate-200 focus:ring-blue-200'
                                        }`}
                                    />
                                    {errors.priceL && <p className="text-[10px] text-rose-500 mt-0.5">{errors.priceL}</p>}
                                </div>
                            </td>
                            <td className="py-3.5 px-4">
                                <div className="relative max-w-[170px]">
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={overdueFeeL}
                                        onChange={(e) => setOverdueFeeL(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-rose-700 bg-rose-50/30 focus:outline-none focus:ring-2 focus:ring-rose-200"
                                    />
                                    {errors.overdueFeeL && (
                                        <p className="text-[10px] text-rose-500 mt-0.5">{errors.overdueFeeL}</p>
                                    )}
                                </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                                <div className="font-bold text-purple-600">
                                    {Number(priceL || 0).toLocaleString('vi-VN')} đ / {pricingMode === 'hourly' ? 'giờ' : 'ngày'}
                                </div>
                                <div className="text-[10px] text-rose-600 font-semibold">
                                    Quá hạn: +{Number(overdueFeeL || 0).toLocaleString('vi-VN')} đ/giờ
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Dedicated Card: Chính Sách Phí Phạt Quá Hạn & Tỷ Lệ Hoàn Tiền Khi Hủy Đơn (UC-A04) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                    <div>
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <RotateCcw className="w-4 h-4 text-blue-600" />
                            <span>Chính Sách Phí Phạt Quá Hạn & Tỷ Lệ Hoàn Tiền Khi Hủy Đơn (UC-A04)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Cấu hình ngưỡng ân hạn quá hạn, mốc giờ hủy đơn tiêu chuẩn và tỷ lệ % hoàn tiền tự động vào ví khách hàng
                        </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        ÁP DỤNG S • M • L
                    </span>
                </div>

                {/* Grid of 4 Policy Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Grace Period Minutes */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Timer className="w-3.5 h-3.5 text-amber-600" />
                                <span>Thời gian ân hạn trễ giờ (Grace Period)</span>
                            </label>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Miễn phạt đầu giờ
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Số phút khách được phép trễ sau khi hết hạn thuê trước khi hệ thống tính phí phạt quá hạn.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="number"
                                min="0"
                                max="120"
                                value={graceMinutes}
                                onChange={(e) => setGraceMinutes(e.target.value)}
                                className="w-28 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                            <span className="text-xs font-semibold text-slate-600">phút</span>
                        </div>
                        {errors.graceMinutes && (
                            <p className="text-[10px] text-rose-500">{errors.graceMinutes}</p>
                        )}
                    </div>

                    {/* 2. No-Show Window Minutes */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Thời gian giữ chỗ tối đa trước No-Show</span>
                            </label>
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Giải phóng tủ tự động
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Thời gian tối đa kể từ giờ bắt đầu đặt trước mà khách chưa mở tủ bỏ đồ trước khi tính No-Show.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="number"
                                min="5"
                                max="240"
                                value={noShowWindowMinutes}
                                onChange={(e) => setNoShowWindowMinutes(e.target.value)}
                                className="w-28 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                            <span className="text-xs font-semibold text-slate-600">phút</span>
                        </div>
                        {errors.noShowWindowMinutes && (
                            <p className="text-[10px] text-rose-500">{errors.noShowWindowMinutes}</p>
                        )}
                    </div>

                    {/* 3. Refund Cutoff Hours */}
                    <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-200/70 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                <span>Mốc thời gian hủy đơn tiêu chuẩn (Cutoff)</span>
                            </label>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                                Trước giờ nhận tủ
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Số giờ tính từ thời điểm bấm Hủy đến giờ bắt đầu nhận tủ (StartAt), <strong>không phụ thuộc thời lượng thuê</strong> (thuê 1 tiếng hay 24 tiếng nếu hủy trước mốc này đều được tính là hủy sớm).
                        </p>
                        <p className="text-[10px] text-blue-600 bg-blue-50/80 p-1.5 rounded-lg border border-blue-100">
                            💡 <strong>Ghi chú:</strong> Mốc này so sánh với giờ nhận tủ. Nếu trạm có nhiều khách đặt dùng ngay tại chỗ, Admin có thể giảm mốc này về 1h hoặc 0h để khách hủy không bị trừ phí.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="number"
                                min="0"
                                max="72"
                                step="1"
                                value={refundCutoffHours}
                                onChange={(e) => setRefundCutoffHours(e.target.value)}
                                className="w-28 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                            <span className="text-xs font-semibold text-slate-600">giờ trước hạn</span>
                        </div>
                        {errors.refundCutoffHours && (
                            <p className="text-[10px] text-rose-500">{errors.refundCutoffHours}</p>
                        )}
                    </div>

                    {/* 4. Early & Late Refund Rates (%) */}
                    <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200/70 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Tỷ lệ hoàn tiền khi hủy đơn (Early / Late)</span>
                            </label>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                                Hoàn tiền tự động
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Hủy sớm (&ge; {refundCutoffHours || 0}h trước):
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={refundRateEarlyPct}
                                        onChange={(e) => setRefundRateEarlyPct(e.target.value)}
                                        className="w-20 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                    />
                                    <span className="text-xs font-bold text-emerald-700">%</span>
                                </div>
                                {errors.refundRateEarlyPct && (
                                    <p className="text-[10px] text-rose-500 mt-0.5">{errors.refundRateEarlyPct}</p>
                                )}
                            </div>

                            <div>
                                <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Hủy sát giờ (&lt; {refundCutoffHours || 0}h):
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={refundRateLatePct}
                                        onChange={(e) => setRefundRateLatePct(e.target.value)}
                                        className="w-20 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                    />
                                    <span className="text-xs font-bold text-amber-700">%</span>
                                </div>
                                {errors.refundRateLatePct && (
                                    <p className="text-[10px] text-rose-500 mt-0.5">{errors.refundRateLatePct}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Policy Simulation Preview Banner */}
                <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                        <p className="font-bold text-slate-200">
                            Tóm tắt quy tắc áp dụng thực tế tại trạm:
                        </p>
                        <p className="text-[11px] text-slate-300">
                            • Hủy trước <strong>{refundCutoffHours || 0} giờ</strong>: Hoàn <strong>{refundRateEarlyPct || 0}%</strong> phí đặt tủ &nbsp;|&nbsp;
                            Hủy dưới <strong>{refundCutoffHours || 0} giờ</strong>: Hoàn <strong>{refundRateLatePct || 0}%</strong> &nbsp;|&nbsp;
                            Quá <strong>{noShowWindowMinutes || 30} phút</strong> không nhận tủ: Tính <strong>No-Show</strong> &nbsp;|&nbsp;
                            Trễ quá <strong>{graceMinutes || 15} phút</strong>: Tính phí phạt quá hạn theo giờ.
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Bar with bottom feedback */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex-1 w-full">
                    {feedback && (
                        <div
                            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${
                                feedback.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                        >
                            {feedback.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>{feedback.message}</span>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer shrink-0"
                >
                    {isSaving ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Đang lưu cấu hình...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            <span>Lưu & Áp dụng Bảng giá + Chính sách Hoàn tiền (UC-A04)</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
