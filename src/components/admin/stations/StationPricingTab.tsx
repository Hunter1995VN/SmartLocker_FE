/**
 * AD-FE-03: UC-A04 — Manage Lockers & Pricing
 * Tab 3: Pricing Matrix & Pricing Policies Management.
 * Cho phép cấu hình giá thuê theo giờ, theo ngày, phụ phí quá hạn và thời gian ân hạn cho từng cỡ tủ S, M, L.
 */
import { useState } from 'react';
import { Tag, Save, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import adminStationService, {
    type StationAdminDetailDto,
} from '../../../api/adminStationService';

interface StationPricingTabProps {
    station: StationAdminDetailDto;
    onPricingUpdated: () => void;
}

export default function StationPricingTab({ station, onPricingUpdated }: StationPricingTabProps) {
    const [pricingMode, setPricingMode] = useState<'hourly' | 'daily'>('hourly');

    // Price state for S, M, L
    const [priceS, setPriceS] = useState<string>(String(station.priceS ?? 10000));
    const [priceM, setPriceM] = useState<string>(String(station.priceM ?? 15000));
    const [priceL, setPriceL] = useState<string>(String(station.priceL ?? 20000));

    // Policy parameters
    const [overdueFeeS, setOverdueFeeS] = useState<string>(String((station.priceS ?? 10000) * 1.5));
    const [overdueFeeM, setOverdueFeeM] = useState<string>(String((station.priceM ?? 15000) * 1.5));
    const [overdueFeeL, setOverdueFeeL] = useState<string>(String((station.priceL ?? 20000) * 1.5));

    const [graceMinutes, setGraceMinutes] = useState<string>('15');

    // UI states
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);



    const validate = () => {
        const errs: { [key: string]: string } = {};

        const numS = Number(priceS);
        if (isNaN(numS) || numS < 0) {
            errs.priceS = 'Giá cỡ S phải là số không âm';
        }

        const numM = Number(priceM);
        if (isNaN(numM) || numM < 0) {
            errs.priceM = 'Giá cỡ M phải là số không âm';
        }

        const numL = Number(priceL);
        if (isNaN(numL) || numL < 0) {
            errs.priceL = 'Giá cỡ L phải là số không âm';
        }

        const feeS = Number(overdueFeeS);
        if (isNaN(feeS) || feeS < 0) {
            errs.overdueFeeS = 'Phụ phí quá hạn phải là số >= 0';
        }

        const feeM = Number(overdueFeeM);
        if (isNaN(feeM) || feeM < 0) {
            errs.overdueFeeM = 'Phụ phí quá hạn phải là số >= 0';
        }

        const feeL = Number(overdueFeeL);
        if (isNaN(feeL) || feeL < 0) {
            errs.overdueFeeL = 'Phụ phí quá hạn phải là số >= 0';
        }

        const grace = Number(graceMinutes);
        if (isNaN(grace) || grace < 0) {
            errs.graceMinutes = 'Thời gian ân hạn phải là số phút >= 0';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSavePricing = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);

        if (!validate()) return;

        setIsSaving(true);
        try {
            const blockHours = pricingMode === 'hourly' ? 1 : 24;
            const grace = parseInt(graceMinutes, 10) || 15;

            // Update S, M, L in parallel
            await Promise.all([
                adminStationService.updatePricingPolicy(station.id, {
                    size: 'S',
                    pricePerBlock: Number(priceS),
                    blockHours,
                    overdueFeePerHour: Number(overdueFeeS),
                    gracePeriodMinutes: grace,
                }),
                adminStationService.updatePricingPolicy(station.id, {
                    size: 'M',
                    pricePerBlock: Number(priceM),
                    blockHours,
                    overdueFeePerHour: Number(overdueFeeM),
                    gracePeriodMinutes: grace,
                }),
                adminStationService.updatePricingPolicy(station.id, {
                    size: 'L',
                    pricePerBlock: Number(priceL),
                    blockHours,
                    overdueFeePerHour: Number(overdueFeeL),
                    gracePeriodMinutes: grace,
                }),
            ]);

            setFeedback({
                type: 'success',
                message: `Đã lưu thành công bảng giá (${pricingMode === 'hourly' ? 'Theo giờ' : 'Theo ngày'}) cho trạm!`,
            });
            onPricingUpdated();
        } catch {
            setFeedback({
                type: 'error',
                message: 'Có lỗi xảy ra khi lưu bảng giá. Vui lòng kiểm tra lại.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSavePricing} className="space-y-6">
            {feedback && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
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
                        <span>Chế độ định giá (Pricing Model)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Lựa chọn áp dụng đơn vị tính block thời gian thuê tủ
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
                            <th className="py-3 px-4">Phí quá hạn (VNĐ / giờ)</th>
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
                                            if (errors.priceS) setErrors(prev => ({ ...prev, priceS: '' }));
                                        }}
                                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 ${
                                            errors.priceS ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-200'
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
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                                {Number(priceS || 0).toLocaleString()} VNĐ / {pricingMode === 'hourly' ? 'giờ' : 'ngày'}
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
                                            if (errors.priceM) setErrors(prev => ({ ...prev, priceM: '' }));
                                        }}
                                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 ${
                                            errors.priceM ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-200'
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
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                                {Number(priceM || 0).toLocaleString()} VNĐ / {pricingMode === 'hourly' ? 'giờ' : 'ngày'}
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
                                            if (errors.priceL) setErrors(prev => ({ ...prev, priceL: '' }));
                                        }}
                                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 ${
                                            errors.priceL ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-200'
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
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-purple-600">
                                {Number(priceL || 0).toLocaleString()} VNĐ / {pricingMode === 'hourly' ? 'giờ' : 'ngày'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Additional Policy Configuration (Grace Period) */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h5 className="text-xs font-bold text-slate-800">
                        Thời gian ân hạn trễ giờ (Grace Period Minutes)
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Khoảng thời gian khách trễ giờ lấy đồ trước khi bắt đầu tính phụ phí quá hạn
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="0"
                        max="60"
                        value={graceMinutes}
                        onChange={(e) => setGraceMinutes(e.target.value)}
                        className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 text-center"
                    />
                    <span className="text-xs font-semibold text-slate-500">phút</span>
                </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
                >
                    {isSaving ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    <span>Lưu & Áp dụng Bảng giá</span>
                </button>
            </div>
        </form>
    );
}
