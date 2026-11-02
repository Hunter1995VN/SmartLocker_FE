/**
 * UC-A13: Phân tích tỷ lệ lấp đầy (Occupancy Rate) và tần suất xoay vòng ngăn tủ (Locker Turnover)
 * Đo lường công suất lấp đầy theo giờ thực tế (Locker-Hours), hệ số xoay vòng từng ngăn tủ,
 * thời gian lưu trữ & chờ khách trung bình, chỉ số RevPAL/RevPOLH, chẩn đoán quá tải trạm và xuất báo cáo đa định dạng.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Activity,
    BarChart3,
    Box,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    FileJson,
    FileSpreadsheet,
    FileText,
    Flame,
    Gauge,
    Layers,
    Printer,
    RefreshCw,
    RotateCw,
    Search,
    ShieldCheck,
    Snowflake,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Wrench,
    ArrowUpRight,
} from 'lucide-react';
import adminOccupancyAnalyticsService from '../../../api/adminOccupancyAnalyticsService';
import type {
    OccupancyTurnoverOverviewDto,
    OccupancyTimeSeriesPointDto,
    LockerSizeFilterType,
} from '../../../api/adminOccupancyAnalyticsService';
import type { ReportGranularity, ReportExportFormat } from '../../../api/adminFinancialReportService';

interface OccupancyTurnoverAnalyticsViewProps {
    userRole?: string;
    onNavigateLockers?: () => void;
    onNavigatePromotions?: () => void;
    onNavigateFinancialReports?: () => void;
    onNavigateAudit?: () => void;
}

type OccupancyTabKey = 'TRENDS_AND_HEATMAP' | 'STATION_AND_SIZE' | 'LOCKER_UNITS' | 'EXPORT_CENTER';
type TrendMetricMode = 'OCCUPANCY' | 'TURNOVER';

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

const getCapacityBadge = (status: string) => {
    switch (status) {
        case 'OVERLOADED':
            return {
                label: 'Quá tải (>80%)',
                cls: 'bg-rose-50 text-rose-700 border-rose-200',
            };
        case 'OPTIMAL':
            return {
                label: 'Tối ưu (45-80%)',
                cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            };
        case 'MODERATE':
            return {
                label: 'Trung bình',
                cls: 'bg-blue-50 text-blue-700 border-blue-200',
            };
        default:
            return {
                label: 'Dư công suất',
                cls: 'bg-amber-50 text-amber-700 border-amber-200',
            };
    }
};

const getTierBadge = (tier: string) => {
    switch (tier) {
        case 'HOT':
            return {
                label: 'HOT · Xoay vòng cao',
                cls: 'bg-orange-50 text-orange-700 border-orange-200',
                Icon: Flame,
            };
        case 'OPTIMAL':
            return {
                label: 'OPTIMAL · Hiệu quả',
                cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                Icon: CheckCircle2,
            };
        case 'COLD':
            return {
                label: 'COLD · Ít lượt thuê',
                cls: 'bg-sky-50 text-sky-700 border-sky-200',
                Icon: Snowflake,
            };
        case 'MAINTENANCE':
            return {
                label: 'MAINT · Ngưng khai thác',
                cls: 'bg-rose-50 text-rose-700 border-rose-200',
                Icon: Wrench,
            };
        default:
            return {
                label: 'IDLE · Chưa phát sinh',
                cls: 'bg-slate-100 text-slate-600 border-slate-200',
                Icon: Box,
            };
    }
};

export default function OccupancyTurnoverAnalyticsView({
    userRole = 'ADMIN',
    onNavigateLockers,
    onNavigatePromotions,
    onNavigateFinancialReports,
    onNavigateAudit,
}: OccupancyTurnoverAnalyticsViewProps) {
    // Filter States (Default: 30 days)
    const [fromDate, setFromDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        return toInputDateString(d);
    });
    const [toDate, setToDate] = useState<string>(() => toInputDateString(new Date()));
    const [granularity, setGranularity] = useState<ReportGranularity>('DAY');
    const [stationId, setStationId] = useState<string>('ALL');
    const [lockerSize, setLockerSize] = useState<LockerSizeFilterType>('ALL');
    const [activePreset, setActivePreset] = useState<string>('30D');

    // UI States
    const [activeTab, setActiveTab] = useState<OccupancyTabKey>('TRENDS_AND_HEATMAP');
    const [chartMode, setChartMode] = useState<TrendMetricMode>('OCCUPANCY');
    const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
    const [unitSearch, setUnitSearch] = useState<string>('');
    const [unitTierFilter, setUnitTierFilter] = useState<string>('ALL');

    // Data & Loading States
    const [data, setData] = useState<OccupancyTurnoverOverviewDto | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [exportingFormat, setExportingFormat] = useState<ReportExportFormat | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const showToast = useCallback((type: 'success' | 'error', text: string) => {
        setToast({ type, text });
        window.setTimeout(() => {
            setToast((prev) => (prev?.text === text ? null : prev));
        }, 5000);
    }, []);

    const fetchOverview = useCallback(async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await adminOccupancyAnalyticsService.getOverview({
                fromDate,
                toDate,
                stationId,
                lockerSize,
                granularity,
            });
            if (res.success && res.data) {
                setData(res.data);
                setSelectedPointIdx(
                    res.data.timeSeries.length > 0 ? res.data.timeSeries.length - 1 : null
                );
            } else {
                setErrorMsg(res.message || 'Không thể tải dữ liệu phân tích lấp đầy & xoay vòng ngăn tủ.');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setErrorMsg(
                axiosErr.response?.data?.message ||
                    'Không thể kết nối máy chủ phân tích hiệu suất ngăn tủ. Vui lòng kiểm tra Backend API.'
            );
        } finally {
            setIsLoading(false);
        }
    }, [fromDate, toDate, stationId, lockerSize, granularity]);

    useEffect(() => {
        void fetchOverview();
    }, [fetchOverview]);

    const applyPreset = (preset: 'TODAY' | '7D' | '30D' | '90D' | 'YTD') => {
        const now = new Date();
        const end = toInputDateString(now);
        const startObj = new Date(now);
        let nextGran: ReportGranularity = granularity;

        if (preset === 'TODAY') {
            nextGran = 'DAY';
        } else if (preset === '7D') {
            startObj.setDate(now.getDate() - 6);
            nextGran = 'DAY';
        } else if (preset === '30D') {
            startObj.setDate(now.getDate() - 29);
            nextGran = 'DAY';
        } else if (preset === '90D') {
            startObj.setDate(now.getDate() - 89);
            nextGran = 'WEEK';
        } else if (preset === 'YTD') {
            startObj.setMonth(0, 1);
            nextGran = 'MONTH';
        }

        setActivePreset(preset);
        setFromDate(toInputDateString(startObj));
        setToDate(end);
        setGranularity(nextGran);
    };

    const handleExport = async (format: ReportExportFormat) => {
        setExportingFormat(format);
        try {
            const fileName = await adminOccupancyAnalyticsService.downloadExportFile(format, {
                fromDate,
                toDate,
                stationId,
                lockerSize,
                granularity,
            });
            const label =
                format === 'excel'
                    ? 'Sổ Excel 4 Sheet (.xls)'
                    : format === 'csv'
                    ? 'Tệp CSV UTF-8 (.csv)'
                    : 'Dữ liệu JSON (.json)';
            showToast(
                'success',
                `Đã kết xuất báo cáo công suất & vòng quay tủ (${label}): ${fileName} — Đã ghi vết AuditLog.`
            );
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            showToast(
                'error',
                axiosErr.response?.data?.message || 'Lỗi khi kết xuất tệp báo cáo lấp đầy ngăn tủ.'
            );
        } finally {
            setExportingFormat(null);
        }
    };

    const timeSeries = data?.timeSeries ?? [];
    const maxOccupancyInSeries = useMemo(() => {
        const m = Math.max(25, ...timeSeries.map((p) => p.occupancyRatePercent));
        return Math.min(100, m);
    }, [timeSeries]);

    const maxCyclesInSeries = useMemo(() => {
        const m = Math.max(1, ...timeSeries.map((p) => p.totalCycles));
        return m;
    }, [timeSeries]);

    const selectedPoint: OccupancyTimeSeriesPointDto | null = useMemo(() => {
        if (timeSeries.length === 0) return null;
        if (selectedPointIdx !== null && timeSeries[selectedPointIdx]) {
            return timeSeries[selectedPointIdx];
        }
        return timeSeries[timeSeries.length - 1];
    }, [timeSeries, selectedPointIdx]);

    const hourlyProfile = data?.hourlyProfile ?? [];
    const maxHourlyOcc = useMemo(() => {
        const m = Math.max(15, ...hourlyProfile.map((h) => h.estimatedOccupancyPercent));
        return Math.min(100, m);
    }, [hourlyProfile]);

    const filteredUnits = useMemo(() => {
        const list = data?.lockerTurnoverItems ?? [];
        const kw = unitSearch.trim().toLowerCase();
        return list.filter((u) => {
            if (unitTierFilter !== 'ALL' && u.utilizationTier !== unitTierFilter) return false;
            if (!kw) return true;
            return (
                u.lockerCode.toLowerCase().includes(kw) ||
                u.stationName.toLowerCase().includes(kw) ||
                u.businessStatus.toLowerCase().includes(kw)
            );
        });
    }, [data?.lockerTurnoverItems, unitSearch, unitTierFilter]);

    const occDelta = data?.occupancyDeltaPercent ?? 0;
    const cyclesGrowth = data?.cyclesGrowthPercent ?? 0;

    const totalFleet = data?.totalPhysicalLockers ?? 0;
    const availPctLive = totalFleet > 0 ? ((data?.availableNowLockers ?? 0) / totalFleet) * 100 : 0;
    const occPctLive = totalFleet > 0 ? ((data?.occupiedNowLockers ?? 0) / totalFleet) * 100 : 0;
    const resPctLive = totalFleet > 0 ? ((data?.reservedNowLockers ?? 0) / totalFleet) * 100 : 0;
    const outPctLive = totalFleet > 0 ? ((data?.outOfServiceLockers ?? 0) / totalFleet) * 100 : 0;

    return (
        <div className="space-y-5 print:space-y-4">
            {/* Print-only Header */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                            HỆ THỐNG QUẢN TRỊ VẬN HÀNH TỦ THÔNG MINH SMARTLOCKER (SLMS)
                        </p>
                        <h1 className="text-xl font-black text-slate-900 mt-1">
                            BÁO CÁO PHÂN TÍCH TỶ LỆ LẤP ĐẦY & TẦN SUẤT XOAY VÒNG NGĂN TỦ
                        </h1>
                        <p className="text-xs text-slate-600 mt-0.5">
                            Phạm vi: <strong>{data?.stationFilterLabel || 'Toàn mạng lưới'}</strong> · Cỡ tủ:{' '}
                            <strong>{lockerSize}</strong> · Kỳ: <strong>{fromDate}</strong> đến{' '}
                            <strong>{toDate}</strong>
                        </p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                        <p className="font-bold text-slate-800">Mã báo cáo: BC-CS-SLMS-A13</p>
                        <p>Kết xuất lúc: {formatDateTimeVi(data?.generatedAt || new Date().toISOString())}</p>
                        <p>Vai trò: {userRole.toUpperCase()}</p>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div
                    className={`rounded-2xl border px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs print:hidden ${
                        toast.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{toast.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        className="text-[11px] font-bold underline cursor-pointer shrink-0"
                    >
                        Đóng
                    </button>
                </div>
            )}

            {/* Header & Export Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
                <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-teal-600/25">
                        <Gauge className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-extrabold text-slate-900">
                                Phân Tích Tỷ Lệ Lấp Đầy & Tần Suất Xoay Vòng Ngăn Tủ
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                                OCCUPANCY & TURNOVER
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                LOCKER-HOURS CHUẨN HÓA
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Đo lường công suất lấp đầy thực tế theo giờ-tủ (<code className="font-mono">Locker-Hours</code>), tốc độ luân chuyển lượt thuê trên từng khoang tủ, thời gian trống chờ khách và hiệu quả doanh thu <code className="font-mono">RevPAL</code>.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => void fetchOverview()}
                        disabled={isLoading}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
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
                        <span>{exportingFormat === 'csv' ? 'Đang xuất CSV...' : 'Xuất CSV'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <Printer className="w-4 h-4" />
                        <span>In / Lưu PDF (A4)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => void handleExport('excel')}
                        disabled={exportingFormat !== null}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-teal-600/20 transition cursor-pointer"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>
                            {exportingFormat === 'excel'
                                ? 'Đang tạo Excel...'
                                : 'Xuất Báo Cáo Excel (4 Sheet)'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3.5 print:hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Quick Date Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            Kỳ phân tích:
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
                                onClick={() => applyPreset(p.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    activePreset === p.id
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Granularity Switcher */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 mr-1">Chu kỳ gom nhóm:</span>
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

                {/* Date Inputs + Station + Locker Size */}
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
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
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
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            Trạm SmartLocker
                        </label>
                        <select
                            value={stationId}
                            onChange={(e) => setStationId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        >
                            <option value="ALL">Toàn mạng lưới ({data?.stations.length ?? 0} trạm)</option>
                            {(data?.stations ?? []).map((st) => (
                                <option key={st.id} value={st.id}>
                                    {st.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                            Phân khúc Kích cỡ Ngăn tủ
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                            {(
                                [
                                    { id: 'ALL', label: 'Tất cả' },
                                    { id: 'S', label: 'Size S' },
                                    { id: 'M', label: 'Size M' },
                                    { id: 'L', label: 'Size L' },
                                ] as const
                            ).map((sz) => (
                                <button
                                    key={sz.id}
                                    type="button"
                                    onClick={() => setLockerSize(sz.id)}
                                    className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                        lockerSize === sz.id
                                            ? 'bg-teal-600 text-white border-teal-600'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {sz.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-xs font-semibold flex items-center justify-between">
                    <span>{errorMsg}</span>
                    <button
                        type="button"
                        onClick={() => void fetchOverview()}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {/* ROW 1: 4 Primary Occupancy & Locker Turnover KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* 1. Time-Weighted Occupancy Rate */}
                <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-4 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-100">
                            Tỷ Lệ Lấp Đầy Theo Giờ (Occupancy)
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                            <Gauge className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <p className="text-2xl font-black mt-2 tracking-tight">
                        {isLoading ? '...' : `${(data?.timeWeightedOccupancyPercent ?? 0).toFixed(2)}%`}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                                occDelta >= 0
                                    ? 'bg-white/20 text-white'
                                    : 'bg-rose-500/35 text-rose-100'
                            }`}
                        >
                            {occDelta >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                            ) : (
                                <TrendingDown className="w-3 h-3" />
                            )}
                            {occDelta >= 0 ? '+' : ''}
                            {occDelta.toFixed(2)} đ% so kỳ trước
                        </span>
                        <span className="text-teal-100 truncate">
                            {(data?.totalOccupiedLockerHours ?? 0).toLocaleString('vi-VN')} giờ-tủ
                        </span>
                    </div>
                </div>

                {/* 2. Locker Turnover Frequency */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Tần Suất Xoay Vòng Ngăn Tủ
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <RotateCw className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                            {isLoading ? '...' : (data?.periodTurnoverPerLocker ?? 0).toFixed(2)}
                        </p>
                        <span className="text-xs font-bold text-blue-700">vòng / tủ (trong kỳ)</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                            TB ngày:{' '}
                            <strong className="text-slate-800">
                                {(data?.dailyTurnoverRate ?? 0).toFixed(3)} vòng/ngày
                            </strong>
                        </span>
                        <span
                            className={`font-bold ${
                                cyclesGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                        >
                            {data?.totalCompletedAndActiveCycles ?? 0} lượt ({cyclesGrowth >= 0 ? '+' : ''}
                            {cyclesGrowth.toFixed(1)}%)
                        </span>
                    </div>
                </div>

                {/* 3. Average Storage Duration & Turnaround Idle Time */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Chu Kỳ Lưu Trữ & Chờ Khách TB
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                            {isLoading ? '...' : `${(data?.averageStorageDurationHours ?? 0).toFixed(1)}h`}
                        </p>
                        <span className="text-xs font-semibold text-slate-500">/ lượt gửi đồ</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                            Trống giữa 2 lượt:{' '}
                            <strong className="text-slate-800">
                                {(data?.averageTurnaroundIdleHours ?? 0).toFixed(1)}h
                            </strong>
                        </span>
                        <span className="text-amber-700 font-bold">
                            Quá hạn: {(data?.overdueCycleRatePercent ?? 0).toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* 4. RevPAL & RevPOLH */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Doanh Thu / Tủ Khả Dụng (RevPAL)
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-indigo-700 mt-2 tracking-tight">
                        {isLoading ? '...' : formatVnd(data?.revenuePerAvailableLocker ?? 0)}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                            RevPOLH:{' '}
                            <strong className="text-slate-800">
                                {formatCompactVnd(data?.revenuePerOccupiedHour ?? 0)}/giờ-tủ
                            </strong>
                        </span>
                        <span className="font-bold text-emerald-700">
                            Tổng: {formatCompactVnd(data?.netRevenueInPeriod ?? 0)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ROW 2: Live Fleet Capacity Snapshot Strip */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 font-extrabold text-[10px] uppercase">
                            TRẠNG THÁI VẬT LÝ TỨC THỜI (LIVE SNAPSHOT)
                        </span>
                        <span className="text-slate-600">
                            Đang khai thác:{' '}
                            <strong className="text-slate-900">
                                {(data?.occupiedNowLockers ?? 0) + (data?.reservedNowLockers ?? 0)} /{' '}
                                {data?.serviceableLockers ?? 0} ô khả dụng
                            </strong>{' '}
                            ({(data?.liveServiceableOccupancyPercent ?? 0).toFixed(1)}% lấp đầy tức thời)
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="text-slate-600">
                            Giờ cao điểm:{' '}
                            <strong className="text-teal-700">{data?.peakOccupancyHourLabel || '—'}</strong>
                        </span>
                        <span className="text-slate-600">
                            Thứ cao điểm:{' '}
                            <strong className="text-indigo-700">{data?.peakDayOfWeekLabel || '—'}</strong>
                        </span>
                    </div>
                </div>

                {/* Live Segmented Bar */}
                <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex p-0.5 gap-0.5">
                    {availPctLive > 0 && (
                        <div
                            className="h-full bg-emerald-500 rounded-l-full transition-all"
                            style={{ width: `${availPctLive}%` }}
                            title={`Sẵn sàng (AVAILABLE): ${data?.availableNowLockers ?? 0} ô`}
                        />
                    )}
                    {occPctLive > 0 && (
                        <div
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${occPctLive}%` }}
                            title={`Đang lưu đồ (OCCUPIED): ${data?.occupiedNowLockers ?? 0} ô`}
                        />
                    )}
                    {resPctLive > 0 && (
                        <div
                            className="h-full bg-indigo-400 transition-all"
                            style={{ width: `${resPctLive}%` }}
                            title={`Đã đặt trước (RESERVED): ${data?.reservedNowLockers ?? 0} ô`}
                        />
                    )}
                    {outPctLive > 0 && (
                        <div
                            className="h-full bg-rose-500 rounded-r-full transition-all"
                            style={{ width: `${outPctLive}%` }}
                            title={`Bảo trì / Khóa (OUT OF SERVICE): ${data?.outOfServiceLockers ?? 0} ô`}
                        />
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Trống sẵn sàng: <strong>{data?.availableNowLockers ?? 0} ô</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        Đang chứa đồ: <strong>{data?.occupiedNowLockers ?? 0} ô</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                        Đã giữ chỗ: <strong>{data?.reservedNowLockers ?? 0} ô</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        Đang bảo trì/khóa: <strong>{data?.outOfServiceLockers ?? 0} ô</strong>
                    </span>
                </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
                {(
                    [
                        {
                            id: 'TRENDS_AND_HEATMAP',
                            label: 'Xu hướng Lấp đầy & Nhịp sinh học 24h / Tuần',
                            icon: Activity,
                        },
                        {
                            id: 'STATION_AND_SIZE',
                            label: 'Chẩn đoán Công suất Trạm & Cỡ tủ S/M/L',
                            icon: Layers,
                        },
                        {
                            id: 'LOCKER_UNITS',
                            label: `Xoay vòng Từng Ngăn tủ (${data?.lockerTurnoverItems.length ?? 0} ô)`,
                            icon: Box,
                        },
                        {
                            id: 'EXPORT_CENTER',
                            label: 'Trung tâm Xuất Báo cáo Công suất',
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
                                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/25'
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
                TAB 1: OCCUPANCY & TURNOVER TRENDS + 24H PROFILE + DAY-OF-WEEK PROFILE
               ===================================================================== */}
            {activeTab === 'TRENDS_AND_HEATMAP' && (
                <div className="space-y-5 print:hidden">
                    {/* Interactive Time-Series Chart */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-extrabold text-slate-900">
                                    Biểu đồ Chuỗi thời gian:{' '}
                                    {chartMode === 'OCCUPANCY'
                                        ? 'Tỷ lệ Lấp đầy Ngăn tủ theo Giờ Thực tế (%)'
                                        : 'Số Lượt Xoay vòng & Hệ số Vòng quay / Ngày'}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Di chuột hoặc chọn từng mốc thời gian để xem tương quan giữa Tỷ lệ lấp đầy, Số vòng quay và Doanh thu tạo ra.
                                </p>
                            </div>

                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start">
                                <button
                                    type="button"
                                    onClick={() => setChartMode('OCCUPANCY')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        chartMode === 'OCCUPANCY'
                                            ? 'bg-white text-teal-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Tỷ lệ Lấp đầy (%)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChartMode('TURNOVER')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        chartMode === 'TURNOVER'
                                            ? 'bg-white text-blue-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Tần suất Xoay vòng (Lượt)
                                </button>
                            </div>
                        </div>

                        {/* Selected Bucket Inspector */}
                        {selectedPoint && (
                            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-extrabold">
                                        Mốc {selectedPoint.label}
                                    </span>
                                    <span className="text-slate-700">
                                        Lấp đầy:{' '}
                                        <strong className="text-teal-700">
                                            {selectedPoint.occupancyRatePercent.toFixed(2)}%
                                        </strong>{' '}
                                        ({selectedPoint.occupiedLockerHours.toFixed(1)} /{' '}
                                        {selectedPoint.availableLockerHours.toFixed(0)} giờ-tủ)
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-[11px]">
                                    <span className="text-slate-600">
                                        Số lượt xoay vòng:{' '}
                                        <strong className="text-blue-700">{selectedPoint.totalCycles} lượt</strong>
                                    </span>
                                    <span className="text-slate-600">
                                        Tốc độ:{' '}
                                        <strong className="text-slate-900">
                                            {selectedPoint.dailyTurnoverRate.toFixed(3)} vòng/tủ/ngày
                                        </strong>
                                    </span>
                                    <span className="text-slate-600">
                                        Lưu trữ TB:{' '}
                                        <strong>{selectedPoint.averageDurationHours.toFixed(1)}h</strong>
                                    </span>
                                    <span className="text-emerald-700 font-bold">
                                        Doanh thu: {formatVnd(selectedPoint.netRevenue)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Bars */}
                        {timeSeries.length === 0 ? (
                            <div className="h-52 flex items-center justify-center text-xs text-slate-400">
                                Không có dữ liệu chuỗi thời gian cho bộ lọc này.
                            </div>
                        ) : (
                            <div className="pt-4 pb-2 overflow-x-auto">
                                <div className="h-56 flex items-end gap-1.5 min-w-[640px] border-b border-slate-200 pb-2 px-1">
                                    {timeSeries.map((pt, idx) => {
                                        const isSelected =
                                            (selectedPointIdx ?? timeSeries.length - 1) === idx;
                                        const valPct =
                                            chartMode === 'OCCUPANCY'
                                                ? (pt.occupancyRatePercent / maxOccupancyInSeries) * 100
                                                : (pt.totalCycles / maxCyclesInSeries) * 100;
                                        const hasVal =
                                            chartMode === 'OCCUPANCY'
                                                ? pt.occupancyRatePercent > 0
                                                : pt.totalCycles > 0;

                                        const barColor =
                                            chartMode === 'OCCUPANCY'
                                                ? pt.occupancyRatePercent >= 80
                                                    ? 'bg-rose-500'
                                                    : pt.occupancyRatePercent >= 45
                                                    ? 'bg-teal-600'
                                                    : 'bg-teal-400'
                                                : 'bg-blue-600';

                                        return (
                                            <button
                                                key={pt.periodKey}
                                                type="button"
                                                onMouseEnter={() => setSelectedPointIdx(idx)}
                                                onClick={() => setSelectedPointIdx(idx)}
                                                className={`flex-1 min-w-[20px] h-full flex flex-col justify-end items-center rounded-t-lg px-0.5 transition cursor-pointer ${
                                                    isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                                                }`}
                                                title={`${pt.label}: Lấp đầy ${pt.occupancyRatePercent.toFixed(1)}% · ${pt.totalCycles} lượt thuê`}
                                            >
                                                <div
                                                    className={`w-full max-w-[26px] rounded-t-md transition-all ${
                                                        hasVal ? barColor : 'bg-slate-200'
                                                    }`}
                                                    style={{
                                                        height: `${hasVal ? Math.max(5, Math.min(100, valPct)) : 2}%`,
                                                    }}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
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

                    {/* 24h Rhythm & 7-Day Weekly Profile Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                        {/* 24-Hour Occupancy Heatmap Bars (2 cols wide) */}
                        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900">
                                        Phân Bố Mật Độ Lấp Đầy & Nhịp Gửi/Nhận Đồ Theo 24 Khung Giờ (UTC+7)
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Xác định khung giờ chạm ngưỡng quá tải (&ge;80%) và nhịp Check-in / Check-out tại Kiosk.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold">
                                    <span className="flex items-center gap-1 text-rose-600">
                                        <span className="w-2 h-2 rounded-xs bg-rose-500" /> &ge;80% Quá tải
                                    </span>
                                    <span className="flex items-center gap-1 text-teal-700">
                                        <span className="w-2 h-2 rounded-xs bg-teal-600" /> 45-79% Tối ưu
                                    </span>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <div className="grid grid-cols-24 gap-1.5 min-w-[620px] h-44 items-end pt-4 pb-2 border-b border-slate-100">
                                    {hourlyProfile.map((h) => {
                                        const pct =
                                            h.estimatedOccupancyPercent > 0
                                                ? Math.max(
                                                      8,
                                                      (h.estimatedOccupancyPercent / maxHourlyOcc) * 100
                                                  )
                                                : 3;
                                        const colorCls =
                                            h.estimatedOccupancyPercent >= 80
                                                ? 'bg-rose-500'
                                                : h.estimatedOccupancyPercent >= 45
                                                ? 'bg-teal-600'
                                                : h.estimatedOccupancyPercent > 0
                                                ? 'bg-sky-500'
                                                : 'bg-slate-100';

                                        return (
                                            <div
                                                key={h.hour}
                                                className="h-full flex flex-col justify-end items-center gap-1 group"
                                                title={`${h.hourLabel}: Lấp đầy TB ${h.estimatedOccupancyPercent.toFixed(1)}% (${h.avgActiveLockers.toFixed(1)} ô) · Gửi vào: ${h.checkInCount} · Lấy ra: ${h.checkOutCount}`}
                                            >
                                                <span className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition">
                                                    {Math.round(h.estimatedOccupancyPercent)}%
                                                </span>
                                                <div className="w-full h-full flex items-end justify-center">
                                                    <div
                                                        className={`w-full max-w-[18px] rounded-t-md transition-all ${colorCls}`}
                                                        style={{ height: `${Math.min(100, pct)}%` }}
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

                        {/* Day-of-Week Utilization Profile (1 col wide) */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
                            <div>
                                <h3 className="text-sm font-extrabold text-slate-900">
                                    Chu Kỳ Nhu Cầu Theo Thứ Trong Tuần
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    So sánh áp lực lưu trữ ngày thường và cuối tuần.
                                </p>
                            </div>

                            <div className="space-y-2.5">
                                {(data?.dayOfWeekProfile ?? []).map((dow) => (
                                    <div key={dow.dayIndex} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-slate-800">{dow.dayLabel}</span>
                                            <span className="text-[11px] text-slate-600">
                                                <strong className="text-teal-700">
                                                    {dow.avgOccupancyPercent.toFixed(1)}%
                                                </strong>{' '}
                                                · {dow.totalCycles} lượt ({dow.shareOfCyclesPercent.toFixed(0)}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${
                                                    dow.avgOccupancyPercent >= 80
                                                        ? 'bg-rose-500'
                                                        : dow.avgOccupancyPercent >= 45
                                                        ? 'bg-teal-600'
                                                        : 'bg-blue-500'
                                                }`}
                                                style={{
                                                    width: `${Math.min(100, Math.max(2, dow.avgOccupancyPercent))}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================================
                TAB 2 (AND PRINT VIEW): STATION CAPACITY DIAGNOSIS & SIZE S/M/L
               ===================================================================== */}
            <div
                className={
                    activeTab === 'STATION_AND_SIZE' ? 'space-y-5' : 'hidden print:block print:space-y-4'
                }
            >
                {/* Size S / M / L Comparison Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {(data?.sizeBreakdown ?? []).map((sz) => (
                        <div
                            key={sz.size}
                            className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-extrabold">
                                        SIZE {sz.size}
                                    </span>
                                    <h3 className="text-xs font-extrabold text-slate-900 mt-1.5">
                                        {sz.sizeLabel}
                                    </h3>
                                </div>
                                <span className="text-xs font-bold text-slate-500">
                                    {sz.serviceableLockers}/{sz.totalLockers} ô khả dụng
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 pt-1">
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                        Lấp đầy theo giờ
                                    </span>
                                    <span className="text-base font-black text-teal-700">
                                        {sz.timeWeightedOccupancyPercent.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                        Hệ số xoay vòng
                                    </span>
                                    <span className="text-base font-black text-blue-700">
                                        {sz.turnoverPerLocker.toFixed(2)} vòng/tủ
                                    </span>
                                </div>
                            </div>

                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-teal-600 rounded-full"
                                    style={{
                                        width: `${Math.min(100, sz.timeWeightedOccupancyPercent)}%`,
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                <span>
                                    Tổng: <strong className="text-slate-800">{sz.totalCycles} lượt</strong> · TB{' '}
                                    {sz.avgDurationHours.toFixed(1)}h
                                </span>
                                <span className="font-bold text-indigo-700">
                                    RevPAL: {formatCompactVnd(sz.revenuePerAvailableLocker)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Station Ranking & Automated Capacity Recommendations */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h2 className="text-sm font-extrabold text-slate-900">
                                Bảng Xếp Hạng Công Suất Trạm & Khuyến Nghị Điều Phối Tự Động
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Tự động phát hiện điểm trạm nghẽn cổ chai (&ge;80% lấp đầy) cần mở rộng ngăn tủ hoặc điểm trạm dư công suất cần kích cầu Voucher.
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
                                    <th className="py-3 px-4">Trạm SmartLocker</th>
                                    <th className="py-3 px-3 text-center">Tủ Khả Dụng</th>
                                    <th className="py-3 px-3 text-right">Lấp Đầy Live</th>
                                    <th className="py-3 px-4">Lấp Đầy Theo Giờ</th>
                                    <th className="py-3 px-3 text-right">Vòng Quay / Tủ</th>
                                    <th className="py-3 px-3 text-right">Lưu Trữ TB</th>
                                    <th className="py-3 px-3 text-right">RevPAL</th>
                                    <th className="py-3 px-4">Chẩn Đoán & Khuyến Nghị Vận Hành</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(data?.stationBreakdown ?? []).length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-400">
                                            Chưa có dữ liệu trạm.
                                        </td>
                                    </tr>
                                ) : (
                                    (data?.stationBreakdown ?? []).map((st) => {
                                        const capBadge = getCapacityBadge(st.capacityStatus);
                                        return (
                                            <tr key={st.stationId} className="hover:bg-slate-50/70 transition">
                                                <td className="py-3.5 px-4">
                                                    <p className="font-bold text-slate-900">{st.stationName}</p>
                                                    <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                                                        {st.address}
                                                    </p>
                                                </td>
                                                <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                                                    <span className="text-emerald-700 font-bold">
                                                        {st.serviceableLockers}
                                                    </span>
                                                    /{st.totalLockers}
                                                    {st.outOfServiceLockers > 0 && (
                                                        <span className="block text-[10px] text-rose-600">
                                                            ({st.outOfServiceLockers} bảo trì)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-3 text-right font-bold text-slate-800">
                                                    {st.liveOccupancyPercent.toFixed(1)}%
                                                    <span className="block text-[10px] font-normal text-slate-400">
                                                        ({st.liveOccupiedCount} ô bận)
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 min-w-[150px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    st.timeWeightedOccupancyPercent >= 80
                                                                        ? 'bg-rose-500'
                                                                        : st.timeWeightedOccupancyPercent >= 45
                                                                        ? 'bg-teal-600'
                                                                        : 'bg-blue-500'
                                                                }`}
                                                                style={{
                                                                    width: `${Math.min(
                                                                        100,
                                                                        st.timeWeightedOccupancyPercent
                                                                    )}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="font-extrabold text-teal-700 w-12 text-right">
                                                            {st.timeWeightedOccupancyPercent.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 text-right">
                                                    <span className="font-extrabold text-blue-700">
                                                        {st.turnoverPerLocker.toFixed(2)}
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400">
                                                        {st.totalCycles} lượt ({st.dailyTurnoverRate.toFixed(2)}/ngày)
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 text-right font-semibold text-slate-700">
                                                    {st.avgDurationHours.toFixed(1)}h
                                                </td>
                                                <td className="py-3.5 px-3 text-right font-bold text-indigo-700">
                                                    {formatVnd(st.revenuePerAvailableLocker)}
                                                </td>
                                                <td className="py-3.5 px-4 max-w-xs">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border mb-1 ${capBadge.cls}`}
                                                    >
                                                        {capBadge.label}
                                                    </span>
                                                    <p className="text-[11px] text-slate-600 leading-snug">
                                                        {st.capacityRecommendation}
                                                    </p>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* =====================================================================
                TAB 3: INDIVIDUAL LOCKER UNIT TURNOVER LEADERBOARD (HOT VS IDLE)
               ===================================================================== */}
            {activeTab === 'LOCKER_UNITS' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden print:hidden">
                    <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-extrabold text-slate-900">
                                Chi Tiết Tần Suất Xoay Vòng Từng Ngăn Tủ Vật Lý ({filteredUnits.length} ô)
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Nhận diện các ngăn tủ xoay vòng liên tục (<strong className="text-orange-600">HOT</strong> — cần ưu tiên kiểm tra bản lề/khóa điện từ) và các ngăn tủ ít được chọn (<strong className="text-slate-600">IDLE / COLD</strong>).
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={unitSearch}
                                    onChange={(e) => setUnitSearch(e.target.value)}
                                    placeholder="Tìm mã tủ (VD: S01, L02), tên trạm..."
                                    className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs w-60 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                />
                            </div>

                            <select
                                value={unitTierFilter}
                                onChange={(e) => setUnitTierFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                            >
                                <option value="ALL">Mọi phân hạng ({data?.lockerTurnoverItems.length ?? 0})</option>
                                <option value="HOT">HOT · Xoay vòng cao</option>
                                <option value="OPTIMAL">OPTIMAL · Khai thác tốt</option>
                                <option value="COLD">COLD · Ít lượt thuê</option>
                                <option value="IDLE">IDLE · Chưa phát sinh</option>
                                <option value="MAINTENANCE">MAINT · Đang bảo trì/khóa</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[540px]">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                                <tr className="text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                    <th className="py-3 px-4">Mã Ngăn Tủ</th>
                                    <th className="py-3 px-3">Trạm SmartLocker</th>
                                    <th className="py-3 px-3 text-center">Cỡ</th>
                                    <th className="py-3 px-3">Trạng thái Live</th>
                                    <th className="py-3 px-3 text-right">Số Vòng Quay</th>
                                    <th className="py-3 px-3 text-right">Vòng / Ngày</th>
                                    <th className="py-3 px-4">Tỷ Lệ Lấp Đầy Kỳ</th>
                                    <th className="py-3 px-3 text-right">Lưu Trữ / Trống TB</th>
                                    <th className="py-3 px-3 text-right">Doanh Thu Tạo Ra</th>
                                    <th className="py-3 px-4">Phân Hạng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUnits.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-10 text-center text-slate-400">
                                            Không tìm thấy ngăn tủ nào khớp điều kiện lọc.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUnits.map((u) => {
                                        const tier = getTierBadge(u.utilizationTier);
                                        const TierIcon = tier.Icon;
                                        return (
                                            <tr key={u.lockerId} className="hover:bg-slate-50/80 transition">
                                                <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                                                    {u.lockerCode}
                                                </td>
                                                <td className="py-3 px-3 font-semibold text-slate-700">
                                                    {u.stationName}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-extrabold text-[11px]">
                                                        {u.size}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="font-bold text-slate-800">
                                                        {u.businessStatus}
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400">
                                                        IoT: {u.healthStatus}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right font-black text-blue-700">
                                                    {u.cycleCount} lượt
                                                </td>
                                                <td className="py-3 px-3 text-right font-semibold text-slate-700">
                                                    {u.dailyTurnoverRate.toFixed(3)}
                                                </td>
                                                <td className="py-3 px-4 min-w-[135px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-teal-600 rounded-full"
                                                                style={{
                                                                    width: `${Math.min(100, u.occupancyRatePercent)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="font-bold text-teal-700 w-11 text-right">
                                                            {u.occupancyRatePercent.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">
                                                        {u.occupiedHours.toFixed(1)} giờ lấp đầy
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right text-[11px] text-slate-600">
                                                    <p>Gửi: {u.avgDurationHours.toFixed(1)}h</p>
                                                    <p className="text-slate-400">
                                                        Trống: {u.avgIdleGapHours.toFixed(1)}h
                                                    </p>
                                                </td>
                                                <td className="py-3 px-3 text-right font-bold text-emerald-700">
                                                    {formatVnd(u.generatedRevenue)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${tier.cls}`}
                                                    >
                                                        <TierIcon className="w-3 h-3" />
                                                        {tier.label}
                                                    </span>
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
                TAB 4: CAPACITY & TURNOVER EXPORT CENTER
               ===================================================================== */}
            {activeTab === 'EXPORT_CENTER' && (
                <div className="space-y-5 print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-teal-200/90 p-5 shadow-xs flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-extrabold uppercase">
                                        BÁO CÁO QUẢN TRỊ ĐỘI TỦ
                                    </span>
                                    <FileSpreadsheet className="w-6 h-6 text-teal-600" />
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    1. Sổ Phân Tích Lấp Đầy & Xoay Vòng Excel 4 Sheet (.xls)
                                </h3>
                                <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                                    <li>
                                        <code>1_TongHop_CongSuat</code>: 17 chỉ số chuẩn hóa Locker-Hours, Turnover, Dwell Time & RevPAL.
                                    </li>
                                    <li>
                                        <code>2_XuHuong_ChuoiThoiGian</code>: Diễn biến tỷ lệ lấp đầy & vòng quay theo Ngày/Tuần/Tháng.
                                    </li>
                                    <li>
                                        <code>3_HieuSuat_Tram_KichCo</code>: Xếp hạng trạm kèm khuyến nghị mở rộng hoặc kích cầu.
                                    </li>
                                    <li>
                                        <code>4_XoayVong_TungNganTu</code>: Bảng kê tần suất hoạt động từng khoang tủ vật lý phục vụ bảo trì dự đoán.
                                    </li>
                                </ul>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleExport('excel')}
                                disabled={exportingFormat !== null}
                                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>Tải Xuống Báo Cáo Công Suất Excel (.xls)</span>
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase">
                                        DỮ LIỆU BẢO TRÌ DỰ ĐOÁN
                                    </span>
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    2. Bảng Kê Xoay Vòng Ngăn Tủ CSV UTF-8 BOM (.csv)
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Kết xuất danh sách chi tiết toàn bộ các ngăn tủ kèm số vòng đóng/mở khóa, tổng giờ chịu tải và tình trạng IoT để đội kỹ thuật lập lịch bảo dưỡng định kỳ.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleExport('csv')}
                                disabled={exportingFormat !== null}
                                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>Tải Xuống Bảng Kê CSV UTF-8 (.csv)</span>
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold uppercase">
                                        BIỂU MẪU HỌP GIAO BAN VẬN HÀNH
                                    </span>
                                    <Printer className="w-6 h-6 text-indigo-600" />
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    3. In Báo Cáo Hiệu Suất Khai Thác Khổ A4 / PDF
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Trình bày sẵn tiêu đề đơn vị, thẻ KPI công suất, phân tích cỡ tủ S/M/L, bảng chẩn đoán trạm và khung chữ ký Trưởng bộ phận Vận hành & Quản trị viên.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <Printer className="w-4 h-4" />
                                <span>In Biểu Mẫu Công Suất A4 / Lưu PDF</span>
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold uppercase">
                                        BI / CAPACITY PLANNING JSON
                                    </span>
                                    <FileJson className="w-6 h-6 text-slate-700" />
                                </div>
                                <h3 className="text-base font-extrabold text-slate-900">
                                    4. Xuất Dữ Liệu Quy Hoạch Mạng Lưới JSON (.json)
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Đóng gói đầy đủ ma trận giờ cao điểm 24h, chu kỳ thứ trong tuần và thống kê từng ngăn tủ phục vụ bài toán tối ưu vị trí đặt trạm mới.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleExport('json')}
                                disabled={exportingFormat !== null}
                                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>Tải Xuống Dữ Liệu JSON (.json)</span>
                            </button>
                        </div>
                    </div>

                    {/* Actionable Cross-Navigation Bar */}
                    <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-wider text-teal-300">
                                Hành động Tối ưu Công suất Tức thì
                            </p>
                            <p className="text-xs text-slate-300 mt-1">
                                Chuyển nhanh sang Lưới ô tủ để xử lý các ngăn đang bảo trì, hoặc mở Chiến dịch Voucher để kích cầu các trạm có tỷ lệ lấp đầy thấp.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {onNavigateLockers && (
                                <button
                                    type="button"
                                    onClick={onNavigateLockers}
                                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <span>Lưới ô tủ thời gian thực</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {onNavigatePromotions && (
                                <button
                                    type="button"
                                    onClick={onNavigatePromotions}
                                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <span>Tạo Voucher kích cầu thấp điểm</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {onNavigateFinancialReports && (
                                <button
                                    type="button"
                                    onClick={onNavigateFinancialReports}
                                    className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    <span>Báo cáo Doanh thu Tài chính</span>
                                </button>
                            )}
                            {onNavigateAudit && (
                                <button
                                    type="button"
                                    onClick={onNavigateAudit}
                                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <span>Nhật ký Audit</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Print Signature Block */}
            <div className="hidden print:grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-slate-300 text-center text-xs">
                <div>
                    <p className="font-bold text-slate-900 uppercase">Người lập báo cáo</p>
                    <p className="text-[11px] text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
                    <div className="h-20" />
                </div>
                <div>
                    <p className="font-bold text-slate-900 uppercase">Phụ trách Vận hành Trạm</p>
                    <p className="text-[11px] text-slate-500 italic">(Xác nhận hiện trạng ngăn tủ)</p>
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
