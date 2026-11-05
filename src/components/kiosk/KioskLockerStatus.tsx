import { kioskStateLabel } from '../../utils/kioskStateLabels';
import type { KioskStationStatus } from '../../api/kioskService';
import type { KioskLanguage } from '../../utils/kioskI18n';

const words = {
  VI: { title: 'Trạng thái ngăn tủ', pending: 'Chờ thanh toán', reservedOrders: 'Đã đặt, chờ gửi', unassigned: 'Chưa cấp ngăn', storedOrders: 'Đang lưu đồ', empty: 'Chưa cấu hình ngăn tủ', door: 'Cửa', UNKNOWN: 'Chưa xác định', OPEN: 'Mở', CLOSED: 'Đóng', ONLINE: 'Kết nối', OFFLINE: 'Mất kết nối', AVAILABLE: 'Trống', RESERVED: 'Đã giữ chỗ', OCCUPIED: 'Đang sử dụng', MAINTENANCE: 'Bảo trì', HEALTHY: 'Bình thường', WARNING: 'Cần kiểm tra', FAULTY: 'Lỗi' },
  EN: { title: 'Locker status', pending: 'Awaiting payment', reservedOrders: 'Booked, awaiting deposit', unassigned: 'Unassigned', storedOrders: 'Stored', empty: 'No compartment configured', door: 'Door', UNKNOWN: 'Unknown', OPEN: 'Open', CLOSED: 'Closed', ONLINE: 'Online', OFFLINE: 'Offline', AVAILABLE: 'Available', RESERVED: 'Reserved', OCCUPIED: 'Occupied', MAINTENANCE: 'Maintenance', HEALTHY: 'Healthy', WARNING: 'Check required', FAULTY: 'Faulty' },
  JA: { title: 'ロッカー状態', pending: '支払い待ち', reservedOrders: '予約済み・預入待ち', unassigned: '未割り当て', storedOrders: '保管中', empty: '未設定', door: '扉', UNKNOWN: '不明', OPEN: '開', CLOSED: '閉', ONLINE: '接続中', OFFLINE: '未接続', AVAILABLE: '空き', RESERVED: '予約済み', OCCUPIED: '使用中', MAINTENANCE: '点検中', HEALTHY: '正常', WARNING: '要確認', FAULTY: '故障' },
  KO: { title: '보관함 상태', pending: '결제 대기', reservedOrders: '예약 완료·보관 대기', unassigned: '미배정', storedOrders: '보관 중', empty: '설정된 보관함 없음', door: '문', UNKNOWN: '알 수 없음', OPEN: '열림', CLOSED: '닫힘', ONLINE: '온라인', OFFLINE: '오프라인', AVAILABLE: '이용 가능', RESERVED: '예약됨', OCCUPIED: '사용 중', MAINTENANCE: '점검 중', HEALTHY: '정상', WARNING: '확인 필요', FAULTY: '고장' },
  ZH: { title: '储物柜状态', pending: '待付款', reservedOrders: '已预订·待存放', unassigned: '未分配柜位', storedOrders: '存放中', empty: '尚未配置', door: '柜门', UNKNOWN: '未知', OPEN: '打开', CLOSED: '关闭', ONLINE: '在线', OFFLINE: '离线', AVAILABLE: '空闲', RESERVED: '已预订', OCCUPIED: '使用中', MAINTENANCE: '维护中', HEALTHY: '正常', WARNING: '需检查', FAULTY: '故障' },
};

export default function KioskLockerStatus({ status, lang, activeLockerId }: {
  status: KioskStationStatus | null; lang: KioskLanguage; activeLockerId?: string;
}) {
  const t = words[lang];
  const label = (value: string) => kioskStateLabel(lang,value);
  return <section aria-label={t.title} className="w-full p-5 space-y-3">
    <h2 className="text-lg font-bold">{t.title}</h2>
    <p className="text-sm">{status?.stationName || t.UNKNOWN} · {label(status?.connectivityStatus || 'UNKNOWN')}</p>
    {(['S', 'M', 'L'] as const).map(size => <div key={size} className="rounded-xl border border-slate-400/40 p-3">
      <h3 className="text-xl font-black mb-2">{size}</h3>
      {status?.reservations?.filter(r => r.size === size).map(r => <div key={r.size} className="mb-3 text-sm" data-testid={`reservations-${size}`}>
        <p>{t.pending}: {r.pendingPayment}</p><p>{t.reservedOrders}: {r.awaitingDeposit}</p>
        <p>{t.unassigned}: {r.unassignedReservations} · {t.storedOrders}: {r.stored}</p>
      </div>)}
      {status?.lockers.filter(l => l.size === size).map(locker => <div key={locker.lockerId}
        className={`rounded-lg p-3 mb-2 border text-slate-900 ${locker.businessStatus === 'AVAILABLE' ? 'border-emerald-300 bg-emerald-50' : locker.businessStatus === 'RESERVED' ? 'border-amber-300 bg-amber-50' : locker.businessStatus === 'OCCUPIED' ? 'border-rose-300 bg-rose-50' : 'border-slate-300 bg-slate-100'} ${activeLockerId === locker.lockerId ? 'ring-2 ring-blue-500' : ''}`}>
        <strong>{locker.lockerCode}</strong>
        <p className="text-sm">{label(locker.businessStatus)} · {label(locker.healthStatus)}</p>
        <p className="text-sm">{t.door}: {label(locker.doorState)} · {label(locker.connectivityStatus || 'UNKNOWN')}</p>
      </div>)}
      {!status?.lockers.some(l => l.size === size) && <p className="text-sm opacity-70">{t.empty}</p>}
    </div>)}
  </section>;
}
