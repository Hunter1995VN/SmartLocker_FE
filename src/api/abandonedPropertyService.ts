/**
 * AD-FE-07: UC-A09, S-03 — Process Abandoned Property (Four-Eyes Principle)
 * API service cho phân hệ kiểm kê tài sản bỏ quên quá hạn.
 *
 * Endpoints (đã tồn tại trong Backend):
 *  GET  /api/admin/abandoned-properties          — Danh sách biên bản (filter by status)
 *  POST /api/admin/abandoned-properties          — Mắt 1: Staff lập biên bản
 *  POST /api/admin/abandoned-properties/{id}/approve — Mắt 2: Admin phê duyệt
 *  POST /api/admin/abandoned-properties/{id}/resolve — Hoàn tất xử lý
 *
 * Status enum (từ AbandonedPropertyStatus.cs):
 *  REPORTED | PENDING_APPROVAL | APPROVED | DISPOSED | RETURNED
 *
 * Four-Eyes rule enforcement:
 *  - Backend từ chối nếu Staff tự duyệt.
 *  - Backend chỉ cho phép ADMIN role dùng /approve.
 *  - Frontend chỉ ẩn/hiện nút — không bypass backend.
 */
import apiClient from './client';

// ─── Response wrapper ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    code?: string;
    data: T;
    errors?: string[];
}

// ─── DTOs (1:1 với AdminAbandonedPropertyDtos.cs) ────────────────────────────

/** Biên bản kiểm kê tài sản bỏ quên */
export interface AbandonedPropertyRecordDto {
    id: string;
    recordCode: string;
    bookingId: string;
    bookingCode: string;
    lockerId: string;
    lockerCode: string;
    stationId: string;
    stationName: string;
    overdueHours: number;
    itemDescription: string;
    photos?: string[] | null;
    staffWitnessName: string;
    adminApprovalName?: string | null;
    status: string; // REPORTED | PENDING_APPROVAL | APPROVED | DISPOSED | RETURNED
    disposalAction?: string | null; // STORED_IN_WAREHOUSE | LIQUIDATED | RETURNED_TO_OWNER
    notes?: string | null;
    reportedAt: string;
    approvedAt?: string | null;
    resolvedAt?: string | null;
}

/** Request: Mắt 1 — Staff lập biên bản */
export interface CreateAbandonedPropertyRequest {
    bookingId: string;
    lockerId: string;
    stationId: string;
    overdueHours: number;
    itemDescription: string;
    photoUrls?: string[] | null;
    notes?: string | null;
}

/** Request: Mắt 2 — Admin phê duyệt */
export interface ApproveAbandonedPropertyRequest {
    action: 'STORED_IN_WAREHOUSE' | 'LIQUIDATED' | 'RETURNED_TO_OWNER';
    approvalNotes?: string | null;
}

/** Request: Hoàn tất xử lý (sau approve) */
export interface ResolveAbandonedPropertyRequest {
    disposalAction: string;
    notes?: string | null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const abandonedPropertyService = {
    /**
     * Lấy danh sách biên bản tài sản bỏ quên.
     * GET /api/admin/abandoned-properties?status=...
     */
    async getRecords(status?: string): Promise<ApiResponse<AbandonedPropertyRecordDto[]>> {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        const res = await apiClient.get<ApiResponse<AbandonedPropertyRecordDto[]>>(
            `/api/admin/abandoned-properties${query}`
        );
        return res.data;
    },

    /**
     * Mắt 1: Staff lập biên bản kiểm kê tài sản bỏ quên.
     * POST /api/admin/abandoned-properties
     * Yêu cầu: role ADMIN hoặc STAFF.
     */
    async createRecord(
        body: CreateAbandonedPropertyRequest
    ): Promise<ApiResponse<AbandonedPropertyRecordDto>> {
        const res = await apiClient.post<ApiResponse<AbandonedPropertyRecordDto>>(
            '/api/admin/abandoned-properties',
            body
        );
        return res.data;
    },

    /**
     * Mắt 2: Admin phê duyệt biên bản (Four-Eyes Principle).
     * POST /api/admin/abandoned-properties/{recordId}/approve
     * Yêu cầu: role ADMIN. Backend sẽ từ chối nếu là Staff hoặc tự duyệt.
     */
    async approveRecord(
        recordId: string,
        body: ApproveAbandonedPropertyRequest
    ): Promise<ApiResponse<boolean>> {
        const res = await apiClient.post<ApiResponse<boolean>>(
            `/api/admin/abandoned-properties/${recordId}/approve`,
            body
        );
        return res.data;
    },

    /**
     * Hoàn tất xử lý sau khi Admin đã duyệt.
     * POST /api/admin/abandoned-properties/{recordId}/resolve
     */
    async resolveRecord(
        recordId: string,
        body: ResolveAbandonedPropertyRequest
    ): Promise<ApiResponse<boolean>> {
        const res = await apiClient.post<ApiResponse<boolean>>(
            `/api/admin/abandoned-properties/${recordId}/resolve`,
            body
        );
        return res.data;
    },
};

export default abandonedPropertyService;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Status enum values từ Backend AbandonedPropertyStatus.cs */
export const ABANDONED_STATUS = {
    REPORTED: 'REPORTED',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    APPROVED: 'APPROVED',
    DISPOSED: 'DISPOSED',
    RETURNED: 'RETURNED',
} as const;

/** Disposal action options */
export const DISPOSAL_ACTIONS = [
    { value: 'STORED_IN_WAREHOUSE', label: 'Lưu kho' },
    { value: 'LIQUIDATED', label: 'Thanh lý' },
    { value: 'RETURNED_TO_OWNER', label: 'Trả lại khách' },
] as const;
