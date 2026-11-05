import { CheckCircle2, Lock, Wrench, ShieldOff, Clock, CircleHelp } from 'lucide-react';
import type { ElementType } from 'react';
export type LockerBusinessStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'DISABLED' | 'BLOCKED' | 'UNKNOWN';
export interface LockerStatusMeta {
    status: LockerBusinessStatus; label: string; sublabel: string; badgeBg: string; badgeText: string;
    badgeBorder: string; dotColor: string; cardBorder: string; cardBg: string; cardHoverBorder: string;
    icon: ElementType; description: string;
}
function meta(status: LockerBusinessStatus, label: string, icon: ElementType, color: string): LockerStatusMeta {
    // Complete literal classes keep Tailwind's source scanner deterministic.
    const colors = {
        green: ['bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'bg-emerald-500'],
        red: ['bg-rose-50', 'text-rose-700', 'border-rose-200', 'bg-rose-500'],
        yellow: ['bg-amber-50', 'text-amber-700', 'border-amber-200', 'bg-amber-500'],
        gray: ['bg-slate-100', 'text-slate-700', 'border-slate-300', 'bg-slate-500'],
    }[color]!;
    return { status, label, sublabel: status, badgeBg: colors[0], badgeText: colors[1], badgeBorder: colors[2],
        dotColor: colors[3], cardBorder: colors[2], cardBg: colors[0], cardHoverBorder: 'hover:border-blue-400', icon, description: label };
}
export const LOCKER_STATUS_CONFIG: Record<LockerBusinessStatus, LockerStatusMeta> = {
    AVAILABLE: meta('AVAILABLE', 'Trống', CheckCircle2, 'green'),
    RESERVED: meta('RESERVED', 'Đã giữ chỗ', Clock, 'yellow'),
    OCCUPIED: meta('OCCUPIED', 'Đang lưu đồ', Lock, 'red'),
    MAINTENANCE: meta('MAINTENANCE', 'Bảo trì', Wrench, 'gray'),
    DISABLED: meta('DISABLED', 'Vô hiệu hóa', ShieldOff, 'gray'),
    BLOCKED: meta('BLOCKED', 'Tạm khóa', ShieldOff, 'gray'),
    UNKNOWN: meta('UNKNOWN', 'Chưa xác định', CircleHelp, 'gray'),
};
export function normalizeLockerStatus(rawStatus?: string): LockerBusinessStatus {
    const value = (rawStatus ?? '').toUpperCase();
    return Object.hasOwn(LOCKER_STATUS_CONFIG, value) ? value as LockerBusinessStatus : 'UNKNOWN';
}
