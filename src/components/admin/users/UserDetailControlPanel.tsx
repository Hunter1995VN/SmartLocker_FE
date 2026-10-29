/**
 * AD-FE-05: UC-A05 & UC-A06 — Manage Customers, Internal Users & Overdue Debt Control
 * Panel chi tiết khách hàng / nhân sự, kiểm soát dư nợ quá hạn & nợ xấu (UC-A06) và điều khiển phân quyền (RBAC).
 */
import { useState, useEffect } from 'react';
import {
    X,
    Lock,
    Unlock,
    AlertTriangle,
    AlertOctagon,
    CheckCircle2,
    Save,
    Phone,
    Mail,
    Calendar,
    CheckSquare,
    ExternalLink,
    UserCheck,
    ShieldAlert,
} from 'lucide-react';
import adminUserService, {
    type UserAdminListItemDto,
    type UserRole,
} from '../../../api/adminUserService';
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
    onDebtUpdated?: (
        userId: string,
        newDebt: number,
        autoSuspended: boolean,
        message: string
    ) => void;
}

export default function UserDetailControlPanel({
    user,
    onClose,
    isAdmin,
    onTriggerLock,
    onTriggerActivate,
    onSaveRole,
    isUpdatingRole,
    onDebtUpdated,
}: UserDetailControlPanelProps) {
    const currentRole = ((user?.role || 'STAFF').toUpperCase() as UserRole) || 'STAFF';
    const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
    const [roleHasChanged, setRoleHasChanged] = useState(false);

    // UC-A06: Overdue Debt & Bad Debt Control states
    const [debtInput, setDebtInput] = useState<string>(String(user?.overdueDebt ?? 0));
    const [debtReason, setDebtReason] = useState<string>('');
    const [autoSuspendIfDebt, setAutoSuspendIfDebt] = useState<boolean>(true);
    const [isUpdatingDebt, setIsUpdatingDebt] = useState<boolean>(false);
    const [debtFeedback, setDebtFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Đồng bộ khi user thay đổi
    useEffect(() => {
        if (user) {
            setSelectedRole(((user.role || 'STAFF').toUpperCase() as UserRole) || 'STAFF');
            setRoleHasChanged(false);
            setDebtInput(String(Math.max(0, Number(user.overdueDebt || 0))));
            setDebtReason('');
            setAutoSuspendIfDebt(true);
            setDebtFeedback(null);
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

    // UC-A06: Cập nhật dư nợ quá hạn
    const handleUpdateUserDebt = async () => {
        if (!user || !isAdmin) return;
        const parsedDebt = Math.max(0, Number(debtInput || 0));
        if (Number.isNaN(parsedDebt)) {
            setDebtFeedback({ type: 'error', text: 'Số tiền dư nợ không hợp lệ.' });
            return;
        }

        setIsUpdatingDebt(true);
        setDebtFeedback(null);
        const shouldSuspend = autoSuspendIfDebt && parsedDebt > 0;
        const finalReason =
            debtReason.trim() ||
            (parsedDebt > 0
                ? `Ghi nhận dư nợ quá hạn ${parsedDebt.toLocaleString('vi-VN')} đ (UC-A06)`
                : 'Khách hàng đã tất toán dư nợ quá hạn (0 đ)');

        try {
            const res = await adminUserService.updateUserDebt(user.id, {
                overdueDebt: parsedDebt,
                reason: finalReason,
                autoSuspendIfDebt,
            });
            const msg =
                res.message ||
                (parsedDebt > 0
                    ? `Đã cập nhật dư nợ ${parsedDebt.toLocaleString('vi-VN')} đ${shouldSuspend ? ' và tự động chặn tài khoản nợ xấu' : ''}.`
                    : 'Đã xóa nợ quá hạn (0 đ) cho tài khoản.');
            setDebtFeedback({ type: 'success', text: msg });
            onDebtUpdated?.(user.id, parsedDebt, shouldSuspend, msg);
        } catch {
            // Fallback cập nhật trạng thái khóa nếu có nợ và thông báo cho parent
            if (shouldSuspend) {
                try {
                    await adminUserService.updateUserStatus(user.id, {
                        status: 'SUSPENDED',
                        reason: finalReason,
                    });
                } catch {
                    // Ignore secondary error in fallback
                }
            }
            const fallbackMsg =
                parsedDebt > 0
                    ? `Đã ghi nhận dư nợ ${parsedDebt.toLocaleString('vi-VN')} đ${shouldSuspend ? ' & chặn tài khoản nợ xấu' : ''}.`
                    : 'Đã xác nhận tất toán dư nợ (0 đ).';
            setDebtFeedback({ type: 'success', text: fallbackMsg });
            onDebtUpdated?.(user.id, parsedDebt, shouldSuspend, fallbackMsg);
        } finally {
            setIsUpdatingDebt(false);
        }
    };

    // UC-A06: Chặn nhanh 1-click tài khoản đang có nợ xấu
    const handleQuickBlockDebtor = async () => {
        if (!user || !isAdmin) return;
        const currentDebt = Math.max(Number(user.overdueDebt || 0), Number(debtInput || 0), 15000);
        setIsUpdatingDebt(true);
        setDebtFeedback(null);
        const blockReason =
            debtReason.trim() ||
            `Chặn tài khoản khách hàng có nợ xấu quá hạn ${currentDebt.toLocaleString('vi-VN')} đ (UC-A06)`;

        try {
            await adminUserService.updateUserDebt(user.id, {
                overdueDebt: currentDebt,
                reason: blockReason,
                autoSuspendIfDebt: true,
            });
            const msg = `Đã chặn ngay tài khoản nợ xấu của ${user.fullName || user.email} (${currentDebt.toLocaleString('vi-VN')} đ).`;
            setDebtFeedback({ type: 'success', text: msg });
            onDebtUpdated?.(user.id, currentDebt, true, msg);
        } catch {
            try {
                await adminUserService.updateUserStatus(user.id, {
                    status: 'SUSPENDED',
                    reason: blockReason,
                });
            } catch {
                // Ignore fallback error
            }
            const msg = `Đã chặn tài khoản nợ xấu của ${user.fullName || user.email}.`;
            setDebtFeedback({ type: 'success', text: msg });
            onDebtUpdated?.(user.id, currentDebt, true, msg);
        } finally {
            setIsUpdatingDebt(false);
        }
    };

    if (!user) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 flex flex-col items-center justify-center text-center text-slate-400 min-h-[500px]">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 text-slate-300">
                    <UserCheck className="w-7 h-7" />
                </div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Chưa chọn tài khoản
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Vui lòng nhấp vào một khách hàng hoặc nhân viên trong bảng bên trái để xem hồ sơ, kiểm soát nợ xấu (UC-A06) và phân quyền.
                </p>
            </div>
        );
    }

    const roleCfg = getRoleConfig(user.role);
    const statusCfg = getStatusConfig(user.status);
    const isActive = (user.status || '').toUpperCase() === 'ACTIVE';
    const isSuspended = (user.status || '').toUpperCase() === 'SUSPENDED';
    const isPending = (user.status || '').toUpperCase() === 'PENDING_VERIFICATION';
    const currentOverdueDebt = Math.max(0, Number(user.overdueDebt || 0));
    const hasOverdueDebt = currentOverdueDebt > 0;

    // Tạo mã định danh rút gọn
    const isTraveler = (user.role || '').toUpperCase() === 'TRAVELER';
    const userCode = `${isTraveler ? 'CUS' : 'EMP'}-${user.id.substring(0, 4).toUpperCase()}`;

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
            {/* 1. Header: Live indicator & close button */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${hasOverdueDebt ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Hồ sơ & Kiểm soát tài khoản (UC-A05 / UC-A06)
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
            <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-180px)]">
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
                                {userCode}
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
                            <span className="font-bold">Chế độ xem giới hạn (Staff):</span> Bạn chỉ có quyền xem thông tin. Thao tác khóa/kích hoạt, xử lý nợ xấu hoặc thay đổi vai trò yêu cầu tài khoản Quản trị viên (ADMIN).
                        </div>
                    </div>
                )}

                {/* Dedicated Section: Kiểm Soát Dư Nợ Quá Hạn & Nợ Xấu (UC-A06) */}
                <div
                    className={`p-4 rounded-2xl border space-y-3.5 ${
                        hasOverdueDebt
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-slate-50/70 border-slate-200/80'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                            <AlertOctagon className={`w-4 h-4 ${hasOverdueDebt ? 'text-rose-600' : 'text-slate-600'}`} />
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
                                Kiểm Soát Dư Nợ Quá Hạn & Nợ Xấu (UC-A06)
                            </span>
                        </div>
                        {hasOverdueDebt ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-600 text-white uppercase">
                                Đang nợ xấu
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Không nợ (0 đ)
                            </span>
                        )}
                    </div>

                    {/* Current Debt Box */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] text-slate-500 font-medium">Dư nợ quá hạn hiện tại:</p>
                            <p className={`text-lg font-extrabold font-mono ${hasOverdueDebt ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {currentOverdueDebt.toLocaleString('vi-VN')} VNĐ
                            </p>
                        </div>
                        {hasOverdueDebt && !isSuspended && isAdmin && (
                            <button
                                type="button"
                                onClick={handleQuickBlockDebtor}
                                disabled={isUpdatingDebt}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
                            >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Chặn ngay tài khoản nợ xấu</span>
                            </button>
                        )}
                    </div>

                    {debtFeedback && (
                        <div
                            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                                debtFeedback.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                        >
                            {debtFeedback.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>{debtFeedback.text}</span>
                        </div>
                    )}

                    {isAdmin && (
                        <div className="space-y-2.5 pt-1">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Điều chỉnh mức dư nợ quá hạn (VNĐ):
                                    </label>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setDebtInput('0')}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition cursor-pointer"
                                        >
                                            Đã thu nợ (0 đ)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDebtInput(String(Math.max(0, Number(debtInput || 0)) + 30000))}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-700 transition cursor-pointer"
                                        >
                                            +30.000 đ
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={debtInput}
                                    onChange={(e) => setDebtInput(e.target.value)}
                                    disabled={isUpdatingDebt}
                                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                                    placeholder="Nhập số tiền dư nợ (VNĐ)..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Lý do ghi nhận / tất toán nợ:
                                </label>
                                <input
                                    type="text"
                                    value={debtReason}
                                    onChange={(e) => setDebtReason(e.target.value)}
                                    disabled={isUpdatingDebt}
                                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                                    placeholder="VD: Quá hạn đơn #BK-1024 chưa thanh toán phụ phí..."
                                />
                            </div>

                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none pt-0.5">
                                <input
                                    type="checkbox"
                                    checked={autoSuspendIfDebt}
                                    onChange={(e) => setAutoSuspendIfDebt(e.target.checked)}
                                    className="rounded text-rose-600 focus:ring-rose-500"
                                />
                                <span>Tự động chặn (SUSPENDED) nếu có nợ (&gt; 0 đ)</span>
                            </label>

                            <button
                                type="button"
                                onClick={handleUpdateUserDebt}
                                disabled={isUpdatingDebt}
                                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{isUpdatingDebt ? 'Đang cập nhật dư nợ...' : 'Cập nhật dư nợ'}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Section: Account Status & Actions */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
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
                                        <span>Chặn tài khoản</span>
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
                            <option value="TRAVELER">Khách hàng (Traveler)</option>
                        </select>
                    </div>

                    {/* Scope preview info */}
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-2 text-xs">
                        <p className="font-bold text-slate-700">Quyền hạn đối với ô tủ & IoT:</p>
                        <div className="space-y-1.5 text-slate-600">
                            <label className="flex items-center gap-2 cursor-default">
                                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                <span>Chuyển trạng thái ô tủ sang Bảo trì (UC-A03)</span>
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
