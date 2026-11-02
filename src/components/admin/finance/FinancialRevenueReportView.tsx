/**
 * UC-A10: Xuất báo cáo doanh thu tài chính & Lưu lượng giao dịch thanh toán
 * Phân tích chuyên sâu Doanh thu Gộp / Thuần, Trợ giá Voucher, Lưu lượng & Tỷ lệ chuyển đổi cổng PayOS,
 * Phân bố khung giờ cao điểm 24h, Xếp hạng Trạm / Kích cỡ tủ và Xuất chứng từ Đa định dạng (Excel 4-Sheet, CSV, JSON, A4 Print/PDF).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BarChart3,
    Download,
    FileSpreadsheet,
    FileText,
    Printer,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Activity,
    Clock,
    CheckCircle2,
    RotateCcw,
    CreditCard,
    Building2,
    Layers,
    Search,
    Calendar,
    Filter,
    ShieldCheck,
    ArrowUpRight,
    FileJson,
    Zap,
} from 'lucide-react';
import adminFinancialReportService from '../../../api/adminFinancialReportService';
import type {
    FinancialReportOverviewDto,
    ReportGranularity,
    ReportExportFormat,
    FinancialTimeSeriesPointDto,
} from '../../../api/adminFinancialReportService';

interface FinancialRevenueReportViewProps {
    userRole?: string;
    onNavigateReconciliation?: () => void;
    onNavigateManualRefunds?: () => void;
    onNavigateAudit?: () => void;
}

type ReportTabKey = 'TRENDS' | 'BREAKDOWN' | 'LEDGER' | 'EXPORT_CENTER';
type TrendChartMode = 'REVENUE' | 'VOLUME';

const formatVnd = (amount: number): string =>
    `${Math.round(amount || 0).toLocaleString('vi-VN')}đ`;

const formatCompactVnd = (amount: number): string => {
    const abs = Math.abs(amount || 0);
    if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)} tỷ`;
    if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)} tr`;
    if (abs >= 1_000) return `${Math.round(amount / 1_000)}k`;
    return `${Math.round(amount)}đ`;
};

const formatDateTimeVi = (iso?: string | null): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const toInputDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getKindBadge = (kind: string) => {
    switch (kind) {
        case 'BASE':
            return { label: 'Thuê tủ cơ bản', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
        case 'EXTENSION':
            return { label: 'Gia hạn lưu trữ', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
        case 'OVERDUE':
            return { label: 'Phụ phí quá hạn', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
        case 'REFUND':
            return { label: 'Hoàn tiền khách', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
        default:
            return { label: kind, cls: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'PAID':
            return { label: 'PAID · Đã thu', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        case 'REFUNDED':
            return { label: 'REFUNDED · Đã hoàn', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
        case 'PENDING':
            return { label: 'PENDING · Chờ quét', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
        case 'EXPIRED':
            return { label: 'EXPIRED · Hết hạn', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
        case 'FAILED':
            return { label: 'FAILED · Thất bại', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
        default:
            return { label: status, cls: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
};

export default function FinancialRevenueReportView({
    userRole = 'ADMIN',
    onNavigateReconciliation,
    onNavigateManualRefunds,
    onNavigateAudit,
}: FinancialRevenueReportViewProps) {
    // Default date range: last 30 days
    const [fromDate, setFromDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        return toInputDateString(d);
    });
    const [toDate, setToDate] = useState<string>(() => toInputDateString(new Date()));
    const [granularity, setGranularity] = useState<ReportGranularity>('DAY');
    const [stationId, setStationId] = useState<string>('ALL');
    const [paymentKind, setPaymentKind] = useState<string>('ALL');
    const [activePreset, setActivePreset] = useState<string>('30D');

    // UI States
    const [activeTab, setActiveTab] = useState<ReportTabKey>('TRENDS');
    const [chartMode, setChartMode] = useState<TrendChartMode>('REVENUE');
    const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
    const [ledgerSearch, setLedgerSearch] = useState<string>('');
    const [ledgerStatusFilter, setLedgerStatusFilter] = useState<string>('ALL');

    // Data & Loading States
    const [report, setReport] = useState<FinancialReportOverviewDto | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [exportingFormat, setExportingFormat] = useState<ReportExportFormat | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const showToast = useCallback((type: 'success' | 'error', text: string) => {
        setToastMessage({ type, text });
        window.setTimeout(() => {
            setToastMessage((prev) => (prev?.text === text ? null : prev));
        }, 5000);
    }, []);

    const fetchReport = useCallback(async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await adminFinancialReportService.getOverview({
                fromDate,
                toDate,
                stationId,
                paymentKind,
                granularity,
            });
            if (res.success && res.data) {
                setReport(res.data);
                setSelectedPointIndex(
                    res.data.timeSeries.length > 0 ? res.data.timeSeries.length - 1 : null
                );
            } else {
                setErrorMsg(res.message || 'Không thể tải báo cáo doanh thu tài chính.');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setErrorMsg(
                axiosErr.response?.data?.message ||
                    'Không thể kết nối máy chủ báo cáo tài chính. Vui lòng kiểm tra kết nối API.'
            );
        } finally {
            setIsLoading(false);
        }
    }, [fromDate, toDate, stationId, paymentKind, granularity]);

    useEffect(() => {
        void fetchReport();
    }, [fetchReport]);

    const applyDatePreset = (preset: 'TODAY' | '7D' | '30D' | '90D' | 'YTD') => {
        const now = new Date();
        const end = toInputDateString(now);
        const startObj = new Date(now);
        let nextGranularity: ReportGranularity = granularity;

        if (preset === 'TODAY') {
            nextGranularity = 'DAY';
        } else if (preset === '7D') {
            startObj.setDate(now.getDate() - 6);
            nextGranularity = 'DAY';
        } else if (preset === '30D') {
            startObj.setDate(now.getDate() - 29);
            nextGranularity = 'DAY';
        } else if (preset === '90D') {
            startObj.setDate(now.getDate() - 89);
            nextGranularity = 'WEEK';
        } else if (preset === 'YTD') {
            startObj.setMonth(0, 1);
            nextGranularity = 'MONTH';
        }

        setActivePreset(preset);
        setFromDate(toInputDateString(startObj));
        setToDate(end);
        setGranularity(nextGranularity);
    };

    const handleExport = async (format: ReportExportFormat) => {
        setExportingFormat(format);
        try {
            const fileName = await adminFinancialReportService.downloadExportFile(format, {
                fromDate,
                toDate,
                stationId,
                paymentKind,
                granularity,
            });
            const formatLabel =
                format === 'excel'
                    ? 'Excel Đa Sheet (.xls)'
                    : format === 'csv'
                    ? 'Sổ CSV UTF-8 (.csv)'
                    : 'Dữ liệu JSON (.json)';
            showToast(
                'success',
                `Đã xuất thành công chứng từ ${formatLabel}: ${fileName} (đã ghi vết vào Nhật ký hệ thống AuditLog).`
            );
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            showToast(
                'error',
                axiosErr.response?.data?.message || 'Lỗi khi kết xuất tệp báo cáo tài chính từ máy chủ.'
            );
        } finally {
            setExportingFormat(null);
        }
    };

    const handlePrintPdf = () => {
        window.print();
    };

    // Derived chart scales
    const timeSeries = report?.timeSeries ?? [];
    const maxRevenueInSeries = useMemo(() => {
        const m = Math.max(
            0,
            ...timeSeries.map((pt) => Math.max(pt.grossRevenue, pt.netRevenue, pt.refundAmount))
        );
        return m > 0 ? m : 100_000;
    }, [timeSeries]);

    const maxVolumeInSeries = useMemo(() => {
        const m = Math.max(0, ...timeSeries.map((pt) => pt.totalTransactions));
        return m > 0 ? m : 10;
    }, [timeSeries]);

    const selectedPoint: FinancialTimeSeriesPointDto | null = useMemo(() => {
        if (timeSeries.length === 0) return null;
        if (selectedPointIndex !== null && timeSeries[selectedPointIndex]) {
            return timeSeries[selectedPointIndex];
        }
        return timeSeries[timeSeries.length - 1];
    }, [timeSeries, selectedPointIndex]);

    const hourlyTraffic = report?.hourlyTraffic ?? [];
    const maxHourlyAttempts = useMemo(() => {
        const m = Math.max(0, ...hourlyTraffic.map((h) => h.totalAttemptCount));
        return m > 0 ? m : 5;
    }, [hourlyTraffic]);

    // Filtered Ledger Items
    const filteredLedgerItems = useMemo(() => {
        const list = report?.ledgerItems ?? [];
        const kw = ledgerSearch.trim().toLowerCase();
        return list.filter((item) => {
            if (ledgerStatusFilter !== 'ALL' && item.status !== ledgerStatusFilter) {
                return false;
            }
            if (!kw) return true;
            return (
                item.orderCode.toLowerCase().includes(kw) ||
                item.bookingCode.toLowerCase().includes(kw) ||
                item.customerName.toLowerCase().includes(kw) ||
                item.customerEmail.toLowerCase().includes(kw) ||
                item.stationName.toLowerCase().includes(kw) ||
                (item.gatewayTxnId && item.gatewayTxnId.toLowerCase().includes(kw))
            );
        });
    }, [report?.ledgerItems, ledgerSearch, ledgerStatusFilter]);

    const growthVal = report?.netRevenueGrowthPercent ?? 0;
    const isPositiveGrowth = growthVal >= 0;

    return (
        <div className="space-y-5 print:space-y-4">
            {/* Official Print-only Header Banner */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                            HỆ THỐNG TỦ ĐỒ THÔNG MINH SMARTLOCKER (SLMS)
                        </p>
                        <h1 className="text-xl font-black text-slate-900 mt-1">
                            BÁO CÁO DOANH THU TÀI CHÍNH & LƯU LƯỢNG GIAO DỊCH THANH TOÁN
                        </h1>
                        <p className="text-xs text-slate-600 mt-0.5">
                            Phạm vi: <strong>{report?.stationFilterLabel || 'Toàn hệ thống'}</strong> · Kỳ báo cáo:{' '}
                            <strong>{fromDate}</strong> đến <strong>{toDate}</strong>
                        </p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                        <p className="font-bold text-slate-800">Mẫu chứng từ: BC-TC-SLMS-A10</p>
                        <p>Ngày kết xuất: {formatDateTimeVi(report?.generatedAt || new Date().toISOString())}</p>
                        <p>Vai trò người xuất: {userRole.toUpperCase()}</p>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toastMessage && (
                <div
                    className={`rounded-2xl border px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs print:hidden ${
                        toastMessage.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{toastMessage.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setToastMessage(null)}
                        className="text-[11px] font-bold underline cursor-pointer shrink-0"
                    >
                        Đóng
                    </button>
                </div>
            )}

            {/* Top Header & Direct Export Action Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
                <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/25">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-extrabold text-slate-900">
                                Báo Cáo Doanh Thu Tài Chính & Lưu Lượng Thanh Toán
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                KẾ TOÁN & BI ANALYTICS
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                AUDIT TRACKED
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Tổng hợp động theo thời gian thực doanh thu gộp/thuần, trợ giá khuyến mại, phễu chuyển đổi giao dịch cổng PayOS VietQR Napas247 và xuất chứng từ kế toán đa định dạng.
                        </p>
                    </div>
                </div>

                {/* Export & Refresh Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => void fetchReport()}
                        disabled={isLoading}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Làm mới dữ liệu báo cáo"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => void handleExport('csv')}
                        disabled={exportingFormat !== null}
                        className="px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <FileText className="w-4 h-4" />
                        <span>{exportingFormat === 'csv' ? 'Đang xuất CSV...' : 'Xuất Sổ CSV'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={handlePrintPdf}
                        className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <Printer className="w-4 h-4" />
                        <span>In / Lưu PDF (A4)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => void handleExport('excel')}
                        disabled={exportingFormat !== null}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>
                            {exportingFormat === 'excel'
                                ? 'Đang tạo Workbook...'
                                : 'Xuất Báo Cáo Excel (4 Sheet)'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Multi-dimensional Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3.5 print:hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Quick Date Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            Kỳ nhanh:
                        </span>
                        {(
                            [
                                { id: 'TODAY', label: 'Hôm nay' },
                                { id: '7D', label: '7 ngày' },
                                { id: '30D', label: '30 ngày' },
                                { id: '90D', label: '90 ngày' },
                                { id: 'YTD', label: 'Năm nay (YTD)' },
                            ] as const
                        ).map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => applyDatePreset(p.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    activePreset === p.id
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Granularity Switcher */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 mr-1">Độ mịn chuỗi thời gian:</span>
                        {(
                            [
                                { id: 'DAY', label: 'Theo Ngày' },
                                { id: 'WEEK', label: 'Theo Tuần' },
                                { id: 'MONTH', label: 'Theo Tháng' },
                            ] as const
                        ).map((g) => (
                            <button
                                key={g.id}
                                type="button"
                                onClick={() => setGranularity(g.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                    granularity === g.id
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Date Inputs + Station + PaymentKind */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                            Từ ngày (00:00 ICT)
                        </label>
                        <input
                            type="date"
                            value={fromDate}
                            max={toDate}
                            onChange={(e) => {
                                setActivePreset('CUSTOM');
                                setFromDate(e.target.value);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                            Đến ngày (23:59 ICT)
                        </label>
                        <input
                            type="date"
                            value={toDate}
                            min={fromDate}
                            onChange={(e) => {
                                setActivePreset('CUSTOM');
                                setToDate(e.target.value);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            Phạm vi Trạm SmartLocker
                        </label>
                        <select
                            value={stationId}
                            onChange={(e) => setStationId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                            <option value="ALL">Toàn hệ thống trạm ({report?.stations.length ?? 0} trạm)</option>
                            {(report?.stations ?? []).map((st) => (
                                <option key={st.id} value={st.id}>
                                    {st.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <Filter className="w-3 h-3 text-slate-400" />
                            Nghiệp vụ dòng tiền
                        </label>
                        <select
                            value={paymentKind}
                            onChange={(e) => setPaymentKind(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                            <option value="ALL">Tất cả nghiệp vụ tài chính</option>
                            <option value="BASE">Thuê tủ cơ bản (BASE)</option>
                            <option value="EXTENSION">Gia hạn lưu trữ (EXTENSION)</option>
                            <option value="OVERDUE">Phụ phí quá hạn (OVERDUE)</option>
                            <option value="REFUND">Hoàn tiền khách hàng (REFUND)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Error Banner if API fails */}
            {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-semibold flex items-center justify-between">
                    <span>{errorMsg}</span>
                    <button
                        type="button"
                        onClick={() => void fetchReport()}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* ROW 1: 4 Primary Financial Revenue KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* 1. Net Revenue */}
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-4 text-white shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-100">
                            Doanh Thu Thuần Thực Nhận
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <p className="text-2xl font-black mt-2 tracking-tight">
                        {isLoading ? '...' : formatVnd(report?.netRevenue ?? 0)}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                                isPositiveGrowth
                                    ? 'bg-emerald-400/25 text-emerald-100'
                                    : 'bg-rose-400/25 text-rose-100'
                            }`}
                        >
                            {isPositiveGrowth ? (
                                <TrendingUp className="w-3 h-3" />
                            ) : (
                                <TrendingDown className="w-3 h-3" />
                            )}
                            {isPositiveGrowth ? '+' : ''}
                            {growthVal.toFixed(1)}% so kỳ liền trước
                        </span>
                        <span className="text-indigo-100/90 truncate" title="Doanh thu kỳ trước">
                            Kỳ trước: {formatCompactVnd(report?.previousPeriodNetRevenue ?? 0)}
                        </span>
                    </div>
                </div>

                {/* 2. Gross Revenue Breakdown */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Tổng Doanh Thu Gộp (Gross)
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                        {isLoading ? '...' : formatVnd(report?.grossRevenue ?? 0)}
                    </p>
                    <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[10px]">
                        <div className="bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
                            <span className="text-slate-400 block">Cơ bản</span>
                            <span className="font-bold text-slate-800">
                                {formatCompactVnd(report?.baseBookingRevenue ?? 0)}
                            </span>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
                            <span className="text-slate-400 block">Gia hạn</span>
                            <span className="font-bold text-indigo-700">
                                {formatCompactVnd(report?.extensionRevenue ?? 0)}
                            </span>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
                            <span className="text-slate-400 block">Quá hạn</span>
                            <span className="font-bold text-amber-700">
                                {formatCompactVnd(report?.overduePenaltyRevenue ?? 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Refunds & Voucher Subsidy */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Hoàn Tiền & Trợ Giá Voucher
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <RotateCcw className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-purple-700 mt-2 tracking-tight">
                        {isLoading ? '...' : formatVnd(report?.totalRefundedAmount ?? 0)}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                            Tỷ lệ hoàn:{' '}
                            <strong className="text-purple-700">
                                {(report?.refundRatePercent ?? 0).toFixed(2)}%
                            </strong>{' '}
                            ({report?.refundTransactionCount ?? 0} lệnh)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                            Voucher: {formatCompactVnd(report?.totalVoucherDiscountSubsidy ?? 0)}
                        </span>
                    </div>
                </div>

                {/* 4. AOV & Outstanding Overdue Receivable */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Giá Trị Đơn TB (AOV) & Công Nợ
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <CreditCard className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                        {isLoading ? '...' : formatVnd(report?.averageOrderValue ?? 0)}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Trên mỗi GD thành công</span>
                        <span className="text-amber-700 font-bold">
                            Nợ treo: {formatCompactVnd(report?.outstandingOverdueReceivable ?? 0)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ROW 2: Payment Transaction Volume & Gateway Funnel Strip */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 border-b sm:border-b-0 sm:border-r border-slate-100 pb-3 sm:pb-0 sm:pr-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">
                            Tổng lưu lượng lệnh PayOS
                        </p>
                        <p className="text-lg font-extrabold text-slate-900">
                            {report?.totalTransactions ?? 0}{' '}
                            <span className="text-xs font-semibold text-slate-500">giao dịch</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 border-b sm:border-b-0 xl:border-r border-slate-100 pb-3 sm:pb-0 xl:pr-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-slate-400 uppercase">
                                Tỷ lệ quét QR thành công
                            </p>
                            <span className="text-xs font-extrabold text-emerald-600">
                                {(report?.paymentSuccessRatePercent ?? 0).toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-sm font-extrabold text-slate-900">
                            {report?.paidTransactionCount ?? 0} lệnh PAID
                        </p>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{
                                    width: `${Math.min(100, Math.max(0, report?.paymentSuccessRatePercent ?? 0))}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 border-b sm:border-b-0 sm:border-r border-slate-100 pb-3 sm:pb-0 sm:pr-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">
                            Chờ quét / Hết hạn QR
                        </p>
                        <p className="text-sm font-extrabold text-slate-900">
                            <span className="text-amber-600">{report?.pendingTransactionCount ?? 0} chờ</span>
                            {' · '}
                            <span className="text-slate-500">
                                {report?.expiredOrFailedTransactionCount ?? 0} hủy/hết hạn
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">
                            Tốc độ TT & Giờ cao điểm
                        </p>
                        <p className="text-sm font-extrabold text-slate-900">
                            {report?.averagePaymentLatencySeconds ?? 0}s{' '}
                            <span className="text-xs font-semibold text-indigo-600">
                                · Đỉnh {report?.peakTrafficHourLabel || '—'}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Sub-navigation Tabs (Hidden when printing) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
                {(
                    [
                        {
                            id: 'TRENDS',
                            label: 'Biểu đồ Doanh thu & Lưu lượng 24h',
                            icon: BarChart3,
                        },
                        {
                            id: 'BREAKDOWN',
                            label: 'Xếp hạng Trạm & Cơ cấu Ngăn tủ',
                            icon: Layers,
                        },
                        {
                            id: 'LEDGER',
                            label: `Sổ Chi tiết Giao dịch (${report?.ledgerItems.length ?? 0})`,
                            icon: FileText,
                        },
                        {
                            id: 'EXPORT_CENTER',
                            label: 'Trung tâm Xuất Chứng từ Kế toán',
                            icon: Download,
                        },
                    ] as const
                ).map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                                active
                                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* =====================================================================
                TAB 1: REVENUE & TRANSACTION VOLUME TRENDS + 24H HOURLY TRAFFIC
               ===================================================================== */}
            {(activeTab === 'TRENDS' || false) && (
                <div className="space-y-5 print:hidden">
                    {/* Time-series Interactive Chart */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-extrabold text-slate-900">
                                    Diễn biến Chuỗi thời gian:{' '}
                                    {chartMode === 'REVENUE'
                                        ? 'Cơ cấu Doanh thu Gộp & Thuần (VND)'
                                        : 'Lưu lượng Giao dịch Thanh toán (Số lệnh)'}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Nhấp hoặc di chuột vào từng cột mốc thời gian để kiểm tra chi tiết số liệu bóc tách kế toán.
                                </p>
                            </div>

                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start">
                                <button
                                    type="button"
                                    onClick={() => setChartMode('REVENUE')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        chartMode === 'REVENUE'
                                            ? 'bg-white text-indigo-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Biểu đồ Doanh thu (VND)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChartMode('VOLUME')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        chartMode === 'VOLUME'
                                            ? 'bg-white text-indigo-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Lưu lượng Giao dịch
                                </button>
                            </div>
                        </div>

                        {/* Selected Period Inspector Strip */}
                        {selectedPoint && (
                            <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-extrabold">
                                        Kỳ {selectedPoint.label}
                                    </span>
                                    <span className="text-slate-600">
                                        Doanh thu thuần:{' '}
                                        <strong className="text-slate-900">
                                            {formatVnd(selectedPoint.netRevenue)}
                                        </strong>
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-[11px]">
                                    <span className="flex items-center gap-1.5 text-slate-600">
                                        <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                                        Cơ bản: <strong>{formatVnd(selectedPoint.baseRevenue)}</strong>
                                    </span>
                                    <span className="flex items-center gap-1.5 text-slate-600">
                                        <span className="w-2.5 h-2.5 rounded-xs bg-indigo-400 inline-block" />
                                        Gia hạn: <strong>{formatVnd(selectedPoint.extensionRevenue)}</strong>
                                    </span>
                                    <span className="flex items-center gap-1.5 text-slate-600">
                                        <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                                        Quá hạn: <strong>{formatVnd(selectedPoint.overdueRevenue)}</strong>
                                    </span>
                                    <span className="flex items-center gap-1.5 text-purple-700">
                                        <span className="w-2.5 h-2.5 rounded-xs bg-purple-500 inline-block" />
                                        Hoàn tiền: <strong>-{formatVnd(selectedPoint.refundAmount)}</strong>
                                    </span>
                                    <span className="text-emerald-700 font-bold">
                                        GD thành công: {selectedPoint.paidTransactions}/{selectedPoint.totalTransactions} lệnh
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Bar Chart Viewport */}
                        {timeSeries.length === 0 ? (
                            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                                Chưa có dữ liệu chuỗi thời gian cho bộ lọc đã chọn.
                            </div>
                        ) : (
                            <div className="pt-4 pb-2 overflow-x-auto">
                                <div
                                    className="h-60 flex items-end gap-1.5 min-w-[640px] border-b border-slate-200 pb-2 px-1"
                                >
                                    {timeSeries.map((pt, idx) => {
                                        const isSelected =
                                            (selectedPointIndex ?? timeSeries.length - 1) === idx;

                                        if (chartMode === 'REVENUE') {
                                            const basePct = (pt.baseRevenue / maxRevenueInSeries) * 100;
                                            const extPct = (pt.extensionRevenue / maxRevenueInSeries) * 100;
                                            const overPct = (pt.overdueRevenue / maxRevenueInSeries) * 100;
                                            const totalPct = Math.min(100, basePct + extPct + overPct);

                                            return (
                                                <button
                                                    key={pt.periodKey}
                                                    type="button"
                                                    onMouseEnter={() => setSelectedPointIndex(idx)}
                                                    onClick={() => setSelectedPointIndex(idx)}
                                                    className={`flex-1 min-w-[20px] h-full flex flex-col justify-end items-center group cursor-pointer rounded-t-lg px-0.5 transition ${
                                                        isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                                                    }`}
                                                    title={`${pt.label}: Doanh thu thuần ${formatVnd(pt.netRevenue)} (${pt.paidTransactions} GD PAID)`}
                                                >
                                                    <div
                                                        className="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all"
                                                        style={{
                                                            height: `${
                                                                pt.grossRevenue > 0
                                                                    ? Math.max(4, totalPct)
                                                                    : 2
                                                            }%`,
                                                        }}
                                                    >
                                                        {pt.grossRevenue > 0 ? (
                                                            <>
                                                                {pt.baseRevenue > 0 && (
                                                                    <div
                                                                        className="w-full bg-blue-600"
                                                                        style={{
                                                                            height: `${(pt.baseRevenue / pt.grossRevenue) * 100}%`,
                                                                        }}
                                                                    />
                                                                )}
                                                                {pt.extensionRevenue > 0 && (
                                                                    <div
                                                                        className="w-full bg-indigo-400"
                                                                        style={{
                                                                            height: `${(pt.extensionRevenue / pt.grossRevenue) * 100}%`,
                                                                        }}
                                                                    />
                                                                )}
                                                                {pt.overdueRevenue > 0 && (
                                                                    <div
                                                                        className="w-full bg-amber-500"
                                                                        style={{
                                                                            height: `${(pt.overdueRevenue / pt.grossRevenue) * 100}%`,
                                                                        }}
                                                                    />
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full bg-slate-200" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        }

                                        // VOLUME MODE
                                        const volPct = Math.min(
                                            100,
                                            (pt.totalTransactions / maxVolumeInSeries) * 100
                                        );
                                        return (
                                            <button
                                                key={pt.periodKey}
                                                type="button"
                                                onMouseEnter={() => setSelectedPointIndex(idx)}
                                                onClick={() => setSelectedPointIndex(idx)}
                                                className={`flex-1 min-w-[20px] h-full flex flex-col justify-end items-center group cursor-pointer rounded-t-lg px-0.5 transition ${
                                                    isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                                                }`}
                                                title={`${pt.label}: Tổng ${pt.totalTransactions} lệnh (${pt.paidTransactions} PAID)`}
                                            >
                                                <div
                                                    className="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all"
                                                    style={{
                                                        height: `${
                                                            pt.totalTransactions > 0 ? Math.max(5, volPct) : 2
                                                        }%`,
                                                    }}
                                                >
                                                    {pt.totalTransactions > 0 ? (
                                                        <>
                                                            {pt.paidTransactions > 0 && (
                                                                <div
                                                                    className="w-full bg-emerald-500"
                                                                    style={{
                                                                        height: `${(pt.paidTransactions / pt.totalTransactions) * 100}%`,
                                                                    }}
                                                                />
                                                            )}
                                                            {pt.refundTransactions > 0 && (
                                                                <div
                                                                    className="w-full bg-purple-500"
                                                                    style={{
                                                                        height: `${(pt.refundTransactions / pt.totalTransactions) * 100}%`,
                                                                    }}
                                                                />
                                                            )}
                                                            {pt.failedOrExpiredTransactions > 0 && (
                                                                <div
                                                                    className="w-full bg-slate-300"
                                                                    style={{
                                                                        height: `${(pt.failedOrExpiredTransactions / pt.totalTransactions) * 100}%`,
                                                                    }}
                                                                />
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-200" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* X-Axis Labels */}
                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-2 min-w-[640px] px-1">
                                    <span>{timeSeries[0]?.label}</span>
                                    {timeSeries.length > 4 && (
                                        <span>{timeSeries[Math.floor(timeSeries.length / 2)]?.label}</span>
                                    )}
                                    <span>{timeSeries[timeSeries.length - 1]?.label}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 24-Hour Payment Volume Heatmap / Bar Distribution */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-extrabold text-slate-900">
                                    Phân Bố Lưu Lượng Giao Dịch Thanh Toán Theo 24 Khung Giờ (Múi giờ Việt Nam UTC+7)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Giúp bộ phận Vận hành & Kỹ thuật nhận diện giờ cao điểm quét VietQR để tối ưu băng thông cổng PayOS và trực hỗ trợ trạm.
                                </p>
                            </div>
                            <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold self-start">
                                Khung giờ đỉnh: {report?.peakTrafficHourLabel || '—'}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="grid grid-cols-24 gap-1.5 min-w-[680px] h-40 items-end pt-4 pb-2 border-b border-slate-100">
                                {hourlyTraffic.map((h) => {
                                    const pct =
                                        h.totalAttemptCount > 0
                                            ? Math.max(8, (h.totalAttemptCount / maxHourlyAttempts) * 100)
                                            : 3;
                                    const isPeak =
                                        h.totalAttemptCount > 0 &&
                                        h.totalAttemptCount === maxHourlyAttempts;
                                    return (
                                        <div
                                            key={h.hour}
                                            className="h-full flex flex-col justify-end items-center gap-1 group"
                                            title={`${h.hourLabel}: ${h.totalAttemptCount} lệnh tạo (${h.paidCount} PAID · ${formatVnd(h.paidVolumeAmount)})`}
                                        >
                                            <span className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition">
                                                {h.totalAttemptCount}
                                            </span>
                                            <div className="w-full h-full flex items-end justify-center">
                                                <div
                                                    className={`w-full max-w-[18px] rounded-t-md transition-all ${
                                                        isPeak
                                                            ? 'bg-indigo-600 shadow-xs'
                                                            : h.paidCount > 0
                                                            ? 'bg-emerald-500/85 hover:bg-emerald-600'
                                                            : h.totalAttemptCount > 0
                                                            ? 'bg-amber-400'
                                                            : 'bg-slate-100'
                                                    }`}
                                                    style={{ height: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-[9px] font-semibold text-slate-400">
                                                {String(h.hour).padStart(2, '0')}h
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================================
                TAB 2 (AND ALWAYS INCLUDED IN PRINT): STATION, SIZE & KIND BREAKDOWN
               ===================================================================== */}
            <div className={activeTab === 'BREAKDOWN' ? 'space-y-5' : 'hidden print:block print:space-y-4'}>
                {/* Station Financial Ranking Table */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-extrabold text-slate-900">
                                Bảng Xếp Hạng Doanh Thu & Tỷ Lệ Thanh Toán Theo Trạm SmartLocker
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                So sánh đóng góp doanh thu thuần, lưu lượng đơn và tỷ lệ chuyển đổi thanh toán giữa các điểm đặt trạm.
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                                    <th className="py-3 px-4">#</th>
                                    <th className="py-3 px-4">Trạm SmartLocker</th>
                                    <th className="py-3 px-3 text-right">Đơn đặt</th>
                                    <th className="py-3 px-3 text-right">GD PAID / Tổng</th>
                                    <th className="py-3 px-3 text-right">Doanh thu Gộp</th>
                                    <th className="py-3 px-3 text-right">Hoàn tiền</th>
                                    <th className="py-3 px-4 text-right">Doanh thu Thuần</th>
                                    <th className="py-3 px-4">Tỷ trọng Đóng góp</th>
                                    <th className="py-3 px-4 text-right">Tỷ lệ TT</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(report?.stationBreakdown ?? []).length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-8 text-center text-slate-400">
                                            Chưa có dữ liệu trạm trong kỳ báo cáo.
                                        </td>
                                    </tr>
                                ) : (
                                    (report?.stationBreakdown ?? []).map((st, index) => (
                                        <tr key={st.stationId} className="hover:bg-slate-50/70 transition">
                                            <td className="py-3 px-4 font-extrabold text-slate-400">
                                                #{index + 1}
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="font-bold text-slate-900">{st.stationName}</p>
                                                <p className="text-[11px] text-slate-400 truncate max-w-xs">
                                                    {st.address}
                                                </p>
                                            </td>
                                            <td className="py-3 px-3 text-right font-semibold text-slate-700">
                                                {st.totalBookings}
                                            </td>
                                            <td className="py-3 px-3 text-right font-semibold text-slate-700">
                                                <span className="text-emerald-700 font-bold">
                                                    {st.paidTransactions}
                                                </span>{' '}
                                                / {st.totalTransactions}
                                            </td>
                                            <td className="py-3 px-3 text-right font-semibold text-slate-800">
                                                {formatVnd(st.grossRevenue)}
                                            </td>
                                            <td className="py-3 px-3 text-right font-semibold text-purple-700">
                                                {st.refundAmount > 0 ? `-${formatVnd(st.refundAmount)}` : '0đ'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-extrabold text-indigo-700">
                                                {formatVnd(st.netRevenue)}
                                            </td>
                                            <td className="py-3 px-4 min-w-[140px]">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-600 rounded-full"
                                                            style={{
                                                                width: `${Math.min(100, st.revenueSharePercent)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-700 w-11 text-right">
                                                        {st.revenueSharePercent.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {st.paymentSuccessRatePercent.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Locker Size Breakdown & Payment Kind Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Locker Size S / M / L */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                        <div>
                            <h3 className="text-sm font-extrabold text-slate-900">
                                Cơ Cấu Doanh Thu Gộp Theo Kích Cỡ Ngăn Tủ (S / M / L)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Đánh giá hiệu quả khai thác thương mại của từng phân khúc kích thước ô tủ vật lý.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {(report?.sizeBreakdown ?? []).map((sz) => (
                                <div
                                    key={sz.size}
                                    className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-extrabold text-slate-800">
                                            {sz.sizeLabel}
                                        </span>
                                        <span className="text-xs font-black text-indigo-700">
                                            {formatVnd(sz.grossRevenue)} ({sz.revenueSharePercent.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 rounded-full"
                                            style={{ width: `${Math.min(100, sz.revenueSharePercent)}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                                        <span>Số giao dịch PAID: {sz.paidTransactions} lệnh</span>
                                        <span>Đơn giá bình quân: {formatVnd(sz.averageTicket)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Kind Breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                        <div>
                            <h3 className="text-sm font-extrabold text-slate-900">
                                Bóc Tách Dòng Tiền Theo Nghiệp Vụ Thanh Toán
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Phân tách tỷ trọng thu cước thuê mới, phí gia hạn thêm giờ, phí phạt quá hạn và chi hoàn tiền.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {(report?.kindBreakdown ?? []).map((kb) => {
                                const badge = getKindBadge(kb.kind);
                                return (
                                    <div
                                        key={kb.kind}
                                        className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-3"
                                    >
                                        <div className="space-y-1">
                                            <span
                                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${badge.cls}`}
                                            >
                                                {kb.kind}
                                            </span>
                                            <p className="text-xs font-bold text-slate-800">{kb.kindLabel}</p>
                                            <p className="text-[11px] text-slate-500">
                                                 Khối lượng: <strong>{kb.transactionCount}</strong> giao dịch hoàn tất
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p
                                                className={`text-sm font-black ${
                                                    kb.kind === 'REFUND'
                                                        ? 'text-purple-700'
                                                        : 'text-slate-900'
                                                }`}
                                            >
                                                {kb.kind === 'REFUND' && kb.totalAmount > 0 ? '-' : ''}
                                                {formatVnd(kb.totalAmount)}
                                            </p>
                                            {kb.kind !== 'REFUND' && (
                                                <span className="text-[11px] font-bold text-emerald-700">
                                                    {kb.sharePercent.toFixed(1)}% DT Gộp
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* =====================================================================
                TAB 3: DETAILED FINANCIAL TRANSACTION LEDGER
               ===================================================================== */}
            {activeTab === 'LEDGER' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden print:hidden">
                    <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-extrabold text-slate-900">
                                Sổ Chi Tiết Giao Dịch Tài Chính Trong Kỳ ({filteredLedgerItems.length} dòng)
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Đối chiếu trực tiếp từng chứng từ <code className="font-mono">OrderCode</code>, mã tham chiếu ngân hàng Napas247 và tác động ròng vào quỹ doanh thu.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={ledgerSearch}
                                    onChange={(e) => setLedgerSearch(e.target.value)}
                                    placeholder="Tìm OrderCode, Booking, tên KH, mã FT..."
                                    className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                />
                            </div>

                            <select
                                value={ledgerStatusFilter}
                                onChange={(e) => setLedgerStatusFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                            >
                                <option value="ALL">Mọi trạng thái ({report?.ledgerItems.length ?? 0})</option>
                                <option value="PAID">Đã thanh toán (PAID)</option>
                                <option value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
                                <option value="PENDING">Đang chờ quét (PENDING)</option>
                                <option value="EXPIRED">Hết hạn / Hủy (EXPIRED)</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[540px]">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                                <tr className="text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                    <th className="py-3 px-4">OrderCode / Ngân hàng</th>
                                    <th className="py-3 px-3">Mã Đặt Tủ & Trạm</th>
                                    <th className="py-3 px-3">Khách hàng</th>
                                    <th className="py-3 px-3">Nghiệp vụ</th>
                                    <th className="py-3 px-3">Trạng thái</th>
                                    <th className="py-3 px-3">Thời gian Tạo / Tất toán</th>
                                    <th className="py-3 px-4 text-right">Giá trị GD</th>
                                    <th className="py-3 px-4 text-right">Tác động Thuần</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLedgerItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-10 text-center text-slate-400">
                                            Không tìm thấy giao dịch nào khớp điều kiện lọc trong kỳ này.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLedgerItems.map((row) => {
                                        const kindMeta = getKindBadge(row.kind);
                                        const statusMeta = getStatusBadge(row.status);
                                        return (
                                            <tr key={row.paymentId} className="hover:bg-slate-50/80 transition">
                                                <td className="py-3 px-4">
                                                    <p className="font-mono font-bold text-slate-900">
                                                        #{row.orderCode}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-mono">
                                                        {row.gateway} · {row.gatewayTxnId || 'Chưa có mã FT'}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <p className="font-bold text-indigo-700">{row.bookingCode}</p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {row.stationName} · Tủ {row.lockerSize}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <p className="font-semibold text-slate-800">
                                                        {row.customerName}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {row.customerEmail}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${kindMeta.cls}`}
                                                    >
                                                        {kindMeta.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.cls}`}
                                                    >
                                                        {statusMeta.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-[11px] text-slate-600">
                                                    <p>Tạo: {formatDateTimeVi(row.createdAt)}</p>
                                                    {row.settledAt && (
                                                        <p className="text-emerald-700 font-semibold">
                                                            Tất toán: {formatDateTimeVi(row.settledAt)}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-slate-800">
                                                    {formatVnd(row.amount)}
                                                </td>
                                                <td className="py-3 px-4 text-right font-extrabold">
                                                    {row.signedNetImpact > 0 ? (
                                                        <span className="text-emerald-600">
                                                            +{formatVnd(row.signedNetImpact)}
                                                        </span>
                                                    ) : row.signedNetImpact < 0 ? (
                                                        <span className="text-purple-700">
                                                            {formatVnd(row.signedNetImpact)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">0đ</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* =====================================================================
                TAB 4: ACCOUNTING EXPORT CENTER & CROSS-MODULE RECONCILIATION LINKS
               ===================================================================== */}
            {activeTab === 'EXPORT_CENTER' && (
                <div className="space-y-5 print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Format 1: 4-Sheet Excel Workbook */}
                        <div className="bg-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase">
                                        KHUYÊN DÙNG CHO KẾ TOÁN TRƯỞNG
                                    </span>
                                    <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    1. Sổ Báo Cáo Kế Toán Excel Đa Sheet (.xls)
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Tệp SpreadsheetML chuẩn Microsoft Excel gồm <strong>4 trang tính (Worksheets)</strong> tự động căn chỉnh định dạng tiền tệ VND:
                                </p>
                                <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                                    <li>
                                        <code>1_TongHop_TaiChinh</code>: Tổng hợp Doanh thu Gộp, Hoàn tiền, Trợ giá Voucher, Doanh thu Thuần & Phễu giao dịch.
                                    </li>
                                    <li>
                                        <code>2_ChuoiThoiGian</code>: Bảng kê doanh thu & lưu lượng theo từng Ngày / Tuần / Tháng.
                                    </li>
                                    <li>
                                        <code>3_DoanhThu_TheoTram</code>: Hiệu quả khai thác & tỷ trọng doanh thu từng Trạm tủ.
                                    </li>
                                    <li>
                                        <code>4_SoChiTiet_GiaoDich</code>: Toàn bộ bút toán giao dịch kèm mã tham chiếu ngân hàng PayOS.
                                    </li>
                                </ul>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleExport('excel')}
                                disabled={exportingFormat !== null}
                                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>
                                    {exportingFormat === 'excel'
                                        ? 'Đang kết xuất sổ Excel 4 Sheet...'
                                        : 'Tải Xuống Báo Cáo Excel Đa Sheet (.xls)'}
                                </span>
                            </button>
                        </div>

                        {/* Format 2: UTF-8 BOM CSV */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase">
                                        CHUẨN NHẬP LIỆU MISA / ERP
                                    </span>
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    2. Sổ Cái Giao Dịch Chuẩn CSV UTF-8 BOM (.csv)
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Đính kèm mã <strong>UTF-8 Byte-Order Mark</strong> giúp mở trực tiếp trên Excel Windows/macOS không bị lỗi dấu tiếng Việt. Phù hợp để import hàng loạt vào phần mềm kế toán doanh nghiệp hoặc đối chiếu sao kê ngân hàng.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleExport('csv')}
                                disabled={exportingFormat !== null}
                                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>
                                    {exportingFormat === 'csv'
                                        ? 'Đang tạo tệp CSV...'
                                        : 'Tải Xuống Sổ Giao Dịch CSV (.csv)'}
                                </span>
                            </button>
                        </div>

                        {/* Format 3: Printable A4 Statement / PDF */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold uppercase">
                                        CHỨNG TỪ KÝ DUYỆT LƯU TRỮ
                                    </span>
                                    <Printer className="w-6 h-6 text-indigo-600" />
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    3. Biểu Mẫu Báo Cáo Tài Chính A4 / Lưu PDF
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Tự động dàn trang khổ giấy A4 tiêu chuẩn kèm Quốc hiệu/Tiêu đề đơn vị, bảng tổng hợp KPI tài chính, bảng xếp hạng doanh thu trạm và khung chữ ký xác nhận 3 cấp (Người lập biểu · Kế toán đối soát · Quản trị viên phê duyệt).
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handlePrintPdf}
                                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Mở Cửa Sổ In Chứng Từ A4 / Lưu PDF</span>
                            </button>
                        </div>

                        {/* Format 4: Structured JSON Snapshot */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold uppercase">
                                        TÍCH HỢP DATA WAREHOUSE / AUDIT
                                    </span>
                                    <FileJson className="w-6 h-6 text-slate-700" />
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    4. Bản Chụp Dữ Liệu Cấu Trúc JSON (.json)
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Xuất toàn bộ cây dữ liệu phân tích tài chính, chuỗi thời gian, lưu lượng 24h và sổ chi tiết giao dịch dưới chuẩn JSON để lưu trữ kiểm toán độc lập hoặc nạp vào PowerBI / Looker Studio.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleExport('json')}
                                disabled={exportingFormat !== null}
                                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>
                                    {exportingFormat === 'json'
                                        ? 'Đang đóng gói JSON...'
                                        : 'Tải Xuống Dữ Liệu Chuẩn JSON (.json)'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Related Financial Workflows Bar */}
                    <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                                Liên thông Nghiệp vụ Kiểm soát Tài chính Nội bộ
                            </p>
                            <p className="text-xs text-slate-300 mt-1">
                                Mọi thao tác kết xuất báo cáo doanh thu đều được tự động ghi nhận mã hành động{' '}
                                <code className="text-emerald-300 font-mono">EXPORT_FINANCIAL_REPORT</code> vào Nhật ký An ninh bất biến.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {onNavigateReconciliation && (
                                <button
                                    type="button"
                                    onClick={onNavigateReconciliation}
                                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <span>Đối soát PayOS</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {onNavigateManualRefunds && (
                                <button
                                    type="button"
                                    onClick={onNavigateManualRefunds}
                                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <span>Duyệt hoàn tiền ngoại lệ</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {onNavigateAudit && (
                                <button
                                    type="button"
                                    onClick={onNavigateAudit}
                                    className="px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <span>Xem vết Audit xuất báo cáo</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Official Print-only Signature Block */}
            <div className="hidden print:grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-slate-300 text-center text-xs">
                <div>
                    <p className="font-bold text-slate-900 uppercase">Người lập biểu</p>
                    <p className="text-[11px] text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
                    <div className="h-20" />
                </div>
                <div>
                    <p className="font-bold text-slate-900 uppercase">Kế toán đối soát</p>
                    <p className="text-[11px] text-slate-500 italic">(Ký, kiểm tra sao kê PayOS)</p>
                    <div className="h-20" />
                </div>
                <div>
                    <p className="font-bold text-slate-900 uppercase">Quản trị viên phê duyệt</p>
                    <p className="text-[11px] text-slate-500 italic">(Ký, đóng dấu xác nhận)</p>
                    <div className="h-20" />
                </div>
            </div>
        </div>
    );
}
