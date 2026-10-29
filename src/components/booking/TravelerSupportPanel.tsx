import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import type { BookingDto } from '../../api/bookingService';

interface SupportState {
  delegations: { id: string; contact: string; expiresAt: string; usedAt?: string; revokedAt?: string }[];
  review?: { stars: number; comment: string };
  lostReports: { id: string; description: string; status: string; staffResponse?: string }[];
}

export default function TravelerSupportPanel({ booking }: { booking: BookingDto }) {
  const [data, setData] = useState<SupportState>();
  const [contact, setContact] = useState('');
  const [pin, setPin] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const base = `/api/bookings/${booking.id}/support`;
  const refresh = async () => { setData((await apiClient.get<SupportState>(base)).data); };
  useEffect(() => { setPin(''); void refresh().catch(() => setMessage('Không tải được yêu cầu hỗ trợ.')); }, [booking.id]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await action(); await refresh(); }
    catch (e) { setMessage((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Không lưu được yêu cầu. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };
  return <section className="bg-white border rounded-2xl p-6 space-y-5">
    <h2 className="text-xl font-bold">Hỗ trợ chuyến gửi đồ</h2>
    {message && <p role="status" className="text-blue-700">{message}</p>}
    {booking.status === 'STORED' && <form className="space-y-3" onSubmit={e => {
      e.preventDefault(); void run(async () => {
        const res = await apiClient.post<{ pin: string; expiresAt: string }>(`${base}/delegations`, { contact, validMinutes: minutes });
        setPin(res.data.pin); setMessage(`Mã chỉ hiển thị một lần. Hết hạn: ${new Date(res.data.expiresAt + (res.data.expiresAt.endsWith('Z') ? '' : 'Z')).toLocaleString('vi-VN')}`);
      });
    }}>
      <h3 className="font-semibold">Nhờ người lấy hộ</h3>
      <label className="block">Số điện thoại hoặc email người nhận<input className="block w-full border p-2 rounded" required maxLength={255} value={contact} onChange={e => setContact(e.target.value)} /></label>
      <label className="block">Hiệu lực (phút, không vượt thời hạn thuê)<input className="border p-2 rounded ml-2" type="number" min={1} max={1440} value={minutes} onChange={e => setMinutes(Number(e.target.value))} /></label>
      <button disabled={busy} className="bg-blue-700 text-white p-2 rounded">Tạo mã dùng một lần</button>
      {pin && <p className="text-xl font-mono">PIN người nhận: {pin}</p>}
      {data?.delegations.filter(d => !d.usedAt && !d.revokedAt).map(d => <div key={d.id} className="flex gap-3"><span>{d.contact}</span><button type="button" disabled={busy} onClick={() => void run(async () => { await apiClient.delete(`${base}/delegations/${d.id}`); setPin(''); setMessage('Đã thu hồi mã.'); })}>Thu hồi</button></div>)}
    </form>}
    {booking.status === 'COMPLETED' && <form className="space-y-3" onSubmit={e => {
      e.preventDefault(); void run(async () => { await apiClient.post(`${base}/lost-items`, { description, photo }); setMessage('Đã gửi yêu cầu tìm đồ. Theo dõi phản hồi bên dưới.'); });
    }}>
      <h3 className="font-semibold">Báo quên đồ (trong 7 ngày sau khi lấy đồ)</h3>
      <label className="block">Mô tả đồ vật<textarea required maxLength={2000} className="block border w-full p-2 rounded" value={description} onChange={e => setDescription(e.target.value)} /></label>
      <label className="block">Ảnh minh họa JPEG (tối đa 500 KB)<input type="file" accept="image/jpeg" onChange={e => {
        const file = e.target.files?.[0]; setPhoto(undefined);
        if (!file) return;
        if (file.type !== 'image/jpeg' || file.size > 500000) { setMessage('Chọn ảnh JPEG tối đa 500 KB.'); return; }
        const reader = new FileReader(); reader.onload = () => setPhoto(String(reader.result)); reader.readAsDataURL(file);
      }} /></label>
      <button disabled={busy} className="bg-blue-700 text-white p-2 rounded">Gửi báo quên đồ</button>
    </form>}
    {data?.lostReports.map(r => <article key={r.id} className="border rounded p-3"><p>{r.description}</p><p>Trạng thái: {r.status}</p>{r.staffResponse && <p>Nhân viên: {r.staffResponse}</p>}</article>)}
  </section>;
}
