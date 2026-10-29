import { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
interface Rating { stationId: string; stationName?: string; count: number; average: number }
export default function StationRatingSummary() {
  const [ratings, setRatings] = useState<Rating[] | null>(null);
  const [message, setMessage] = useState('');
  const load = async () => {
    try { setRatings((await apiClient.get<Rating[]>('/api/admin/traveler-support/ratings')).data); setMessage(''); }
    catch { setMessage('Không tải được điểm đánh giá trạm.'); }
  };
  useEffect(() => { void load(); }, []);
  return <section className="rounded-2xl border bg-white p-5 space-y-3">
    <div className="flex justify-between"><h2 className="font-bold">Đánh giá chất lượng trạm</h2><button onClick={() => void load()}>Tải lại</button></div>
    {message && <p role="status">{message}</p>}
    {!ratings && !message && <p>Đang tải đánh giá…</p>}
    {ratings?.length === 0 && <p>Chưa có đánh giá được gửi.</p>}
    {ratings?.map(item => <article key={item.stationId} className="border rounded p-3"><p>{item.stationName || item.stationId}</p><strong>{item.average.toFixed(1)}/5</strong><span> · {item.count} lượt đánh giá</span></article>)}
  </section>;
}
