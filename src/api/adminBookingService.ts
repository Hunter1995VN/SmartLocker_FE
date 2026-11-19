import apiClient from './client';

export interface AdminBookingListItemDto {
    id: string;
    bookingCode: string;
    status: string;
    size: string;
    baseAmount: number;
    paidAmount: number;
    isOverdue: boolean;
    overdueSince?: string | null;
    extensionCount: number;
    startAt: string;
    endAt: string;
    checkedInAt?: string | null;
    checkedOutAt?: string | null;
    createdAt: string;
    userId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string | null;
    stationId: string;
    stationName: string;
    lockerId?: string | null;
    lockerCode?: string | null;
}

export interface AdminBookingStatsDto {
    totalBookings: number;
    pendingPaymentCount: number;
    confirmedCount: number;
    storedCount: number;
    completedCount: number;
    cancelledCount: number;
    overdueCount: number;
    totalRevenue: number;
}

export interface AdminBookingPaymentDto {
    id: string;
    kind: string;
    status: string;
    amount: number;
    orderCode: string;
    gateway?: string | null;
    paidAt?: string | null;
    createdAt: string;
}

export interface AdminBookingExtensionDto {
    id: string;
    oldEndAt: string;
    newEndAt: string;
    extendedAt: string;
}

export interface AdminBookingDetailDto extends AdminBookingListItemDto {
    cancellationReason?: string | null;
    accessCode?: string | null;
    payments: AdminBookingPaymentDto[];
    extensions: AdminBookingExtensionDto[];
}

export interface PagedAdminBookingsResponse {
    items: AdminBookingListItemDto[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    errors?: string[];
}

const adminBookingService = {
    async getBookings(params: {
        search?: string;
        status?: string;
        stationId?: string;
        isOverdue?: boolean;
        fromDate?: string;
        toDate?: string;
        page?: number;
        pageSize?: number;
    }): Promise<PagedAdminBookingsResponse> {
        const res = await apiClient.get<ApiResponse<PagedAdminBookingsResponse>>('/admin/bookings', { params });
        if (!res.data.success) throw new Error(res.data.message || 'Không thể tải danh sách đơn hàng');
        return res.data.data;
    },

    async getStats(stationId?: string): Promise<AdminBookingStatsDto> {
        const res = await apiClient.get<ApiResponse<AdminBookingStatsDto>>('/admin/bookings/stats', {
            params: stationId ? { stationId } : undefined,
        });
        if (!res.data.success) throw new Error(res.data.message || 'Không thể tải thống kê đơn hàng');
        return res.data.data;
    },

    async getDetail(id: string): Promise<AdminBookingDetailDto> {
        const res = await apiClient.get<ApiResponse<AdminBookingDetailDto>>(`/admin/bookings/${id}`);
        if (!res.data.success) throw new Error(res.data.message || 'Không tìm thấy đơn hàng');
        return res.data.data;
    },

    async cancelBooking(id: string, reason: string): Promise<AdminBookingDetailDto> {
        const res = await apiClient.post<ApiResponse<AdminBookingDetailDto>>(`/admin/bookings/${id}/cancel`, { reason });
        if (!res.data.success) throw new Error(res.data.message || 'Không thể hủy đơn hàng');
        return res.data.data;
    },

    async forceCompleteBooking(id: string, note?: string): Promise<AdminBookingDetailDto> {
        const res = await apiClient.post<ApiResponse<AdminBookingDetailDto>>(`/admin/bookings/${id}/force-complete`, { note });
        if (!res.data.success) throw new Error(res.data.message || 'Không thể hoàn tất đơn hàng');
        return res.data.data;
    },
};

export default adminBookingService;
