import { useEffect, useState } from 'react';
import apiClient from '../../../api/client';

interface Report { id: string; bookingCode: string; description: string; photo?: string; status: string; staffResponse?: string }
export default function LostItemQueue() {
  const [items, setItems] = useState<Report[]>([]);
  const [selected, setSelected] = useState<Report>();
  const [status, setStatus] = useState('NOT_FOUND');
  const [response, setResponse] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    try { setItems((await apiClient.get<Report[]>('/api/admin/traveler-support/lost-items')).data); }
    catch { setMessage('Không tải được yêu cầu tìm đồ.'); }
  };
  useEffect(() => { void refresh(); }, []);
  return <section className="rounded-2xl border bg-white p-5 space-y-3">
    <div className="flex justify-between"><h2 className="font-bold">Yêu cầu tìm đồ thất lạc</h2><button onClick={() => void refresh()}>Tải lại</button></div>
    {message && <p role="status">{message}</p>}
    {items.length === 0 && <p>Chưa có yêu cầu.</p>}
    {items.map(item => <button key={item.id} data-testid={'lost-report-' + item.id} className="border rounded-lg p-3 mr-2" onClick={() => { setSelected(item); setResponse(item.staffResponse || ''); setStatus(item.status === 'OPEN' ? 'NOT_FOUND' : item.status); }}>{item.bookingCode} · {item.status}</button>)}
    {selected && <form className="space-y-3" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setMessage('');
      try { await apiClient.post(`/api/admin/traveler-support/lost-items/${selected.id}`, { status, response }); setSelected(undefined); await refresh(); setMessage('Đã gửi kết quả cho khách.'); }
      catch { setMessage('Không lưu được kết quả. Vui lòng thử lại.'); }
      finally { setBusy(false); }
    }}>
      <p>{selected.description}</p>
      {selected.photo && <img src={selected.photo} alt="Ảnh đồ vật khách báo quên" className="max-w-sm rounded-lg" />}
      <label className="block">Kết quả <select aria-label="Kết quả" disabled={selected.status === 'RETURNED'} className="border p-2" value={status} onChange={e => setStatus(e.target.value)}><option value="FOUND">Đã tìm thấy</option><option value="NOT_FOUND">Chưa tìm thấy</option><option value="RETURNED" disabled={selected.status !== 'FOUND' && selected.status !== 'RETURNED'}>Đã trả khách</option></select></label>
      <label className="block">Phản hồi cho khách<textarea aria-label="Phản hồi cho khách" disabled={selected.status === 'RETURNED'} className="border rounded w-full p-2" required maxLength={2000} value={response} onChange={e => setResponse(e.target.value)} /></label>
      <button disabled={busy || selected.status === 'RETURNED'} className="bg-blue-700 text-white rounded p-3">Lưu kết quả</button>
    </form>}
  </section>;
}
