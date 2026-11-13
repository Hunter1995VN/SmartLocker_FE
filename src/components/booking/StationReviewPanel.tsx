import { useEffect, useState } from 'react';
import { Star, Sparkles, Zap, MapPin, CheckCircle2, AlertCircle, MessageSquareText } from 'lucide-react';
import apiClient from '../../api/client';
import Stars from './ReviewStars';

interface Review { stars: number; comment: string; criteria: string }

const CRITERIA = [
  { key: 'CLEAN', label: 'Tủ sạch sẽ', icon: Sparkles },
  { key: 'FAST', label: 'Mở khóa nhanh', icon: Zap },
  { key: 'EASY_TO_FIND', label: 'Dễ tìm trạm', icon: MapPin },
] as const;
const STAR_LABELS = ['', 'Rất tệ', 'Chưa tốt', 'Bình thường', 'Tốt', 'Tuyệt vời'];
const MAX_COMMENT = 1000;

/**
 * UC: rate the station after pickup. Only COMPLETED / COMPLETED_MANUAL bookings can be rated, once.
 * The server re-checks ownership, status, check-out time, stars 1–5, comment length and criteria.
 */
export default function StationReviewPanel({ bookingId, status, stationName }: { bookingId: string; status: string; stationName?: string }) {
  const eligible = ['COMPLETED', 'COMPLETED_MANUAL'].includes(status);
  const [review, setReview] = useState<Review | null | undefined>();
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [justSent, setJustSent] = useState(false);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const base = `/api/bookings/${bookingId}/support`;

  useEffect(() => {
    let disposed = false;
    setReview(undefined); setLoadError(''); setSubmitError(''); setJustSent(false); setStars(0); setCriteria([]); setComment('');
    if (eligible) {
      void apiClient.get<{ review: Review | null }>(base)
        .then(response => { if (!disposed) setReview(response.data.review ?? null); })
        .catch(() => { if (!disposed) setLoadError('Không tải được đánh giá. Vui lòng tải lại trang.'); });
    }
    return () => { disposed = true; };
  }, [base, eligible]);

  if (!eligible) return null;

  const submit = async () => {
    if (busy || review !== null || stars < 1) return;
    setBusy(true); setSubmitError('');
    try {
      await apiClient.post(`${base}/review`, { stars, comment: comment.trim(), criteria });
      setReview((await apiClient.get<{ review: Review }>(base)).data.review);
      setJustSent(true);
    } catch (error) {
      setSubmitError((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Không gửi được đánh giá. Vui lòng thử lại.');
      // A concurrent submission may have won the unique BookingId constraint.
      try { setReview((await apiClient.get<{ review: Review | null }>(base)).data.review ?? null); } catch { /* Keep the original error visible. */ }
    } finally { setBusy(false); }
  };

  const shown = hover || stars;
  const toggle = (key: string) => setCriteria(old => old.includes(key) ? old.filter(v => v !== key) : [...old, key]);

  return <section id="review" aria-label="Đánh giá trạm" className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-6 sm:p-7 relative overflow-hidden scroll-mt-24">
    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-400" />

    <div className="flex items-start justify-between gap-4 border-b border-outline-variant/20 pb-4 mb-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
          <h2 className="text-xl font-bold text-[#0b1c30]">Đánh giá trạm</h2>
        </div>
        <p className="text-xs text-[#434655]">
          {review ? 'Cảm ơn bạn đã chia sẻ trải nghiệm.' : `Trải nghiệm gửi đồ tại ${stationName || 'trạm'} thế nào? Đánh giá giúp trạm phục vụ tốt hơn.`}
        </p>
      </div>
      {review && <span className="hidden sm:inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5" />Đã đánh giá
      </span>}
    </div>

    {loadError && <p role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700"><AlertCircle className="w-4 h-4" />{loadError}</p>}

    {review === undefined && !loadError && <div role="status" className="space-y-3">
      <div className="h-8 w-48 rounded-lg bg-slate-100 animate-pulse motion-reduce:animate-none" />
      <div className="h-20 rounded-xl bg-slate-100 animate-pulse motion-reduce:animate-none" />
    </div>}

    {review && <div className="space-y-4">
      {justSent && <p role="status" className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800"><CheckCircle2 className="w-4 h-4" />Đã ghi nhận đánh giá của bạn.</p>}
      <div className="flex items-center gap-3">
        <Stars value={review.stars} size="w-7 h-7" />
        <span className="text-sm font-bold text-[#0b1c30]">{review.stars}/5 · {STAR_LABELS[review.stars]}</span>
      </div>
      {review.criteria && <div className="flex flex-wrap gap-2">
        {CRITERIA.filter(c => review.criteria.split(',').includes(c.key)).map(({ key, label, icon: Icon }) =>
          <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800"><Icon className="w-3.5 h-3.5" />{label}</span>)}
      </div>}
      {review.comment && <blockquote className="flex gap-2 p-3.5 rounded-xl bg-slate-50 border border-outline-variant/30 text-sm text-[#434655]">
        <MessageSquareText className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" /><span className="whitespace-pre-line">{review.comment}</span>
      </blockquote>}
    </div>}

    {review === null && <form className="space-y-5" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <div>
        <p className="text-xs font-semibold text-[#434655] mb-2">Chấm điểm <span className="text-rose-500">*</span></p>
        <div className="flex items-center gap-3 flex-wrap">
          <div role="radiogroup" aria-label="Số sao" className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} sao: ${STAR_LABELS[n]}`}
              onClick={() => setStars(n)} onMouseEnter={() => setHover(n)} onFocus={() => setHover(n)} onBlur={() => setHover(0)}
              className="p-0.5 rounded-lg transition-transform duration-150 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer">
              <Star className={`w-9 h-9 transition-colors ${n <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
            </button>)}
          </div>
          <span className={`text-sm font-bold min-w-24 ${shown ? 'text-amber-600' : 'text-slate-400'}`}>{shown ? STAR_LABELS[shown] : 'Chọn số sao'}</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#434655] mb-2">Điều bạn hài lòng <span className="font-normal text-slate-400">(không bắt buộc)</span></p>
        <div className="flex flex-wrap gap-2">
          {CRITERIA.map(({ key, label, icon: Icon }) => {
            const on = criteria.includes(key);
            return <button key={key} type="button" aria-pressed={on} onClick={() => toggle(key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold transition cursor-pointer ${
                on ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs' : 'bg-white border-outline-variant/50 text-[#434655] hover:border-amber-300'}`}>
              <Icon className="w-3.5 h-3.5" />{label}{on && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>;
          })}
        </div>
      </div>

      <label className="block">
        <span className="flex justify-between text-xs font-semibold text-[#434655] mb-2">
          <span>Góp ý thêm <span className="font-normal text-slate-400">(không bắt buộc)</span></span>
          <span className="font-mono font-normal text-slate-400">{comment.length}/{MAX_COMMENT}</span>
        </span>
        <textarea rows={3} maxLength={MAX_COMMENT} value={comment} onChange={event => setComment(event.target.value)}
          placeholder="Chia sẻ điều bạn thích hoặc điều trạm nên cải thiện…"
          className="block w-full rounded-xl border border-outline-variant/50 bg-white p-3 text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
      </label>

      <p className="text-xs text-[#434655]">Đánh giá sẽ hiển thị công khai dưới dạng ẩn danh. Vui lòng tránh ghi thông tin cá nhân trong góp ý.</p>
      {submitError && <p role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700"><AlertCircle className="w-4 h-4 shrink-0" />{submitError}</p>}

      <div className="flex items-center justify-end gap-3">
        {stars < 1 && <span className="text-xs text-slate-400">Chọn số sao để gửi</span>}
        <button type="submit" disabled={busy || stars < 1}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-sm hover:opacity-90 transition disabled:opacity-40 cursor-pointer">
          <Star className="w-4 h-4" />{busy ? 'Đang gửi…' : 'Gửi đánh giá'}
        </button>
      </div>
    </form>}
  </section>;
}
