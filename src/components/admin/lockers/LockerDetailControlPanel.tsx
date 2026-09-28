/**
 * AD-FE-04: UC-A05 + S-01 — Locker Detail & Status Control Panel
 * Panel chi tiết ô tủ và bộ điều khiển trạng thái (bên phải):
 * - Xem thông tin cảm biến tải trọng, cửa, điện áp
 * - Chuyển trạng thái ô tủ sang MAINTENANCE (hoặc trạng thái khác)
 * - Nhập lý do, ghi chú kỹ thuật, chọn KTV phụ trách
 * - Áp dụng cập nhật trạng thái với xác nhận
 */
import { useState } from 'react';
import {
    DoorClosed,
    DoorOpen,
    Weight,
    Zap,
    RotateCw,
    Send,
    Activity,
    Sliders,
} from 'lucide-react';
import type { LockerGridItemDto, UpdateLockerStatusRequest } from '../../../api/adminStationService';
import {
    normalizeLockerStatus,
    type LockerBusinessStatus,
} from './lockerStatusConstants';

interface LockerDetailControlPanelProps {
    locker: LockerGridItemDto | null;
    stationName?: string;
    onUpdateStatusRequest: (req: UpdateLockerStatusRequest) => void;
    isUpdating: boolean;
    onRefreshLockerTelemetry: () => void;
}

export default function LockerDetailControlPanel({
    locker,
    stationName,
    onUpdateStatusRequest,
    isUpdating,
    onRefreshLockerTelemetry,
}: LockerDetailControlPanelProps) {
    const currentStatus = locker ? normalizeLockerStatus(locker.businessStatus) : 'AVAILABLE';

    // Status form state
    const [selectedTargetStatus, setSelectedTargetStatus] = useState<LockerBusinessStatus>(currentStatus);
    const [maintenanceReason, setMaintenanceReason] = useState<string>('Kẹt cơ khí chốt khóa (Solenoid latch stuck)');
    const [technicalNotes, setTechnicalNotes] = useState<string>(locker?.notes || '');
    const [estimatedDuration, setEstimatedDuration] = useState<string>('2 giờ');
    const [technician, setTechnician] = useState<string>('D. Morales (Staff)');
    const [notifyTech, setNotifyTech] = useState<boolean>(true);
    const [auditLog, setAuditLog] = useState<boolean>(true);

    // Hardware diagnostic test mock message
    const [diagFeedback, setDiagFeedback] = useState<string | null>(null);

    if (!locker) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-100">
                    <Sliders className="w-7 h-7 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Chưa chọn ngăn tủ</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Vui lòng nhấp vào một ô tủ trên sơ đồ bên trái để xem telemetry cảm biến và điều khiển trạng thái.
                </p>
            </div>
        );
    }

    const isDoorOpen = locker.doorState === 'OPEN';

    const handleApply = (e: React.FormEvent) => {
        e.preventDefault();

        let fullReason = maintenanceReason;
        if (technicalNotes.trim()) {
            fullReason += ` - ${technicalNotes.trim()}`;
        }

        const healthStatus = selectedTargetStatus === 'MAINTENANCE' ? 'WARNING' : selectedTargetStatus === 'DISABLED' ? 'CRITICAL' : 'HEALTHY';

        onUpdateStatusRequest({
            businessStatus: selectedTargetStatus,
            healthStatus,
            reason: fullReason,
        });
    };

    const handlePulseTest = () => {
        setDiagFeedback('Đã gửi xung kiểm tra 250ms tới MCU chốt điện tử. Phản hồi Solenoid: Tốt (23.9V).');
        setTimeout(() => setDiagFeedback(null), 4000);
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
            {/* Header: Locker Identity & Status */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">
                            Ngăn {locker.lockerCode}
                        </h2>
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                            Size {locker.size}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Vị trí: Cột 4 - Tầng 1 · {stationName || 'Trạm trung tâm'}
                    </p>
                </div>

                {/* Big Status Badge */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                    currentStatus === 'AVAILABLE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : currentStatus === 'OCCUPIED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : currentStatus === 'MAINTENANCE'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                    <span className={`w-2 h-2 rounded-full ${
                        currentStatus === 'AVAILABLE'
                            ? 'bg-emerald-500 animate-pulse'
                            : currentStatus === 'OCCUPIED'
                            ? 'bg-rose-500'
                            : currentStatus === 'MAINTENANCE'
                            ? 'bg-amber-500'
                            : 'bg-slate-500'
                    }`} />
                    <span>
                        {currentStatus === 'AVAILABLE' && 'KHẢ DỤNG / TRỐNG'}
                        {currentStatus === 'OCCUPIED' && 'ĐANG SỬ DỤNG'}
                        {currentStatus === 'MAINTENANCE' && 'ĐANG BẢO TRÌ'}
                        {currentStatus === 'DISABLED' && 'VÔ HIỆU HÓA'}
                    </span>
                </span>
            </div>

            <form onSubmit={handleApply} className="p-5 space-y-5 overflow-y-auto max-h-[700px]">
                {/* Diagnostic Feedback Banner */}
                {diagFeedback && (
                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{diagFeedback}</span>
                    </div>
                )}

                {/* Section 1: Telemetry Sensors */}
                <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span>1. Thông tin cảm biến & phần cứng</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-2.5">
                        {/* Door Sensor */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                                {isDoorOpen ? <DoorOpen className="w-3 h-3 text-amber-500" /> : <DoorClosed className="w-3 h-3 text-emerald-600" />}
                                Cảm biến cửa
                            </span>
                            <span className={`text-xs font-bold ${isDoorOpen ? 'text-amber-600' : 'text-emerald-700'}`}>
                                {isDoorOpen ? 'Đang mở (Open)' : 'Đóng kín (Closed)'}
                            </span>
                        </div>

                        {/* Weight / Loadcell Sensor */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                                <Weight className="w-3 h-3 text-blue-600" />
                                Cảm biến tải trọng
                            </span>
                            <span className="text-xs font-bold text-slate-900 font-mono">
                                {currentStatus === 'OCCUPIED' ? '6.85 kg' : '0.00 kg (Trống)'}
                            </span>
                        </div>

                        {/* Solenoid Voltage */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-500" />
                                Điện áp Solenoid
                            </span>
                            <span className="text-xs font-bold text-slate-900 font-mono">
                                24.1V (Chuẩn)
                            </span>
                        </div>

                        {/* Cycles */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                                <RotateCw className="w-3 h-3 text-slate-500" />
                                Chu kỳ mở chốt
                            </span>
                            <span className="text-xs font-bold text-slate-900 font-mono">
                                1.429 lần
                            </span>
                        </div>
                    </div>
                </div>

                {/* Section 2: Update Locker Status Control */}
                <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-indigo-600" />
                            <span>2. Cập nhật trạng thái ô tủ</span>
                        </h3>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Quyền Admin / Staff
                        </span>
                    </div>

                    {/* Radio Options */}
                    <div className="space-y-2">
                        {/* Option 1: AVAILABLE */}
                        <label className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                            selectedTargetStatus === 'AVAILABLE'
                                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}>
                            <input
                                type="radio"
                                name="lockerStatus"
                                value="AVAILABLE"
                                checked={selectedTargetStatus === 'AVAILABLE'}
                                onChange={() => setSelectedTargetStatus('AVAILABLE')}
                                className="mt-1 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="flex-1 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">Khả dụng (AVAILABLE)</span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Cho phép khách hàng / hành khách đặt và sử dụng bình thường
                                </p>
                            </div>
                        </label>

                        {/* Option 2: OCCUPIED */}
                        <label className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                            selectedTargetStatus === 'OCCUPIED'
                                ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}>
                            <input
                                type="radio"
                                name="lockerStatus"
                                value="OCCUPIED"
                                checked={selectedTargetStatus === 'OCCUPIED'}
                                onChange={() => setSelectedTargetStatus('OCCUPIED')}
                                className="mt-1 text-rose-600 focus:ring-rose-500"
                            />
                            <div className="flex-1 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">Đang sử dụng (OCCUPIED)</span>
                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Gán đơn lưu trữ hoặc giữ chỗ bảo quản đặc biệt
                                </p>
                            </div>
                        </label>

                        {/* Option 3: MAINTENANCE (Target Focus) */}
                        <label className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                            selectedTargetStatus === 'MAINTENANCE'
                                ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/30 shadow-xs'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}>
                            <input
                                type="radio"
                                name="lockerStatus"
                                value="MAINTENANCE"
                                checked={selectedTargetStatus === 'MAINTENANCE'}
                                onChange={() => setSelectedTargetStatus('MAINTENANCE')}
                                className="mt-1 text-amber-600 focus:ring-amber-500"
                            />
                            <div className="flex-1 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">BẢO TRÌ (MAINTENANCE)</span>
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-1.5 py-0.2 rounded">
                                        Khuyên dùng
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Cách ly ngay lập tức khỏi luồng phân bổ đặt tủ để kiểm tra sửa chữa
                                </p>
                            </div>
                        </label>

                        {/* Option 4: DISABLED */}
                        <label className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                            selectedTargetStatus === 'DISABLED'
                                ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}>
                            <input
                                type="radio"
                                name="lockerStatus"
                                value="DISABLED"
                                checked={selectedTargetStatus === 'DISABLED'}
                                onChange={() => setSelectedTargetStatus('DISABLED')}
                                className="mt-1 text-slate-700 focus:ring-slate-500"
                            />
                            <div className="flex-1 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">Vô hiệu hóa (DISABLED)</span>
                                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Khóa cứng khẩn cấp / ngắt rơ-le nguồn bo mạch
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Maintenance Details Sub-form */}
                    {selectedTargetStatus === 'MAINTENANCE' && (
                        <div className="mt-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3.5 text-xs animate-in fade-in duration-200">
                            <div>
                                <label className="block font-bold text-slate-800 mb-1">
                                    Lý do đưa vào bảo trì <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={maintenanceReason}
                                    onChange={(e) => setMaintenanceReason(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                                >
                                    <option value="Kẹt cơ khí chốt khóa (Solenoid latch stuck)">
                                        Kẹt cơ khí chốt khóa (Solenoid latch stuck)
                                    </option>
                                    <option value="Lỗi cảm biến tải trọng (Weight sensor drift)">
                                        Lỗi cảm biến tải trọng (Weight sensor drift)
                                    </option>
                                    <option value="Cửa không đóng kín / Chốt không bắt">
                                        Cửa không đóng kín / Chốt không bắt
                                    </option>
                                    <option value="Bảo dưỡng định kỳ linh kiện">
                                        Bảo dưỡng định kỳ linh kiện
                                    </option>
                                    <option value="Khác (Ghi chú chi tiết bên dưới)">
                                        Khác (Ghi chú chi tiết bên dưới)
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-800 mb-1">
                                    Ghi chú kỹ thuật cho ca trực
                                </label>
                                <textarea
                                    rows={2}
                                    value={technicalNotes}
                                    onChange={(e) => setTechnicalNotes(e.target.value)}
                                    placeholder="Ví dụ: Phát hiện chốt phản hồi chậm 350ms. Cần KTV kiểm tra lò xo đẩy và bôi trơn..."
                                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-slate-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-800 mb-1">Thời gian dự kiến</label>
                                    <select
                                        value={estimatedDuration}
                                        onChange={(e) => setEstimatedDuration(e.target.value)}
                                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                                    >
                                        <option value="1 giờ">1 giờ</option>
                                        <option value="2 giờ">2 giờ (16:30 Hôm nay)</option>
                                        <option value="4 giờ">4 giờ</option>
                                        <option value="1 ngày">1 ngày</option>
                                        <option value="Đến khi xử lý xong">Đến khi xử lý xong</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-800 mb-1">KTV Phụ trách</label>
                                    <select
                                        value={technician}
                                        onChange={(e) => setTechnician(e.target.value)}
                                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 cursor-pointer"
                                    >
                                        <option value="D. Morales (Staff)">D. Morales (Staff)</option>
                                        <option value="KTV Ca Trực">KTV Ca Trực</option>
                                        <option value="Đội Kỹ thuật Cơ sở">Đội Kỹ thuật Cơ sở</option>
                                    </select>
                                </div>
                            </div>

                            {/* Checkboxes */}
                            <div className="space-y-1.5 pt-1">
                                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notifyTech}
                                        onChange={(e) => setNotifyTech(e.target.checked)}
                                        className="rounded text-amber-600 focus:ring-amber-500"
                                    />
                                    <span>Tự động push thông báo tới Mobile App của KTV ca trực</span>
                                </label>

                                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={auditLog}
                                        onChange={(e) => setAuditLog(e.target.checked)}
                                        className="rounded text-amber-600 focus:ring-amber-500"
                                    />
                                    <span>Ghi nhật ký kiểm toán bất biến (Immutable Audit Log)</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 3: Hardware Diagnostics Action */}
                <div className="pt-2 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span>3. Tác vụ phần cứng tức thì</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            onClick={handlePulseTest}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition cursor-pointer"
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Thử kích xung 250ms</span>
                        </button>

                        <button
                            type="button"
                            onClick={onRefreshLockerTelemetry}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
                        >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Đọc lại cảm biến</span>
                        </button>
                    </div>
                </div>

                {/* Submit Action Button */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                    <button
                        type="submit"
                        disabled={isUpdating}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50 ${
                            selectedTargetStatus === 'MAINTENANCE'
                                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                                : selectedTargetStatus === 'DISABLED'
                                ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-700/20'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                        }`}
                    >
                        {isUpdating ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        <span>
                            {selectedTargetStatus === 'MAINTENANCE'
                                ? 'Áp dụng & Chuyển sang Trạng thái Bảo Trì'
                                : `Cập nhật sang Trạng thái ${selectedTargetStatus}`}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedTargetStatus(currentStatus)}
                        className="w-full py-1 text-center text-xs font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                        Hủy bỏ thao tác
                    </button>
                </div>

                {/* Emergency Unlock Card (Strict scope constraint: UI info only, remote unlock disabled) */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs opacity-75">
                    <div>
                        <p className="font-bold text-slate-800 text-[11px]">
                            Mở khóa cưỡng bức (Emergency Latch)
                        </p>
                        <p className="text-[10px] text-slate-400">
                            Yêu cầu xác thực an toàn vật lý tại kiosk theo chính sách an ninh.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled
                        title="Chức năng mở khóa vật lý chỉ thực hiện trực tiếp tại tủ"
                        className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-500 text-[10px] font-bold cursor-not-allowed shrink-0"
                    >
                        MỞ KHẨN CẤP
                    </button>
                </div>
            </form>
        </div>
    );
}
