/**
 * AD-FE-06: UC-T14 → A08, S-02 — Emergency Locker Access Support
 * API service cho phân hệ Emergency Incident & Remote Unlock.
 *
 * Endpoints:
 *  GET  /api/admin/incidents                          — Danh sách sự cố
 *  POST /api/admin/incidents/{incidentId}/remote-unlock — Mở tủ từ xa theo sự cố
 */
import apiClient from './client';

// ─── Response wrapper (đồng bộ với Backend ApiResponse<T>) ──────────────────

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    code?: string;
    data: T;
    errors?: string[];
}

// ─── DTOs (đồng bộ 1:1 với AdminIncidentDtos.cs trong Backend) ───────────────

/** Chi tiết sự cố vận hành / tủ cần xử lý */
export interface IncidentDetailDto {
    id: string;
    incidentCode: string;
    bookingId?: string;
    bookingCode?: string;
    lockerId: string;
    lockerCode: string;
    stationId: string;
    stationName: string;
    reportedBy: string;
    type: string;
    status: string;
    severity: string;
    description: string;
    resolutionNote?: string;
    resolvedBy?: string;
    resolvedAt?: string;
    remoteUnlocked: boolean;
    createdAt: string;
}

/** Request body khi gọi Remote Unlock */
export interface RemoteUnlockRequest {
    reason: string;
}

/** Kết quả Remote Unlock trả về từ Backend */
export interface RemoteUnlockResultDto {
    success: boolean;
    message: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const adminIncidentService = {
    /**
     * Lấy danh sách sự cố (filter theo status và/hoặc severity).
     * GET /api/admin/incidents?status=...&severity=...
     */
    async getIncidents(
        status?: string,
        severity?: string
    ): Promise<ApiResponse<IncidentDetailDto[]>> {
        const params = new URLSearchParams();
        if (status && status.trim()) params.append('status', status.trim());
        if (severity && severity.trim()) params.append('severity', severity.trim());
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await apiClient.get<ApiResponse<IncidentDetailDto[]>>(
            `/api/admin/incidents${query}`
        );
        return res.data;
    },

    /**
     * Gửi lệnh mở khóa tủ từ xa theo sự cố.
     * POST /api/admin/incidents/{incidentId}/remote-unlock
     * Body: { reason: string }
     *
     * Backend trả về ApiResponse<bool> với success=true khi lệnh được chấp nhận.
     * Backend sẽ cập nhật incident.Status → RESOLVED và incident.RemoteUnlocked → true.
     */
    async remoteUnlockByIncident(
        incidentId: string,
        body: RemoteUnlockRequest
    ): Promise<ApiResponse<boolean>> {
        const res = await apiClient.post<ApiResponse<boolean>>(
            `/api/admin/incidents/${incidentId}/remote-unlock`,
            body
        );
        return res.data;
    },
};

export default adminIncidentService;
