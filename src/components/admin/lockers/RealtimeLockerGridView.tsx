import { useState, useEffect, useMemo, useRef } from 'react';
import adminStationService, { type StationAdminDetailDto, type LockerGridItemDto, type UpdateLockerStatusRequest } from '../../../api/adminStationService';
import type { SizeReservationCounts } from '../../../api/kioskService';
import { KioskSignalRService } from '../../../services/kioskSignalR';
import { LOCKER_STATUS_CONFIG, normalizeLockerStatus } from './lockerStatusConstants';
import LockerBayGrid from './LockerBayGrid';
import LockerDetailControlPanel from './LockerDetailControlPanel';
import LockerStatusConfirmModal from './LockerStatusConfirmModal';

export default function RealtimeLockerGridView() {
    const [stations, setStations] = useState<StationAdminDetailDto[]>([]);
    const [stationId, setStationId] = useState('');
    const [reservations, setReservations] = useState<SizeReservationCounts[]>([]);
    const [lockers, setLockers] = useState<LockerGridItemDto[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [sizeFilter, setSizeFilter] = useState('all');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [lastRead, setLastRead] = useState<Date | null>(null);
    const [pending, setPending] = useState<UpdateLockerStatusRequest | null>(null);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState('');
    const [refreshKey, refresh] = useState(0);
    const [stationKey, reloadStations] = useState(0);
    const refreshNow = useRef<() => void>(() => {});
    useEffect(() => {
        let cancelled = false;
        void adminStationService.getStations().then(res => {
            if (cancelled) return;
            if (!res.success) throw new Error(res.message);
            setStations(res.data);
            setStationId(previous => res.data.some(s => s.id === previous) ? previous : res.data[0]?.id || '');
            if (!res.data.length) { setError('Chưa có trạm để hiển thị.'); setLoading(false); }
        }).catch(() => { if (!cancelled) { setError('Không tải được danh sách trạm.'); setLoading(false); } });
        return () => { cancelled = true; };
    }, [stationKey]);
    useEffect(() => {
        let cancelled = false;
        let busy = false;
        let queued = false;
        setLockers([]); setReservations([]); setSelectedId(null); setPending(null); setLastRead(null); setLoading(!!stationId);
        if (!stationId) return;
        async function read() {
            if (cancelled) return;
            if (busy) { queued = true; return; }
            busy = true;
            try {
                const [response, counts] = await Promise.all([adminStationService.getStationLockersGrid(stationId), adminStationService.getReservations(stationId)]);
                if (cancelled) return;
                if (!response.success) throw new Error(response.message);
                setLockers(response.data); setReservations(counts); setLastRead(new Date()); setError('');
                setSelectedId(id => response.data.some(l => l.id === id) ? id : response.data[0]?.id || null);
            } catch {
                if (!cancelled) { setLockers([]); setReservations([]); setSelectedId(null); setError('Mất kết nối dữ liệu. Đang thử lại; chưa thể xác nhận trạng thái hiện tại.'); }
            } finally {
                busy = false;
                if (!cancelled) { setLoading(false); if (queued) { queued = false; void read(); } }
            }
        }
        refreshNow.current = () => void read();
        void read();
        // A private connection prevents Admin station changes from disconnecting a Kiosk session.
        const realtime = new KioskSignalRService();
        const onEvent = () => void read();
        void realtime.connect(stationId, onEvent, onEvent, onEvent);
        const timer = window.setInterval(onEvent, 5000);
        return () => { cancelled = true; clearInterval(timer); refreshNow.current = () => {}; void realtime.disconnect(); };
    }, [stationId, refreshKey]);
    const selectedStation = stations.find(s => s.id === stationId);
    const selected = lockers.find(l => l.id === selectedId) || null;
    const filtered = useMemo(() => lockers.filter(l => (statusFilter === 'all' || normalizeLockerStatus(l.businessStatus) === statusFilter) && (sizeFilter === 'all' || l.size === sizeFilter)), [lockers, statusFilter, sizeFilter]);
    async function confirm() {
        if (!selected || !pending || updating) return;
        const id = selected.id;
        setUpdating(true); setMessage('');
        try {
            const res = await adminStationService.updateLockerStatus(id, pending);
            setMessage(res.message);
            if (res.success) { setPending(null); refreshNow.current(); }
        } catch { setMessage('Không cập nhật được trạng thái. Kiểm tra lại dữ liệu.'); }
        finally { setUpdating(false); }
    }
    return <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold">Sơ đồ tủ thời gian thực</h2><p className="text-sm text-slate-500">Đọc trạng thái trạm và từng ngăn S/M/L. Tự đồng bộ khi có sự kiện và mỗi 5 giây.</p></div>
            <label>Trạm<select aria-label="Trạm điều khiển" className="ml-2 rounded border p-2" value={stationId} onChange={e => { setStationId(e.target.value); setStatusFilter('all'); setSizeFilter('all'); }}>
                {!stations.length && <option value="">Chưa có trạm</option>}
                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>
            <button type="button" className="rounded border px-4 py-2" onClick={() => stations.length ? refresh(k => k + 1) : reloadStations(k => k + 1)}>Làm mới</button>
        </header>
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
        {message && <p role="status">{message}</p>}
        <section aria-label="Đơn đặt theo kích thước" className="grid gap-3 sm:grid-cols-3">{reservations.map(r => <div key={r.size} className="rounded-xl border bg-white p-3">
            <h3 className="font-bold">Size {r.size}</h3><p>Chờ thanh toán: {r.pendingPayment}</p><p>Đã đặt, chờ gửi: {r.awaitingDeposit}</p>
            <p className="text-sm text-slate-500">Chưa cấp ngăn: {r.unassignedReservations}</p><p>Đang lưu đồ: {r.stored}</p>
        </div>)}</section>
        <div className="flex flex-wrap gap-2" aria-label="Lọc trạng thái">
            <button type="button" aria-pressed={statusFilter === 'all'} onClick={() => setStatusFilter('all')} className="rounded border p-3">Tất cả ({lockers.length})</button>
            {Object.values(LOCKER_STATUS_CONFIG).map(status => <button type="button" key={status.status}
                aria-pressed={statusFilter === status.status} onClick={() => setStatusFilter(status.status)}
                className={`rounded border p-3 ${status.badgeBg} ${status.badgeText} ${statusFilter === status.status ? 'ring-2 ring-blue-500' : ''}`}>
                {status.label} ({lockers.filter(l => normalizeLockerStatus(l.businessStatus) === status.status).length})
            </button>)}
        </div>
        <div className="flex gap-3" aria-label="Lọc kích thước">{['all', 'S', 'M', 'L'].map(size => <button type="button" key={size} aria-pressed={sizeFilter === size} onClick={() => setSizeFilter(size)} className={`rounded border px-3 py-1 ${sizeFilter === size ? 'bg-blue-700 text-white' : ''}`}>{size === 'all' ? 'Mọi kích thước' : `Size ${size}`}</button>)}</div>
        <div className="grid gap-5 lg:grid-cols-2">
            <LockerBayGrid lockers={filtered} selectedLocker={selected} onSelectLocker={l => setSelectedId(l.id)} isLoading={loading} stationName={selectedStation?.name} stationAddress={selectedStation?.address}/>
            <LockerDetailControlPanel key={selected?.id} locker={selected} stationName={selectedStation?.name} onUpdateStatusRequest={setPending} isUpdating={updating} onRefreshLockerTelemetry={() => refreshNow.current()}/>
        </div>
        <p className="text-xs text-slate-500">Lần đọc thành công gần nhất: {lastRead?.toLocaleString('vi-VN') || 'Chưa có'}. Trống không đồng nghĩa với đủ điều kiện đặt: còn phụ thuộc sức khỏe, cửa và kết nối thiết bị.</p>
        <LockerStatusConfirmModal locker={selected} pendingRequest={pending} isOpen={!!pending} onClose={() => setPending(null)} onConfirm={confirm} isUpdating={updating}/>
    </div>;
}
