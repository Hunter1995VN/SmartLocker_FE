import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Clock, Copy, Mail, Phone, ShieldAlert, X } from 'lucide-react';
import { CONTACT, LEGAL_EVENT, SUPPORT_EVENT, type LegalKind } from '../../utils/contact';

const LEGAL_CONTENT: Record<LegalKind, { title: string; sections: { heading: string; body: string }[] }> = {
    privacy: {
        title: 'Chính sách bảo mật',
        sections: [
            { heading: 'Dữ liệu chúng tôi thu thập', body: 'Họ tên, email, số điện thoại, lịch sử đặt tủ và sự kiện đóng/mở cửa tủ liên quan đến đơn của bạn. Với đăng nhập Google, chúng tôi chỉ nhận tên, email và ảnh hồ sơ công khai.' },
            { heading: 'Mã PIN và mã QR', body: 'Mã PIN truy cập được lưu dưới dạng băm, mã QR thay đổi định kỳ và chỉ hiển thị cho chủ đơn đã thanh toán. Không chia sẻ mã cho người lạ; chức năng ủy quyền tạo mã riêng, dùng một lần.' },
            { heading: 'Thanh toán', body: 'Thanh toán được xử lý bởi cổng PayOS. SmartLocker không lưu số thẻ hay thông tin tài khoản ngân hàng của bạn.' },
            { heading: 'Quyền của bạn', body: 'Bạn có thể xem và sửa thông tin cá nhân, đổi ảnh đại diện hoặc yêu cầu xóa tài khoản qua hotline hỗ trợ.' },
        ],
    },
    terms: {
        title: 'Điều khoản dịch vụ',
        sections: [
            { heading: 'Sử dụng tủ', body: 'Mỗi đơn gắn với một ô tủ theo kích cỡ S/M/L trong khung giờ đã đặt. Không gửi hàng cấm, chất dễ cháy nổ, tiền mặt hoặc giấy tờ có giá trị lớn.' },
            { heading: 'Hủy và hoàn tiền', body: 'Hủy trước thời hạn hoàn tiền của trạm được hoàn tiền theo tỷ lệ hiển thị tại bước hủy đơn; hủy muộn hơn áp dụng tỷ lệ thấp hơn.' },
            { heading: 'Trách nhiệm', body: 'Bạn chịu trách nhiệm bảo mật mã PIN/QR. Khi cảm biến cửa gặp sự cố, nhân viên sẽ xác minh bằng ảnh trước khi đóng đơn.' },
            { heading: 'Thay đổi điều khoản', body: 'Điều khoản có thể được cập nhật; phiên bản mới có hiệu lực khi được đăng tại đây.' },
        ],
    },
    overdue: {
        title: 'Quy trình xử lý quá hạn',
        sections: [
            { heading: 'Thời gian ân hạn', body: 'Mỗi trạm có thời gian ân hạn sau giờ kết thúc (hiển thị tại trang chi tiết trạm). Quá thời gian này, đơn chuyển sang trạng thái quá hạn.' },
            { heading: 'Phụ phí quá hạn', body: 'Phụ phí tính theo từng giờ quá hạn theo bảng giá của trạm và cỡ tủ. Bạn thanh toán phụ phí tại kiosk hoặc trên web trước khi lấy đồ.' },
            { heading: 'Đồ không được nhận', body: 'Nếu quá hạn kéo dài và không liên hệ được, đồ được lập biên bản và bàn giao cho nhân viên theo quy trình đồ thất lạc.' },
        ],
    },
};

/** Hộp thoại chung: đóng bằng Esc, bấm nền hoặc nút X; trả focus về nút mở. */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    const closeRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
            previous?.focus?.();
        };
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3 sticky top-0 bg-white border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    <button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

function SupportBody() {
    const [copied, setCopied] = useState(false);
    const copyHotline = async () => {
        try {
            await navigator.clipboard.writeText(CONTACT.hotlineLabel);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* trình duyệt chặn clipboard: số vẫn hiển thị để tự chép */ }
    };
    return (
        <div className="space-y-4 text-sm text-slate-700">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Tổng đài hỗ trợ</p>
                <p className="text-2xl font-extrabold text-slate-900 tracking-wide">{CONTACT.hotlineLabel}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <a href={`tel:${CONTACT.hotlineTel}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                        <Phone className="w-4 h-4" /> Gọi ngay
                    </a>
                    <button type="button" onClick={copyHotline} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 font-semibold cursor-pointer">
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Đã sao chép' : 'Sao chép số'}
                    </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Nếu bấm &ldquo;Gọi ngay&rdquo; không mở ứng dụng gọi điện (máy tính), hãy dùng điện thoại gọi số trên.</p>
            </div>
            {CONTACT.email && (
                <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                    <Mail className="w-5 h-5 text-blue-600" /> <span>{CONTACT.email}</span>
                </a>
            )}
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" /> <span>{CONTACT.hours}</span>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" /> <span>{CONTACT.emergencyNote}</span>
            </div>
        </div>
    );
}

/** Gắn một lần ở App: lắng nghe sự kiện mở hộp thoại Liên hệ và Chính sách. */
export default function GlobalDialogs() {
    const [supportOpen, setSupportOpen] = useState(false);
    const [legal, setLegal] = useState<LegalKind | null>(null);
    useEffect(() => {
        const onSupport = () => setSupportOpen(true);
        const onLegal = (e: Event) => setLegal((e as CustomEvent<LegalKind>).detail);
        window.addEventListener(SUPPORT_EVENT, onSupport);
        window.addEventListener(LEGAL_EVENT, onLegal);
        return () => {
            window.removeEventListener(SUPPORT_EVENT, onSupport);
            window.removeEventListener(LEGAL_EVENT, onLegal);
        };
    }, []);
    const closeSupport = useCallback(() => setSupportOpen(false), []);
    const closeLegal = useCallback(() => setLegal(null), []);
    return (
        <>
            {supportOpen && <Modal title="Liên hệ & Hỗ trợ" onClose={closeSupport}><SupportBody /></Modal>}
            {legal && (
                <Modal title={LEGAL_CONTENT[legal].title} onClose={closeLegal}>
                    <div className="space-y-4 text-sm text-slate-700">
                        {LEGAL_CONTENT[legal].sections.map((s) => (
                            <section key={s.heading}>
                                <h3 className="font-bold text-slate-900 mb-1">{s.heading}</h3>
                                <p className="leading-relaxed">{s.body}</p>
                            </section>
                        ))}
                        <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">Nội dung minh họa cho đồ án SmartLocker; cần được nhóm xác nhận trước khi dùng chính thức.</p>
                    </div>
                </Modal>
            )}
        </>
    );
}
