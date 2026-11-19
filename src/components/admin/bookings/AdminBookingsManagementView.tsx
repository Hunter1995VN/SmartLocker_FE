import { useState, useEffect, useCallback } from 'react';
import {
    Receipt,
    Search,
    RefreshCw,
    Eye,
    XCircle,
    CheckCircle2,
    AlertTriangle,
    Clock,
    MapPin,
    Box,
    User,
    CreditCard,
    History,
    KeyRound,
    X,
} from 'lucide-react';
import adminBookingService, {
    type AdminBookingListItemDto,
    type AdminBookingDetailDto,
    type AdminBookingStatsDto,
} from '../../../api/adminBookingService';
import adminStationService, { type StationAdminDetailDto } from '../../../api/adminStationService';
import { parseServerTime } from '../../../utils/serverTime';
import Pagination from '../Pagination';
import ModalOverlay from '../../ui/ModalOverlay';

interface Props {
    onNotify: (message: string, type?: 'success' | 'error') => void;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    PENDING_PAYMENT: { label: 'Chờ thanh toán', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    CONFIRMED: { label: 'Đã xác nhận', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    STORED: { label: 'Đang gửi đồ', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    COMPLETED: { label: 'Đã hoàn tất', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
    COMPLETED_MANUAL: { label: 'Hoàn tất thủ công', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    CANCELLED: { label: 'Đã hủy', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    EXPIRED: { label: 'Hết hạn', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
    NO_SHOW: { label: 'Không đến', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    ABANDONED: { label: 'Bỏ quên >72h', cls: 'bg-red-100 text-red-800 border-red-300' },
};

const SIZE_COLOR: Record<string, string> = {
    S: 'bg-sky-50 text-sky-700 border-sky-200',
    M: 'bg-violet-50 text-violet-700 border-violet-200',
    L: 'bg-amber-50 text-amber-700 border-amber-200',
};

function formatDateTime(iso?: string | null): string {
    if (!iso) return '—';
    const ts = parseServerTime(iso);
    if (!ts || isNaN(ts)) return '—';
    return new Date(ts).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatMoney(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export default function AdminBookingsManagementView({ onNotify }: Props) {
    const [bookings, setBookings] = useState<AdminBookingListItemDto[]>([]);
    const [stats, setStats] = useState<AdminBookingStatsDto | null>(null);
    const [stations, setStations] = useState<StationAdminDetailDto[]>([]);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [stationFilter, setStationFilter] = useState('');
    const [onlyOverdue, setOnlyOverdue] = useState(false);

    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Detail modal
    const [detailModal, setDetailModal] = useState<AdminBookingDetailDto | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // Action modals
    const [cancelTarget, setCancelTarget] = useState<AdminBookingListItemDto | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [completeTarget, setCompleteTarget] = useState<AdminBookingListItemDto | null>(null);
    const [completeNote, setCompleteNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchStations = useCallback(async () => {
        try {
            const res = await adminStationService.getStations();
            if (res.success && Array.isArray(res.data)) {
                setStations(res.data);
            }
        } catch {
            // silent
        }
    }, []);

    const fetchData = useCallback(async (showSpinner = false) => {
        if (showSpinner) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const [res, statsRes] = await Promise.all([
                adminBookingService.getBookings({
                    search: search.trim() || undefined,
                    status: statusFilter || undefined,
                    stationId: stationFilter || undefined,
                    isOverdue: onlyOverdue ? true : undefined,
                    page,
                    pageSize,
                }),
                adminBookingService.getStats(stationFilter || undefined),
            ]);

            setBookings(res.items);
            setTotalCount(res.totalCount);
            setTotalPages(Math.max(1, res.totalPages));
            setStats(statsRes);
        } catch (err: any) {
            onNotify(err?.message || 'Không thể tải danh sách đơn hàng', 'error');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [search, statusFilter, stationFilter, onlyOverdue, page, pageSize, onNotify]);

    useEffect(() => {
        fetchStations();
    }, [fetchStations]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData(true);
        }, 200);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const handleOpenDetail = async (id: string) => {
        setIsLoadingDetail(true);
        try {
            const detail = await adminBookingService.getDetail(id);
            setDetailModal(detail);
        } catch (err: any) {
            onNotify(err?.message || 'Không thể tải chi tiết đơn hàng', 'error');
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleConfirmCancel = async () => {
        if (!cancelTarget) return;
        if (!cancelReason.trim()) {
            onNotify('Vui lòng nhập lý do hủy đơn', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const updated = await adminBookingService.cancelBooking(cancelTarget.id, cancelReason.trim());
            onNotify(`Đã hủy đơn ${cancelTarget.bookingCode} thành công`, 'success');
            setCancelTarget(null);
            setCancelReason('');
            if (detailModal?.id === updated.id) setDetailModal(updated);
            fetchData(false);
        } catch (err: any) {
            onNotify(err?.response?.data?.message || err?.message || 'Lỗi khi hủy đơn', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmComplete = async () => {
        if (!completeTarget) return;
        setIsSubmitting(true);
        try {
            const updated = await adminBookingService.forceCompleteBooking(completeTarget.id, completeNote.trim() || undefined);
            onNotify(`Đã hoàn tất thủ công đơn ${completeTarget.bookingCode} và giải phóng ô tủ`, 'success');
            setCompleteTarget(null);
            setCompleteNote('');
            if (detailModal?.id === updated.id) setDetailModal(updated);
            fetchData(false);
        } catch (err: any) {
            onNotify(err?.response?.data?.message || err?.message || 'Lỗi khi hoàn tất đơn', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalCount);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-blue-600" />
                        Quản lý Đơn hàng & Đặt tủ
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Theo dõi, tra cứu lịch sử đặt tủ, thanh toán VietQR và xử lý các đơn hàng quá hạn/sự cố.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => fetchData(false)}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer shadow-2xs disabled:opacity-60"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                    Làm mới dữ liệu
                </button>
            </div>

            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <p className="text-xs font-semibold text-slate-500">Tổng số đơn</p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.totalBookings ?? 0}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Chờ TT: {stats?.pendingPaymentCount ?? 0}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <p className="text-xs font-semibold text-slate-500">Đang gửi đồ</p>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats?.storedCount ?? 0}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Đã xác nhận: {stats?.confirmedCount ?? 0}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <p className="text-xs font-semibold text-slate-500">Hoàn tất</p>
                    <p className="text-2xl font-extrabold text-blue-600 mt-1">{stats?.completedCount ?? 0}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Đã hủy / Hết hạn: {stats?.cancelledCount ?? 0}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-rose-200/80 bg-rose-50/30 shadow-2xs">
                    <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Đang quá hạn
                    </p>
                    <p className="text-2xl font-extrabold text-rose-600 mt-1">{stats?.overdueCount ?? 0}</p>
                    <p className="text-[11px] text-rose-400 mt-0.5">Cần theo dõi thu hồi</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
                    <p className="text-xs font-semibold text-slate-500">Tổng doanh thu đơn</p>
                    <p className="text-xl font-extrabold text-slate-900 mt-1">
                        {formatMoney(stats?.totalRevenue ?? 0)}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Đã thanh toán</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Tìm theo mã đơn (SL...), tên khách, SĐT, email, mã tủ..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-blue-500 focus:outline-none"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <select
                        value={stationFilter}
                        onChange={(e) => {
                            setStationFilter(e.target.value);
                            setPage(1);
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                        <option value="">Tất cả trạm Đà Nẵng</option>
                        {stations.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="PENDING_PAYMENT">Chờ thanh toán</option>
                        <option value="CONFIRMED">Đã xác nhận</option>
                        <option value="STORED">Đang gửi đồ</option>
                        <option value="COMPLETED">Đã hoàn tất</option>
                        <option value="COMPLETED_MANUAL">Hoàn tất thủ công</option>
                        <option value="CANCELLED">Đã hủy</option>
                        <option value="EXPIRED">Hết hạn</option>
                    </select>

                    <button
                        type="button"
                        onClick={() => {
                            setOnlyOverdue(!onlyOverdue);
                            setPage(1);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                            onlyOverdue
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Quá hạn
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-4">Mã đơn</th>
                                <th className="py-3 px-4">Khách hàng</th>
                                <th className="py-3 px-4">Trạm & Ngăn tủ</th>
                                <th className="py-3 px-4">Thời gian gửi</th>
                                <th className="py-3 px-4 text-right">Thanh toán</th>
                                <th className="py-3 px-4">Trạng thái</th>
                                <th className="py-3 px-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        Đang tải danh sách đơn hàng...
                                    </td>
                                </tr>
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        Không tìm thấy đơn hàng nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((b) => {
                                    const badge = STATUS_BADGE[b.status] || {
                                        label: b.status,
                                        cls: 'bg-slate-100 text-slate-700 border-slate-200',
                                    };
                                    const canCancel = b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED';
                                    const canForceComplete = b.status === 'CONFIRMED' || b.status === 'STORED';

                                    return (
                                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-mono font-bold text-slate-900">{b.bookingCode}</div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(b.createdAt)}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-800">{b.customerName}</div>
                                                <div className="text-[11px] text-slate-500">
                                                    {b.customerPhone || b.customerEmail}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-800 line-clamp-1 max-w-[200px]" title={b.stationName}>
                                                    {b.stationName}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${SIZE_COLOR[b.size] || 'bg-slate-100 text-slate-700'}`}>
                                                        Size {b.size}
                                                    </span>
                                                    {b.lockerCode && (
                                                        <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            {b.lockerCode}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-slate-700">
                                                    <span className="text-slate-400">Từ:</span> {formatDateTime(b.startAt)}
                                                </div>
                                                <div className="text-slate-700 mt-0.5">
                                                    <span className="text-slate-400">Đến:</span> {formatDateTime(b.endAt)}
                                                </div>
                                                {b.extensionCount > 0 && (
                                                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">
                                                        Gia hạn {b.extensionCount} lần
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="font-bold text-slate-900">{formatMoney(b.paidAmount)}</div>
                                                {b.paidAmount !== b.baseAmount && (
                                                    <div className="text-[10px] text-slate-400">Gốc: {formatMoney(b.baseAmount)}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                    {b.isOverdue && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                                                            QUÁ HẠN
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenDetail(b.id)}
                                                        title="Xem chi tiết đơn hàng"
                                                        className="p-1.5 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {canForceComplete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCompleteTarget(b)}
                                                            title="Hoàn tất thủ công & Giải phóng tủ"
                                                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canCancel && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCancelTarget(b)}
                                                            title="Hủy đơn đặt tủ"
                                                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                                        >
                                                            <XCircle className="w-4 h-4" />
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

                <div className="px-4 py-3 border-t border-slate-100">
                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        total={totalCount}
                        from={from}
                        to={to}
                        onPageChange={setPage}
                        label="đơn hàng"
                    />
                </div>
            </div>

            {/* Detail Modal */}
            {(detailModal || isLoadingDetail) && (
                <ModalOverlay onClose={() => setDetailModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-2.5">
                                <Receipt className="w-5 h-5 text-blue-600" />
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">
                                        Chi tiết đơn hàng {detailModal?.bookingCode}
                                    </h3>
                                    <p className="text-xs text-slate-500">Tạo lúc {formatDateTime(detailModal?.createdAt)}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailModal(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {isLoadingDetail || !detailModal ? (
                            <div className="p-10 text-center text-sm text-slate-500">Đang tải thông tin chi tiết...</div>
                        ) : (
                            <div className="p-5 overflow-y-auto space-y-5 text-xs">
                                {/* Grid Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                        <div className="font-bold text-slate-700 flex items-center gap-1.5">
                                            <User className="w-4 h-4 text-blue-600" /> Khách hàng
                                        </div>
                                        <div className="text-slate-900 font-semibold">{detailModal.customerName}</div>
                                        <div className="text-slate-600">Email: {detailModal.customerEmail}</div>
                                        <div className="text-slate-600">SĐT: {detailModal.customerPhone || '—'}</div>
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                        <div className="font-bold text-slate-700 flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4 text-blue-600" /> Trạm & Ngăn tủ
                                        </div>
                                        <div className="text-slate-900 font-semibold">{detailModal.stationName}</div>
                                        <div className="flex items-center gap-2">
                                            <Box className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Ngăn: <strong>{detailModal.lockerCode || 'Chưa gán'}</strong> (Size {detailModal.size})</span>
                                        </div>
                                        {detailModal.accessCode && (
                                            <div className="flex items-center gap-2 text-blue-700 font-mono font-bold">
                                                <KeyRound className="w-3.5 h-3.5" /> PIN: {detailModal.accessCode}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Timings */}
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                                    <div className="font-bold text-slate-700 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-blue-600" /> Mốc thời gian thực tế
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                                        <div>
                                            <div className="text-slate-400">Bắt đầu</div>
                                            <div className="font-semibold text-slate-800">{formatDateTime(detailModal.startAt)}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400">Kết thúc (Dự kiến)</div>
                                            <div className="font-semibold text-slate-800">{formatDateTime(detailModal.endAt)}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400">Check-in thực tế</div>
                                            <div className="font-semibold text-emerald-700">{formatDateTime(detailModal.checkedInAt)}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400">Check-out thực tế</div>
                                            <div className="font-semibold text-blue-700">{formatDateTime(detailModal.checkedOutAt)}</div>
                                        </div>
                                    </div>
                                    {detailModal.cancellationReason && (
                                        <div className="mt-2 pt-2 border-t border-slate-200 text-rose-700">
                                            <strong>Ghi chú / Lý do:</strong> {detailModal.cancellationReason}
                                        </div>
                                    )}
                                </div>

                                {/* Payments */}
                                <div>
                                    <div className="font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                                        <CreditCard className="w-4 h-4 text-blue-600" /> Lịch sử giao dịch ({detailModal.payments.length})
                                    </div>
                                    {detailModal.payments.length === 0 ? (
                                        <p className="text-slate-400 italic">Chưa có giao dịch thanh toán nào.</p>
                                    ) : (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                                                    <tr>
                                                        <th className="py-2 px-3">Mã GD</th>
                                                        <th className="py-2 px-3">Loại</th>
                                                        <th className="py-2 px-3 text-right">Số tiền</th>
                                                        <th className="py-2 px-3">Trạng thái</th>
                                                        <th className="py-2 px-3">Thời gian</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {detailModal.payments.map((p) => (
                                                        <tr key={p.id}>
                                                            <td className="py-2 px-3 font-mono font-semibold">{p.orderCode}</td>
                                                            <td className="py-2 px-3">{p.kind}</td>
                                                            <td className="py-2 px-3 text-right font-bold">{formatMoney(p.amount)}</td>
                                                            <td className="py-2 px-3">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                    p.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                    {p.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-3 text-slate-500">{formatDateTime(p.paidAt || p.createdAt)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Extensions */}
                                {detailModal.extensions.length > 0 && (
                                    <div>
                                        <div className="font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                                            <History className="w-4 h-4 text-blue-600" /> Lịch sử gia hạn ({detailModal.extensions.length})
                                        </div>
                                        <div className="space-y-1.5">
                                            {detailModal.extensions.map((ext) => (
                                                <div key={ext.id} className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                                                    <span>
                                                        {formatDateTime(ext.oldEndAt)} → <strong>{formatDateTime(ext.newEndAt)}</strong>
                                                    </span>
                                                    <span className="text-slate-400">{formatDateTime(ext.extendedAt)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {detailModal && (
                            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
                                {(detailModal.status === 'PENDING_PAYMENT' || detailModal.status === 'CONFIRMED') && (
                                    <button
                                        type="button"
                                        onClick={() => setCancelTarget(detailModal)}
                                        className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 cursor-pointer"
                                    >
                                        Hủy đơn
                                    </button>
                                )}
                                {(detailModal.status === 'CONFIRMED' || detailModal.status === 'STORED') && (
                                    <button
                                        type="button"
                                        onClick={() => setCompleteTarget(detailModal)}
                                        className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                                    >
                                        Hoàn tất thủ công
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setDetailModal(null)}
                                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                                >
                                    Đóng
                                </button>
                            </div>
                        )}
                    </div>
                </ModalOverlay>
            )}

            {/* Cancel Modal */}
            {cancelTarget && (
                <ModalOverlay onClose={() => !isSubmitting && setCancelTarget(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
                        <h3 className="text-base font-bold text-slate-900">Hủy đơn đặt tủ {cancelTarget.bookingCode}</h3>
                        <p className="text-xs text-slate-600">
                            Đơn hàng sẽ bị hủy và giải phóng ngăn tủ đang giữ chỗ (nếu có). Vui lòng nhập lý do hủy:
                        </p>
                        <textarea
                            rows={3}
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Ví dụ: Khách hàng yêu cầu hủy do đổi lịch trình..."
                            className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:border-rose-500 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setCancelTarget(null)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleConfirmCancel}
                                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}

            {/* Force Complete Modal */}
            {completeTarget && (
                <ModalOverlay onClose={() => !isSubmitting && setCompleteTarget(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
                        <h3 className="text-base font-bold text-slate-900">Hoàn tất thủ công đơn {completeTarget.bookingCode}</h3>
                        <p className="text-xs text-slate-600">
                            Thao tác này sẽ đóng đơn hàng về trạng thái <strong>COMPLETED_MANUAL</strong> và giải phóng ô tủ{' '}
                            <strong>{completeTarget.lockerCode || ''}</strong> về trạng thái sẵn sàng (AVAILABLE).
                        </p>
                        <textarea
                            rows={3}
                            value={completeNote}
                            onChange={(e) => setCompleteNote(e.target.value)}
                            placeholder="Ghi chú (không bắt buộc, vd: Khách đã lấy đồ qua mở khóa khẩn cấp)..."
                            className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:border-emerald-500 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setCompleteTarget(null)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleConfirmComplete}
                                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận hoàn tất'}
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}
        </div>
    );
}
