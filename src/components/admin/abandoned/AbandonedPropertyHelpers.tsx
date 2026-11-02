/**
 * AD-FE-07: UC-A09, S-03 — Shared helpers for Abandoned Property UI.
 * Status badge, disposal action label, overdue display helpers and itemDescription parser.
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
            label: 'Đã lập biên bản',
            cls: 'bg-amber-50 text-amber-800 border-amber-200/90',
            dot: 'bg-amber-500',
        },
        PENDING_APPROVAL: {
            label: 'Chờ Admin duyệt (4-Eyes)',
            cls: 'bg-indigo-50 text-indigo-800 border-indigo-200/90',
            dot: 'bg-indigo-500',
        },
        APPROVED: {
            label: 'Đã phê duyệt',
            cls: 'bg-blue-50 text-blue-800 border-blue-200/90',
            dot: 'bg-blue-500',
        },
        DISPOSED: {
            label: 'Đã thanh lý / Xuất kho',
            cls: 'bg-slate-100 text-slate-700 border-slate-300',
            dot: 'bg-slate-500',
        },
        RETURNED: {
            label: 'Đã bàn giao cho khách',
            cls: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
            dot: 'bg-emerald-500',
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

// ─── Parser for itemDescription ───────────────────────────────────────────────

export interface ParsedInspectionItem {
    category: string;
    description: string;
    quantity?: string;
    condition?: string;
    note?: string;
}

export interface ParsedInspectionData {
    sealCode?: string;
    measuredWeight?: string;
    generalCondition?: string;
    safetyVerified?: boolean;
    items: ParsedInspectionItem[];
    rawText: string;
    isStructured: boolean;
}

export function parseItemDescription(raw?: string | null): ParsedInspectionData {
    if (!raw) return { items: [], rawText: '', isStructured: false };

    const sealMatch = raw.match(/Mã tem niêm phong:\s*([^\r\n]+)/i);
    const weightMatch = raw.match(/Tải trọng thực địa:\s*([^\r\n]+)/i);
    const conditionMatch = raw.match(/Tình trạng tổng quan:\s*([^\r\n]+)/i);
    const safetyMatch = raw.match(/Cam kết an toàn:\s*([^\r\n]+)/i);

    const items: ParsedInspectionItem[] = [];
    const itemRegex = /\d+\.\s*\[([^\]]+)\]\s*([^\(\r\n]+)(?:\(SL:\s*([^,]+),\s*Tình trạng:\s*([^\)]+)\))?(?:\s*-\s*Ghi chú:\s*([^\r\n]+))?/g;
    let match;
    while ((match = itemRegex.exec(raw)) !== null) {
        items.push({
            category: match[1]?.trim() || 'Tài sản',
            description: match[2]?.trim() || '',
            quantity: match[3]?.trim(),
            condition: match[4]?.trim(),
            note: match[5]?.trim(),
        });
    }

    const isStructured = !!(sealMatch || weightMatch || items.length > 0 || raw.includes('[BIÊN BẢN KIỂM KÊ'));

    return {
        sealCode: sealMatch ? sealMatch[1].trim() : undefined,
        measuredWeight: weightMatch ? weightMatch[1].trim() : undefined,
        generalCondition: conditionMatch ? conditionMatch[1].trim() : undefined,
        safetyVerified: safetyMatch ? !safetyMatch[1].toLowerCase().includes('chưa') : undefined,
        items,
        rawText: raw,
        isStructured,
    };
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
        <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0 text-xs">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider w-28 sm:w-36 shrink-0 mt-0.5">
                {label}
            </p>
            <p
                className={`font-semibold flex-1 min-w-0 ${
                    accent ? 'text-blue-700' : 'text-slate-800'
                } ${mono ? 'font-mono' : ''} ${multiline ? 'whitespace-pre-wrap break-words leading-relaxed' : 'truncate'}`}
            >
                {value}
            </p>
        </div>
    );
}
