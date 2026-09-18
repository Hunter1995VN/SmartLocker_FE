import { useState, useEffect, useRef } from 'react';
import { Mail, ArrowRight, AlertCircle, CheckCircle, ChevronLeft, ArrowLeft } from 'lucide-react';
import { tokenStore } from '../../api/client';

type ViewMode = 'login' | 'register' | 'verify-otp' | 'forgot-password';

interface VerifyOtpPageProps {
    onNavigate: (mode: ViewMode, data?: { email?: string }) => void;
    email: string;
}

/**
 * Trang xác thực OTP sau khi đăng ký.
 * Nhập 6 số OTP, tự động chuyển ô khi nhập xong.
 * Đếm ngược 5 phút + cho phép gửi lại sau 60s.
 */
export default function VerifyOtpPage({ onNavigate, email }: VerifyOtpPageProps) {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(300); // 5 phút
    const [resendCountdown, setResendCountdown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown 5 phút
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => setCountdown(c => c - 1), 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    // Resend countdown 60s
    useEffect(() => {
        if (resendCountdown <= 0) return;
        const timer = setInterval(() => setResendCountdown(c => c - 1), 1000);
        return () => clearInterval(timer);
    }, [resendCountdown]);

    const formatCountdown = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleInputChange = (index: number, value: string) => {
        // Chỉ nhận số
        const digit = value.replace(/\D/g, '').slice(-1);
        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);
        setError('');

        // Tự động chuyển ô tiếp theo
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Tự động submit khi nhập đủ 6 số
        if (digit && index === 5) {
            const fullCode = newCode.join('');
            if (fullCode.length === 6) {
                setTimeout(() => handleVerify(fullCode), 100);
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setCode(pasted.split(''));
            setTimeout(() => handleVerify(pasted), 100);
        }
    };

    const handleVerify = async (fullCode?: string) => {
        const verifyCode = fullCode || code.join('');
        if (verifyCode.length < 6) {
            setError('Vui lòng nhập đủ 6 số mã OTP');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            const { default: authService } = await import('../../api/authService');
            const response = await authService.verifyOtp({ email, code: verifyCode, purpose: 'Register' });
            if (response.success && response.data) {
                setSuccess(true);
                tokenStore.set(response.data.accessToken, response.data.refreshToken);
                localStorage.setItem('smartlocker_user', JSON.stringify(response.data));
                // Redirect về home sau 2 giây
                setTimeout(() => { window.location.href = '/'; }, 2000);
            } else {
                setError(response.message || 'Mã OTP không chính xác. Vui lòng thử lại.');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr.response?.data?.message || 'Không thể kết nối tới máy chủ');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCountdown > 0) return;
        try {
            const { default: authService } = await import('../../api/authService');
            await authService.resendOtp({ email, purpose: 'Register' });
            setCountdown(300);
            setResendCountdown(60);
            setCode(['', '', '', '', '', '']);
            setError('');
            inputRefs.current[0]?.focus();
        } catch {
            setError('Không thể gửi lại mã OTP. Vui lòng thử sau.');
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest px-4">
                <div className="text-center max-w-md w-full">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-on-surface mb-3">Xác thực thành công!</h2>
                    <p className="text-secondary mb-6">Tài khoản của bạn đã được kích hoạt. Đang chuyển về trang chủ...</p>
                    <div className="flex justify-center">
                        <a href="/" className="px-6 py-3 bg-primary-container text-white rounded-xl font-bold">
                            Về trang chủ
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest px-4 py-8">
            <div className="w-full max-w-md">
                {/* Back button */}
                <button
                    onClick={() => onNavigate('register')}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-secondary hover:text-primary mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại đăng ký
                </button>

                {/* Card */}
                <div className="bg-white rounded-3xl border border-outline-variant/40 shadow-elevation-2 p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-primary-container/10 flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-on-surface mb-2">Xác thực Email</h2>
                        <p className="text-sm text-secondary">
                            Mã OTP đã được gửi tới{' '}
                            <strong className="text-on-surface">{email}</strong>
                        </p>
                    </div>

                    {/* Countdown */}
                    <div className="text-center mb-6">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                            countdown <= 60 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-surface-container-low text-secondary'
                        }`}>
                            ⏱ Mã có hiệu lực trong: <strong className="font-mono">{formatCountdown(countdown)}</strong>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    )}

                    {/* OTP Input Grid */}
                    <div className="mb-8" onPaste={handlePaste}>
                        <div className="grid grid-cols-6 gap-2">
                            {code.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => { inputRefs.current[index] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleInputChange(index, e.target.value)}
                                    onKeyDown={e => handleKeyDown(index, e)}
                                    disabled={isLoading}
                                    className={`w-full aspect-square text-center text-2xl font-bold rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-container/30 ${
                                        digit
                                            ? 'border-primary-container bg-primary-container/5 text-primary shadow-elevation-1'
                                            : 'border-outline-variant/60 bg-white text-on-surface hover:border-primary/40'
                                    } ${isLoading ? 'opacity-50' : ''}`}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-secondary text-center mt-3">
                            Dán trực tiếp hoặc nhập từng số. Mã gồm 6 chữ số.
                        </p>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={() => handleVerify()}
                        disabled={isLoading || code.join('').length < 6}
                        className="w-full h-12 bg-primary-container hover:bg-primary active:scale-[0.99] text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-elevation-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"></path>
                                </svg>
                                Đang xác thực...
                            </>
                        ) : (
                            <>
                                <span>Xác thực mã OTP</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    {/* Resend */}
                    <div className="mt-6 text-center">
                        {resendCountdown > 0 ? (
                            <p className="text-sm text-secondary">
                                Gửi lại mã sau <strong className="text-on-surface font-mono">{resendCountdown}s</strong>
                            </p>
                        ) : (
                            <button
                                onClick={handleResend}
                                className="text-sm font-bold text-primary hover:underline"
                            >
                                Gửi lại mã OTP
                            </button>
                        )}
                        <p className="text-xs text-secondary mt-2">
                            Không nhận được email? Kiểm tra hộp thư rác (Spam).
                        </p>
                    </div>
                </div>

                {/* Help */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-secondary">
                        Gặp vấn đề?{' '}
                        <a href="tel:19001234" className="text-primary font-semibold hover:underline">
                            Gọi 1900 1234
                        </a>
                        {' '}(24/7)
                    </p>
                </div>
            </div>
        </div>
    );
}
