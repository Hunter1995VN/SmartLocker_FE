/**
 * AD-FE-05: UC-A06 — Manage Internal Users
 * Modal xác nhận trước khi thực hiện thao tác nhạy cảm:
 * - Khóa / Tạm khóa đăng nhập hệ thống (có nhập lý do)
 * - Mở khóa đăng nhập hệ thống
 * - Thay đổi quyền hạn (Role RBAC)
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
    const isTraveler = user.role === 'TRAVELER';

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
                                {actionType === 'LOCK' && (isTraveler ? 'Tạm khóa đăng nhập khách hàng?' : 'Tạm khóa đăng nhập nhân sự?')}
                                {actionType === 'ACTIVATE' && (isTraveler ? 'Mở khóa đăng nhập khách hàng?' : 'Mở khóa đăng nhập nhân sự?')}
                                {actionType === 'CHANGE_ROLE' && 'Xác nhận thay đổi vai trò RBAC?'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {isTraveler ? 'Khách hàng: ' : 'Nhân sự: '}<strong className="text-slate-800">{user.fullName || user.email}</strong>
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
                        <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-800 space-y-1.5">
                            <p className="font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                {isTraveler ? 'Cảnh báo tạm khóa đăng nhập:' : 'Cảnh báo bảo mật:'}
                            </p>
                            <p className="text-rose-700 leading-relaxed">
                                {isTraveler
                                    ? 'Tài khoản khách hàng này sẽ bị chuyển sang trạng thái SUSPENDED, hoàn toàn không thể đăng nhập vào ứng dụng di động hoặc trang web.'
                                    : 'Tài khoản này sẽ ngay lập tức bị thu hồi quyền truy cập Admin Portal và các chức năng vận hành trạm.'}
                            </p>
                            {isTraveler && (
                                <p className="text-[11px] text-amber-700 font-medium bg-amber-50/80 p-2 rounded-lg border border-amber-200">
                                    💡 <strong>Mẹo:</strong> Nếu chỉ muốn chặn khách hàng đặt tủ mới do nợ cước (vẫn để họ đăng nhập trả tiền qua PayOS), hãy sử dụng nút <strong>Khóa đặt tủ</strong> bên trang <em>Quản lý dư nợ</em>.
                                </p>
                            )}
                        </div>
                    )}

                    {actionType === 'ACTIVATE' && (
                        <p className="text-slate-600 leading-relaxed bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                            {isTraveler
                                ? 'Tài khoản sẽ được chuyển sang trạng thái ACTIVE. Khách hàng có thể đăng nhập vào ứng dụng và sử dụng các dịch vụ hệ thống bình thường.'
                                : 'Tài khoản sẽ được chuyển sang trạng thái ACTIVE và nhân sự có thể đăng nhập thực hiện các thao tác vận hành trạm.'}
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
                                Lý do tạm khóa đăng nhập:
                            </label>
                            <textarea
                                id="lock-reason-input"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={
                                    isTraveler
                                        ? 'Nhập lý do tạm khóa đăng nhập (vd: Gian lận, phá hoại thiết bị, vi phạm chính sách bảo mật...)'
                                        : 'Nhập lý do tạm khóa đăng nhập (vd: Vi phạm quy trình vận hành trạm, nghi vấn lộ bảo mật...)'
                                }
                                rows={3}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs"
                            />
                        </div>
                    )}

                    {/* User credentials summary */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-[11px]">
                        <span>ID người dùng:</span>
                        <span className="font-mono text-slate-700">{user.id.slice(0, 16)}...</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer font-semibold disabled:opacity-50"
                        >
                            Hủy bỏ
                        </button>

                        <button
                            type="submit"
                            disabled={isProcessing}
                            className={`px-4 py-2 rounded-xl text-white font-bold transition cursor-pointer shadow-xs disabled:opacity-50 ${
                                actionType === 'LOCK'
                                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                                    : actionType === 'ACTIVATE'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                                    : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                            }`}
                        >
                            {isProcessing
                                ? 'Đang xử lý...'
                                : actionType === 'LOCK'
                                ? 'Xác nhận tạm khóa'
                                : actionType === 'ACTIVATE'
                                ? 'Xác nhận mở khóa'
                                : 'Xác nhận đổi vai trò'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
