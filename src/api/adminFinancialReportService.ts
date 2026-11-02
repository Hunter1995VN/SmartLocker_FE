/**
 * UC-A10: Xuất báo cáo doanh thu tài chính & Lưu lượng giao dịch thanh toán
 * Kết nối với Backend endpoint /api/admin/financial-reports
 */
import client from './client';
import type { ApiResponse } from './adminDashboardService';

export type ReportGranularity = 'DAY' | 'WEEK' | 'MONTH';
export type ReportExportFormat = 'excel' | 'csv' | 'json';

export interface ReportStationOptionDto {
    id: string;
    name: string;
}

export interface FinancialTimeSeriesPointDto {
    periodKey: string;
    label: string;
    grossRevenue: number;
    baseRevenue: number;
    extensionRevenue: number;
    overdueRevenue: number;
    refundAmount: number;
    netRevenue: number;
    totalTransactions: number;
    paidTransactions: number;
    failedOrExpiredTransactions: number;
    refundTransactions: number;
}

export interface HourlyPaymentTrafficDto {
    hour: number;
    hourLabel: string;
    totalAttemptCount: number;
    paidCount: number;
    paidVolumeAmount: number;
}

export interface StationFinancialBreakdownDto {
    stationId: string;
    stationName: string;
    address: string;
    totalBookings: number;
    totalTransactions: number;
    paidTransactions: number;
    grossRevenue: number;
    refundAmount: number;
    netRevenue: number;
    revenueSharePercent: number;
    paymentSuccessRatePercent: number;
}

export interface LockerSizeRevenueBreakdownDto {
    size: string;
    sizeLabel: string;
    paidTransactions: number;
    grossRevenue: number;
    revenueSharePercent: number;
    averageTicket: number;
}

export interface PaymentKindBreakdownDto {
    kind: string;
    kindLabel: string;
    transactionCount: number;
    totalAmount: number;
    sharePercent: number;
}

export interface FinancialLedgerRowDto {
    paymentId: string;
    orderCode: string;
    bookingCode: string;
    stationName: string;
    lockerSize: string;
    customerName: string;
    customerEmail: string;
    kind: string;
    status: string;
    gateway: string;
    gatewayTxnId?: string | null;
    amount: number;
    signedNetImpact: number;
    createdAt: string;
    settledAt?: string | null;
}

export interface FinancialReportOverviewDto {
    fromDate: string;
    toDate: string;
    granularity: ReportGranularity | string;
    stationId?: string | null;
    stationFilterLabel: string;
    generatedAt: string;

    // 1. Chỉ số Doanh thu Tài chính (VND)
    grossRevenue: number;
    baseBookingRevenue: number;
    extensionRevenue: number;
    overduePenaltyRevenue: number;
    totalRefundedAmount: number;
    totalVoucherDiscountSubsidy: number;
    netRevenue: number;
    previousPeriodNetRevenue: number;
    netRevenueGrowthPercent: number;
    averageOrderValue: number;
    outstandingOverdueReceivable: number;

    // 2. Chỉ số Lưu lượng Giao dịch Thanh toán (Payment Volume & Funnel)
    totalTransactions: number;
    paidTransactionCount: number;
    pendingTransactionCount: number;
    expiredOrFailedTransactionCount: number;
    refundTransactionCount: number;
    paymentSuccessRatePercent: number;
    refundRatePercent: number;
    averagePaymentLatencySeconds: number;
    peakTrafficHourLabel: string;

    // 3. Dữ liệu phân tích chi tiết
    stations: ReportStationOptionDto[];
    timeSeries: FinancialTimeSeriesPointDto[];
    hourlyTraffic: HourlyPaymentTrafficDto[];
    stationBreakdown: StationFinancialBreakdownDto[];
    sizeBreakdown: LockerSizeRevenueBreakdownDto[];
    kindBreakdown: PaymentKindBreakdownDto[];
    ledgerItems: FinancialLedgerRowDto[];
}

export interface FinancialReportQueryParams {
    fromDate?: string;
    toDate?: string;
    stationId?: string;
    paymentKind?: string;
    granularity?: ReportGranularity;
}

const cleanQueryParams = (params: FinancialReportQueryParams) => {
    const cleaned: Record<string, string> = {};
    if (params.fromDate) cleaned.fromDate = params.fromDate;
    if (params.toDate) cleaned.toDate = params.toDate;
    if (params.stationId && params.stationId !== 'ALL') cleaned.stationId = params.stationId;
    if (params.paymentKind && params.paymentKind !== 'ALL') cleaned.paymentKind = params.paymentKind;
    if (params.granularity) cleaned.granularity = params.granularity;
    return cleaned;
};

const adminFinancialReportService = {
    getOverview: async (
        params: FinancialReportQueryParams = {}
    ): Promise<ApiResponse<FinancialReportOverviewDto>> => {
        const res = await client.get<ApiResponse<FinancialReportOverviewDto>>(
            '/api/admin/financial-reports/overview',
            { params: cleanQueryParams(params) }
        );
        return res.data;
    },

    downloadExportFile: async (
        format: ReportExportFormat,
        params: FinancialReportQueryParams = {}
    ): Promise<string> => {
        const res = await client.get<Blob>('/api/admin/financial-reports/export', {
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
        const fallbackName = `SmartLocker_BaoCaoTaiChinh_${params.fromDate || 'start'}_${params.toDate || 'end'}.${ext}`;
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

export default adminFinancialReportService;
