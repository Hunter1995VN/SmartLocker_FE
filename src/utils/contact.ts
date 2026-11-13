/**
 * Thông tin liên hệ dùng chung cho toàn bộ giao diện (một nơi duy nhất để chỉnh).
 * Email hỗ trợ và mạng xã hội chỉ hiện khi có giá trị thật: đặt VITE_SUPPORT_EMAIL, VITE_SOCIAL_* trong file .env.
 */
const env = import.meta.env as Record<string, string | undefined>;

export const CONTACT = {
    hotlineLabel: env.VITE_SUPPORT_HOTLINE_LABEL || '1900 1234',
    hotlineTel: env.VITE_SUPPORT_HOTLINE_TEL || '19001234',
    // Địa chỉ đã có sẵn trong Footer của dự án; đổi bằng VITE_SUPPORT_EMAIL khi có hộp thư thật.
    email: env.VITE_SUPPORT_EMAIL || 'support@smartlocker.vn',
    hours: 'Hỗ trợ 24/7, kể cả ngày lễ',
    emergencyNote: 'Khi cửa tủ không mở, mất mã PIN hoặc cần lấy đồ khẩn cấp, hãy gọi hotline và đọc mã đơn (dạng BK…).',
} as const;

export const SOCIAL_LINKS: { label: string; href: string }[] = [
    { label: 'Facebook', href: env.VITE_SOCIAL_FACEBOOK || '' },
    { label: 'YouTube', href: env.VITE_SOCIAL_YOUTUBE || '' },
    { label: 'Instagram', href: env.VITE_SOCIAL_INSTAGRAM || '' },
].filter((s) => /^https?:\/\//.test(s.href));

export type LegalKind = 'privacy' | 'terms' | 'overdue';

export const SUPPORT_EVENT = 'smartlocker:open-support';
export const LEGAL_EVENT = 'smartlocker:open-legal';

/** Mở hộp thoại Liên hệ / Hỗ trợ từ bất kỳ nút nào. */
export function openSupport(): void {
    window.dispatchEvent(new CustomEvent(SUPPORT_EVENT));
}

/** Mở hộp thoại chính sách (bảo mật / điều khoản / quá hạn). */
export function openLegal(kind: LegalKind): void {
    window.dispatchEvent(new CustomEvent<LegalKind>(LEGAL_EVENT, { detail: kind }));
}

/** Mailto có tiêu đề sẵn cho các yêu cầu hợp tác; trả về null nếu chưa cấu hình email. */
export function mailtoHref(subject: string): string | null {
    return CONTACT.email ? `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}` : null;
}
