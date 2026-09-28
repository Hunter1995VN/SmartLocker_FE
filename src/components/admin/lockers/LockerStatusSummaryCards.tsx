/**
 * AD-FE-04: UC-A05 — Locker Status Legend & Summary Cards
 * 4 Thẻ thống kê nhanh & bảng giải thích trạng thái (Status Legend):
 * 🟢 AVAILABLE (Sẵn sàng)
 * 🔴 OCCUPIED (Đang dùng)
 * 🟡 MAINTENANCE (Bảo trì)
 * ⚫ DISABLED (Khóa an toàn)
 */
import { CheckCircle2, Lock, Wrench, ShieldOff } from 'lucide-react';
import type { LockerBusinessStatus } from './lockerStatusConstants';

interface LockerStatusSummaryCardsProps {
    total: number;
    availableCount: number;
    occupiedCount: number;
    maintenanceCount: number;
    disabledCount: number;
    selectedFilter: string;
    onSelectFilter: (status: string) => void;
    isLoading: boolean;
}

export default function LockerStatusSummaryCards({
    total,
    availableCount,
    occupiedCount,
    maintenanceCount,
    disabledCount,
    selectedFilter,
    onSelectFilter,
    isLoading,
}: LockerStatusSummaryCardsProps) {
    const calcPct = (cnt: number) => (total > 0 ? ((cnt / total) * 100).toFixed(1) : '0.0');

    const cards: {
        key: LockerBusinessStatus;
        title: string;
        count: number;
        pct: string;
        dotBg: string;
        badgeBg: string;
        textColor: string;
        borderColor: string;
        icon: typeof CheckCircle2;
    }[] = [
        {
            key: 'AVAILABLE',
            title: 'AVAILABLE (SẴN SÀNG)',
            count: availableCount,
            pct: calcPct(availableCount),
            dotBg: 'bg-emerald-500',
            badgeBg: 'bg-emerald-50/70',
            textColor: 'text-emerald-700',
            borderColor: 'border-emerald-200/80',
            icon: CheckCircle2,
        },
        {
            key: 'OCCUPIED',
            title: 'OCCUPIED (ĐANG DÙNG)',
            count: occupiedCount,
            pct: calcPct(occupiedCount),
            dotBg: 'bg-rose-500',
            badgeBg: 'bg-rose-50/70',
            textColor: 'text-rose-700',
            borderColor: 'border-rose-200/80',
            icon: Lock,
        },
        {
            key: 'MAINTENANCE',
            title: 'MAINTENANCE (BẢO TRÌ)',
            count: maintenanceCount,
            pct: calcPct(maintenanceCount),
            dotBg: 'bg-amber-500',
            badgeBg: 'bg-amber-50/70',
            textColor: 'text-amber-700',
            borderColor: 'border-amber-200/80',
            icon: Wrench,
        },
        {
            key: 'DISABLED',
            title: 'DISABLED (KHÓA AN TOÀN)',
            count: disabledCount,
            pct: calcPct(disabledCount),
            dotBg: 'bg-slate-500',
            badgeBg: 'bg-slate-100/80',
            textColor: 'text-slate-700',
            borderColor: 'border-slate-300/80',
            icon: ShieldOff,
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
            {cards.map((c) => {
                const isSelected = selectedFilter === c.key;
                const Icon = c.icon;

                return (
                    <button
                        type="button"
                        key={c.key}
                        onClick={() => onSelectFilter(isSelected ? 'all' : c.key)}
                        className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer overflow-hidden ${c.badgeBg} ${c.borderColor} ${
                            isSelected
                                ? 'ring-2 ring-blue-500 shadow-sm'
                                : 'hover:shadow-xs hover:border-slate-400/50'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${c.dotBg}`} />
                                <span className="truncate">{c.title}</span>
                            </span>
                            <div className="w-6 h-6 rounded-lg bg-white/80 border border-slate-200 flex items-center justify-center shrink-0">
                                <Icon className={`w-3.5 h-3.5 ${c.textColor}`} />
                            </div>
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">
                                {isLoading ? '—' : c.count}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                                {isLoading ? '' : `${c.pct}%`}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
