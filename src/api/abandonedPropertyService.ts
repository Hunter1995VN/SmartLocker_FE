/**
 * AD-FE-07: UC-S10, UC-S11, UC-A07 (UC-A09, S-03) — Process Abandoned Property (Four-Eyes Principle)
 * API service cho phân hệ kiểm kê tài sản bỏ quên quá hạn 72h, bàn giao trả lại khách & thanh lý.
 *
 * Endpoints (đã tồn tại trong Backend):
 *  GET  /api/admin/abandoned-properties                    — Danh sách biên bản (filter by status)
 *  GET  /api/admin/abandoned-properties/overdue-candidates — Danh sách đơn đặt quá hạn 72h chờ lập biên bản (UC-S10)
 *  POST /api/admin/abandoned-properties                    — Mắt 1: Staff lập biên bản (UC-S10)
 *  POST /api/admin/abandoned-properties/{id}/approve       — Mắt 2: Admin phê duyệt (UC-A07)
 *  POST /api/admin/abandoned-properties/{id}/reject        — Mắt 2: Admin từ chối biên bản (UC-A07)
 *  POST /api/admin/abandoned-properties/{id}/resolve       — Hoàn tất xử lý / Bàn giao lại khách (UC-S11 & UC-A07)
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
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    overdueDebt?: number | null;
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

/** Ứng viên đơn đặt tủ quá hạn 72h chờ kiểm kê (UC-S10) */
export interface OverdueBookingCandidateDto {
    bookingId: string;
    bookingCode: string;
    lockerId: string;
    lockerCode: string;
    stationId: string;
    stationName: string;
    customerName?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    overdueDebt?: number;
    overdueHours: number;
    endAt: string;
}

/** Request: Mắt 1 — Staff lập biên bản (UC-S10) */
export interface CreateAbandonedPropertyRequest {
    bookingId: string;
    lockerId: string;
    stationId: string;
    overdueHours: number;
    itemDescription: string;
    photoUrls?: string[] | null;
    notes?: string | null;
}

/** Request: Mắt 2 — Admin phê duyệt (UC-A07) */
export interface ApproveAbandonedPropertyRequest {
    action: 'STORED_IN_WAREHOUSE' | 'LIQUIDATED' | 'RETURNED_TO_OWNER';
    approvalNotes?: string | null;
}

/** Request: Hoàn tất xử lý / Thủ tục bàn giao lại cho khách (UC-S11 & UC-A07) */
export interface ResolveAbandonedPropertyRequest {
    disposalAction: string;
    notes?: string | null;
    receiverName?: string | null;
    receiverIdNumber?: string | null;
    handoverProofUrl?: string | null;
    collectOverdueDebt?: boolean;
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
     * Lấy danh sách đơn đặt quá hạn 72h chờ lập biên bản kiểm kê (UC-S10).
     * GET /api/admin/abandoned-properties/overdue-candidates
     */
    async getOverdueCandidates(): Promise<ApiResponse<OverdueBookingCandidateDto[]>> {
        const res = await apiClient.get<ApiResponse<OverdueBookingCandidateDto[]>>(
            '/api/admin/abandoned-properties/overdue-candidates'
        );
        return res.data;
    },

    /**
     * Mắt 1: Staff lập biên bản kiểm kê tài sản bỏ quên quá hạn 72h (UC-S10).
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
     * Mắt 2: Admin phê duyệt biên bản (Four-Eyes Principle - UC-A07).
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
     * Mắt 2: Admin từ chối biên bản kiểm kê để KTV kiểm tra/chụp lại (UC-A07).
     * POST /api/admin/abandoned-properties/{recordId}/reject
     */
    async rejectRecord(
        recordId: string,
        reason: string
    ): Promise<ApiResponse<boolean>> {
        const res = await apiClient.post<ApiResponse<boolean>>(
            `/api/admin/abandoned-properties/${recordId}/reject`,
            { reason }
        );
        return res.data;
    },

    /**
     * Hoàn tất xử lý sau khi Admin đã duyệt hoặc bàn giao trả lại đồ cho khách (UC-S11 & UC-A07).
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
