import apiClient from './client';

// === Types đồng bộ với Backend DTOs ===
export interface RegisterRequest {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    agreeTerms: boolean;
}

export interface VerifyOtpRequest {
    email: string;
    code: string;
    purpose: 'Register' | 'ForgotPassword';
}

export interface LoginRequest {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
}

export interface UserProfile {
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
}

export interface AuthResponse {
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
}

export interface OtpSentResponse {
    email: string;
    purpose: string;
    expiresAt: string;
    resendCountdown: number;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    code?: string;
    data?: T;
}

// === API Service cho Authentication ===
const authService = {
    /**
     * Đăng ký tài khoản - Bước 1: Tạo user + gửi OTP về email
     */
    async register(payload: RegisterRequest): Promise<ApiResponse<OtpSentResponse>> {
        const res = await apiClient.post('/api/auth/register', payload);
        return res.data;
    },

    /**
     * Verify OTP - Bước 2 đăng ký / xác minh tài khoản
     */
    async verifyOtp(payload: VerifyOtpRequest): Promise<ApiResponse<AuthResponse>> {
        const res = await apiClient.post('/api/auth/verify-otp', payload);
        return res.data;
    },

    /**
     * Resend OTP
     */
    async resendOtp(payload: { email: string; purpose: string }): Promise<ApiResponse<OtpSentResponse>> {
        const res = await apiClient.post('/api/auth/resend-otp', payload);
        return res.data;
    },

    /**
     * Đăng nhập
     */
    async login(payload: LoginRequest): Promise<ApiResponse<AuthResponse>> {
        const res = await apiClient.post('/api/auth/login', payload);
        return res.data;
    },

    /**
     * Quên mật khẩu - Gửi OTP về email
     */
    async forgotPassword(payload: ForgotPasswordRequest): Promise<ApiResponse<OtpSentResponse>> {
        const res = await apiClient.post('/api/auth/forgot-password', payload);
        return res.data;
    },

    /**
     * Reset mật khẩu (sau khi verify OTP)
     */
    async resetPassword(payload: ResetPasswordRequest): Promise<ApiResponse<AuthResponse>> {
        const res = await apiClient.post('/api/auth/reset-password', payload);
        return res.data;
    },

    /**
     * Đăng nhập bằng Google OAuth
     */
    async googleLogin(idToken: string): Promise<ApiResponse<AuthResponse>> {
        const res = await apiClient.post('/api/auth/google', { idToken });
        return res.data;
    },
};

export default authService;
