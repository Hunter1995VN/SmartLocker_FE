/**
 * AD-FE-07: UC-S10 (UC-A09, S-03) — Staff Inspection Form (Mắt 1)
 *
 * Staff lập biên bản niêm phong đồ quá hạn 72h:
 *  - Hỗ trợ chọn nhanh từ danh sách đơn đặt quá hạn 72h (getOverdueCandidates) hoặc nhập thủ công
 *  - Hỗ trợ thêm nhiều item tài sản (Danh mục, Mô tả, Số lượng, Tình trạng, Ghi chú)
 *  - Tải lên ảnh bằng chứng thực tế từ máy / camera (DataURL base64) hoặc nhập URL
 *  - Mã tem niêm phong vật lý (Seal Barcode)
 *  - Tải trọng cân thực địa tại trạm (kg)
 *  - Ghi chú tình trạng tổng quan & Cam kết an toàn
 *  - Submit → POST /api/admin/abandoned-properties
 */
import { useState, useEffect, useRef } from 'react';
import {
    Package,
    X,
    Send,
    AlertTriangle,
    CheckCircle2,
    Box,
    Plus,
    Trash2,
    Edit2,
    Shield,
    Camera,
    Upload,
    RefreshCw,
} from 'lucide-react';
import abandonedPropertyService, {
    type CreateAbandonedPropertyRequest,
    type AbandonedPropertyRecordDto,
    type OverdueBookingCandidateDto,
} from '../../../api/abandonedPropertyService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryItem {
    id: string;
    category: string;
    description: string;
    quantity: number;
    condition: string;
    note: string;
}

export const ITEM_CATEGORIES = [
    'Balo / Vali du lịch',
    'Đồ điện tử (Laptop/Tablet/Phone)',
    'Tài liệu / Giấy tờ',
    'Quần áo / Đồ dùng cá nhân',
    'Tài sản có giá trị (Tiền/Trang sức/Đồng hồ)',
    'Khác',
];

export const ITEM_CONDITIONS = [
    'Nguyên vẹn / Còn mới',
    'Đã qua sử dụng (Tốt)',
    'Cũ / Có vết trầy xước',
    'Hư hỏng / Rách',
    'Cần bảo quản đặc biệt',
];

interface InspectionFormProps {
    prefill?: {
        bookingId?: string;
        bookingCode?: string;
        lockerId?: string;
        lockerCode?: string;
        stationId?: string;
        stationName?: string;
        overdueHours?: number;
    };
    onSubmitted: (record: AbandonedPropertyRecordDto) => void;
    onCancel: () => void;
}

interface FormFields {
    bookingId: string;
    lockerId: string;
    stationId: string;
    overdueHours: string;
    sealCode: string;
    measuredWeight: string;
    safetyVerified: boolean;
    generalCondition: string;
    notes: string;
}

type SubmitPhase = 'idle' | 'confirm' | 'submitting' | 'success' | 'error';

export default function InspectionForm({ prefill, onSubmitted, onCancel }: InspectionFormProps) {
    const [fields, setFields] = useState<FormFields>({
        bookingId: prefill?.bookingId ?? '',
        lockerId: prefill?.lockerId ?? '',
        stationId: prefill?.stationId ?? '',
        overdueHours: prefill?.overdueHours ? String(prefill.overdueHours) : '72',
        sealCode: `SL-SEAL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        measuredWeight: '',
        safetyVerified: true,
        generalCondition: '',
        notes: '',
    });

    // Overdue booking candidates from Backend (UC-S10)
    const [candidates, setCandidates] = useState<OverdueBookingCandidateDto[]>([]);
    const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
    const [candidateHint, setCandidateHint] = useState<{
        bookingCode?: string;
        lockerCode?: string;
        stationName?: string;
        customerName?: string | null;
    }>({
        bookingCode: prefill?.bookingCode,
        lockerCode: prefill?.lockerCode,
        stationName: prefill?.stationName,
    });

    useEffect(() => {
        let mounted = true;
        setIsLoadingCandidates(true);
        abandonedPropertyService
            .getOverdueCandidates()
            .then((res) => {
                if (mounted && res.success && Array.isArray(res.data)) {
                    setCandidates(res.data);
                }
            })
            .catch(() => {
                // Keep manual fallback if endpoint fails
            })
            .finally(() => {
                if (mounted) setIsLoadingCandidates(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const handleSelectCandidate = (bookingId: string) => {
        setSelectedCandidateId(bookingId);
        const found = candidates.find((c) => c.bookingId === bookingId);
        if (found) {
            setFields((prev) => ({
                ...prev,
                bookingId: found.bookingId,
                lockerId: found.lockerId,
                stationId: found.stationId,
                overdueHours: String(Math.max(72, found.overdueHours || 72)),
            }));
            setCandidateHint({
                bookingCode: found.bookingCode,
                lockerCode: found.lockerCode,
                stationName: found.stationName,
                customerName: found.customerName,
            });
        }
    };

    const [items, setItems] = useState<InventoryItem[]>([]);

    // Evidence Photo Upload (Real files & URL)
    const [photoUrls, setPhotoUrls] = useState<string[]>([]);
    const [newPhotoUrl, setNewPhotoUrl] = useState<string>('');
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [isReadingPhoto, setIsReadingPhoto] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Editing item state
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [itemInput, setItemInput] = useState<Omit<InventoryItem, 'id'>>({
        category: ITEM_CATEGORIES[0],
        description: '',
        quantity: 1,
        condition: ITEM_CONDITIONS[0],
        note: '',
    });

    const [errors, setErrors] = useState<Partial<Record<keyof FormFields, string>>>({});
    const [itemError, setItemError] = useState<string | null>(null);
    const [phase, setPhase] = useState<SubmitPhase>('idle');
    const [apiError, setApiError] = useState<string | null>(null);

    const hasPrefill = !!(prefill?.bookingId && prefill?.lockerId && prefill?.stationId && !selectedCandidateId);

    // ── File upload handler (Real Photos) ──────────────────────────────────────

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        setPhotoError(null);
        if (!files || files.length === 0) return;

        const maxFiles = 5;
        if (photoUrls.length + files.length > maxFiles) {
            setPhotoError(`Tối đa ${maxFiles} ảnh bằng chứng.`);
            return;
        }

        setIsReadingPhoto(true);
        Array.from(files).forEach((file) => {
            if (!file.type.startsWith('image/')) {
                setPhotoError('Chỉ hỗ trợ tệp định dạng hình ảnh (PNG, JPG, WEBP).');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setPhotoError('Dung lượng mỗi ảnh tối đa 5MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setPhotoUrls((prev) => [...prev, reader.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
        setIsReadingPhoto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAddPhotoUrl = () => {
        const trimmed = newPhotoUrl.trim();
        if (!trimmed) return;
        if (!photoUrls.includes(trimmed)) {
            setPhotoUrls((prev) => [...prev, trimmed]);
        }
        setNewPhotoUrl('');
    };

    const handleRemovePhotoUrl = (idx: number) => {
        setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
    };

    // ── Item management ────────────────────────────────────────────────────────

    const handleSaveItem = () => {
        if (!itemInput.description.trim()) {
            setItemError('Mô tả tài sản không được để trống');
            return;
        }
        if (itemInput.quantity <= 0) {
            setItemError('Số lượng phải lớn hơn 0');
            return;
        }

        if (editingItemId) {
            setItems((prev) =>
                prev.map((it) => (it.id === editingItemId ? { ...itemInput, id: editingItemId } : it))
            );
            setEditingItemId(null);
        } else {
            setItems((prev) => [
                ...prev,
                {
                    ...itemInput,
                    id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                },
            ]);
        }

        setItemInput({
            category: ITEM_CATEGORIES[0],
            description: '',
            quantity: 1,
            condition: ITEM_CONDITIONS[0],
            note: '',
        });
        setItemError(null);
    };

    const handleEditItem = (item: InventoryItem) => {
        setEditingItemId(item.id);
        setItemInput({
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            condition: item.condition,
            note: item.note,
        });
        setItemError(null);
    };

    const handleCancelEditItem = () => {
        setEditingItemId(null);
        setItemInput({
            category: ITEM_CATEGORIES[0],
            description: '',
            quantity: 1,
            condition: ITEM_CONDITIONS[0],
            note: '',
        });
        setItemError(null);
    };

    const handleRemoveItem = (id: string) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
        if (editingItemId === id) handleCancelEditItem();
    };

    // ── Validation ─────────────────────────────────────────────────────────────

    const validate = (): boolean => {
        const next: Partial<Record<keyof FormFields, string>> = {};

        if (!fields.bookingId.trim()) {
            next.bookingId = 'Vui lòng chọn đơn đặt tủ hoặc nhập Booking ID';
        }
        if (!fields.lockerId.trim()) {
            next.lockerId = 'Mã ô tủ (Locker ID) là bắt buộc';
        }
        if (!fields.stationId.trim()) {
            next.stationId = 'Mã trạm (Station ID) là bắt buộc';
        }
        if (!fields.overdueHours.trim() || Number(fields.overdueHours) <= 0) {
            next.overdueHours = 'Số giờ quá hạn phải > 0';
        }

        if (!fields.sealCode.trim()) {
            next.sealCode = 'Mã tem niêm phong vật lý là bắt buộc';
        }

        if (items.length === 0) {
            setItemError('Cần thêm ít nhất 1 tài sản vào biên bản kiểm kê');
            return false;
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    // ── Submit Handlers ────────────────────────────────────────────────────────

    const handleRequestSubmit = () => {
        if (!validate()) return;
        setPhase('confirm');
    };

    const handleCancelConfirm = () => {
        setPhase('idle');
    };

    const serializeItemDescription = (): string => {
        const lines: string[] = [];
        lines.push(`[BIÊN BẢN KIỂM KÊ HIỆN TRƯỜNG QUÁ HẠN 72H]`);
        lines.push(`Mã tem niêm phong: ${fields.sealCode.trim()}`);
        if (fields.measuredWeight) {
            lines.push(`Tải trọng thực địa: ${fields.measuredWeight.trim()} kg`);
        }
        if (fields.generalCondition.trim()) {
            lines.push(`Tình trạng tổng quan: ${fields.generalCondition.trim()}`);
        }
        lines.push(
            `Cam kết an toàn: ${fields.safetyVerified ? 'Đã kiểm tra sơ bộ không có chất cấm/dễ cháy nổ' : 'Chưa kiểm tra an toàn'}`
        );
        lines.push(`Bằng chứng đính kèm: ${photoUrls.length} tệp ảnh/video hiện trường`);
        lines.push(`\nDanh mục ${items.length} tài sản kiểm kê:`);

        items.forEach((it, idx) => {
            lines.push(
                `${idx + 1}. [${it.category}] ${it.description} (SL: ${it.quantity}, Tình trạng: ${it.condition})${it.note ? ` - Ghi chú: ${it.note}` : ''}`
            );
        });

        return lines.join('\n');
    };

    const handleConfirmSubmit = async () => {
        setPhase('submitting');
        setApiError(null);

        const fullDescription = serializeItemDescription();

        const body: CreateAbandonedPropertyRequest = {
            bookingId: fields.bookingId.trim(),
            lockerId: fields.lockerId.trim(),
            stationId: fields.stationId.trim(),
            overdueHours: Number(fields.overdueHours),
            itemDescription: fullDescription,
            photoUrls: photoUrls.length > 0 ? photoUrls : null,
            notes: fields.notes.trim() || null,
        };

        try {
            const res = await abandonedPropertyService.createRecord(body);
            if (res.success) {
                setPhase('success');
                onSubmitted(res.data);
            } else {
                setPhase('error');
                setApiError(res.message ?? 'Không thể lập biên bản. Vui lòng thử lại.');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setPhase('error');
            setApiError(axiosErr.response?.data?.message ?? 'Lỗi kết nối. Vui lòng thử lại.');
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                        <Package className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-900 tracking-tight">
                            Lập Biên Bản Kiểm Kê Tài Sản Bỏ Quên Quá Hạn 72h
                        </h2>
                        <p className="text-xs text-slate-500">
                            Bước 1: Kỹ thuật viên (Staff) kiểm kê hiện trường theo Nguyên tắc 4 mắt (Four-Eyes Principle)
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
                {apiError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Lỗi xử lý hệ thống</p>
                            <p className="text-[11px] mt-0.5">{apiError}</p>
                        </div>
                    </div>
                )}

                {/* Section 1: Candidate Selection */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Box className="w-4 h-4 text-blue-600" />
                            <span>1. Chọn đơn đặt tủ quá hạn 72h chờ kiểm kê</span>
                        </h3>
                        {candidates.length > 0 && (
                            <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                {candidates.length} đơn chờ xử lý
                            </span>
                        )}
                    </div>

                    {isLoadingCandidates ? (
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-slate-500 flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                            <span>Đang kiểm tra danh sách đơn quá hạn 72h...</span>
                        </div>
                    ) : candidates.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
                            {candidates.map((c) => (
                                <button
                                    key={c.bookingId}
                                    type="button"
                                    onClick={() => handleSelectCandidate(c.bookingId)}
                                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                        fields.bookingId === c.bookingId
                                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                                            : 'bg-white border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-slate-900 text-xs">
                                            #{c.bookingCode} · Ô {c.lockerCode}
                                        </span>
                                        <span className="text-[10px] font-bold text-rose-600 font-mono bg-rose-50 px-1.5 py-0.5 rounded">
                                            +{c.overdueHours}h quá hạn
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 truncate mt-1">
                                        {c.customerName || 'Khách hàng'} · {c.stationName}
                                    </p>
                                    {c.overdueDebt ? (
                                        <p className="text-[10px] text-rose-600 font-bold mt-1">
                                            Nợ cước: {c.overdueDebt.toLocaleString('vi-VN')} đ
                                        </p>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    ) : hasPrefill ? (
                        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 flex items-center justify-between">
                            <div>
                                <span className="font-bold">Đang lập cho đơn: </span>
                                <span className="font-mono font-bold">#{candidateHint.bookingCode}</span>
                                <span> tại Ô </span>
                                <span className="font-mono font-bold text-blue-700">{candidateHint.lockerCode}</span>
                                <span> ({candidateHint.stationName})</span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-center">
                            Không có đơn đặt tủ quá hạn nào chờ xử lý. Bạn có thể nhập mã thủ công bên dưới.
                        </div>
                    )}

                    {/* Manual IDs if no candidate chosen */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Mã đơn (Booking ID) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={fields.bookingId}
                                onChange={(e) => setFields((p) => ({ ...p, bookingId: e.target.value }))}
                                placeholder="Nhập Booking ID..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                            {errors.bookingId && <p className="text-rose-600 text-[10px] mt-0.5">{errors.bookingId}</p>}
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Ô tủ (Locker ID) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={fields.lockerId}
                                onChange={(e) => setFields((p) => ({ ...p, lockerId: e.target.value }))}
                                placeholder="Nhập Locker ID..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                            {errors.lockerId && <p className="text-rose-600 text-[10px] mt-0.5">{errors.lockerId}</p>}
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Trạm (Station ID) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={fields.stationId}
                                onChange={(e) => setFields((p) => ({ ...p, stationId: e.target.value }))}
                                placeholder="Nhập Station ID..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                            {errors.stationId && <p className="text-rose-600 text-[10px] mt-0.5">{errors.stationId}</p>}
                        </div>
                    </div>
                </div>

                {/* Section 2: Seal and Weight */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>2. Mã tem niêm phong vật lý &amp; Trọng lượng kiểm kê</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Mã tem niêm phong (Seal Barcode) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={fields.sealCode}
                                onChange={(e) => setFields((p) => ({ ...p, sealCode: e.target.value }))}
                                placeholder="VD: SL-SEAL-2026-1042..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-blue-700 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                            {errors.sealCode && <p className="text-rose-600 text-[10px] mt-0.5">{errors.sealCode}</p>}
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Tải trọng cân thực địa (kg)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={fields.measuredWeight}
                                onChange={(e) => setFields((p) => ({ ...p, measuredWeight: e.target.value }))}
                                placeholder="VD: 5.50..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Số giờ quá hạn thực tế <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={fields.overdueHours}
                                onChange={(e) => setFields((p) => ({ ...p, overdueHours: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1">
                                Tình trạng tổng quan kiện hàng
                            </label>
                            <input
                                type="text"
                                value={fields.generalCondition}
                                onChange={(e) => setFields((p) => ({ ...p, generalCondition: e.target.value }))}
                                placeholder="VD: Vali kéo màu xám, khóa số còn nguyên, không có mùi lạ..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center pt-5">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={fields.safetyVerified}
                                    onChange={(e) => setFields((p) => ({ ...p, safetyVerified: e.target.checked }))}
                                    className="w-4 h-4 accent-emerald-600 rounded"
                                />
                                <span className="font-semibold text-slate-700">
                                    Cam kết: Đã kiểm tra sơ bộ, KHÔNG có chất cấm, chất cháy nổ hoặc hàng nguy hiểm
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Section 3: Detailed Inventory Items */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-blue-600" />
                            <span>3. Danh mục tài sản kiểm kê chi tiết ({items.length} món)</span>
                        </h3>
                    </div>

                    {/* Add / Edit item input box */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Danh mục</label>
                                <select
                                    value={itemInput.category}
                                    onChange={(e) => setItemInput((p) => ({ ...p, category: e.target.value }))}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none"
                                >
                                    {ITEM_CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    Mô tả tài sản <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={itemInput.description}
                                    onChange={(e) => setItemInput((p) => ({ ...p, description: e.target.value }))}
                                    placeholder="VD: Laptop Dell XPS 13 inch màu bạc..."
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Số lượng</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={itemInput.quantity}
                                    onChange={(e) =>
                                        setItemInput((p) => ({ ...p, quantity: Math.max(1, Number(e.target.value)) }))
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tình trạng</label>
                                <select
                                    value={itemInput.condition}
                                    onChange={(e) => setItemInput((p) => ({ ...p, condition: e.target.value }))}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none"
                                >
                                    {ITEM_CONDITIONS.map((cond) => (
                                        <option key={cond} value={cond}>
                                            {cond}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Ghi chú thêm</label>
                                <input
                                    type="text"
                                    value={itemInput.note}
                                    onChange={(e) => setItemInput((p) => ({ ...p, note: e.target.value }))}
                                    placeholder="VD: Để trong túi chống sốc..."
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none"
                                />
                            </div>
                        </div>

                        {itemError && <p className="text-rose-600 text-[11px] font-semibold">{itemError}</p>}

                        <div className="flex justify-end gap-2 pt-1">
                            {editingItemId && (
                                <button
                                    type="button"
                                    onClick={handleCancelEditItem}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                                >
                                    Hủy sửa
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleSaveItem}
                                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{editingItemId ? 'Lưu chỉnh sửa' : 'Thêm vào danh mục'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Items table / list */}
                    {items.length > 0 ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                        <th className="p-2.5 w-10 text-center">#</th>
                                        <th className="p-2.5">Tài sản</th>
                                        <th className="p-2.5 w-28">Danh mục</th>
                                        <th className="p-2.5 w-16 text-center">SL</th>
                                        <th className="p-2.5 w-32">Tình trạng</th>
                                        <th className="p-2.5 w-20 text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((it, idx) => (
                                        <tr key={it.id} className="hover:bg-slate-50/80">
                                            <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                                            <td className="p-2.5">
                                                <p className="font-semibold text-slate-900">{it.description}</p>
                                                {it.note && <p className="text-[11px] text-slate-400 mt-0.5">{it.note}</p>}
                                            </td>
                                            <td className="p-2.5 text-slate-600">{it.category}</td>
                                            <td className="p-2.5 text-center font-mono font-bold text-slate-900">{it.quantity}</td>
                                            <td className="p-2.5 text-slate-600">{it.condition}</td>
                                            <td className="p-2.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditItem(it)}
                                                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                                        title="Sửa"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(it.id)}
                                                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                            Chưa có tài sản nào trong danh mục. Hãy nhập thông tin phía trên và nhấn &quot;Thêm vào danh mục&quot;.
                        </div>
                    )}
                </div>

                {/* Section 4: Real Evidence Photo Upload */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-blue-600" />
                            <span>4. Ảnh bằng chứng hiện trường / Tem niêm phong ({photoUrls.length}/5 ảnh)</span>
                        </h3>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {photoError && <p className="text-rose-600 text-[11px] font-semibold">{photoError}</p>}

                    {/* Image thumbnails */}
                    {photoUrls.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {photoUrls.map((url, idx) => (
                                <div
                                    key={idx}
                                    className="relative rounded-xl border border-slate-200 overflow-hidden group bg-slate-50 aspect-video flex items-center justify-center"
                                >
                                    <img
                                        src={url}
                                        alt={`Bằng chứng #${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemovePhotoUrl(idx)}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition cursor-pointer"
                                        title="Xóa ảnh này"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action buttons to add photo */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isReadingPhoto || photoUrls.length >= 5}
                            className="px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20 text-slate-700 font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                        >
                            <Upload className="w-4 h-4 text-blue-600" />
                            <span>{isReadingPhoto ? 'Đang đọc ảnh...' : 'Tải ảnh từ máy / Chụp ảnh'}</span>
                        </button>

                        <div className="flex-1 flex gap-2">
                            <input
                                type="url"
                                value={newPhotoUrl}
                                onChange={(e) => setNewPhotoUrl(e.target.value)}
                                placeholder="Hoặc dán URL ảnh trực tiếp..."
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleAddPhotoUrl}
                                disabled={!newPhotoUrl.trim() || photoUrls.length >= 5}
                                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer disabled:opacity-50"
                            >
                                Thêm URL
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section 5: Staff General Notes */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                    <label className="block font-bold text-slate-700">Ghi chú bổ sung của Staff:</label>
                    <textarea
                        rows={2}
                        value={fields.notes}
                        onChange={(e) => setFields((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Nhập bất kỳ lưu ý nào khác (VD: Đã dán tem niêm phong chéo mép tủ, khách có hẹn lấy trước 18h...)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                    Đóng
                </button>

                <div className="flex items-center gap-2">
                    {phase === 'confirm' ? (
                        <>
                            <button
                                type="button"
                                onClick={handleCancelConfirm}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition cursor-pointer"
                            >
                                Quay lại sửa
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSubmit}
                                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition cursor-pointer"
                            >
                                <Send className="w-4 h-4" />
                                <span>Xác nhận ký biên bản (Mắt 1)</span>
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={handleRequestSubmit}
                            disabled={phase === 'submitting'}
                            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
                        >
                            {phase === 'submitting' ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Đang lưu biên bản...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Hoàn tất &amp; Gửi duyệt 4 mắt</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
