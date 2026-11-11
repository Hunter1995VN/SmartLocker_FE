import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
interface Grant { id: string; contact: string; expiresAt: string; usedAt?: string; revokedAt?: string }
// UC-T16: kết quả chuyển mã cho người nhận do backend trả về. Sent chỉ true khi máy chủ email đã nhận thư.
interface Delivery { channel: 'EMAIL' | 'MANUAL'; sent: boolean; reason?: string }
const deliveryReason: Record<string, string> = { SMTP_NOT_CONFIGURED: 'máy chủ chưa cấu hình email', SEND_FAILED: 'gửi thư thất bại', INVALID_ADDRESS: 'địa chỉ email không hợp lệ' };
function deliveryMessage(delivery: Delivery | undefined, contact: string) {
    if (!delivery) return 'Mã chỉ hiển thị lần này. Mã trước đó đã bị thu hồi.';
    if (delivery.sent) return `Đã gửi mã tới ${contact.trim()}. Mã cũng hiển thị bên dưới, chỉ lần này. Mã trước đó đã bị thu hồi.`;
    if (delivery.channel === 'EMAIL') return `Chưa gửi được email tới người nhận (${deliveryReason[delivery.reason ?? ''] ?? 'lỗi không xác định'}). Hãy tự chuyển mã bên dưới. Mã trước đó đã bị thu hồi.`;
    return 'Số điện thoại chưa có kênh gửi tự động: hãy tự chuyển mã bên dưới cho người nhận. Mã trước đó đã bị thu hồi.';
}
// Older backends may answer without a delegations array; never let that crash the ticket page.
const listOf=(data?:{delegations?:Grant[]})=>Array.isArray(data?.delegations)?data!.delegations!:[];
const expiry=(date:string)=>Date.parse(/Z|[+-]\d\d:\d\d$/.test(date)?date:date+'Z');
export default function PickupDelegationPanel({ bookingId, status }: {bookingId:string;status:string}) {
    const [grants,setGrants]=useState<Grant[]>([]);const [contact,setContact]=useState('');const [minutes,setMinutes]=useState(60);
    const [issued,setIssued]=useState<{id:string;pin:string;expiresAt:string}>();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [now,setNow]=useState(Date.now);
    const base=`/api/bookings/${bookingId}/support`;
    useEffect(()=>{let disposed=false;let pending=false;async function load(){if(pending)return;pending=true;try{const res=await apiClient.get<{delegations:Grant[]}>(base);if(!disposed)setGrants(Array.isArray(res.data?.delegations)?res.data.delegations:[]);}catch{if(!disposed){setIssued(undefined);setMessage('Không đọc được trạng thái ủy quyền. Hãy tải lại trước khi chia sẻ mã.');}}finally{pending=false;}}
        void load();const timer=window.setInterval(()=>void load(),5000);const clock=window.setInterval(()=>setNow(Date.now()),1000);return()=>{disposed=true;clearInterval(timer);clearInterval(clock);};},[base]);
    if(status!=='STORED')return null;
    const validPin=issued && expiry(issued.expiresAt)>now && grants.some(g=>g.id===issued.id && !g.revokedAt && !g.usedAt && expiry(g.expiresAt)>now);
    async function create(){if(busy)return;setBusy(true);setIssued(undefined);setMessage('');try{const res=await apiClient.post<{id:string;pin:string;expiresAt:string;delivery?:Delivery}>(base+'/delegations',{contact,validMinutes:minutes});if(!/^\d{8}$/.test(res.data.pin))throw new Error('Invalid credential');setIssued(res.data);setGrants(listOf((await apiClient.get<{delegations?:Grant[]}>(base)).data));setMessage(deliveryMessage(res.data.delivery,contact));}catch{setMessage('Không tạo được mã. Kiểm tra thời hạn đơn, người nhận và thử lại.');}finally{setBusy(false);}}
    async function revoke(id:string){if(busy)return;setBusy(true);try{await apiClient.delete(base+'/delegations/'+id);setIssued(undefined);setGrants(listOf((await apiClient.get<{delegations?:Grant[]}>(base)).data));setMessage('Đã thu hồi mã.');}catch{setMessage('Không thu hồi được; mã có thể đã sử dụng. Tải lại trạng thái.');}finally{setBusy(false);}}
    return <section className="my-5 space-y-4 rounded-2xl border bg-white p-5"><h2 className="font-bold">Ủy quyền lấy đồ</h2>
        <p className="text-sm">Người nhận dùng PIN một lần tại đúng trạm để lấy đúng ngăn của đơn. Phụ phí còn nợ vẫn phải thanh toán. Nhập email: hệ thống gửi PIN tới người nhận. Nhập số điện thoại: hệ thống chưa gửi SMS, bạn cần tự chuyển PIN.</p>
        {message && <p role="status">{message}</p>}
        <form className="space-y-3" onSubmit={e=>{e.preventDefault();void create();}}>
            <label className="block">Số điện thoại hoặc email người nhận<input aria-label="Người nhận ủy quyền" className="block w-full rounded border p-2" value={contact} onChange={e=>setContact(e.target.value)} required maxLength={255}/></label>
            <label className="block">Hiệu lực (phút, tối đa đến hạn thuê)<input aria-label="Hiệu lực ủy quyền" className="ml-2 rounded border p-2" type="number" min={1} max={1440} step={1} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label>
            <button type="submit" disabled={busy} className="rounded bg-blue-700 p-2 text-white disabled:opacity-50">Tạo mã 8 số dùng một lần</button>
        </form>
        {validPin && issued && <div className="rounded bg-blue-50 p-3"><p className="font-mono text-2xl">{issued.pin.slice(0,4)} {issued.pin.slice(4)}</p><p>Hết hạn: {new Date(expiry(issued.expiresAt)).toLocaleString('vi-VN')}</p><button type="button" onClick={()=>void navigator.clipboard.writeText(issued.pin).then(()=>setMessage('Đã sao chép PIN.')).catch(()=>setMessage('Không sao chép được. Hãy lưu PIN đang hiển thị.'))}>Sao chép PIN</button></div>}
        {grants.map(g=><div key={g.id} className="rounded border p-3"><span>{g.contact} · {g.usedAt?'Đã sử dụng':g.revokedAt?'Đã thu hồi':expiry(g.expiresAt)<=now?'Hết hạn':'Đang hiệu lực'} · {new Date(expiry(g.expiresAt)).toLocaleString('vi-VN')}</span>
            {!g.usedAt && !g.revokedAt && expiry(g.expiresAt)>now && <button type="button" className="ml-3 text-red-700 underline" disabled={busy} onClick={()=>void revoke(g.id)}>Thu hồi</button>}</div>)}
    </section>;
}
