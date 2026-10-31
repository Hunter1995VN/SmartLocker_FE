/**
 * AD-FE-05: Quản lý tài khoản hệ thống
 * Hàng 4 thẻ KPI tóm tắt tài khoản khách hàng, nhân sự nội bộ và phân định trạng thái đăng nhập vs tạm khóa đặt tủ.
 */
import { Users, Shield, KeyRound, UserCheck } from 'lucide-react';
import type { UserAdminListItemDto } from '../../../api/adminUserService';

interface UserKpiSummaryCardsProps {
    users: UserAdminListItemDto[];
    isLoading?: boolean;
}

export default function UserKpiSummaryCards({ users, isLoading = false }: UserKpiSummaryCardsProps) {
    const totalCount = users.length;

    const isBookingBlockedFn = (u: UserAdminListItemDto) =>
        (u.status || '').toUpperCase() === 'ACTIVE' &&
        (u.role || '').toUpperCase() === 'TRAVELER' &&
        (Number(u.overdueDebt || 0) > 0 || Boolean(u.isBookingBlocked));

    const bookingBlockedCount = users.filter(isBookingBlockedFn).length;
    const activeNormalCount = users.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE' && !isBookingBlockedFn(u)).length;
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
            {/* Card 1: Tổng tài khoản hệ thống & phân định trạng thái */}
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

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] font-medium text-slate-600 flex-wrap">
                    <span className="inline-flex items-center gap-1" title="Tài khoản hoạt động bình thường">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{activeNormalCount} Bình thường</span>
                    </span>
                    {bookingBlockedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-700" title="Được đăng nhập nhưng tạm khóa đặt tủ">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>{bookingBlockedCount} Khóa đặt tủ</span>
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-rose-700" title="Bị tạm khóa đăng nhập">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>{suspendedCount} Khóa đăng nhập</span>
                    </span>
                    {pendingCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-sky-700" title="Chờ xác nhận">
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

            {/* Card 4: Quyền Đăng Nhập & Dịch Vụ */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Quyền Đăng Nhập Hệ Thống
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                {totalCount > 0 ? `${Math.round(((activeNormalCount + bookingBlockedCount) / totalCount) * 100)}%` : '100%'}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                                ({activeNormalCount + bookingBlockedCount}/{totalCount || 1} tài khoản)
                            </span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <KeyRound className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] flex items-center justify-between font-medium">
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {activeNormalCount} đầy đủ quyền
                    </span>
                    {bookingBlockedCount > 0 ? (
                        <span className="text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {bookingBlockedCount} khóa đặt tủ
                        </span>
                    ) : (
                        <span className="text-slate-400">Không có tài khoản bị chặn đặt</span>
                    )}
                </div>
            </div>
        </div>
    );
}
