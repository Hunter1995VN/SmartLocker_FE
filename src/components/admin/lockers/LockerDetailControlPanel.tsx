import { useState, useEffect } from 'react';
import type { LockerGridItemDto, UpdateLockerStatusRequest } from '../../../api/adminStationService';
import adminStationService from '../../../api/adminStationService';
import adminIncidentService from '../../../api/adminIncidentService';
import { LOCKER_STATUS_CONFIG, normalizeLockerStatus } from './lockerStatusConstants';
import { ArrowRightLeft, Wrench, AlertTriangle, CheckCircle2, Cpu } from 'lucide-react';

interface Props {
    locker: LockerGridItemDto | null;
    stationName?: string;
    onUpdateStatusRequest: (request: UpdateLockerStatusRequest) => void;
    isUpdating: boolean;
    onRefreshLockerTelemetry: () => void;
}

export default function LockerDetailControlPanel({
    locker,
    stationName,
    onUpdateStatusRequest,
    isUpdating,
    onRefreshLockerTelemetry,
}: Props) {
    const [target, setTarget] = useState<'AVAILABLE' | 'MAINTENANCE' | 'DISABLED'>('MAINTENANCE');
    const [reason, setReason] = useState('');
    const [unlockReason, setUnlockReason] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const [feedback, setFeedback] = useState('');

    // UC-S12: Swap Spare Locker State
    const [showSwapModal, setShowSwapModal] = useState(false);
    const [swapReason, setSwapReason] = useState('Kẹt chốt cơ học / Solenoid không bung');
    const [openNewLocker, setOpenNewLocker] = useState(true);
    const [isSwapping, setIsSwapping] = useState(false);
    const [swapSuccessMsg, setSwapSuccessMsg] = useState<string | null>(null);
    const [swapErrorMsg, setSwapErrorMsg] = useState<string | null>(null);

    // UC-A02: Hardware GPIO Pin Mapping State
    const [gpioPinInput, setGpioPinInput] = useState<string>(locker?.gpioPin != null ? String(locker.gpioPin) : '');
    const [isSavingGpio, setIsSavingGpio] = useState(false);
    const [gpioFeedback, setGpioFeedback] = useState<string | null>(null);

    // Sync input when locker changes
    useEffect(() => {
        setGpioPinInput(locker?.gpioPin != null ? String(locker.gpioPin) : '');
        setGpioFeedback(null);
    }, [locker?.id, locker?.gpioPin]);

    if (!locker) return <p className="rounded-2xl border bg-white p-5">Chọn ngăn để xem dữ liệu.</p>;
    const status = LOCKER_STATUS_CONFIG[normalizeLockerStatus(locker.businessStatus)];
    const active = !!locker.currentBooking;

    async function unlock() {
        if (!locker || unlockReason.trim().length < 5 || unlocking) return;
        setUnlocking(true);
        setFeedback('');
        try {
            const res = await adminIncidentService.directRemoteUnlockLocker(locker.id, { reason: unlockReason.trim() });
            setFeedback(res.message || (res.success ? 'Máy chủ đã nhận yêu cầu; kiểm tra cửa thực tế.' : 'Yêu cầu thất bại.'));
            if (res.success) {
                setUnlockReason('');
                onRefreshLockerTelemetry();
            }
        } catch {
            setFeedback('Không gửi được yêu cầu mở khóa. Kiểm tra kết nối rồi thử lại.');
        } finally {
            setUnlocking(false);
        }
    }

    async function handleConfirmSwap() {
        if (!locker || isSwapping) return;
        setIsSwapping(true);
        setSwapSuccessMsg(null);
        setSwapErrorMsg(null);

        try {
            const res = await adminStationService.swapSpareLocker(locker.id, {
                reason: swapReason.trim(),
                openNewLocker,
            });

            if (res.success && res.data) {
                setSwapSuccessMsg(res.data.message || `Đã đổi thành công sang ô dự phòng ${res.data.newLockerCode}!`);
                setShowSwapModal(false);
                onRefreshLockerTelemetry();
            } else {
                setSwapErrorMsg(res.message || 'Không thể đổi hộc dự phòng.');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.';
            setSwapErrorMsg(msg);
        } finally {
            setIsSwapping(false);
        }
    }

    async function handleSaveGpio() {
        if (!locker || isSavingGpio) return;
        setIsSavingGpio(true);
        setGpioFeedback(null);
        try {
            const parsedPin = gpioPinInput.trim() === '' ? null : parseInt(gpioPinInput.trim(), 10);
            if (parsedPin !== null && (isNaN(parsedPin) || parsedPin < 0 || parsedPin > 48)) {
                setGpioFeedback('Chân GPIO phải là số nguyên từ 0 đến 48.');
                setIsSavingGpio(false);
                return;
            }
            const res = await adminStationService.updateLockerHardwareMapping(locker.id, {
                gpioPin: parsedPin,
                ioTDeviceId: locker.ioTDeviceId
            });
            if (res.success) {
                setGpioFeedback(`Đã lưu chân GPIO ${parsedPin != null ? parsedPin : 'mặc định'} thành công!`);
                onRefreshLockerTelemetry();
            } else {
                setGpioFeedback(res.message || 'Lỗi khi lưu cấu hình GPIO.');
            }
        } catch {
            setGpioFeedback('Lỗi kết nối khi cập nhật chân GPIO.');
        } finally {
            setIsSavingGpio(false);
        }
    }

    return (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div>
                <h3 className="font-bold text-slate-900 text-lg">{locker.lockerCode} · Size {locker.size}</h3>
                <p className="text-xs text-slate-500">{stationName}</p>
            </div>
            
            <p className={status.badgeText}>{status.label} ({locker.businessStatus})</p>

            {swapSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{swapSuccessMsg}</span>
                </div>
            )}

            {swapErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{swapErrorMsg}</span>
                </div>
            )}

            <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                <dt className="text-slate-400">Cửa cảm biến:</dt>
                <dd className="font-semibold text-slate-800">
                    {locker.doorState === 'CLOSED' ? '🟢 Đã đóng' : locker.doorState === 'OPEN' ? '🔴 Đang mở' : '⚪ Chưa xác định'}
                </dd>
                <dt className="text-slate-400">Sức khỏe:</dt>
                <dd className="font-semibold">{locker.healthStatus}</dd>
                <dt className="text-slate-400">Kết nối:</dt>
                <dd className="font-semibold">{locker.connectivityStatus || 'UNKNOWN'}</dd>
                <dt className="text-slate-400">Thiết bị IoT:</dt>
                <dd className="font-semibold font-mono">{locker.deviceCode || 'Chưa ánh xạ'}</dd>
                <dt className="text-slate-400">Chân GPIO:</dt>
                <dd className="font-mono font-bold text-indigo-700">
                    {locker.gpioPin != null ? `GPIO ${locker.gpioPin}` : 'Chưa gán'}
                </dd>
                <dt className="text-slate-400">Firmware:</dt>
                <dd className="font-semibold font-mono">{locker.firmwareVersion || 'Chưa có'}</dd>
                <dt className="text-slate-400">Heartbeat:</dt>
                <dd className="font-semibold">
                    {locker.lastSeenAt
                        ? new Date(locker.lastSeenAt.endsWith('Z') ? locker.lastSeenAt : locker.lastSeenAt + 'Z').toLocaleTimeString('vi-VN')
                        : 'Chưa có dữ liệu'}
                </dd>
                <dt className="text-slate-400">Đơn hiện tại:</dt>
                <dd className="font-bold text-blue-600">{locker.currentBooking?.bookingCode || 'Trống'}</dd>
                <dt className="text-slate-400">Ghi chú:</dt>
                <dd className="text-slate-500 italic truncate">{locker.notes || '—'}</dd>
            </dl>

            <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                onClick={onRefreshLockerTelemetry}
            >
                🔄 Đọc lại dữ liệu Telemetry
            </button>

            {/* UC-A02: Cấu hình Ánh xạ Phần cứng & Chân GPIO */}
            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Ánh xạ chân GPIO (UC-A02)</span>
                    </h4>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold">
                        {locker.gpioPin != null ? `GPIO ${locker.gpioPin}` : 'Chưa gán'}
                    </span>
                </div>
                <p className="text-[11px] text-slate-500">
                    Cấu hình số thứ tự chân GPIO của bo mạch điều khiển rơ-le Solenoid và cảm biến từ của ngăn {locker.lockerCode}.
                </p>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={0}
                        max={48}
                        placeholder="Số chân GPIO (vd: 26, 25, 33...)"
                        value={gpioPinInput}
                        onChange={e => setGpioPinInput(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                        type="button"
                        onClick={handleSaveGpio}
                        disabled={isSavingGpio}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition text-xs disabled:opacity-50 cursor-pointer shrink-0"
                    >
                        {isSavingGpio ? 'Đang lưu...' : 'Lưu GPIO'}
                    </button>
                </div>
                {gpioFeedback && (
                    <p className={`text-[11px] font-medium p-2 rounded-lg ${gpioFeedback.includes('thành công') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                        {gpioFeedback}
                    </p>
                )}
            </div>

            {/* UC-S12: Đổi hộc tủ dự phòng khi kẹt cơ học */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                        <span>Xử lý kẹt cơ học (UC-S12)</span>
                    </h4>
                </div>
                <p className="text-[11px] text-slate-500">
                    Khi chốt solenoid bị kẹt hoặc cửa không bật mở, bấm đổi sang ô dự phòng trống cùng kích cỡ ({locker.size}) để giải cứu khách ngay lập tức.
                </p>
                <button
                    type="button"
                    onClick={() => setShowSwapModal(true)}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Đổi sang hộc dự phòng (Swap Spare)</span>
                </button>
            </div>

            {/* Quản lý trạng thái */}
            <form
                className="space-y-3 border-t border-slate-100 pt-4 text-xs"
                onSubmit={e => {
                    e.preventDefault();
                    onUpdateStatusRequest({
                        businessStatus: target,
                        healthStatus: target === 'AVAILABLE' ? 'HEALTHY' : target === 'MAINTENANCE' ? 'WARNING' : 'CRITICAL',
                        reason: reason.trim(),
                    });
                }}
            >
                <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-slate-500" />
                    <span>Quản lý trạng thái thủ công</span>
                </h4>
                {active && (
                    <p className="text-amber-700 bg-amber-50 p-2 rounded-lg text-[11px]">
                        Ngăn đang có đơn hoạt động. Dùng nút "Đổi sang hộc dự phòng" ở trên nếu ô bị kẹt.
                    </p>
                )}
                <label className="block">
                    <span className="text-slate-600 font-medium">Chuyển sang:</span>
                    <select
                        aria-label="Trạng thái"
                        className="mt-1 block w-full rounded-xl border border-slate-200 p-2 text-xs bg-white"
                        value={target}
                        onChange={e => setTarget(e.target.value as typeof target)}
                        disabled={active || isUpdating}
                    >
                        <option value="MAINTENANCE">Bảo trì (MAINTENANCE)</option>
                        <option value="DISABLED">Vô hiệu hóa (DISABLED)</option>
                        <option value="AVAILABLE">Khả dụng (AVAILABLE)</option>
                    </select>
                </label>
                <label className="block">
                    <span className="text-slate-600 font-medium">Lý do:</span>
                    <textarea
                        aria-label="Lý do"
                        className="mt-1 block w-full rounded-xl border border-slate-200 p-2 text-xs"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        required
                        minLength={5}
                        maxLength={500}
                        placeholder="Nhập lý do thay đổi..."
                        disabled={active || isUpdating}
                    />
                </label>
                <button
                    type="submit"
                    disabled={active || isUpdating || reason.trim().length < 5}
                    className="w-full rounded-xl bg-slate-900 px-3 py-2 text-white font-semibold disabled:opacity-40 cursor-pointer"
                >
                    {isUpdating ? 'Đang cập nhật...' : 'Xác nhận đổi trạng thái'}
                </button>
            </form>

            {/* Mở khóa khẩn cấp */}
            <div className="space-y-3 border-t border-slate-100 pt-4 text-xs">
                <h4 className="font-semibold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Mở khóa khẩn cấp (Direct Unlock)</span>
                </h4>
                <label className="block">
                    <span className="text-slate-600 font-medium">Lý do mở khóa:</span>
                    <textarea
                        aria-label="Lý do mở khóa"
                        className="mt-1 block w-full rounded-xl border border-slate-200 p-2 text-xs"
                        value={unlockReason}
                        onChange={e => setUnlockReason(e.target.value)}
                        maxLength={500}
                        placeholder="Cứu hộ khẩn cấp..."
                    />
                </label>
                <button
                    type="button"
                    onClick={() => void unlock()}
                    disabled={unlocking || unlockReason.trim().length < 5}
                    className="w-full rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-rose-700 font-bold hover:bg-rose-100 transition disabled:opacity-40 cursor-pointer"
                >
                    {unlocking ? 'Đang gửi lệnh...' : 'Gửi lệnh mở chốt'}
                </button>
                {feedback && <p className="text-xs text-slate-600 italic">{feedback}</p>}
            </div>

            {/* UC-S12: Swap Spare Modal */}
            {showSwapModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                                <ArrowRightLeft className="w-5 h-5" />
                            </span>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Đổi sang hộc tủ dự phòng (UC-S12)
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Xử lý sự cố kẹt cơ học solenoid / hộc tủ không bung
                                </p>
                            </div>
                        </div>

                        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                            <p><strong>Ô bị kẹt:</strong> {locker.lockerCode} (Size {locker.size})</p>
                            <p><strong>Trạm:</strong> {stationName}</p>
                            {active ? (
                                <p><strong>Đơn đang gắn:</strong> <span className="font-mono text-blue-700 font-bold">{locker.currentBooking?.bookingCode}</span> (sẽ tự động chuyển sang ô mới)</p>
                            ) : (
                                <p className="text-slate-600 italic">Hiện không có đơn nào đang gắn vào hộc này.</p>
                            )}
                        </div>

                        <div className="space-y-3 text-xs">
                            <label className="block space-y-1">
                                <span className="font-semibold text-slate-700">Lý do hoán đổi kẹt chốt:</span>
                                <textarea
                                    value={swapReason}
                                    onChange={e => setSwapReason(e.target.value)}
                                    rows={2}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                    placeholder="Mô tả nguyên nhân kẹt..."
                                />
                            </label>

                            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={openNewLocker}
                                    onChange={e => setOpenNewLocker(e.target.checked)}
                                    className="rounded text-amber-600 focus:ring-amber-500"
                                />
                                <span className="text-xs text-slate-700 font-medium">
                                    Tự động phát lệnh mở hộc dự phòng mới ngay lập tức
                                </span>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowSwapModal(false)}
                                disabled={isSwapping}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSwap}
                                disabled={isSwapping || swapReason.trim().length < 5}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isSwapping ? 'Đang điều phối...' : 'Xác nhận Đổi hộc'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
