/**
 * AD-FE-03: UC-A03, UC-A04 — Manage Stations & Lockers
 * API service kết nối với Backend ASP.NET Core:
 * - AdminStationsController (/api/admin/stations)
 * - AdminLockersController (/api/admin/lockers)
 */
import apiClient from './client';

// ─── DTO Interfaces (đồng bộ 1:1 với Backend C# DTOs) ───────────────────────

export interface StationAdminDetailDto {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
    opensAt: string;
    closesAt: string;
    contactPhone?: string | null;
    totalS: number;
    totalM: number;
    totalL: number;
    availableS: number;
    availableM: number;
    availableL: number;
    priceS?: number | null;
    priceM?: number | null;
    priceL?: number | null;
    createdAt: string;
}

export interface CreateStationRequest {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    opensAt?: string;
    closesAt?: string;
    contactPhone?: string | null;
    totalS: number;
    totalM: number;
    totalL: number;
    priceSPerBlock: number;
    priceMPerBlock: number;
    priceLPerBlock: number;
}

export interface UpdateStationRequest {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
    opensAt: string;
    closesAt: string;
    contactPhone?: string | null;
}

export interface UpdatePricingPolicyRequest {
    size: 'S' | 'M' | 'L';
    pricePerBlock: number;
    blockHours?: number;
    overdueFeePerHour?: number;
    gracePeriodMinutes?: number;
}

export interface ActiveBookingBriefDto {
    bookingId: string;
    bookingCode: string;
    customerName: string;
    customerPhone: string;
    startAt: string;
    endAt: string;
    isOverdue: boolean;
}

export interface LockerGridItemDto {
    id: string;
    stationId: string;
    lockerCode: string;
    size: 'S' | 'M' | 'L';
    gpioPin?: number | null;
    businessStatus: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'DISABLED';
    healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    doorState: 'OPEN' | 'CLOSED' | 'UNKNOWN';
    lastDoorEventAt?: string | null;
    notes?: string | null;
    currentBooking?: ActiveBookingBriefDto | null;
}

export interface UpdateLockerStatusRequest {
    businessStatus: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'DISABLED';
    healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    reason?: string;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    errors?: string[];
}

// ─── Service Methods ─────────────────────────────────────────────────────────

export const adminStationService = {
    /**
     * UC-A03: Lấy danh sách tất cả trạm (hỗ trợ tìm kiếm theo tên hoặc địa chỉ)
     * GET /api/admin/stations?search=...
     */
    async getStations(search?: string): Promise<ApiResponse<StationAdminDetailDto[]>> {
        const params = new URLSearchParams();
        if (search && search.trim()) {
            params.append('search', search.trim());
        }
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await apiClient.get<ApiResponse<StationAdminDetailDto[]>>(`/api/admin/stations${query}`);
        return res.data;
    },

    /**
     * UC-A03: Lấy thông tin chi tiết của 1 trạm kèm bảng giá và số ô tủ khả dụng
     * GET /api/admin/stations/{id}
     */
    async getStationById(id: string): Promise<ApiResponse<StationAdminDetailDto>> {
        const res = await apiClient.get<ApiResponse<StationAdminDetailDto>>(`/api/admin/stations/${id}`);
        return res.data;
    },

    /**
     * UC-A03: Thêm mới trạm tủ kèm tự động sinh ô tủ (S, M, L) và bảng giá khởi tạo
     * POST /api/admin/stations
     */
    async createStation(data: CreateStationRequest): Promise<ApiResponse<StationAdminDetailDto>> {
        const res = await apiClient.post<ApiResponse<StationAdminDetailDto>>('/api/admin/stations', data);
        return res.data;
    },

    /**
     * UC-A03: Cập nhật thông tin trạm tủ (tên, địa chỉ, GPS, giờ mở cửa, trạng thái)
     * PUT /api/admin/stations/{id}
     */
    async updateStation(id: string, data: UpdateStationRequest): Promise<ApiResponse<StationAdminDetailDto>> {
        const res = await apiClient.put<ApiResponse<StationAdminDetailDto>>(`/api/admin/stations/${id}`, data);
        return res.data;
    },

    /**
     * UC-A03: Ngưng hoạt động trạm tủ (soft-delete chuyển trạng thái sang INACTIVE)
     * DELETE /api/admin/stations/{id}
     */
    async deleteStation(id: string): Promise<ApiResponse<boolean>> {
        const res = await apiClient.delete<ApiResponse<boolean>>(`/api/admin/stations/${id}`);
        return res.data;
    },

    /**
     * UC-A04: Cập nhật bảng giá cho từng kích thước tủ (S, M, L)
     * PUT /api/admin/stations/{stationId}/pricing
     */
    async updatePricingPolicy(stationId: string, data: UpdatePricingPolicyRequest): Promise<ApiResponse<boolean>> {
        const res = await apiClient.put<ApiResponse<boolean>>(`/api/admin/stations/${stationId}/pricing`, data);
        return res.data;
    },

    /**
     * UC-A04: Lấy sơ đồ ô tủ chi tiết của trạm
     * GET /api/admin/lockers/station/{stationId}/grid
     */
    async getStationLockersGrid(stationId: string): Promise<ApiResponse<LockerGridItemDto[]>> {
        const res = await apiClient.get<ApiResponse<LockerGridItemDto[]>>(`/api/admin/lockers/station/${stationId}/grid`);
        return res.data;
    },

    /**
     * Cập nhật trạng thái một ô tủ (Bảo trì, sẵn sàng, vô hiệu hóa)
     * PATCH /api/admin/lockers/{lockerId}/status
     */
    async updateLockerStatus(lockerId: string, data: UpdateLockerStatusRequest): Promise<ApiResponse<boolean>> {
        const res = await apiClient.patch<ApiResponse<boolean>>(`/api/admin/lockers/${lockerId}/status`, data);
        return res.data;
    },
};

export default adminStationService;
