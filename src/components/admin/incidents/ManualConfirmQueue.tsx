import { useEffect, useState } from 'react';
import apiClient from '../../../api/client';

interface PendingReview { id: string; bookingCode: string; stationId: string; lockerId: string }

export default function ManualConfirmQueue() {
  const [items, setItems] = useState<PendingReview[]>([]);
  const [selected, setSelected] = useState<PendingReview | null>(null);
  const [photo, setPhoto] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    try { setItems((await apiClient.get<PendingReview[]>('/api/admin/manual-confirm')).data); }
    catch { setMessage('Không tải được danh sách chờ duyệt.'); }
  };
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    setPhoto(''); setReason('');
    if (!selected) return;
    let disposed = false;
    let url = '';
    apiClient.get(`/api/admin/manual-confirm/${selected.id}/photo`, { responseType: 'blob' }).then(res => {
      if (disposed) return;
      url = URL.createObjectURL(res.data); setPhoto(url);
    }).catch(() => { if (!disposed) setMessage('Không tải được ảnh bằng chứng.'); });
    return () => { disposed = true; if (url) URL.revokeObjectURL(url); };
  }, [selected]);
  const approve = async () => {
    if (!selected || !photo || !reason.trim() || busy) return;
    setBusy(true); setMessage('');
    try {
      await apiClient.post(`/api/admin/manual-confirm/${selected.id}/approve`, { reason });
      setSelected(null); setMessage('Đã đóng đơn và chuyển tủ sang bảo trì.'); await refresh();
    } catch { setMessage('Không duyệt được yêu cầu. Hãy tải lại và kiểm tra trạng thái đơn.'); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border bg-white p-5 space-y-3">
    <div className="flex justify-between"><h2 className="font-bold">Duyệt ảnh khi cảm biến lỗi</h2><button onClick={() => void refresh()}>Tải lại</button></div>
    <p className="text-sm text-slate-600">Chỉ xác nhận khi đã kiểm tra ảnh và xác minh khách lấy hết đồ. Tủ tiếp tục bị cách ly để sửa cảm biến.</p>
    {message && <p role="status">{message}</p>}
    {items.length === 0 && <p>Không có yêu cầu chờ duyệt.</p>}
    {items.map(item => <button key={item.id} className="border rounded-lg p-3 mr-2" onClick={() => setSelected(item)}>{item.bookingCode}</button>)}
    {selected && <div className="space-y-3">
      <p>Đơn {selected.bookingCode} · Trạm {selected.stationId} · Tủ {selected.lockerId}</p>
      {photo && <img src={photo} alt="Ảnh khách gửi để xác minh ngăn tủ" className="max-w-md rounded-lg" />}
      <label className="block">Kết quả kiểm tra và lý do xác nhận<textarea className="block border rounded w-full p-2" value={reason} maxLength={500} onChange={e => setReason(e.target.value)} /></label>
      <button className="rounded bg-blue-700 text-white p-3 disabled:opacity-50" disabled={busy || !photo || !reason.trim()} onClick={() => void approve()}>Xác nhận đóng đơn và bảo trì tủ</button>
    </div>}
  </section>;
}
