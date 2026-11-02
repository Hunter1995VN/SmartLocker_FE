/**
 * AD-FE-05: UC-A05 — Cấp lại / Đặt lại mật khẩu tài khoản nội bộ (Admin / Staff)
 */
import { useState, useEffect } from 'react';
import {
    X,
    KeyRound,
    Eye,
    EyeOff,
    RefreshCw,
    Copy,
    Check,
    AlertCircle,
    ShieldAlert,
} from 'lucide-react';
import type { UserAdminListItemDto } from '../../../api/adminUserService';

interface ResetStaffPasswordModalProps {
    isOpen: boolean;
    user: UserAdminListItemDto | null;
    onClose: () => void;
    onConfirm: (userId: string, newPassword: string, reason?: string) => Promise<boolean>;
    isSubmitting: boolean;
}

function generateResetPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let token = '';
    for (let i = 0; i < 8; i += 1) {
        token += chars[Math.floor(Math.random() * chars.length)];
    }
    return `Reset#${token}9`;
}

export default function ResetStaffPasswordModal({
    isOpen,
    user,
    onClose,
    onConfirm,
    isSubmitting,
}: ResetStaffPasswordModalProps) {
    const [newPassword, setNewPassword] = useState('');
    const [reason, setReason] = useState('');
    const [showPassword, setShowPassword] = useState(true);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setNewPassword(generateResetPassword());
        setReason('');
        setShowPassword(true);
        setCopied(false);
        setError(null);
    }, [isOpen, user]);

    if (!isOpen || !user) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(
                `Tài khoản: ${user.email}\nMật khẩu mới: ${newPassword}`
            );
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Ignore clipboard errors
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.trim().length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        setError(null);
        const ok = await onConfirm(user.id, newPassword, reason.trim() || undefined);
        if (ok) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold text-slate-900">
                                Cấp Lại Mật Khẩu Nhân Sự Nội Bộ
                            </h3>
                            <p className="text-[11px] text-slate-500 truncate max-w-[260px]">
                                {user.fullName} ({user.email})
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                            Mật khẩu cũ của nhân sự <strong>{user.fullName}</strong> sẽ bị thu hồi ngay lập tức và sự kiện này được ghi vết vào <strong>Audit Logs</strong>.
                        </span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700">
                                Mật khẩu cấp mới <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setNewPassword(generateResetPassword())}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Sinh ngẫu nhiên</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3 h-3 text-emerald-600" />
                                            <span className="text-emerald-700">Đã copy</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full pl-3.5 pr-10 py-2.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/25 text-slate-800"
                                placeholder="Tối thiểu 6 ký tự..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Lý do cấp lại mật khẩu (lưu vào Audit Log)
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="VD: Nhân viên quên mật khẩu / Luân chuyển ca trực..."
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-slate-700"
                        />
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>{isSubmitting ? 'Đang cập nhật...' : 'Xác nhận đặt lại mật khẩu'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
