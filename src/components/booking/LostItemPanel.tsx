import { useEffect, useRef, useState } from 'react';
import apiClient from '../../api/client';

interface State {
  lostReports: { id: string; description: string; status: string; staffResponse?: string }[];
  notifications: { id: string; title: string; body: string }[];
}
export default function LostItemPanel({ bookingId, status, checkedOutAt }: { bookingId: string; status: string; checkedOutAt?: string | null }) {
  const eligible = ['COMPLETED', 'COMPLETED_MANUAL'].includes(status);
  const base = `/api/bookings/${bookingId}/support`;
  const activeBase = useRef(base); activeBase.current = base;
  const photoVersion = useRef(0);
  const [data, setData] = useState<State>();
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [photoError, setPhotoError] = useState('');
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let disposed = false, pending = false;
    setData(undefined); setDescription(''); setPhoto(undefined); setPhotoError(''); setMessage(''); setBusy(false);
    photoVersion.current++; setReadingPhoto(false);
    const load = async () => {
      if (!eligible || pending) return;
      pending = true;
      try { const response = await apiClient.get<State>(base); if (!disposed) setData(response.data); }
      catch { if (!disposed) setMessage('Không tải được yêu cầu tìm đồ.'); }
      finally { pending = false; }
    };
    void load(); const timer = window.setInterval(() => void load(), 15000);
    return () => { disposed = true; window.clearInterval(timer); photoVersion.current++; };
  }, [base, eligible]);
  if (!eligible) return null;
  const checkout = checkedOutAt ? Date.parse(/Z|[+-]\d\d:\d\d$/.test(checkedOutAt) ? checkedOutAt : checkedOutAt + 'Z') : NaN;
  const withinWindow = Number.isFinite(checkout) && Date.now() >= checkout && Date.now() - checkout <= 7 * 86400000;
  const loaded = data && Array.isArray(data.lostReports);
  const activeReport = data?.lostReports?.some(report => ['OPEN', 'FOUND'].includes(report.status));
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    const requestedBase = base; setBusy(true); setMessage('');
    try {
      await action(); const response = await apiClient.get<State>(requestedBase);
      if (activeBase.current === requestedBase) setData(response.data);
    } catch (error) {
      if (activeBase.current === requestedBase) setMessage((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Không lưu được yêu cầu. Vui lòng thử lại.');
    } finally { if (activeBase.current === requestedBase) setBusy(false); }
  };
  return <section className="bg-white border rounded-2xl p-6 space-y-4" aria-label="Tìm đồ thất lạc">
    <h2 className="text-xl font-bold">Tìm đồ thất lạc</h2>
    {message && <p role="status">{message}</p>}
    {!data && !message && <p>Đang tải yêu cầu…</p>}
    {data?.notifications?.map(item => <article key={item.id} className="border border-blue-300 bg-blue-50 rounded p-3">
      <strong>{item.title}</strong><p>{item.body}</p><button disabled={busy} onClick={() => void run(async () => { await apiClient.post(`${base}/notifications/${item.id}/read`); })}>Đánh dấu đã đọc</button>
    </article>)}
    {!withinWindow && <p>Chỉ gửi báo quên đồ trong 7 ngày sau khi lấy đồ.</p>}
    {activeReport && <p>Yêu cầu đang được xử lý hoặc chờ bàn giao. Theo dõi phản hồi bên dưới.</p>}
    {data && !loaded && <p>Chức năng tìm đồ chưa sẵn sàng. Vui lòng tải lại sau.</p>}
    {withinWindow && loaded && !activeReport && <form className="space-y-3" onSubmit={event => {
      event.preventDefault(); if (readingPhoto || photoError) return;
      void run(async () => { await apiClient.post(`${base}/lost-items`, { description, photo }); if (activeBase.current === base) { setDescription(''); setPhoto(undefined); setMessage('Đã gửi yêu cầu tìm đồ.'); } });
    }}>
      <label className="block">Mô tả đồ vật<textarea required maxLength={2000} className="block border w-full p-2 rounded" value={description} onChange={event => setDescription(event.target.value)} /></label>
      <label className="block">Ảnh minh họa JPEG (tối đa 500 KB)<input type="file" accept="image/jpeg" disabled={busy} onChange={event => {
        const version = ++photoVersion.current; const file = event.target.files?.[0]; setPhoto(undefined); setPhotoError(''); setReadingPhoto(false);
        if (!file) return;
        if (file.type !== 'image/jpeg' || file.size > 500000) { setPhotoError('Chọn JPEG tối đa 500 KB, hoặc bỏ chọn ảnh để tiếp tục.'); return; }
        setReadingPhoto(true); const reader = new FileReader();
        reader.onload = () => { if (photoVersion.current === version) { setPhoto(String(reader.result)); setReadingPhoto(false); } };
        reader.onerror = () => { if (photoVersion.current === version) { setPhotoError('Không đọc được ảnh. Chọn lại ảnh.'); setReadingPhoto(false); } };
        reader.readAsDataURL(file);
      }} /></label>
      {photoError && <p role="alert">{photoError}</p>}
      {photo && <img className="max-w-sm rounded" src={photo} alt="Ảnh minh họa sẽ gửi" />}
      <button disabled={busy || readingPhoto || !!photoError} className="bg-blue-700 text-white px-4 py-2 rounded">{busy ? 'Đang gửi…' : 'Gửi báo quên đồ'}</button>
    </form>}
    {data?.lostReports?.map(report => <article key={report.id} className="border rounded p-3"><p>{report.description}</p><p>Trạng thái: {report.status}</p>{report.staffResponse && <p>Nhân viên: {report.staffResponse}</p>}</article>)}
  </section>;
}
