import { useEffect, useState } from 'react';
import { Star, RefreshCw, AlertCircle } from 'lucide-react';
import apiClient from '../../../api/client';

interface Rating { stationId: string; stationName?: string; count: number; average: number }

const tone = (avg: number) => avg >= 4 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
  : avg >= 3 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200';

/** Admin/Staff: average stars per station from reviews travellers send after pickup. */
export default function StationRatingSummary() {
  const [ratings, setRatings] = useState<Rating[] | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { setRatings((await apiClient.get<Rating[]>('/api/admin/traveler-support/ratings')).data); setMessage(''); }
    catch { setMessage('Không tải được điểm đánh giá trạm.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const sorted = [...(ratings ?? [])].sort((a, b) => a.average - b.average || b.count - a.count);
  const total = sorted.reduce((sum, r) => sum + r.count, 0);
  const overall = total ? sorted.reduce((sum, r) => sum + r.average * r.count, 0) / total : 0;

  return <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4" aria-label="Đánh giá chất lượng trạm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />Đánh giá chất lượng trạm
        </h2>
        <p className="text-[11px] text-slate-400">Điểm sao khách chấm sau khi lấy đồ. Trạm điểm thấp xếp trước để ưu tiên xử lý.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer">
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />Tải lại
      </button>
    </div>

    {message && <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700"><AlertCircle className="w-4 h-4" />{message}</p>}
    {!ratings && !message && <div role="status" className="h-16 rounded-xl bg-slate-100 animate-pulse motion-reduce:animate-none" />}
    {ratings?.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Chưa có đánh giá nào được gửi.</p>}

    {!!sorted.length && <>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-slate-900 tracking-tight">{overall.toFixed(1)}</span>
        <span className="text-xs font-semibold text-slate-400">/ 5 trung bình · {total} lượt · {sorted.length} trạm</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {sorted.map(item => <li key={item.stationId} className="py-2.5 flex items-center gap-3">
          <span className="flex-1 min-w-0 text-xs font-semibold text-slate-800 truncate">{item.stationName || item.stationId}</span>
          <span className="hidden sm:block w-28 h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
            <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(item.average / 5) * 100}%` }} />
          </span>
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${tone(item.average)}`}>
            <Star className="w-3 h-3 fill-current" />{item.average.toFixed(1)}
          </span>
          <span className="shrink-0 w-14 text-right text-[11px] text-slate-400">{item.count} lượt</span>
        </li>)}
      </ul>
    </>}
  </section>;
}
