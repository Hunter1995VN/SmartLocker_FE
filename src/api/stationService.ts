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
    // Client-side fields (không từ API)
    opensAt?: string;   // "06:00"
    closesAt?: string;  // "22:00"
    availableS?: number;
    availableM?: number;
    availableL?: number;
    contactPhone?: string;
    distanceKm?: number;
}

/** Chi tiết trạm (StationDto — bao gồm giá & availability) */
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

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Lấy danh sách trạm tủ đang hoạt động (public, không cần auth).
 * GET /api/Stations?search=...
 * Fallback về MOCK_STATIONS nếu API không khả dụng.
 */
export async function getStations(search?: string): Promise<Station[]> {
    try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await apiClient.get<ApiResponse<Station[]>>(`/api/Stations${query}`);
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        return MOCK_STATIONS;
    } catch {
        console.warn('[StationService] API không khả dụng, sử dụng dữ liệu mẫu.');
        return MOCK_STATIONS;
    }
}

/**
 * Lấy chi tiết 1 trạm (bao gồm giá & availability theo khoảng thời gian).
 * GET /api/Stations/{id}?startAt=...&endAt=...
 */
export async function getStationById(
    id: string,
    startAt?: string,
    endAt?: string
): Promise<StationDetail | null> {
    try {
        const params = new URLSearchParams();
        if (startAt) params.append('startAt', startAt);
        if (endAt) params.append('endAt', endAt);
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await apiClient.get<ApiResponse<StationDetail>>(`/api/Stations/${id}${query}`);
        if (response.data.success && response.data.data) {
            return response.data.data;
        }
        return null;
    } catch {
        console.warn('[StationService] Không thể lấy chi tiết trạm, thử fallback mock.');
        // Fallback: tìm trong mock data
        const mock = MOCK_STATIONS.find(s => s.id === id);
        if (mock) {
            return {
                ...mock,
                opensAt: mock.opensAt || '06:00',
                closesAt: mock.closesAt || '22:00',
                availableS: mock.availableS ?? mock.totalS,
                availableM: mock.availableM ?? mock.totalM,
                availableL: mock.availableL ?? mock.totalL,
                priceS: 15000,
                priceM: 25000,
                priceL: 40000,
            } as StationDetail;
        }
        return null;
    }
}

// ─── MOCK DATA — Fallback khi Backend không khả dụng ─────────────────────────

export const MOCK_STATIONS: Station[] = [
    {
        id: '11111111-1111-1111-1111-111111111111', name: 'SmartLocker Sân Bay Tân Sơn Nhất',
        address: 'Nhà ga quốc nội T1, Cộng Hòa, Tân Bình, TP.HCM',
        latitude: 10.8172, longitude: 106.6600,
        status: 'ACTIVE', opensAt: '00:00', closesAt: '23:59',
        totalS: 10, totalM: 8, totalL: 4,
        availableS: 8, availableM: 6, availableL: 3,
        contactPhone: '028 3848 5383',
    },
    {
        id: '22222222-2222-2222-2222-222222222222', name: 'SmartLocker Bến Thành',
        address: 'Quảng trường Quách Thị Trang, Phường Bến Thành, Q.1, TP.HCM',
        latitude: 10.7725, longitude: 106.6980,
        status: 'ACTIVE', opensAt: '06:00', closesAt: '22:00',
        totalS: 10, totalM: 8, totalL: 4,
        availableS: 10, availableM: 8, availableL: 4,
        contactPhone: '028 3925 1234',
    },
    {
        id: '33333333-3333-3333-3333-333333333333', name: 'SmartLocker Phố Đi Bộ Nguyễn Huệ',
        address: '89 Nguyễn Huệ, Phường Bến Nghé, Q.1, TP.HCM',
        latitude: 10.7752, longitude: 106.7031,
        status: 'ACTIVE', opensAt: '08:00', closesAt: '22:30',
        totalS: 8, totalM: 6, totalL: 4,
        availableS: 8, availableM: 6, availableL: 4,
    },
    {
        id: '44444444-4444-4444-4444-444444444444', name: 'SmartLocker Ga Metro Bến Thành',
        address: 'Ga Metro Bến Thành, Q.1, TP.HCM',
        latitude: 10.7710, longitude: 106.6975,
        status: 'ACTIVE', opensAt: '05:30', closesAt: '22:30',
        totalS: 12, totalM: 10, totalL: 6,
        availableS: 12, availableM: 10, availableL: 6,
    },
    {
        id: '55555555-5555-5555-5555-555555555555', name: 'SmartLocker Vincom Center Q.1',
        address: '72 Lê Thánh Tôn, Bến Nghé, Q.1, TP.HCM',
        latitude: 10.7784, longitude: 106.7019,
        status: 'ACTIVE', opensAt: '09:30', closesAt: '22:00',
        totalS: 8, totalM: 6, totalL: 4,
        availableS: 8, availableM: 6, availableL: 4,
    },
    {
        id: '66666666-6666-6666-6666-666666666666', name: 'SmartLocker Landmark 81',
        address: '208 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM',
        latitude: 10.7951, longitude: 106.7218,
        status: 'ACTIVE', opensAt: '08:00', closesAt: '22:00',
        totalS: 10, totalM: 8, totalL: 4,
        availableS: 10, availableM: 8, availableL: 4,
    },
];

export const MOCK_ACTIVE_BOOKING: Booking | null = {
    id: 'bk-001',
    bookingCode: 'SL20250918001',
    stationName: 'SmartLocker Bến Thành',
    stationAddress: 'Quảng trường Quách Thị Trang, Q.1',
    lockerCode: 'BT-M-012',
    size: 'M',
    status: 'CHECKED_IN',
    startAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    endAt: new Date(Date.now() + 4 * 3600_000).toISOString(),
    baseAmount: 60000,
    isOverdue: false,
};

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
