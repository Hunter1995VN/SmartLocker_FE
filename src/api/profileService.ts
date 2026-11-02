import apiClient from './client';

export interface UserProfileDto {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    role: string;
    status: string;
    overdueDebt: number;
    hasOverdueDebt: boolean;
    overdueBookingsCount: number;
    hasPassword: boolean;
    googleLinked: boolean;
    createdAt: string;
    updatedAt: string;
    totalBookings: number;
    activeBookings: number;
}

export interface UpdateProfileRequest {
    fullName: string;
    phone: string;
    avatarUrl?: string;
}

export interface ChangePasswordRequest {
    currentPassword?: string;
    newPassword: string;
    confirmPassword: string;
}

export interface OverdueBookingDetailDto {
    bookingId: string;
    bookingCode: string;
    stationId: string;
    stationName: string;
    stationAddress: string;
    lockerCode: string;
    lockerSize: string;
    startAt: string;
    endAt: string;
    overdueSince?: string;
    overdueHours: number;
    overdueFeePerHour: number;
    estimatedOverdueFee: number;
    status: string;
}

export interface OverduePaymentHistoryDto {
    paymentId: string;
    orderCode: string;
    bookingId: string;
    bookingCode: string;
    amount: number;
    paidAt: string;
    gateway: string;
    status: string;
}

export interface UserOverdueDebtResponse {
    userId: string;
    fullName: string;
    accountOverdueDebt: number;
    activeBookingsOverdueFee: number;
    totalOverdueDebt: number;
    hasOverdueDebt: boolean;
    isBookingBlocked: boolean;
    statusMessage: string;
    overdueBookings: OverdueBookingDetailDto[];
    paymentHistory: OverduePaymentHistoryDto[];
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    errors: string[];
}

export const profileService = {
    /**
     * Lấy thông tin cá nhân và tổng quan tài khoản
     */
    async getProfile(): Promise<ApiResponse<UserProfileDto>> {
        const res = await apiClient.get<ApiResponse<UserProfileDto>>('/api/profile');
        return res.data;
    },

    /**
     * Cập nhật thông tin cá nhân (Họ tên, SĐT, Avatar)
     */
    async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse<UserProfileDto>> {
        const res = await apiClient.put<ApiResponse<UserProfileDto>>('/api/profile', data);
        return res.data;
    },

    /**
     * Đổi mật khẩu
     */
    async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<boolean>> {
        const res = await apiClient.post<ApiResponse<boolean>>('/api/profile/change-password', data);
        return res.data;
    },

    /**
     * Tra cứu chi tiết dư nợ quá hạn
     */
    async getOverdueDebt(): Promise<ApiResponse<UserOverdueDebtResponse>> {
        const res = await apiClient.get<ApiResponse<UserOverdueDebtResponse>>('/api/profile/overdue-debt');
        return res.data;
    },

    /**
     * Thanh toán phụ phí quá hạn trực tiếp qua PayOS
     */
    async payOverdueDebt(bookingId: string): Promise<any> {
        const res = await apiClient.post(`/api/profile/pay-overdue/${bookingId}`);
        return res.data;
    }
};

export default profileService;
