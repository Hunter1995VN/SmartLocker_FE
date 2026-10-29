/**
 * UC-A12: Đối soát tài chính định kỳ giữa cổng PayOS và cơ sở dữ liệu hệ thống
 * Kết nối với Backend endpoint /api/admin/reconciliation
 */
import client from './client';
import type { ApiResponse } from './adminDashboardService';

export interface PaymentReconciliationItemDto {
    paymentId: string;
    orderCode: string;
    bookingId: string;
    bookingCode: string;
    bookingStatus: string;
    customerName: string;
    customerEmail: string;
    stationName: string;
    kind: string; // BASE, EXTENSION, OVERDUE, REFUND
    amount: number;
    dbStatus: string; // PENDING, PAID, FAILED, EXPIRED, REFUNDED
    gateway: string;
    gatewayTxnId?: string | null;
    paidAt?: string | null;
    webhookReceivedAt?: string | null;
    expiresAt?: string | null;
    createdAt: string;
    reconciliationState: 'MATCHED_PAID' | 'PENDING_GATEWAY' | 'DISCREPANCY' | 'REFUNDED' | 'EXPIRED' | string;
}

export interface ReconciliationDashboardDto {
    totalTransactions: number;
    totalGrossRevenue: number;
    totalRefundedAmount: number;
    totalNetRevenue: number;
    totalPendingAmount: number;
    matchedCount: number;
    pendingSyncCount: number;
    discrepancyCount: number;
    refundedCount: number;
    lastReconciledAt?: string | null;
    items: PaymentReconciliationItemDto[];
}

export interface BatchReconciliationResultDto {
    checkedOrderCount: number;
    newlySyncedPaidCount: number;
    markedExpiredOrCancelledCount: number;
    stillPendingCount: number;
    newlyReconciledAmount: number;
    reconciledAt: string;
    syncedOrderCodes: string[];
    summaryMessage: string;
}

export interface GetReconciliationParams {
    search?: string;
    status?: string;
    kind?: string;
    fromDate?: string;
    toDate?: string;
}

const adminReconciliationService = {
    getReconciliationDashboard: async (
        params: GetReconciliationParams = {}
    ): Promise<ApiResponse<ReconciliationDashboardDto>> => {
        const res = await client.get<ApiResponse<ReconciliationDashboardDto>>(
            '/api/admin/reconciliation',
            { params }
        );
        return res.data;
    },

    runBatchReconciliation: async (): Promise<ApiResponse<BatchReconciliationResultDto>> => {
        const res = await client.post<ApiResponse<BatchReconciliationResultDto>>(
            '/api/admin/reconciliation/run'
        );
        return res.data;
    },

    reconcileSingleOrder: async (
        orderCode: string | number
    ): Promise<ApiResponse<PaymentReconciliationItemDto>> => {
        const res = await client.post<ApiResponse<PaymentReconciliationItemDto>>(
            `/api/admin/reconciliation/sync/${orderCode}`
        );
        return res.data;
    },
};

export default adminReconciliationService;
