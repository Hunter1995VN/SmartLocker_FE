/**
 * AD-FE-11: Modal Lập Đề xuất Lệnh Hoàn tiền Thủ công (Trường hợp Ngoại lệ)
 * Cho phép STAFF / ADMIN chọn giao dịch PAID, kiểm tra hạn mức hoàn còn lại (chống hoàn lố),
 * đính kèm biên bản sự cố hiện trường & thông tin tài khoản nhận hoàn tiền của khách.
 */
import { useState, useEffect, useMemo } from 'react';
import {
    X,
    RotateCcw,
    Search,
    AlertTriangle,
    ShieldCheck,
    Landmark,
    Wrench,
    RefreshCw,
    Zap,
} from 'lucide-react';
import type {
    RefundablePaymentCandidateDto,
    CreateManualRefundRequest,
    ExceptionRefundCategory,
} from '../../../api/adminManualRefundService';

interface CreateManualRefundModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateManualRefundRequest) => Promise<void>;
    candidates: RefundablePaymentCandidateDto[];
    preselectedCandidate: RefundablePaymentCandidateDto | null;
    isAdmin: boolean;
}

const EXCEPTION_CATEGORIES: {
    value: ExceptionRefundCategory;
    label: string;
    desc: string;
    defaultRate: number;
}[] = [
    {
        value: 'HARDWARE_LOCK_JAM',
        label: 'Sự cố phần cứng / Kẹt chốt IoT',
        desc: 'Chốt điện từ không bung hoặc cảm biến cửa lỗi sau khi khách đã thanh toán',
        defaultRate: 1.0,
    },
    {
        value: 'STATION_OUTAGE',
        label: 'Mất điện / Mất kết nối trạm',
        desc: 'Trạm tủ mất nguồn hoặc bảo trì đột xuất khiến khách không sử dụng được',
        defaultRate: 1.0,
    },
    {
        value: 'DUPLICATE_OR_OVERCHARGE',
        label: 'Thu trùng giao dịch / Lệch phụ phí',
        desc: 'Khách quét chuyển khoản trùng hoặc tính dư phí quá hạn do trễ đồng bộ',
        defaultRate: 1.0,
    },
    {
        value: 'FORCE_MAJEURE_COMPLAINT',
        label: 'Bất khả kháng / Hỗ trợ thiện chí CSKH',
        desc: 'Hoãn hủy chuyến bay, sự cố y tế hoặc hỗ trợ đặc biệt ngoài giờ cắt tự động',
        defaultRate: 0.75,
    },
];

const POPULAR_BANKS = [
    'Vietcombank (VCB)',
    'MB Bank (MB)',
    'Techcombank (TCB)',
    'BIDV',
    'VietinBank (CTG)',
    'ACB',
    'TPBank',
    'VPBank',
];

const formatVnd = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;

export default function CreateManualRefundModal({
    isOpen,
    onClose,
    onSubmit,
    candidates,
    preselectedCandidate,
    isAdmin,
}: CreateManualRefundModalProps) {
    const [searchKw, setSearchKw] = useState('');
    const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
    const [category, setCategory] = useState<ExceptionRefundCategory>('HARDWARE_LOCK_JAM');
    const [requestedAmount, setRequestedAmount] = useState<number>(0);
    const [reasonSummary, setReasonSummary] = useState('');
    const [evidenceNote, setEvidenceNote] = useState('');
    const [relatedIncidentCode, setRelatedIncidentCode] = useState('');
    const [refundMethod, setRefundMethod] = useState('BANK_NAPAS247');
    const [bankName, setBankName] = useState('Vietcombank (VCB)');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountHolder, setBankAccountHolder] = useState('');
    const [cancelBookingAndReleaseLocker, setCancelBookingAndReleaseLocker] = useState(false);
    const [waiveRelatedOverdueDebt, setWaiveRelatedOverdueDebt] = useState(false);
    const [autoApproveAndDisburseNow, setAutoApproveAndDisburseNow] = useState(false);
    const [gatewayTransferRef, setGatewayTransferRef] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const eligibleList = useMemo(() => {
        const kw = searchKw.trim().toLowerCase();
        return candidates.filter((c) => {
            if (!kw) return true;
            return (
                c.orderCode.toLowerCase().includes(kw) ||
                c.bookingCode.toLowerCase().includes(kw) ||
                c.customerName.toLowerCase().includes(kw) ||
                c.customerEmail.toLowerCase().includes(kw) ||
                c.stationName.toLowerCase().includes(kw)
            );
        });
    }, [candidates, searchKw]);

    const selectedCandidate = useMemo(
        () => candidates.find((c) => c.paymentId === selectedPaymentId) || null,
        [candidates, selectedPaymentId]
    );

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        setSearchKw('');
        const target =
            preselectedCandidate ||
            candidates.find((c) => c.maxRefundableRemaining > 0) ||
            candidates[0] ||
            null;

        if (target) {
            setSelectedPaymentId(target.paymentId);
            setRequestedAmount(target.maxRefundableRemaining);
            setRelatedIncidentCode(target.suggestedIncidentCode || '');
            setBankAccountHolder((target.customerName || '').toUpperCase());
            setCancelBookingAndReleaseLocker(
                target.bookingStatus === 'CONFIRMED' || target.bookingStatus === 'STORED'
            );
            setWaiveRelatedOverdueDebt(target.customerOverdueDebt > 0);
        } else {
            setSelectedPaymentId('');
            setRequestedAmount(0);
            setRelatedIncidentCode('');
            setBankAccountHolder('');
            setCancelBookingAndReleaseLocker(false);
            setWaiveRelatedOverdueDebt(false);
        }
        setCategory('HARDWARE_LOCK_JAM');
        setReasonSummary('');
        setEvidenceNote('');
        setRefundMethod('BANK_NAPAS247');
        setBankName('Vietcombank (VCB)');
        setBankAccountNumber('');
        setAutoApproveAndDisburseNow(false);
        setGatewayTransferRef('');
    }, [isOpen, preselectedCandidate, candidates]);

    if (!isOpen) return null;

    const handleSelectCandidate = (c: RefundablePaymentCandidateDto) => {
        setSelectedPaymentId(c.paymentId);
        setRequestedAmount(c.maxRefundableRemaining);
        setRelatedIncidentCode(c.suggestedIncidentCode || '');
        setBankAccountHolder((c.customerName || '').toUpperCase());
        setCancelBookingAndReleaseLocker(
            c.bookingStatus === 'CONFIRMED' || c.bookingStatus === 'STORED'
        );
        setWaiveRelatedOverdueDebt(c.customerOverdueDebt > 0);
    };

    const applyPercentPreset = (pct: number) => {
        if (!selectedCandidate) return;
        const calc = Math.round((selectedCandidate.maxRefundableRemaining * pct) / 1000) * 1000;
        setRequestedAmount(Math.min(selectedCandidate.maxRefundableRemaining, Math.max(1000, calc)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedCandidate) {
            setError('Vui lòng chọn 1 giao dịch đã thu tiền (PAID) cần lập lệnh hoàn tiền.');
            return;
        }
        if (selectedCandidate.maxRefundableRemaining <= 0) {
            setError('Giao dịch này đã hết hạn mức được phép hoàn tiền.');
            return;
        }
        if (requestedAmount < 1000 || requestedAmount > selectedCandidate.maxRefundableRemaining) {
            setError(
                `Số tiền đề xuất hoàn phải từ 1.000đ đến tối đa ${formatVnd(
                    selectedCandidate.maxRefundableRemaining
                )}.`
            );
            return;
        }
        if (reasonSummary.trim().length < 8) {
            setError('Vui lòng nhập lý do ngoại lệ chi tiết (tối thiểu 8 ký tự) để phục vụ hậu kiểm Audit.');
            return;
        }
        if (refundMethod === 'BANK_NAPAS247' && !bankAccountNumber.trim()) {
            setError('Vui lòng nhập Số tài khoản ngân hàng nhận hoàn tiền của khách hàng.');
            return;
        }

        try {
            setSubmitting(true);
            await onSubmit({
                paymentId: selectedCandidate.paymentId,
                exceptionCategory: category,
                requestedAmount: Number(requestedAmount),
                reasonSummary: reasonSummary.trim(),
                evidenceNote: evidenceNote.trim() || undefined,
                relatedIncidentCode: relatedIncidentCode.trim() || undefined,
                refundMethod,
                bankName: bankName.trim() || undefined,
                bankAccountNumber: bankAccountNumber.trim() || undefined,
                bankAccountHolder: bankAccountHolder.trim() || undefined,
                cancelBookingAndReleaseLocker,
                waiveRelatedOverdueDebt,
                autoApproveAndDisburseNow: isAdmin && autoApproveAndDisburseNow,
                gatewayTransferRef: gatewayTransferRef.trim() || undefined,
            });
            onClose();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            setError(
                axiosErr.response?.data?.message ||
                    axiosErr.message ||
                    'Không thể tạo lệnh đề xuất hoàn tiền.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-purple-700 to-indigo-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                            <RotateCcw className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold tracking-tight">
                                Lập Lệnh Đề Xuất Hoàn Tiền Thủ Công (Ngoại Lệ)
                            </h3>
                            <p className="text-xs text-purple-100">
                                Kiểm soát chống hoàn lố so với thực thu PayOS · Lưu vết 2 cấp Staff đề xuất → Admin phê
                                duyệt
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

                    {/* Step 1: Select PAID Transaction */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="font-extrabold text-slate-800">
                                1. Chọn giao dịch gốc đã thanh toán (PAID) <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchKw}
                                    onChange={(e) => setSearchKw(e.target.value)}
                                    placeholder="Lọc mã BK-..., OrderCode, tên khách..."
                                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <select
                            value={selectedPaymentId}
                            onChange={(e) => {
                                const found = candidates.find((c) => c.paymentId === e.target.value);
                                if (found) handleSelectCandidate(found);
                            }}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:border-purple-600 focus:outline-none"
                        >
                            {eligibleList.length === 0 ? (
                                <option value="">-- Không tìm thấy giao dịch PAID phù hợp --</option>
                            ) : (
                                eligibleList.map((c) => (
                                    <option key={c.paymentId} value={c.paymentId}>
                                        [{c.bookingCode}] Order #{c.orderCode} ({c.paymentKind}) — {c.customerName} —
                                        Đã thu {formatVnd(c.paidAmount)} (Còn hoàn được:{' '}
                                        {formatVnd(c.maxRefundableRemaining)})
                                    </option>
                                ))
                            )}
                        </select>

                        {selectedCandidate && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Thực thu gốc</p>
                                    <p className="text-sm font-extrabold text-slate-900">
                                        {formatVnd(selectedCandidate.paidAmount)}
                                    </p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Đã hoàn / Chờ duyệt</p>
                                    <p className="text-sm font-extrabold text-amber-600">
                                        {formatVnd(
                                            selectedCandidate.alreadyRefundedAmount +
                                                selectedCandidate.pendingRefundRequestedAmount
                                        )}
                                    </p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                                    <p className="text-[10px] text-emerald-700 uppercase font-bold">
                                        Trần hoàn tối đa còn
                                    </p>
                                    <p className="text-sm font-extrabold text-emerald-700">
                                        {formatVnd(selectedCandidate.maxRefundableRemaining)}
                                    </p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Trạng thái đơn</p>
                                    <p className="text-xs font-extrabold text-blue-700 truncate">
                                        {selectedCandidate.bookingStatus}{' '}
                                        {selectedCandidate.lockerCode ? `· Ô ${selectedCandidate.lockerCode}` : ''}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Exception Category */}
                    <div>
                        <label className="block font-extrabold text-slate-800 mb-1.5">
                            2. Phân loại Trường hợp Ngoại lệ <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {EXCEPTION_CATEGORIES.map((cat) => {
                                const active = category === cat.value;
                                return (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => {
                                            setCategory(cat.value);
                                            applyPercentPreset(cat.defaultRate);
                                        }}
                                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                                            active
                                                ? 'border-purple-600 bg-purple-50/70 ring-1 ring-purple-600/20'
                                                : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <p className={`font-bold ${active ? 'text-purple-800' : 'text-slate-800'}`}>
                                            {cat.label}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{cat.desc}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 3: Requested Refund Amount + Incident Ref */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="font-bold text-slate-700">
                                    Số tiền đề xuất hoàn (VND) <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex gap-1">
                                    {[
                                        { label: '100%', pct: 1 },
                                        { label: '75%', pct: 0.75 },
                                        { label: '50%', pct: 0.5 },
                                    ].map((btn) => (
                                        <button
                                            key={btn.label}
                                            type="button"
                                            onClick={() => applyPercentPreset(btn.pct)}
                                            className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-extrabold cursor-pointer"
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input
                                type="number"
                                min={1000}
                                max={selectedCandidate?.maxRefundableRemaining || 10000000}
                                step={1000}
                                value={requestedAmount}
                                onChange={(e) => setRequestedAmount(Math.max(0, Number(e.target.value)))}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-extrabold text-sm text-purple-700 focus:border-purple-600 focus:outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                                <span>Mã biên bản sự cố IoT liên quan (nếu có)</span>
                            </label>
                            <input
                                type="text"
                                value={relatedIncidentCode}
                                onChange={(e) => setRelatedIncidentCode(e.target.value.toUpperCase())}
                                placeholder="VD: INC-20261029-104"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 uppercase focus:border-purple-600 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Step 4: Reason & Field Evidence */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Tóm tắt lý do hoàn tiền ngoại lệ <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                rows={2}
                                value={reasonSummary}
                                onChange={(e) => setReasonSummary(e.target.value)}
                                placeholder="VD: Khách đã quét VietQR thành công nhưng chốt điện từ ngăn M02 bị kẹt cơ học, không thể gửi đồ..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:border-purple-600 focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Ghi chú bằng chứng xác minh / Log MQTT / Ảnh
                            </label>
                            <textarea
                                rows={2}
                                value={evidenceNote}
                                onChange={(e) => setEvidenceNote(e.target.value)}
                                placeholder="VD: Đã kiểm tra camera trạm lúc 14:25 & log cảm biến Reed Switch báo DOOR_STUCK..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-700 focus:border-purple-600 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Step 5: Customer Bank Payout Info */}
                    <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/70 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                <Landmark className="w-4 h-4 text-blue-600" />
                                <span>3. Kênh Hoàn tiền & Tài khoản Thụ hưởng của Khách hàng</span>
                            </span>
                            <select
                                value={refundMethod}
                                onChange={(e) => setRefundMethod(e.target.value)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700"
                            >
                                <option value="BANK_NAPAS247">Chuyển khoản nhanh Napas247</option>
                                <option value="PAYOS_REVERSAL">Hoàn trả qua đối soát PayOS</option>
                            </select>
                        </div>

                        {refundMethod === 'BANK_NAPAS247' && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Ngân hàng nhận</label>
                                    <select
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                                    >
                                        {POPULAR_BANKS.map((b) => (
                                            <option key={b} value={b}>
                                                {b}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Số tài khoản <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={bankAccountNumber}
                                        onChange={(e) => setBankAccountNumber(e.target.value)}
                                        placeholder="VD: 1029384756"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Tên chủ tài khoản</label>
                                    <input
                                        type="text"
                                        value={bankAccountHolder}
                                        onChange={(e) => setBankAccountHolder(e.target.value.toUpperCase())}
                                        placeholder="NGUYEN VAN A"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 uppercase"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 6: Operational Side-Effects & Admin Direct Override */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={cancelBookingAndReleaseLocker}
                                onChange={(e) => setCancelBookingAndReleaseLocker(e.target.checked)}
                                className="mt-0.5 accent-purple-600"
                            />
                            <div>
                                <p className="font-bold text-slate-800">
                                    Đồng thời Hủy đơn & Xử lý trạng thái Ngăn tủ khi duyệt
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    Tự động chuyển ngăn lỗi sang MAINTENANCE (nếu kẹt khóa) hoặc mở lại AVAILABLE
                                </p>
                            </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={waiveRelatedOverdueDebt}
                                onChange={(e) => setWaiveRelatedOverdueDebt(e.target.checked)}
                                className="mt-0.5 accent-emerald-600"
                            />
                            <div>
                                <p className="font-bold text-slate-800 flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    Miễn trừ dư nợ quá hạn phát sinh do sự cố kỹ thuật
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    Xóa nợ quá hạn bị tính oan khi khách không mở được tủ đúng hạn
                                </p>
                            </div>
                        </label>
                    </div>

                    {isAdmin && (
                        <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-2.5">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoApproveAndDisburseNow}
                                    onChange={(e) => setAutoApproveAndDisburseNow(e.target.checked)}
                                    className="accent-amber-600"
                                />
                                <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                                    Quyền Admin: Phê duyệt & Ghi sổ Đã Giải ngân Ngay lập tức
                                </span>
                            </label>
                            {autoApproveAndDisburseNow && (
                                <input
                                    type="text"
                                    value={gatewayTransferRef}
                                    onChange={(e) => setGatewayTransferRef(e.target.value.toUpperCase())}
                                    placeholder="Nhập mã bút toán chuyển khoản NH (VD: FT2630299123 — để trống hệ thống tự sinh mã nội bộ)"
                                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono font-bold text-slate-800"
                                />
                            )}
                        </div>
                    )}

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
                            disabled={submitting || !selectedCandidate}
                            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold shadow-sm shadow-purple-600/25 flex items-center gap-2 transition cursor-pointer"
                        >
                            {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>
                                {isAdmin && autoApproveAndDisburseNow
                                    ? 'Phê duyệt & Hạch toán Hoàn tiền Ngay'
                                    : 'Gửi Lệnh Chờ Admin Phê Duyệt'}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
