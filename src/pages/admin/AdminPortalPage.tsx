/**
 * AD-FE-02: UC-A02 — View Operations Dashboard
 * Màn hình Operations Dashboard chính cho Admin Portal (Admin & Staff)
 * Giao diện bám sát theo thiết kế mockup SmartLocker Operations Control.
 * Tích hợp đầy đủ dữ liệu từ Backend API:
 * - KpiSummaryRow: Stations, Operational, Ready Lockers, Occupied, Reserved, Offline, Incidents, Revenue
 * - LockerCompartmentAllocation: Thanh phân bổ ngăn tủ đa màu sắc
 * - RevenueChart: Biểu đồ doanh thu tương tác SVG
 * - IoTTelemetryCard: Chỉ số đo đạc vi điều khiển ESP32, Uptime, MQTT Broker
 * - CriticalTriageCard: Cảnh báo sự cố phần cứng, lỗi kẹt chốt tủ
 * - StationFleetTable: Chi tiết danh sách trạm, dung lượng ô tủ và trạng thái kết nối
 */
import { useState, useEffect, useCallback } from 'react';
import type { AuthResponse } from '../../api/authService';
import adminDashboardService from '../../api/adminDashboardService';
import type {
    AdminDashboardStatsDto,
    RevenueChartItemDto,
    StationOccupancyItemDto,
    IncidentDto,
} from '../../api/adminDashboardService';
import AdminSidebar from '../../components/admin/AdminSidebar';
import DashboardHeader from '../../components/admin/DashboardHeader';
import KpiSummaryRow from '../../components/admin/KpiSummaryRow';
import LockerCompartmentAllocation from '../../components/admin/LockerCompartmentAllocation';
import RevenueChart from '../../components/admin/RevenueChart';
import IoTTelemetryCard from '../../components/admin/IoTTelemetryCard';
import CriticalTriageCard from '../../components/admin/CriticalTriageCard';
import StationFleetTable from '../../components/admin/StationFleetTable';
import StationManagementView from '../../components/admin/stations/StationManagementView';
import InternalUsersManagementView from '../../components/admin/users/InternalUsersManagementView';

interface AdminPortalPageProps {
    onLogout: () => void;
    onNavigateLogin?: () => void;
}

export default function AdminPortalPage({ onLogout }: AdminPortalPageProps) {
    // 1. Authentication & Authorization State
    const [user] = useState<AuthResponse | null>(() => {
        try {
            const saved = localStorage.getItem('smartlocker_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const role = (user?.role || '').trim();

    // Route guard: kiểm tra quyền Admin hoặc Staff
    useEffect(() => {
        if (!user) {
            onLogout();
            return;
        }
        const userRole = (user.role || '').trim().toLowerCase();
        if (userRole !== 'admin' && userRole !== 'staff') {
            onLogout();
        }
    }, [user, onLogout]);

    // 2. Data States
    const [stats, setStats] = useState<AdminDashboardStatsDto | null>(null);
    const [revenueData, setRevenueData] = useState<RevenueChartItemDto[]>([]);
    const [stationOccupancies, setStationOccupancies] = useState<StationOccupancyItemDto[]>([]);
    const [incidents, setIncidents] = useState<IncidentDto[]>([]);

    // 3. UI States
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLoadingChart, setIsLoadingChart] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [chartError, setChartError] = useState<string | null>(null);
    const [selectedDays, setSelectedDays] = useState<number>(30);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [activeMenu, setActiveMenu] = useState<'dashboard' | 'stations' | 'users' | 'lockers'>('users');

    // 4. API Fetch Functions
    const fetchStats = useCallback(async () => {
        try {
            const res = await adminDashboardService.getStats();
            if (res.success && res.data) {
                setStats(res.data);
            }
        } catch {
            // Không làm crash UI
        } finally {
            setIsLoadingStats(false);
        }
    }, []);

    const fetchChart = useCallback(async (days: number) => {
        try {
            const res = await adminDashboardService.getRevenueChart(days);
            if (res.success && res.data) {
                setRevenueData(res.data);
            } else {
                setChartError(res.message || 'Lỗi tải biểu đồ doanh thu');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setChartError(axiosErr.response?.data?.message || 'Không thể kết nối đến API biểu đồ');
        } finally {
            setIsLoadingChart(false);
        }
    }, []);

    const fetchStationOccupancies = useCallback(async () => {
        try {
            const res = await adminDashboardService.getStationOccupancies();
            if (res.success && res.data) {
                setStationOccupancies(res.data);
            }
        } catch {
            // Error handled gracefully
        }
    }, []);

    const fetchIncidents = useCallback(async () => {
        try {
            const res = await adminDashboardService.getIncidents('OPEN');
            if (res.success && res.data) {
                setIncidents(res.data);
            }
        } catch {
            // Error handled gracefully
        }
    }, []);

    // Initial load
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            await Promise.allSettled([
                fetchStats(),
                fetchChart(selectedDays),
                fetchStationOccupancies(),
                fetchIncidents(),
            ]);
            if (isMounted) {
                setLastUpdated(new Date());
            }
        };
        void load();
        return () => {
            isMounted = false;
        };
    }, [fetchStats, fetchChart, fetchStationOccupancies, fetchIncidents, selectedDays]);

    // Thay đổi số ngày biểu đồ
    const handleDaysChange = (days: number) => {
        setSelectedDays(days);
        setIsLoadingChart(true);
        setChartError(null);
        void fetchChart(days);
    };

    // Manual Refresh
    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        setChartError(null);
        await Promise.allSettled([
            fetchStats(),
            fetchChart(selectedDays),
            fetchStationOccupancies(),
            fetchIncidents(),
        ]);
        setLastUpdated(new Date());
        setIsRefreshing(false);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans select-none antialiased">
            {/* Left Fixed Navigation Sidebar */}
            <AdminSidebar
                user={user}
                openIncidentsCount={stats?.openSecurityIncidents ?? 0}
                offlineDevicesCount={stats?.offlineIoTDevices ?? 0}
                onLogout={onLogout}
                activeMenu={activeMenu}
                onSelectMenu={setActiveMenu}
            />

            {/* Right Main Viewport */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <main className="p-4 sm:p-6 lg:p-7 space-y-5 max-w-7xl w-full mx-auto">
                    {activeMenu === 'users' ? (
                        <InternalUsersManagementView />
                    ) : activeMenu === 'stations' ? (
                        <StationManagementView />
                    ) : (
                        <>
                            {/* Top Header & Telemetry Controls */}
                            <DashboardHeader
                                role={role}
                                offlineDevicesCount={stats?.offlineIoTDevices ?? 0}
                                openIncidentsCount={stats?.openSecurityIncidents ?? 0}
                                lastUpdated={lastUpdated}
                                isRefreshing={isRefreshing}
                                onRefresh={handleManualRefresh}
                            />

                            {/* Section 1: KPI Stat Cards Row (8 metric boxes) */}
                            <KpiSummaryRow stats={stats} isLoading={isLoadingStats} />

                            {/* Section 2: Locker Compartment Allocation (Multi-segment utilization bar) */}
                            <LockerCompartmentAllocation
                                totalLockers={stats?.totalLockers ?? 0}
                                availableLockers={stats?.availableLockers ?? 0}
                                occupiedLockers={stats?.occupiedLockers ?? 0}
                                maintenanceLockers={stats?.maintenanceLockers ?? 0}
                                isLoading={isLoadingStats}
                            />

                            {/* Section 3: Two Columns Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {/* Left Column: Revenue Chart + IoT Fleet Telemetry */}
                                <div className="space-y-5 flex flex-col">
                                    <RevenueChart
                                        data={revenueData}
                                        isLoading={isLoadingChart}
                                        isError={Boolean(chartError)}
                                        selectedDays={selectedDays}
                                        onDaysChange={handleDaysChange}
                                        onRetry={() => fetchChart(selectedDays)}
                                    />

                                    <IoTTelemetryCard
                                        offlineDevicesCount={stats?.offlineIoTDevices ?? 0}
                                        totalStations={stats?.totalStations ?? 0}
                                        isLoading={isLoadingStats}
                                    />
                                </div>

                                {/* Right Column: Real-time Critical Triage (Incidents & Anomalies) */}
                                <div className="flex flex-col">
                                    <CriticalTriageCard
                                        incidents={incidents}
                                        maintenanceLockers={stats?.maintenanceLockers ?? 0}
                                        isLoading={isLoadingStats}
                                    />
                                </div>
                            </div>

                            {/* Section 4: Full-width Station Fleet Status Table */}
                            <StationFleetTable
                                stations={stationOccupancies}
                                isLoading={isLoadingStats}
                            />
                        </>
                    )}
                </main>

                {/* Footer */}
                <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200/80 bg-white mt-auto">
                    <span>SmartLocker Management System (SLMS) · Internal Users & RBAC Management (AD-FE-05)</span>
                </footer>
            </div>
        </div>
    );
}
