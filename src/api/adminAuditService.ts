/**
 * UC-A08: Tra cứu nhật ký truy vết an ninh toàn hệ thống (Audit Logs)
 * Kết nối với Backend endpoint GET /api/admin/audit-logs
 */
import client from './client';
import type { ApiResponse } from './adminDashboardService';

export interface AuditLogItemDto {
    id: number;
    userId?: string | null;
    userName: string;
    userEmail: string;
    userRole: string;
    action: string;
    targetEntity: string;
    targetId?: string | null;
    details?: string | null;
    ipAddress?: string | null;
    createdAt: string;
}

export interface AuditLogQueryResponse {
    totalCount: number;
    emergencyUnlockCount: number;
    policyAndStationChangeCount: number;
    userAndSecurityCount: number;
    abandonedPropertyCount: number;
    page: number;
    pageSize: number;
    items: AuditLogItemDto[];
}

export interface GetAuditLogsParams {
    search?: string;
    action?: string;
    targetEntity?: string;
    role?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
}

const adminAuditService = {
    getAuditLogs: async (params: GetAuditLogsParams = {}): Promise<ApiResponse<AuditLogQueryResponse>> => {
        const res = await client.get<ApiResponse<AuditLogQueryResponse>>('/api/admin/audit-logs', {
            params,
        });
        return res.data;
    },
};

export default adminAuditService;
