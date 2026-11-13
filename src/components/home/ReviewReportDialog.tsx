import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { getApiErrorMessage } from '../../api/client';
import { stationReviewService } from '../../api/stationReviewService';

interface Props {
  reviewId: string;
  onClose: () => void;
  onReported: () => void;
}

export default function ReviewReportDialog({ reviewId, onClose, onReported }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      await stationReviewService.report(reviewId, reason.trim());
      onReported();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không gửi được báo cáo. Vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} aria-labelledby="report-review-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-outline-variant/60 bg-white p-6 text-on-surface shadow-elevation-4 backdrop:bg-slate-950/50">
      <h3 id="report-review-title" className="text-xl font-bold">Báo cáo đánh giá</h3>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-semibold">
          Lý do báo cáo
          <textarea required rows={4} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)}
            placeholder="Ví dụ: spam, nội dung xúc phạm hoặc thông tin cá nhân"
            className="mt-2 block w-full rounded-xl border border-outline-variant p-3 font-normal focus-visible:outline-2 focus-visible:outline-primary" />
        </label>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold">Hủy</button>
          <button type="submit" disabled={busy || !reason.trim()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Đang gửi…' : 'Gửi báo cáo'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
