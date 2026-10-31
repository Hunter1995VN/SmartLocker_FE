/**
 * AD-FE-06: Quản lý dư nợ & Kiểm soát quyền đặt tủ (Chỉ tính Travelers)
 * Theo dõi công nợ cước quá hạn của khách thuê tủ, tạm khóa/mở khóa quyền đặt tủ mới (BR-P08)
 * trong khi vẫn giữ tài khoản ACTIVE để khách đăng nhập xem đơn và quét VietQR thanh toán online.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Receipt,
    AlertTriangle,
    CheckCircle2,
    Search,
    RotateCw,
    Download,
    ArrowRight,
    X,
    Lock,
    Unlock,
    AlertCircle,
    User,
    Mail,
    Phone,
    Calendar,
    Save,
    ShieldAlert,
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
}: CustomerDebtManagementViewProps) {
    // 1. Current Logged-in User
    const currentAdminUser = useMemo(() => {
        try {
            const saved = localStorage.getItem('smartlocker_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    }, []);

    const role = (currentAdminUser?.role || '').trim().toUpperCase();
    const isAdmin = role === 'ADMIN';

    // 2. Data States
    const [travelers, setTravelers] = useState<UserAdminListItemDto[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<UserAdminListItemDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // 3. Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [debtFilter, setDebtFilter] = useState<'ALL' | 'HAS_DEBT' | 'NO_DEBT'>('ALL');

    // 4. Drawer & Action States
    const [debtInput, setDebtInput] = useState<string>('0');
    const [debtReason, setDebtReason] = useState<string>('');
    const [isUpdatingDebt, setIsUpdatingDebt] = useState<boolean>(false);
    const [isBatchBlocking, setIsBatchBlocking] = useState<boolean>(false);
    const [notification, setNotification] = useState<NotificationState | null>(null);

    // Synchronize drawer input when selectedCustomer changes
    useEffect(() => {
        if (selectedCustomer) {
            setDebtInput(String(Math.max(0, Number(selectedCustomer.overdueDebt || 0))));
            setDebtReason('');
        }
    }, [selectedCustomer?.id, selectedCustomer?.overdueDebt]);

    // 5. Fetch Travelers Only (Dependency [] so loadData is stable and never re-triggers infinite loop)
    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        setFetchError(null);

        try {
            const res = await adminUserService.getUsers({
                role: 'TRAVELER',
                pageSize: 200,
            });

            if (res.success && res.data) {
                const rawList = Array.isArray(res.data) ? res.data : [];
                const onlyTravelers = rawList.filter(
                    (u: UserAdminListItemDto) => (u.role || '').toUpperCase() === 'TRAVELER'
                );
                setTravelers(onlyTravelers);

                // Update selectedCustomer if already selected
                setSelectedCustomer((prev) => {
                    if (!prev) return null;
                    const updated = onlyTravelers.find((u: UserAdminListItemDto) => u.id === prev.id);
                    return updated || prev;
                });
            } else {
                setFetchError(res.message || 'Không thể tải danh sách khách hàng.');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setFetchError(axiosErr.response?.data?.message || 'Lỗi kết nối khi tải danh sách khách hàng.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 6. KPIs Calculation
    const kpis = useMemo(() => {
        const totalTravelers = travelers.length;
        const debtors = travelers.filter((u) => Number(u.overdueDebt || 0) > 0);
        const debtorCount = debtors.length;
        const cleanCount = totalTravelers - debtorCount;
        const totalOverdueDebt = debtors.reduce((sum, u) => sum + Number(u.overdueDebt || 0), 0);
        const eligibleRate = totalTravelers > 0 ? Math.round((cleanCount / totalTravelers) * 100) : 100;

        return {
            totalTravelers,
            debtorCount,
            cleanCount,
            totalOverdueDebt,
            eligibleRate,
        };
    }, [travelers]);

    // 7. Filtered Travelers
    const filteredTravelers = useMemo(() => {
        let result = travelers;

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(
                (u) =>
                    (u.fullName || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q) ||
                    (u.phone || '').toLowerCase().includes(q)
            );
        }

        // Debt filter
        if (debtFilter === 'HAS_DEBT') {
            result = result.filter((u) => Number(u.overdueDebt || 0) > 0);
        } else if (debtFilter === 'NO_DEBT') {
            result = result.filter((u) => Number(u.overdueDebt || 0) <= 0);
        }

        return result;
    }, [travelers, searchQuery, debtFilter]);

    // 8. Handle 1-Click Tạm Khóa Đặt Tủ Cho Khách Hàng (Block Booking)
    const handleQuickBlockBooking = async (customer: UserAdminListItemDto) => {
        if (!isAdmin) return;
        setIsUpdatingDebt(true);
        const penaltyAmount = 15000;
        const blockReason =
            debtReason.trim() ||
            `Quản trị viên tạm khóa quyền đặt tủ đối với khách hàng ${customer.fullName || customer.email}`;

        try {
            const res = await adminUserService.updateUserDebt(customer.id, {
                overdueDebt: penaltyAmount,
                reason: blockReason,
                autoSuspendIfDebt: false, // Maintain ACTIVE login so customer can still access portal
            });

            if (res.success) {
                const succMsg = `Đã tạm khóa quyền đặt tủ của ${customer.fullName || customer.email}! (Tài khoản vẫn đăng nhập bình thường)`;
                setNotification({ type: 'success', message: succMsg });
                // In-memory update
                setTravelers((prev) =>
                    prev.map((u) =>
                        u.id === customer.id
                            ? { ...u, overdueDebt: penaltyAmount, isBookingBlocked: true }
                            : u
                    )
                );
                setSelectedCustomer((prev) =>
                    prev && prev.id === customer.id
                        ? { ...prev, overdueDebt: penaltyAmount, isBookingBlocked: true }
                        : prev
                );
            } else {
                setNotification({ type: 'error', message: res.message || 'Thao tác tạm khóa đặt tủ thất bại.' });
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Có lỗi xảy ra khi tạm khóa đặt tủ.',
            });
        } finally {
            setIsUpdatingDebt(false);
        }
    };

    // 9. Handle 1-Click Mở Khóa Đặt Tủ & Thu Nợ (0đ) (Unblock Booking)
    const handleQuickClearDebt = async (customer: UserAdminListItemDto) => {
        if (!isAdmin) return;
        setIsUpdatingDebt(true);
        const reason = debtReason.trim() || 'Khách hàng đã thanh toán đầy đủ công nợ cước (0 đ) — Mở khóa quyền đặt tủ';

        try {
            const res = await adminUserService.updateUserDebt(customer.id, {
                overdueDebt: 0,
                reason,
                autoSuspendIfDebt: false,
            });

            if (res.success) {
                const succMsg = `Đã mở khóa quyền đặt tủ thành công! Khách hàng ${customer.fullName || customer.email} đã sạch nợ (0 đ) và được phép đặt tủ ngay.`;
                setNotification({ type: 'success', message: succMsg });
                // Optimistic in-memory update (no API reload needed!)
                setTravelers((prev) =>
                    prev.map((u) => (u.id === customer.id ? { ...u, overdueDebt: 0, isBookingBlocked: false } : u))
                );
                setSelectedCustomer((prev) =>
                    prev && prev.id === customer.id ? { ...prev, overdueDebt: 0, isBookingBlocked: false } : prev
                );
            } else {
                setNotification({ type: 'error', message: res.message || 'Thao tác mở khóa đặt tủ thất bại.' });
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Có lỗi xảy ra khi mở khóa quyền đặt tủ.',
            });
        } finally {
            setIsUpdatingDebt(false);
        }
    };

    // 10. Handle Save Manual Debt Adjustment
    const handleSaveDebtAdjustment = async () => {
        if (!selectedCustomer || !isAdmin) return;
        const parsed = Math.max(0, Number(debtInput || 0));
        if (Number.isNaN(parsed)) {
            setNotification({ type: 'error', message: 'Số tiền công nợ không hợp lệ.' });
            return;
        }

        setIsUpdatingDebt(true);
        const isDebt = parsed > 0;
        const reason =
            debtReason.trim() ||
            (isDebt
                ? `Điều chỉnh dư nợ cước quá hạn: ${parsed.toLocaleString('vi-VN')} đ (Tạm khóa quyền đặt tủ)`
                : 'Tất toán toàn bộ công nợ cước (0 đ) — Mở khóa quyền đặt tủ');

        try {
            const res = await adminUserService.updateUserDebt(selectedCustomer.id, {
                overdueDebt: parsed,
                reason,
                autoSuspendIfDebt: false, // Maintain ACTIVE login so customer can pay via VietQR
            });

            if (res.success) {
                const succMsg = isDebt
                    ? `Đã cập nhật dư nợ ${parsed.toLocaleString('vi-VN')} đ cho ${selectedCustomer.fullName || selectedCustomer.email}. Khách bị tạm khóa đặt tủ theo BR-P08.`
                    : `Đã xóa nợ về 0 đ cho ${selectedCustomer.fullName || selectedCustomer.email}. Quyền đặt tủ đã được mở lại!`;

                setNotification({ type: 'success', message: succMsg });
                // In-memory update
                setTravelers((prev) =>
                    prev.map((u) =>
                        u.id === selectedCustomer.id ? { ...u, overdueDebt: parsed, isBookingBlocked: isDebt } : u
                    )
                );
                setSelectedCustomer((prev) =>
                    prev && prev.id === selectedCustomer.id
                        ? { ...prev, overdueDebt: parsed, isBookingBlocked: isDebt }
                        : prev
                );
            } else {
                setNotification({ type: 'error', message: res.message || 'Cập nhật công nợ thất bại.' });
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Có lỗi xảy ra khi cập nhật công nợ.',
            });
        } finally {
            setIsUpdatingDebt(false);
        }
    };

    // 11. Handle Batch Block Debtors
    const handleBatchBlockDebtors = async () => {
        if (!isAdmin || kpis.debtorCount === 0) return;
        setIsBatchBlocking(true);
        try {
            const res = await adminUserService.blockAllDebtors(
                'Tạm khóa quyền đặt tủ mới đối với tất cả khách hàng nợ cước quá hạn (BR-P08)'
            );
            if (res.success) {
                setNotification({
                    type: 'success',
                    message: `Đã xác nhận tạm khóa quyền đặt tủ cho ${kpis.debtorCount} khách nợ cước. Tài khoản vẫn duy trì hoạt động để đăng nhập quét QR thanh toán.`,
                });
                await loadData(true);
            } else {
                setNotification({ type: 'error', message: res.message || 'Thao tác hàng loạt thất bại.' });
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

    // 12. Export CSV
    const handleExportCsv = () => {
        if (filteredTravelers.length === 0) {
            setNotification({ type: 'error', message: 'Không có dữ liệu khách hàng để xuất CSV.' });
            return;
        }

        const headers = ['Mã khách', 'Họ và tên', 'Email', 'Số điện thoại', 'Dư nợ cước (VNĐ)', 'Quyền đặt tủ', 'Trạng thái tài khoản', 'Ngày tạo'];
        const rows = filteredTravelers.map((u) => [
            u.id,
            `"${u.fullName || ''}"`,
            u.email,
            u.phone || '',
            u.overdueDebt || 0,
            Number(u.overdueDebt || 0) > 0 ? 'TẠM KHÓA ĐẶT TỦ (BR-P08)' : 'ĐƯỢC PHÉP ĐẶT TỦ',
            u.status,
            u.createdAt,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DS_Cong_No_Khach_Hang_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setNotification({ type: 'success', message: `Đã xuất ${filteredTravelers.length} khách hàng ra file CSV!` });
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

                    {/* Action buttons on header */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {onNavigateUsers && (
                            <button
                                type="button"
                                onClick={onNavigateUsers}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                            >
                                <span>Quản lý tài khoản toàn hệ thống</span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        )}

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={handleBatchBlockDebtors}
                                disabled={isBatchBlocking || kpis.debtorCount === 0}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Lock className="w-3.5 h-3.5" />
                                <span>
                                    {isBatchBlocking
                                        ? 'Đang khóa...'
                                        : `Tạm khóa đặt tủ tất cả khách nợ (${kpis.debtorCount})`}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Error banner if fetch failed */}
            {fetchError && (
                <div className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{fetchError}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadData(false)}
                        className="text-xs font-bold text-rose-700 underline cursor-pointer"
                    >
                        Thử lại
                    </button>
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
                    <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-2 font-mono">
                        {kpis.eligibleRate}%
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                        Sạch nợ & được phép đặt tủ ngay
                    </p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm khách hàng theo Tên, Email, Số điện thoại..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-2 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setDebtFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                            debtFilter === 'ALL'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Tất cả khách ({kpis.totalTravelers})
                    </button>
                    <button
                        type="button"
                        onClick={() => setDebtFilter('HAS_DEBT')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
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

            {/* Main Content Workspace: Split Table + Drawer Panel */}
            <div className={`grid grid-cols-1 ${selectedCustomer ? 'lg:grid-cols-12' : ''} gap-4 items-start`}>
                {/* Table column */}
                <div className={`${selectedCustomer ? 'lg:col-span-7 xl:col-span-8' : 'w-full'} bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden`}>
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
                                        const isSelected = selectedCustomer?.id === user.id;

                                        return (
                                            <tr
                                                key={user.id}
                                                onClick={() => setSelectedCustomer(user)}
                                                className={`transition-colors cursor-pointer group ${
                                                    isSelected
                                                        ? 'bg-blue-50/80 hover:bg-blue-50'
                                                        : hasDebt
                                                        ? 'bg-rose-50/25 hover:bg-rose-50/50'
                                                        : 'hover:bg-slate-50/80'
                                                }`}
                                            >
                                                {/* Info */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-xs shrink-0 border border-slate-200/60 shadow-2xs">
                                                            {getInitials(user.fullName)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-slate-800 truncate">
                                                                    {user.fullName || 'Khách tại kiosk'}
                                                                </span>
                                                                {isSelected && (
                                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white">
                                                                        ĐANG CHỌN
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 truncate font-mono">
                                                                {user.email}
                                                            </div>
                                                            {user.phone && (
                                                                <div className="text-[10px] text-slate-400 font-mono">
                                                                    {user.phone}
                                                                </div>
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
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span>Hoạt động (Có thể login trả tiền)</span>
                                                    </span>
                                                </td>

                                                {/* Created At */}
                                                <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                                    {formatDate(user.createdAt)}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {isAdmin && (
                                                            hasDebt ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuickClearDebt(user)}
                                                                    disabled={isUpdatingDebt}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition cursor-pointer"
                                                                    title="Mở khóa quyền đặt tủ cho khách hàng này (tất toán 0 đ)"
                                                                >
                                                                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                                                    <span>Mở khóa đặt tủ</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuickBlockBooking(user)}
                                                                    disabled={isUpdatingDebt}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition cursor-pointer"
                                                                    title="Tạm khóa quyền đặt tủ mới của khách hàng này"
                                                                >
                                                                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                                                                    <span>Khóa đặt tủ</span>
                                                                </button>
                                                            )
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCustomer(user)}
                                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                                                hasDebt
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                                                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                                            }`}
                                                            title="Xem chi tiết công nợ & thao tác"
                                                        >
                                                            <Receipt className="w-3.5 h-3.5" />
                                                            <span>Chi tiết</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Sliding Customer Debt Detail Drawer */}
                {selectedCustomer && (
                    <div className="lg:col-span-5 xl:col-span-4 sticky top-6 animate-in fade-in slide-in-from-right-4 duration-200">
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-5 space-y-5">
                            {/* Drawer Header */}
                            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                                <div>
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        HỒ SƠ CÔNG NỢ KHÁCH HÀNG
                                    </span>
                                    <h3 className="text-base font-extrabold text-slate-900 mt-1">
                                        {selectedCustomer.fullName || 'Khách tại kiosk'}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-mono">{selectedCustomer.email}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCustomer(null)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Customer Profile Mini Card */}
                            <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Họ tên:</span>
                                    <strong className="text-slate-800 ml-auto">
                                        {selectedCustomer.fullName || 'Chưa cập nhật'}
                                    </strong>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Email:</span>
                                    <span className="text-slate-800 ml-auto font-mono text-[11px] truncate max-w-[180px]">
                                        {selectedCustomer.email}
                                    </span>
                                </div>
                                {selectedCustomer.phone && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>Điện thoại:</span>
                                        <strong className="text-slate-800 ml-auto font-mono">
                                            {selectedCustomer.phone}
                                        </strong>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Ngày tạo:</span>
                                    <span className="text-slate-800 ml-auto font-mono text-[11px]">
                                        {formatDate(selectedCustomer.createdAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Section: Booking Access Control (Tạm khóa / Mở khóa quyền đặt tủ) */}
                            <div className="p-4 rounded-xl border space-y-3 bg-white border-slate-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Lock className="w-4 h-4 text-slate-600" />
                                        <span>Quyền đặt tủ (Booking)</span>
                                    </span>
                                    {Number(selectedCustomer.overdueDebt || 0) > 0 ? (
                                        <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                                            TẠM KHÓA ĐẶT TỦ
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                            ĐƯỢC PHÉP ĐẶT TỦ
                                        </span>
                                    )}
                                </div>

                                <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                                    {Number(selectedCustomer.overdueDebt || 0) > 0
                                        ? 'Khách hàng này đang bị tạm dừng quyền tạo đơn đặt tủ mới theo quy tắc BR-P08. Tài khoản vẫn duy trì ACTIVE để đăng nhập quét VietQR thanh toán.'
                                        : 'Khách hàng không có nợ quá hạn và hoàn toàn đủ điều kiện tạo đơn đặt tủ mới tại mọi trạm trong hệ thống.'}
                                </p>

                                {isAdmin && (
                                    <div className="pt-1">
                                        {Number(selectedCustomer.overdueDebt || 0) > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => handleQuickClearDebt(selectedCustomer)}
                                                disabled={isUpdatingDebt}
                                                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                                            >
                                                <Unlock className="w-4 h-4" />
                                                <span>
                                                    {isUpdatingDebt
                                                        ? 'Đang xử lý...'
                                                        : 'Mở khóa quyền đặt tủ (Tất toán nợ 0 đ)'}
                                                </span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleQuickBlockBooking(selectedCustomer)}
                                                disabled={isUpdatingDebt}
                                                className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 border border-rose-200 disabled:opacity-50"
                                            >
                                                <Lock className="w-4 h-4 text-rose-600" />
                                                <span>
                                                    {isUpdatingDebt
                                                        ? 'Đang xử lý...'
                                                        : 'Tạm khóa quyền đặt tủ'}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Section: Debt Status & Adjustment Card */}
                            <div className="p-4 rounded-xl border space-y-3 bg-white border-slate-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Receipt className="w-4 h-4 text-amber-600" />
                                        <span>Dư nợ cước hiện tại</span>
                                    </span>
                                    <span
                                        className={`px-2 py-0.5 rounded text-[11px] font-extrabold font-mono ${
                                            Number(selectedCustomer.overdueDebt || 0) > 0
                                                ? 'bg-rose-100 text-rose-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                        }`}
                                    >
                                        {Number(selectedCustomer.overdueDebt || 0).toLocaleString('vi-VN')} đ
                                    </span>
                                </div>

                                <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                                    <p className="font-bold flex items-center gap-1">
                                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Quy tắc kiến trúc BR-P08:</span>
                                    </p>
                                    <p className="text-[10.5px] leading-relaxed">
                                        Khi dư nợ &gt; 0 đ, hệ thống tự động <strong>tạm khóa quyền đặt tủ mới</strong>. Tài khoản vẫn duy trì trạng thái <strong>ACTIVE</strong> để khách hàng đăng nhập xem hóa đơn và quét mã QR PayOS thanh toán online.
                                    </p>
                                </div>

                                {/* Manual Debt Adjustment Form */}
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-slate-700">
                                            Điều chỉnh mức nợ:
                                        </label>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setDebtInput('0')}
                                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition cursor-pointer"
                                            >
                                                0 đ (Sạch nợ)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDebtInput(String(Math.max(0, Number(debtInput || 0)) + 30000))}
                                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-700 transition cursor-pointer"
                                            >
                                                +30.000 đ
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={debtInput}
                                        onChange={(e) => setDebtInput(e.target.value)}
                                        disabled={isUpdatingDebt}
                                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                                        placeholder="Nhập số tiền dư nợ (VNĐ)..."
                                    />

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Lý do điều chỉnh nợ:
                                        </label>
                                        <input
                                            type="text"
                                            value={debtReason}
                                            onChange={(e) => setDebtReason(e.target.value)}
                                            disabled={isUpdatingDebt}
                                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                                            placeholder="VD: Quá hạn gửi đồ chưa trả phụ phí..."
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSaveDebtAdjustment}
                                        disabled={isUpdatingDebt}
                                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>{isUpdatingDebt ? 'Đang cập nhật...' : 'Lưu mức nợ'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
