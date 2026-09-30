/**
 * AD-FE-07: UC-A09, S-03 — Staff Inspection Form (Mắt 1)
 *
 * Staff lập biên bản kiểm kê tài sản bỏ quên:
 *  - Hiển thị read-only Case Information (từ booking/locker context hoặc manual entry)
 *  - Hỗ trợ thêm nhiều item (Danh mục, Mô tả, Số lượng, Tình trạng, Ghi chú)
 *  - Cho phép Add, Edit, Remove item trước khi submit
 *  - Mã tem niêm phong vật lý (Seal Barcode)
 *  - Tải trọng cân thực địa tại trạm (kg)
 *  - Submit → POST /api/admin/abandoned-properties
 *  - Sau khi submit thành công → status PENDING_APPROVAL, callback onSubmitted()
 *
 * Security:
 *  - Chỉ Staff hoặc Admin mới thấy form này.
 *  - Staff không có nút Approve hay Reject trong form này.
 *  - Không tự đổi status UI khi API thất bại.
 */
import { useState } from 'react';
import {
    Package,
    X,
    Send,
    AlertTriangle,
    CheckCircle2,
    MapPin,
    Box,
    Plus,
    Trash2,
    Edit2,
    Shield,
} from 'lucide-react';
import abandonedPropertyService, {
    type CreateAbandonedPropertyRequest,
    type AbandonedPropertyRecordDto,
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
        overdueHours: prefill?.overdueHours ? String(prefill.overdueHours) : '48',
        sealCode: `SL-SEAL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        measuredWeight: '6.85',
        safetyVerified: true,
        generalCondition: 'Balo còn nguyên vẹn, dây kéo bình thường, không có dấu hiệu cạy phá.',
        notes: '',
    });

    const [items, setItems] = useState<InventoryItem[]>([
        {
            id: 'item-1',
            category: 'Balo / Vali du lịch',
            description: 'Balo vải dù màu đen The North Face',
            quantity: 1,
            condition: 'Nguyên vẹn / Còn mới',
            note: 'Dây kéo tốt, đã dán tem niêm phong chéo khóa chính',
        },
        {
            id: 'item-2',
            category: 'Đồ điện tử (Laptop/Tablet/Phone)',
            description: 'Laptop 14 inch kèm sạc trong ngăn chống sốc',
            quantity: 1,
            condition: 'Đã qua sử dụng (Tốt)',
            note: 'Để nguyên trong ngăn đệm không mở mật mã',
        },
    ]);

    // Editing item modal/row state
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

    const hasPrefill = !!(prefill?.bookingId && prefill?.lockerId && prefill?.stationId);

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
            // Update existing
            setItems((prev) =>
                prev.map((it) => (it.id === editingItemId ? { ...itemInput, id: editingItemId } : it))
            );
            setEditingItemId(null);
        } else {
            // Add new
            setItems((prev) => [...prev, { ...itemInput, id: `item-${Date.now()}` }]);
        }

        // Reset input
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

    const handleRemoveItem = (id: string) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
        if (editingItemId === id) {
            setEditingItemId(null);
            setItemInput({
                category: ITEM_CATEGORIES[0],
                description: '',
                quantity: 1,
                condition: ITEM_CONDITIONS[0],
                note: '',
            });
        }
    };

    // ── Validation ─────────────────────────────────────────────────────────────

    const validate = (): boolean => {
        const next: Partial<Record<keyof FormFields, string>> = {};

        if (!fields.bookingId.trim()) next.bookingId = 'Vui lòng nhập Booking ID';
        if (!fields.lockerId.trim()) next.lockerId = 'Vui lòng nhập Locker ID';
        if (!fields.stationId.trim()) next.stationId = 'Vui lòng nhập Station ID';

        const hours = Number(fields.overdueHours);
        if (!fields.overdueHours.trim() || isNaN(hours) || hours <= 0) {
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
        lines.push(`[BIÊN BẢN KIỂM KÊ HIỆN TRƯỜNG]`);
        lines.push(`Mã tem niêm phong: ${fields.sealCode.trim()}`);
        if (fields.measuredWeight) {
            lines.push(`Tải trọng thực địa: ${fields.measuredWeight.trim()} kg`);
        }
        lines.push(`Tình trạng tổng quan: ${fields.generalCondition.trim() || 'Bình thường'}`);
        lines.push(`Cam kết an toàn: ${fields.safetyVerified ? 'Đã kiểm tra sơ bộ không có chất cấm/dễ cháy nổ' : 'Chưa kiểm tra'}`);
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

    if (phase === 'confirm' || phase === 'submitting') {
        return (
            <ConfirmDialog
                fields={fields}
                items={items}
                prefill={prefill}
                isSubmitting={phase === 'submitting'}
                onConfirm={handleConfirmSubmit}
                onCancel={handleCancelConfirm}
            />
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden max-w-2xl w-full">
            {/* Header */}
            <div className="px-6 py-4 bg-amber-50/80 border-b border-amber-200/70 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-amber-500 text-white shadow-sm shrink-0">
                        <Package className="w-5 h-5" />
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-black text-slate-900 tracking-tight">
                                Lập Biên Bản Kiểm Kê Hiện Trường
                            </h2>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                                Mắt 1 (Staff)
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                            UC-A09, S-03 · Kiểm kê đồ bỏ quên quá hạn theo nguyên tắc 4 mắt
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
                {/* Error Banner */}
                {phase === 'error' && apiError && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                        <div>
                            <p className="font-bold">Lập biên bản thất bại</p>
                            <p className="mt-0.5">{apiError}</p>
                        </div>
                    </div>
                )}

                {/* Section: Context & Locker Information */}
                <section>
                    <SectionTitle icon={MapPin} title="1. Thông tin vị trí & Đơn đặt tủ" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                        <FormField
                            label="Booking ID *"
                            value={fields.bookingId}
                            onChange={(val) => setFields((p) => ({ ...p, bookingId: val }))}
                            error={errors.bookingId}
                            readOnly={hasPrefill}
                            hint={prefill?.bookingCode ? `#${prefill.bookingCode}` : undefined}
                            mono
                        />
                        <FormField
                            label="Locker ID *"
                            value={fields.lockerId}
                            onChange={(val) => setFields((p) => ({ ...p, lockerId: val }))}
                            error={errors.lockerId}
                            readOnly={hasPrefill}
                            hint={prefill?.lockerCode ? `Tủ: ${prefill.lockerCode}` : undefined}
                            mono
                        />
                        <FormField
                            label="Station ID *"
                            value={fields.stationId}
                            onChange={(val) => setFields((p) => ({ ...p, stationId: val }))}
                            error={errors.stationId}
                            readOnly={hasPrefill}
                            hint={prefill?.stationName ? prefill.stationName : undefined}
                            mono
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                        <FormField
                            label="Số giờ quá hạn *"
                            type="number"
                            value={fields.overdueHours}
                            onChange={(val) => setFields((p) => ({ ...p, overdueHours: val }))}
                            error={errors.overdueHours}
                            hint="Tính từ thời điểm hết hạn thuê"
                        />
                        <FormField
                            label="Mã tem niêm phong vật lý *"
                            value={fields.sealCode}
                            onChange={(val) => setFields((p) => ({ ...p, sealCode: val }))}
                            error={errors.sealCode}
                            placeholder="VD: SL-SEAL-2025-0894"
                            mono
                        />
                        <FormField
                            label="Cân nặng thực tế tại trạm (kg)"
                            value={fields.measuredWeight}
                            onChange={(val) => setFields((p) => ({ ...p, measuredWeight: val }))}
                            placeholder="6.85"
                            hint="Đối chiếu cảm biến Loadcell"
                        />
                    </div>
                </section>

                {/* Section: Item List Management */}
                <section>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Box className="w-3.5 h-3.5 text-slate-500" />
                            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                2. Danh mục tài sản kiểm kê ({items.length} món)
                            </p>
                        </div>
                        <span className="text-[11px] text-slate-400">
                            Thêm / Sửa / Xóa từng vật thể tìm thấy
                        </span>
                    </div>

                    {/* Table of items */}
                    <div className="mt-3 border border-slate-200/90 rounded-xl overflow-hidden divide-y divide-slate-100">
                        {items.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                                Chưa có tài sản nào. Vui lòng thêm ít nhất 1 tài sản bên dưới.
                            </div>
                        ) : (
                            items.map((it, idx) => (
                                <div key={it.id} className="p-3 bg-white flex items-start justify-between gap-3 hover:bg-slate-50/70 transition">
                                    <div className="flex items-start gap-2.5 min-w-0">
                                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-slate-900">
                                                    {it.description}
                                                </span>
                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                    {it.category}
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-600">
                                                    x{it.quantity}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Tình trạng: <strong className="text-slate-700">{it.condition}</strong>
                                                {it.note ? ` · Ghi chú: ${it.note}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleEditItem(it)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                            title="Sửa món này"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(it.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                            title="Xóa món này"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {itemError && (
                        <p className="mt-2 text-xs text-rose-600 font-medium">{itemError}</p>
                    )}

                    {/* Add / Edit Item Sub-form */}
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                        <p className="text-xs font-bold text-slate-700 flex items-center justify-between">
                            <span>{editingItemId ? '✏️ Chỉnh sửa tài sản' : '➕ Thêm tài sản mới'}</span>
                            {editingItemId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingItemId(null);
                                        setItemInput({
                                            category: ITEM_CATEGORIES[0],
                                            description: '',
                                            quantity: 1,
                                            condition: ITEM_CONDITIONS[0],
                                            note: '',
                                        });
                                    }}
                                    className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                                >
                                    Hủy sửa
                                </button>
                            )}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Phân loại danh mục *
                                </label>
                                <select
                                    value={itemInput.category}
                                    onChange={(e) => setItemInput((p) => ({ ...p, category: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {ITEM_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Tình trạng tài sản
                                </label>
                                <select
                                    value={itemInput.condition}
                                    onChange={(e) => setItemInput((p) => ({ ...p, condition: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {ITEM_CONDITIONS.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                            <div className="sm:col-span-3">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Mô tả chi tiết tài sản *
                                </label>
                                <input
                                    type="text"
                                    value={itemInput.description}
                                    onChange={(e) => setItemInput((p) => ({ ...p, description: e.target.value }))}
                                    placeholder="VD: Balo The North Face màu đen, ví da..."
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Số lượng *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={itemInput.quantity}
                                    onChange={(e) => setItemInput((p) => ({ ...p, quantity: Math.max(1, Number(e.target.value)) }))}
                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Ghi chú tình trạng / Đặc điểm nhận dạng
                            </label>
                            <input
                                type="text"
                                value={itemInput.note}
                                onChange={(e) => setItemInput((p) => ({ ...p, note: e.target.value }))}
                                placeholder="VD: Khóa bấm kim loại, quai đeo hơi sờn..."
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={handleSaveItem}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {editingItemId ? 'Lưu thay đổi' : 'Thêm vào danh mục'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Section: Inspection notes & Safety confirmation */}
                <section className="space-y-3">
                    <SectionTitle icon={Shield} title="3. Xác nhận an toàn & Ghi chú hiện trường" />

                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={fields.safetyVerified}
                            onChange={(e) => setFields((p) => ({ ...p, safetyVerified: e.target.checked }))}
                            className="mt-0.5 accent-emerald-600 w-4 h-4 rounded"
                        />
                        <span className="text-xs text-emerald-900 font-semibold leading-relaxed">
                            Đã kiểm tra sơ bộ an toàn vật lý: KHÔNG phát hiện chất cấm, chất lỏng dễ cháy nổ, vũ khí hoặc thực phẩm ôi thiu phát tán mùi.
                        </span>
                    </label>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Ghi chú hiện trường của Kỹ thuật viên (Staff)
                        </label>
                        <textarea
                            value={fields.generalCondition}
                            onChange={(e) => setFields((p) => ({ ...p, generalCondition: e.target.value }))}
                            rows={2}
                            placeholder="Mô tả bao quát tình trạng hiện trường..."
                            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>
                </section>

                {/* Four-Eyes Reminder */}
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                    <div>
                        <p className="font-bold">Tuân thủ nguyên tắc 4 mắt (Four-Eyes Principle)</p>
                        <p className="mt-0.5 text-blue-800">
                            Biên bản sau khi tạo sẽ chuyển sang trạng thái <strong>CHỜ ADMIN DUYỆT (PENDING_APPROVAL)</strong>. Bạn sẽ không có quyền tự phê duyệt hồ sơ này.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                    Hủy
                </button>
                <button
                    type="button"
                    onClick={handleRequestSubmit}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition cursor-pointer"
                >
                    <Send className="w-3.5 h-3.5" />
                    Kiểm tra & Gửi biên bản (Mắt 1)
                </button>
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({
    icon: Icon,
    title,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
}) {
    return (
        <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
            <Icon className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-bold text-slate-700">{title}</p>
        </div>
    );
}

function FormField({
    label,
    value,
    onChange,
    error,
    readOnly = false,
    placeholder = '',
    hint,
    type = 'text',
    mono = false,
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    error?: string;
    readOnly?: boolean;
    placeholder?: string;
    hint?: string;
    type?: string;
    mono?: boolean;
}) {
    return (
        <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                readOnly={readOnly}
                placeholder={placeholder}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border transition focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    mono ? 'font-mono' : ''
                } ${
                    readOnly
                        ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-default'
                        : error
                        ? 'border-rose-300 bg-rose-50'
                        : 'border-slate-200 bg-white'
                }`}
            />
            {hint && !error && <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>}
            {error && <p className="mt-0.5 text-[10px] text-rose-600 font-medium">{error}</p>}
        </div>
    );
}

function ConfirmDialog({
    fields,
    items,
    prefill,
    isSubmitting,
    onConfirm,
    onCancel,
}: {
    fields: FormFields;
    items: InventoryItem[];
    prefill?: InspectionFormProps['prefill'];
    isSubmitting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200/80 overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
                    <div>
                        <h3 className="text-base font-black text-slate-900">
                            Xác nhận gửi biên bản kiểm kê?
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Sau khi gửi, biên bản sẽ chuyển sang trạng thái PENDING_APPROVAL chờ Admin phê duyệt.
                        </p>
                    </div>
                    {!isSubmitting && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="px-6 py-4 space-y-2.5 text-xs max-h-[60vh] overflow-y-auto">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Mã tem niêm phong:</span>
                            <span className="font-mono font-bold text-slate-800">{fields.sealCode}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Trạm / Tủ:</span>
                            <span className="font-semibold text-slate-800">{prefill?.stationName || fields.stationId} · {prefill?.lockerCode || fields.lockerId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Thời gian quá hạn:</span>
                            <span className="font-bold text-amber-700">{fields.overdueHours} giờ</span>
                        </div>
                        {fields.measuredWeight && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tải trọng thực địa:</span>
                                <span className="font-semibold text-slate-800">{fields.measuredWeight} kg</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="font-bold text-slate-700 mb-1">Danh mục tài sản ({items.length} món):</p>
                        <div className="space-y-1 border border-slate-200/80 rounded-lg p-2.5 bg-slate-50/50">
                            {items.map((it, i) => (
                                <p key={it.id} className="text-slate-700">
                                    {i + 1}. <strong>{it.description}</strong> (x{it.quantity} · {it.category} · {it.condition})
                                </p>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-500" />
                        <span>Biên bản sẽ được gửi đến Quản trị viên (Admin) để thẩm tra (Nguyên tắc 4 mắt).</span>
                    </div>
                </div>

                <div className="px-6 pb-5 pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                    >
                        Quay lại sửa
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-60 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Đang lưu biên bản...
                            </>
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                Xác nhận gửi biên bản
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
