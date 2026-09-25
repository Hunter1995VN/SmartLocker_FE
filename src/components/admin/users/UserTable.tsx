/**
 * AD-FE-05: UC-A06 — Manage Internal Users
 * Bảng danh sách tài khoản Staff & quản trị viên, hiển thị thông tin thực tế từ API.
 */
import {
    Shield,
    UserCheck,
    AlertCircle,
    Lock,
    Unlock,
    Eye,
    Users,
} from 'lucide-react';
import type { UserAdminListItemDto } from '../../../api/adminUserService';
import {
    getRoleConfig,
    getStatusConfig,
    formatDate,
    getInitials,
} from './userConstants';

interface UserTableProps {
    users: UserAdminListItemDto[];
    selectedUserId?: string;
    onSelectUser: (user: UserAdminListItemDto) => void;
    isLoading: boolean;
    isError: boolean;
    errorMessage?: string;
    onRetry: () => void;
    onResetFilters: () => void;
    isAdmin: boolean;
    onTriggerLock: (user: UserAdminListItemDto) => void;
    onTriggerActivate: (user: UserAdminListItemDto) => void;
    onTriggerChangeRole: (user: UserAdminListItemDto) => void;
}

export default function UserTable({
    users,
    selectedUserId,
    onSelectUser,
    isLoading,
    isError,
    errorMessage,
    onRetry,
    onResetFilters,
    isAdmin,
    onTriggerLock,
    onTriggerActivate,
    onTriggerChangeRole,
}: UserTableProps) {
    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="divide-y divide-slate-100">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200" />
                                <div className="space-y-1.5">
                                    <div className="h-3.5 w-32 bg-slate-200 rounded" />
                                    <div className="h-3 w-44 bg-slate-100 rounded" />
                                </div>
                            </div>
                            <div className="h-6 w-24 bg-slate-100 rounded-full" />
                            <div className="h-6 w-28 bg-slate-100 rounded-full" />
                            <div className="h-4 w-24 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Không thể tải danh sách tài khoản</h3>
                    <p className="text-xs text-slate-500 mt-1">{errorMessage || 'Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.'}</p>
                </div>
                <button
                    type="button"
                    onClick={onRetry}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Users className="w-7 h-7" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Không tìm thấy tài khoản nhân viên phù hợp</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Không có nhân sự nào khớp với điều kiện tìm kiếm hoặc bộ lọc trạng thái hiện tại.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onResetFilters}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                    Xóa bộ lọc tìm kiếm
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <th className="py-3 px-4">Nhân viên / Định danh</th>
                            <th className="py-3 px-4">Vai trò & Phân quyền</th>
                            <th className="py-3 px-4">Trạng thái</th>
                            <th className="py-3 px-4">Ngày tạo</th>
                            <th className="py-3 px-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {users.map((user) => {
                            const isSelected = selectedUserId === user.id;
                            const roleCfg = getRoleConfig(user.role);
                            const statusCfg = getStatusConfig(user.status);
                            const isActive = (user.status || '').toUpperCase() === 'ACTIVE';
                            const isSuspended = (user.status || '').toUpperCase() === 'SUSPENDED';

                            return (
                                <tr
                                    key={user.id}
                                    onClick={() => onSelectUser(user)}
                                    className={`transition-colors cursor-pointer group ${
                                        isSelected
                                            ? 'bg-blue-50/80 hover:bg-blue-50'
                                            : 'hover:bg-slate-50/80'
                                    }`}
                                >
                                    {/* Column 1: Info (Avatar, Name, Email, Phone) */}
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-9 h-9 rounded-full ${roleCfg.avatarBg} ${roleCfg.avatarText} flex items-center justify-center font-extrabold text-xs shrink-0 border border-slate-200/60 shadow-2xs`}
                                            >
                                                {getInitials(user.fullName)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-slate-800 truncate">
                                                        {user.fullName || 'Chưa cập nhật tên'}
                                                    </span>
                                                    {isSelected && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white">
                                                            ĐANG CHỌN
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-400 truncate">
                                                    {user.email}
                                                </div>
                                                {user.phone && (
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        {user.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Column 2: Role & Sublabel */}
                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleCfg.badgeClass}`}
                                        >
                                            {(user.role || '').toUpperCase() === 'ADMIN' ? (
                                                <Shield className="w-3.5 h-3.5" />
                                            ) : (
                                                <UserCheck className="w-3.5 h-3.5" />
                                            )}
                                            <span>{roleCfg.label}</span>
                                        </span>
                                    </td>

                                    {/* Column 3: Status Badge */}
                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusCfg.badgeClass}`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                                            <span>{statusCfg.label}</span>
                                        </span>
                                    </td>

                                    {/* Column 4: Created At */}
                                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                        {formatDate(user.createdAt)}
                                    </td>

                                    {/* Column 5: Actions */}
                                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => onSelectUser(user)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                                title="Xem chi tiết & Quản lý"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            {isAdmin && (
                                                <>
                                                    {isActive && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onTriggerLock(user)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                                            title="Tạm khóa tài khoản"
                                                        >
                                                            <Lock className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {isSuspended && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onTriggerActivate(user)}
                                                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                                            title="Kích hoạt lại tài khoản"
                                                        >
                                                            <Unlock className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => onTriggerChangeRole(user)}
                                                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                                                        title="Đổi phân quyền (Role)"
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Table Footer: Summary count */}
            <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                    Hiển thị <strong className="text-slate-800">{users.length}</strong> nhân sự
                </span>
                <span className="text-[11px] text-slate-400">
                    Bấm vào dòng để xem chi tiết và quản trị quyền
                </span>
            </div>
        </div>
    );
}
