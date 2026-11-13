import { DoorOpen, DoorClosed, HelpCircle } from 'lucide-react';
import type { LockerGridItemDto } from '../../../api/adminStationService';
import { LOCKER_STATUS_CONFIG, normalizeLockerStatus } from './lockerStatusConstants';

interface Props { lockers: LockerGridItemDto[]; selectedLocker: LockerGridItemDto | null;
    onSelectLocker: (locker: LockerGridItemDto) => void; isLoading: boolean; stationName?: string; stationAddress?: string }

const doorIcon = (door: string) => door === 'OPEN'
    ? <DoorOpen className="w-3.5 h-3.5 text-rose-500" />
    : door === 'CLOSED' ? <DoorClosed className="w-3.5 h-3.5 text-slate-400" /> : <HelpCircle className="w-3.5 h-3.5 text-slate-300" />;
const doorLabel = (door: string) => door === 'OPEN' ? 'Cửa mở' : door === 'CLOSED' ? 'Cửa đóng' : 'Cửa ?';

export default function LockerBayGrid({ lockers, selectedLocker, onSelectLocker, isLoading, stationName, stationAddress }: Props) {
    return <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5" aria-label="Sơ đồ ngăn tủ">
        <div className="mb-4">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{stationName || 'Trạm tủ'}</h3>
            <p className="text-[11px] text-slate-400">{stationAddress}</p>
        </div>
        {isLoading ? <div role="status" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse motion-reduce:animate-none" />)}
        </div> : lockers.length === 0 ? <p className="py-10 text-center text-xs text-slate-400">Không có ngăn nào khớp bộ lọc.</p> :
            <div className="space-y-5">{(['S', 'M', 'L'] as const).map(size => {
                const items = lockers.filter(l => l.size === size);
                if (!items.length) return null;
                return <div key={size}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white text-[11px] font-black flex items-center justify-center">{size}</span>
                        <span className="text-xs font-bold text-slate-700">{items.length} ngăn</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">{items.map(locker => {
                        const status = LOCKER_STATUS_CONFIG[normalizeLockerStatus(locker.businessStatus)];
                        const Icon = status.icon;
                        const isSelected = selectedLocker?.id === locker.id;
                        const online = locker.connectivityStatus === 'ONLINE';
                        const orphan = !locker.currentBooking && ['OCCUPIED', 'RESERVED'].includes(locker.businessStatus);
                        return <button type="button" key={locker.id} onClick={() => onSelectLocker(locker)} aria-pressed={isSelected}
                            className={`group relative rounded-xl border p-3 text-left transition cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${status.cardBg} ${status.cardBorder} ${
                                isSelected ? 'ring-2 ring-blue-600 ring-offset-1 shadow-md' : ''}`}>
                            <span title={online ? 'Thiết bị online' : 'Thiết bị offline / chưa gắn'}
                                className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className="block font-mono text-sm font-black text-slate-900 pr-3 truncate">{locker.lockerCode}</span>
                            <span className={`mt-1 flex items-center gap-1 text-[11px] font-bold ${status.badgeText}`}><Icon className="w-3.5 h-3.5" />{status.label}</span>
                            <span className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-slate-500">{doorIcon(locker.doorState)}{doorLabel(locker.doorState)}</span>
                            {locker.currentBooking && <span className="mt-1 block font-mono text-[10px] font-bold text-blue-700 truncate">{locker.currentBooking.bookingCode}</span>}
                            {orphan && <span className="mt-1 block text-[10px] font-semibold text-amber-700">Cần đối soát đơn</span>}
                        </button>;
                    })}</div>
                </div>;
            })}</div>}
    </section>;
}
