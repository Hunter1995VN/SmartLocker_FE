import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Phân trang phía client: tự quay về trang hợp lệ khi dữ liệu đổi (ví dụ làm mới còn ít dòng hơn). */
export function usePagination<T>(items: T[], pageSize = 10) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const safePage = Math.min(page, totalPages);
    const pageItems = useMemo(() => items.slice((safePage - 1) * pageSize, safePage * pageSize), [items, safePage, pageSize]);
    return { page: safePage, setPage, totalPages, pageItems, from: items.length === 0 ? 0 : (safePage - 1) * pageSize + 1, to: Math.min(safePage * pageSize, items.length) };
}

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    from: number;
    to: number;
    onPageChange: (page: number) => void;
    label?: string;
}

/** Thanh phân trang: "Hiển thị 1–10 / 25", nút trước/sau và các số trang (rút gọn bằng dấu …). */
export default function Pagination({ page, totalPages, total, from, to, onPageChange, label = 'mục' }: PaginationProps) {
    if (total === 0) {
        return null;
    }

    const pages: (number | 'gap-left' | 'gap-right')[] = [];
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
        else if (p < page && pages[pages.length - 1] !== 'gap-left') pages.push('gap-left');
        else if (p > page && pages[pages.length - 1] !== 'gap-right') pages.push('gap-right');
    }

    const btn = 'min-w-8 h-8 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
    return (
        <nav aria-label="Phân trang" className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Hiển thị <strong>{from}–{to}</strong> / {total} {label}</p>
            <div className="flex items-center gap-1">
                <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={`${btn} border-slate-200 text-slate-600 hover:bg-slate-50`}>
                    <ChevronLeft className="w-4 h-4" />
                </button>
                {pages.map((p, i) =>
                    typeof p === 'number' ? (
                        <button
                            key={p}
                            type="button"
                            aria-current={p === page ? 'page' : undefined}
                            onClick={() => onPageChange(p)}
                            className={`${btn} ${p === page ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            {p}
                        </button>
                    ) : (
                        <span key={`${p}-${i}`} className="px-1 text-slate-500 text-xs">…</span>
                    ),
                )}
                <button type="button" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={`${btn} border-slate-200 text-slate-600 hover:bg-slate-50`}>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </nav>
    );
}
