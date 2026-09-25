/**
 * AD-FE-02: UC-A02 — Operations Dashboard
 * Thanh điều hướng Sidebar chuẩn theo thiết kế SmartLocker Operations Portal.
 * Hiển thị avatar, tên người dùng, role badge (ADMIN/STAFF), và nút Đăng xuất.
 */
import {
    LayoutDashboard,
    Box,
    Layers,
    Cpu,
    ShieldAlert,
    DollarSign,
    Users,
    CreditCard,
    PackageX,
    FileText,
    BarChart3,
    LogOut,
    Lock,
} from 'lucide-react';
import type { AuthResponse } from '../../api/authService';

interface AdminSidebarProps {
    user: AuthResponse | null;
    openIncidentsCount: number;
    offlineDevicesCount: number;
    onLogout: () => void;
    activeMenu?: 'dashboard' | 'stations' | 'users' | 'lockers';
    onSelectMenu?: (menu: 'dashboard' | 'stations' | 'users' | 'lockers') => void;
}

export default function AdminSidebar({
    user,
    openIncidentsCount,
    offlineDevicesCount,
    onLogout,
    activeMenu = 'users',
    onSelectMenu,
}: AdminSidebarProps) {
    const role = (user?.role || '').trim();
    const isAdmin = role.toLowerCase() === 'admin';
    const isStaff = role.toLowerCase() === 'staff';

    return (
        <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 select-none min-h-screen">
            {/* Top Logo & App Title */}
            <div>
                <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                        <Lock className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-base font-extrabold text-slate-900 tracking-tight">SmartLocker</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                                SLMS
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">Operations Control</p>
                    </div>
                </div>

                {/* Nav Menu Groups */}
                <nav className="p-3 space-y-5 text-xs">
                    {/* Group: OVERVIEW */}
                    <div>
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Overview
                        </p>
                        <div className="space-y-0.5">
                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('dashboard')}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold transition-all text-left cursor-pointer ${
                                    activeMenu === 'dashboard'
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <LayoutDashboard className={`w-4 h-4 ${activeMenu === 'dashboard' ? 'text-white' : 'text-slate-400'}`} />
                                <span>Dashboard</span>
                            </button>
                        </div>
                    </div>

                    {/* Group: OPERATIONS */}
                    <div>
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Operations
                        </p>
                        <div className="space-y-0.5 text-slate-600">
                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('stations')}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                                    activeMenu === 'stations'
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <Layers className={`w-4 h-4 ${activeMenu === 'stations' ? 'text-white' : 'text-slate-400'}`} />
                                    <span>Stations</span>
                                </span>
                            </button>

                            <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-default">
                                <span className="flex items-center gap-2.5">
                                    <Box className="w-4 h-4 text-slate-400" />
                                    <span>Lockers</span>
                                </span>
                            </div>

                            <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-default">
                                <span className="flex items-center gap-2.5">
                                    <Cpu className="w-4 h-4 text-slate-400" />
                                    <span>IoT Devices</span>
                                </span>
                                {offlineDevicesCount > 0 ? (
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={`${offlineDevicesCount} thiết bị offline`} />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="IoT online" />
                                )}
                            </div>

                            <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-default">
                                <span className="flex items-center gap-2.5">
                                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                                    <span>Incidents</span>
                                </span>
                                {openIncidentsCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-600 font-bold text-[10px] border border-rose-200">
                                        {openIncidentsCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Group: MANAGEMENT */}
                    <div>
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Management
                        </p>
                        <div className="space-y-0.5 text-slate-600">
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-default">
                                <DollarSign className="w-4 h-4 text-slate-400" />
                                <span>Pricing Policies</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('users')}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                                    activeMenu === 'users'
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <Users className={`w-4 h-4 ${activeMenu === 'users' ? 'text-white' : 'text-slate-400'}`} />
                                    <span>Accounts</span>
                                </span>
                            </button>
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-default">
                                <CreditCard className="w-4 h-4 text-slate-400" />
                                <span>Bookings & Pay</span>
                            </div>
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-default">
                                <PackageX className="w-4 h-4 text-slate-400" />
                                <span>Abandoned Cargo</span>
                            </div>
                        </div>
                    </div>

                    {/* Group: SECURITY & LOGS */}
                    <div>
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Security & Logs
                        </p>
                        <div className="space-y-0.5 text-slate-600">
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-default">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <span>Audit Log</span>
                            </div>
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-default">
                                <BarChart3 className="w-4 h-4 text-slate-400" />
                                <span>Reports</span>
                            </div>
                        </div>
                    </div>
                </nav>
            </div>

            {/* Bottom Profile & Logout Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/60">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-200">
                            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0 text-left">
                            <p className="text-xs font-bold text-slate-800 truncate" title={user?.fullName || 'Admin User'}>
                                {user?.fullName || 'Người dùng Quản trị'}
                            </p>
                            <span
                                className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                    isAdmin
                                        ? 'bg-purple-100 text-purple-700'
                                        : isStaff
                                        ? 'bg-teal-100 text-teal-700'
                                        : 'bg-slate-100 text-slate-700'
                                }`}
                            >
                                {role || 'Staff'}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onLogout}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Đăng xuất"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
