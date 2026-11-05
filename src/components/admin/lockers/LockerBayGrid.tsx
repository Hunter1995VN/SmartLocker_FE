import type { LockerGridItemDto } from '../../../api/adminStationService';
import { LOCKER_STATUS_CONFIG, normalizeLockerStatus } from './lockerStatusConstants';
interface Props { lockers: LockerGridItemDto[]; selectedLocker: LockerGridItemDto | null;
    onSelectLocker: (locker: LockerGridItemDto) => void; isLoading: boolean; stationName?: string; stationAddress?: string }
export default function LockerBayGrid({ lockers, selectedLocker, onSelectLocker, isLoading, stationName, stationAddress }: Props) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Sơ đồ ngăn tủ">
        <h3 className="font-bold">{stationName || 'Trạm tủ'}</h3><p className="mb-4 text-sm text-slate-500">{stationAddress}</p>
        {isLoading ? <p role="status">Đang tải dữ liệu…</p> : lockers.length === 0 ? <p>Không có ngăn phù hợp.</p> :
            (['S', 'M', 'L'] as const).map(size => {
                const items = lockers.filter(l => l.size === size);
                return items.length > 0 && <div key={size} className="mb-5">
                    <h4 className="mb-2 font-semibold">Size {size} · {items.length} ngăn</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{items.map(locker => {
                        const status = LOCKER_STATUS_CONFIG[normalizeLockerStatus(locker.businessStatus)];
                        const Icon = status.icon;
                        return <button type="button" key={locker.id} onClick={() => onSelectLocker(locker)}
                            aria-pressed={selectedLocker?.id === locker.id}
                            className={`rounded-xl border p-3 text-left ${status.cardBg} ${status.cardBorder} ${selectedLocker?.id === locker.id ? 'ring-2 ring-blue-500' : ''}`}>
                            <strong className="block">{locker.lockerCode}</strong>
                            <span className={`flex items-center gap-1 text-sm ${status.badgeText}`}><Icon size={14}/>{status.label}</span>
                            <span className="block text-xs">Cửa: {locker.doorState} · {locker.connectivityStatus || 'UNKNOWN'}</span>
                            {locker.currentBooking && <span className="block text-xs">{locker.currentBooking.bookingCode}</span>}
                        </button>;
                    })}</div>
                </div>;
            })}
    </section>;
}
