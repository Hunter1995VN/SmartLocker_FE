/**
 * AD-FE-05: Quản lý tài khoản hệ thống
 * Thanh bộ lọc trạng thái dạng tabs (Tất cả, Hoạt động bình thường, Tạm khóa đặt tủ, Tạm khóa đăng nhập, Chờ xác nhận),
 * tìm kiếm họ tên/email/phone, lọc vai trò và làm mới.
 */
import { Search, RotateCw, Plus, Download } from 'lucide-react';

interface UserFilterBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    statusFilter: string; // 'ALL' | 'ACTIVE' | 'BOOKING_BLOCKED' | 'SUSPENDED' | 'PENDING_VERIFICATION'
    onStatusFilterChange: (status: string) => void;
    roleFilter: string; // 'ALL' | 'ADMIN' | 'STAFF' | 'TRAVELER'
    onRoleFilterChange: (role: string) => void;
    totalCount: number;
    activeCount: number;
    bookingBlockedCount: number;
    suspendedCount: number;
    pendingCount: number;
    onRefresh: () => void;
    isRefreshing: boolean;
    onOpenCreateModal?: () => void;
    onExportCsv: () => void;
    isAdmin: boolean;
    showCreateStaff?: boolean;
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
    bookingBlockedCount,
    suspendedCount,
    pendingCount,
    onRefresh,
    isRefreshing,
    onOpenCreateModal,
    onExportCsv,
    isAdmin,
    showCreateStaff = false,
}: UserFilterBarProps) {
    const tabs: Array<{ id: string; label: string; count: number }> = [
        { id: 'ALL', label: 'Tất cả trạng thái', count: totalCount },
        { id: 'ACTIVE', label: 'Hoạt động bình thường', count: activeCount },
        { id: 'BOOKING_BLOCKED', label: 'Tạm khóa đặt tủ', count: bookingBlockedCount },
        { id: 'SUSPENDED', label: 'Tạm khóa đăng nhập', count: suspendedCount },
        { id: 'PENDING_VERIFICATION', label: 'Chờ xác nhận', count: pendingCount },
    ];

    return (
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs space-y-3">
            {/* Top row: Status Tabs & Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
                {/* Status Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {tabs.map((tab) => {
                        const isSelected = statusFilter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onStatusFilterChange(tab.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                        ? tab.id === 'BOOKING_BLOCKED'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : tab.id === 'SUSPENDED'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                        isSelected
                                            ? 'bg-white/20 text-white'
                                            : tab.id === 'BOOKING_BLOCKED' && tab.count > 0
                                            ? 'bg-amber-100 text-amber-700'
                                            : tab.id === 'SUSPENDED' && tab.count > 0
                                            ? 'bg-rose-100 text-rose-700'
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

                    {isAdmin && showCreateStaff && onOpenCreateModal && (
                        <button
                            type="button"
                            onClick={onOpenCreateModal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition cursor-pointer shadow-xs shadow-blue-600/20"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tạo tài khoản Staff</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom row: Search input, Role dropdown & Refresh */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Tìm kiếm tài khoản theo Họ tên, Email, Số điện thoại..."
                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-slate-800 placeholder-slate-400 transition"
                    />
                </div>

                {/* Right Filter Dropdowns */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Role Filter */}
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl px-2 py-1">
                        <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">Vai trò:</span>
                        <select
                            value={roleFilter}
                            onChange={(e) => onRoleFilterChange(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
                        >
                            <option value="ALL">Tất cả vai trò</option>
                            <option value="TRAVELER">Khách hàng (Traveler)</option>
                            <option value="STAFF">Nhân viên trạm (Staff)</option>
                            <option value="ADMIN">Quản trị viên (Admin)</option>
                        </select>
                    </div>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition cursor-pointer disabled:opacity-50"
                        title="Tải lại danh sách"
                    >
                        <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
        </div>
    );
}
