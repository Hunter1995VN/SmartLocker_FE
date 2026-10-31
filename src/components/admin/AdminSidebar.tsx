/**
 * AD-FE-02: Operations Dashboard
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
    UserCog,
    Ticket,
    RotateCcw,
    CreditCard,
    PackageX,
    FileText,
    BarChart3,
    LogOut,
    Lock,
} from 'lucide-react';
import type { AuthResponse } from '../../api/authService';

export type AdminMenuKey =
    | 'dashboard'
    | 'stations'
    | 'promotions'
    | 'rbac'
    | 'users'
    | 'lockers'
    | 'incidents'
    | 'abandoned'
    | 'reconciliation'
    | 'refunds'
    | 'audit';

interface AdminSidebarProps {
    user: AuthResponse | null;
    openIncidentsCount: number;
    offlineDevicesCount: number;
    onLogout?: () => void;
    activeMenu?: AdminMenuKey;
    onSelectMenu?: (menu: AdminMenuKey) => void;
}

export default function AdminSidebar({
    user,
    openIncidentsCount,
    offlineDevicesCount,
    onLogout,
    activeMenu = 'dashboard',
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
                            Tổng quan
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
                                <span>Bảng điều khiển</span>
                            </button>
                        </div>
                    </div>

                    {/* Group: OPERATIONS */}
                    <div>
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Vận hành trạm
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
                                    <span>Trạm & Bảng giá</span>
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('lockers')}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                                    activeMenu === 'lockers'
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <Box className={`w-4 h-4 ${activeMenu === 'lockers' ? 'text-white' : 'text-slate-400'}`} />
                                    <span>Lưới ô tủ</span>
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('lockers')}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-pointer text-left"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Cpu className="w-4 h-4 text-slate-400" />
                                    <span>Thiết bị IoT</span>
                                </span>
                                {offlineDevicesCount > 0 ? (
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={`${offlineDevicesCount} thiết bị offline`} />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="IoT online" />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('incidents')}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                                    activeMenu === 'incidents'
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <ShieldAlert className={`w-4 h-4 ${activeMenu === 'incidents' ? 'text-white' : 'text-slate-400'}`} />
                                    <span>Sự cố & Hỗ trợ</span>
                                </span>
                                {openIncidentsCount > 0 && (
                                    <span className={`px-1.5 py-0.2 rounded-full font-bold text-[10px] border ${
                                        activeMenu === 'incidents'
                                            ? 'bg-white/20 text-white border-white/30'
                                            : 'bg-rose-50 text-rose-600 border-rose-200'
                                    }`}>
                                        {openIncidentsCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Group: MANAGEMENT */}
                    <div>
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Quản lý & Nghiệp vụ
                        </p>
                        <div className="space-y-0.5 text-slate-600">
                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('stations')}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-pointer text-left"
                            >
                                <DollarSign className="w-4 h-4 text-slate-400" />
                                <span>Bảng giá & Phụ phí</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('promotions')}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                                    activeMenu === 'promotions'
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <Ticket className={`w-4 h-4 ${activeMenu === 'promotions' ? 'text-white' : 'text-emerald-500'}`} />
                                    <span>Khuyến mãi & Voucher</span>
                                </span>
                                <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                        activeMenu === 'promotions'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                    }`}
                                >
                                    PROMO
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('rbac')}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                                    activeMenu === 'rbac'
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <UserCog className={`w-4 h-4 ${activeMenu === 'rbac' ? 'text-white' : 'text-purple-500'}`} />
                                    <span>Nhân sự & Phân quyền</span>
                                </span>
                                <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                        activeMenu === 'rbac'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-purple-50 text-purple-700 border border-purple-200/80'
                                    }`}
                                >
                                    RBAC
                                </span>
                            </button>

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
                                    <span>Quản lý khách hàng</span>
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('reconciliation')}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                                    activeMenu === 'reconciliation'
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <CreditCard className={`w-4 h-4 ${activeMenu === 'reconciliation' ? 'text-white' : 'text-slate-400'}`} />
                                <span>Đối soát PayOS</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('refunds')}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                                    activeMenu === 'refunds'
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <RotateCcw className={`w-4 h-4 ${activeMenu === 'refunds' ? 'text-white' : 'text-purple-500'}`} />
                                    <span>Duyệt hoàn tiền</span>
                                </span>
                                <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                        activeMenu === 'refunds'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-purple-50 text-purple-700 border border-purple-200/80'
                                    }`}
                                >
                                    REFUND
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('abandoned')}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                                    activeMenu === 'abandoned'
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <PackageX className={`w-4 h-4 ${activeMenu === 'abandoned' ? 'text-white' : 'text-slate-400'}`} />
                                <span>Hành lý quá hạn 72h</span>
                            </button>
                        </div>
                    </div>

                    {/* Group: SECURITY & LOGS */}
                    <div>
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Bảo mật & Nhật ký
                        </p>
                        <div className="space-y-0.5 text-slate-600">
                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('audit')}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                                    activeMenu === 'audit'
                                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <FileText className={`w-4 h-4 ${activeMenu === 'audit' ? 'text-white' : 'text-slate-400'}`} />
                                <span>Nhật ký hệ thống</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => onSelectMenu?.('reconciliation')}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition cursor-pointer text-left"
                            >
                                <BarChart3 className="w-4 h-4 text-slate-400" />
                                <span>Báo cáo tài chính</span>
                            </button>
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
