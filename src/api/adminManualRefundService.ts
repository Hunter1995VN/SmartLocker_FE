/**
 * AD-FE-11: UC-A11 — Phê duyệt Lệnh Hoàn tiền Thủ công cho các Trường hợp Ngoại lệ
 * Kết nối với AdminManualRefundsController (/api/admin/manual-refunds)
 */
import apiClient from './client';

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    errors?: string[];
}

export type ExceptionRefundCategory =
    | 'HARDWARE_LOCK_JAM'
    | 'STATION_OUTAGE'
    | 'DUPLICATE_OR_OVERCHARGE'
    | 'FORCE_MAJEURE_COMPLAINT';

export type ManualRefundStatus =
    | 'PENDING_APPROVAL'
    | 'APPROVED_PENDING_PAYOUT'
    | 'DISBURSED'
    | 'REJECTED';

export interface RefundCategoryStatDto {
    category: ExceptionRefundCategory | string;
    categoryLabel: string;
    count: number;
    totalAmount: number;
}

export interface ManualRefundItemDto {
    id: string;
    refundCode: string;
    bookingId: string;
    bookingCode: string;
    bookingStatus: string;
    paymentId: string;
    originalOrderCode: string;
    originalPaymentKind: string;
    stationName: string;
    lockerCode?: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;

    exceptionCategory: ExceptionRefundCategory | string;
    reasonSummary: string;
    evidenceNote?: string;
    relatedIncidentCode?: string;

    originalPaidAmount: number;
    previouslyRefundedAmount: number;
    requestedAmount: number;
    approvedAmount?: number;
    refundPercentOfPaid: number;

    refundMethod: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    gatewayTransferRef?: string;
    refundPaymentId?: string;

    cancelBookingAndReleaseLocker: boolean;
    waiveRelatedOverdueDebt: boolean;

    status: ManualRefundStatus | string;

    requestedByUserId: string;
    requestedByName: string;
    requestedByEmail: string;
    requestedByRole: string;
    requestedAt: string;

    reviewedByUserId?: string;
    reviewedByName?: string;
    reviewedByEmail?: string;
    reviewedAt?: string;
    adminDecisionNote?: string;

    disbursedAt?: string;
    disbursedByEmail?: string;
}

export interface ManualRefundOverviewDto {
    totalRequests: number;
    pendingApprovalCount: number;
    pendingApprovalAmount: number;
    approvedPendingPayoutCount: number;
    approvedPendingPayoutAmount: number;
    disbursedCount: number;
    totalDisbursedAmount: number;
    RejectedCount?: number;
    rejectedCount: number;
    averageRefundAmount: number;
    categoryBreakdown: RefundCategoryStatDto[];
    items: ManualRefundItemDto[];
}

export interface RefundablePaymentCandidateDto {
    paymentId: string;
    orderCode: string;
    paymentKind: string;
    paidAmount: number;
    paidAt?: string;
    bookingId: string;
    bookingCode: string;
    bookingStatus: string;
    stationName: string;
    lockerCode?: string;
    lockerSize: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerOverdueDebt: number;
    totalBookingPaidAmount: number;
    alreadyRefundedAmount: number;
    pendingRefundRequestedAmount: number;
    maxRefundableRemaining: number;
    suggestedIncidentCode?: string;
}

export interface CreateManualRefundRequest {
    paymentId: string;
    exceptionCategory: ExceptionRefundCategory | string;
    requestedAmount: number;
    reasonSummary: string;
    evidenceNote?: string;
    relatedIncidentCode?: string;
    refundMethod: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    cancelBookingAndReleaseLocker: boolean;
    waiveRelatedOverdueDebt: boolean;
    autoApproveAndDisburseNow: boolean;
    gatewayTransferRef?: string;
}

export interface ApproveManualRefundRequest {
    approvedAmount: number;
    adminDecisionNote: string;
    disburseImmediately: boolean;
    gatewayTransferRef?: string;
    cancelBookingAndReleaseLocker: boolean;
    waiveRelatedOverdueDebt: boolean;
}

export interface RejectManualRefundRequest {
    rejectionReason: string;
}

export interface ConfirmManualRefundDisbursementRequest {
    gatewayTransferRef: string;
    note?: string;
}

export const adminManualRefundService = {
    async getOverview(params?: {
        status?: string;
        category?: string;
        search?: string;
    }): Promise<ApiResponse<ManualRefundOverviewDto>> {
        const query = new URLSearchParams();
        if (params?.status && params.status !== 'ALL') query.set('status', params.status);
        if (params?.category && params.category !== 'ALL') query.set('category', params.category);
        if (params?.search?.trim()) query.set('search', params.search.trim());
        const url = `/api/admin/manual-refunds/overview${
            query.toString() ? `?${query.toString()}` : ''
        }`;
        const res = await apiClient.get<ApiResponse<ManualRefundOverviewDto>>(url);
        return res.data;
    },

    async getCandidates(search?: string): Promise<ApiResponse<RefundablePaymentCandidateDto[]>> {
        const query = new URLSearchParams();
        if (search?.trim()) query.set('search', search.trim());
        const url = `/api/admin/manual-refunds/candidates${
            query.toString() ? `?${query.toString()}` : ''
        }`;
        const res = await apiClient.get<ApiResponse<RefundablePaymentCandidateDto[]>>(url);
        return res.data;
    },

    async createRequest(body: CreateManualRefundRequest): Promise<ApiResponse<ManualRefundItemDto>> {
        const res = await apiClient.post<ApiResponse<ManualRefundItemDto>>(
            '/api/admin/manual-refunds',
            body
        );
        return res.data;
    },

    async approveRequest(
        refundId: string,
        body: ApproveManualRefundRequest
    ): Promise<ApiResponse<ManualRefundItemDto>> {
        const res = await apiClient.post<ApiResponse<ManualRefundItemDto>>(
            `/api/admin/manual-refunds/${encodeURIComponent(refundId)}/approve`,
            body
        );
        return res.data;
    },

    async rejectRequest(
        refundId: string,
        body: RejectManualRefundRequest
    ): Promise<ApiResponse<ManualRefundItemDto>> {
        const res = await apiClient.post<ApiResponse<ManualRefundItemDto>>(
            `/api/admin/manual-refunds/${encodeURIComponent(refundId)}/reject`,
            body
        );
        return res.data;
    },

    async confirmDisbursement(
        refundId: string,
        body: ConfirmManualRefundDisbursementRequest
    ): Promise<ApiResponse<ManualRefundItemDto>> {
        const res = await apiClient.post<ApiResponse<ManualRefundItemDto>>(
            `/api/admin/manual-refunds/${encodeURIComponent(refundId)}/disburse`,
            body
        );
        return res.data;
    },
};

export default adminManualRefundService;
