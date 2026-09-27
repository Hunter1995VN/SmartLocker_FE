/**
 * AD-FE-02: UC-A02 — Operations Dashboard
 * Component biểu đồ doanh thu tương tác SVG phong cách sáng (Light enterprise).
 * Đồng bộ phong cách thiết kế với mockup SmartLocker Operations Control.
 */
import { useState, useId } from 'react';
import { TrendingUp, AlertCircle, RefreshCw, Calendar, DollarSign } from 'lucide-react';
import type { RevenueChartItemDto } from '../../api/adminDashboardService';

interface RevenueChartProps {
    data: RevenueChartItemDto[];
    isLoading: boolean;
    isError: boolean;
    selectedDays: number;
    onDaysChange: (days: number) => void;
    onRetry?: () => void;
}

const formatVND = (val: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(val);
};

const formatDateShort = (dateStr: string): string => {
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}`;
        }
        return dateStr;
    } catch {
        return dateStr;
    }
};

export default function RevenueChart({
    data,
    isLoading,
    isError,
    selectedDays,
    onDaysChange,
    onRetry,
}: RevenueChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const gradientId = useId();

    const totalPeriodRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const totalBookings = data.reduce((sum, item) => sum + (item.bookingCount || 0), 0);
    const maxRevenue = Math.max(...data.map((d) => d.revenue || 0), 0);

    const svgWidth = 800;
    const svgHeight = 240;
    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 35;

    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const chartHeight = svgHeight - paddingTop - paddingBottom;

    const points = data.map((item, index) => {
        const x = paddingLeft + (index / Math.max(data.length - 1, 1)) * chartWidth;
        const normalizedY = maxRevenue > 0 ? item.revenue / maxRevenue : 0;
        const y = paddingTop + (1 - normalizedY) * chartHeight;
        return { x, y, item, index };
    });

    const linePath = points.length > 0
        ? points.reduce((acc, curr, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`, '')
        : '';

    const areaPath = points.length > 0
        ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} Z`
        : '';

    const hoveredPoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between select-none">
            {/* Chart Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
                            <TrendingUp className="w-4 h-4" />
                        </span>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">Biểu đồ doanh thu</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Tổng doanh thu giai đoạn:{' '}
                        <strong className="text-blue-600 font-semibold">{formatVND(totalPeriodRevenue)}</strong>
                        <span className="text-slate-400 ml-2">({totalBookings} lượt đặt)</span>
                    </p>
                </div>

                {/* Time range switcher */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    {[
                        { label: '7 ngày', value: 7 },
                        { label: '14 ngày', value: 14 },
                        { label: '30 ngày', value: 30 },
                    ].map((btn) => (
                        <button
                            key={btn.value}
                            type="button"
                            disabled={isLoading}
                            onClick={() => onDaysChange(btn.value)}
                            className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer text-xs ${
                                selectedDays === btn.value
                                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Content Area */}
            <div className="relative min-h-[240px] flex items-center justify-center">
                {isLoading ? (
                    <div className="w-full flex flex-col items-center justify-center py-12 space-y-2">
                        <div className="w-7 h-7 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                        <p className="text-xs text-slate-400">Đang tải biểu đồ...</p>
                    </div>
                ) : isError ? (
                    <div className="w-full py-10 flex flex-col items-center justify-center text-center p-4">
                        <AlertCircle className="w-7 h-7 text-rose-500 mb-2" />
                        <p className="text-xs font-semibold text-rose-600">Không thể tải dữ liệu biểu đồ doanh thu</p>
                        {onRetry && (
                            <button
                                type="button"
                                onClick={onRetry}
                                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Thử lại</span>
                            </button>
                        )}
                    </div>
                ) : data.length === 0 ? (
                    <div className="w-full py-12 flex flex-col items-center justify-center text-center">
                        <Calendar className="w-7 h-7 text-slate-300 mb-2" />
                        <p className="text-xs font-semibold text-slate-600">Chưa có dữ liệu doanh thu</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Không ghi nhận giao dịch trong giai đoạn này.</p>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto select-none">
                        <div className="relative min-w-[500px]">
                            <svg
                                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                className="w-full h-auto overflow-visible"
                            >
                                <defs>
                                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>

                                {/* Y-axis grid lines & labels */}
                                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                                    const y = paddingTop + (1 - pct) * chartHeight;
                                    const val = maxRevenue * pct;
                                    return (
                                        <g key={pct}>
                                            <line
                                                x1={paddingLeft}
                                                y1={y}
                                                x2={svgWidth - paddingRight}
                                                y2={y}
                                                stroke="#e2e8f0"
                                                strokeDasharray="4 4"
                                            />
                                            <text
                                                x={paddingLeft - 8}
                                                y={y + 3}
                                                fill="#94a3b8"
                                                fontSize="10"
                                                textAnchor="end"
                                                fontFamily="monospace"
                                            >
                                                {val >= 1_000_000
                                                    ? `${(val / 1_000_000).toFixed(1)}M`
                                                    : val >= 1_000
                                                    ? `${(val / 1_000).toFixed(0)}k`
                                                    : val.toFixed(0)}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Area & Line */}
                                {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
                                {linePath && (
                                    <path
                                        d={linePath}
                                        fill="none"
                                        stroke="#2563eb"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                )}

                                {/* Interactive Points and X Labels */}
                                {points.map((pt, i) => {
                                    const isHovered = hoveredIndex === i;
                                    const step = Math.ceil(points.length / 8);
                                    const showLabel = i % step === 0 || i === points.length - 1;

                                    return (
                                        <g key={i}>
                                            {showLabel && (
                                                <text
                                                    x={pt.x}
                                                    y={svgHeight - 10}
                                                    fill="#94a3b8"
                                                    fontSize="10"
                                                    textAnchor="middle"
                                                >
                                                    {formatDateShort(pt.item.date)}
                                                </text>
                                            )}

                                            {isHovered && (
                                                <line
                                                    x1={pt.x}
                                                    y1={paddingTop}
                                                    x2={pt.x}
                                                    y2={paddingTop + chartHeight}
                                                    stroke="#93c5fd"
                                                    strokeWidth="1.5"
                                                    strokeDasharray="3 3"
                                                />
                                            )}

                                            <circle
                                                cx={pt.x}
                                                cy={pt.y}
                                                r={isHovered ? 5.5 : pt.item.revenue > 0 ? 3 : 1.5}
                                                fill={isHovered ? '#1d4ed8' : '#3b82f6'}
                                                stroke="#ffffff"
                                                strokeWidth="2"
                                                className="transition-all"
                                            />

                                            <rect
                                                x={pt.x - chartWidth / (points.length * 2)}
                                                y={paddingTop}
                                                width={chartWidth / points.length}
                                                height={chartHeight}
                                                fill="transparent"
                                                className="cursor-pointer"
                                                onMouseEnter={() => setHoveredIndex(i)}
                                                onMouseLeave={() => setHoveredIndex(null)}
                                            />
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Tooltip */}
                            {hoveredPoint && (
                                <div
                                    className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full mb-2"
                                    style={{
                                        left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                                        top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                                    }}
                                >
                                    <div className="bg-slate-900 text-white rounded-xl px-3 py-2 shadow-xl whitespace-nowrap text-xs">
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 border-b border-slate-800 pb-1 mb-1">
                                            <Calendar className="w-3 h-3 text-blue-400" />
                                            <span>{hoveredPoint.item.date}</span>
                                        </div>
                                        <div className="flex items-center gap-1 font-bold text-emerald-400">
                                            <DollarSign className="w-3.5 h-3.5" />
                                            <span>{formatVND(hoveredPoint.item.revenue)}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            Lượt đặt: <span className="text-white font-medium">{hoveredPoint.item.bookingCount}</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
