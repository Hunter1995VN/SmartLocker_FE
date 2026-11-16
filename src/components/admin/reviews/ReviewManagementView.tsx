import { useEffect, useState } from 'react';
import { Eye, EyeOff, Flag, RefreshCw } from 'lucide-react';
import { getApiErrorMessage } from '../../../api/client';
import { stationReviewService } from '../../../api/stationReviewService';
import type { AdminReview, ReviewFilter, ReviewPage, ReviewReport } from '../../../api/stationReviewService';
import ReviewCriteria from '../../booking/ReviewCriteria';
import ReviewStars from '../../booking/ReviewStars';

const filters: { id: ReviewFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'reported', label: 'Có báo cáo chờ xử lý' },
  { id: 'visible', label: 'Đang hiển thị' },
  { id: 'hidden', label: 'Đã ẩn' },
];
const control = 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
const displayDate = (value: string) => dateTime.format(new Date(value));

function Pagination({ label, page, total, onChange }: { label: string; page: number; total: number; onChange: (page: number) => void }) {
  if (total < 2) return null;
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-end gap-3 text-sm">
      <button type="button" className={control} disabled={page <= 1} onClick={() => onChange(page - 1)}>Trang trước</button>
      <span>Trang {page} / {total}</span>
      <button type="button" className={control} disabled={page >= total} onClick={() => onChange(page + 1)}>Trang sau</button>
    </nav>
  );
}

function ReviewReports({ id, onResolved }: { id: string; onResolved: () => void }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ReviewPage<ReviewReport> | null>(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const request = new AbortController();
    stationReviewService.reports(id, page, request.signal).then(data => {
      if (!request.signal.aborted) setResult(data);
    }).catch(err => {
      if (!request.signal.aborted) setLoadError(getApiErrorMessage(err, 'Không tải được báo cáo.'));
    });
    return () => request.abort();
  }, [id, page, retry]);

  async function resolve(reportId: string) {
    setBusy(reportId);
    setActionError('');
    try {
      await stationReviewService.resolve(id, reportId);
      setPage(1);
      setResult(null);
      setRetry(n => n + 1);
      onResolved();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Không cập nhật được báo cáo.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-label="Báo cáo của đánh giá" className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {loadError && <p role="alert" className="text-sm text-rose-700">{loadError} <button type="button" className="font-semibold underline" onClick={() => { setLoadError(''); setRetry(n => n + 1); }}>Thử lại</button></p>}
      {actionError && <p role="alert" className="text-sm text-rose-700">{actionError}</p>}
      {!result && !loadError && <p role="status" className="text-sm text-slate-600">Đang tải báo cáo…</p>}
      {result?.count === 0 && <p className="text-sm text-slate-600">Chưa có báo cáo.</p>}
      {result && (
        <>
          <ul className="divide-y divide-slate-200">
            {result.items.map(report => (
              <li key={report.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-sm text-slate-800">{report.reason}</p>
                  <time dateTime={report.createdAt} className="mt-1 block text-xs text-slate-600">{displayDate(report.createdAt)}</time>
                </div>
                {report.resolvedAt
                  ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Đã xử lý</span>
                  : <button type="button" className={control} disabled={busy !== null} onClick={() => void resolve(report.id)}>
                      {busy === report.id ? 'Đang lưu…' : 'Đánh dấu đã xử lý'}
                    </button>}
              </li>
            ))}
          </ul>
          <Pagination label="Phân trang báo cáo" page={page} total={Math.ceil(result.count / result.pageSize)} onChange={next => {
            if (busy) return;
            setResult(null);
            setPage(next);
          }} />
        </>
      )}
    </section>
  );
}

export default function ReviewManagementView() {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ReviewPage<AdminReview> | null>(null);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const request = new AbortController();
    stationReviewService.adminReviews(filter, page, request.signal).then(data => {
      if (request.signal.aborted) return;
      if (page > 1 && data.items.length === 0) {
        setPage(Math.max(1, Math.ceil(data.count / data.pageSize)));
        return;
      }
      setResult(data);
      setLoading(false);
    }).catch(err => {
      if (request.signal.aborted) return;
      setResult(null);
      setError(getApiErrorMessage(err, 'Không tải được danh sách đánh giá.'));
      setLoading(false);
    });
    return () => request.abort();
  }, [filter, page, retry]);

  function refresh() {
    setError('');
    setLoading(true);
    setRetry(n => n + 1);
  }

  function changeList(nextFilter: ReviewFilter, nextPage: number) {
    if (nextFilter === filter && nextPage === page) return;
    setError('');
    setNotice('');
    setExpanded(null);
    setLoading(true);
    setResult(null);
    setFilter(nextFilter);
    setPage(nextPage);
  }

  async function changeVisibility(review: AdminReview) {
    setBusy(review.id);
    setError('');
    setNotice('');
    try {
      await stationReviewService.setVisibility(review.id, !review.isHidden);
      setNotice(review.isHidden ? 'Đã hiển thị lại đánh giá.' : 'Đã ẩn đánh giá khỏi trang công khai.');
      refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không cập nhật được trạng thái đánh giá.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-5 select-text" aria-labelledby="manage-reviews-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="manage-reviews-title" className="text-2xl font-extrabold tracking-tight">Quản lý đánh giá</h1>
          <p className="mt-1 text-sm text-slate-600">Xem đánh giá sau khi khách lấy đồ và xử lý báo cáo từ người dùng.</p>
        </div>
        <button type="button" className={control} onClick={refresh} disabled={loading || busy !== null}><RefreshCw className="h-4 w-4" aria-hidden="true" />Tải lại</button>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc đánh giá">
        {filters.map(item => (
          <button type="button" key={item.id} aria-pressed={item.id === filter} disabled={busy !== null}
            className={`${control} aria-pressed:border-blue-600 aria-pressed:bg-blue-50 aria-pressed:text-blue-800`}
            onClick={() => changeList(item.id, 1)}>{item.label}</button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <p role="status" className={notice ? 'rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800' : 'sr-only'}>{notice || (loading ? 'Đang tải đánh giá…' : '')}</p>
      {loading && !result && <p className="text-sm text-slate-600">Đang tải đánh giá…</p>}
      {result?.count === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Không có đánh giá phù hợp.</p>}
      {result && (
        <>
          <ul className="grid gap-3" aria-busy={loading}>
            {result.items.map(review => (
              <li key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold [overflow-wrap:anywhere]">{review.stationName}</h2>
                    <p className="mt-1 text-xs text-slate-600">{review.bookingCode} · Tủ cỡ {review.lockerSize} · <time dateTime={review.createdAt}>{displayDate(review.createdAt)}</time></p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${review.isHidden ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>
                    {review.isHidden ? 'Đã ẩn' : 'Đang hiển thị'}
                  </span>
                </div>
                <div className="my-3 space-y-2">
                  <ReviewStars value={review.stars} size="h-4 w-4" />
                  {review.comment && <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-sm text-slate-800">{review.comment}</p>}
                  <ReviewCriteria criteria={review.criteria} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {review.reports > 0 && <button type="button" className={control} aria-expanded={expanded === review.id}
                    onClick={() => setExpanded(current => current === review.id ? null : review.id)}>
                    <Flag className="h-4 w-4" aria-hidden="true" />{review.reports} báo cáo · {review.pendingReports} chờ xử lý
                  </button>}
                  <button type="button" className={control} disabled={loading || busy !== null} onClick={() => void changeVisibility(review)}>
                    {review.isHidden ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                    {busy === review.id ? 'Đang lưu…' : review.isHidden ? 'Hiển thị lại' : 'Ẩn đánh giá'}
                  </button>
                </div>
                {expanded === review.id && <ReviewReports id={review.id} onResolved={() => {
                  setNotice('Đã xử lý báo cáo.');
                  refresh();
                }} />}
              </li>
            ))}
          </ul>
          <Pagination label="Phân trang quản lý đánh giá" page={page} total={Math.ceil(result.count / result.pageSize)} onChange={next => {
            if (!loading && busy === null) changeList(filter, next);
          }} />
        </>
      )}
    </section>
  );
}
