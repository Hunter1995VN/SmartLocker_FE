/**
 * AD-FE-02: UC-A02 — Operations Dashboard
 * Hàng thẻ thống kê chỉ số KPI vận hành theo đúng bố cục thiết kế.
 * Bao gồm: Stations, Operational, Ready Lockers, Occupied, Reserved, Offline, Incidents, Revenue.
 */
import {
    Layers,
    CheckCircle2,
    Lock,
    Users,
    Clock,
    WifiOff,
    AlertTriangle,
    DollarSign,
} from 'lucide-react';
import type { AdminDashboardStatsDto } from '../../api/adminDashboardService';

interface KpiSummaryRowProps {
    stats: AdminDashboardStatsDto | null;
    isLoading: boolean;
}

const formatVND = (val: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(val);
};

export default function KpiSummaryRow({ stats, isLoading }: KpiSummaryRowProps) {
    const totalStations = stats?.totalStations ?? 0;
    const activeStations = stats?.activeStations ?? 0;
    const maintenanceStations = Math.max(0, totalStations - activeStations);

    const totalLockers = stats?.totalLockers ?? 0;
    const availableLockers = stats?.availableLockers ?? 0;
    const occupiedLockers = stats?.occupiedLockers ?? 0;

    const availablePct = totalLockers > 0 ? ((availableLockers / totalLockers) * 100).toFixed(1) : '0';
    const occupiedPct = totalLockers > 0 ? ((occupiedLockers / totalLockers) * 100).toFixed(1) : '0';

    const offlineDevices = stats?.offlineIoTDevices ?? 0;
    const openIncidents = stats?.openSecurityIncidents ?? 0;
    const activeBookings = stats?.totalActiveBookings ?? 0;
    const todayRevenue = stats?.todayRevenue ?? 0;
    const monthRevenue = stats?.monthRevenue ?? 0;

    const cards = [
        {
            title: 'STATIONS',
            icon: Layers,
            iconBg: 'bg-blue-50 text-blue-600 border-blue-200/60',
            value: totalStations,
            subtext: `${totalStations} trạm toàn mạng`,
        },
        {
            title: 'OPERATIONAL',
            icon: CheckCircle2,
            iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
            value: activeStations,
            subtext: maintenanceStations > 0 ? `${maintenanceStations} trạm cần bảo trì` : '100% trạm hoạt động',
            subtextColor: maintenanceStations > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400',
        },
        {
            title: 'READY LOCKERS',
            icon: Lock,
            iconBg: 'bg-teal-50 text-teal-600 border-teal-200/60',
            value: availableLockers,
            subtext: `${availablePct}% sẵn sàng đặt`,
            badge: `${availablePct}%`,
        },
        {
            title: 'OCCUPIED',
            icon: Users,
            iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
            value: occupiedLockers,
            subtext: `${occupiedPct}% đang lưu trữ`,
        },
        {
            title: 'ACTIVE BOOKINGS',
            icon: Clock,
            iconBg: 'bg-slate-100 text-slate-600 border-slate-200',
            value: activeBookings,
            subtext: 'Đơn đang sử dụng',
        },
        {
            title: 'OFFLINE',
            icon: WifiOff,
            iconBg: offlineDevices > 0 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-100 text-slate-500',
            value: offlineDevices,
            subtext: offlineDevices > 0 ? 'Cần kiểm tra ngay' : 'Tất cả online',
            valueColor: offlineDevices > 0 ? 'text-rose-600' : 'text-slate-900',
        },
        {
            title: 'INCIDENTS',
            icon: AlertTriangle,
            iconBg: openIncidents > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500',
            value: openIncidents,
            subtext: openIncidents > 0 ? `${openIncidents} sự cố đang mở` : 'Không có sự cố',
            valueColor: openIncidents > 0 ? 'text-amber-600' : 'text-slate-900',
        },
        {
            title: 'REVENUE TODAY',
            icon: DollarSign,
            iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
            value: formatVND(todayRevenue),
            subtext: `Tháng: ${formatVND(monthRevenue)}`,
            isValueString: true,
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                    <div
                        key={i}
                        className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                                {card.title}
                            </span>
                            <span className={`w-6 h-6 rounded-lg border flex items-center justify-center ${card.iconBg}`}>
                                <Icon className="w-3.5 h-3.5" />
                            </span>
                        </div>

                        <div className="mt-3">
                            {isLoading ? (
                                <div className="h-6 w-16 bg-slate-100 rounded animate-pulse" />
                            ) : (
                                <p className={`text-xl font-black tracking-tight ${card.valueColor || 'text-slate-900'}`}>
                                    {card.value}
                                </p>
                            )}
                            <p className={`text-[10px] mt-1 truncate ${card.subtextColor || 'text-slate-400'}`} title={card.subtext}>
                                {card.subtext}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
