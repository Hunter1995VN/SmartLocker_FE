import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface Review { stars: number; comment: string; criteria: string }
const criteriaOptions = [['CLEAN', 'Tủ sạch sẽ'], ['FAST', 'Mở khóa nhanh'], ['EASY_TO_FIND', 'Dễ tìm trạm']];

export default function StationReviewPanel({ bookingId, status }: { bookingId: string; status: string }) {
  const eligible = ['COMPLETED', 'COMPLETED_MANUAL'].includes(status);
  const [review, setReview] = useState<Review | null | undefined>();
  const [message, setMessage] = useState('');
  const [stars, setStars] = useState(5);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const base = `/api/bookings/${bookingId}/support`;
  useEffect(() => {
    let disposed = false;
    setReview(undefined); setMessage(''); setStars(5); setCriteria([]); setComment('');
    if (eligible) {
      void apiClient.get<{ review: Review | null }>(base)
        .then(response => { if (!disposed) setReview(response.data.review); })
        .catch(() => { if (!disposed) setMessage('Không tải được đánh giá. Vui lòng tải lại trang.'); });
    }
    return () => { disposed = true; };
  }, [base, eligible]);
  if (!eligible) return null;
  const submit = async () => {
    if (busy || review !== null) return;
    setBusy(true); setMessage('');
    try {
      await apiClient.post(`${base}/review`, { stars, comment, criteria });
      setReview((await apiClient.get<{ review: Review }>(base)).data.review);
      setMessage('Cảm ơn bạn đã đánh giá.');
    } catch (error) {
      setMessage((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Không gửi được đánh giá. Vui lòng thử lại.');
      // A concurrent submission may have won the unique BookingId constraint.
      try { setReview((await apiClient.get<{ review: Review | null }>(base)).data.review); } catch { /* Keep the original error visible. */ }
    } finally { setBusy(false); }
  };
  return <section className="bg-white border rounded-2xl p-6 space-y-4" aria-label="Đánh giá trạm">
    <h2 className="text-xl font-bold">Đánh giá trạm</h2>
    {message && <p role="status">{message}</p>}
    {review === undefined && !message && <p>Đang tải đánh giá…</p>}
    {review && <article><p>Đánh giá đã gửi: {review.stars}/5</p><p>{review.comment}</p>
      <p>{criteriaOptions.filter(([key]) => review.criteria.split(',').includes(key)).map(([, label]) => label).join(' · ')}</p>
    </article>}
    {review === null && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label>Số sao <select className="border p-2 rounded" value={stars} onChange={event => setStars(Number(event.target.value))}>
        {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} sao</option>)}
      </select></label>
      <div className="flex flex-wrap gap-4">{criteriaOptions.map(([key, label]) => <label key={key}>
        <input type="checkbox" checked={criteria.includes(key)} onChange={event => setCriteria(old => event.target.checked ? [...old, key] : old.filter(value => value !== key))} /> {label}
      </label>)}</div>
      <label className="block">Góp ý<textarea className="block border w-full p-2 rounded" maxLength={1000} value={comment} onChange={event => setComment(event.target.value)} /></label>
      <button disabled={busy} className="bg-blue-700 text-white px-4 py-2 rounded">{busy ? 'Đang gửi…' : 'Gửi đánh giá'}</button>
    </form>}
  </section>;
}
