/**
 * AD-FE-05: Quản lý tài khoản hệ thống
 * Hàng 4 thẻ KPI tóm tắt tài khoản khách hàng, nhân sự nội bộ và trạng thái truy cập hệ thống.
 */
import { Users, Shield, KeyRound, UserCheck } from 'lucide-react';
import type { UserAdminListItemDto } from '../../../api/adminUserService';

interface UserKpiSummaryCardsProps {
    users: UserAdminListItemDto[];
    isLoading?: boolean;
}

export default function UserKpiSummaryCards({ users, isLoading = false }: UserKpiSummaryCardsProps) {
    const totalCount = users.length;
    const activeCount = users.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE').length;
    const suspendedCount = users.filter((u) => (u.status || '').toUpperCase() === 'SUSPENDED').length;
    const pendingCount = users.filter((u) => (u.status || '').toUpperCase() === 'PENDING_VERIFICATION').length;

    const adminCount = users.filter((u) => (u.role || '').toUpperCase() === 'ADMIN').length;
    const staffCount = users.filter((u) => (u.role || '').toUpperCase() === 'STAFF').length;
    const travelerCount = users.filter((u) => (u.role || '').toUpperCase() === 'TRAVELER').length;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs animate-pulse">
                        <div className="flex justify-between items-start mb-2">
                            <div className="h-4 w-28 bg-slate-200 rounded" />
                            <div className="w-8 h-8 bg-slate-100 rounded-xl" />
                        </div>
                        <div className="h-7 w-16 bg-slate-200 rounded mb-2" />
                        <div className="h-3 w-40 bg-slate-100 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Tổng tài khoản hệ thống */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Tổng Tài Khoản Hệ Thống
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                {totalCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">tài khoản</span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <Users className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2.5 text-xs font-medium text-slate-600 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{activeCount} Hoạt động</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>{suspendedCount} Đã khóa</span>
                    </span>
                    {pendingCount > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                            <span>{pendingCount} Chờ</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Card 2: Khách hàng (Travelers) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Khách Hàng (Traveler)
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                {travelerCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">người dùng</span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <UserCheck className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
                    <span className="text-emerald-700 font-semibold text-[11px]">
                        Chiếm {totalCount > 0 ? Math.round((travelerCount / totalCount) * 100) : 0}% tổng người dùng
                    </span>
                    <span className="text-[10px] text-slate-400">Khách thuê tủ</span>
                </div>
            </div>

            {/* Card 3: Cơ Cấu Nhân Sự Nội Bộ */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Nhân Sự Nội Bộ
                        </span>
                        <div className="mt-1 space-y-0.5">
                            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold gap-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                                    <span>Vận hành (Staff)</span>
                                </span>
                                <span className="font-extrabold">{staffCount}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold gap-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                                    <span>Quản trị (Admin)</span>
                                </span>
                                <span className="font-extrabold">{adminCount}</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                        <Shield className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-medium">
                    <span>Tổng: {staffCount + adminCount} tài khoản</span>
                    <span className="text-purple-600 font-bold">Phân quyền RBAC</span>
                </div>
            </div>

            {/* Card 4: Tỷ lệ tài khoản hợp lệ */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Trạng Thái Đăng Nhập
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                {totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : '100%'}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                                ({activeCount}/{totalCount || 1} active)
                            </span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <KeyRound className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Kiểm soát quyền truy cập toàn hệ thống
                    </span>
                </div>
            </div>
        </div>
    );
}
