import { useState } from 'react';
import { Lock, ChevronLeft, ArrowRight, AlertCircle, Mail, Eye, EyeOff, Check, RefreshCw, KeyRound } from 'lucide-react';

type ViewMode = 'login' | 'register' | 'verify-otp' | 'forgot-password';

interface ForgotPasswordPageProps {
    onNavigate: (mode: ViewMode, data?: { email?: string }) => void;
}

/**
 * Trang Quên mật khẩu - Split-screen layout nhất quán với Login/Register:
 * - Bước 1: Nhập email
 * - Bước 2: Nhập OTP + đặt mật khẩu mới
 */
export default function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.includes('@')) {
            setError('Email không hợp lệ');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const { default: authService } = await import('../../api/authService');
            const response = await authService.forgotPassword({ email });
            if (response.success) {
                setSuccess('Mã OTP đã được gửi tới email của bạn');
                setStep('reset');
            } else {
                setError(response.message || 'Không thể gửi OTP');
            }
        } catch {
            setError('Không thể kết nối tới máy chủ');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            setError('Mật khẩu mới phải có ít nhất 8 ký tự');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const { default: authService } = await import('../../api/authService');
            const { default: apiClient, tokenStore } = await import('../../api/client');
            void apiClient;
            const response = await authService.resetPassword({
                email,
                code: code.join(''),
                newPassword,
                confirmPassword,
            });
            if (response.success && response.data) {
                tokenStore.set(response.data.accessToken, response.data.refreshToken);
                localStorage.setItem('smartlocker_user', JSON.stringify(response.data));
                alert('✅ Đặt lại mật khẩu thành công! Đang chuyển về trang chủ...');
                window.location.href = '/';
            } else {
                setError(response.message || 'Không thể đặt lại mật khẩu');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr.response?.data?.message || 'Không thể kết nối tới máy chủ');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);
        // Auto focus next
        if (digit && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    return (
        <div className="min-h-screen flex bg-[#f0f4ff] font-sans">
            {/* LEFT SIDE */}
            <aside className="hidden lg:flex lg:w-[48%] relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0f2977 0%, #1a4ac4 40%, #2563eb 70%, #3b82f6 100%)'}}>
                {/* Ambient blobs */}
                <div className="absolute -top-32 -right-32 w-[450px] h-[450px] rounded-full opacity-20" style={{background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)'}}></div>
                <div className="absolute -bottom-36 -left-24 w-[420px] h-[420px] rounded-full opacity-15" style={{background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)'}}></div>
                <div className="absolute inset-0 grid-pattern opacity-10"></div>

                <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)'}}>
                            <Lock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-lg font-extrabold text-white tracking-tight">SmartLocker</span>
                            <p className="text-[11px] text-white/60 uppercase tracking-widest">Tủ hành lý thông minh</p>
                        </div>
                    </div>

                    {/* Center content */}
                    <div className="my-auto py-12">
                        {/* Step indicator */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6" style={{background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)'}}>
                            <KeyRound className="w-3.5 h-3.5 text-yellow-300" />
                            <span className="text-xs text-white/90 font-semibold">
                                {step === 'email' ? 'Bước 1 / 2 — Xác thực email' : 'Bước 2 / 2 — Đặt mật khẩu mới'}
                            </span>
                        </div>

                        <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight mb-5">
                            {step === 'email' ? (
                                <>Quên<br /><span style={{background: 'linear-gradient(90deg, #93c5fd, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>mật khẩu?</span></>
                            ) : (
                                <>Đặt lại<br /><span style={{background: 'linear-gradient(90deg, #93c5fd, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>mật khẩu</span></>
                            )}
                        </h1>

                        <p className="text-base text-white/70 leading-relaxed max-w-sm">
                            {step === 'email'
                                ? 'Nhập email đã đăng ký. Chúng tôi sẽ gửi mã OTP 6 chữ số để xác thực danh tính.'
                                : 'Nhập mã OTP từ email và đặt mật khẩu mới. Mã có hiệu lực trong 5 phút.'}
                        </p>

                        {/* Steps visual */}
                        <div className="mt-10 space-y-3">
                            {[
                                { num: '1', label: 'Nhập email đã đăng ký', done: step === 'reset' || step === 'email' },
                                { num: '2', label: 'Nhập mã OTP từ email', done: step === 'reset' },
                                { num: '3', label: 'Đặt mật khẩu mới an toàn', done: false },
                            ].map(({ num, label, done }, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 p-3 rounded-xl"
                                    style={{
                                        background: done ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.08)',
                                        border: done ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black"
                                        style={{
                                            background: done ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.15)',
                                            color: 'white',
                                        }}
                                    >
                                        {done && i < (step === 'reset' ? 1 : 0) ? <Check className="w-3.5 h-3.5" /> : num}
                                    </div>
                                    <span className="text-sm text-white/80 font-medium">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Security note */}
                    <div className="p-4 rounded-2xl" style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)'}}>
                        <div className="flex items-start gap-2.5">
                            <Lock className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
                            <p className="text-white/70 text-xs leading-relaxed">
                                Mã OTP được mã hóa và chỉ có hiệu lực một lần. Không ai từ SmartLocker sẽ hỏi mã OTP của bạn.
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* RIGHT SIDE */}
            <main className="w-full lg:w-[52%] flex flex-col bg-white">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                    <button
                        onClick={() => step === 'reset' ? setStep('email') : onNavigate('login')}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors group"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        {step === 'reset' ? 'Quay lại bước trước' : 'Quay lại đăng nhập'}
                    </button>
                    <div className="flex gap-1.5">
                        <div className={`h-1.5 w-8 rounded-full transition-all ${step === 'email' ? 'bg-blue-600' : 'bg-blue-200'}`}></div>
                        <div className={`h-1.5 w-8 rounded-full transition-all ${step === 'reset' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    </div>
                </div>

                {/* Form Container */}
                <div className="flex-1 flex items-center justify-center px-8 py-10">
                    <div className="w-full max-w-[400px]">

                        {/* Step icon */}
                        <div className="mb-6 flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{background: 'linear-gradient(135deg, #eff6ff, #dbeafe)'}}>
                                {step === 'email'
                                    ? <Mail className="w-7 h-7 text-blue-600" />
                                    : <KeyRound className="w-7 h-7 text-blue-600" />}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                                    {step === 'email' ? 'Khôi phục mật khẩu' : 'Đặt lại mật khẩu'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {step === 'email'
                                        ? 'Nhập email để nhận mã OTP xác thực'
                                        : `Mã OTP gửi đến ${email}`}
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        {error && (
                            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}
                        {success && (
                            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-emerald-700">{success}</p>
                            </div>
                        )}

                        {/* === STEP 1: Email === */}
                        {step === 'email' && (
                            <form onSubmit={handleSendOtp} className="space-y-4">
                                <div>
                                    <label htmlFor="fp-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Email đã đăng ký
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        <input
                                            id="fp-email"
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="nguyenvana@example.com"
                                            autoComplete="email"
                                            disabled={isLoading}
                                            className="w-full h-12 pl-11 pr-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: isLoading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                        color: 'white',
                                        boxShadow: isLoading ? 'none' : '0 4px 15px rgba(37, 99, 235, 0.35)',
                                    }}
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"></path>
                                            </svg>
                                            Đang gửi OTP...
                                        </>
                                    ) : (
                                        <>Gửi mã OTP <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>

                                <p className="text-xs text-center text-gray-400">
                                    Kiểm tra cả hộp thư Spam nếu không thấy email.
                                </p>
                            </form>
                        )}

                        {/* === STEP 2: OTP + New Password === */}
                        {step === 'reset' && (
                            <form onSubmit={handleReset} className="space-y-5">
                                {/* OTP Input */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Mã OTP{' '}
                                        <span className="text-xs text-gray-400 font-normal">(6 chữ số từ email)</span>
                                    </label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {code.map((digit, i) => (
                                            <input
                                                key={i}
                                                id={`otp-${i}`}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={e => handleCodeChange(i, e.target.value)}
                                                onKeyDown={e => handleCodeKeyDown(i, e)}
                                                disabled={isLoading}
                                                className={`aspect-square text-center text-xl font-black rounded-xl border-2 outline-none transition-all disabled:opacity-50 ${
                                                    digit
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                        : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-xs text-gray-400">Mã có hiệu lực trong 5 phút</p>
                                        <button
                                            type="button"
                                            onClick={() => { setCode(['', '', '', '', '', '']); setError(''); }}
                                            className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1 transition-colors"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Xóa mã
                                        </button>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-100"></div>

                                {/* New Password */}
                                <div>
                                    <label htmlFor="fp-new-pwd" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="fp-new-pwd"
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="Ít nhất 8 ký tự"
                                            disabled={isLoading}
                                            className="w-full h-12 px-4 pr-12 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label htmlFor="fp-confirm-pwd" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Xác nhận mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="fp-confirm-pwd"
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="Nhập lại mật khẩu mới"
                                            disabled={isLoading}
                                            className={`w-full h-12 px-4 pr-10 rounded-xl border-2 text-sm outline-none transition-all disabled:opacity-50 ${
                                                confirmPassword && newPassword !== confirmPassword
                                                    ? 'border-red-400 bg-red-50 focus:ring-4 focus:ring-red-50'
                                                    : confirmPassword && newPassword === confirmPassword
                                                    ? 'border-emerald-400 bg-emerald-50 focus:ring-4 focus:ring-emerald-50'
                                                    : 'border-gray-100 bg-gray-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50'
                                            }`}
                                        />
                                        {confirmPassword && (
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                                                {newPassword === confirmPassword
                                                    ? <Check className="w-4 h-4 text-emerald-500" />
                                                    : <AlertCircle className="w-4 h-4 text-red-400" />}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || code.join('').length < 6}
                                    className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: isLoading || code.join('').length < 6
                                            ? '#e5e7eb'
                                            : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                        color: isLoading || code.join('').length < 6 ? '#9ca3af' : 'white',
                                        boxShadow: isLoading || code.join('').length < 6
                                            ? 'none'
                                            : '0 4px 15px rgba(37, 99, 235, 0.35)',
                                    }}
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"></path>
                                            </svg>
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>Đặt lại mật khẩu <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
