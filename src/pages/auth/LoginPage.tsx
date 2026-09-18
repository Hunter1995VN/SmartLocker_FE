import { Lock, Eye, EyeOff, ArrowRight, ChevronLeft, AlertCircle, Shield, Sparkles, Package } from 'lucide-react';
import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

type ViewMode = 'login' | 'register' | 'verify-otp' | 'forgot-password';

interface LoginPageProps {
    onNavigate: (mode: ViewMode, data?: { email?: string }) => void;
    onLoginSuccess?: () => void;
}

/**
 * Trang Đăng nhập - Thiết kế split-screen nâng cấp:
 * - Cột trái: Branding phong phú + visual elements
 * - Cột phải: Form đăng nhập gọn đẹp
 */
export default function LoginPage({ onNavigate, onLoginSuccess }: LoginPageProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                    setError(result.message || 'Đăng nhập Google thất bại');
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Vui lòng nhập email và mật khẩu');
            return;
        }

        setIsLoading(true);
        try {
            const { default: authService } = await import('../../api/authService');
            const { default: apiClient, tokenStore } = await import('../../api/client');
            void apiClient;
            const response = await authService.login({ email, password, rememberMe });
            if (response.success && response.data) {
                tokenStore.set(response.data.accessToken, response.data.refreshToken);
                localStorage.setItem('smartlocker_user', JSON.stringify(response.data));
                onLoginSuccess?.();
            } else {
                setError(response.message || 'Đăng nhập thất bại');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr.response?.data?.message || 'Không thể kết nối tới máy chủ. Kiểm tra Backend đã chạy chưa.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#f0f4ff] font-sans">
            {/* LEFT SIDE - Visual Branding */}
            <aside className="hidden lg:flex lg:w-[52%] relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0f2977 0%, #1a4ac4 40%, #2563eb 70%, #3b82f6 100%)'}}>
                {/* Ambient blobs */}
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20" style={{background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)'}}></div>
                <div className="absolute -bottom-40 -left-20 w-[450px] h-[450px] rounded-full opacity-15" style={{background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)'}}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)'}}></div>

                {/* Grid overlay */}
                <div className="absolute inset-0 grid-pattern opacity-10"></div>

                {/* Content */}
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

                    {/* Center hero text */}
                    <div className="my-auto py-12">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6" style={{background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)'}}>
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                            <span className="text-xs text-white/90 font-semibold">Nền tảng #1 tại Việt Nam</span>
                        </div>
                        <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight mb-5">
                            Chào mừng<br />
                            <span style={{background: 'linear-gradient(90deg, #93c5fd, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                                trở lại!
                            </span>
                        </h1>
                        <p className="text-base text-white/70 leading-relaxed max-w-sm">
                            Đăng nhập để quản lý hành lý, mở tủ từ xa và tận hưởng ưu đãi thành viên thân thiết.
                        </p>

                        {/* Feature cards */}
                        <div className="mt-10 space-y-3">
                            {[
                                { icon: Shield, title: 'Bảo mật chuẩn ngân hàng', desc: 'Mã hóa JWS & BCrypt' },
                                { icon: Package, title: '85+ trạm tủ toàn quốc', desc: 'Sân bay, metro, phố đi bộ' },
                                { icon: Sparkles, title: 'Hoạt động 24/7', desc: 'Hỗ trợ kỹ thuật liên tục' },
                            ].map(({ icon: Icon, title, desc }, i) => (
                                <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-2xl" style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)'}}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{background: 'rgba(255,255,255,0.15)'}}>
                                        <Icon className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-semibold">{title}</p>
                                        <p className="text-white/55 text-xs">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom testimonial */}
                    <div className="p-4 rounded-2xl" style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)'}}>
                        <p className="text-white/85 text-sm leading-relaxed italic">
                            "SmartLocker giúp chuyến công tác của tôi nhẹ nhàng hơn rất nhiều. Mở tủ trong tích tắc!"
                        </p>
                        <div className="flex items-center gap-2.5 mt-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background: 'linear-gradient(135deg, #a78bfa, #60a5fa)'}}>
                                TM
                            </div>
                            <div>
                                <p className="text-white/80 text-xs font-semibold">Trần Minh Đức</p>
                                <p className="text-white/45 text-[10px]">Freelance Designer</p>
                            </div>
                            <div className="ml-auto flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className="text-yellow-300 text-xs">★</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* RIGHT SIDE - Login Form */}
            <main className="w-full lg:w-[48%] flex flex-col bg-white">
                {/* Top navigation bar */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                    <a href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors group">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Về trang chủ
                    </a>
                    <div className="text-sm text-gray-500">
                        Chưa có tài khoản?{' '}
                        <button
                            type="button"
                            onClick={() => onNavigate('register')}
                            className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            Đăng ký ngay
                        </button>
                    </div>
                </div>

                {/* Form Container */}
                <div className="flex-1 flex items-center justify-center px-8 py-10">
                    <div className="w-full max-w-[400px]">
                        {/* Header */}
                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                                Đăng nhập
                            </h2>
                            <p className="text-sm text-gray-500">
                                Nhập thông tin tài khoản của bạn để tiếp tục
                            </p>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Social Login */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                type="button"
                                onClick={() => handleGoogleLogin()}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-all hover:border-gray-300 hover:shadow-sm disabled:opacity-50"
                            >
                                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Google
                            </button>
                            <button type="button" className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-all hover:border-gray-300 hover:shadow-sm">
                                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12-1.03.35-2.09 1.012-2.86C13.755 4.34 14.785 3.66 16.365 1.43zm3.495 16.74c-.6 1.41-.84 2.04-1.59 3.27-1.04 1.71-2.5 3.84-4.32 3.85-1.6.02-2.02-1.04-4.2-1.04-2.18 0-2.62 1.02-4.21 1.06-1.81.04-3.18-1.84-4.21-3.55-2.99-4.96-3.31-10.79-1.46-13.88 1.31-2.18 3.39-3.45 5.34-3.45 1.95 0 3.18 1.07 4.79 1.07 1.55 0 2.5-1.07 4.79-1.07 1.7 0 3.51 1.18 4.79 3.21-4.21 2.31-3.52 8.34.69 10.46z"/>
                                </svg>
                                Apple
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="relative my-5">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-100"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white px-3 text-xs text-gray-400 uppercase tracking-widest font-semibold">
                                    hoặc đăng nhập với email
                                </span>
                            </div>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div className="group">
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Địa chỉ Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nguyenvana@example.com"
                                    autoComplete="email"
                                    disabled={isLoading}
                                    className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                                        Mật khẩu
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => onNavigate('forgot-password')}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Nhập mật khẩu..."
                                        autoComplete="current-password"
                                        disabled={isLoading}
                                        className="w-full h-12 px-4 pr-12 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all disabled:opacity-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    >
                                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember me */}
                            <div className="flex items-center gap-2.5">
                                <input
                                    id="rememberMe"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    disabled={isLoading}
                                    className="w-4 h-4 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                                />
                                <label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer select-none">
                                    Ghi nhớ đăng nhập trong 30 ngày
                                </label>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
                                        Đang đăng nhập...
                                    </>
                                ) : (
                                    <>
                                        <span>Đăng nhập</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Trust Footer */}
                        <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
                            Bằng việc đăng nhập, bạn đồng ý với{' '}
                            <a href="#" className="text-blue-600 font-semibold hover:underline">Điều khoản dịch vụ</a>
                            {' '}và{' '}
                            <a href="#" className="text-blue-600 font-semibold hover:underline">Chính sách bảo mật</a>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
