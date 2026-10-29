/**
 * AD-FE-09: UC-A09 — Thiết lập Chiến dịch Khuyến mại, Mã Voucher & Ngân sách Chiết khấu
 * Tích hợp đầy đủ:
 * 1. Hệ thống Trần Ngân sách Chiết khấu 3 Tầng (Global Monthly Cap -> Campaign Budget -> Voucher Cap)
 * 2. Bảo vệ tương thích cổng thanh toán PayOS (MinPayable >= 2.000đ, chống âm / bằng 0)
 * 3. Kho Mã Voucher trực tuyến (Copy 1 chạm, lọc, bật/tắt tức thì, nạp thêm ngân sách nhanh)
 * 4. Công cụ Giả lập Tính Chiết khấu & Kiểm tra Hạn mức Thời gian thực (Live Discount Simulator)
 * 5. Sổ cái Đối soát Giải ngân & Hoàn trả Hạn mức Tự động khi Hủy/Hết hạn đơn (Redemption Ledger)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Megaphone,
    Ticket,
    Wallet,
    TrendingUp,
    Plus,
    RefreshCw,
    Download,
    Search,
    Copy,
    Check,
    PauseCircle,
    PlayCircle,
    Edit3,
    Trash2,
    Calculator,
    ShieldCheck,
    AlertTriangle,
    Sparkles,
    History,
    ExternalLink,
    Lock,
    ArrowUpRight,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import adminPromotionService from '../../../api/adminPromotionService';
import type {
    PromotionDashboardOverviewDto,
    PromotionCampaignDto,
    VoucherAdminDto,
    UpsertPromotionCampaignRequest,
    UpsertVoucherRequest,
    VoucherValidationResultDto,
} from '../../../api/adminPromotionService';
import CampaignFormModal from './CampaignFormModal';
import VoucherFormModal from './VoucherFormModal';

interface PromotionVoucherManagementViewProps {
    onNavigateAudit?: () => void;
}

type PromoSubTab =
    | 'CAMPAIGNS_AND_BUDGET'
    | 'VOUCHER_INVENTORY'
    | 'DISCOUNT_SIMULATOR'
    | 'REDEMPTION_LEDGER';

const formatVnd = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;

const formatDateShort = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

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

const CATEGORY_LABELS: Record<string, { label: string; badgeClass: string }> = {
    NEW_USER: { label: 'Khách mới', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    SEASONAL: { label: 'Mùa du lịch', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
    LONG_STAY: { label: 'Gửi dài hạn', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    PARTNER: { label: 'Đối tác', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
    FLASH_SALE: { label: 'Flash Sale', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: 'Đang chạy', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PAUSED: { label: 'Tạm dừng', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    CAMPAIGN_PAUSED: { label: 'Chiến dịch dừng', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    SCHEDULED: { label: 'Chờ lịch chạy', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    ENDED: { label: 'Đã kết thúc', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    EXPIRED: { label: 'Hết hạn', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    LIMIT_REACHED: { label: 'Hết lượt dùng', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    BUDGET_EXHAUSTED: { label: 'Cạn ngân sách', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function PromotionVoucherManagementView({
    onNavigateAudit,
}: PromotionVoucherManagementViewProps) {
    const [isAdmin] = useState<boolean>(() => {
        try {
            const raw = localStorage.getItem('smartlocker_user');
            if (!raw) return false;
            const parsed = JSON.parse(raw) as { role?: string };
            return (parsed.role || '').trim().toUpperCase() === 'ADMIN';
        } catch {
            return false;
        }
    });

    const [overview, setOverview] = useState<PromotionDashboardOverviewDto | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<PromoSubTab>('CAMPAIGNS_AND_BUDGET');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Filter states for Voucher Inventory
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCampaignFilter, setSelectedCampaignFilter] = useState('ALL');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Global Budget Guardrail Form
    const [monthlyCap, setMonthlyCap] = useState<number>(15_000_000);
    const [warningPercent, setWarningPercent] = useState<number>(80);
    const [maxDiscountPct, setMaxDiscountPct] = useState<number>(60);
    const [minPayable, setMinPayable] = useState<number>(2_000);
    const [autoPauseGlobal, setAutoPauseGlobal] = useState<boolean>(true);
    const [savingPolicy, setSavingPolicy] = useState<boolean>(false);

    // Modals
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<PromotionCampaignDto | null>(null);
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<VoucherAdminDto | null>(null);

    // Simulator State
    const [simCode, setSimCode] = useState('');
    const [simAmount, setSimAmount] = useState<number>(50_000);
    const [simSize, setSimSize] = useState<string>('M');
    const [simRunning, setSimRunning] = useState(false);
    const [simResult, setSimResult] = useState<VoucherValidationResultDto | null>(null);

    const showToast = useCallback((type: 'success' | 'error', text: string) => {
        setToast({ type, text });
        window.setTimeout(() => {
            setToast((prev) => (prev?.text === text ? null : prev));
        }, 4200);
    }, []);

    const fetchOverview = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await adminPromotionService.getOverview();
            if (res.success && res.data) {
                setOverview(res.data);
                const gb = res.data.globalBudget;
                setMonthlyCap(gb.monthlyBudgetCap);
                setWarningPercent(gb.warningThresholdPercent);
                setMaxDiscountPct(gb.maxDiscountPercentPerOrder);
                setMinPayable(gb.minPayableAmountAfterDiscount);
                setAutoPauseGlobal(gb.autoPauseOnBudgetExhausted);
                setSimCode((prev) => prev || res.data?.vouchers?.[0]?.code || 'DANANG20');
            } else {
                showToast('error', res.message || 'Không thể tải dữ liệu khuyến mại & ngân sách.');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            showToast(
                'error',
                axiosErr.response?.data?.message || 'Lỗi kết nối API Quản lý Khuyến mại & Ngân sách.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => {
        void fetchOverview(false);
    }, [fetchOverview]);

    const filteredVouchers = useMemo(() => {
        const list = overview?.vouchers ?? [];
        const q = searchQuery.trim().toLowerCase();
        return list.filter((v) => {
            if (selectedCampaignFilter !== 'ALL' && v.campaignId !== selectedCampaignFilter) return false;
            if (selectedStatusFilter !== 'ALL' && v.effectiveStatus !== selectedStatusFilter) return false;
            if (!q) return true;
            return (
                v.code.toLowerCase().includes(q) ||
                v.title.toLowerCase().includes(q) ||
                (v.campaignName || '').toLowerCase().includes(q)
            );
        });
    }, [overview?.vouchers, searchQuery, selectedCampaignFilter, selectedStatusFilter]);

    const handleCopyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            window.setTimeout(() => setCopiedCode(null), 1800);
        } catch {
            showToast('error', 'Không thể sao chép mã tự động.');
        }
    };

    const handleSaveBudgetPolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return;
        if (minPayable < 2000) {
            showToast('error', 'Số tiền tối thiểu sau giảm phải >= 2.000đ để tương thích cổng VietQR PayOS.');
            return;
        }
        try {
            setSavingPolicy(true);
            const res = await adminPromotionService.updateBudgetPolicy({
                monthlyBudgetCap: Number(monthlyCap),
                warningThresholdPercent: Number(warningPercent),
                maxDiscountPercentPerOrder: Number(maxDiscountPct),
                minPayableAmountAfterDiscount: Number(minPayable),
                autoPauseOnBudgetExhausted: autoPauseGlobal,
                reason: 'Cập nhật quy tắc bảo vệ ngân sách chiết khấu & tương thích cổng PayOS',
            });
            if (res.success) {
                showToast('success', res.message || 'Đã lưu cấu hình trần ngân sách toàn cục!');
                await fetchOverview(true);
            } else {
                showToast('error', res.message || 'Cập nhật thất bại.');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            showToast('error', axiosErr.response?.data?.message || 'Không thể lưu chính sách ngân sách.');
        } finally {
            setSavingPolicy(false);
        }
    };

    const handleSubmitCampaign = async (payload: UpsertPromotionCampaignRequest) => {
        if (editingCampaign) {
            const res = await adminPromotionService.updateCampaign(editingCampaign.id, payload);
            if (!res.success) throw new Error(res.message);
            showToast('success', res.message || 'Đã cập nhật chiến dịch khuyến mại!');
        } else {
            const res = await adminPromotionService.createCampaign(payload);
            if (!res.success) throw new Error(res.message);
            showToast('success', res.message || 'Đã tạo chiến dịch khuyến mại mới!');
        }
        await fetchOverview(true);
    };

    const handleToggleCampaignPause = async (c: PromotionCampaignDto) => {
        if (!isAdmin) return;
        try {
            const res = await adminPromotionService.updateCampaignStatus(c.id, {
                isPaused: !c.isPaused,
                reason: !c.isPaused ? 'Tạm dừng chiến dịch theo điều hành ngân sách' : 'Mở lại chiến dịch khuyến mại',
            });
            if (res.success) {
                showToast('success', res.message);
                await fetchOverview(true);
            } else {
                showToast('error', res.message);
            }
        } catch {
            showToast('error', 'Không thể đổi trạng thái chiến dịch.');
        }
    };

    const handleQuickTopUpCampaign = async (c: PromotionCampaignDto, amount: number) => {
        if (!isAdmin) return;
        try {
            const res = await adminPromotionService.updateCampaignStatus(c.id, {
                isPaused: false,
                topUpBudgetAmount: amount,
                reason: `Bổ sung nhanh +${formatVnd(amount)} vào hạn mức chiến dịch ${c.code}`,
            });
            if (res.success) {
                showToast('success', `Đã nạp thêm ${formatVnd(amount)} cho chiến dịch "${c.name}"!`);
                await fetchOverview(true);
            } else {
                showToast('error', res.message);
            }
        } catch {
            showToast('error', 'Không thể nạp thêm ngân sách chiến dịch.');
        }
    };

    const handleSubmitVoucher = async (payload: UpsertVoucherRequest) => {
        if (editingVoucher) {
            const res = await adminPromotionService.updateVoucher(editingVoucher.id, payload);
            if (!res.success) throw new Error(res.message);
            showToast('success', res.message || 'Đã cập nhật mã Voucher!');
        } else {
            const res = await adminPromotionService.createVoucher(payload);
            if (!res.success) throw new Error(res.message);
            showToast('success', res.message || 'Đã phát hành mã Voucher mới!');
        }
        await fetchOverview(true);
    };

    const handleToggleVoucher = async (v: VoucherAdminDto) => {
        if (!isAdmin) return;
        try {
            const res = await adminPromotionService.toggleVoucher(
                v.id,
                !v.isActive,
                !v.isActive ? 'Kích hoạt lại mã Voucher' : 'Tạm khóa mã Voucher'
            );
            if (res.success) {
                showToast('success', res.message);
                await fetchOverview(true);
            } else {
                showToast('error', res.message);
            }
        } catch {
            showToast('error', 'Không thể cập nhật trạng thái Voucher.');
        }
    };

    const handleDeleteVoucher = async (v: VoucherAdminDto) => {
        if (!isAdmin) return;
        const confirmed = window.confirm(
            v.usedCount > 0
                ? `Mã "${v.code}" đã có ${v.usedCount} lượt sử dụng thực tế. Hệ thống sẽ chuyển sang trạng thái NGƯNG KÍCH HOẠT để bảo toàn lịch sử đối soát. Tiếp tục?`
                : `Xác nhận xóa vĩnh viễn mã Voucher "${v.code}" khỏi hệ thống?`
        );
        if (!confirmed) return;

        try {
            const res = await adminPromotionService.deleteVoucher(
                v.id,
                'Thu hồi / xóa mã Voucher từ cổng quản trị'
            );
            if (res.success) {
                showToast('success', res.message);
                await fetchOverview(true);
            } else {
                showToast('error', res.message);
            }
        } catch {
            showToast('error', 'Không thể xóa mã Voucher.');
        }
    };

    const handleRunSimulation = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!simCode.trim()) {
            showToast('error', 'Vui lòng chọn hoặc nhập mã Voucher cần giả lập.');
            return;
        }
        try {
            setSimRunning(true);
            const res = await adminPromotionService.simulateDiscount({
                code: simCode.trim().toUpperCase(),
                orderAmount: Number(simAmount),
                size: simSize,
            });
            if (res.data) {
                setSimResult(res.data);
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            showToast('error', axiosErr.response?.data?.message || 'Lỗi chạy mô phỏng chiết khấu.');
        } finally {
            setSimRunning(false);
        }
    };

    const handleExportCsv = () => {
        if (!overview) return;
        const headers = [
            'VoucherCode',
            'Title',
            'Campaign',
            'DiscountType',
            'DiscountValue',
            'MaxDiscountAmount',
            'MinOrderAmount',
            'UsedCount',
            'UsageLimit',
            'BudgetSpent',
            'BudgetCap',
            'EffectiveStatus',
            'EndDate',
        ];
        const rows = overview.vouchers.map((v) => [
            v.code,
            `"${(v.title || '').replace(/"/g, '""')}"`,
            `"${(v.campaignName || '').replace(/"/g, '""')}"`,
            v.discountType,
            v.discountValue,
            v.maxDiscountAmount ?? '',
            v.minOrderAmount,
            v.usedCount,
            v.usageLimit,
            v.budgetSpent,
            v.budgetCap,
            v.effectiveStatus,
            v.endDate,
        ]);
        const csvContent =
            '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SmartLocker_Promotions_Budget_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const gb = overview?.globalBudget;

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
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>Growth & Revenue Control · UC-A09</span>
                    </div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                        Chiến dịch Khuyến mại, Mã Voucher & Ngân sách Chiết khấu
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Kiểm soát trần ngân sách 3 tầng (Tháng → Chiến dịch → Mã Voucher), đảm bảo tương thích cổng VietQR
                        PayOS và tự động thu hồi hạn mức khi đơn hủy / quá hạn thanh toán.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => fetchOverview(true)}
                        disabled={refreshing}
                        className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportCsv}
                        className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xuất CSV Đối soát</span>
                    </button>

                    {isAdmin ? (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingCampaign(null);
                                    setIsCampaignModalOpen(true);
                                }}
                                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Thiết lập Chiến dịch</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setEditingVoucher(null);
                                    setIsVoucherModalOpen(true);
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/25 flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <Ticket className="w-3.5 h-3.5" />
                                <span>+ Phát hành Mã Voucher</span>
                            </button>
                        </>
                    ) : (
                        <span className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Chế độ Staff: Chỉ xem & Giả lập mã</span>
                        </span>
                    )}
                </div>
            </div>

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Card 1: Global Monthly Budget */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Ngân sách Chiết khấu Tháng
                            </p>
                            <p className="text-lg font-extrabold text-slate-900 mt-1">
                                {loading ? '...' : formatVnd(gb?.monthlyBudgetSpent ?? 0)}
                                <span className="text-xs font-semibold text-slate-400">
                                    {' '}
                                    / {formatVnd(gb?.monthlyBudgetCap ?? 0)}
                                </span>
                            </p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    (gb?.utilizationPercent ?? 0) >= 95
                                        ? 'bg-rose-500'
                                        : (gb?.utilizationPercent ?? 0) >= (gb?.warningThresholdPercent ?? 80)
                                        ? 'bg-amber-500'
                                        : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(100, gb?.utilizationPercent ?? 0)}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">
                                Khả dụng:{' '}
                                <strong className="text-emerald-600">
                                    {formatVnd(gb?.monthlyBudgetRemaining ?? 0)}
                                </strong>
                            </span>
                            <span className="font-bold text-slate-700">{gb?.utilizationPercent ?? 0}%</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Campaigns */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Chiến dịch Khuyến mại
                            </p>
                            <p className="text-lg font-extrabold text-slate-900 mt-1">
                                {loading ? '...' : `${overview?.activeCampaigns ?? 0} đang chạy`}
                                <span className="text-xs font-semibold text-slate-400">
                                    {' '}
                                    / {overview?.totalCampaigns ?? 0} chiến dịch
                                </span>
                            </p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Megaphone className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3">
                        Cơ chế tự động ngắt khi chạm hạn mức phân bổ đang{' '}
                        <strong className="text-indigo-700">BẬT</strong>
                    </p>
                </div>

                {/* Card 3: Vouchers & Redemptions */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Kho Mã & Lượt Áp dụng
                            </p>
                            <p className="text-lg font-extrabold text-slate-900 mt-1">
                                {loading ? '...' : `${overview?.activeVouchers ?? 0} mã mở`}
                                <span className="text-xs font-semibold text-slate-400">
                                    {' '}
                                    · {overview?.totalRedemptionsCount ?? 0} lượt dùng
                                </span>
                            </p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Ticket className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3">
                        Chiết khấu bình quân:{' '}
                        <strong className="text-slate-800">
                            {formatVnd(overview?.averageDiscountPerOrder ?? 0)} / đơn
                        </strong>
                    </p>
                </div>

                {/* Card 4: GMV & ROI */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Doanh thu Thúc đẩy (GMV) & ROI
                            </p>
                            <p className="text-lg font-extrabold text-emerald-700 mt-1">
                                {loading ? '...' : formatVnd(overview?.totalGmvDriven ?? 0)}
                            </p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] mt-3">
                        <span className="text-slate-500">
                            Tổng chiết khấu: <strong>{formatVnd(overview?.totalDiscountGranted ?? 0)}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" />
                            ROI {overview?.roiMultiple ?? 0}x
                        </span>
                    </div>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-xs flex flex-wrap gap-1.5">
                {[
                    {
                        key: 'CAMPAIGNS_AND_BUDGET' as PromoSubTab,
                        label: 'Chiến dịch & Trần Ngân sách 3 Tầng',
                        icon: Wallet,
                        badge: overview?.campaigns.length ?? 0,
                    },
                    {
                        key: 'VOUCHER_INVENTORY' as PromoSubTab,
                        label: 'Kho Mã Voucher & Hạn mức',
                        icon: Ticket,
                        badge: overview?.vouchers.length ?? 0,
                    },
                    {
                        key: 'DISCOUNT_SIMULATOR' as PromoSubTab,
                        label: 'Giả lập Tính Chiết khấu & PayOS',
                        icon: Calculator,
                    },
                    {
                        key: 'REDEMPTION_LEDGER' as PromoSubTab,
                        label: 'Sổ cái Giải ngân & Hoàn Hạn mức',
                        icon: History,
                        badge: overview?.recentLedger.length ?? 0,
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
                                    ? 'bg-blue-600 text-white shadow-xs'
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

            {/* TAB 1: CAMPAIGNS & GLOBAL BUDGET POLICY */}
            {activeTab === 'CAMPAIGNS_AND_BUDGET' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left 2 cols: Campaign Cards */}
                    <div className="lg:col-span-2 space-y-3.5">
                        {(overview?.campaigns ?? []).map((c) => {
                            const cat = CATEGORY_LABELS[c.category] || {
                                label: c.category,
                                badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                            };
                            const st = STATUS_BADGES[c.status] || {
                                label: c.status,
                                cls: 'bg-slate-100 text-slate-600 border-slate-200',
                            };
                            return (
                                <div
                                    key={c.id}
                                    className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5 hover:border-blue-300/80 transition"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                    {c.code}
                                                </span>
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.badgeClass}`}
                                                >
                                                    {cat.label}
                                                </span>
                                                <span
                                                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${st.cls}`}
                                                >
                                                    {st.label}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-extrabold text-slate-900">{c.name}</h3>
                                            {c.description && (
                                                <p className="text-xs text-slate-500">{c.description}</p>
                                            )}
                                        </div>

                                        {isAdmin && (
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickTopUpCampaign(c, 1_000_000)}
                                                    title="Nạp nhanh +1.000.000đ ngân sách"
                                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition cursor-pointer"
                                                >
                                                    +1M Ngân sách
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleCampaignPause(c)}
                                                    className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                                                    title={c.isPaused ? 'Mở lại chiến dịch' : 'Tạm dừng chiến dịch'}
                                                >
                                                    {c.isPaused ? (
                                                        <PlayCircle className="w-4 h-4 text-emerald-600" />
                                                    ) : (
                                                        <PauseCircle className="w-4 h-4 text-amber-600" />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingCampaign(c);
                                                        setIsCampaignModalOpen(true);
                                                    }}
                                                    className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                                                    title="Chỉnh sửa chiến dịch"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Campaign Budget Burn Bar */}
                                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                                        <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                                            <span className="text-slate-600">
                                                Đã giải ngân:{' '}
                                                <strong className="text-slate-900">{formatVnd(c.spentBudget)}</strong> /{' '}
                                                {formatVnd(c.allocatedBudget)}
                                            </span>
                                            <span className="font-bold text-emerald-700">
                                                Còn lại: {formatVnd(c.remainingBudget)} ({c.utilizationPercent}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    c.utilizationPercent >= 95
                                                        ? 'bg-rose-500'
                                                        : c.utilizationPercent >= 80
                                                        ? 'bg-amber-500'
                                                        : 'bg-indigo-600'
                                                }`}
                                                style={{ width: `${Math.min(100, c.utilizationPercent)}%` }}
                                            />
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                            <span>
                                                Mã trực thuộc: <strong>{c.activeVoucherCount}</strong>/{c.voucherCount}{' '}
                                                mã mở · <strong>{c.totalRedemptions}</strong> lượt quy đổi
                                            </span>
                                            <span>
                                                Hiệu lực: {formatDateShort(c.startDate)} → {formatDateShort(c.endDate)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right col: Global Budget Guardrail Policy */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 h-fit">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-slate-900">
                                    Chính sách Bảo vệ Ngân sách Toàn cục
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Hàng rào tài chính Tầng 1 & Tương thích cổng VietQR PayOS
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveBudgetPolicy} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Trần Ngân sách Chiết khấu Toàn hệ thống / Tháng (VND)
                                </label>
                                <input
                                    type="number"
                                    min={500000}
                                    step={500000}
                                    disabled={!isAdmin}
                                    value={monthlyCap}
                                    onChange={(e) => setMonthlyCap(Math.max(0, Number(e.target.value)))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-extrabold text-blue-700 disabled:bg-slate-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Ngưỡng cảnh báo sớm (%)
                                    </label>
                                    <input
                                        type="number"
                                        min={50}
                                        max={99}
                                        disabled={!isAdmin}
                                        value={warningPercent}
                                        onChange={(e) => setWarningPercent(Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Trần giảm tối đa / đơn (%)
                                    </label>
                                    <input
                                        type="number"
                                        min={10}
                                        max={95}
                                        disabled={!isAdmin}
                                        value={maxDiscountPct}
                                        onChange={(e) => setMaxDiscountPct(Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 disabled:bg-slate-50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Số tiền thanh toán tối thiểu sau giảm (PayOS Floor - VND)
                                </label>
                                <input
                                    type="number"
                                    min={2000}
                                    step={1000}
                                    disabled={!isAdmin}
                                    value={minPayable}
                                    onChange={(e) => setMinPayable(Math.max(2000, Number(e.target.value)))}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-extrabold text-emerald-700 disabled:bg-slate-50"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Đảm bảo mọi đơn có áp mã vẫn giữ tối thiểu{' '}
                                    <strong>{formatVnd(minPayable)}</strong> để tạo mã QR PayOS hợp lệ, không bao giờ
                                    lỗi tạo link thanh toán 0đ.
                                </p>
                            </div>

                            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={!isAdmin}
                                    checked={autoPauseGlobal}
                                    onChange={(e) => setAutoPauseGlobal(e.target.checked)}
                                    className="mt-0.5 accent-blue-600"
                                />
                                <div>
                                    <p className="font-bold text-slate-800">
                                        Tự động đóng băng khuyến mại khi chạm trần tháng
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        Tự động từ chối áp mã mới nếu ngân sách tháng đã giải ngân hết 100%.
                                    </p>
                                </div>
                            </label>

                            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 text-[11px] text-blue-900 space-y-1">
                                <p className="font-bold flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                    Cơ chế Tự động Hoàn Hạn mức Thông minh:
                                </p>
                                <p className="text-blue-800">
                                    Khi đơn <code className="font-mono">PENDING_PAYMENT</code> bị khách hủy hoặc hết hạn
                                    10 phút chưa thanh toán, hệ thống tự động hoàn trả lại lượt dùng & ngân sách cho
                                    Voucher!
                                </p>
                            </div>

                            {isAdmin && (
                                <button
                                    type="submit"
                                    disabled={savingPolicy}
                                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold transition cursor-pointer"
                                >
                                    {savingPolicy ? 'Đang lưu chính sách...' : 'Lưu Chính sách Ngân sách Toàn cục'}
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* TAB 2: VOUCHER INVENTORY */}
            {activeTab === 'VOUCHER_INVENTORY' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    {/* Filter Bar */}
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm theo mã Voucher (VD: DANANG20), tiêu đề hoặc chiến dịch..."
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <select
                                value={selectedCampaignFilter}
                                onChange={(e) => setSelectedCampaignFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
                            >
                                <option value="ALL">Tất cả chiến dịch</option>
                                {(overview?.campaigns ?? []).map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={selectedStatusFilter}
                                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
                            >
                                <option value="ALL">Tất cả trạng thái</option>
                                <option value="ACTIVE">Đang chạy (ACTIVE)</option>
                                <option value="PAUSED">Tạm dừng (PAUSED)</option>
                                <option value="BUDGET_EXHAUSTED">Cạn ngân sách</option>
                                <option value="LIMIT_REACHED">Hết lượt dùng</option>
                                <option value="EXPIRED">Đã hết hạn</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-500">
                                    <th className="py-3 px-4">Mã Voucher & Chiến dịch</th>
                                    <th className="py-3 px-4">Mức ưu đãi & Điều kiện</th>
                                    <th className="py-3 px-4">Hạn ngạch Lượt dùng</th>
                                    <th className="py-3 px-4">Ngân sách Mã (Tier-3)</th>
                                    <th className="py-3 px-4">Trạng thái</th>
                                    <th className="py-3 px-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredVouchers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-slate-400">
                                            Không tìm thấy mã Voucher phù hợp bộ lọc.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVouchers.map((v) => {
                                        const st = STATUS_BADGES[v.effectiveStatus] || {
                                            label: v.effectiveStatus,
                                            cls: 'bg-slate-100 text-slate-600 border-slate-200',
                                        };
                                        const usagePct =
                                            v.usageLimit > 0
                                                ? Math.min(100, Math.round((v.usedCount / v.usageLimit) * 100))
                                                : 0;
                                        return (
                                            <tr key={v.id} className="hover:bg-slate-50/70 transition">
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                                                            {v.code}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyCode(v.code)}
                                                            className="p-1 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 cursor-pointer"
                                                            title="Sao chép mã"
                                                        >
                                                            {copiedCode === v.code ? (
                                                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                    <p className="font-bold text-slate-800 mt-1">{v.title}</p>
                                                    <p className="text-[11px] text-slate-400">{v.campaignName}</p>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <p className="font-extrabold text-emerald-700">
                                                        {v.discountType === 'PERCENTAGE'
                                                            ? `Giảm ${v.discountValue}% (tối đa ${formatVnd(
                                                                  v.maxDiscountAmount ?? 0
                                                              )})`
                                                            : `Giảm thẳng ${formatVnd(v.discountValue)}`}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        Đơn tối thiểu: <strong>{formatVnd(v.minOrderAmount)}</strong> ·
                                                        Tối đa {v.perUserLimit} lượt/khách
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {v.applicableSizes.length > 0
                                                            ? `Ngăn: ${v.applicableSizes.join(', ')}`
                                                            : 'Mọi cỡ ngăn (S/M/L)'}{' '}
                                                        · HSD: {formatDateShort(v.endDate)}
                                                    </p>
                                                </td>

                                                <td className="py-3.5 px-4 min-w-[140px]">
                                                    <div className="flex justify-between text-[11px] mb-1">
                                                        <span className="font-bold text-slate-700">
                                                            {v.usedCount} / {v.usageLimit}
                                                        </span>
                                                        <span className="text-slate-400">Còn {v.remainingUses}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-blue-600"
                                                            style={{ width: `${usagePct}%` }}
                                                        />
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 min-w-[175px]">
                                                    <div className="flex justify-between text-[11px] mb-1">
                                                        <span className="font-bold text-slate-800">
                                                            {formatVnd(v.budgetSpent)}
                                                        </span>
                                                        <span className="text-slate-400">
                                                            / {formatVnd(v.budgetCap)}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                v.budgetUtilizationPercent >= 95
                                                                    ? 'bg-rose-500'
                                                                    : v.budgetUtilizationPercent >= 80
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-emerald-600'
                                                            }`}
                                                            style={{
                                                                width: `${Math.min(100, v.budgetUtilizationPercent)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                                                        Còn {formatVnd(v.budgetRemaining)}
                                                    </p>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <span
                                                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${st.cls}`}
                                                    >
                                                        {st.label}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSimCode(v.code);
                                                                setActiveTab('DISCOUNT_SIMULATOR');
                                                            }}
                                                            title="Giả lập tính thử mã này"
                                                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer"
                                                        >
                                                            <Calculator className="w-3.5 h-3.5" />
                                                        </button>
                                                        {isAdmin && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleVoucher(v)}
                                                                    title={
                                                                        v.isActive
                                                                            ? 'Tạm khóa mã Voucher'
                                                                            : 'Kích hoạt mã Voucher'
                                                                    }
                                                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                                                                >
                                                                    {v.isActive ? (
                                                                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                                                                    ) : (
                                                                        <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingVoucher(v);
                                                                        setIsVoucherModalOpen(true);
                                                                    }}
                                                                    title="Chỉnh sửa"
                                                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteVoucher(v)}
                                                                    title="Xóa / Thu hồi"
                                                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </>
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
                </div>
            )}

            {/* TAB 3: LIVE DISCOUNT & BUDGET SIMULATOR */}
            {activeTab === 'DISCOUNT_SIMULATOR' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Calculator className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-slate-900">
                                    Bộ Giả lập Tính Chiết khấu & Kiểm định Trần Ngân sách
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Kiểm tra trước số tiền giảm thực tế, phí thanh toán VietQR PayOS và tác động vào ngân
                                    sách trước khi công bố mã.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleRunSimulation} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Chọn nhanh hoặc nhập Mã Voucher</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={simCode}
                                        onChange={(e) => setSimCode(e.target.value.toUpperCase())}
                                        placeholder="VD: DANANG20"
                                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 font-mono font-extrabold text-blue-700 uppercase"
                                    />
                                    <select
                                        value={simCode}
                                        onChange={(e) => setSimCode(e.target.value)}
                                        className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700"
                                    >
                                        {(overview?.vouchers ?? []).map((v) => (
                                            <option key={v.id} value={v.code}>
                                                {v.code} ({v.discountType === 'PERCENTAGE' ? `${v.discountValue}%` : formatVnd(v.discountValue)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Giá trị đơn thuê gốc (VND)
                                    </label>
                                    <input
                                        type="number"
                                        min={5000}
                                        step={5000}
                                        value={simAmount}
                                        onChange={(e) => setSimAmount(Math.max(0, Number(e.target.value)))}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-extrabold text-slate-800"
                                    />
                                    <div className="flex gap-1.5 mt-1.5">
                                        {[15000, 30000, 60000, 120000].map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setSimAmount(amt)}
                                                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 cursor-pointer"
                                            >
                                                {amt / 1000}K
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Kích cỡ ngăn tủ</label>
                                    <div className="flex gap-1.5">
                                        {(['S', 'M', 'L'] as const).map((sz) => (
                                            <button
                                                key={sz}
                                                type="button"
                                                onClick={() => setSimSize(sz)}
                                                className={`flex-1 py-2 rounded-xl font-bold border transition cursor-pointer ${
                                                    simSize === sz
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-slate-600 border-slate-200'
                                                }`}
                                            >
                                                Size {sz}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={simRunning}
                                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                                <Calculator className="w-4 h-4" />
                                <span>{simRunning ? 'Đang tính toán...' : 'Chạy Kiểm định Chiết khấu & Ngân sách'}</span>
                            </button>
                        </form>
                    </div>

                    {/* Result Panel */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                        {!simResult ? (
                            <div className="my-auto text-center py-10 space-y-2">
                                <Calculator className="w-10 h-10 text-slate-300 mx-auto" />
                                <p className="text-sm font-bold text-slate-600">
                                    Chọn mã Voucher và nhấn Chạy Kiểm định
                                </p>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                    Hệ thống sẽ kiểm tra đồng thời 7 điều kiện: Thời hạn, Đơn tối thiểu, Size tủ, Hạn
                                    ngạch lượt, Ngân sách Mã, Ngân sách Chiến dịch và Sàn thanh toán PayOS.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 text-xs">
                                <div
                                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                                        simResult.isValid
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                            : 'bg-rose-50 border-rose-200 text-rose-900'
                                    }`}
                                >
                                    {simResult.isValid ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                    )}
                                    <div>
                                        <p className="font-extrabold text-sm">
                                            {simResult.isValid
                                                ? `HỢP LỆ — Giảm ${formatVnd(simResult.discountAmount)}`
                                                : 'TỪ CHỐI ÁP DỤNG MÃ'}
                                        </p>
                                        <p className="mt-0.5">{simResult.message}</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Chiến dịch:</span>
                                        <strong className="text-slate-800">{simResult.campaignName || '—'}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Giá thuê gốc ban đầu:</span>
                                        <strong className="text-slate-800">
                                            {formatVnd(simResult.originalAmount)}
                                        </strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Số tiền chiết khấu được duyệt:</span>
                                        <strong className="text-emerald-600">
                                            -{formatVnd(simResult.discountAmount)}
                                        </strong>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
                                        <span className="font-extrabold text-slate-900">
                                            Khách thanh toán qua VietQR PayOS:
                                        </span>
                                        <strong className="font-extrabold text-blue-700">
                                            {formatVnd(simResult.finalPayableAmount)}
                                        </strong>
                                    </div>
                                </div>

                                {simResult.isValid && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl border border-slate-200">
                                            <p className="text-[11px] text-slate-400">Ngân sách Mã còn sau đơn</p>
                                            <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                                                {formatVnd(simResult.voucherBudgetRemainingAfter)}
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-xl border border-slate-200">
                                            <p className="text-[11px] text-slate-400">
                                                Ngân sách Chiến dịch còn sau đơn
                                            </p>
                                            <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                                                {formatVnd(simResult.campaignBudgetRemainingAfter)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: REDEMPTION & RELEASE LEDGER */}
            {activeTab === 'REDEMPTION_LEDGER' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-extrabold text-slate-900">
                                Sổ cái Giải ngân Chiết khấu & Thu hồi Hạn mức Tự động
                            </h3>
                            <p className="text-xs text-slate-500">
                                Ghi vết bất biến mọi giao dịch khách áp mã, hoàn ngân sách khi hủy đơn và thao tác điều
                                chỉnh của Admin.
                            </p>
                        </div>
                        {onNavigateAudit && (
                            <button
                                type="button"
                                onClick={onNavigateAudit}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-blue-600 flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>Mở Audit Logs toàn cục</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                                    <th className="py-3 px-4">Thời gian</th>
                                    <th className="py-3 px-4">Sự kiện</th>
                                    <th className="py-3 px-4">Mã / Chiến dịch</th>
                                    <th className="py-3 px-4">Tác nhân</th>
                                    <th className="py-3 px-4">Biến động Ngân sách</th>
                                    <th className="py-3 px-4">Chi tiết đối soát</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(overview?.recentLedger ?? []).length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-slate-400">
                                            Chưa có bản ghi sổ cái khuyến mại nào.
                                        </td>
                                    </tr>
                                ) : (
                                    (overview?.recentLedger ?? []).map((item) => {
                                        const isRelease = item.eventType.includes('RELEASE');
                                        const isRedeem = item.eventType.includes('REDEEM');
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/60">
                                                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                                    {formatDateTime(item.createdAt)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                                            isRedeem
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : isRelease
                                                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                        }`}
                                                    >
                                                        {item.eventType}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-mono font-bold text-slate-800">
                                                        {item.voucherCode || '—'}
                                                    </span>
                                                    {item.bookingCode && (
                                                        <p className="text-[10px] text-blue-600 font-semibold">
                                                            Đơn: {item.bookingCode}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-semibold text-slate-700">{item.actorEmail}</p>
                                                    <span className="text-[10px] text-slate-400">{item.actorRole}</span>
                                                </td>
                                                <td className="py-3 px-4 font-extrabold">
                                                    {item.discountAmount > 0 ? (
                                                        <span
                                                            className={
                                                                isRelease ? 'text-emerald-600' : 'text-amber-700'
                                                            }
                                                        >
                                                            {isRelease ? '+' : '-'}
                                                            {formatVnd(item.discountAmount)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 max-w-md">{item.summary}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            <CampaignFormModal
                isOpen={isCampaignModalOpen}
                onClose={() => setIsCampaignModalOpen(false)}
                onSubmit={handleSubmitCampaign}
                editingCampaign={editingCampaign}
                globalBudgetRemaining={gb?.monthlyBudgetRemaining ?? 0}
            />

            <VoucherFormModal
                isOpen={isVoucherModalOpen}
                onClose={() => setIsVoucherModalOpen(false)}
                onSubmit={handleSubmitVoucher}
                editingVoucher={editingVoucher}
                campaigns={overview?.campaigns ?? []}
                minPayableAmountGuardrail={gb?.minPayableAmountAfterDiscount ?? 2000}
            />
        </div>
    );
}
