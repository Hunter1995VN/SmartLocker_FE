/**
 * UC-A13: Phân tích tỷ lệ lấp đầy (Occupancy Rate) và tần suất xoay vòng ngăn tủ (Locker Turnover)
 * Kết nối với Backend endpoint /api/admin/occupancy-analytics
 */
import client from './client';
import type { ApiResponse } from './adminDashboardService';
import type { ReportStationOptionDto, ReportGranularity, ReportExportFormat } from './adminFinancialReportService';

export type LockerSizeFilterType = 'ALL' | 'S' | 'M' | 'L';

export interface OccupancyTimeSeriesPointDto {
    periodKey: string;
    label: string;
    occupancyRatePercent: number;
    totalCycles: number;
    dailyTurnoverRate: number;
    occupiedLockerHours: number;
    availableLockerHours: number;
    averageDurationHours: number;
    netRevenue: number;
}

export interface HourlyOccupancyProfileDto {
    hour: number;
    hourLabel: string;
    avgActiveLockers: number;
    estimatedOccupancyPercent: number;
    checkInCount: number;
    checkOutCount: number;
}

export interface DayOfWeekUtilizationDto {
    dayIndex: number;
    dayLabel: string;
    totalCycles: number;
    occupiedHours: number;
    avgOccupancyPercent: number;
    shareOfCyclesPercent: number;
}

export interface StationOccupancyTurnoverDto {
    stationId: string;
    stationName: string;
    address: string;
    totalLockers: number;
    serviceableLockers: number;
    outOfServiceLockers: number;
    liveOccupiedCount: number;
    liveOccupancyPercent: number;
    timeWeightedOccupancyPercent: number;
    totalCycles: number;
    turnoverPerLocker: number;
    dailyTurnoverRate: number;
    avgDurationHours: number;
    revenuePerAvailableLocker: number;
    capacityStatus: 'OVERLOADED' | 'OPTIMAL' | 'MODERATE' | 'UNDERUTILIZED' | string;
    capacityRecommendation: string;
}

export interface SizeOccupancyTurnoverDto {
    size: string;
    sizeLabel: string;
    totalLockers: number;
    serviceableLockers: number;
    liveOccupiedCount: number;
    timeWeightedOccupancyPercent: number;
    totalCycles: number;
    turnoverPerLocker: number;
    dailyTurnoverRate: number;
    avgDurationHours: number;
    overdueRatePercent: number;
    revenuePerAvailableLocker: number;
}

export interface LockerUnitTurnoverItemDto {
    lockerId: string;
    lockerCode: string;
    stationId: string;
    stationName: string;
    size: string;
    businessStatus: string;
    healthStatus: string;
    doorState: string;
    cycleCount: number;
    dailyTurnoverRate: number;
    occupiedHours: number;
    occupancyRatePercent: number;
    avgDurationHours: number;
    avgIdleGapHours: number;
    generatedRevenue: number;
    lastUsedAt?: string | null;
    utilizationTier: 'HOT' | 'OPTIMAL' | 'COLD' | 'IDLE' | 'MAINTENANCE' | string;
}

export interface OccupancyTurnoverOverviewDto {
    fromDate: string;
    toDate: string;
    granularity: ReportGranularity | string;
    stationId?: string | null;
    stationFilterLabel: string;
    lockerSizeFilter: string;
    periodDays: number;
    generatedAt: string;

    // 1. Trạng thái Lấp đầy Tức thời (Real-time Snapshot)
    totalPhysicalLockers: number;
    serviceableLockers: number;
    availableNowLockers: number;
    occupiedNowLockers: number;
    reservedNowLockers: number;
    outOfServiceLockers: number;
    livePhysicalOccupancyPercent: number;
    liveServiceableOccupancyPercent: number;

    // 2. Tỷ lệ Lấp đầy Theo Thời gian Thực tế (Time-Weighted Occupancy - Locker-Hours)
    availableCapacityLockerHours: number;
    totalOccupiedLockerHours: number;
    timeWeightedOccupancyPercent: number;
    previousPeriodOccupancyPercent: number;
    occupancyDeltaPercent: number;

    // 3. Tần suất Xoay vòng Ngăn tủ & Hiệu suất Khai thác (Locker Turnover & Velocity)
    totalCompletedAndActiveCycles: number;
    previousPeriodCycles: number;
    cyclesGrowthPercent: number;
    periodTurnoverPerLocker: number;
    dailyTurnoverRate: number;
    averageStorageDurationHours: number;
    averageTurnaroundIdleHours: number;
    overdueCycleCount: number;
    overdueCycleRatePercent: number;

    // 4. Hiệu suất Kinh tế trên Công suất Ngăn tủ (RevPAL & RevPOLH)
    netRevenueInPeriod: number;
    revenuePerAvailableLocker: number;
    revenuePerOccupiedHour: number;
    peakOccupancyHourLabel: string;
    peakDayOfWeekLabel: string;

    // 5. Danh mục & Dữ liệu Phân tích Đa chiều
    stations: ReportStationOptionDto[];
    timeSeries: OccupancyTimeSeriesPointDto[];
    hourlyProfile: HourlyOccupancyProfileDto[];
    dayOfWeekProfile: DayOfWeekUtilizationDto[];
    stationBreakdown: StationOccupancyTurnoverDto[];
    sizeBreakdown: SizeOccupancyTurnoverDto[];
    lockerTurnoverItems: LockerUnitTurnoverItemDto[];
}

export interface OccupancyAnalyticsQueryParams {
    fromDate?: string;
    toDate?: string;
    stationId?: string;
    lockerSize?: LockerSizeFilterType | string;
    granularity?: ReportGranularity;
}

const cleanQueryParams = (params: OccupancyAnalyticsQueryParams) => {
    const cleaned: Record<string, string> = {};
    if (params.fromDate) cleaned.fromDate = params.fromDate;
    if (params.toDate) cleaned.toDate = params.toDate;
    if (params.stationId && params.stationId !== 'ALL') cleaned.stationId = params.stationId;
    if (params.lockerSize && params.lockerSize !== 'ALL') cleaned.lockerSize = params.lockerSize;
    if (params.granularity) cleaned.granularity = params.granularity;
    return cleaned;
};

const adminOccupancyAnalyticsService = {
    getOverview: async (
        params: OccupancyAnalyticsQueryParams = {}
    ): Promise<ApiResponse<OccupancyTurnoverOverviewDto>> => {
        const res = await client.get<ApiResponse<OccupancyTurnoverOverviewDto>>(
            '/api/admin/occupancy-analytics/overview',
            { params: cleanQueryParams(params) }
        );
        return res.data;
    },

    downloadExportFile: async (
        format: ReportExportFormat,
        params: OccupancyAnalyticsQueryParams = {}
    ): Promise<string> => {
        const res = await client.get<Blob>('/api/admin/occupancy-analytics/export', {
            params: {
                ...cleanQueryParams(params),
                format,
            },
            responseType: 'blob',
        });

        const disposition = (res.headers['content-disposition'] as string | undefined) || '';
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        const plainMatch = disposition.match(/filename="?([^";]+)"?/i);

        const ext = format === 'csv' ? 'csv' : format === 'json' ? 'json' : 'xls';
        const fallbackName = `SmartLocker_LapDay_XoayVong_${params.fromDate || 'start'}_${params.toDate || 'end'}.${ext}`;
        const fileName = utf8Match
            ? decodeURIComponent(utf8Match[1])
            : plainMatch
            ? plainMatch[1]
            : fallbackName;

        const blobUrl = window.URL.createObjectURL(res.data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500);

        return fileName;
    },
};

export default adminOccupancyAnalyticsService;
