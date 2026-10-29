/**
 * AD-FE-11: UC-A11 — Phê duyệt Lệnh Hoàn tiền Thủ công cho các Trường hợp Ngoại lệ
 * Tích hợp đầy đủ:
 * 1. Hàng đợi Phê duyệt 2 cấp (STAFF đề xuất hiện trường -> ADMIN thẩm định độc lập & giải ngân)
 * 2. Tra cứu trực tiếp các giao dịch PAID trên PayOS đủ điều kiện hoàn tiền & kiểm tra Trần chống hoàn lố
 * 3. Đồng bộ tự động bút toán REFUND vào bảng Payments để khớp 100% với Đối soát tài chính PayOS (UC-A12)
 */
import { useState, useEffect, useCallback } from 'react';
import {
    RotateCcw,
    Plus,
    RefreshCw,
    Download,
    Search,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ShieldCheck,
    Landmark,
    Eye,
    ExternalLink,
    FileCheck2,
    Wrench,
} from 'lucide-react';
import adminManualRefundService from '../../../api/adminManualRefundService';
import type {
    ManualRefundOverviewDto,
    ManualRefundItemDto,
    RefundablePaymentCandidateDto,
    CreateManualRefundRequest,
    ApproveManualRefundRequest,
    ConfirmManualRefundDisbursementRequest,
} from '../../../api/adminManualRefundService';
import CreateManualRefundModal from './CreateManualRefundModal';
import ReviewManualRefundModal from './ReviewManualRefundModal';

interface ManualRefundManagementViewProps {
    userRole?: string;
    onNavigateReconciliation?: () => void;
    onNavigateAudit?: () => void;
}

type RefundTabKey = 'APPROVAL_QUEUE' | 'ELIGIBLE_TRANSACTIONS' | 'POLICY_MATRIX';

const formatVnd = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;

const formatDateTime = (iso?: string) => {
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

const CATEGORY_META: Record<string, { label: string; cls: string }> = {
    HARDWARE_LOCK_JAM: {
        label: 'Kẹt khóa / Lỗi IoT',
        cls: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    STATION_OUTAGE: {
        label: 'Mất điện / Mất kết nối trạm',
        cls: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    DUPLICATE_OR_OVERCHARGE: {
        label: 'Thu trùng / Lệch phí PayOS',
        cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    FORCE_MAJEURE_COMPLAINT: {
        label: 'Bất khả kháng / CSKH',
        cls: 'bg-sky-50 text-sky-700 border-sky-200',
    },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
    PENDING_APPROVAL: {
        label: 'Chờ Admin duyệt',
        cls: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    APPROVED_PENDING_PAYOUT: {
        label: 'Đã duyệt · Chờ chuyển khoản',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    DISBURSED: {
        label: 'Đã hoàn tiền thành công',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    REJECTED: {
        label: 'Đã từ chối',
        cls: 'bg-slate-100 text-slate-600 border-slate-200',
    },
};

export default function ManualRefundManagementView({
    userRole,
    onNavigateReconciliation,
    onNavigateAudit,
}: ManualRefundManagementViewProps) {
    const [isAdmin] = useState<boolean>(() => {
        if (userRole) return userRole.trim().toUpperCase() === 'ADMIN';
        try {
            const raw = localStorage.getItem('smartlocker_user');
            if (!raw) return false;
            const parsed = JSON.parse(raw) as { role?: string };
            return (parsed.role || '').trim().toUpperCase() === 'ADMIN';
        } catch {
            return false;
        }
    });

    const [activeTab, setActiveTab] = useState<RefundTabKey>('APPROVAL_QUEUE');
    const [overview, setOverview] = useState<ManualRefundOverviewDto | null>(null);
    const [candidates, setCandidates] = useState<RefundablePaymentCandidateDto[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [candidateSearch, setCandidateSearch] = useState<string>('');

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
    const [preselectedCandidate, setPreselectedCandidate] =
        useState<RefundablePaymentCandidateDto | null>(null);
    const [reviewItem, setReviewItem] = useState<ManualRefundItemDto | null>(null);

    const showToast = useCallback((type: 'success' | 'error', text: string) => {
        setToast({ type, text });
        window.setTimeout(() => {
            setToast((prev) => (prev?.text === text ? null : prev));
        }, 4500);
    }, []);

    const fetchAll = useCallback(
        async (silent = false) => {
            if (!silent) setLoading(true);
            else setRefreshing(true);
            try {
                const [ovRes, candRes] = await Promise.all([
                    adminManualRefundService.getOverview({
                        status: statusFilter,
                        category: categoryFilter,
                        search: searchQuery,
                    }),
                    adminManualRefundService.getCandidates(candidateSearch),
                ]);

                if (ovRes.success && ovRes.data) {
                    setOverview(ovRes.data);
                }
                if (candRes.success && candRes.data) {
                    setCandidates(candRes.data);
                }
            } catch (err: unknown) {
                const axiosErr = err as { response?: { data?: { message?: string } } };
                showToast(
                    'error',
                    axiosErr.response?.data?.message ||
                        'Không thể kết nối API Quản lý Lệnh Hoàn tiền Ngoại lệ.'
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [statusFilter, categoryFilter, searchQuery, candidateSearch, showToast]
    );

    useEffect(() => {
        void fetchAll(false);
    }, [fetchAll]);

    const handleCreateSubmit = async (payload: CreateManualRefundRequest) => {
        const res = await adminManualRefundService.createRequest(payload);
        if (!res.success) throw new Error(res.message);
        showToast('success', res.message || 'Đã lập lệnh đề xuất hoàn tiền ngoại lệ thành công!');
        await fetchAll(true);
    };

    const handleApproveSubmit = async (refundId: string, body: ApproveManualRefundRequest) => {
        const res = await adminManualRefundService.approveRequest(refundId, body);
        if (!res.success) throw new Error(res.message);
        showToast('success', res.message || 'Đã phê duyệt lệnh hoàn tiền ngoại lệ!');
        await fetchAll(true);
    };

    const handleRejectSubmit = async (refundId: string, reason: string) => {
        const res = await adminManualRefundService.rejectRequest(refundId, {
            rejectionReason: reason,
        });
        if (!res.success) throw new Error(res.message);
        showToast('success', res.message || 'Đã từ chối lệnh hoàn tiền ngoại lệ.');
        await fetchAll(true);
    };

    const handleDisburseSubmit = async (
        refundId: string,
        body: ConfirmManualRefundDisbursementRequest
    ) => {
        const res = await adminManualRefundService.confirmDisbursement(refundId, body);
        if (!res.success) throw new Error(res.message);
        showToast('success', res.message || 'Đã xác nhận tất toán chuyển khoản hoàn tiền!');
        await fetchAll(true);
    };

    const handleExportCsv = () => {
        const rowsData = overview?.items ?? [];
        const headers = [
            'MaLenhHoan',
            'MaBooking',
            'OrderCodeGoc',
            'KhachHang',
            'Tram',
            'NhomNgoaiLe',
            'ThucThuGoc',
            'DeXuatHoan',
            'DuyetHoan',
            'TrangThai',
            'MaButToanNH',
            'NguoiDeXuat',
            'NguoiPheDuyet',
            'ThoiDiemTao',
        ];
        const rows = rowsData.map((r) => [
            r.refundCode,
            r.bookingCode,
            r.originalOrderCode,
            `"${(r.customerName || '').replace(/"/g, '""')}"`,
            `"${(r.stationName || '').replace(/"/g, '""')}"`,
            r.exceptionCategory,
            r.originalPaidAmount,
            r.requestedAmount,
            r.approvedAmount ?? '',
            r.status,
            r.gatewayTransferRef ?? '',
            r.requestedByEmail,
            r.reviewedByEmail ?? '',
            r.requestedAt,
        ]);
        const csvContent =
            '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SmartLocker_Manual_Refunds_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const items = overview?.items ?? [];

    return (
        <div className="space-y-5">
            {/* Toast */}
            {toast && (
                <div
                    className={`p-3.5 rounded-2xl border flex items-center justify-between shadow-sm text-xs font-semibold ${
                        toast.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {toast.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{toast.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        className="text-slate-400 hover:text-slate-700 font-bold px-2 cursor-pointer"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-600/20">
                        <RotateCcw className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-extrabold text-slate-900">
                                Phê Duyệt Lệnh Hoàn Tiền Thủ Công (Trường Hợp Ngoại Lệ)
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                UC-A11 · Exception Refund Control
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Xử lý hoàn tiền ngoài quy tắc tự động (kẹt khóa điện từ IoT, mất kết nối trạm, thu trùng
                            PayOS, khiếu nại bất khả kháng) với hàng rào <strong>chống hoàn vượt thực thu</strong> và
                            hạch toán trực tiếp sang sổ đối soát <code className="font-mono">Payments</code>.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onNavigateReconciliation && (
                        <button
                            type="button"
                            onClick={onNavigateReconciliation}
                            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-blue-700 flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <span>Bảng Đối soát PayOS</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => void fetchAll(true)}
                        disabled={refreshing}
                        className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <RefreshCw
                            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-600' : ''}`}
                        />
                        <span>Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportCsv}
                        className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xuất CSV</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setPreselectedCandidate(null);
                            setIsCreateOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm shadow-purple-600/25 flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>+ Lập Lệnh Hoàn Tiền Ngoại Lệ</span>
                    </button>
                </div>
            </div>

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-amber-200/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                            Chờ Admin Phê Duyệt
                        </span>
                        <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-2xl font-extrabold text-amber-700 mt-1.5">
                        {loading ? '...' : overview?.pendingApprovalCount ?? 0} lệnh
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                        Tổng đề xuất chờ duyệt:{' '}
                        <strong className="text-slate-800">
                            {formatVnd(overview?.pendingApprovalAmount ?? 0)}
                        </strong>
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-blue-200/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                            Đã Duyệt · Chờ Chuyển Khoản
                        </span>
                        <Landmark className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-extrabold text-blue-700 mt-1.5">
                        {loading ? '...' : overview?.approvedPendingPayoutCount ?? 0} lệnh
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                        Giá trị chờ giải ngân:{' '}
                        <strong className="text-slate-800">
                            {formatVnd(overview?.approvedPendingPayoutAmount ?? 0)}
                        </strong>
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-emerald-200/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                            Đã Hoàn Tiền Ngoại Lệ
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-700 mt-1.5">
                        {loading ? '...' : formatVnd(overview?.totalDisbursedAmount ?? 0)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                        {overview?.disbursedCount ?? 0} lệnh hoàn tất · TB{' '}
                        <strong>{formatVnd(overview?.averageRefundAmount ?? 0)}/lệnh</strong>
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Đã Từ Chối / Bảo Vệ Quỹ
                        </span>
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
                        {loading ? '...' : overview?.rejectedCount ?? 0} lệnh
                    </p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                        Chặn 100% hoàn vượt thực thu PayOS
                    </p>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-xs flex flex-wrap gap-1.5">
                {[
                    {
                        key: 'APPROVAL_QUEUE' as RefundTabKey,
                        label: 'Hàng đợi Phê duyệt & Lịch sử Lệnh Hoàn tiền',
                        icon: FileCheck2,
                        badge: overview?.totalRequests ?? 0,
                    },
                    {
                        key: 'ELIGIBLE_TRANSACTIONS' as RefundTabKey,
                        label: 'Tra cứu Giao dịch PAID Đủ điều kiện Hoàn',
                        icon: Landmark,
                        badge: candidates.filter((c) => c.maxRefundableRemaining > 0).length,
                    },
                    {
                        key: 'POLICY_MATRIX' as RefundTabKey,
                        label: 'Quy chuẩn Hạn mức Ngoại lệ & Thống kê Nguyên nhân',
                        icon: ShieldCheck,
                    },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                                active
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{tab.label}</span>
                            {typeof tab.badge === 'number' && (
                                <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* TAB 1: APPROVAL QUEUE */}
            {activeTab === 'APPROVAL_QUEUE' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    {/* Filter Bar */}
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm mã lệnh MRF-..., mã đơn BK-..., OrderCode PayOS, tên khách..."
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-purple-600 focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
                            >
                                <option value="ALL">Tất cả trạng thái</option>
                                <option value="PENDING_APPROVAL">Chờ Admin duyệt</option>
                                <option value="APPROVED_PENDING_PAYOUT">Chờ chuyển khoản</option>
                                <option value="DISBURSED">Đã hoàn tiền</option>
                                <option value="REJECTED">Đã từ chối</option>
                            </select>

                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
                            >
                                <option value="ALL">Mọi nhóm ngoại lệ</option>
                                <option value="HARDWARE_LOCK_JAM">Sự cố kẹt khóa / IoT</option>
                                <option value="STATION_OUTAGE">Mất điện / Mất kết nối trạm</option>
                                <option value="DUPLICATE_OR_OVERCHARGE">Thu trùng / Lệch phí PayOS</option>
                                <option value="FORCE_MAJEURE_COMPLAINT">Bất khả kháng / CSKH</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                                    <th className="py-3 px-4">Mã Lệnh & Thời gian</th>
                                    <th className="py-3 px-4">Đơn đặt & Giao dịch Gốc</th>
                                    <th className="py-3 px-4">Nhóm Ngoại lệ & Lý do</th>
                                    <th className="py-3 px-4">Số tiền Hoàn / Thu gốc</th>
                                    <th className="py-3 px-4">Người Đề xuất / Duyệt</th>
                                    <th className="py-3 px-4">Trạng thái</th>
                                    <th className="py-3 px-4 text-right">Thẩm định</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            Đang tải danh sách lệnh hoàn tiền ngoại lệ...
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center space-y-2">
                                            <p className="text-slate-500 font-semibold">
                                                Chưa có lệnh hoàn tiền ngoại lệ nào trong bộ lọc hiện tại.
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                Nhấn nút <strong>+ Lập Lệnh Hoàn Tiền Ngoại Lệ</strong> hoặc chuyển sang
                                                tab <strong>Tra cứu Giao dịch PAID</strong> để khởi tạo đề xuất từ giao
                                                dịch thực tế.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => {
                                        const cat = CATEGORY_META[item.exceptionCategory] || {
                                            label: item.exceptionCategory,
                                            cls: 'bg-slate-100 text-slate-700 border-slate-200',
                                        };
                                        const st = STATUS_META[item.status] || {
                                            label: item.status,
                                            cls: 'bg-slate-100 text-slate-600 border-slate-200',
                                        };
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/75 transition">
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="font-mono font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                                                        {item.refundCode}
                                                    </span>
                                                    <p className="text-[11px] text-slate-400 mt-1">
                                                        {formatDateTime(item.requestedAt)}
                                                    </p>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <p className="font-bold text-blue-600">{item.bookingCode}</p>
                                                    <p className="text-slate-800 font-semibold">{item.customerName}</p>
                                                    <p className="text-[11px] text-slate-400">
                                                        Order #{item.originalOrderCode} · {item.stationName}
                                                    </p>
                                                </td>

                                                <td className="py-3.5 px-4 max-w-xs">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${cat.cls}`}
                                                    >
                                                        {cat.label}
                                                    </span>
                                                    <p className="text-slate-700 mt-1 line-clamp-2">
                                                        {item.reasonSummary}
                                                    </p>
                                                    {item.relatedIncidentCode && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-600 mt-0.5">
                                                            <Wrench className="w-3 h-3" />
                                                            {item.relatedIncidentCode}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <p className="font-mono font-extrabold text-sm text-purple-700">
                                                        {formatVnd(item.approvedAmount ?? item.requestedAmount)}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400">
                                                        / Thu gốc {formatVnd(item.originalPaidAmount)} (
                                                        {item.refundPercentOfPaid}%)
                                                    </p>
                                                    {item.gatewayTransferRef && (
                                                        <p className="text-[10px] font-mono text-emerald-700 font-bold">
                                                            FT: {item.gatewayTransferRef}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <p className="text-slate-700">
                                                        Đề xuất: <strong>{item.requestedByName}</strong> (
                                                        {item.requestedByRole})
                                                    </p>
                                                    {item.reviewedByName && (
                                                        <p className="text-[11px] text-emerald-700 mt-0.5">
                                                            Duyệt: <strong>{item.reviewedByName}</strong>
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${st.cls}`}
                                                    >
                                                        {st.label}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => setReviewItem(item)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] transition cursor-pointer ${
                                                            item.status === 'PENDING_APPROVAL' && isAdmin
                                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                                                : item.status === 'APPROVED_PENDING_PAYOUT' && isAdmin
                                                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                                                                : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                                                        }`}
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>
                                                            {item.status === 'PENDING_APPROVAL' && isAdmin
                                                                ? 'Xét duyệt ngay'
                                                                : item.status === 'APPROVED_PENDING_PAYOUT' && isAdmin
                                                                ? 'Xác nhận Chi'
                                                                : 'Chi tiết hồ sơ'}
                                                        </span>
                                                    </button>
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

            {/* TAB 2: ELIGIBLE PAID TRANSACTIONS */}
            {activeTab === 'ELIGIBLE_TRANSACTIONS' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-extrabold text-slate-900">
                                Danh sách Giao dịch Đã Thu Tiền (PAID) & Hạn Mức Còn Được Phép Hoàn
                            </h3>
                            <p className="text-xs text-slate-500">
                                Chọn nhanh 1 giao dịch thực tế để khởi tạo lệnh hoàn tiền ngoại lệ chuẩn xác, không lo
                                nhập sai mã đơn hoặc vượt số tiền thực thu.
                            </p>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={candidateSearch}
                                onChange={(e) => setCandidateSearch(e.target.value)}
                                placeholder="Tìm OrderCode, BK-..., khách hàng..."
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-purple-600 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                                    <th className="py-3 px-4">OrderCode PayOS</th>
                                    <th className="py-3 px-4">Đơn đặt & Trạng thái</th>
                                    <th className="py-3 px-4">Khách hàng & Trạm</th>
                                    <th className="py-3 px-4">Thực thu Gốc</th>
                                    <th className="py-3 px-4">Đã hoàn / Đang chờ</th>
                                    <th className="py-3 px-4">Trần hoàn khả dụng</th>
                                    <th className="py-3 px-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {candidates.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-10 text-center text-slate-400">
                                            Không tìm thấy giao dịch PAID nào khớp từ khóa.
                                        </td>
                                    </tr>
                                ) : (
                                    candidates.map((c) => (
                                        <tr key={c.paymentId} className="hover:bg-slate-50/70">
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <p className="font-mono font-bold text-slate-900">{c.orderCode}</p>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                    {c.paymentKind}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="font-bold text-blue-600">{c.bookingCode}</p>
                                                <span className="text-[11px] text-slate-500">
                                                    {c.bookingStatus}{' '}
                                                    {c.lockerCode ? `· Ô ${c.lockerCode}` : `· Size ${c.lockerSize}`}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="font-semibold text-slate-800">{c.customerName}</p>
                                                <p className="text-[11px] text-slate-400">{c.stationName}</p>
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                                {formatVnd(c.paidAmount)}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-amber-700 font-semibold">
                                                {formatVnd(c.alreadyRefundedAmount + c.pendingRefundRequestedAmount)}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-extrabold text-emerald-700">
                                                {formatVnd(c.maxRefundableRemaining)}
                                            </td>
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                {c.maxRefundableRemaining > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPreselectedCandidate(c);
                                                            setIsCreateOpen(true);
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[11px] transition cursor-pointer"
                                                    >
                                                        Lập lệnh hoàn tiền →
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Đã hoàn tối đa
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: POLICY MATRIX & BREAKDOWN */}
            {activeTab === 'POLICY_MATRIX' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
                        <h3 className="text-sm font-extrabold text-slate-900">
                            Phân bổ Giá trị Hoàn tiền theo Nhóm Nguyên nhân Ngoại lệ
                        </h3>
                        <div className="space-y-3">
                            {(overview?.categoryBreakdown ?? []).map((stat) => (
                                <div
                                    key={stat.category}
                                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                                >
                                    <div>
                                        <p className="text-xs font-extrabold text-slate-800">
                                            {stat.categoryLabel}
                                        </p>
                                        <p className="text-[11px] text-slate-500">{stat.count} hồ sơ phát sinh</p>
                                    </div>
                                    <span className="font-mono text-sm font-extrabold text-purple-700">
                                        {formatVnd(stat.totalAmount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5 text-xs">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-extrabold text-slate-900">
                                Quy tắc Kiểm soát Nội bộ & Hạch toán Kế toán
                            </h3>
                            {onNavigateAudit && (
                                <button
                                    type="button"
                                    onClick={onNavigateAudit}
                                    className="text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Mở Audit Logs</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="space-y-2.5 text-slate-600">
                            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                                <p className="font-bold">1. Chốt chặn Chống hoàn lố (Anti-Over-Refund Guardrail)</p>
                                <p className="mt-0.5 text-[11px]">
                                    Tổng tiền hoàn lũy kế + các lệnh đang chờ duyệt trên cùng một đơn đặt tủ không bao
                                    giờ được phép vượt quá tổng thực thu đã khớp trạng thái <code className="font-mono">PAID</code> từ cổng PayOS.
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-950">
                                <p className="font-bold">2. Phân tách Nhiệm vụ (Segregation of Duties — RBAC)</p>
                                <p className="mt-0.5 text-[11px]">
                                    Nhân viên hiện trường (<strong>STAFF</strong>) được phép lập đề xuất kèm biên bản sự
                                    cố nhưng bị khóa hoàn toàn quyền phê duyệt. Chỉ Quản trị viên (<strong>ADMIN</strong>) mới có thẩm quyền phê duyệt và xác nhận tất toán chuyển khoản.
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950">
                                <p className="font-bold">3. Đồng bộ Sổ cái Đối soát PayOS (UC-A12)</p>
                                <p className="mt-0.5 text-[11px]">
                                    Ngay khi xác nhận giải ngân, hệ thống tự động sinh dòng bút toán{' '}
                                    <code className="font-mono">Kind = REFUND, Status = REFUNDED</code> vào bảng{' '}
                                    <code className="font-mono">Payments</code> kèm mã FT ngân hàng, tự động khấu trừ
                                    chính xác vào Doanh thu thực nhận (Net Revenue).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <CreateManualRefundModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSubmit={handleCreateSubmit}
                candidates={candidates}
                preselectedCandidate={preselectedCandidate}
                isAdmin={isAdmin}
            />

            <ReviewManualRefundModal
                item={reviewItem}
                isOpen={Boolean(reviewItem)}
                onClose={() => setReviewItem(null)}
                isAdmin={isAdmin}
                onApprove={handleApproveSubmit}
                onReject={handleRejectSubmit}
                onConfirmDisbursement={handleDisburseSubmit}
            />
        </div>
    );
}
