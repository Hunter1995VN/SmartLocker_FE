/**
 * AD-FE-05: UC-A06 — Manage Internal Users
 * Panel chi tiết nhân sự & điều khiển phân quyền (Role / Account Status Control).
 * Thiết kế bám sát 100% Mockup quy chuẩn SmartLocker Admin Portal.
 */
import { useState, useEffect } from 'react';
import {
    X,
    Lock,
    Unlock,
    AlertTriangle,
    Save,
    Phone,
    Mail,
    Calendar,
    CheckSquare,
    ExternalLink,
    UserCheck,
} from 'lucide-react';
import type { UserAdminListItemDto, UserRole } from '../../../api/adminUserService';
import {
    getRoleConfig,
    getStatusConfig,
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

    if (!user) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 flex flex-col items-center justify-center text-center text-slate-400 min-h-[500px]">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 text-slate-300">
                    <UserCheck className="w-7 h-7" />
                </div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Chưa chọn nhân sự
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Vui lòng nhấp vào một nhân viên trong bảng bên trái để xem hồ sơ và phân quyền.
                </p>
            </div>
        );
    }

    const roleCfg = getRoleConfig(user.role);
    const statusCfg = getStatusConfig(user.status);
    const isActive = (user.status || '').toUpperCase() === 'ACTIVE';
    const isSuspended = (user.status || '').toUpperCase() === 'SUSPENDED';
    const isPending = (user.status || '').toUpperCase() === 'PENDING_VERIFICATION';

    // Tạo mã nhân viên rút gọn
    const empCode = `EMP-${user.id.substring(0, 4).toUpperCase()}`;

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
            {/* 1. Header: Live indicator & close button */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Hồ sơ nhân sự
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                        title="Đóng panel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 2. Body: Scrollable contents */}
            <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-220px)]">
                {/* Profile Card */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                    <div
                        className={`w-12 h-12 rounded-xl ${roleCfg.avatarBg} ${roleCfg.avatarText} flex items-center justify-center font-extrabold text-base shrink-0 border border-slate-200/80 shadow-2xs`}
                    >
                        {getInitials(user.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-slate-900 text-sm truncate">
                                {user.fullName || 'Chưa đặt họ tên'}
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-600 text-white font-mono">
                                {empCode}
                            </span>
                        </div>
                        <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                            <p className="flex items-center gap-1.5 truncate">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{user.email}</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono">{user.phone || 'Chưa có SĐT'}</span>
                            </p>
                            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>Gia nhập: {formatDate(user.createdAt)}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Authorization alert if viewer is NOT Admin */}
                {!isAdmin && (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Chế độ xem giới hạn (Staff):</span> Bạn chỉ có quyền xem thông tin. Thao tác khóa/kích hoạt hoặc thay đổi vai trò yêu cầu tài khoản Quản trị viên (ADMIN).
                        </div>
                    </div>
                )}

                {/* Section: Account Status & Actions */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Trạng thái tài khoản
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${statusCfg.badgeClass}`}>
                            {statusCfg.label}
                        </span>
                    </div>

                    <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {statusCfg.description}
                    </p>

                    {/* Action buttons based on current status */}
                    {isAdmin && (
                        <div className="space-y-2 pt-1">
                            {isActive && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onTriggerLock(user)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer"
                                    >
                                        <Lock className="w-3.5 h-3.5" />
                                        <span>Tạm khóa (Suspend)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onTriggerLock(user)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs shadow-rose-600/20"
                                    >
                                        <Lock className="w-3.5 h-3.5" />
                                        <span>Khóa an toàn</span>
                                    </button>
                                </div>
                            )}

                            {isSuspended && (
                                <button
                                    type="button"
                                    onClick={() => onTriggerActivate(user)}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs shadow-emerald-600/20"
                                >
                                    <Unlock className="w-4 h-4" />
                                    <span>Kích hoạt lại tài khoản</span>
                                </button>
                            )}

                            {isPending && (
                                <button
                                    type="button"
                                    onClick={() => onTriggerActivate(user)}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs shadow-emerald-600/20"
                                >
                                    <Unlock className="w-4 h-4" />
                                    <span>Kích hoạt tài khoản ngay</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Section: Role Management (Phân quyền vai trò RBAC) */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Phân quyền vai trò (RBAC)
                        </span>
                        <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 cursor-pointer">
                            <span>Chi tiết RBAC</span>
                            <ExternalLink className="w-3 h-3" />
                        </span>
                    </div>

                    <div>
                        <label htmlFor="user-role-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Vai trò phân bổ chính:
                        </label>
                        <select
                            id="user-role-select"
                            value={selectedRole}
                            onChange={(e) => handleRoleSelectChange(e.target.value as UserRole)}
                            disabled={!isAdmin || isUpdatingRole}
                            className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800 disabled:bg-slate-100 disabled:opacity-60 cursor-pointer"
                        >
                            <option value="STAFF">Vận hành trạm (Staff / Field Technician)</option>
                            <option value="ADMIN">Quản trị viên cấp cao (Super Admin)</option>
                            <option value="TRAVELER">Khách hàng vãng lai (Traveler)</option>
                        </select>
                    </div>

                    {/* Scope preview info */}
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-2 text-xs">
                        <p className="font-bold text-slate-700">Quyền hạn đối với ô tủ & IoT:</p>
                        <div className="space-y-1.5 text-slate-600">
                            <label className="flex items-center gap-2 cursor-default">
                                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                <span>Chuyển trạng thái ô tủ sang Bảo trì (UC-A05)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-default">
                                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                <span>Đọc dữ liệu cảm biến & Telemetry trực tiếp (S-01)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-default">
                                <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-slate-500">Mở khóa khẩn cấp từ xa (Chỉ Super Admin)</span>
                            </label>
                        </div>
                    </div>

                    {/* Save Role Buttons (Hiển thị khi role thay đổi) */}
                    {isAdmin && roleHasChanged && (
                        <div className="flex items-center gap-2 pt-2">
                            <button
                                type="button"
                                onClick={handleResetRole}
                                disabled={isUpdatingRole}
                                className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                            >
                                Hủy thay đổi
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveRoleClick}
                                disabled={isUpdatingRole}
                                className="flex-1 py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs shadow-blue-600/20 inline-flex items-center justify-center gap-1.5"
                            >
                                {isUpdatingRole ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Đang lưu...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Lưu phân quyền</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
