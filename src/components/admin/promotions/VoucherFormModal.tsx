/**
 * AD-FE-09: Modal Phát hành / Chỉnh sửa Mã Voucher & Hạn mức Ngân sách Mã (Tier-3 Budget Guardrail)
 */
import { useState, useEffect } from 'react';
import {
    X,
    Ticket,
    Sparkles,
    AlertTriangle,
    ShieldCheck,
    Calculator,
    RefreshCw,
} from 'lucide-react';
import type {
    PromotionCampaignDto,
    VoucherAdminDto,
    UpsertVoucherRequest,
    DiscountType,
} from '../../../api/adminPromotionService';

interface VoucherFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: UpsertVoucherRequest) => Promise<void>;
    editingVoucher: VoucherAdminDto | null;
    campaigns: PromotionCampaignDto[];
    minPayableAmountGuardrail: number;
}

const SIZES = ['S', 'M', 'L'] as const;

const formatVnd = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;

const toLocalDatetimeInput = (iso?: string) => {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function VoucherFormModal({
    isOpen,
    onClose,
    onSubmit,
    editingVoucher,
    campaigns,
    minPayableAmountGuardrail,
}: VoucherFormModalProps) {
    const [code, setCode] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [campaignId, setCampaignId] = useState('');
    const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState<number>(20);
    const [maxDiscountAmount, setMaxDiscountAmount] = useState<number>(25000);
    const [minOrderAmount, setMinOrderAmount] = useState<number>(20000);
    const [usageLimit, setUsageLimit] = useState<number>(200);
    const [perUserLimit, setPerUserLimit] = useState<number>(2);
    const [budgetCap, setBudgetCap] = useState<number>(2_500_000);
    const [applicableSizes, setApplicableSizes] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        if (editingVoucher) {
            setCode(editingVoucher.code);
            setTitle(editingVoucher.title);
            setDescription(editingVoucher.description || '');
            setCampaignId(editingVoucher.campaignId || campaigns[0]?.id || '');
            setDiscountType((editingVoucher.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE') as DiscountType);
            setDiscountValue(editingVoucher.discountValue);
            setMaxDiscountAmount(
                editingVoucher.maxDiscountAmount ??
                    (editingVoucher.discountType === 'FIXED' ? editingVoucher.discountValue : 25000)
            );
            setMinOrderAmount(editingVoucher.minOrderAmount);
            setUsageLimit(editingVoucher.usageLimit);
            setPerUserLimit(editingVoucher.perUserLimit || 2);
            setBudgetCap(editingVoucher.budgetCap);
            setApplicableSizes(editingVoucher.applicableSizes || []);
            setStartDate(toLocalDatetimeInput(editingVoucher.startDate));
            setEndDate(toLocalDatetimeInput(editingVoucher.endDate));
            setIsActive(editingVoucher.isActive);
            setReason('');
        } else {
            const defaultCampaign = campaigns.find((c) => c.status === 'ACTIVE') || campaigns[0];
            const now = new Date();
            const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            setCode(`SLMS${Math.floor(10 + Math.random() * 89)}K`);
            setTitle('');
            setDescription('');
            setCampaignId(defaultCampaign?.id || '');
            setDiscountType('PERCENTAGE');
            setDiscountValue(20);
            setMaxDiscountAmount(25000);
            setMinOrderAmount(20000);
            setUsageLimit(200);
            setPerUserLimit(2);
            setBudgetCap(2_500_000);
            setApplicableSizes([]);
            setStartDate(toLocalDatetimeInput(now.toISOString()));
            setEndDate(toLocalDatetimeInput(defaultCampaign?.endDate || nextMonth.toISOString()));
            setIsActive(true);
            setReason('Phát hành mã Voucher có kiểm soát trần ngân sách');
        }
    }, [isOpen, editingVoucher, campaigns]);

    if (!isOpen) return null;

    const selectedCampaign = campaigns.find((c) => c.id === campaignId);

    const generateVoucherCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let suffix = '';
        for (let i = 0; i < 4; i++) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const tag =
            discountType === 'PERCENTAGE'
                ? `SALE${Math.round(discountValue)}`
                : `GIAM${Math.round(discountValue / 1000)}K`;
        setCode(`${tag}${suffix}`.slice(0, 16));
    };

    const toggleSize = (sz: string) => {
        setApplicableSizes((prev) =>
            prev.includes(sz) ? prev.filter((item) => item !== sz) : [...prev, sz]
        );
    };

    const worstCaseLiability =
        discountType === 'FIXED'
            ? discountValue * usageLimit
            : (maxDiscountAmount || 0) * usageLimit;

    const applySmartBudgetCap = () => {
        // Đề xuất ngân sách an toàn = 60% nghĩa vụ tối đa lý thuyết, nhưng không vượt ngân sách chiến dịch
        const suggested = Math.max(
            discountType === 'FIXED' ? discountValue * 5 : (maxDiscountAmount || 10000) * 5,
            Math.round((worstCaseLiability * 0.6) / 10000) * 10000
        );
        if (selectedCampaign && suggested > selectedCampaign.allocatedBudget) {
            setBudgetCap(selectedCampaign.allocatedBudget);
        } else {
            setBudgetCap(suggested);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!code.trim() || code.trim().length < 3) {
            setError('Mã Voucher phải có tối thiểu 3 ký tự chữ/số.');
            return;
        }
        if (!title.trim()) {
            setError('Vui lòng nhập tên hiển thị ưu đãi của Voucher.');
            return;
        }
        if (discountType === 'PERCENTAGE') {
            if (discountValue < 1 || discountValue > 90) {
                setError('Mức chiết khấu phần trăm phải nằm trong khoảng 1% – 90%.');
                return;
            }
            if (!maxDiscountAmount || maxDiscountAmount < 1000) {
                setError(
                    'Voucher giảm theo % bắt buộc phải có Trần giảm tối đa (MaxDiscountAmount >= 1.000đ) để chống rủi ro đơn dài ngày.'
                );
                return;
            }
        } else {
            if (discountValue < 1000) {
                setError('Mức giảm tiền trực tiếp (FIXED) phải từ 1.000đ trở lên.');
                return;
            }
            if (minOrderAmount > 0 && minOrderAmount < discountValue + minPayableAmountGuardrail) {
                setError(
                    `Để tương thích cổng VietQR PayOS (tối thiểu ${formatVnd(
                        minPayableAmountGuardrail
                    )} sau giảm), Giá trị đơn tối thiểu nên từ ${formatVnd(
                        discountValue + minPayableAmountGuardrail
                    )} trở lên.`
                );
                return;
            }
        }

        if (selectedCampaign && budgetCap > selectedCampaign.allocatedBudget) {
            setError(
                `Hạn mức ngân sách mã (${formatVnd(
                    budgetCap
                )}) không được vượt quá tổng ngân sách phân bổ của chiến dịch "${selectedCampaign.name}" (${formatVnd(
                    selectedCampaign.allocatedBudget
                )}).`
            );
            return;
        }

        const startIso = new Date(startDate).toISOString();
        const endIso = new Date(endDate).toISOString();
        if (new Date(endIso) <= new Date(startIso)) {
            setError('Thời gian hết hạn Voucher phải sau thời gian bắt đầu hiệu lực.');
            return;
        }

        try {
            setSubmitting(true);
            await onSubmit({
                code: code.trim().toUpperCase(),
                title: title.trim(),
                description: description.trim() || undefined,
                campaignId: campaignId || undefined,
                discountType,
                discountValue: Number(discountValue),
                maxDiscountAmount:
                    discountType === 'FIXED' ? Number(discountValue) : Number(maxDiscountAmount),
                minOrderAmount: Number(minOrderAmount),
                usageLimit: Number(usageLimit),
                perUserLimit: Number(perUserLimit),
                budgetCap: Number(budgetCap),
                applicableSizes,
                applicableStationIds: editingVoucher?.applicableStationIds ?? [],
                startDate: startIso,
                endDate: endIso,
                isActive,
                reason: reason.trim() || undefined,
            });
            onClose();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            setError(axiosErr.response?.data?.message || axiosErr.message || 'Không thể lưu mã Voucher.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                            <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold tracking-tight">
                                {editingVoucher ? `Chỉnh sửa Mã Voucher: ${editingVoucher.code}` : 'Phát hành Mã Voucher Mới'}
                            </h3>
                            <p className="text-xs text-blue-100">
                                Tích hợp kiểm soát hạn mức sử dụng, trần giảm tối đa & bảo vệ số tiền thanh toán PayOS
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Row 1: Code + Campaign */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Mã Voucher (In hoa, không dấu) <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex gap-1.5">
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) =>
                                        setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
                                    }
                                    placeholder="VD: DANANG25K"
                                    maxLength={24}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none font-mono font-extrabold text-sm text-blue-700 uppercase tracking-wider"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={generateVoucherCode}
                                    title="Sinh mã ngẫu nhiên"
                                    className="px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1 font-semibold cursor-pointer"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Auto</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Thuộc Chiến dịch Khuyến mại <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={campaignId}
                                onChange={(e) => setCampaignId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-slate-800 font-semibold bg-white"
                            >
                                {campaigns.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} — Còn {formatVnd(c.remainingBudget)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Title & Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Tiêu đề hiển thị cho Khách hàng <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="VD: Giảm 20% tối đa 25K đơn gửi tủ thông minh"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-slate-800 font-medium"
                                required
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">Mô tả điều kiện ngắn</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="VD: Áp dụng mọi trạm tại Đà Nẵng cho đơn từ 20.000đ"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-slate-700"
                            />
                        </div>
                    </div>

                    {/* Row 3: Discount structure */}
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/70 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-800">Cấu trúc Chiết khấu & Điều kiện Đơn hàng</span>
                            <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDiscountType('PERCENTAGE');
                                        if (discountValue > 90) setDiscountValue(20);
                                        if (!maxDiscountAmount || maxDiscountAmount < 5000) setMaxDiscountAmount(25000);
                                    }}
                                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                                        discountType === 'PERCENTAGE'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Theo Phần trăm (%)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDiscountType('FIXED');
                                        if (discountValue < 1000) setDiscountValue(15000);
                                        setMinOrderAmount((prev) => Math.max(prev, 20000));
                                    }}
                                    className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                                        discountType === 'FIXED'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Số tiền cố định (VND)
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    {discountType === 'PERCENTAGE' ? 'Mức giảm (%)' : 'Số tiền giảm (VND)'}{' '}
                                    <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={discountType === 'PERCENTAGE' ? 1 : 1000}
                                    max={discountType === 'PERCENTAGE' ? 90 : 500000}
                                    step={discountType === 'PERCENTAGE' ? 1 : 1000}
                                    value={discountValue}
                                    onChange={(e) => {
                                        const val = Math.max(0, Number(e.target.value));
                                        setDiscountValue(val);
                                        if (discountType === 'FIXED') {
                                            setMaxDiscountAmount(val);
                                            if (minOrderAmount < val + minPayableAmountGuardrail) {
                                                setMinOrderAmount(val + Math.max(5000, minPayableAmountGuardrail));
                                            }
                                        }
                                    }}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-extrabold text-blue-700 focus:border-blue-500 focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Trần giảm tối đa / đơn (VND) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={1000}
                                    step={1000}
                                    disabled={discountType === 'FIXED'}
                                    value={discountType === 'FIXED' ? discountValue : maxDiscountAmount}
                                    onChange={(e) => setMaxDiscountAmount(Math.max(0, Number(e.target.value)))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100 font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Đơn thuê tối thiểu (VND) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    step={5000}
                                    value={minOrderAmount}
                                    onChange={(e) => setMinOrderAmount(Math.max(0, Number(e.target.value)))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Quotas & Individual Budget Cap */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                <span>Hạn ngạch Lượt dùng & Trần Ngân sách Riêng của Mã (Tier-3 Cap)</span>
                            </span>
                            <button
                                type="button"
                                onClick={applySmartBudgetCap}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                                <Calculator className="w-3.5 h-3.5" />
                                <span>Gợi ý ngân sách hợp lý</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Tổng lượt phát hành tối đa</label>
                                <input
                                    type="number"
                                    min={editingVoucher ? Math.max(1, editingVoucher.usedCount) : 1}
                                    step={10}
                                    value={usageLimit}
                                    onChange={(e) => setUsageLimit(Math.max(1, Number(e.target.value)))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Giới hạn lượt / 1 khách hàng</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={perUserLimit}
                                    onChange={(e) => setPerUserLimit(Math.max(1, Number(e.target.value)))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Trần ngân sách mã (VND) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={10000}
                                    step={50000}
                                    value={budgetCap}
                                    onChange={(e) => setBudgetCap(Math.max(0, Number(e.target.value)))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-extrabold text-emerald-700"
                                    required
                                />
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-500">
                            Nghĩa vụ chiết khấu tối đa lý thuyết ({usageLimit} lượt):{' '}
                            <strong className="text-slate-700">{formatVnd(worstCaseLiability)}</strong> · Hệ thống sẽ tự
                            động khóa mã ngay khi giải ngân chạm mốc{' '}
                            <strong className="text-emerald-700">{formatVnd(budgetCap)}</strong> hoặc hết lượt.
                        </p>
                    </div>

                    {/* Row 5: Applicable Locker Sizes & Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">Kích cỡ ngăn tủ áp dụng</label>
                            <div className="flex items-center gap-1.5">
                                {SIZES.map((sz) => {
                                    const active = applicableSizes.includes(sz);
                                    return (
                                        <button
                                            key={sz}
                                            type="button"
                                            onClick={() => toggleSize(sz)}
                                            className={`flex-1 py-2 rounded-xl font-bold border transition cursor-pointer ${
                                                active
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            Size {sz}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                                {applicableSizes.length === 0
                                    ? 'Đang áp dụng cho tất cả kích cỡ (S, M, L)'
                                    : `Chỉ áp dụng cho ngăn cỡ: ${applicableSizes.join(', ')}`}
                            </p>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1">Hiệu lực từ</label>
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1">Hết hạn lúc</label>
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800"
                                required
                            />
                        </div>
                    </div>

                    {/* Active & Reason */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
                        <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="accent-blue-600"
                            />
                            <span className="font-bold text-slate-800">Kích hoạt mở cho khách dùng ngay</span>
                        </label>

                        <div className="sm:col-span-2">
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ghi chú Audit Log (tùy chọn)..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-700"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                        >
                            Đóng
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold shadow-sm shadow-blue-600/25 flex items-center gap-2 transition cursor-pointer"
                        >
                            {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>{editingVoucher ? 'Cập nhật Mã Voucher' : 'Phát hành Mã Voucher'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
