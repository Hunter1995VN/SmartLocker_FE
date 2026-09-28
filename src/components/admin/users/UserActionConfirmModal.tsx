/**
 * AD-FE-05: UC-A06 — Manage Internal Users
 * Modal xác nhận trước khi thực hiện thao tác nhạy cảm:
 * - Khóa / Tạm khóa tài khoản (có nhập lý do)
 * - Kích hoạt tài khoản
 * - Thay đổi quyền hạn (Role)
 */
import { useState } from 'react';
import { AlertTriangle, Lock, Unlock, Shield, X } from 'lucide-react';
import type { UserAdminListItemDto, UserRole } from '../../../api/adminUserService';
import { getRoleConfig } from './userConstants';

export type ActionType = 'LOCK' | 'ACTIVATE' | 'CHANGE_ROLE';

interface UserActionConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    actionType: ActionType;
    user: UserAdminListItemDto;
    targetRole?: UserRole;
    onConfirm: (reason?: string) => Promise<void>;
    isProcessing: boolean;
}

export default function UserActionConfirmModal({
    isOpen,
    onClose,
    actionType,
    user,
    targetRole,
    onConfirm,
    isProcessing,
}: UserActionConfirmModalProps) {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleConfirmSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onConfirm(reason.trim() || undefined);
        setReason('');
    };

    const targetRoleCfg = targetRole ? getRoleConfig(targetRole) : null;
    const currentRoleCfg = getRoleConfig(user.role);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {actionType === 'LOCK' && (
                            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <Lock className="w-5 h-5" />
                            </div>
                        )}
                        {actionType === 'ACTIVATE' && (
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Unlock className="w-5 h-5" />
                            </div>
                        )}
                        {actionType === 'CHANGE_ROLE' && (
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <Shield className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                {actionType === 'LOCK' && 'Khóa tài khoản nhân viên?'}
                                {actionType === 'ACTIVATE' && 'Kích hoạt tài khoản nhân viên?'}
                                {actionType === 'CHANGE_ROLE' && 'Xác nhận thay đổi vai trò?'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                Nhân sự: <strong className="text-slate-800">{user.fullName || user.email}</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleConfirmSubmit} className="p-5 space-y-4 text-xs">
                    {/* Explanation */}
                    {actionType === 'LOCK' && (
                        <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-800 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                Cảnh báo bảo mật:
                            </p>
                            <p className="text-rose-700">
                                Tài khoản này sẽ ngay lập tức bị thu hồi quyền truy cập Admin Portal và ứng dụng Mobile.
                            </p>
                        </div>
                    )}

                    {actionType === 'ACTIVATE' && (
                        <p className="text-slate-600">
                            Tài khoản sẽ được chuyển sang trạng thái <strong>ACTIVE</strong> và nhân sự có thể đăng nhập thực hiện các thao tác vận hành trạm.
                        </p>
                    )}

                    {actionType === 'CHANGE_ROLE' && targetRoleCfg && (
                        <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl space-y-2 text-purple-900">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Vai trò hiện tại:</span>
                                <strong className="font-bold">{currentRoleCfg.label}</strong>
                            </div>
                            <div className="flex items-center justify-between text-purple-700">
                                <span className="text-slate-500">Vai trò mới:</span>
                                <strong className="font-bold text-purple-800">{targetRoleCfg.label}</strong>
                            </div>
                        </div>
                    )}

                    {/* Reason input for Lock action */}
                    {actionType === 'LOCK' && (
                        <div>
                            <label htmlFor="lock-reason-input" className="block text-slate-700 font-semibold mb-1">
                                Lý do tạm khóa tài khoản:
                            </label>
                            <textarea
                                id="lock-reason-input"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Nhập lý do tạm khóa (vd: Vi phạm quy trình vận hành trạm, nghi vấn lộ bảo mật...)"
                                rows={3}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs"
                            />
                        </div>
                    )}

                    {/* User credentials summary */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Email: {user.email}</span>
                        <span>SĐT: {user.phone || 'Chưa có'}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition cursor-pointer"
                        >
                            Hủy
                        </button>

                        <button
                            type="submit"
                            disabled={isProcessing}
                            className={`px-4 py-2 font-bold text-white rounded-xl transition cursor-pointer shadow-xs inline-flex items-center gap-1.5 ${
                                actionType === 'LOCK'
                                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                                    : actionType === 'ACTIVATE'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                                    : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                            }`}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang xử lý...</span>
                                </>
                            ) : (
                                <span>
                                    {actionType === 'LOCK' && 'Xác nhận khóa'}
                                    {actionType === 'ACTIVATE' && 'Kích hoạt ngay'}
                                    {actionType === 'CHANGE_ROLE' && 'Xác nhận đổi quyền'}
                                </span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
