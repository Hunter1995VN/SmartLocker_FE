/**
 * AD-FE-03: UC-A03, UC-A04 — Manage Stations, Lockers, Pricing, Overdue Penalty & Refund Policies
 * API service kết nối với Backend ASP.NET Core:
 * - AdminStationsController (/api/admin/stations)
 * - AdminLockersController (/api/admin/lockers)
 */
import apiClient from './client';
import type { SizeReservationCounts } from './kioskService';

// ─── DTO Interfaces (đồng bộ 1:1 với Backend C# DTOs) ───────────────────────

export interface DeviceControlResultDto {
    deviceCode: string;
    command: string;
    message: string;
    sentAt: string;
}

export interface DiagnosticsResultDto {
    schemaVersion: number;
    deviceCode: string;
    status: string;
    durationMs: number;
    relays: Record<string, string>;
    doors: Record<string, string>;
    wifiRssi: number;
    freeHeapBytes: number;
    uptimeSeconds: number;
    timestamp: string;
}

export interface IoTDeviceDto {
    id: string;
    stationId: string;
    stationName: string;
    stationAddress: string;
    deviceCode: string;
    deviceType: string;
    firmwareVersion: string;
    connectivityStatus: 'ONLINE' | 'OFFLINE' | 'REBOOTING' | 'UNPROVISIONED' | string;
    wifiRssi?: number | null;
    uptimeSeconds?: number | null;
    lastSeenAt?: string | null;
    createdAt?: string;
    isProvisioned?: boolean;
}

export interface SwapSpareLockerRequest {
    reason: string;
    openNewLocker?: boolean;
}

export interface SwapSpareLockerResultDto {
    oldLockerId: string;
    oldLockerCode: string;
    newLockerId: string;
    newLockerCode: string;
    size: string;
    bookingId?: string | null;
    bookingCode?: string | null;
    message: string;
    swappedAt: string;
}

export interface StationSecurityThresholdsDto {
    stationId: string;
    stationName: string;
    doorAjarTimeoutSeconds: number;
    maxConsecutiveFailures: number;
    vibrationSensitivityLevel: number;
    enableBuzzerAlarm: boolean;
    autoCreateSecurityIncident: boolean;
    updatedAt: string;
}

export interface UpdateSecurityThresholdsRequest {
    doorAjarTimeoutSeconds: number;
    maxConsecutiveFailures: number;
    vibrationSensitivityLevel: number;
    enableBuzzerAlarm: boolean;
    autoCreateSecurityIncident: boolean;
}

export interface UpdateLockerHardwareMappingRequest {
    gpioPin?: number | null;
    ioTDeviceId?: string | null;
}

export interface DoorTelemetryItemDto {
    lockerId: string;
    lockerCode: string;
    size: string;
    doorState: string;
    lastDoorEventAt?: string | null;
    gpioPin?: number | null;
    healthStatus: string;
    deviceCode: string;
}

export interface StationPricingPolicyDto {
    id?: string;
    size: 'S' | 'M' | 'L' | string;
    pricePerBlock: number;
    blockHours: number;
    overdueFeePerHour: number;
    gracePeriodMinutes: number;
    refundCutoffHours: number;
    refundRateEarly: number;
    refundRateLate: number;
    minHours?: number;
    maxHours?: number;
    noShowWindowMinutes?: number;
}

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
    pricingPolicies?: StationPricingPolicyDto[];
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
    refundCutoffHours?: number;
    refundRateEarly?: number;
    refundRateLate?: number;
    noShowWindowMinutes?: number;
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
    businessStatus: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'DISABLED' | 'BLOCKED';
    healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    doorState: 'OPEN' | 'CLOSED' | 'UNKNOWN';
    lastDoorEventAt?: string | null;
    ioTDeviceId?: string | null;
    deviceCode?: string | null;
    connectivityStatus?: string;
    lastSeenAt?: string | null;
    firmwareVersion?: string | null;
    notes?: string | null;
    currentBooking?: ActiveBookingBriefDto | null;
}

export interface UpdateLockerStatusRequest {
    businessStatus: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'DISABLED' | 'BLOCKED';
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
    async getReservations(stationId: string): Promise<SizeReservationCounts[]> {
        return (await apiClient.get<SizeReservationCounts[]>(`/api/admin/lockers/station/${stationId}/reservations`)).data;
    },
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
     * UC-A04: Cập nhật bảng giá, mức phí phạt quá hạn và tỷ lệ hoàn tiền khi hủy đơn cho từng kích thước tủ (S, M, L)
     * PUT /api/admin/stations/{stationId}/pricing
     */
    async updatePricingPolicy(stationId: string, data: UpdatePricingPolicyRequest): Promise<ApiResponse<boolean>> {
        const res = await apiClient.put<ApiResponse<boolean>>(`/api/admin/stations/${stationId}/pricing`, data);
        return res.data;
    },

    /**
     * UC-A03 / UC-A04: Lấy sơ đồ ô tủ chi tiết của trạm
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

    /**
     * UC-S01: Lấy danh sách thiết bị vi điều khiển IoT ESP32 của toàn bộ trạm
     * GET /api/admin/stations/devices
     */
    async getIoTDevices(): Promise<ApiResponse<IoTDeviceDto[]>> {
        const res = await apiClient.get<ApiResponse<IoTDeviceDto[]>>('/api/admin/stations/devices');
        return res.data;
    },

    /**
     * UC-S09: Khởi động lại vi điều khiển ESP32 từ xa qua lệnh MQTT Reboot
     * POST /api/admin/stations/{stationId}/reboot
     */
    async rebootDevice(stationId: string): Promise<ApiResponse<DeviceControlResultDto>> {
        const res = await apiClient.post<ApiResponse<DeviceControlResultDto>>(`/api/admin/stations/${stationId}/reboot`);
        return res.data;
    },

    /**
     * UC-S07: Kích hoạt chu trình chẩn đoán tự động phần cứng (Self-Test Relay/Sensor)
     * POST /api/admin/stations/{stationId}/self-test
     */
    async triggerSelfTest(stationId: string): Promise<ApiResponse<DeviceControlResultDto>> {
        const res = await apiClient.post<ApiResponse<DeviceControlResultDto>>(`/api/admin/stations/${stationId}/self-test`);
        return res.data;
    },

    /**
     * UC-S12: Đổi sang hộc tủ dự phòng khi ô tủ được gán bị kẹt cơ học
     * POST /api/admin/lockers/{lockerId}/swap-spare
     */
    async swapSpareLocker(lockerId: string, data: SwapSpareLockerRequest): Promise<ApiResponse<SwapSpareLockerResultDto>> {
        const res = await apiClient.post<ApiResponse<SwapSpareLockerResultDto>>(`/api/admin/lockers/${lockerId}/swap-spare`, data);
        return res.data;
    },

    /**
     * UC-A11: Lấy cấu hình ngưỡng an ninh & timeout cửa mở (Door Ajar)
     * GET /api/admin/stations/{stationId}/security-thresholds
     */
    async getSecurityThresholds(stationId: string): Promise<ApiResponse<StationSecurityThresholdsDto>> {
        const res = await apiClient.get<ApiResponse<StationSecurityThresholdsDto>>(`/api/admin/stations/${stationId}/security-thresholds`);
        return res.data;
    },

    /**
     * UC-A11: Cập nhật cấu hình ngưỡng an ninh & timeout cửa mở
     * PUT /api/admin/stations/{stationId}/security-thresholds
     */
    async updateSecurityThresholds(stationId: string, data: UpdateSecurityThresholdsRequest): Promise<ApiResponse<StationSecurityThresholdsDto>> {
        const res = await apiClient.put<ApiResponse<StationSecurityThresholdsDto>>(`/api/admin/stations/${stationId}/security-thresholds`, data);
        return res.data;
    },

    /**
     * UC-A02: Cấu hình mã chân GPIO và bo mạch IoT cho ô tủ
     * PATCH /api/admin/lockers/{lockerId}/hardware-mapping
     */
    async updateLockerHardwareMapping(lockerId: string, data: UpdateLockerHardwareMappingRequest): Promise<ApiResponse<boolean>> {
        const res = await apiClient.patch<ApiResponse<boolean>>(`/api/admin/lockers/${lockerId}/hardware-mapping`, data);
        return res.data;
    },

    /**
     * UC-S03: Giám sát trạng thái cảm biến cửa và Telemetry
     * GET /api/admin/stations/{stationId}/door-telemetry
     */
    async getDoorTelemetry(stationId: string): Promise<ApiResponse<DoorTelemetryItemDto[]>> {
        const res = await apiClient.get<ApiResponse<DoorTelemetryItemDto[]>>(`/api/admin/stations/${stationId}/door-telemetry`);
        return res.data;
    },
};

export default adminStationService;
