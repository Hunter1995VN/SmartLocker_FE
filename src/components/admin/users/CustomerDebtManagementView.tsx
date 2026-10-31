/**
 * Quản lý dư nợ & Kiểm soát quyền đặt tủ (Chỉ tính Travelers)
 * Theo dõi công nợ cước quá hạn của khách thuê tủ, tạm khóa quyền đặt tủ mới
 * trong khi vẫn giữ tài khoản ACTIVE để khách đăng nhập xem đơn và thanh toán online.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Receipt,
    AlertTriangle,
    CheckCircle2,
    ShieldAlert,
    Search,
    RotateCw,
    Download,
    ArrowRight,
    UserCheck,
    X,
    Lock,
    Unlock,
    DollarSign,
    AlertCircle,
    Info,
} from 'lucide-react';
import adminUserService, {
    type UserAdminListItemDto,
} from '../../../api/adminUserService';
import { formatDate, getInitials } from './userConstants';

interface NotificationState {
    type: 'success' | 'error';
    message: string;
}

interface CustomerDebtManagementViewProps {
    onNavigateUsers?: () => void;
}

export default function CustomerDebtManagementView({
    onNavigateUsers,
}: CustomerDebtManagementViewProps = {}) {
    // 1. Current user & role check
    const currentAdminUser = useMemo(() => {
        try {
            const saved = localStorage.getItem('smartlocker_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    }, []);
    const isAdmin = (currentAdminUser?.role || '').trim().toUpperCase() === 'ADMIN';

    // 2. States
    const [users, setUsers] = useState<UserAdminListItemDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [debtFilter, setDebtFilter] = useState<'ALL' | 'HAS_DEBT' | 'NO_DEBT' | 'BLOCKED_BOOKING'>('ALL');

    // Notification toast
    const [notification, setNotification] = useState<NotificationState | null>(null);

    // Modal state for adjusting / waiving debt
    const [debtModalUser, setDebtModalUser] = useState<UserAdminListItemDto | null>(null);
    const [newDebtAmount, setNewDebtAmount] = useState<number>(0);
    const [debtReason, setDebtReason] = useState<string>('');
    const [isSubmittingDebt, setIsSubmittingDebt] = useState(false);
    const [isBatchBlocking, setIsBatchBlocking] = useState(false);

    // Auto-dismiss notification
    useEffect(() => {
        if (!notification) return;
        const timer = setTimeout(() => setNotification(null), 4500);
        return () => clearTimeout(timer);
    }, [notification]);

    // 3. Load users (Filter only TRAVELER)
    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        setFetchError(null);

        try {
            const res = await adminUserService.getUsers();
            if (res.success && res.data) {
                // Chỉ lấy tài khoản TRAVELER (Khách hàng)
                const travelers = res.data.filter(
                    (u) => (u.role || '').toUpperCase() === 'TRAVELER'
                );
                setUsers(travelers);
            } else {
                setFetchError(res.message || 'Không thể tải danh sách khách hàng');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setFetchError(
                axiosErr.response?.data?.message || 'Lỗi kết nối máy chủ khi tải danh sách khách hàng'
            );
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 4. KPIs for Debt
    const kpis = useMemo(() => {
        const totalTravelers = users.length;
        const debtors = users.filter((u) => Number(u.overdueDebt || 0) > 0);
        const debtorCount = debtors.length;
        const totalOverdueDebt = debtors.reduce(
            (sum, u) => sum + Math.max(0, Number(u.overdueDebt || 0)),
            0
        );
        const cleanCount = totalTravelers - debtorCount;
        const cleanRatio = totalTravelers > 0 ? Math.round((cleanCount / totalTravelers) * 100) : 100;

        return {
            totalTravelers,
            debtorCount,
            totalOverdueDebt,
            cleanCount,
            cleanRatio,
        };
    }, [users]);

    // 5. Filtered travelers list
    const filteredTravelers = useMemo(() => {
        return users.filter((u) => {
            const query = searchQuery.trim().toLowerCase();
            const matchSearch =
                !query ||
                (u.fullName && u.fullName.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query)) ||
                (u.phone && u.phone.toLowerCase().includes(query));

            const debt = Number(u.overdueDebt || 0);
            const isBlocked = debt > 0 || Boolean(u.isBookingBlocked);

            let matchDebt = true;
            if (debtFilter === 'HAS_DEBT') matchDebt = debt > 0;
            else if (debtFilter === 'NO_DEBT') matchDebt = debt <= 0;
            else if (debtFilter === 'BLOCKED_BOOKING') matchDebt = isBlocked;

            return matchSearch && matchDebt;
        });
    }, [users, searchQuery, debtFilter]);

    // 6. Action Handlers
    // Mở modal điều chỉnh / thu nợ
    const handleOpenDebtModal = (user: UserAdminListItemDto, defaultAmount?: number) => {
        setDebtModalUser(user);
        setNewDebtAmount(defaultAmount !== undefined ? defaultAmount : Number(user.overdueDebt || 0));
        setDebtReason('');
    };

    // Xác nhận lưu cước nợ (Mở khóa hoặc Tạm khóa đặt tủ)
    const handleSaveDebt = async () => {
        if (!debtModalUser) return;
        setIsSubmittingDebt(true);
        try {
            const res = await adminUserService.updateUserDebt(debtModalUser.id, {
                overdueDebt: newDebtAmount,
                reason: debtReason.trim() || (newDebtAmount === 0 ? 'Khách đã thanh toán nợ / Admin mở khóa đặt tủ' : 'Cập nhật nợ cước quá hạn'),
                autoSuspendIfDebt: false, // GIỮ TÀI KHOẢN ACTIVE ĐỂ KHÁCH ĐĂNG NHẬP
            });

            if (res.success) {
                setNotification({
                    type: 'success',
                    message: newDebtAmount === 0
                        ? `Đã xóa nợ thành công! Khách hàng ${debtModalUser.fullName || debtModalUser.email} đã được mở khóa quyền đặt tủ.`
                        : `Đã cập nhật dư nợ cước ${newDebtAmount.toLocaleString('vi-VN')} đ (Tạm khóa đặt tủ cho đến khi thanh toán).`,
                });
                setDebtModalUser(null);
                await loadData(true);
            } else {
                setNotification({
                    type: 'error',
                    message: res.message || 'Cập nhật dư nợ thất bại.',
                });
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Có lỗi xảy ra khi cập nhật dư nợ.',
            });
        } finally {
            setIsSubmittingDebt(false);
        }
    };

    // Tạm khóa đặt tủ hàng loạt
    const handleBatchBlockBooking = async () => {
        if (!isAdmin || kpis.debtorCount === 0) return;
        setIsBatchBlocking(true);
        try {
            const res = await adminUserService.blockAllDebtors('Tạm khóa quyền đặt tủ đối với khách hàng nợ cước quá hạn');
            if (res.success) {
                setNotification({
                    type: 'success',
                    message: `Đã xác nhận tạm khóa quyền đặt tủ cho ${kpis.debtorCount} khách hàng nợ cước. Tài khoản vẫn duy trì hoạt động để đăng nhập thanh toán.`,
                });
                await loadData(true);
            } else {
                setNotification({
                    type: 'error',
                    message: res.message || 'Thao tác tạm khóa đặt tủ hàng loạt thất bại.',
                });
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Lỗi khi thực hiện thao tác hàng loạt.',
            });
        } finally {
            setIsBatchBlocking(false);
        }
    };

    // Xuất CSV
    const handleExportCsv = () => {
        if (filteredTravelers.length === 0) {
            setNotification({ type: 'error', message: 'Không có dữ liệu để xuất CSV' });
            return;
        }

        const headers = ['Mã khách', 'Họ và tên', 'Email', 'Số điện thoại', 'Dư nợ cước (VNĐ)', 'Quyền đặt tủ', 'Trạng thái tài khoản', 'Ngày tạo'];
        const rows = filteredTravelers.map((u) => [
            u.id,
            `"${u.fullName || ''}"`,
            u.email,
            u.phone || '',
            u.overdueDebt || 0,
            Number(u.overdueDebt || 0) > 0 ? 'TẠM KHÓA ĐẶT TỦ' : 'ĐƯỢC PHÉP ĐẶT TỦ',
            u.status,
            u.createdAt,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DS_Du_No_Khach_Hang_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setNotification({ type: 'success', message: `Đã xuất ${filteredTravelers.length} khách hàng ra file CSV` });
    };

    return (
        <div className="space-y-4">
            {/* Top Breadcrumb & Page Header */}
            <div>
                <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5">
                    <span>Quản trị</span>
                    <span>/</span>
                    <span>Quản trị hệ thống</span>
                    <span>/</span>
                    <span className="text-blue-600 font-bold">Quản lý dư nợ & Đặt tủ</span>
                </nav>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                                Quản Lý Dư Nợ & Quyền Đặt Tủ
                            </h1>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                CHỈ TÍNH TRAVELERS (KHÁCH THUÊ TỦ)
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Theo dõi công nợ cước quá hạn của khách hàng, tạm khóa quyền đặt tủ mới khi có nợ cước (vẫn giữ tài khoản hoạt động để khách đăng nhập thanh toán online).
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {onNavigateUsers && (
                            <button
                                type="button"
                                onClick={onNavigateUsers}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                            >
                                <UserCheck className="w-4 h-4 text-slate-500" />
                                <span>Quản lý tài khoản toàn hệ thống</span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        )}

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={handleBatchBlockBooking}
                                disabled={isBatchBlocking || kpis.debtorCount === 0}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs shadow-rose-600/20 disabled:opacity-50"
                                title="Tạm dừng quyền tạo đơn mới của các khách hàng đang có nợ cước quá hạn"
                            >
                                <ShieldAlert className="w-4 h-4" />
                                <span>
                                    {isBatchBlocking
                                        ? 'Đang xử lý...'
                                        : `Tạm khóa đặt tủ tất cả khách nợ (${kpis.debtorCount})`}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {fetchError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{fetchError}</span>
                </div>
            )}
            {/* Notification Banner */}
            {notification && (
                <div
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
                        notification.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {notification.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{notification.message}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setNotification(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* KPI 1: Tổng dư nợ */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Tổng Dư Nợ Cước Quá Hạn
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <Receipt className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-rose-600 mt-2 font-mono">
                        {kpis.totalOverdueDebt.toLocaleString('vi-VN')} đ
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                        Cước phạt & phụ phí quá hạn chưa thu
                    </p>
                </div>

                {/* KPI 2: Khách hàng nợ cước */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Khách Hàng Đang Nợ Cước
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-xl sm:text-2xl font-black text-slate-900">
                            {kpis.debtorCount}
                        </p>
                        <span className="text-xs text-slate-400 font-medium">/ {kpis.totalTravelers} khách</span>
                    </div>
                    <p className="text-[11px] text-amber-600 font-semibold mt-1">
                        {kpis.debtorCount > 0 ? 'Cần đôn đốc nộp phạt / thanh toán' : 'Không có khách nợ cước'}
                    </p>
                </div>

                {/* KPI 3: Tạm khóa đặt tủ */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Tạm Khóa Quyền Đặt Tủ
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <Lock className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-rose-600 mt-2">
                        {kpis.debtorCount}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                        Tự động chặn theo luật BR-P08
                    </p>
                </div>

                {/* KPI 4: Tỷ lệ đủ điều kiện */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Đủ Điều Kiện Thuê Tủ
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                            {kpis.cleanRatio}%
                        </p>
                        <span className="text-xs text-slate-400 font-medium">({kpis.cleanCount} khách)</span>
                    </div>
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">
                        Sạch nợ &amp; được phép đặt tủ ngay
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm khách hàng theo Tên, Email, Số điện thoại..."
                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:bg-white text-slate-800 placeholder-slate-400 transition"
                    />
                </div>

                {/* Quick Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setDebtFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                            debtFilter === 'ALL'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        Tất cả khách ({users.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setDebtFilter('HAS_DEBT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                            debtFilter === 'HAS_DEBT'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Có nợ cước ({kpis.debtorCount})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setDebtFilter('NO_DEBT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                            debtFilter === 'NO_DEBT'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                    >
                        Sạch nợ ({kpis.cleanCount})
                    </button>

                    <button
                        type="button"
                        onClick={handleExportCsv}
                        className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200/80"
                        title="Xuất CSV"
                    >
                        <Download className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        disabled={isRefreshing}
                        className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200/80"
                        title="Làm mới"
                    >
                        <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Travelers Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                <th className="py-3 px-4">Khách hàng</th>
                                <th className="py-3 px-4">Dư nợ cước quá hạn</th>
                                <th className="py-3 px-4">Quyền đặt tủ (Booking)</th>
                                <th className="py-3 px-4">Tài khoản đăng nhập</th>
                                <th className="py-3 px-4">Ngày đăng ký</th>
                                <th className="py-3 px-4 text-right">Thao tác xử lý</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <RotateCw className="w-6 h-6 animate-spin text-blue-600" />
                                            <span>Đang tải danh sách công nợ khách hàng...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTravelers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                            <p className="font-semibold text-slate-700">
                                                {searchQuery || debtFilter !== 'ALL'
                                                    ? 'Không tìm thấy khách hàng phù hợp với bộ lọc'
                                                    : 'Tất cả khách hàng đều sạch nợ và đủ điều kiện thuê tủ!'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTravelers.map((user) => {
                                    const debtAmount = Math.max(0, Number(user.overdueDebt || 0));
                                    const hasDebt = debtAmount > 0;
                                    const isActive = (user.status || '').toUpperCase() === 'ACTIVE';

                                    return (
                                        <tr
                                            key={user.id}
                                            className={`transition-colors hover:bg-slate-50/80 ${
                                                hasDebt ? 'bg-rose-50/20' : ''
                                            }`}
                                        >
                                            {/* Info */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-xs shrink-0 border border-slate-200/60 shadow-2xs">
                                                        {getInitials(user.fullName)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-slate-800 truncate block">
                                                            {user.fullName || 'Chưa cập nhật tên'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 truncate block">
                                                            {user.email}
                                                        </span>
                                                        {user.phone && (
                                                            <span className="text-[10px] text-slate-400 font-mono block">
                                                                {user.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Overdue Debt */}
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {hasDebt ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-700 border border-rose-200 font-mono">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                                        <span>{debtAmount.toLocaleString('vi-VN')} đ</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                        <span>0 đ (Sạch nợ)</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Booking Access Status */}
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {hasDebt ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <Lock className="w-3.5 h-3.5 text-rose-600" />
                                                        <span>Tạm khóa đặt tủ</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span>Được phép đặt tủ</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Account Login Status */}
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {isActive ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span>Hoạt động (Có thể login trả tiền)</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                        <span>{user.status}</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Created At */}
                                            <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                                {formatDate(user.createdAt)}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isAdmin && hasDebt && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenDebtModal(user, 0)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition cursor-pointer"
                                                            title="Xác nhận khách đã nộp tiền cước và mở lại quyền đặt tủ"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            <span>Mở khóa đặt tủ (Thu nợ)</span>
                                                        </button>
                                                    )}

                                                    {isAdmin && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenDebtModal(user)}
                                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                                            title="Điều chỉnh số tiền nợ cước"
                                                        >
                                                            <DollarSign className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer note */}
                <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                            Quy tắc BR-P08: Khách hàng có dư nợ &gt; 0đ sẽ tự động bị tạm khóa đặt tủ mới, nhưng tài khoản vẫn duy trì hoạt động để khách có thể quét mã VietQR/PayOS thanh toán nợ online.
                        </span>
                    </div>
                    <span className="font-mono text-slate-400">
                        Hiển thị {filteredTravelers.length} / {users.length} khách hàng
                    </span>
                </div>
            </div>

            {/* Modal: Điều chỉnh nợ / Mở khóa đặt tủ */}
            {debtModalUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900">
                                        {newDebtAmount === 0
                                            ? 'Mở Khóa Đặt Tủ & Thu Nợ'
                                            : 'Điều Chỉnh Công Nợ Khách Hàng'}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Khách hàng: <strong className="text-slate-700">{debtModalUser.fullName || debtModalUser.email}</strong>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDebtModalUser(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <span className="text-slate-500">Dư nợ cước hiện tại:</span>
                                <span className="font-mono font-extrabold text-rose-600 text-sm">
                                    {Number(debtModalUser.overdueDebt || 0).toLocaleString('vi-VN')} đ
                                </span>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Số tiền nợ cước mới (VNĐ) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={newDebtAmount}
                                        onChange={(e) => setNewDebtAmount(Math.max(0, Number(e.target.value)))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                        đ
                                    </span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewDebtAmount(0)}
                                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                                    >
                                        ✓ Xóa sạch nợ (0 đ) — Mở khóa đặt tủ
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Lý do xử lý / Biên lai thu tiền
                                </label>
                                <textarea
                                    value={debtReason}
                                    onChange={(e) => setDebtReason(e.target.value)}
                                    rows={2}
                                    placeholder="Ví dụ: Khách đã nộp phạt tiền mặt tại quầy / Khách đã chuyển khoản PayOS..."
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-700 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" />
                                    <span>Lưu ý về quyền đăng nhập:</span>
                                </p>
                                <p>
                                    Khi điều chỉnh nợ cước, tài khoản của khách vẫn luôn ở trạng thái <strong>HOẠT ĐỘNG</strong> để khách có thể đăng nhập xem hóa đơn và thanh toán online. Chỉ quyền đặt thêm tủ mới bị tạm dừng khi cước nợ &gt; 0đ.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDebtModalUser(null)}
                                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveDebt}
                                disabled={isSubmittingDebt}
                                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs shadow-blue-600/20 disabled:opacity-50"
                            >
                                {isSubmittingDebt ? 'Đang cập nhật...' : 'Xác nhận cập nhật'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
