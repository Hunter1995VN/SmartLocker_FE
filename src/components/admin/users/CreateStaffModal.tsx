/**
 * AD-FE-05: UC-A06 — Manage Internal Users
 * Modal tạo mới tài khoản Staff / Kỹ thuật viên nội bộ.
 * Kết nối endpoint POST /api/admin/users/staff.
 */
import { useState } from 'react';
import { UserPlus, X, Mail, Lock, Phone, User, Shield } from 'lucide-react';
import type { CreateStaffRequest, UserRole } from '../../../api/adminUserService';

interface CreateStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (request: CreateStaffRequest) => Promise<boolean>;
    isSubmitting: boolean;
}

export default function CreateStaffModal({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
}: CreateStaffModalProps) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('STAFF');
    const [formError, setFormError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!fullName.trim()) {
            setFormError('Vui lòng nhập họ và tên nhân viên');
            return;
        }
        if (!email.trim() || !email.includes('@')) {
            setFormError('Vui lòng nhập địa chỉ email hợp lệ');
            return;
        }
        if (!phone.trim()) {
            setFormError('Vui lòng nhập số điện thoại');
            return;
        }
        if (!password || password.length < 6) {
            setFormError('Mật khẩu khởi tạo phải có tối thiểu 6 ký tự');
            return;
        }

        const success = await onSubmit({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password,
            role,
        });

        if (success) {
            setFullName('');
            setEmail('');
            setPhone('');
            setPassword('');
            setRole('STAFF');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                Tạo mới tài khoản nhân sự Staff
                            </h3>
                            <p className="text-xs text-slate-500">
                                Cấp quyền truy cập hệ thống vận hành và bảo trì trạm
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
                    {formError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                            {formError}
                        </div>
                    )}

                    <div>
                        <label htmlFor="create-staff-fullname" className="block text-slate-700 font-semibold mb-1">
                            Họ và tên nhân viên <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                id="create-staff-fullname"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Ví dụ: Nguyễn Văn An"
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="create-staff-email" className="block text-slate-700 font-semibold mb-1">
                                Email đăng nhập <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    id="create-staff-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nhanvien@smartlocker.vn"
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="create-staff-phone" className="block text-slate-700 font-semibold mb-1">
                                Số điện thoại <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    id="create-staff-phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="0912 345 678"
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="create-staff-password" className="block text-slate-700 font-semibold mb-1">
                                Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    id="create-staff-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Tối thiểu 6 ký tự"
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="create-staff-role" className="block text-slate-700 font-semibold mb-1">
                                Vai trò & Phân quyền <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <select
                                    id="create-staff-role"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserRole)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs cursor-pointer"
                                >
                                    <option value="STAFF">Vận hành trạm (Staff)</option>
                                    <option value="ADMIN">Quản trị viên (Admin)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Footer Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition cursor-pointer"
                        >
                            Hủy bỏ
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs shadow-blue-600/20 inline-flex items-center gap-1.5"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang tạo...</span>
                                </>
                            ) : (
                                <span>Tạo tài khoản Staff</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
