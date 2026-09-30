/**
 * AD-FE-07: UC-A09, S-03 — Shared helpers for Abandoned Property UI.
 * Status badge, disposal action label, overdue display helpers.
 */
import { DISPOSAL_ACTIONS } from '../../../api/abandonedPropertyService';

// ─── Status metadata ──────────────────────────────────────────────────────────

export function getStatusMeta(status: string): {
    label: string;
    cls: string;      // Tailwind classes for badge
    dot: string;      // dot color
} {
    const s = (status || '').toUpperCase();
    const map: Record<string, { label: string; cls: string; dot: string }> = {
        REPORTED: {
            label: 'Đã báo cáo',
            cls: 'bg-amber-50 text-amber-700 border-amber-200',
            dot: 'bg-amber-500',
        },
        PENDING_APPROVAL: {
            label: 'Chờ Admin duyệt',
            cls: 'bg-blue-50 text-blue-700 border-blue-200',
            dot: 'bg-blue-500',
        },
        APPROVED: {
            label: 'Đã phê duyệt',
            cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            dot: 'bg-emerald-500',
        },
        DISPOSED: {
            label: 'Đã xử lý / Thanh lý',
            cls: 'bg-slate-100 text-slate-600 border-slate-200',
            dot: 'bg-slate-400',
        },
        RETURNED: {
            label: 'Đã trả khách',
            cls: 'bg-teal-50 text-teal-700 border-teal-200',
            dot: 'bg-teal-500',
        },
    };
    return (
        map[s] ?? {
            label: status || '—',
            cls: 'bg-slate-100 text-slate-600 border-slate-200',
            dot: 'bg-slate-400',
        }
    );
}

export function StatusBadge({ status }: { status: string }) {
    const { label, cls, dot } = getStatusMeta(status);
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold uppercase tracking-wide ${cls}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
        </span>
    );
}

// ─── Disposal action label ────────────────────────────────────────────────────

export function disposalLabel(action?: string | null): string {
    if (!action) return '—';
    const found = DISPOSAL_ACTIONS.find((d) => d.value === action);
    return found ? found.label : action;
}

// ─── Overdue display ──────────────────────────────────────────────────────────

export function overdueDisplay(hours: number): string {
    if (hours < 24) return `${hours} giờ`;
    const days = Math.floor(hours / 24);
    const rem = hours % 24;
    return rem > 0 ? `${days} ngày ${rem} giờ` : `${days} ngày`;
}

// ─── Detail row helper ────────────────────────────────────────────────────────

export function DetailRow({
    label,
    value,
    mono = false,
    accent = false,
    multiline = false,
}: {
    label: string;
    value?: string | null;
    mono?: boolean;
    accent?: boolean;
    multiline?: boolean;
}) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider w-32 shrink-0 mt-0.5">
                {label}
            </p>
            <p
                className={`text-sm font-semibold flex-1 min-w-0 ${
                    accent ? 'text-blue-700' : 'text-slate-800'
                } ${mono ? 'font-mono' : ''} ${multiline ? 'whitespace-pre-wrap break-words' : 'truncate'}`}
            >
                {value}
            </p>
        </div>
    );
}
