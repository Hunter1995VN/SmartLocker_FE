/**
 * AD-FE-05: UC-A05 & UC-A06 — Manage Internal Accounts, RBAC & Overdue Debt Control
 * API Service kết nối với Backend ASP.NET Core:
 * AdminUsersController (/api/admin/users)
 *
 * Endpoints thực tế từ Backend:
 * - GET    /api/admin/users                          : Lấy danh sách users (filter: search, role, status, hasDebt, page, pageSize)
 * - GET    /api/admin/users/internal                 : Lấy danh sách tài khoản nội bộ Admin/Staff kèm thống kê hoạt động (UC-A05)
 * - GET    /api/admin/users/rbac-summary             : Ma trận phân quyền RBAC, tổng quan vai trò & nhật ký phân quyền (UC-A05)
 * - POST   /api/admin/users/staff                    : Tạo tài khoản nội bộ (Admin / Staff) mới (UC-A05)
 * - PUT    /api/admin/users/{userId}                 : Cập nhật hồ sơ tài khoản nội bộ (Họ tên, Email, SĐT, Vai trò) (UC-A05)
 * - POST   /api/admin/users/{userId}/reset-password  : Đặt lại mật khẩu cho tài khoản nội bộ (UC-A05)
 * - DELETE /api/admin/users/{userId}                 : Vô hiệu hóa / thu hồi tài khoản nội bộ (Soft Delete -> DELETED) (UC-A05)
 * - PATCH  /api/admin/users/{userId}/status          : Kích hoạt / Tạm khóa tài khoản (UC-A05 & UC-A06)
 * - PATCH  /api/admin/users/{userId}/role            : Thay đổi phân quyền vai trò RBAC (UC-A05)
 * - PATCH  /api/admin/users/{userId}/debt            : Cập nhật dư nợ quá hạn & tự động chặn nợ xấu (UC-A06)
 * - POST   /api/admin/users/block-debtors            : Chặn hàng loạt tất cả tài khoản đang có nợ xấu (UC-A06)
 */
import apiClient from './client';

// ─── DTO Interfaces (đồng bộ 1:1 với Backend C# DTOs) ───────────────────────

export type UserRole = 'ADMIN' | 'STAFF' | 'TRAVELER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'DELETED';

export interface UserAdminListItemDto {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    overdueDebt: number;
    avatarUrl?: string;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string;
    lastLoginAt?: string;
    actionsCount?: number;
}

export interface GetUsersParams {
    search?: string;
    role?: string;
    status?: string;
    hasDebt?: boolean;
    page?: number;
    pageSize?: number;
}

export interface GetInternalUsersParams {
    search?: string;
    role?: string;
    status?: string;
}

export interface CreateStaffRequest {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
}

export interface UpdateInternalUserRequest {
    fullName: string;
    email: string;
    phone: string;
    role?: UserRole;
    reason?: string;
}

export interface ResetInternalPasswordRequest {
    newPassword: string;
    reason?: string;
}

export interface UpdateUserStatusRequest {
    status: UserStatus;
    reason?: string;
}

export interface UpdateUserRoleRequest {
    role: UserRole;
    reason?: string;
}

export interface UpdateUserDebtRequest {
    overdueDebt: number;
    reason?: string;
    autoSuspendIfDebt?: boolean;
}

export interface RbacPermissionItemDto {
    code: string;
    module: string;
    name: string;
    description: string;
    adminAllowed: boolean;
    staffAllowed: boolean;
    travelerAllowed: boolean;
    staffScopeNote: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
}

export interface RbacRoleOverviewDto {
    role: string;
    displayName: string;
    subtitle: string;
    description: string;
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    keyPermissions: string[];
    restrictions: string[];
}

export interface RbacAuditLogItemDto {
    id: number;
    userId?: string;
    userName: string;
    userEmail: string;
    userRole: string;
    action: string;
    targetEntity: string;
    targetId?: string;
    details?: string;
    ipAddress?: string;
    createdAt: string;
}

export interface RbacSummaryResponseDto {
    totalInternalAccounts: number;
    totalAdmins: number;
    activeAdmins: number;
    totalStaff: number;
    activeStaff: number;
    suspendedInternalAccounts: number;
    deactivatedInternalAccounts: number;
    totalTravelers: number;
    roles: RbacRoleOverviewDto[];
    permissionMatrix: RbacPermissionItemDto[];
    recentRbacLogs: RbacAuditLogItemDto[];
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    errors?: string[];
}

// ─── API Service Implementation ─────────────────────────────────────────────

export const adminUserService = {
    /**
     * Lấy danh sách tài khoản (hỗ trợ search, lọc theo role, status, hasDebt, phân trang)
     * GET /api/admin/users
     */
    async getUsers(params: GetUsersParams = {}): Promise<ApiResponse<UserAdminListItemDto[]>> {
        const query = new URLSearchParams();
        if (params.search?.trim()) query.set('search', params.search.trim());
        if (params.role?.trim()) query.set('role', params.role.trim());
        if (params.status?.trim()) query.set('status', params.status.trim());
        if (params.hasDebt !== undefined) query.set('hasDebt', String(params.hasDebt));
        if (params.page && params.page > 0) query.set('page', params.page.toString());
        if (params.pageSize && params.pageSize > 0) query.set('pageSize', params.pageSize.toString());

        const url = `/api/admin/users${query.toString() ? `?${query.toString()}` : ''}`;
        const response = await apiClient.get<ApiResponse<UserAdminListItemDto[]>>(url);
        return response.data;
    },

    /**
     * UC-A05: Lấy danh sách tài khoản nhân sự nội bộ (ADMIN & STAFF) kèm thống kê phiên đăng nhập và thao tác
     * GET /api/admin/users/internal
     */
    async getInternalUsers(params: GetInternalUsersParams = {}): Promise<ApiResponse<UserAdminListItemDto[]>> {
        const query = new URLSearchParams();
        if (params.search?.trim()) query.set('search', params.search.trim());
        if (params.role?.trim() && params.role.toUpperCase() !== 'ALL') query.set('role', params.role.trim());
        if (params.status?.trim() && params.status.toUpperCase() !== 'ALL') query.set('status', params.status.trim());

        const url = `/api/admin/users/internal${query.toString() ? `?${query.toString()}` : ''}`;
        const response = await apiClient.get<ApiResponse<UserAdminListItemDto[]>>(url);
        return response.data;
    },

    /**
     * UC-A05: Lấy tổng quan phân quyền RBAC, Ma trận quyền hạn 3 vai trò & Nhật ký thay đổi phân quyền
     * GET /api/admin/users/rbac-summary
     */
    async getRbacSummary(): Promise<ApiResponse<RbacSummaryResponseDto>> {
        const response = await apiClient.get<ApiResponse<RbacSummaryResponseDto>>('/api/admin/users/rbac-summary');
        return response.data;
    },

    /**
     * UC-A05: Tạo tài khoản nội bộ (Admin / Staff) mới
     * POST /api/admin/users/staff
     */
    async createStaff(request: CreateStaffRequest): Promise<ApiResponse<UserAdminListItemDto>> {
        const response = await apiClient.post<ApiResponse<UserAdminListItemDto>>('/api/admin/users/staff', request);
        return response.data;
    },

    /**
     * UC-A05: Cập nhật hồ sơ tài khoản nội bộ (Họ tên, Email, Số điện thoại, Vai trò)
     * PUT /api/admin/users/{userId}
     */
    async updateInternalUser(
        userId: string,
        request: UpdateInternalUserRequest
    ): Promise<ApiResponse<UserAdminListItemDto>> {
        const response = await apiClient.put<ApiResponse<UserAdminListItemDto>>(
            `/api/admin/users/${userId}`,
            request
        );
        return response.data;
    },

    /**
     * UC-A05: Cấp lại / Đặt lại mật khẩu cho tài khoản nội bộ
     * POST /api/admin/users/{userId}/reset-password
     */
    async resetInternalPassword(
        userId: string,
        request: ResetInternalPasswordRequest
    ): Promise<ApiResponse<boolean>> {
        const response = await apiClient.post<ApiResponse<boolean>>(
            `/api/admin/users/${userId}/reset-password`,
            request
        );
        return response.data;
    },

    /**
     * UC-A05: Vô hiệu hóa / Thu hồi tài khoản nội bộ (Soft Delete -> DELETED)
     * DELETE /api/admin/users/{userId}
     */
    async deactivateInternalUser(userId: string, reason?: string): Promise<ApiResponse<boolean>> {
        const query = new URLSearchParams();
        if (reason?.trim()) query.set('reason', reason.trim());
        const url = `/api/admin/users/${userId}${query.toString() ? `?${query.toString()}` : ''}`;
        const response = await apiClient.delete<ApiResponse<boolean>>(url);
        return response.data;
    },

    /**
     * Cập nhật trạng thái tài khoản (Kích hoạt, Tạm khóa)
     * PATCH /api/admin/users/{userId}/status
     */
    async updateUserStatus(userId: string, request: UpdateUserStatusRequest): Promise<ApiResponse<boolean>> {
        const response = await apiClient.patch<ApiResponse<boolean>>(`/api/admin/users/${userId}/status`, request);
        return response.data;
    },

    /**
     * Thay đổi vai trò / phân quyền người dùng
     * PATCH /api/admin/users/{userId}/role
     */
    async updateUserRole(userId: string, request: UpdateUserRoleRequest): Promise<ApiResponse<boolean>> {
        const response = await apiClient.patch<ApiResponse<boolean>>(`/api/admin/users/${userId}/role`, request);
        return response.data;
    },

    /**
     * UC-A06: Cập nhật dư nợ quá hạn của khách hàng & tùy chọn tự động chặn nếu có nợ xấu
     * PATCH /api/admin/users/{userId}/debt
     */
    async updateUserDebt(userId: string, body: UpdateUserDebtRequest): Promise<ApiResponse<boolean>> {
        const response = await apiClient.patch<ApiResponse<boolean>>(`/api/admin/users/${userId}/debt`, body);
        return response.data;
    },

    /**
     * UC-A06: Chặn hàng loạt tất cả tài khoản đang có dư nợ quá hạn (overdueDebt > 0)
     * POST /api/admin/users/block-debtors
     */
    async blockAllDebtors(reason?: string): Promise<ApiResponse<number | boolean>> {
        const response = await apiClient.post<ApiResponse<number | boolean>>('/api/admin/users/block-debtors', {
            reason: reason || 'Chặn hàng loạt tài khoản khách hàng có nợ xấu quá hạn (UC-A06)',
        });
        return response.data;
    },
};

export default adminUserService;
