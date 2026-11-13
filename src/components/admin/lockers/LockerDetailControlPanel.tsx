import { useState, useEffect, type ReactNode } from 'react';
import type { LockerGridItemDto, UpdateLockerStatusRequest } from '../../../api/adminStationService';
import adminStationService from '../../../api/adminStationService';
import adminIncidentService from '../../../api/adminIncidentService';
import { LOCKER_STATUS_CONFIG, normalizeLockerStatus } from './lockerStatusConstants';
import { ArrowRightLeft, Wrench, AlertTriangle, CheckCircle2, Cpu, RefreshCw, XCircle, Unlock } from 'lucide-react';

interface Props {
    locker: LockerGridItemDto | null;
    stationName?: string;
    onUpdateStatusRequest: (request: UpdateLockerStatusRequest) => void;
    isUpdating: boolean;
    /** Reason the server gave for rejecting the last status change. */
    statusError?: string;
    onRefreshLockerTelemetry: () => void;
}

type Target = 'AVAILABLE' | 'MAINTENANCE' | 'DISABLED';

const sectionTitle = 'text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5';
const input = 'mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-50';

export default function LockerDetailControlPanel({ locker, stationName, onUpdateStatusRequest, isUpdating, statusError, onRefreshLockerTelemetry }: Props) {
    const current = normalizeLockerStatus(locker?.businessStatus);
    // Default to the most likely next step: put a broken locker back into service, or take a working one out.
    const [target, setTarget] = useState<Target>(current === 'MAINTENANCE' || current === 'DISABLED' ? 'AVAILABLE' : 'MAINTENANCE');
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

    useEffect(() => {
        setGpioPinInput(locker?.gpioPin != null ? String(locker.gpioPin) : '');
        setGpioFeedback(null);
    }, [locker?.id, locker?.gpioPin]);

    if (!locker) return <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 text-xs text-slate-400">Chọn một ngăn để xem chi tiết.</section>;
    const status = LOCKER_STATUS_CONFIG[current];
    const StatusIcon = status.icon;
    const active = !!locker.currentBooking;

    // Mirrors the server rule: only a healthy locker with its door sensor CLOSED may return to AVAILABLE.
    const availableChecks = [
        { ok: !active, text: 'Không có đơn đang hoạt động' },
        { ok: locker.doorState === 'CLOSED', text: locker.doorState === 'OPEN' ? 'Cảm biến báo cửa đang MỞ: đóng cửa ngăn (hoặc kiểm tra dây cảm biến) rồi thử lại' : locker.doorState === 'CLOSED' ? 'Cảm biến báo cửa đã đóng' : 'Chưa có dữ liệu cảm biến cửa' },
    ];
    const blockedToAvailable = target === 'AVAILABLE' && availableChecks.some(c => !c.ok);
    const sameStatus = target === current;

    async function unlock() {
        if (!locker || unlockReason.trim().length < 5 || unlocking) return;
        setUnlocking(true);
        setFeedback('');
        try {
            const res = await adminIncidentService.directRemoteUnlockLocker(locker.id, { reason: unlockReason.trim() });
            setFeedback(res.message || (res.success ? 'Máy chủ đã nhận yêu cầu; kiểm tra cửa thực tế.' : 'Yêu cầu thất bại.'));
            if (res.success) { setUnlockReason(''); onRefreshLockerTelemetry(); }
        } catch {
            setFeedback('Không gửi được yêu cầu mở khóa. Kiểm tra kết nối rồi thử lại.');
        } finally {
            setUnlocking(false);
        }
    }

    async function handleConfirmSwap() {
        if (!locker || isSwapping) return;
        setIsSwapping(true); setSwapSuccessMsg(null); setSwapErrorMsg(null);
        try {
            const res = await adminStationService.swapSpareLocker(locker.id, { reason: swapReason.trim(), openNewLocker });
            if (res.success && res.data) {
                setSwapSuccessMsg(res.data.message || `Đã đổi thành công sang ô dự phòng ${res.data.newLockerCode}!`);
                setShowSwapModal(false);
                onRefreshLockerTelemetry();
            } else {
                setSwapErrorMsg(res.message || 'Không thể đổi hộc dự phòng.');
            }
        } catch (err: unknown) {
            setSwapErrorMsg(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.');
        } finally {
            setIsSwapping(false);
        }
    }

    async function handleSaveGpio() {
        if (!locker || isSavingGpio) return;
        setIsSavingGpio(true); setGpioFeedback(null);
        try {
            const parsedPin = gpioPinInput.trim() === '' ? null : parseInt(gpioPinInput.trim(), 10);
            if (parsedPin !== null && (isNaN(parsedPin) || parsedPin < 0 || parsedPin > 48)) {
                setGpioFeedback('Chân GPIO phải là số nguyên từ 0 đến 48.');
                return;
            }
            const res = await adminStationService.updateLockerHardwareMapping(locker.id, { gpioPin: parsedPin, ioTDeviceId: locker.ioTDeviceId });
            if (res.success) { setGpioFeedback(`Đã lưu chân GPIO ${parsedPin != null ? parsedPin : 'mặc định'} thành công!`); onRefreshLockerTelemetry(); }
            else setGpioFeedback(res.message || 'Lỗi khi lưu cấu hình GPIO.');
        } catch {
            setGpioFeedback('Lỗi kết nối khi cập nhật chân GPIO.');
        } finally {
            setIsSavingGpio(false);
        }
    }

    const lastSeen = locker.lastSeenAt ? new Date(locker.lastSeenAt.endsWith('Z') ? locker.lastSeenAt : locker.lastSeenAt + 'Z').toLocaleTimeString('vi-VN') : 'Chưa có dữ liệu';
    const doorText = locker.doorState === 'OPEN' ? 'Đang mở' : locker.doorState === 'CLOSED' ? 'Đã đóng' : 'Chưa xác định';
    const facts: Array<{ label: string; value: ReactNode; className?: string }> = [
        { label: 'Cửa (cảm biến)', value: doorText, className: locker.doorState === 'OPEN' ? 'text-rose-600' : locker.doorState === 'CLOSED' ? 'text-emerald-700' : 'text-slate-400' },
        { label: 'Sức khỏe', value: locker.healthStatus },
        { label: 'Kết nối', value: locker.connectivityStatus || 'UNKNOWN', className: locker.connectivityStatus === 'ONLINE' ? 'text-emerald-700' : 'text-slate-500' },
        { label: 'Thiết bị IoT', value: locker.deviceCode || 'Chưa gắn', className: 'font-mono' },
        { label: 'Chân GPIO', value: locker.gpioPin != null ? `GPIO ${locker.gpioPin}` : 'Chưa gán', className: 'font-mono' },
        { label: 'Firmware', value: locker.firmwareVersion || '—', className: 'font-mono' },
        { label: 'Heartbeat', value: lastSeen },
        { label: 'Đơn hiện tại', value: locker.currentBooking?.bookingCode || 'Không có', className: 'font-mono text-blue-700' },
    ];

    return (
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight font-mono">{locker.lockerCode}</h3>
                    <p className="text-[11px] text-slate-400">Size {locker.size} · {stationName}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${status.badgeBg} ${status.badgeText} ${status.badgeBorder}`}>
                    <StatusIcon className="w-3.5 h-3.5" />{status.label}
                </span>
            </div>

            <div className="p-5 space-y-5">
                {swapSuccessMsg && <p className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{swapSuccessMsg}</p>}
                {swapErrorMsg && <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{swapErrorMsg}</p>}

                <div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                        {facts.map(fact => <div key={fact.label} className="contents">
                            <dt className="text-slate-400">{fact.label}</dt>
                            <dd className={`font-semibold text-right truncate ${fact.className ?? 'text-slate-800'}`}>{fact.value}</dd>
                        </div>)}
                    </dl>
                    {locker.notes && <p className="mt-2 text-[11px] text-slate-500 italic">Ghi chú: {locker.notes}</p>}
                    <button type="button" onClick={onRefreshLockerTelemetry} className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                        <RefreshCw className="w-3 h-3" />Đọc lại dữ liệu thiết bị
                    </button>
                </div>

                {/* Đổi trạng thái */}
                <form className="space-y-3 text-xs" onSubmit={e => {
                    e.preventDefault();
                    if (blockedToAvailable || sameStatus) return;
                    onUpdateStatusRequest({
                        businessStatus: target,
                        healthStatus: target === 'AVAILABLE' ? 'HEALTHY' : target === 'MAINTENANCE' ? 'WARNING' : 'CRITICAL',
                        reason: reason.trim(),
                    });
                }}>
                    <h4 className={sectionTitle}><Wrench className="w-3.5 h-3.5" />Đổi trạng thái ngăn</h4>
                    {active && <p className="text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px]">Ngăn đang có đơn hoạt động. Nếu ngăn bị kẹt, dùng "Đổi sang hộc dự phòng".</p>}
                    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Chuyển sang">
                        {(['AVAILABLE', 'MAINTENANCE', 'DISABLED'] as const).map(value => {
                            const meta = LOCKER_STATUS_CONFIG[value];
                            const chosen = target === value;
                            return <button type="button" key={value} role="radio" aria-checked={chosen} disabled={active || isUpdating} onClick={() => setTarget(value)}
                                className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition cursor-pointer disabled:opacity-40 ${chosen ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                {value === 'AVAILABLE' ? 'Khả dụng' : meta.label}
                            </button>;
                        })}
                    </div>

                    {target === 'AVAILABLE' && !sameStatus && <ul className="space-y-1.5">
                        {availableChecks.map(check => <li key={check.text} className={`flex items-start gap-1.5 text-[11px] ${check.ok ? 'text-emerald-700' : 'text-rose-700 font-semibold'}`}>
                            {check.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" /> : <XCircle className="w-3.5 h-3.5 shrink-0 mt-px" />}{check.text}
                        </li>)}
                    </ul>}
                    {sameStatus && <p className="text-[11px] text-slate-400">Ngăn đang ở trạng thái này.</p>}

                    <label className="block">
                        <span className="text-slate-500 font-medium">Lý do (tối thiểu 5 ký tự)</span>
                        <textarea aria-label="Lý do" className={input} rows={2} value={reason} onChange={e => setReason(e.target.value)}
                            maxLength={500} placeholder={target === 'AVAILABLE' ? 'Ví dụ: đã sửa cảm biến, kiểm tra cửa hoạt động bình thường' : 'Nhập lý do thay đổi...'} disabled={active || isUpdating} />
                    </label>
                    {statusError && <p role="alert" className="flex items-start gap-1.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />Máy chủ từ chối: {statusError}
                    </p>}
                    <button type="submit" disabled={active || isUpdating || sameStatus || blockedToAvailable || reason.trim().length < 5}
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-2.5 text-white font-bold shadow-sm shadow-blue-600/30 transition disabled:opacity-40 disabled:shadow-none cursor-pointer">
                        {isUpdating ? 'Đang cập nhật...' : 'Xác nhận đổi trạng thái'}
                    </button>
                </form>

                {/* UC-S12 */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                    <h4 className={sectionTitle}><ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />Kẹt cơ học</h4>
                    <p className="text-[11px] text-slate-500">Chốt kẹt hoặc cửa không bật: chuyển khách sang ngăn trống cùng cỡ {locker.size}.</p>
                    <button type="button" onClick={() => setShowSwapModal(true)}
                        className="w-full py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs font-bold hover:bg-amber-100 transition flex items-center justify-center gap-1.5 cursor-pointer">
                        <ArrowRightLeft className="w-4 h-4" />Đổi sang hộc dự phòng
                    </button>
                </div>

                {/* Mở khóa khẩn cấp */}
                <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
                    <h4 className={`${sectionTitle} !text-rose-600`}><Unlock className="w-3.5 h-3.5" />Mở khóa khẩn cấp</h4>
                    <textarea aria-label="Lý do mở khóa" className={input} rows={2} value={unlockReason} onChange={e => setUnlockReason(e.target.value)} maxLength={500} placeholder="Lý do mở khóa (tối thiểu 5 ký tự)" />
                    <button type="button" onClick={() => void unlock()} disabled={unlocking || unlockReason.trim().length < 5}
                        className="w-full rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-rose-700 font-bold hover:bg-rose-100 transition disabled:opacity-40 cursor-pointer">
                        {unlocking ? 'Đang gửi lệnh...' : 'Gửi lệnh mở chốt'}
                    </button>
                    {feedback && <p className="text-[11px] text-slate-600">{feedback}</p>}
                </div>

                {/* UC-A02 */}
                <details className="border-t border-slate-100 pt-4 text-xs group">
                    <summary className={`${sectionTitle} cursor-pointer list-none`}><Cpu className="w-3.5 h-3.5 text-indigo-600" />Ánh xạ chân GPIO
                        <span className="ml-auto font-mono normal-case tracking-normal text-indigo-700">{locker.gpioPin != null ? `GPIO ${locker.gpioPin}` : 'Chưa gán'}</span>
                    </summary>
                    <div className="mt-2 flex items-center gap-2">
                        <input type="number" min={0} max={48} placeholder="Số chân GPIO (vd: 26)" value={gpioPinInput} onChange={e => setGpioPinInput(e.target.value)}
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                        <button type="button" onClick={handleSaveGpio} disabled={isSavingGpio}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition text-xs disabled:opacity-50 cursor-pointer shrink-0">
                            {isSavingGpio ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                    {gpioFeedback && <p className={`mt-2 text-[11px] font-medium p-2 rounded-lg ${gpioFeedback.includes('thành công') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{gpioFeedback}</p>}
                </details>
            </div>

            {showSwapModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center"><ArrowRightLeft className="w-5 h-5" /></span>
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Đổi sang hộc dự phòng</h3>
                                <p className="text-[11px] text-slate-400">Xử lý kẹt solenoid / cửa không bật</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-3.5 text-xs text-slate-600">
                            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                                <p className="flex justify-between"><span className="text-slate-400">Ngăn bị kẹt</span><b className="font-mono text-slate-900">{locker.lockerCode} (Size {locker.size})</b></p>
                                <p className="flex justify-between"><span className="text-slate-400">Trạm</span><b className="text-slate-800">{stationName}</b></p>
                                <p className="flex justify-between"><span className="text-slate-400">Đơn đang gắn</span><b className="font-mono text-blue-700">{locker.currentBooking?.bookingCode || 'Không có'}</b></p>
                            </div>
                            <label className="block">
                                <span className="font-semibold text-slate-700">Lý do</span>
                                <textarea value={swapReason} onChange={e => setSwapReason(e.target.value)} rows={2} className={input} placeholder="Mô tả nguyên nhân kẹt..." />
                            </label>
                            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                <input type="checkbox" checked={openNewLocker} onChange={e => setOpenNewLocker(e.target.checked)} className="rounded text-amber-600 focus:ring-amber-500" />
                                <span className="font-medium text-slate-700">Mở ngay hộc dự phòng mới</span>
                            </label>
                        </div>
                        <div className="px-5 pb-5 flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setShowSwapModal(false)} disabled={isSwapping} className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">Hủy</button>
                            <button type="button" onClick={handleConfirmSwap} disabled={isSwapping || swapReason.trim().length < 5}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-xs cursor-pointer disabled:opacity-50">
                                {isSwapping ? 'Đang điều phối...' : 'Xác nhận đổi hộc'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
