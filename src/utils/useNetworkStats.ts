import { useEffect, useState } from 'react';
import { getStations } from '../api/stationService';

export interface NetworkStats {
    /** Số trạm đang hoạt động; null khi chưa tải được (đừng hiển thị con số bịa). */
    stations: number | null;
    /** Tổng số ô tủ (S+M+L) của các trạm đang hoạt động; null khi chưa tải được. */
    lockers: number | null;
}

let cached: Promise<NetworkStats> | null = null;

function load(): Promise<NetworkStats> {
    if (!cached) {
        cached = getStations()
            .then((list) => {
                const active = list.filter((s) => s.status === 'ACTIVE');
                return {
                    stations: active.length,
                    lockers: active.reduce((sum, s) => sum + (s.totalS ?? 0) + (s.totalM ?? 0) + (s.totalL ?? 0), 0),
                };
            })
            .catch(() => {
                cached = null; // lần sau thử lại
                return { stations: null, lockers: null };
            });
    }
    return cached;
}

/** Số liệu mạng lưới lấy từ hệ thống (một lần cho cả trang). Dùng thay cho các con số quảng cáo viết cứng. */
export function useNetworkStats(): NetworkStats {
    const [stats, setStats] = useState<NetworkStats>({ stations: null, lockers: null });
    useEffect(() => {
        let alive = true;
        load().then((s) => { if (alive) setStats(s); });
        return () => { alive = false; };
    }, []);
    return stats;
}
