import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import apiClient from '../../api/client';
import type { CreateBookingResponse } from '../../api/bookingService';

export default function WalkInBooking({ stationId, onReady, onCancel }: {
  stationId: string; onReady: (pin: string) => void; onCancel: () => void;
}) {
  const [size, setSize] = useState('S'); const [hours, setHours] = useState(3); const [phone, setPhone] = useState('');
  const [session, setSession] = useState<{ id: string; secret: string; payment: CreateBookingResponse }>();
  const [ticket, setTicket] = useState<{ accessCode?: string; status: string }>();
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const pollingRef = useRef(false);
  useEffect(() => {
    if (!session) return;
    let disposed = false;
    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const res = await apiClient.post(`/api/kiosk/walk-in/${session.id}/status`, { secret: session.secret });
        if (!disposed) { setTicket(res.data); setMessage(''); }
      } catch { if (!disposed) setMessage('Chưa kiểm tra được thanh toán. Hệ thống sẽ thử lại.'); }
      finally { pollingRef.current = false; }
    };
    void poll(); const timer = window.setInterval(poll, 5000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [session]);
  return <section className="bg-white rounded-2xl p-8 space-y-5 max-w-2xl mx-auto">
    <h2 className="text-2xl font-bold">Đặt tủ tại trạm</h2>
    <p role="status">{message}</p>
    {!session ? <form className="space-y-4" onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true); setMessage('');
      try { setSession((await apiClient.post('/api/kiosk/walk-in', { stationId, size, hours, phone })).data); }
      catch (error) { setMessage((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Không tạo được đơn.'); }
      finally { setBusy(false); }
    }}>
      <label className="block">Kích cỡ <select value={size} onChange={e => setSize(e.target.value)} className="border p-3">{['S','M','L'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="block">Số giờ <input className="border p-3" type="number" min={1} max={72} value={hours} onChange={e => setHours(Number(e.target.value))} /></label>
      <label className="block">Số điện thoại liên hệ<input className="border p-3 block w-full" required minLength={8} maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} /></label>
      <button className="bg-blue-700 text-white p-4 rounded-xl" disabled={busy}>Tạo đơn và xem tiền thuê</button>
    </form> : ticket?.status === 'CONFIRMED' && ticket.accessCode ? <div className="space-y-4">
      <h3 className="font-bold">Đã thanh toán</h3><p>Hãy lưu mã PIN để lấy đồ. Mã không được gửi qua SMS.</p>
      <p className="text-4xl font-mono tracking-widest">{ticket.accessCode}</p>
      <button className="bg-blue-700 text-white p-4 rounded-xl" onClick={() => onReady(ticket.accessCode!)}>Đã lưu mã · Mở tủ gửi đồ</button>
    </div> : <div className="space-y-3">
      <p>Đơn {session.payment.bookingCode} · {session.payment.amount.toLocaleString('vi-VN')} VND</p>
      <p>Quét bằng ứng dụng ngân hàng. Chỉ mở tủ sau khi hệ thống xác nhận thanh toán.</p>
      {session.payment.qrCode ? <QRCodeSVG value={session.payment.qrCode} size={240} /> : <p>Chưa có QR ngân hàng. Liên hệ nhân viên để được hỗ trợ.</p>}
      <p>Trạng thái: {ticket?.status || 'PENDING_PAYMENT'}</p>
    </div>}
    <button className="underline" onClick={onCancel}>Trở về (đơn chưa thanh toán tự hết hạn)</button>
  </section>;
}
