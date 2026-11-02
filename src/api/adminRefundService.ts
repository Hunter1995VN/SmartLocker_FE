import apiClient from './client';
import type { ApiResponse } from './bookingService';

export interface AdminRefundDto {
  paymentId: string;
  bookingId: string;
  bookingCode: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhoneNumber: string;
  stationName: string;
  lockerCode: string;
  originalAmount: number;
  refundAmount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  orderCode: string;
  cancellationReason?: string;
  cancelPolicyRate?: number;
  requestedAt: string;
  processedAt?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const adminRefundService = {
  getRefundRequests: async (status?: string, page: number = 1, pageSize: number = 20) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    const response = await apiClient.get<ApiResponse<PagedResult<AdminRefundDto>>>(
      `/api/admin/refunds?${params.toString()}`
    );
    return response.data;
  },

  approveRefund: async (paymentId: string, note?: string) => {
    const response = await apiClient.post<ApiResponse<AdminRefundDto>>(
      `/api/admin/refunds/${paymentId}/approve`,
      { note }
    );
    return response.data;
  },

  rejectRefund: async (paymentId: string, note?: string) => {
    const response = await apiClient.post<ApiResponse<AdminRefundDto>>(
      `/api/admin/refunds/${paymentId}/reject`,
      { note }
    );
    return response.data;
  },
};

export default adminRefundService;

