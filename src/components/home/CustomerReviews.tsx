import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Flag, MapPin, Star } from 'lucide-react';
import { tokenStore } from '../../api/client';
import { stationReviewService } from '../../api/stationReviewService';
import ReviewCriteria from '../booking/ReviewCriteria';
import ReviewStars from '../booking/ReviewStars';
import ReviewReportDialog from './ReviewReportDialog';
import './CustomerReviews.css';

const numberFormat = new Intl.NumberFormat('vi-VN');
const ratingFormat = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' });

type Reviews = Awaited<ReturnType<typeof stationReviewService.publicReviews>>;

export default function CustomerReviews({ initialPage = 1, onLogin }: { initialPage?: number; onLogin: (page: number) => void }) {
  const [page, setPage] = useState(initialPage);
  const [result, setResult] = useState<Reviews | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [reportId, setReportId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const request = new AbortController();
    stationReviewService.publicReviews(page, request.signal).then(data => {
      if (request.signal.aborted) return;
      if (page > 1 && data.items.length === 0) {
        setPage(Math.max(1, Math.ceil(data.count / data.pageSize)));
        return;
      }
      setResult(data);
      setLoading(false);
    }).catch(() => {
      if (request.signal.aborted) return;
      setError(true);
      setLoading(false);
    });
    return () => request.abort();
  }, [page, retry]);

  function changePage(nextPage: number) {
    setLoading(true);
    setError(false);
    setPage(nextPage);
  }

  function startReport(id: string) {
    if (!tokenStore.get()) {
      onLogin(page);
      return;
    }
    setAnnouncement('');
    setReportId(id);
  }

  const totalPages = result ? Math.ceil(result.count / result.pageSize) : 0;

  return (
    <section id="customer-reviews" aria-labelledby="customer-reviews-title" className="scroll-mt-24 bg-surface-container-low py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="customer-reviews-title" className="text-3xl font-bold tracking-tight text-on-surface md:text-4xl">Đánh giá từ khách hàng</h2>
            <p className="mt-2 text-on-surface-variant">Trải nghiệm thực tế sau khi sử dụng tủ SmartLocker.</p>
          </div>
          {result && result.count > 0 && (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-outline-variant/60 bg-white px-4 py-2 shadow-elevation-1">
              <Star className="h-5 w-5 fill-amber-400 text-amber-500" aria-hidden="true" />
              <span className="font-bold">{ratingFormat.format(result.average)}/5</span>
              <span className="text-sm text-on-surface-variant">· {numberFormat.format(result.count)} lượt đánh giá</span>
            </div>
          )}
        </div>

        <p role="status" className="sr-only">{announcement || (loading ? 'Đang tải đánh giá' : '')}</p>
        {error && (
          <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-error">
            <span>Chưa tải được đánh giá.</span>
            <button type="button" className="font-semibold underline" onClick={() => { setError(false); setLoading(true); setRetry(n => n + 1); }}>Thử lại</button>
          </div>
        )}
        {!result && loading && <div className="h-36 rounded-2xl bg-white/70 motion-safe:animate-pulse" />}
        {result?.count === 0 && <p className="rounded-2xl border border-outline-variant/50 bg-white p-6 text-on-surface-variant">Chưa có đánh giá công khai.</p>}

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loading}>
          {!error && result?.items.map(review => (
            <li key={review.id} className={`flex min-w-0 flex-col gap-4 rounded-2xl border border-outline-variant/60 bg-white p-5 shadow-elevation-1 sm:p-6 ${totalPages > 1 ? 'customer-review-enter' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ReviewStars value={review.stars} size="h-4 w-4" />
                <time dateTime={review.createdAt} className="text-xs text-on-surface-variant">{dateFormat.format(new Date(review.createdAt))}</time>
              </div>
              {review.comment && <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-relaxed">{review.comment}</p>}
              <ReviewCriteria criteria={review.criteria} />
              <div className="mt-auto flex items-end justify-between gap-3 border-t border-outline-variant/40 pt-4">
                <div className="min-w-0">
                  <p className="flex items-start gap-1.5 text-sm font-semibold"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span className="[overflow-wrap:anywhere]">{review.stationName}</span></p>
                  <p className="mt-1 text-xs text-on-surface-variant">Đã sử dụng tủ cỡ {review.lockerSize}</p>
                </div>
                {!review.isOwn && (review.hasReported ? (
                  <span className="shrink-0 text-xs text-on-surface-variant">Đã báo cáo</span>
                ) : (
                  <button type="button" disabled={loading} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-primary disabled:opacity-50"
                    onClick={() => startReport(review.id)}><Flag className="h-3.5 w-3.5" aria-hidden="true" /> Báo cáo</button>
                ))}
              </div>
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <nav aria-label="Phân trang đánh giá khách hàng" className="mt-6 flex items-center justify-center gap-4">
            <button type="button" aria-label="Trang đánh giá trước" disabled={loading || page === 1} onClick={() => changePage(page - 1)}
              className="rounded-full border border-outline-variant bg-white p-2.5 text-primary hover:bg-primary-fixed disabled:opacity-40"><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
            <span className="text-sm font-semibold" aria-live="polite">{page} / {totalPages}</span>
            <button type="button" aria-label="Trang đánh giá sau" disabled={loading || page >= totalPages} onClick={() => changePage(page + 1)}
              className="rounded-full border border-outline-variant bg-white p-2.5 text-primary hover:bg-primary-fixed disabled:opacity-40"><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
          </nav>
        )}
      </div>
      {reportId && <ReviewReportDialog reviewId={reportId} onClose={() => setReportId(null)} onReported={() => {
        setResult(current => current && { ...current, items: current.items.map(item => item.id === reportId ? { ...item, hasReported: true } : item) });
        setAnnouncement('Đã gửi báo cáo đánh giá.');
        setReportId(null);
      }} />}
    </section>
  );
}
