/**
 * AD-FE-01: UC-A01 — Log In to Admin Portal
 * Màn hình đăng nhập dành riêng cho Admin và Staff (Nhân viên kỹ thuật).
 * Đảm bảo chỉ người dùng có quyền Admin hoặc Staff mới được phép truy cập.
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2, Shield, ArrowLeft, Wrench } from 'lucide-react';
import authService from '../../api/authService';
import type { AuthResponse } from '../../api/authService';
import { tokenStore } from '../../api/client';

interface AdminLoginPageProps {
    onLoginSuccess?: (role: string) => void;
    onNavigateHome?: () => void;
}

/** Danh sách các role được phép truy cập Admin Portal */
const ALLOWED_ADMIN_ROLES = ['Admin', 'Staff'] as const;

/** Trích xuất role từ AuthResponse (ưu tiên field role, fallback đọc JWT claims nếu cần) */
function extractRole(data?: AuthResponse): string {
    if (data?.role?.trim()) return data.role.trim();
    if (data?.accessToken) {
        try {
            const parts = data.accessToken.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                return (
                    payload.role ||
                    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                    ''
                ).trim();
            }
        } catch {
            // Không parse được JWT -> trả về rỗng
        }
    }
    return '';
}

export default function AdminLoginPage({ onLoginSuccess, onNavigateHome }: AdminLoginPageProps) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

    // Validate form trước khi submit
    const validateForm = (): boolean => {
        const errors: { identifier?: string; password?: string } = {};

        if (!identifier.trim()) {
            errors.identifier = 'Vui lòng nhập tên đăng nhập hoặc email.';
        }

        if (!password) {
            errors.password = 'Vui lòng nhập mật khẩu.';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        // Validation dữ liệu đầu vào
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            // Gửi request đến API auth hiện có của project
            const response = await authService.login({
                email: identifier.trim(),
                password,
                rememberMe: false,
            });

            if (response.success && response.data) {
                // Xác định role từ response / token do Backend cung cấp
                const userRole = extractRole(response.data);
                const matchedRole = ALLOWED_ADMIN_ROLES.find(
                    (r) => r.toLowerCase() === userRole.toLowerCase()
                );

                // Xử lý role không hợp lệ (ví dụ Traveler hoặc không có quyền Admin/Staff)
                if (!matchedRole) {
                    // Xóa token để không lưu session không hợp lệ
                    tokenStore.clear();
                    setErrorMessage(
                        'Tài khoản không có quyền truy cập Admin Portal. Phân hệ này chỉ dành riêng cho Quản trị viên (Admin) và Nhân viên kỹ thuật (Staff).'
                    );
                    return;
                }

                // Lưu authentication thông tin theo cơ chế hiện tại của project
                tokenStore.set(response.data.accessToken, response.data.refreshToken);
                localStorage.setItem('smartlocker_user', JSON.stringify(response.data));

                // Thông báo login thành công và điều hướng
                onLoginSuccess?.(matchedRole);
            } else {
                setErrorMessage(response.message || 'Email hoặc mật khẩu không chính xác.');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
            if (axiosErr.response?.status === 401 || axiosErr.response?.status === 400) {
                setErrorMessage(axiosErr.response?.data?.message || 'Email hoặc mật khẩu không chính xác.');
            } else {
                setErrorMessage(
                    axiosErr.response?.data?.message ||
                        'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.'
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans select-none">
            {/* Ambient Background Glows */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-900/50 rounded-full blur-3xl pointer-events-none" />

            {/* Top Navigation Bar */}
            <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/30 border border-blue-400/20">
                        <Lock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-white tracking-tight">SmartLocker</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Admin Portal
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">Hệ thống quản trị & vận hành trạm tủ</p>
                    </div>
                </div>

                {onNavigateHome && (
                    <button
                        type="button"
                        onClick={onNavigateHome}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/60 border border-transparent hover:border-slate-700/80 cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Trang chủ khách hàng</span>
                    </button>
                )}
            </header>

            {/* Main Login Form Container */}
            <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
                <div className="w-full max-w-md">
                    {/* Security Notice Card */}
                    <div className="mb-4 p-3 rounded-xl bg-slate-900/70 border border-slate-800 backdrop-blur-md flex items-center gap-3 text-xs text-slate-300 shadow-sm">
                        <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>
                            Khu vực bảo mật cao — Chỉ dành cho{' '}
                            <strong className="text-white">Admin</strong> và{' '}
                            <strong className="text-white">Nhân viên kỹ thuật (Staff)</strong>.
                        </span>
                    </div>

                    {/* Main Card */}
                    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
                        <div className="mb-6 text-center">
                            <h1 className="text-2xl font-bold text-white tracking-tight">Đăng nhập Quản trị</h1>
                            <p className="text-xs text-slate-400 mt-1.5">
                                Vui lòng nhập thông tin xác thực để truy cập hệ thống
                            </p>
                        </div>

                        {/* Error Alert Box */}
                        {errorMessage && (
                            <div
                                role="alert"
                                className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs leading-relaxed animate-in fade-in duration-200"
                            >
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <div>{errorMessage}</div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate className="space-y-4">
                            {/* Username / Email Field */}
                            <div>
                                <label
                                    htmlFor="admin-identifier"
                                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                                >
                                    Tên đăng nhập hoặc Email <span className="text-rose-400">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <input
                                        id="admin-identifier"
                                        type="text"
                                        autoComplete="username"
                                        disabled={isLoading}
                                        value={identifier}
                                        onChange={(e) => {
                                            setIdentifier(e.target.value);
                                            if (fieldErrors.identifier) {
                                                setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
                                            }
                                        }}
                                        placeholder="admin@smartlocker.vn hoặc username"
                                        className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-950/60 border ${
                                            fieldErrors.identifier
                                                ? 'border-rose-500/80 focus:border-rose-400 focus:ring-rose-500/20'
                                                : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
                                        } rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition disabled:opacity-50`}
                                    />
                                </div>
                                {fieldErrors.identifier && (
                                    <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                                        <span>•</span> {fieldErrors.identifier}
                                    </p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div>
                                <label
                                    htmlFor="admin-password"
                                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                                >
                                    Mật khẩu <span className="text-rose-400">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        id="admin-password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        disabled={isLoading}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (fieldErrors.password) {
                                                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                                            }
                                        }}
                                        placeholder="••••••••"
                                        className={`w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border ${
                                            fieldErrors.password
                                                ? 'border-rose-500/80 focus:border-rose-400 focus:ring-rose-500/20'
                                                : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
                                        } rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition disabled:opacity-50`}
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        disabled={isLoading}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {fieldErrors.password && (
                                    <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                                        <span>•</span> {fieldErrors.password}
                                    </p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Đang xác thực quyền truy cập...</span>
                                        </>
                                    ) : (
                                        <span>Đăng nhập Admin Portal</span>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Allowed Roles Description Footer */}
                        <div className="mt-6 pt-5 border-t border-slate-800/80">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                                Vai trò được hỗ trợ truy cập
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2">
                                    <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-slate-200">Admin</p>
                                        <p className="text-[10px] text-slate-400">Quản trị viên toàn hệ thống</p>
                                    </div>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-start gap-2">
                                    <Wrench className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-slate-200">Staff</p>
                                        <p className="text-[10px] text-slate-400">Nhân viên kỹ thuật & trạm</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Footer */}
            <footer className="relative z-10 py-3 text-center text-xs text-slate-500 border-t border-slate-800/60 bg-slate-950/60">
                <span>© 2025 SmartLocker Management System (SLMS) · Phân hệ Quản trị</span>
            </footer>
        </div>
    );
}
