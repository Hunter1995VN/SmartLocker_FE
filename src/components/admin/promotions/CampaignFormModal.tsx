/**
 * AD-FE-09: Modal Thiết lập / Cập nhật Chiến dịch Khuyến mại & Phân bổ Ngân sách Chiết khấu
 */
import { useState, useEffect } from 'react';
import {
    X,
    Megaphone,
    Sparkles,
    ShieldCheck,
    AlertTriangle,
    Calendar,
    Wallet,
    RefreshCw,
} from 'lucide-react';
import type {
    PromotionCampaignDto,
    UpsertPromotionCampaignRequest,
    CampaignCategory,
} from '../../../api/adminPromotionService';

interface CampaignFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: UpsertPromotionCampaignRequest) => Promise<void>;
    editingCampaign: PromotionCampaignDto | null;
    globalBudgetRemaining: number;
}

const CATEGORIES: { value: CampaignCategory; label: string; desc: string }[] = [
    { value: 'NEW_USER', label: 'Khách hàng mới', desc: 'Thu hút người thuê tủ lần đầu' },
    { value: 'SEASONAL', label: 'Mùa du lịch / Lễ hội', desc: 'Cao điểm du lịch Đà Nẵng / Hội An' },
    { value: 'LONG_STAY', label: 'Gửi dài hạn (24h–72h)', desc: 'Kích cầu đơn gửi hành lý dài ngày' },
    { value: 'PARTNER', label: 'Đối tác / Sự kiện', desc: 'Liên kết khách sạn, sân bay, trường ĐH' },
    { value: 'FLASH_SALE', label: 'Flash Sale khung giờ', desc: 'Tăng tỷ lệ lấp đầy giờ thấp điểm' },
];

const BUDGET_PRESETS = [2_000_000, 5_000_000, 10_000_000, 20_000_000];

const formatVnd = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;

const toLocalDatetimeInput = (iso?: string) => {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function CampaignFormModal({
    isOpen,
    onClose,
    onSubmit,
    editingCampaign,
    globalBudgetRemaining,
}: CampaignFormModalProps) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [category, setCategory] = useState<string>('SEASONAL');
    const [allocatedBudget, setAllocatedBudget] = useState<number>(5_000_000);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [isPaused, setIsPaused] = useState(false);
    const [autoPauseWhenDepleted, setAutoPauseWhenDepleted] = useState(true);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        if (editingCampaign) {
            setName(editingCampaign.name);
            setCode(editingCampaign.code);
            setCategory(editingCampaign.category || 'SEASONAL');
            setAllocatedBudget(editingCampaign.allocatedBudget);
            setStartDate(toLocalDatetimeInput(editingCampaign.startDate));
            setEndDate(toLocalDatetimeInput(editingCampaign.endDate));
            setDescription(editingCampaign.description || '');
            setIsPaused(editingCampaign.isPaused);
            setAutoPauseWhenDepleted(editingCampaign.autoPauseWhenDepleted);
            setReason('');
        } else {
            const now = new Date();
            const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            setName('');
            setCode(`CMP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`);
            setCategory('SEASONAL');
            setAllocatedBudget(5_000_000);
            setStartDate(toLocalDatetimeInput(now.toISOString()));
            setEndDate(toLocalDatetimeInput(nextMonth.toISOString()));
            setDescription('');
            setIsPaused(false);
            setAutoPauseWhenDepleted(true);
            setReason('Khởi tạo chiến dịch kích cầu & phân bổ ngân sách chiết khấu');
        }
    }, [isOpen, editingCampaign]);

    if (!isOpen) return null;

    const generateRandomCode = () => {
        const prefix = category === 'NEW_USER' ? 'WELCOME' : category === 'FLASH_SALE' ? 'FLASH' : 'PROMO';
        setCode(`CMP-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Vui lòng nhập tên chiến dịch khuyến mại.');
            return;
        }
        if (!code.trim()) {
            setError('Vui lòng nhập mã định danh chiến dịch.');
            return;
        }
        if (allocatedBudget < 50_000) {
            setError('Ngân sách phân bổ tối thiểu cho chiến dịch là 50.000đ.');
            return;
        }
        if (editingCampaign && allocatedBudget < editingCampaign.spentBudget) {
            setError(
                `Ngân sách mới (${formatVnd(allocatedBudget)}) không được thấp hơn số tiền đã giải ngân (${formatVnd(
                    editingCampaign.spentBudget
                )}).`
            );
            return;
        }

        const startIso = new Date(startDate).toISOString();
        const endIso = new Date(endDate).toISOString();
        if (new Date(endIso) <= new Date(startIso)) {
            setError('Thời điểm kết thúc chiến dịch phải lớn hơn thời điểm bắt đầu.');
            return;
        }

        try {
            setSubmitting(true);
            await onSubmit({
                code: code.trim().toUpperCase(),
                name: name.trim(),
                description: description.trim(),
                category,
                allocatedBudget: Number(allocatedBudget),
                startDate: startIso,
                endDate: endIso,
                isPaused,
                autoPauseWhenDepleted,
                reason: reason.trim() || undefined,
            });
            onClose();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            setError(axiosErr.response?.data?.message || axiosErr.message || 'Không thể lưu chiến dịch khuyến mại.');
        } finally {
            setSubmitting(false);
        }
    };

    const exceedsRemainingGlobal =
        !editingCampaign && globalBudgetRemaining > 0 && allocatedBudget > globalBudgetRemaining;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold tracking-tight">
                                {editingCampaign
                                    ? 'Cập nhật Chiến dịch & Ngân sách Khuyến mại'
                                    : 'Thiết lập Chiến dịch Khuyến mại Mới'}
                            </h3>
                            <p className="text-xs text-indigo-100">
                                Kiểm soát hạn mức ngân sách Tầng 2 (Campaign Cap) & tự động ngắt khi chạm trần
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

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div className="sm:col-span-2">
                            <label className="block font-bold text-slate-700 mb-1">
                                Tên chiến dịch khuyến mại <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="VD: Kích cầu Du lịch Hè Đà Nẵng 2026"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-slate-800 font-medium"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Mã chiến dịch <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex gap-1.5">
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="CMP-2026-01"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none font-mono font-bold text-slate-800 uppercase"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={generateRandomCode}
                                    title="Sinh mã tự động"
                                    className="px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block font-bold text-slate-700 mb-1.5">Nhóm mục tiêu chiến dịch</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {CATEGORIES.map((c) => {
                                const selected = category === c.value;
                                return (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setCategory(c.value)}
                                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                                            selected
                                                ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600/20'
                                                : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <p className={`font-bold ${selected ? 'text-blue-700' : 'text-slate-800'}`}>
                                            {c.label}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{c.desc}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Budget allocation */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Wallet className="w-4 h-4 text-blue-600" />
                                <span>Hạn mức Ngân sách Chiết khấu Phân bổ (VND)</span>
                            </label>
                            <span className="text-[11px] font-semibold text-slate-500">
                                Dư địa trần tháng còn:{' '}
                                <strong className="text-emerald-600">{formatVnd(globalBudgetRemaining)}</strong>
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                            <input
                                type="number"
                                min={50000}
                                step={100000}
                                value={allocatedBudget}
                                onChange={(e) => setAllocatedBudget(Math.max(0, Number(e.target.value)))}
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white font-extrabold text-sm text-blue-700 focus:border-blue-500 focus:outline-none"
                                required
                            />
                            <div className="flex flex-wrap gap-1.5">
                                {BUDGET_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setAllocatedBudget(preset)}
                                        className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] border transition cursor-pointer ${
                                            allocatedBudget === preset
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {preset / 1_000_000}M
                                    </button>
                                ))}
                            </div>
                        </div>

                        {editingCampaign && (
                            <p className="text-[11px] text-slate-500">
                                Đã giải ngân thực tế:{' '}
                                <strong className="text-slate-800">{formatVnd(editingCampaign.spentBudget)}</strong> ·
                                Khả dụng sau cập nhật:{' '}
                                <strong className="text-emerald-600">
                                    {formatVnd(Math.max(0, allocatedBudget - editingCampaign.spentBudget))}
                                </strong>
                            </p>
                        )}

                        {exceedsRemainingGlobal && (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                                <span>
                                    Ngân sách chiến dịch đang lớn hơn phần dư ngân sách toàn cục tháng hiện tại (
                                    {formatVnd(globalBudgetRemaining)}). Hệ thống vẫn cho phép tạo cho lộ trình nhiều
                                    tháng, nhưng trần toàn cục tháng sẽ ưu tiên chặn nếu vượt ngưỡng!
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Thời điểm bắt đầu</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-slate-800"
                                required
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Thời điểm kết thúc</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-slate-800"
                                required
                            />
                        </div>
                    </div>

                    {/* Description & Reason */}
                    <div>
                        <label className="block font-bold text-slate-700 mb-1">Mô tả & thể lệ chiến dịch</label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ghi chú phạm vi áp dụng, đối tượng ưu đãi hoặc KPI kỳ vọng..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-slate-800"
                        />
                    </div>

                    {/* Guardrail switches */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoPauseWhenDepleted}
                                onChange={(e) => setAutoPauseWhenDepleted(e.target.checked)}
                                className="mt-0.5 accent-emerald-600"
                            />
                            <div>
                                <p className="font-bold text-emerald-900 flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    Tự động ngắt khi cạn ngân sách
                                </p>
                                <p className="text-[11px] text-emerald-700">
                                    Chặn phát sinh giảm giá vượt trần {formatVnd(allocatedBudget)}
                                </p>
                            </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isPaused}
                                onChange={(e) => setIsPaused(e.target.checked)}
                                className="mt-0.5 accent-amber-600"
                            />
                            <div>
                                <p className="font-bold text-slate-800">Khởi tạo ở trạng thái Tạm dừng</p>
                                <p className="text-[11px] text-slate-500">
                                    Chuẩn bị sẵn mã voucher trước khi mở công khai cho khách
                                </p>
                            </div>
                        </label>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 mb-1">Ghi chú Audit Log</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Lý do phê duyệt ngân sách / điều chỉnh chiến dịch..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-slate-700"
                        />
                    </div>

                    {/* Footer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold shadow-sm shadow-blue-600/25 flex items-center gap-2 transition cursor-pointer"
                        >
                            {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>{editingCampaign ? 'Lưu cập nhật Chiến dịch' : 'Phê duyệt & Tạo Chiến dịch'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
