import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * Lớp phủ + hành vi chung cho mọi hộp thoại (trước đây ~30 hộp thoại tự viết `fixed inset-0 ...` riêng,
 * mỗi cái một màu nền, không có Esc, không khóa cuộn trang, không trả focus).
 *
 * Chỉ thay lớp ngoài cùng; nội dung hộp thoại giữ nguyên. Cung cấp:
 * - role="dialog" + aria-modal, tên lấy từ `label` hoặc tiêu đề (h1–h3) đầu tiên bên trong;
 * - Esc đóng (hộp thoại trên cùng), tùy chọn bấm nền để đóng (mặc định tắt để không mất dữ liệu form);
 * - khóa cuộn trang nền, nhốt Tab trong hộp thoại, đưa focus vào hộp thoại và trả lại khi đóng.
 */

const stack: symbol[] = [];
let lockCount = 0;
let savedOverflow = '';

function lockScroll() {
    if (lockCount === 0) {
        savedOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
}

function unlockScroll() {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) document.body.style.overflow = savedOverflow;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface ModalOverlayProps {
    /** Gọi khi người dùng nhấn Esc (hoặc bấm nền nếu bật). Không truyền thì hộp thoại không tự đóng. */
    onClose?: () => void;
    /** Bấm vào nền tối để đóng. Mặc định tắt vì nhiều hộp thoại là form. */
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    /** Tên hộp thoại cho trình đọc màn hình; bỏ trống thì dùng tiêu đề đầu tiên bên trong. */
    label?: string;
    /** Lớp z-index (mặc định z-50); dùng lớp cao hơn cho hộp thoại phải nằm trên mọi thứ khác. */
    zClass?: string;
    /** Lớp bổ sung cho lớp phủ, ví dụ `overflow-y-auto`. */
    className?: string;
    /** `side`: bảng trượt sát mép phải (không đệm), dùng cho hộp xem xét chi tiết. Mặc định `center`. */
    placement?: 'center' | 'side';
    /** `dark`: nền tối hơn cho xem ảnh phóng to. */
    scrim?: 'default' | 'dark';
    children: ReactNode;
}

export default function ModalOverlay({ onClose, closeOnBackdrop = false, closeOnEscape = true, label, zClass = "z-50", className = "", placement = "center", scrim = "default", children }: ModalOverlayProps) {
    const ref = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const id = Symbol('modal');
        stack.push(id);
        lockScroll();
        const previous = document.activeElement as HTMLElement | null;

        // Đặt tên cho hộp thoại từ tiêu đề đầu tiên nếu chưa có.
        if (!label) {
            const heading = node.querySelector<HTMLElement>('h1,h2,h3');
            if (heading) {
                if (!heading.id) heading.id = `dlg-${Math.random().toString(36).slice(2, 9)}`;
                node.setAttribute('aria-labelledby', heading.id);
            }
        }

        // Focus vào phần tử có autofocus, hoặc điều khiển đầu tiên; không có thì vào chính hộp thoại.
        const first = node.querySelector<HTMLElement>('[autofocus]') ?? node.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? node).focus({ preventScroll: true });

        const onKey = (e: KeyboardEvent) => {
            if (stack[stack.length - 1] !== id) return; // chỉ hộp thoại trên cùng xử lý
            if (e.key === 'Escape' && closeOnEscape && onCloseRef.current) {
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (e.key === 'Tab') {
                const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
                if (items.length === 0) { e.preventDefault(); node.focus(); return; }
                const firstEl = items[0];
                const lastEl = items[items.length - 1];
                if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === node)) { e.preventDefault(); lastEl.focus(); }
                else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
            }
        };
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('keydown', onKey);
            const i = stack.indexOf(id);
            if (i >= 0) stack.splice(i, 1);
            unlockScroll();
            previous?.focus?.({ preventScroll: true });
        };
        // chỉ chạy khi mở/đóng; onClose đọc qua ref
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={`fixed inset-0 ${zClass} flex ${placement === "side" ? "items-start justify-end" : "items-center justify-center p-4"} ${scrim === "dark" ? "bg-black/80" : "bg-slate-900/55"} backdrop-blur-xs animate-in fade-in duration-150 outline-none ${className}`}
            onMouseDown={(e) => {
                if (closeOnBackdrop && onClose && e.target === e.currentTarget) onClose();
            }}
        >
            {children}
        </div>
    );
}
