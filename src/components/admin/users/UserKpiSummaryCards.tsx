/**
 * AD-FE-05: Quản lý khách hàng & Kiểm soát dư nợ
 * Hàng 4 thẻ KPI tóm tắt khách hàng, nhân sự và kiểm soát nợ quá hạn.
 */
import { Users, Shield, AlertOctagon, KeyRound } from 'lucide-react';
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

    // Thống kê Khách hàng có nợ xấu (overdueDebt > 0)
    const debtors = users.filter((u) => Number(u.overdueDebt || 0) > 0);
    const debtorCount = debtors.length;
    const totalOverdueDebt = debtors.reduce((sum, u) => sum + Math.max(0, Number(u.overdueDebt || 0)), 0);
    const suspendedDebtorCount = debtors.filter((u) => (u.status || '').toUpperCase() === 'SUSPENDED').length;
    const unblockedDebtorCount = Math.max(0, debtorCount - suspendedDebtorCount);

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
            {/* Card 1: Tổng khách hàng */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Tổng Khách Hàng
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                {travelerCount || totalCount}
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

            {/* Card 2: Khách Hàng Có Nợ Quá Hạn */}
            <div
                className={`rounded-2xl p-4 border shadow-xs flex flex-col justify-between transition ${
                    debtorCount > 0
                        ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                            Khách Hàng Nợ Quá Hạn
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className={`text-2xl font-extrabold tracking-tight ${debtorCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                                {debtorCount}
                            </span>
                            <span className="text-xs font-bold text-rose-600">
                                ({totalOverdueDebt.toLocaleString('vi-VN')} đ)
                            </span>
                        </div>
                    </div>
                    <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                            debtorCount > 0
                                ? 'bg-rose-100 border-rose-200 text-rose-600'
                                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        }`}
                    >
                        <AlertOctagon className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-medium">
                    {debtorCount > 0 ? (
                        <>
                            <span className="text-rose-700 font-semibold text-[11px]">
                                {unblockedDebtorCount > 0
                                    ? `${unblockedDebtorCount} chưa bị chặn`
                                    : 'Tất cả nợ quá hạn đã bị chặn'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[10px]">
                                {suspendedDebtorCount}/{debtorCount} đã khóa
                            </span>
                        </>
                    ) : (
                        <span className="text-emerald-700 font-semibold text-[11px]">
                            Không có tài khoản nợ quá hạn (0 đ)
                        </span>
                    )}
                </div>
            </div>

            {/* Card 3: Phân bổ nhân sự & khách hàng */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Cơ Cấu Tài Khoản
                        </span>
                        <div className="mt-1 space-y-0.5">
                            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold gap-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>Khách hàng</span>
                                </span>
                                <span className="font-extrabold">{travelerCount}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold gap-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                                    <span>Nhân sự nội bộ</span>
                                </span>
                                <span className="font-extrabold">{staffCount + adminCount}</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                        <Shield className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-medium">
                    <span>Staff: {staffCount} • Admin: {adminCount}</span>
                    <span className="text-purple-600 font-bold">Phân quyền RBAC</span>
                </div>
            </div>

            {/* Card 4: Tỷ lệ tài khoản hợp lệ */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Tỷ Lệ Tài Khoản Hợp Lệ
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
                        Tự động chặn khi có nợ quá hạn
                    </span>
                </div>
            </div>
        </div>
    );
}
