import { kioskStateLabel } from '../../utils/kioskStateLabels';
import type { KioskLockerItem, KioskStationStatus } from '../../api/kioskService';
import type { KioskLanguage } from '../../utils/kioskI18n';

const words = {
  VI: { title: 'Tình trạng tủ', free: 'Trống', booked: 'Đã đặt', inUse: 'Đang dùng', blocked: 'Bảo trì', noLockers: 'Chưa nối ngăn tủ', doorOpen: 'Cửa đang mở', bookedHint: 'Đơn đã đặt hoặc đang chờ thanh toán', inUseHint: 'Đơn đang lưu đồ' },
  EN: { title: 'Locker availability', free: 'Free', booked: 'Booked', inUse: 'In use', blocked: 'Maintenance', noLockers: 'No compartments connected', doorOpen: 'Door open', bookedHint: 'Booked or awaiting payment', inUseHint: 'Items stored' },
  JA: { title: 'ロッカーの空き状況', free: '空き', booked: '予約済み', inUse: '使用中', blocked: '点検中', noLockers: '接続されたロッカーなし', doorOpen: '扉が開いています', bookedHint: '予約済みまたは支払い待ち', inUseHint: '保管中' },
  KO: { title: '보관함 현황', free: '빈 칸', booked: '예약됨', inUse: '사용 중', blocked: '점검 중', noLockers: '연결된 보관함 없음', doorOpen: '문 열림', bookedHint: '예약 또는 결제 대기', inUseHint: '보관 중' },
  ZH: { title: '柜位状态', free: '空闲', booked: '已预订', inUse: '使用中', blocked: '维护中', noLockers: '暂无已连接柜位', doorOpen: '柜门已打开', bookedHint: '已预订或待付款', inUseHint: '存放中' },
};

type Tone = 'free' | 'booked' | 'inUse' | 'blocked';
const toneStyle: Record<Tone, { tile: string; dot: string }> = {
  free: { tile: 'bg-emerald-500 border-emerald-600', dot: 'bg-emerald-500' },
  booked: { tile: 'bg-amber-400 border-amber-500', dot: 'bg-amber-400' },
  inUse: { tile: 'bg-sky-600 border-sky-700', dot: 'bg-sky-600' },
  blocked: { tile: 'bg-slate-300 border-slate-400 dark:bg-slate-700 dark:border-slate-600', dot: 'bg-slate-400' },
};

function toneOf(locker: KioskLockerItem): Tone {
  if (locker.healthStatus === 'FAULTY' || locker.businessStatus === 'MAINTENANCE') return 'blocked';
  if (locker.businessStatus === 'OCCUPIED') return 'inUse';
  if (locker.businessStatus === 'RESERVED') return 'booked';
  return locker.businessStatus === 'AVAILABLE' ? 'free' : 'blocked';
}

export default function KioskLockerStatus({ status, lang, activeLockerId }: {
  status: KioskStationStatus | null; lang: KioskLanguage; activeLockerId?: string;
}) {
  const t = words[lang];
  const label = (value: string) => kioskStateLabel(lang, value);
  const online = status?.connectivityStatus === 'ONLINE';

  return <section aria-label={t.title} className="w-full p-5 space-y-4">
    <header className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-black">{t.title}</h2>
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
        <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse motion-reduce:animate-none' : 'bg-amber-500'}`} />
        {label(status?.connectivityStatus || 'UNKNOWN')}
      </span>
    </header>

    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400" aria-hidden="true">
      {(['free', 'booked', 'inUse', 'blocked'] as const).map(tone => <li key={tone} className="flex items-center gap-1.5">
        <span className={`w-3 h-3 rounded-[4px] ${toneStyle[tone].dot}`} />{t[tone]}
      </li>)}
    </ul>

    {(['S', 'M', 'L'] as const).map((size, index) => {
      const lockers = status?.lockers.filter(l => l.size === size) ?? [];
      const counts = status?.reservations?.find(r => r.size === size);
      // Bookings come from the server's order counts; free/maintenance only from compartments it reports.
      const booked = Math.max((counts?.pendingPayment ?? 0) + (counts?.awaitingDeposit ?? 0) + (counts?.unassignedReservations ?? 0), lockers.filter(l => toneOf(l) === 'booked').length);
      const inUse = Math.max(counts?.stored ?? 0, lockers.filter(l => toneOf(l) === 'inUse').length);
      const free = lockers.filter(l => toneOf(l) === 'free').length;
      const chips = ([
        lockers.length > 0 && { tone: 'free' as Tone, n: free, title: t.free },
        { tone: 'booked' as Tone, n: booked, title: t.bookedHint },
        { tone: 'inUse' as Tone, n: inUse, title: t.inUseHint },
      ].filter(Boolean) as Array<{ tone: Tone; n: number; title: string }>);
      const busy = booked + inUse > 0;

      return <article key={size} style={{ animationDelay: `${200 + index * 70}ms` }}
        className="kiosk-enter rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 flex gap-3.5 items-start">
        <span className={`shrink-0 grid place-items-center w-12 h-12 rounded-xl text-2xl font-black ${busy ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
          {size}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-1.5" aria-label={`${size}: ${chips.map(c => `${c.title} ${c.n}`).join(', ')}`}>
            {chips.map(chip => <span key={chip.tone} title={chip.title}
              className={`inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded-full text-sm font-bold tabular-nums ${chip.n > 0 ? 'bg-slate-100 dark:bg-slate-800' : 'opacity-40'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${toneStyle[chip.tone].dot}`} />
              {chip.n}<span className="font-medium text-slate-500 dark:text-slate-400">{t[chip.tone]}</span>
            </span>)}
          </div>

          {lockers.length > 0
            ? <div className="flex flex-wrap gap-1.5">
              {lockers.map(locker => {
                const tone = toneOf(locker);
                const open = locker.doorState === 'OPEN';
                const offline = locker.connectivityStatus && locker.connectivityStatus !== 'ONLINE';
                const active = activeLockerId === locker.lockerId;
                return <span key={locker.lockerId}
                  title={`${locker.lockerCode}: ${label(locker.businessStatus)}${open ? `, ${t.doorOpen}` : ''}`}
                  className={`relative w-11 h-14 rounded-lg border-2 grid place-items-end justify-center pb-1 text-xs font-bold text-white/95 overflow-hidden ${toneStyle[tone].tile} ${offline ? 'opacity-50 border-dashed' : ''} ${active ? 'ring-4 ring-sky-300 animate-pulse motion-reduce:animate-none' : ''}`}>
                  {/* Handle; when the sensor reports the door open the panel shows a dark gap */}
                  <span className={`absolute top-1/2 -translate-y-1/2 right-1 h-4 w-1 rounded-full bg-white/70 ${open ? 'hidden' : ''}`} />
                  {open && <span className="absolute inset-y-0 left-0 w-1/3 bg-slate-900/70" aria-hidden="true" />}
                  <span className="relative">{locker.lockerCode.replace(/^[SML]-?/, '')}</span>
                </span>;
              })}
            </div>
            : <p className="text-xs text-slate-400">{t.noLockers}</p>}
        </div>
      </article>;
    })}
  </section>;
}
