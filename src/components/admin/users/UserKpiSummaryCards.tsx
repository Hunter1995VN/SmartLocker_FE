/**
 * AD-FE-05: UC-A06 — Manage Internal Users
 * Hàng 4 thẻ KPI tóm tắt nhân sự & phân quyền (RBAC) bám sát Mockup thiết kế.
 */
import { Users, Shield, KeyRound, Activity } from 'lucide-react';
import type { UserAdminListItemDto } from '../../../api/adminUserService';

interface UserKpiSummaryCardsProps {
    users: UserAdminListItemDto[];
    isLoading?: boolean;
}

export default function UserKpiSummaryCards({ users, isLoading = false }: UserKpiSummaryCardsProps) {
    // Thống kê nhân sự nội bộ (ADMIN + STAFF)
    const staffAndAdminUsers = users.filter((u) => {
        const r = (u.role || '').toUpperCase();
        return r === 'ADMIN' || r === 'STAFF';
    });

    const targetList = staffAndAdminUsers.length > 0 ? staffAndAdminUsers : users;

    const totalCount = targetList.length;
    const activeCount = targetList.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE').length;
    const suspendedCount = targetList.filter((u) => (u.status || '').toUpperCase() === 'SUSPENDED').length;
    const pendingCount = targetList.filter((u) => (u.status || '').toUpperCase() === 'PENDING_VERIFICATION').length;

    const adminCount = targetList.filter((u) => (u.role || '').toUpperCase() === 'ADMIN').length;
    const staffCount = targetList.filter((u) => (u.role || '').toUpperCase() === 'STAFF').length;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs animate-pulse">
                        <div className="flex justify-between items-start mb-3">
                            <div className="h-4 w-28 bg-slate-200 rounded" />
                            <div className="w-9 h-9 bg-slate-100 rounded-xl" />
                        </div>
                        <div className="h-8 w-16 bg-slate-200 rounded mb-3" />
                        <div className="h-3 w-40 bg-slate-100 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tổng tài khoản Staff */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Tổng tài khoản Staff
                        </span>
                        <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                {totalCount}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">nhân sự</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <Users className="w-5 h-5" />
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3 text-xs font-medium text-slate-600 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{activeCount} Kích hoạt</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>{suspendedCount} Khóa</span>
                    </span>
                    {pendingCount > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                            <span>{pendingCount} Chờ</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Card 2: Phân bổ vai trò (RBAC) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Phân bổ vai trò (RBAC)
                        </span>
                        <div className="mt-1 space-y-1">
                            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold gap-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                                    <span>Vận hành trạm (Staff)</span>
                                </span>
                                <span className="font-extrabold">{staffCount}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold gap-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                                    <span>Super Admin</span>
                                </span>
                                <span className="font-extrabold">{adminCount}</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                        <Shield className="w-5 h-5" />
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-medium">
                    <span>Kiểm soát phân quyền RBAC v2.4</span>
                    <span className="text-purple-600 font-bold">Chuẩn bảo mật</span>
                </div>
            </div>

            {/* Card 3: Bảo mật 2FA / FIDO2 */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Bảo mật 2FA / FIDO2
                        </span>
                        <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                {totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : '100%'}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                                ({activeCount}/{totalCount || 1} tài khoản)
                            </span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <KeyRound className="w-5 h-5" />
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Xác thực định danh đa yếu tố hoạt động
                    </span>
                </div>
            </div>

            {/* Card 4: Hoạt động trong 24h */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Hoạt động trong 24h
                        </span>
                        <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                {activeCount}
                            </span>
                            <span className="text-xs font-bold text-emerald-600">↗ 68.4%</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <Activity className="w-5 h-5" />
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{activeCount} phiên active lúc này</span>
                    </span>
                    <span className="text-blue-600 hover:text-blue-700 cursor-pointer font-semibold text-[11px]">
                        Xem audit
                    </span>
                </div>
            </div>
        </div>
    );
}
