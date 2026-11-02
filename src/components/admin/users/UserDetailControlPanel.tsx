/**
 * AD-FE-05: Quản lý tài khoản hệ thống
 * Panel chi tiết hồ sơ tài khoản, phân quyền vai trò (Role RBAC)
 * và kiểm soát quyền truy cập: Tạm khóa đăng nhập / Tạm khóa đặt tủ / Mở khóa hệ thống.
 */
import { useState, useEffect } from 'react';
import {
    X,
    Shield,
    Lock,
    Unlock,
    RotateCcw,
    Mail,
    Phone,
    Calendar,
    Save,
    Clock,
    CheckCircle2,
    Ban,
    AlertTriangle,
} from 'lucide-react';
import type {
    UserAdminListItemDto,
    UserRole,
} from '../../../api/adminUserService';
import {
    getRoleConfig,
    getUserAccountStatus,
    formatDate,
    getInitials,
} from './userConstants';

interface UserDetailControlPanelProps {
    user: UserAdminListItemDto | null;
    onClose: () => void;
    isAdmin: boolean;
    onTriggerLock: (user: UserAdminListItemDto) => void;
    onTriggerActivate: (user: UserAdminListItemDto) => void;
    onSaveRole: (userId: string, newRole: UserRole) => Promise<void>;
    isUpdatingRole: boolean;
}

export default function UserDetailControlPanel({
    user,
    onClose,
    isAdmin,
    onTriggerLock,
    onTriggerActivate,
    onSaveRole,
    isUpdatingRole,
}: UserDetailControlPanelProps) {
    const currentRole = ((user?.role || 'STAFF').toUpperCase() as UserRole) || 'STAFF';
    const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
    const [roleHasChanged, setRoleHasChanged] = useState(false);

    // Đồng bộ khi user thay đổi
    useEffect(() => {
        if (user) {
            setSelectedRole(((user.role || 'STAFF').toUpperCase() as UserRole) || 'STAFF');
            setRoleHasChanged(false);
        }
    }, [user]);

    const handleRoleSelectChange = (newRole: UserRole) => {
        setSelectedRole(newRole);
        setRoleHasChanged(newRole !== currentRole);
    };

    const handleResetRole = () => {
        setSelectedRole(currentRole);
        setRoleHasChanged(false);
    };

    const handleSaveRoleClick = async () => {
        if (!user || !roleHasChanged) return;
        await onSaveRole(user.id, selectedRole);
        setRoleHasChanged(false);
    };

    if (!user) return null;

    const roleCfg = getRoleConfig(user.role);
    const accountStatus = getUserAccountStatus(user);
    const isActive = (user.status || '').toUpperCase() === 'ACTIVE';
    const isSuspended = (user.status || '').toUpperCase() === 'SUSPENDED';
    const isTraveler = (user.role || '').toUpperCase() === 'TRAVELER';

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg p-5 space-y-5 animate-in fade-in duration-200">
            {/* Header: Title + Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        HỒ SƠ TÀI KHOẢN
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">
                        Chi tiết & Phân quyền
                    </h3>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    title="Đóng panel"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* User Identity Card */}
            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100">
                <div
                    className={`w-12 h-12 rounded-full ${roleCfg.avatarBg} ${roleCfg.avatarText} flex items-center justify-center font-black text-sm shrink-0 border border-slate-200/80 shadow-xs`}
                >
                    {getInitials(user.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                            {user.fullName || 'Chưa cập nhật tên'}
                        </h4>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${roleCfg.badgeClass}`}>
                            {roleCfg.label}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate">{user.email}</p>
                    {user.phone && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user.phone}</p>
                    )}
                </div>
            </div>

            {/* Detailed Attributes Grid */}
            <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>Email đăng nhập</span>
                    </span>
                    <span className="font-mono text-slate-800 font-semibold truncate max-w-[180px]">
                        {user.email}
                    </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>Số điện thoại</span>
                    </span>
                    <span className="font-mono text-slate-800 font-semibold">
                        {user.phone || 'Chưa có'}
                    </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ngày khởi tạo</span>
                    </span>
                    <span className="text-slate-700 font-mono">{formatDate(user.createdAt)}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Mã định danh (ID)</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 max-w-[170px] truncate" title={user.id}>
                        {user.id}
                    </span>
                </div>
            </div>

            {/* Section: Role & RBAC Permissions */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Phân quyền vai trò (Role RBAC)
                    </span>
                    {roleHasChanged && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Chưa lưu thay đổi
                        </span>
                    )}
                </div>

                {isAdmin ? (
                    <div className="space-y-2.5">
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200">
                            {(['TRAVELER', 'STAFF', 'ADMIN'] as UserRole[]).map((r) => {
                                const isCurrent = selectedRole === r;
                                return (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => handleRoleSelectChange(r)}
                                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                                            isCurrent
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                        }`}
                                    >
                                        {r === 'TRAVELER' ? 'Traveler' : r === 'STAFF' ? 'Staff' : 'Admin'}
                                    </button>
                                );
                            })}
                        </div>

                        {roleHasChanged && (
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleSaveRoleClick}
                                    disabled={isUpdatingRole}
                                    className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs shadow-blue-600/20 disabled:opacity-50"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>{isUpdatingRole ? 'Đang lưu...' : 'Lưu vai trò mới'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetRole}
                                    className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                                    title="Hủy thay đổi"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                        <Shield className="w-4 h-4 text-slate-400" />
                        <span>Vai trò hiện tại: <strong>{roleCfg.label}</strong> (Chỉ Admin mới được đổi)</span>
                    </div>
                )}
            </div>

            {/* Section: Compound Account Status & Access Permissions */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Trạng thái tài khoản
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${accountStatus.badgeClass}`}>
                        {accountStatus.label}
                    </span>
                </div>

                {/* Sub-status breakdown */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between gap-1">
                        <span className="text-slate-400 font-medium">Đăng nhập hệ thống:</span>
                        {accountStatus.loginAllowed ? (
                            <span className="font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Cho phép đăng nhập
                            </span>
                        ) : (
                            <span className="font-bold text-rose-700 flex items-center gap-1">
                                <Ban className="w-3.5 h-3.5 text-rose-600" />
                                Bị tạm khóa đăng nhập
                            </span>
                        )}
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between gap-1">
                        <span className="text-slate-400 font-medium">Quyền đặt tủ mới:</span>
                        {isTraveler ? (
                            accountStatus.bookingAllowed ? (
                                <span className="font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Được phép đặt tủ
                                </span>
                            ) : (
                                <span className="font-bold text-amber-700 flex items-center gap-1">
                                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                                    Bị tạm khóa đặt tủ
                                </span>
                            )
                        ) : (
                            <span className="font-semibold text-slate-600">
                                Không áp dụng (Nhân sự)
                            </span>
                        )}
                    </div>
                </div>

                {/* Contextual Guidance Banner */}
                {accountStatus.key === 'BOOKING_BLOCKED' && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 text-xs space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            Đang bị tạm khóa quyền đặt tủ mới
                        </p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Khách hàng vẫn được phép đăng nhập web/app để tra cứu thông tin và quét mã QR PayOS thanh toán phí nợ. Để mở khóa đặt tủ, chuyển sang mục <strong>Quản lý dư nợ</strong>.
                        </p>
                    </div>
                )}

                {accountStatus.key === 'SUSPENDED' && (
                    <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl text-rose-900 text-xs space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-rose-800">
                            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                            Đang bị tạm khóa đăng nhập hệ thống
                        </p>
                        <p className="text-[11px] text-rose-700 leading-relaxed">
                            Tài khoản không thể đăng nhập vào ứng dụng di động hoặc cổng Web. Mọi phiên hoạt động bị vô hiệu hóa cho đến khi được mở khóa lại.
                        </p>
                    </div>
                )}

                {/* Lock / Unlock Login Action Buttons */}
                {isAdmin && (
                    <div className="pt-1">
                        {isActive && (
                            <button
                                type="button"
                                onClick={() => onTriggerLock(user)}
                                className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 border border-rose-200"
                            >
                                <Lock className="w-3.5 h-3.5 text-rose-600" />
                                <span>Tạm khóa đăng nhập hệ thống</span>
                            </button>
                        )}

                        {isSuspended && (
                            <button
                                type="button"
                                onClick={() => onTriggerActivate(user)}
                                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 border border-emerald-200"
                            >
                                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Mở khóa đăng nhập hệ thống</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
