import { useState } from 'react';
import type { LockerGridItemDto, UpdateLockerStatusRequest } from '../../../api/adminStationService';
import adminIncidentService from '../../../api/adminIncidentService';
import { LOCKER_STATUS_CONFIG, normalizeLockerStatus } from './lockerStatusConstants';
interface Props { locker: LockerGridItemDto | null; stationName?: string;
    onUpdateStatusRequest: (request: UpdateLockerStatusRequest) => void; isUpdating: boolean; onRefreshLockerTelemetry: () => void }
export default function LockerDetailControlPanel({ locker, stationName, onUpdateStatusRequest, isUpdating, onRefreshLockerTelemetry }: Props) {
    const [target, setTarget] = useState<'AVAILABLE' | 'MAINTENANCE' | 'DISABLED'>('MAINTENANCE');
    const [reason, setReason] = useState('');
    const [unlockReason, setUnlockReason] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const [feedback, setFeedback] = useState('');
    if (!locker) return <p className="rounded-2xl border bg-white p-5">Chọn ngăn để xem dữ liệu.</p>;
    const status = LOCKER_STATUS_CONFIG[normalizeLockerStatus(locker.businessStatus)];
    const active = !!locker.currentBooking;
    async function unlock() {
        if (!locker || unlockReason.trim().length < 5 || unlocking) return;
        setUnlocking(true); setFeedback('');
        try {
            const res = await adminIncidentService.directRemoteUnlockLocker(locker.id, { reason: unlockReason.trim() });
            setFeedback(res.message || (res.success ? 'Máy chủ đã nhận yêu cầu; kiểm tra cửa thực tế.' : 'Yêu cầu thất bại.'));
            if (res.success) { setUnlockReason(''); onRefreshLockerTelemetry(); }
        } catch { setFeedback('Không gửi được yêu cầu mở khóa. Kiểm tra kết nối rồi thử lại.'); }
        finally { setUnlocking(false); }
    }
    return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold">{locker.lockerCode} · Size {locker.size}</h3><p>{stationName}</p>
        <p className={status.badgeText}>{status.label} ({locker.businessStatus})</p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt>Cửa</dt><dd>{locker.doorState === 'CLOSED' ? 'Đã đóng' : locker.doorState === 'OPEN' ? 'Đang mở' : 'Chưa xác định'}</dd>
            <dt>Sức khỏe</dt><dd>{locker.healthStatus}</dd>
            <dt>Kết nối</dt><dd>{locker.connectivityStatus || 'UNKNOWN'}</dd>
            <dt>Thiết bị</dt><dd>{locker.deviceCode || 'Chưa ánh xạ'}</dd>
            <dt>Firmware</dt><dd>{locker.firmwareVersion || 'Chưa có dữ liệu'}</dd>
            <dt>Heartbeat</dt><dd>{locker.lastSeenAt ? new Date(locker.lastSeenAt.endsWith('Z') ? locker.lastSeenAt : locker.lastSeenAt + 'Z').toLocaleString('vi-VN') : 'Chưa có dữ liệu'}</dd>
            <dt>Đơn hiện tại</dt><dd>{locker.currentBooking?.bookingCode || 'Không có'}</dd>
            <dt>Ghi chú</dt><dd>{locker.notes || '—'}</dd>
        </dl>
        <button type="button" className="text-blue-700 underline" onClick={onRefreshLockerTelemetry}>Đọc lại dữ liệu</button>
        <form className="space-y-3 border-t pt-4" onSubmit={e => { e.preventDefault(); onUpdateStatusRequest({ businessStatus: target,
            healthStatus: target === 'AVAILABLE' ? 'HEALTHY' : target === 'MAINTENANCE' ? 'WARNING' : 'CRITICAL', reason: reason.trim() }); }}>
            <h4 className="font-semibold">Quản lý trạng thái</h4>
            {active && <p role="status">Ngăn đang có đơn hoạt động. Xử lý qua luồng sự cố của đơn.</p>}
            <label className="block">Trạng thái<select aria-label="Trạng thái" className="block w-full rounded border p-2" value={target} onChange={e => setTarget(e.target.value as typeof target)} disabled={active || isUpdating}>
                <option value="MAINTENANCE">Bảo trì</option><option value="DISABLED">Vô hiệu hóa</option><option value="AVAILABLE">Khả dụng (tủ khỏe, cửa đóng)</option>
            </select></label>
            <label className="block">Lý do<textarea aria-label="Lý do" className="block w-full rounded border p-2" value={reason} onChange={e => setReason(e.target.value)} required minLength={5} maxLength={500} disabled={active || isUpdating}/></label>
            <button type="submit" disabled={active || isUpdating || reason.trim().length < 5} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Xác nhận thay đổi</button>
        </form>
        <div className="space-y-3 border-t pt-4">
            <h4 className="font-semibold">Mở khóa khẩn cấp</h4>
            <label className="block">Lý do mở khóa<textarea aria-label="Lý do mở khóa" className="block w-full rounded border p-2" value={unlockReason} onChange={e => setUnlockReason(e.target.value)} maxLength={500}/></label>
            <button type="button" onClick={() => void unlock()} disabled={unlocking || unlockReason.trim().length < 5} className="rounded border border-red-500 px-4 py-2 text-red-700 disabled:opacity-50">{unlocking ? 'Đang gửi…' : 'Gửi yêu cầu mở khóa'}</button>
            {feedback && <p role="status">{feedback}</p>}
        </div>
    </section>;
}
