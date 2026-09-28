/**
 * AD-FE-05: UC-A06 — Manage Internal Users
 * Thanh bộ lọc trạng thái dạng tabs, tìm kiếm họ tên/email/phone và dropdown vai trò.
 */
import { Search, Filter, RotateCw, Plus, Download } from 'lucide-react';

interface UserFilterBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    statusFilter: string; // 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'
    onStatusFilterChange: (status: string) => void;
    roleFilter: string; // 'ALL' | 'ADMIN' | 'STAFF' | 'TRAVELER'
    onRoleFilterChange: (role: string) => void;
    totalCount: number;
    activeCount: number;
    suspendedCount: number;
    pendingCount: number;
    onRefresh: () => void;
    isRefreshing: boolean;
    onOpenCreateModal: () => void;
    onExportCsv: () => void;
    isAdmin: boolean;
}

export default function UserFilterBar({
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    roleFilter,
    onRoleFilterChange,
    totalCount,
    activeCount,
    suspendedCount,
    pendingCount,
    onRefresh,
    isRefreshing,
    onOpenCreateModal,
    onExportCsv,
    isAdmin,
}: UserFilterBarProps) {
    const tabs: Array<{ id: string; label: string; count: number }> = [
        { id: 'ALL', label: 'Tất cả', count: totalCount },
        { id: 'ACTIVE', label: 'Đang hoạt động', count: activeCount },
        { id: 'SUSPENDED', label: 'Bị tạm khóa', count: suspendedCount },
        { id: 'PENDING_VERIFICATION', label: 'Chờ xác nhận', count: pendingCount },
    ];

    return (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
            {/* Top row: Status Tabs & Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {tabs.map((tab) => {
                        const isSelected = statusFilter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onStatusFilterChange(tab.id)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                                    isSelected
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                        isSelected
                                            ? 'bg-white/20 text-white'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Export & Create Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onExportCsv}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                        title="Xuất file danh sách CSV"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xuất CSV</span>
                    </button>

                    {isAdmin && (
                        <button
                            type="button"
                            onClick={onOpenCreateModal}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition cursor-pointer shadow-xs shadow-blue-600/20"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tạo tài khoản Staff</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom row: Search input, Role dropdown & Refresh */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Tìm kiếm nhân sự theo Tên, Email, Số điện thoại..."
                        className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-800 placeholder-slate-400"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Filter Dropdown & Refresh */}
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2">
                        <label htmlFor="role-filter-select" className="text-xs font-semibold text-slate-500 whitespace-nowrap flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <span>Vai trò:</span>
                        </label>
                        <select
                            id="role-filter-select"
                            value={roleFilter}
                            onChange={(e) => onRoleFilterChange(e.target.value)}
                            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-700 cursor-pointer"
                        >
                            <option value="ALL">Tất cả vai trò</option>
                            <option value="STAFF">Vận hành (Staff)</option>
                            <option value="ADMIN">Quản trị viên (Admin)</option>
                            <option value="TRAVELER">Khách hàng (Traveler)</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200/80 transition cursor-pointer disabled:opacity-50"
                        title="Tải lại dữ liệu"
                    >
                        <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                </div>
            </div>
        </div>
    );
}
