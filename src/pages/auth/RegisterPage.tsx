import { Lock, Eye, EyeOff, ChevronLeft, ArrowRight, AlertCircle, Check, X, Package, Zap } from 'lucide-react';
import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

type ViewMode = 'login' | 'register' | 'verify-otp' | 'forgot-password';

interface RegisterPageProps {
    onNavigate: (mode: ViewMode, data?: { email?: string }) => void;
    onLoginSuccess?: () => void;
}

/**
 * Trang Đăng ký - Thiết kế split-screen nâng cấp:
 * - Cột trái: Branding + lợi ích nổi bật
 * - Cột phải: Form đăng ký có layout 2 cột cho các trường ngắn
 */
export default function RegisterPage({ onNavigate, onLoginSuccess }: RegisterPageProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleLogin = useGoogleLogin({
        flow: 'implicit',
        onSuccess: async (response) => {
            setIsLoading(true);
            try {
                const { default: authService } = await import('../../api/authService');
                const { tokenStore } = await import('../../api/client');
                const result = await authService.googleLogin(response.access_token);
                if (result.success && result.data) {
                    tokenStore.set(result.data.accessToken, result.data.refreshToken);
                    localStorage.setItem('smartlocker_user', JSON.stringify(result.data));
                    onLoginSuccess?.();
                } else {
                    setError(result.message || 'Đăng ký Google thất bại');
                }
            } catch (err: unknown) {
                const axiosErr = err as { response?: { data?: { message?: string } } };
                setError(axiosErr.response?.data?.message || 'Không thể đăng nhập bằng Google');
            } finally {
                setIsLoading(false);
            }
        },
        onError: () => setError('Đăng nhập Google bị hủy'),
    });

    // Real-time password strength check
    const passwordChecks = [
        { label: 'Ít nhất 8 ký tự', ok: password.length >= 8 },
        { label: 'Có chữ hoa (A–Z)', ok: /[A-Z]/.test(password) },
        { label: 'Có số (0–9)', ok: /[0-9]/.test(password) },
        { label: 'Mật khẩu khớp nhau', ok: password === confirmPassword && password.length > 0 },
    ];
    const strengthScore = passwordChecks.filter(c => c.ok).length;
    const strengthColors = ['#f87171', '#f87171', '#fbbf24', '#fbbf24', '#34d399'];
    const strengthLabels = ['', 'Yếu', 'Trung bình', 'Khá mạnh', 'Mạnh'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!fullName.trim()) { setError('Vui lòng nhập họ và tên'); return; }
        if (!email.includes('@')) { setError('Email không hợp lệ'); return; }
        if (!/^0\d{9,10}$/.test(phone)) { setError('Số điện thoại phải 10-11 số bắt đầu bằng 0'); return; }
        if (password.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự'); return; }
        if (password !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
        if (!agreeTerms) { setError('Bạn cần đồng ý với điều khoản dịch vụ'); return; }

        setIsLoading(true);
        try {
            const { default: authService } = await import('../../api/authService');
            const response = await authService.register({
                fullName, email, phone, password, confirmPassword, agreeTerms
            });
            if (response.success && response.data) {
                onNavigate('verify-otp', { email });
            } else {
                setError(response.message || 'Đăng ký thất bại. Vui lòng thử lại.');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string; code?: string } } };
            const msg = axiosErr.response?.data?.message || 'Không thể kết nối tới máy chủ';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#f0f4ff] font-sans">
            {/* LEFT SIDE */}
            <aside className="hidden lg:flex lg:w-[44%] relative overflow-hidden shrink-0" style={{background: 'linear-gradient(135deg, #0f2977 0%, #1a4ac4 40%, #2563eb 70%, #3b82f6 100%)'}}>
                {/* Ambient blobs */}
                <div className="absolute -top-28 -left-28 w-[400px] h-[400px] rounded-full opacity-20" style={{background: 'radial-gradient(circle, #c4b5fd 0%, transparent 70%)'}}></div>
                <div className="absolute -bottom-32 -right-20 w-[380px] h-[380px] rounded-full opacity-15" style={{background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)'}}></div>
                <div className="absolute inset-0 dot-pattern opacity-10"></div>

                <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
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

                    {/* Hero */}
                    <div className="my-auto py-10">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5" style={{background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)'}}>
                            <Zap className="w-3.5 h-3.5 text-yellow-300" />
                            <span className="text-xs text-white/90 font-semibold">Đăng ký miễn phí — Chỉ 1 phút</span>
                        </div>
                        <h1 className="text-3xl xl:text-4xl font-black text-white leading-[1.1] tracking-tight mb-4">
                            Tạo tài khoản<br />
                            <span style={{background: 'linear-gradient(90deg, #93c5fd, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                                miễn phí
                            </span>
                        </h1>
                        <p className="text-sm text-white/70 leading-relaxed max-w-xs">
                            Tham gia SmartLocker để đặt tủ, theo dõi lịch sử gửi đồ và nhận ưu đãi thành viên đặc biệt.
                        </p>

                        {/* Benefits */}
                        <div className="mt-8 space-y-2.5">
                            {[
                                { icon: Check, label: 'Miễn phí đăng ký tài khoản', desc: 'Không phí ẩn, không thẻ tín dụng' },
                                { icon: Package, label: 'Đặt tủ chỉ từ 10.000đ/giờ', desc: 'Giá minh bạch, không phụ phí' },
                                { icon: Lock, label: 'OTP bảo mật 2 lớp', desc: 'Mã hóa JWS, không lo lộ thông tin' },
                            ].map(({ icon: Icon, label, desc }, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)'}}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background: 'rgba(52, 211, 153, 0.2)'}}>
                                        <Icon className="w-4 h-4 text-emerald-300" />
                                    </div>
                                    <div>
                                        <p className="text-white text-xs font-semibold">{label}</p>
                                        <p className="text-white/50 text-[11px]">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { num: '85+', label: 'Trạm tủ' },
                            { num: '24/7', label: 'Hoạt động' },
                            { num: '20M', label: 'Bảo hiểm' },
                        ].map(({ num, label }) => (
                            <div key={label} className="text-center py-3 px-2 rounded-xl" style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)'}}>
                                <div className="text-xl font-black text-white">{num}</div>
                                <div className="text-[11px] text-white/55 mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* RIGHT SIDE - Register Form */}
            <main className="w-full lg:w-[56%] flex flex-col bg-white overflow-y-auto">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 shrink-0">
                    <button
                        type="button"
                        onClick={() => onNavigate('login')}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors group"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Đăng nhập
                    </button>
                    <div className="text-sm text-gray-500">
                        Đã có tài khoản?{' '}
                        <button
                            type="button"
                            onClick={() => onNavigate('login')}
                            className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            Đăng nhập ngay
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="flex-1 flex items-start justify-center px-8 py-8">
                    <div className="w-full max-w-[480px]">
                        {/* Header */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1.5">
                                Tạo tài khoản mới
                            </h2>
                            <p className="text-sm text-gray-500">
                                Điền đầy đủ thông tin bên dưới. Mã OTP sẽ được gửi tới email của bạn.
                            </p>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Google Button */}
                        <button
                            type="button"
                            onClick={() => handleGoogleLogin()}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-all hover:border-gray-300 hover:shadow-sm disabled:opacity-50 mb-5"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Đăng ký nhanh với Google
                        </button>

                        {/* Divider */}
                        <div className="relative mb-5">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-100"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white px-3 text-xs text-gray-400 uppercase tracking-widest font-semibold">
                                    hoặc đăng ký bằng email
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Row 1: Full Name (full width) */}
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Họ và tên <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="fullName"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Nguyễn Văn A"
                                    autoComplete="name"
                                    disabled={isLoading}
                                    className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                                />
                            </div>

                            {/* Row 2: Email + Phone (2 columns) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="reg-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="reg-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        autoComplete="email"
                                        disabled={isLoading}
                                        className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Số điện thoại <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 text-xs font-bold pointer-events-none select-none">
                                            +84
                                        </span>
                                        <input
                                            id="phone"
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                            placeholder="901 234 567"
                                            autoComplete="tel"
                                            disabled={isLoading}
                                            className="w-full h-11 pl-11 pr-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Password + Confirm (2 columns) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="reg-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Mật khẩu <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="reg-password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                            disabled={isLoading}
                                            className="w-full h-11 px-4 pr-10 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Xác nhận MK <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                            disabled={isLoading}
                                            className={`w-full h-11 px-4 pr-10 rounded-xl border-2 text-sm outline-none transition-all disabled:opacity-50 bg-gray-50 ${
                                                confirmPassword && password !== confirmPassword
                                                    ? 'border-red-400 focus:ring-4 focus:ring-red-50'
                                                    : confirmPassword && password === confirmPassword
                                                    ? 'border-emerald-400 focus:ring-4 focus:ring-emerald-50 bg-white'
                                                    : 'border-gray-100 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        {confirmPassword && (
                                            <span className="absolute top-1/2 -translate-y-1/2 right-8">
                                                {password === confirmPassword
                                                    ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                    : <X className="w-3.5 h-3.5 text-red-400" />}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Password strength meter */}
                            {password.length > 0 && (
                                <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50">
                                    <div className="flex gap-1.5 mb-2">
                                        {[1, 2, 3, 4].map(level => (
                                            <div
                                                key={level}
                                                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                                                style={{
                                                    background: level <= strengthScore ? strengthColors[strengthScore] : '#e5e7eb'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 flex-1">
                                            {passwordChecks.map((check, i) => (
                                                <div key={i} className="flex items-center gap-1.5">
                                                    {check.ok
                                                        ? <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                                        : <X className="w-3 h-3 text-gray-300 shrink-0" />}
                                                    <span className={`text-[11px] ${check.ok ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
                                                        {check.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {strengthScore > 0 && (
                                            <span className="text-xs font-bold ml-3" style={{color: strengthColors[strengthScore]}}>
                                                {strengthLabels[strengthScore]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Terms checkbox */}
                            <div className="flex items-start gap-2.5 pt-1">
                                <input
                                    id="agreeTerms"
                                    type="checkbox"
                                    checked={agreeTerms}
                                    onChange={(e) => setAgreeTerms(e.target.checked)}
                                    disabled={isLoading}
                                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                                />
                                <label htmlFor="agreeTerms" className="text-xs text-gray-500 cursor-pointer leading-relaxed">
                                    Tôi đồng ý với{' '}
                                    <a href="#" className="text-blue-600 font-semibold hover:underline">Điều khoản dịch vụ</a>
                                    {' '}và{' '}
                                    <a href="#" className="text-blue-600 font-semibold hover:underline">Chính sách bảo mật</a>
                                    {' '}của SmartLocker.
                                </label>
                            </div>

                            {/* Submit */}
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
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <span>Tạo tài khoản</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-5 text-center text-xs text-gray-400">
                            Quản lý thông tin theo{' '}
                            <a href="#" className="text-blue-600 font-semibold hover:underline">Chính sách bảo mật</a>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
