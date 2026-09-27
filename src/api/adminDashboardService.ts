/**
 * AD-FE-02: UC-A02 — View Operations Dashboard
 * API Service cho phân hệ Operations Dashboard của Admin & Staff.
 * Kết nối các endpoint backend thật:
 * - GET /api/admin/dashboard/stats
 * - GET /api/admin/dashboard/revenue-chart?days=30
 * - GET /api/admin/dashboard/station-occupancies
 * - GET /api/admin/incidents
 */
import apiClient from './client';

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    code?: string;
    data: T;
    errors?: string[];
}

/** DTO thống kê vận hành tổng quan */
export interface AdminDashboardStatsDto {
    todayRevenue: number;
    monthRevenue: number;
    totalStations: number;
    activeStations: number;
    totalLockers: number;
    availableLockers: number;
    occupiedLockers: number;
    maintenanceLockers: number;
    overallOccupancyRate: number;
    totalActiveBookings: number;
    offlineIoTDevices: number;
    openSecurityIncidents: number;
    pendingAbandonedProperties: number;
}

/** DTO điểm dữ liệu biểu đồ doanh thu theo ngày */
export interface RevenueChartItemDto {
    date: string;
    revenue: number;
    bookingCount: number;
}

/** DTO tỷ lệ lấp đầy theo từng trạm */
export interface StationOccupancyItemDto {
    stationId: string;
    stationName: string;
    totalLockers: number;
    occupiedLockers: number;
    occupancyRate: number;
}

/** DTO chi tiết sự cố vận hành / tủ cần xử lý */
export interface IncidentDto {
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

export const adminDashboardService = {
    /**
     * Lấy các chỉ số KPI vận hành tổng hợp (doanh thu, tủ, trạm, thiết bị)
     * GET /api/admin/dashboard/stats
     */
    async getStats(): Promise<ApiResponse<AdminDashboardStatsDto>> {
        const response = await apiClient.get<ApiResponse<AdminDashboardStatsDto>>('/api/admin/dashboard/stats');
        return response.data;
    },

    /**
     * Lấy chuỗi dữ liệu biểu đồ doanh thu theo ngày
     * GET /api/admin/dashboard/revenue-chart?days=30
     */
    async getRevenueChart(days: number = 30): Promise<ApiResponse<RevenueChartItemDto[]>> {
        const response = await apiClient.get<ApiResponse<RevenueChartItemDto[]>>(
            `/api/admin/dashboard/revenue-chart?days=${days}`
        );
        return response.data;
    },

    /**
     * Lấy danh sách tỷ lệ lấp đầy của từng trạm tủ
     * GET /api/admin/dashboard/station-occupancies
     */
    async getStationOccupancies(): Promise<ApiResponse<StationOccupancyItemDto[]>> {
        const response = await apiClient.get<ApiResponse<StationOccupancyItemDto[]>>(
            '/api/admin/dashboard/station-occupancies'
        );
        return response.data;
    },

    /**
     * Lấy danh sách sự cố vận hành đang mở (phục vụ mục tủ hỏng / sự cố thiết bị)
     * GET /api/admin/incidents?status=OPEN
     */
    async getIncidents(status: string = 'OPEN'): Promise<ApiResponse<IncidentDto[]>> {
        const response = await apiClient.get<ApiResponse<IncidentDto[]>>(
            `/api/admin/incidents?status=${status}`
        );
        return response.data;
    },
};

export default adminDashboardService;
