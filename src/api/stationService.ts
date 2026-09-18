// Types đồng bộ với bảng Stations + Lockers trong DB
export interface Station {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
    opensAt: string;   // "06:00"
    closesAt: string;  // "22:00"
    totalS: number;
    totalM: number;
    totalL: number;
    availableS: number;
    availableM: number;
    availableL: number;
    contactPhone?: string;
    distanceKm?: number; // tính toán client-side
}

export interface Booking {
    id: string;
    bookingCode: string;
    stationName: string;
    stationAddress: string;
    lockerCode: string;
    size: 'S' | 'M' | 'L';
    status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'OVERDUE';
    startAt: string;
    endAt: string;
    baseAmount: number;
    isOverdue: boolean;
}

// =====================================================
// MOCK DATA — thay bằng API call thật khi có backend
// =====================================================
export const MOCK_STATIONS: Station[] = [
    {
        id: '1', name: 'SmartLocker Sân Bay Tân Sơn Nhất',
        address: 'Nhà ga quốc nội T1, Cộng Hòa, Tân Bình, TP.HCM',
        latitude: 10.8172, longitude: 106.6600,
        status: 'ACTIVE', opensAt: '00:00', closesAt: '23:59',
        totalS: 20, totalM: 15, totalL: 10,
        availableS: 8, availableM: 6, availableL: 3,
        contactPhone: '028 3848 5383',
    },
    {
        id: '2', name: 'SmartLocker Bến Thành',
        address: 'Quảng trường Quách Thị Trang, Phường Bến Thành, Q.1, TP.HCM',
        latitude: 10.7725, longitude: 106.6980,
        status: 'ACTIVE', opensAt: '06:00', closesAt: '22:00',
        totalS: 15, totalM: 10, totalL: 5,
        availableS: 12, availableM: 4, availableL: 5,
        contactPhone: '028 3925 1234',
    },
    {
        id: '3', name: 'SmartLocker Phố Đi Bộ Nguyễn Huệ',
        address: '89 Nguyễn Huệ, Phường Bến Nghé, Q.1, TP.HCM',
        latitude: 10.7752, longitude: 106.7031,
        status: 'ACTIVE', opensAt: '08:00', closesAt: '22:30',
        totalS: 10, totalM: 10, totalL: 5,
        availableS: 3, availableM: 7, availableL: 2,
    },
    {
        id: '4', name: 'SmartLocker Ga Metro Bến Thành',
        address: 'Ga Metro Bến Thành, Q.1, TP.HCM',
        latitude: 10.7710, longitude: 106.6975,
        status: 'ACTIVE', opensAt: '05:30', closesAt: '22:30',
        totalS: 30, totalM: 20, totalL: 10,
        availableS: 18, availableM: 12, availableL: 8,
    },
    {
        id: '5', name: 'SmartLocker Vincom Center Q.1',
        address: '72 Lê Thánh Tôn, Bến Nghé, Q.1, TP.HCM',
        latitude: 10.7784, longitude: 106.7019,
        status: 'ACTIVE', opensAt: '09:30', closesAt: '22:00',
        totalS: 12, totalM: 8, totalL: 4,
        availableS: 5, availableM: 3, availableL: 0,
    },
    {
        id: '6', name: 'SmartLocker Landmark 81',
        address: '208 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM',
        latitude: 10.7951, longitude: 106.7218,
        status: 'MAINTENANCE', opensAt: '08:00', closesAt: '22:00',
        totalS: 20, totalM: 15, totalL: 8,
        availableS: 0, availableM: 0, availableL: 0,
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

// Hàm tính khoảng cách km giữa 2 tọa độ (Haversine)
export function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
