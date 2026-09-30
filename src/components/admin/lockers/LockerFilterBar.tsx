/**
 * AD-FE-04: UC-A05 — Locker Filter Bar
 * Thanh công cụ lọc trạng thái và kích thước ô tủ theo thiết kế mockup.
 */
interface LockerFilterBarProps {
    statusFilter: string;
    onStatusFilterChange: (status: string) => void;
    sizeFilter: string;
    onSizeFilterChange: (size: string) => void;
    total: number;
    availableCount: number;
    occupiedCount: number;
    maintenanceCount: number;
    disabledCount: number;
}

export default function LockerFilterBar({
    statusFilter,
    onStatusFilterChange,
    sizeFilter,
    onSizeFilterChange,
    total,
    availableCount,
    occupiedCount,
    maintenanceCount,
    disabledCount,
}: LockerFilterBarProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs mb-5 text-xs">
            {/* Left: Status Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Bộ lọc:
                </span>

                <button
                    type="button"
                    onClick={() => onStatusFilterChange('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        statusFilter === 'all'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    Tất cả ({total})
                </button>

                <button
                    type="button"
                    onClick={() => onStatusFilterChange('AVAILABLE')}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        statusFilter === 'AVAILABLE'
                            ? 'bg-emerald-600 text-white shadow-xs font-bold'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border border-emerald-200/60'
                    }`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Sẵn sàng ({availableCount})</span>
                </button>

                <button
                    type="button"
                    onClick={() => onStatusFilterChange('OCCUPIED')}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        statusFilter === 'OCCUPIED'
                            ? 'bg-rose-600 text-white shadow-xs font-bold'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100/70 border border-rose-200/60'
                    }`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>Đang dùng ({occupiedCount})</span>
                </button>

                <button
                    type="button"
                    onClick={() => onStatusFilterChange('MAINTENANCE')}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        statusFilter === 'MAINTENANCE'
                            ? 'bg-amber-600 text-white shadow-xs font-bold'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100/70 border border-amber-200/60'
                    }`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Bảo trì ({maintenanceCount})</span>
                </button>

                <button
                    type="button"
                    onClick={() => onStatusFilterChange('DISABLED')}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        statusFilter === 'DISABLED'
                            ? 'bg-slate-700 text-white shadow-xs font-bold'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span>Vô hiệu hóa ({disabledCount})</span>
                </button>
            </div>

            {/* Right: Size Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Kích thước:
                </span>

                <button
                    type="button"
                    onClick={() => onSizeFilterChange(sizeFilter === 'S' ? 'all' : 'S')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        sizeFilter === 'S'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    Size S (Balo)
                </button>

                <button
                    type="button"
                    onClick={() => onSizeFilterChange(sizeFilter === 'M' ? 'all' : 'M')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        sizeFilter === 'M'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    Size M (Cabin 20")
                </button>

                <button
                    type="button"
                    onClick={() => onSizeFilterChange(sizeFilter === 'L' ? 'all' : 'L')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        sizeFilter === 'L'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    Size L (Vali 28")
                </button>
            </div>
        </div>
    );
}
