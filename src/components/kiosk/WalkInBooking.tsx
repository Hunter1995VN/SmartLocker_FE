import { kioskStateLabel } from '../../utils/kioskStateLabels';
import { kioskText } from '../../utils/kioskMessages';
import type { KioskLanguage } from '../../utils/kioskI18n';
import { useEffect, useRef, useState } from 'react';
import { getStationById, type StationDetail } from '../../api/stationService';
import { bookingQuote } from '../../utils/bookingQuote';
import { QRCodeSVG } from 'qrcode.react';
import apiClient from '../../api/client';
import type { CreateBookingResponse } from '../../api/bookingService';

export default function WalkInBooking({ stationId, onReady, onCancel, lang }: {
  lang: KioskLanguage; stationId: string; onReady: (pin: string) => Promise<void>; onCancel: () => void;
}) {
  const x = kioskText(lang);
  const [size, setSize] = useState('S'); const [hours, setHours] = useState(1); const [phone, setPhone] = useState('');
  const [session, setSession] = useState<{ id: string; secret: string; expiresAt: string; payment: CreateBookingResponse }>();
  const [expired, setExpired] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [ticket, setTicket] = useState<{ accessCode?: string; status: string }>();
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const pollingRef = useRef(false);
  const [station,setStation]=useState<StationDetail | null>(null);
  const [readFailed,setReadFailed]=useState(false);
  useEffect(()=>{
    let disposed=false; let pending=false;
    const load=async()=>{if(pending)return;pending=true;try{
      const start=new Date();const detail=await getStationById(stationId,start.toISOString(),new Date(start.getTime()+hours*3600000).toISOString());
      if(!disposed){setStation(detail);setReadFailed(!detail);}
    }catch{if(!disposed){setStation(null);setReadFailed(true);}}finally{pending=false;}};
    setStation(null); void load();const timer=window.setInterval(()=>void load(),15000);
    return ()=>{disposed=true;clearInterval(timer);};
  },[stationId,hours]);
  const quote=bookingQuote(station?.sizePricing,size,hours);
  const available=station ? (size==='S'?station.availableS:size==='M'?station.availableM:station.availableL) : 0;
  useEffect(() => {
    if (!session || cancelled) return;
    let disposed = false;
    let stopped = false;
    const poll = async () => {
      if (pollingRef.current || stopped) return;
      const expiry = Date.parse(/Z|[+-]\d\d:\d\d$/.test(session.expiresAt) ? session.expiresAt : `${session.expiresAt}Z`);
      if (Date.now() >= expiry) { stopped = true; setExpired(true); return; }
      pollingRef.current = true;
      try {
        const res = await apiClient.post(`/api/kiosk/walk-in/${session.id}/status`, { secret: session.secret });
        if (!disposed) {
          setTicket(res.data); setMessage('');
        }
      } catch (error) {
        if (!disposed) {
          if ((error as { response?: { status?: number } }).response?.status === 404) { stopped = true; setExpired(true); }
          else setMessage(kioskText(lang)('checking'));
        }
      }
      finally { pollingRef.current = false; }
    };
    void poll(); const timer = window.setInterval(poll, 5000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [session, lang, cancelled]);
  return <section className="bg-white rounded-2xl p-8 space-y-5 max-w-2xl mx-auto">
    <h2 className="text-2xl font-bold">{x('walkTitle')}</h2>
    <p role="status">{message}</p>
    {!session ? <form className="space-y-4" onSubmit={async e => {
      e.preventDefault(); if (busy || quote===null || available<=0) return; setBusy(true); setMessage('');
      try { setSession((await apiClient.post('/api/kiosk/walk-in', { stationId, size, hours, phone })).data); }
      catch (error) { setMessage((error as { response?: { data?: { message?: string } } }).response?.data?.message || x('submitError')); }
      finally { setBusy(false); }
    }}>
      <label className="block">{x('size')} <select value={size} onChange={e => setSize(e.target.value)} className="border p-3">{['S','M','L'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="block">{x('hours')} <input className="border p-3" type="number" min={1} max={72} value={hours} onChange={e => setHours(Number(e.target.value))} /></label>
      <label className="block">{x('phone')}<input className="border p-3 block w-full" required minLength={8} maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} /></label>
      <p>{x('quoteLabel')}: {quote===null?'—':quote.toLocaleString('vi-VN')+' VND'}</p>
      {(readFailed || available<=0) && <p role="status">{readFailed?x('networkError'):x('sizeUnavailable')}</p>}
      <button className="bg-blue-700 text-white p-4 rounded-xl disabled:opacity-50" disabled={busy || quote===null || available<=0}>{x('create')}</button>
    </form> : cancelled ? <p role="status">{x('cancelled')}</p>
    : expired ? <p role="alert">{x('sessionExpired')}</p>
    : ticket?.status === 'CONFIRMED' && !/^\d{8}$/.test(ticket.accessCode || '') ? <p role="alert">{x('paidMissingPin')}</p>
    : ticket?.status === 'CONFIRMED' && ticket.accessCode ? <div className="space-y-4">
      <h3 className="font-bold">{x('paid')}</h3><p>{x('savePin')}</p>
      <p className="text-4xl font-mono tracking-widest">{ticket.accessCode.slice(0,4)} {ticket.accessCode.slice(4)}</p>
      <button className="bg-blue-700 text-white p-4 rounded-xl" disabled={busy} onClick={async () => {if(busy)return;setBusy(true);try{await onReady(ticket.accessCode!);}finally{setBusy(false);}}}>{x('ready')}</button>
    </div> : ticket && !['PENDING_PAYMENT','PENDING_CONFIRM'].includes(ticket.status) ? <p>{x('status')}: {kioskStateLabel(lang,ticket.status)}</p>
    : <div className="space-y-3">
      <p>{x('order')} {session.payment.bookingCode} · {session.payment.amount.toLocaleString('vi-VN')} VND</p>
      <p>{x('scanPay')}</p>
      {session.payment.qrCode ? <QRCodeSVG value={session.payment.qrCode} size={240} /> : <p>{x('noQr')}</p>}
      <p>{x('status')}: {kioskStateLabel(lang,ticket?.status || 'PENDING_PAYMENT')}</p>
    </div>}
    {session && !expired && !cancelled && (!ticket || ticket.status === 'PENDING_PAYMENT') && <button disabled={busy} className="block text-red-700 underline" onClick={async () => {
      if (busy) return; setBusy(true);
      try { await apiClient.post(`/api/kiosk/walk-in/${session.id}/cancel`, { secret: session.secret }); setCancelled(true); setMessage(''); }
      catch { setMessage(x('submitError')); }
      finally { setBusy(false); }
    }}>{x('cancelUnpaid')}</button>}
    {(!session || expired || cancelled) && <button className="underline" onClick={onCancel}>{x('return')}</button>}
  </section>;
}
