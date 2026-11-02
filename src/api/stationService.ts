import apiClient from './client';

// ─── Types đồng bộ với Backend DTOs ──────────────────────────────────────────

/** Trạm tủ (danh sách — StationListItemDto) */
export interface Station {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
    totalS: number;
    totalM: number;
    totalL: number;
    opensAt?: string;   // "06:00"
    closesAt?: string;  // "22:00"
    availableS?: number;
    availableM?: number;
    availableL?: number;
    priceS?: number;
    priceM?: number;
    priceL?: number;
    contactPhone?: string;
    distanceKm?: number;
}

/** Chi tiết trạm (StationDto — bao gồm giá & availability từ DB) */
export interface StationDetail extends Station {
    opensAt: string;
    closesAt: string;
    availableS: number;
    availableM: number;
    availableL: number;
    contactPhone?: string;
    priceS?: number;
    priceM?: number;
    priceL?: number;
    overdueFeeS?: number;
    overdueFeeM?: number;
    overdueFeeL?: number;
    minHours?: number;
    maxHours?: number;
    gracePeriodMinutes?: number;
    refundCutoffHours?: number;
    refundRateEarly?: number;
    refundRateLate?: number;
}

/** Đơn đặt tủ đang hoạt động (dùng cho Dashboard / Map sidebar) */
export interface Booking {
    id: string;
    bookingCode: string;
    stationName: string;
    stationAddress: string;
    lockerCode: string;
    size: 'S' | 'M' | 'L';
    status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'OVERDUE' | 'STORED' | 'COMPLETED';
    startAt: string;
    endAt: string;
    baseAmount: number;
    isOverdue: boolean;
}

/** Backend API response wrapper */
interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    errors?: string[];
}

export interface GetStationsParams {
    search?: string;
    userLat?: number;
    userLng?: number;
    radiusKm?: number;
}

// ─── API Functions (100% Dữ liệu thật từ Backend Database) ───────────────────

/**
 * Lấy danh sách trạm tủ trực tiếp từ Database qua Backend API.
 * GET /api/Stations?search=...&userLat=...&userLng=...
 */
export async function getStations(paramsOrSearch?: string | GetStationsParams): Promise<Station[]> {
    const params = new URLSearchParams();
    if (typeof paramsOrSearch === 'string') {
        if (paramsOrSearch.trim()) params.append('search', paramsOrSearch.trim());
    } else if (paramsOrSearch) {
        if (paramsOrSearch.search?.trim()) params.append('search', paramsOrSearch.search.trim());
        if (paramsOrSearch.userLat != null) params.append('userLat', String(paramsOrSearch.userLat));
        if (paramsOrSearch.userLng != null) params.append('userLng', String(paramsOrSearch.userLng));
        if (paramsOrSearch.radiusKm != null) params.append('radiusKm', String(paramsOrSearch.radiusKm));
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<ApiResponse<Station[]>>(`/api/Stations${query}`);
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
    }
    return [];
}

/**
 * Lấy chi tiết 1 trạm trực tiếp từ Database (bao gồm bảng giá & số ô trống theo thời gian thực).
 * GET /api/Stations/{id}?startAt=...&endAt=...
 */
export async function getStationById(
    id: string,
    startAt?: string,
    endAt?: string
): Promise<StationDetail | null> {
    const params = new URLSearchParams();
    if (startAt) params.append('startAt', startAt);
    if (endAt) params.append('endAt', endAt);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<ApiResponse<StationDetail>>(`/api/Stations/${id}${query}`);
    if (response.data && response.data.success && response.data.data) {
        return response.data.data;
    }
    return null;
}

// Giữ export rỗng để tương thích ngược nếu file khác còn import, không chứa dữ liệu giả
export const MOCK_STATIONS: Station[] = [];
export const MOCK_ACTIVE_BOOKING: Booking | null = null;

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Tính khoảng cách km giữa 2 tọa độ GPS (Haversine) */
export function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
