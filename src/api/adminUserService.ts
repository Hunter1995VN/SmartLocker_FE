/**
 * AD-FE-05: UC-A06 — Manage Internal Users
 * API Service kết nối với Backend ASP.NET Core:
 * AdminUsersController (/api/admin/users)
 * 
 * Endpoints thực tế từ Backend:
 * - GET   /api/admin/users                     : Lấy danh sách users (filter: search, role, status, page, pageSize)
 * - POST  /api/admin/users/staff               : Tạo tài khoản Staff mới
 * - PATCH /api/admin/users/{userId}/status     : Kích hoạt / Tạm khóa tài khoản
 * - PATCH /api/admin/users/{userId}/role       : Thay đổi phân quyền (Role)
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
    createdAt: string;
}

export interface GetUsersParams {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    pageSize?: number;
}

export interface CreateStaffRequest {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
}

export interface UpdateUserStatusRequest {
    status: UserStatus;
    reason?: string;
}

export interface UpdateUserRoleRequest {
    role: UserRole;
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
     * Lấy danh sách tài khoản nội bộ (có hỗ trợ search, lọc theo role, status, phân trang)
     * GET /api/admin/users
     */
    async getUsers(params: GetUsersParams = {}): Promise<ApiResponse<UserAdminListItemDto[]>> {
        const query = new URLSearchParams();
        if (params.search?.trim()) query.set('search', params.search.trim());
        if (params.role?.trim()) query.set('role', params.role.trim());
        if (params.status?.trim()) query.set('status', params.status.trim());
        if (params.page && params.page > 0) query.set('page', params.page.toString());
        if (params.pageSize && params.pageSize > 0) query.set('pageSize', params.pageSize.toString());

        const url = `/api/admin/users${query.toString() ? `?${query.toString()}` : ''}`;
        const response = await apiClient.get<ApiResponse<UserAdminListItemDto[]>>(url);
        return response.data;
    },

    /**
     * Tạo tài khoản nhân viên Staff mới
     * POST /api/admin/users/staff
     */
    async createStaff(request: CreateStaffRequest): Promise<ApiResponse<UserAdminListItemDto>> {
        const response = await apiClient.post<ApiResponse<UserAdminListItemDto>>('/api/admin/users/staff', request);
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
};

export default adminUserService;
