import { useState, useEffect, useMemo, useRef } from 'react';
import { Box, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import adminStationService, { type StationAdminDetailDto, type LockerGridItemDto, type UpdateLockerStatusRequest } from '../../../api/adminStationService';
import type { SizeReservationCounts } from '../../../api/kioskService';
import { KioskSignalRService } from '../../../services/kioskSignalR';
import { LOCKER_STATUS_CONFIG, normalizeLockerStatus } from './lockerStatusConstants';
import LockerBayGrid from './LockerBayGrid';
import LockerDetailControlPanel from './LockerDetailControlPanel';
import LockerStatusConfirmModal from './LockerStatusConfirmModal';

type Toast = { kind: 'success' | 'error'; text: string };

/** Server rejections come back as HTTP 400 with { message }; show that reason instead of a generic text. */
function serverMessage(error: unknown, fallback: string): string {
    const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
}

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
    const [pending, setPending] = useState<{ lockerId: string; request: UpdateLockerStatusRequest } | null>(null);
    const [updating, setUpdating] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);
    const [statusError, setStatusError] = useState('');
    const [refreshKey, refresh] = useState(0);
    const [stationKey, reloadStations] = useState(0);
    const refreshNow = useRef<() => void>(() => {});

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), 4500);
        return () => window.clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        let cancelled = false;
        void adminStationService.getStations().then(res => {
            if (cancelled) return;
            if (!res.success) throw new Error(res.message);
            setStations(res.data);
            setStationId(previous => res.data.some(s => s.id === previous) ? previous : res.data[0]?.id || '');
            if (!res.data.length) { setLockers([]); setReservations([]); setSelectedId(null); setPending(null); setLastRead(null); setError('Chưa có trạm để hiển thị.'); setLoading(false); }
        }).catch(() => { if (!cancelled) { setError('Không tải được danh sách trạm.'); setLoading(false); } });
        return () => { cancelled = true; };
    }, [stationKey]);

    useEffect(() => {
        let cancelled = false;
        let busy = false;
        let queued = false;
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
    const pendingLocker = lockers.find(l => l.id === pending?.lockerId) || null;
    const countOf = (status: string) => lockers.filter(l => normalizeLockerStatus(l.businessStatus) === status).length;

    async function confirm() {
        if (!pendingLocker || !pending || updating) return;
        const id = pending.lockerId;
        setUpdating(true); setStatusError('');
        try {
            const res = await adminStationService.updateLockerStatus(id, pending.request);
            if (res.success) setToast({ kind: 'success', text: res.message || 'Đã cập nhật trạng thái ngăn tủ.' });
            else { setStatusError(res.message || 'Máy chủ không chấp nhận thay đổi.'); setToast({ kind: 'error', text: res.message || 'Không cập nhật được trạng thái.' }); }
        } catch (err) {
            const text = serverMessage(err, 'Không cập nhật được trạng thái. Kiểm tra kết nối rồi thử lại.');
            setStatusError(text); setToast({ kind: 'error', text });
        } finally {
            setPending(null); setUpdating(false); refreshNow.current();
        }
    }

    function changeStation(id: string) {
        setLockers([]); setReservations([]); setSelectedId(null); setPending(null); setLastRead(null);
        setLoading(true); setStatusError(''); setStationId(id); setStatusFilter('all'); setSizeFilter('all');
    }

    const sizeCard = (size: 'S' | 'M' | 'L') => {
        const r = reservations.find(x => x.size === size);
        const total = lockers.filter(l => l.size === size).length;
        const free = lockers.filter(l => l.size === size && normalizeLockerStatus(l.businessStatus) === 'AVAILABLE').length;
        return <div key={size} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Size {size}</p>
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">{free}</span>
                        <span className="text-xs font-semibold text-slate-400">/ {total} ngăn trống</span>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-black">{size}</div>
            </div>
            <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                <span>Chờ thanh toán: <b className="text-slate-800">{r?.pendingPayment ?? 0}</b></span>
                <span>Chờ gửi: <b className="text-slate-800">{r?.awaitingDeposit ?? 0}</b></span>
                <span>Chưa cấp ngăn: <b className="text-slate-800">{r?.unassignedReservations ?? 0}</b></span>
                <span>Đang lưu đồ: <b className="text-slate-800">{r?.stored ?? 0}</b></span>
            </div>
        </div>;
    };

    return <div className="space-y-6">
        {toast && <div role={toast.kind === 'error' ? 'alert' : 'status'}
            className={`fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-2xl shadow-xl border flex items-start gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                toast.kind === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
            {toast.kind === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{toast.text}</span>
        </div>}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1">
                    Vận hành trạm / <span className="text-blue-600 font-bold">Lưới ô tủ</span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Sơ đồ tủ thời gian thực</h1>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />Trực tiếp
                    </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">Trạng thái từng ngăn S/M/L, tự cập nhật khi cửa đóng/mở và mỗi 5 giây.</p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Box className="w-4 h-4 text-slate-400" />
                    <select aria-label="Trạm điều khiển" value={stationId} onChange={e => changeStation(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        {!stations.length && <option value="">Chưa có trạm</option>}
                        {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </label>
                <button type="button" onClick={() => stations.length ? refresh(k => k + 1) : reloadStations(k => k + 1)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" />Làm mới
                </button>
            </div>
        </div>

        {error && <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"><AlertCircle className="w-4 h-4" />{error}</p>}

        <section aria-label="Đơn đặt theo kích thước" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['S', 'M', 'L'] as const).map(sizeCard)}
        </section>

        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5" aria-label="Lọc trạng thái">
                <button type="button" aria-pressed={statusFilter === 'all'} onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${statusFilter === 'all' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'text-slate-600 hover:bg-slate-50'}`}>
                    Tất cả <span className="opacity-70">{lockers.length}</span>
                </button>
                {Object.values(LOCKER_STATUS_CONFIG).map(status => {
                    const count = countOf(status.status);
                    const activeChip = statusFilter === status.status;
                    return <button type="button" key={status.status} aria-pressed={activeChip} onClick={() => setStatusFilter(status.status)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeChip ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : count ? 'text-slate-600 hover:bg-slate-50' : 'text-slate-300 hover:bg-slate-50'}`}>
                        <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />{status.label} <span className="opacity-70">{count}</span>
                    </button>;
                })}
            </div>
            <div className="flex p-1 rounded-xl bg-slate-100" aria-label="Lọc kích thước">
                {['all', 'S', 'M', 'L'].map(size => <button type="button" key={size} aria-pressed={sizeFilter === size} onClick={() => setSizeFilter(size)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${sizeFilter === size ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}>
                    {size === 'all' ? 'Mọi cỡ' : `Size ${size}`}
                </button>)}
            </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3">
                <LockerBayGrid lockers={filtered} selectedLocker={selected} onSelectLocker={l => { setSelectedId(l.id); setStatusError(''); }} isLoading={loading} stationName={selectedStation?.name} stationAddress={selectedStation?.address} />
            </div>
            <div className="lg:col-span-2">
                <LockerDetailControlPanel key={selected?.id} locker={selected} stationName={selectedStation?.name}
                    onUpdateStatusRequest={request => { if (selected) { setStatusError(''); setPending({ lockerId: selected.id, request }); } }}
                    isUpdating={updating} statusError={statusError} onRefreshLockerTelemetry={() => refreshNow.current()} />
            </div>
        </div>

        <p className="text-[11px] text-slate-400">
            Lần đọc gần nhất: {lastRead?.toLocaleTimeString('vi-VN') || 'chưa có'}. "Trống" chưa chắc đặt được ngay: còn phụ thuộc sức khỏe ngăn, cửa và kết nối thiết bị.
        </p>
        <LockerStatusConfirmModal locker={pendingLocker} pendingRequest={pending?.request || null} isOpen={!!pending} onClose={() => setPending(null)} onConfirm={confirm} isUpdating={updating} />
    </div>;
}
