/**
 * AD-FE-04: UC-A05 + S-01 — Realtime Locker Grid & Status Control
 * Centralized status mapping definitions:
 * AVAILABLE   -> Xanh (Green / Emerald) -> "Available" / "Sẵn sàng"
 * OCCUPIED    -> Đỏ (Red / Rose)        -> "Occupied" / "Đang dùng"
 * MAINTENANCE -> Vàng (Amber / Yellow)  -> "Maintenance" / "Bảo trì"
 * DISABLED    -> Xám (Gray / Slate)     -> "Disabled" / "Vô hiệu hóa"
 */
import { CheckCircle2, Lock, Wrench, ShieldOff } from 'lucide-react';
import type { ElementType } from 'react';

export type LockerBusinessStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'DISABLED';

export interface LockerStatusMeta {
    status: LockerBusinessStatus;
    label: string;
    sublabel: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotColor: string;
    cardBorder: string;
    cardBg: string;
    cardHoverBorder: string;
    icon: ElementType;
    description: string;
}

export const LOCKER_STATUS_CONFIG: Record<LockerBusinessStatus, LockerStatusMeta> = {
    AVAILABLE: {
        status: 'AVAILABLE',
        label: 'Sẵn sàng',
        sublabel: 'AVAILABLE (SẴN SÀNG)',
        badgeBg: 'bg-emerald-50',
        badgeText: 'text-emerald-700',
        badgeBorder: 'border-emerald-200',
        dotColor: 'bg-emerald-500',
        cardBorder: 'border-emerald-200/90',
        cardBg: 'bg-emerald-50/40',
        cardHoverBorder: 'hover:border-emerald-400',
        icon: CheckCircle2,
        description: 'Tủ đang trống, sẵn sàng cho khách hàng đặt và sử dụng',
    },
    OCCUPIED: {
        status: 'OCCUPIED',
        label: 'Đang dùng',
        sublabel: 'OCCUPIED (ĐANG DÙNG)',
        badgeBg: 'bg-rose-50',
        badgeText: 'text-rose-700',
        badgeBorder: 'border-rose-200',
        dotColor: 'bg-rose-500',
        cardBorder: 'border-rose-200/90',
        cardBg: 'bg-rose-50/40',
        cardHoverBorder: 'hover:border-rose-400',
        icon: Lock,
        description: 'Tủ đang được sử dụng hoặc đã có khách lưu trữ hành lý',
    },
    MAINTENANCE: {
        status: 'MAINTENANCE',
        label: 'Bảo trì',
        sublabel: 'MAINTENANCE (BẢO TRÌ)',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-700',
        badgeBorder: 'border-amber-200',
        dotColor: 'bg-amber-500',
        cardBorder: 'border-amber-200/90',
        cardBg: 'bg-amber-50/40',
        cardHoverBorder: 'hover:border-amber-400',
        icon: Wrench,
        description: 'Tủ đang trong quy trình bảo trì kỹ thuật hoặc cách ly sự cố',
    },
    DISABLED: {
        status: 'DISABLED',
        label: 'Vô hiệu hóa',
        sublabel: 'DISABLED (KHÓA AN TOÀN)',
        badgeBg: 'bg-slate-100',
        badgeText: 'text-slate-600',
        badgeBorder: 'border-slate-300',
        dotColor: 'bg-slate-500',
        cardBorder: 'border-slate-300/80',
        cardBg: 'bg-slate-100/70',
        cardHoverBorder: 'hover:border-slate-400',
        icon: ShieldOff,
        description: 'Tủ bị khóa an toàn khẩn cấp hoặc ngắt nguồn bo mạch',
    },
};

/**
 * Chuẩn hóa status từ API (ví dụ RESERVED hay BLOCKED) về 4 trạng thái chuẩn
 */
export function normalizeLockerStatus(rawStatus?: string): LockerBusinessStatus {
    const s = (rawStatus || '').toUpperCase();
    if (s === 'AVAILABLE') return 'AVAILABLE';
    if (s === 'OCCUPIED' || s === 'RESERVED') return 'OCCUPIED';
    if (s === 'MAINTENANCE') return 'MAINTENANCE';
    if (s === 'DISABLED' || s === 'BLOCKED') return 'DISABLED';
    return 'AVAILABLE';
}
