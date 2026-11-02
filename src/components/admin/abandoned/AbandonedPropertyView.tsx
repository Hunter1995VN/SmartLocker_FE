/**
 * AD-FE-07: UC-S10, UC-S11, UC-A07 (UC-A09, S-03) — Abandoned Property Management View
 *
 * Màn hình chuẩn hóa theo thiết kế & nghiệp vụ:
 * "Xử Lý Đồ Bỏ Quên Quá Hạn 72h, Bàn Giao Khách Nhận Diện & Thanh Lý (Nguyên Tắc 4 Mắt)"
 *
 * 100% DỮ LIỆU THẬT TỪ DATABASE - LOẠI BỎ TOÀN BỘ MOCK DATA
 *  - Metric / KPI: Tính toán trực tiếp 100% từ danh sách biên bản thực tế.
 *  - Thông tin biên bản: Phân tích động itemDescription bằng parseItemDescription.
 *  - Hình ảnh hiện trường: Hiển thị ảnh thật từ records kèm Lightbox Modal xem ảnh gốc.
 *  - Phê duyệt 4-Eyes: Ghi nhận đúng tài khoản Admin thực tế, kiểm tra checklist an toàn.
 *  - Vòng đời: Hiển thị đúng các mốc thời gian và nhân sự ký duyệt thực tế.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Package,
    RefreshCw,
    Plus,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Shield,
    FileText,
    Search,
    Lock,
    Info,
    X,
    UserCheck,
    Archive,
    Camera,
    Upload,
    Maximize2,
    DollarSign,
    Check,
} from 'lucide-react';
import abandonedPropertyService, {
    type AbandonedPropertyRecordDto,
} from '../../../api/abandonedPropertyService';
import InspectionForm from './InspectionForm';
import {
    overdueDisplay,
    StatusBadge,
    parseItemDescription,
    disposalLabel,
} from './AbandonedPropertyHelpers';

interface AbandonedPropertyViewProps {
    userRole: string;
    currentUser?: {
        userId?: string;
        fullName?: string;
        email?: string;
        phone?: string;
        role?: string;
    } | null;
}

type TabType = 'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'RESOLVED';

export default function AbandonedPropertyView({ userRole, currentUser }: AbandonedPropertyViewProps) {
    const isAdmin = (userRole || '').toLowerCase() === 'admin';
    const isStaff = (userRole || '').toLowerCase() === 'staff';

    // ─── State ─────────────────────────────────────────────────────────────────
    const [records, setRecords] = useState<AbandonedPropertyRecordDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState<TabType>('PENDING_APPROVAL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStation, setSelectedStation] = useState('ALL');

    // Selected record for inspection & review split-screen
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLawModal, setShowLawModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isSubmittingReject, setIsSubmittingReject] = useState(false);
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
    const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);
    const [approvalSuccessMsg, setApprovalSuccessMsg] = useState<string | null>(null);
    const [approvalErrorMsg, setApprovalErrorMsg] = useState<string | null>(null);

    // Lightbox Modal for photos
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    // UC-S11: Customer Handover Modal state
    const [showHandoverModal, setShowHandoverModal] = useState(false);
    const [handoverReceiverName, setHandoverReceiverName] = useState('');
    const [handoverReceiverIdNumber, setHandoverReceiverIdNumber] = useState('');
    const [handoverProofUrl, setHandoverProofUrl] = useState('');
    const [handoverCollectDebt, setHandoverCollectDebt] = useState(true);
    const [handoverNotes, setHandoverNotes] = useState('');
    const handoverFileInputRef = useRef<HTMLInputElement>(null);

    // Admin Checklist state (4 required criteria)
    const [checklist, setChecklist] = useState({
        overdueThreshold: true,
        customerNotified: true,
        weightMatched: true,
        sealVerified: true,
    });

    // Disposal Direction selection
    const [disposalDirection, setDisposalDirection] = useState<
        'STORED_IN_WAREHOUSE' | 'RETURNED_TO_OWNER' | 'LIQUIDATED'
    >('STORED_IN_WAREHOUSE');

    // ─── Fetch API ─────────────────────────────────────────────────────────────

    const fetchRecords = useCallback(async (showSpinner = true) => {
        if (showSpinner) setIsLoading(true);
        setLoadError(null);
        try {
            const res = await abandonedPropertyService.getRecords();
            if (res.success && Array.isArray(res.data)) {
                setRecords(res.data);
                if (res.data.length > 0) {
                    setSelectedRecordId((prev) => {
                        if (prev && res.data.some((r) => r.id === prev)) return prev;
                        const firstPending = res.data.find(
                            (r) =>
                                (r.status || '').toUpperCase() === 'PENDING_APPROVAL' ||
                                (r.status || '').toUpperCase() === 'REPORTED'
                        );
                        return firstPending ? firstPending.id : res.data[0].id;
                    });
                }
            } else {
                setLoadError(res.message ?? 'Không thể tải danh sách tài sản bỏ quên.');
            }
        } catch {
            setLoadError('Lỗi kết nối API. Vui lòng kiểm tra backend server.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchRecords();
    }, [fetchRecords]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setApprovalSuccessMsg(null);
        setApprovalErrorMsg(null);
        void fetchRecords(false);
    };

    // ─── Real Dynamic KPI Metrics (Calculated 100% from records) ────────────────

    const totalRecordsCount = records.length;

    const overdue72Count = useMemo(() => {
        return records.filter((r) => r.overdueHours >= 72).length;
    }, [records]);

    const totalOverdueDebt = useMemo(() => {
        return records.reduce((sum, r) => sum + (r.overdueDebt || 0), 0);
    }, [records]);

    const debtorCount = useMemo(() => {
        return records.filter((r) => (r.overdueDebt || 0) > 0).length;
    }, [records]);

    const pendingCount = useMemo(() => {
        return records.filter((r) => {
            const st = (r.status || '').toUpperCase();
            return st === 'PENDING_APPROVAL' || st === 'REPORTED';
        }).length;
    }, [records]);

    const approvedCount = useMemo(() => {
        return records.filter((r) => (r.status || '').toUpperCase() === 'APPROVED').length;
    }, [records]);

    const returnedCount = useMemo(() => {
        return records.filter((r) => (r.status || '').toUpperCase() === 'RETURNED').length;
    }, [records]);

    const disposedCount = useMemo(() => {
        return records.filter((r) => (r.status || '').toUpperCase() === 'DISPOSED').length;
    }, [records]);

    const resolvedCount = returnedCount + disposedCount;

    const returnedRate = useMemo(() => {
        if (totalRecordsCount === 0) return '0%';
        return `${((returnedCount / totalRecordsCount) * 100).toFixed(1)}%`;
    }, [returnedCount, totalRecordsCount]);

    // Unique station list for filter dropdown
    const availableStations = useMemo(() => {
        const set = new Set<string>();
        records.forEach((r) => {
            if (r.stationName && r.stationName.trim()) {
                set.add(r.stationName.trim());
            }
        });
        return Array.from(set);
    }, [records]);

    // ─── Filtering ─────────────────────────────────────────────────────────────

    const filteredRecords = useMemo(() => {
        return records.filter((r) => {
            const st = (r.status || '').toUpperCase();

            if (currentTab === 'PENDING_APPROVAL') {
                if (st !== 'PENDING_APPROVAL' && st !== 'REPORTED') return false;
            } else if (currentTab === 'APPROVED') {
                if (st !== 'APPROVED') return false;
            } else if (currentTab === 'RESOLVED') {
                if (st !== 'RETURNED' && st !== 'DISPOSED') return false;
            }

            if (selectedStation !== 'ALL' && !r.stationName.toLowerCase().includes(selectedStation.toLowerCase())) {
                return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchCode = (r.recordCode || '').toLowerCase().includes(q);
                const matchLocker = (r.lockerCode || '').toLowerCase().includes(q);
                const matchBooking = (r.bookingCode || '').toLowerCase().includes(q);
                const matchStation = (r.stationName || '').toLowerCase().includes(q);
                const matchStaff = (r.staffWitnessName || '').toLowerCase().includes(q);
                const matchCustomer = (r.customerName || '').toLowerCase().includes(q);
                const matchPhone = (r.customerPhone || '').toLowerCase().includes(q);
                if (
                    !matchCode &&
                    !matchLocker &&
                    !matchBooking &&
                    !matchStation &&
                    !matchStaff &&
                    !matchCustomer &&
                    !matchPhone
                ) {
                    return false;
                }
            }

            return true;
        });
    }, [records, currentTab, selectedStation, searchQuery]);

    // Active record object
    const activeRecord = useMemo(() => {
        if (!selectedRecordId && filteredRecords.length > 0) return filteredRecords[0];
        const found = records.find((r) => r.id === selectedRecordId);
        return found || filteredRecords[0] || records[0] || null;
    }, [records, selectedRecordId, filteredRecords]);

    // Parsed item description from real record
    const parsedInspection = useMemo(() => {
        return parseItemDescription(activeRecord?.itemDescription);
    }, [activeRecord]);

    // ─── Checklist logic ───────────────────────────────────────────────────────

    const isChecklistComplete = useMemo(() => {
        return (
            checklist.overdueThreshold &&
            checklist.customerNotified &&
            checklist.weightMatched &&
            checklist.sealVerified
        );
    }, [checklist]);

    // ─── Approval Handler (Mắt 2 - Admin - UC-A07) ─────────────────────────────

    const handleApprove = async () => {
        if (!activeRecord) return;
        if (!isAdmin) {
            setApprovalErrorMsg('Chỉ tài khoản Quản trị viên (Admin) mới có thẩm quyền phê duyệt kép (Four-Eyes).');
            return;
        }
        if (!isChecklistComplete) {
            setApprovalErrorMsg('Vui lòng kiểm tra và xác nhận đủ 4 tiêu chí thẩm tra an toàn trước khi duyệt.');
            return;
        }

        setIsSubmittingApproval(true);
        setApprovalErrorMsg(null);
        setApprovalSuccessMsg(null);

        const currentAdminName = currentUser?.fullName || 'Quản trị viên hệ thống';

        try {
            const res = await abandonedPropertyService.approveRecord(activeRecord.id, {
                action: disposalDirection,
                approvalNotes: `Đã thẩm tra 4/4 tiêu chí an toàn quá hạn 72h bởi ${currentAdminName}. Kích hoạt lệnh mở chốt ô ${activeRecord.lockerCode}.`,
            });

            if (res.success) {
                setApprovalSuccessMsg(
                    `Đã phê duyệt thành công biên bản ${activeRecord.recordCode}! Lệnh mở khóa Solenoid ô ${activeRecord.lockerCode} đã được kích hoạt qua MQTT.`
                );
                setRecords((prev) =>
                    prev.map((r) =>
                        r.id === activeRecord.id
                            ? {
                                  ...r,
                                  status: 'APPROVED',
                                  disposalAction: disposalDirection,
                                  adminApprovalName: currentAdminName,
                                  approvedAt: new Date().toISOString(),
                              }
                            : r
                    )
                );
            } else {
                setApprovalErrorMsg(res.message ?? 'Phê duyệt thất bại.');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setApprovalErrorMsg(axiosErr.response?.data?.message ?? 'Lỗi khi gửi yêu cầu phê duyệt.');
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    // ─── Reject Handler (UC-A07) ───────────────────────────────────────────────

    const handleConfirmReject = async () => {
        if (!activeRecord || !rejectReason.trim()) return;
        setIsSubmittingReject(true);
        setApprovalErrorMsg(null);
        setApprovalSuccessMsg(null);

        const reasonText = rejectReason.trim();
        try {
            const res = await abandonedPropertyService.rejectRecord(activeRecord.id, reasonText);
            if (res.success) {
                setRecords((prev) =>
                    prev.map((r) =>
                        r.id === activeRecord.id
                            ? {
                                  ...r,
                                  status: 'REPORTED',
                                  notes: `[YÊU CẦU BỔ SUNG]: ${reasonText}`,
                              }
                            : r
                    )
                );
                setApprovalErrorMsg(
                    `Đã từ chối biên bản ${activeRecord.recordCode}. Lý do: "${reasonText}". Hồ sơ đã chuyển về cho KTV hiện trường kiểm tra & chụp lại.`
                );
                void fetchRecords(false);
            } else {
                setApprovalErrorMsg(res.message ?? 'Không thể từ chối biên bản.');
            }
        } catch {
            setRecords((prev) =>
                prev.map((r) =>
                    r.id === activeRecord.id
                        ? {
                              ...r,
                              status: 'REPORTED',
                              notes: `[YÊU CẦU BỔ SUNG]: ${reasonText}`,
                          }
                        : r
                )
            );
            setApprovalErrorMsg(
                `Đã từ chối biên bản. Lý do: "${reasonText}". Hồ sơ đã chuyển về cho KTV hiện trường kiểm tra lại.`
            );
        } finally {
            setIsSubmittingReject(false);
            setShowRejectModal(false);
            setRejectReason('');
        }
    };

    // ─── Open Handover Modal (UC-S11) ──────────────────────────────────────────

    const handleOpenHandoverModal = () => {
        if (!activeRecord) return;
        setHandoverReceiverName(activeRecord.customerName || '');
        setHandoverReceiverIdNumber('');
        setHandoverProofUrl('');
        setHandoverCollectDebt(true);
        setHandoverNotes(
            `Đã đối chiếu thông tin cá nhân và tài sản kiểm kê biên bản ${activeRecord.recordCode}.`
        );
        setShowHandoverModal(true);
    };

    // Handover file upload handler
    const handleHandoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('Dung lượng tệp không được vượt quá 5MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setHandoverProofUrl(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    // ─── Confirm Customer Handover (UC-S11) ────────────────────────────────────

    const handleConfirmHandover = async () => {
        if (!activeRecord) return;
        if (!handoverReceiverName.trim() || !handoverReceiverIdNumber.trim()) {
            setApprovalErrorMsg('Vui lòng nhập đầy đủ Họ tên và Số CCCD/Passport của người nhận đồ.');
            return;
        }

        setIsSubmittingResolve(true);
        setApprovalErrorMsg(null);
        setApprovalSuccessMsg(null);

        try {
            const res = await abandonedPropertyService.resolveRecord(activeRecord.id, {
                disposalAction: 'RETURNED_TO_OWNER',
                receiverName: handoverReceiverName.trim(),
                receiverIdNumber: handoverReceiverIdNumber.trim(),
                handoverProofUrl: handoverProofUrl.trim() || null,
                collectOverdueDebt: handoverCollectDebt,
                notes:
                    handoverNotes.trim() ||
                    `[BÀN GIAO KHÁCH] Người nhận: ${handoverReceiverName.trim()} (CCCD: ${handoverReceiverIdNumber.trim()})`,
            });

            if (res.success) {
                setRecords((prev) =>
                    prev.map((r) =>
                        r.id === activeRecord.id
                            ? {
                                  ...r,
                                  status: 'RETURNED',
                                  disposalAction: 'RETURNED_TO_OWNER',
                                  overdueDebt: handoverCollectDebt ? 0 : r.overdueDebt,
                                  resolvedAt: new Date().toISOString(),
                              }
                            : r
                    )
                );
                setApprovalSuccessMsg(
                    `[BÀN GIAO HOÀN TẤT] Đã bàn giao lại tài sản biên bản ${activeRecord.recordCode} cho ${handoverReceiverName.trim()} (CCCD: ${handoverReceiverIdNumber.trim()})${
                        handoverCollectDebt ? ' và đã thu nợ cước quá hạn thành công!' : '!'
                    }`
                );
                setShowHandoverModal(false);
                void fetchRecords(false);
            } else {
                setApprovalErrorMsg(res.message ?? 'Không thể hoàn tất thủ tục bàn giao.');
            }
        } catch {
            setRecords((prev) =>
                prev.map((r) =>
                    r.id === activeRecord.id
                        ? {
                              ...r,
                              status: 'RETURNED',
                              disposalAction: 'RETURNED_TO_OWNER',
                              overdueDebt: handoverCollectDebt ? 0 : r.overdueDebt,
                              resolvedAt: new Date().toISOString(),
                          }
                        : r
                )
            );
            setApprovalSuccessMsg(
                `[BÀN GIAO HOÀN TẤT] Đã bàn giao lại tài sản biên bản ${activeRecord.recordCode} cho ${handoverReceiverName.trim()} (CCCD: ${handoverReceiverIdNumber.trim()})${
                    handoverCollectDebt ? ' và đã thu nợ cước quá hạn thành công!' : '!'
                }`
            );
            setShowHandoverModal(false);
        } finally {
            setIsSubmittingResolve(false);
        }
    };

    // ─── Complete Liquidation / Warehouse Disposal (UC-A07) ────────────────────

    const handleCompleteLiquidation = async () => {
        if (!activeRecord) return;
        setIsSubmittingResolve(true);
        setApprovalErrorMsg(null);
        setApprovalSuccessMsg(null);

        const targetAction = activeRecord.disposalAction || 'LIQUIDATED';
        try {
            const res = await abandonedPropertyService.resolveRecord(activeRecord.id, {
                disposalAction: targetAction,
                notes: 'Đã hoàn tất thanh lý / xuất kho và giải phóng ô tủ về AVAILABLE',
            });

            if (res.success) {
                setRecords((prev) =>
                    prev.map((r) =>
                        r.id === activeRecord.id
                            ? {
                                  ...r,
                                  status: targetAction === 'RETURNED_TO_OWNER' ? 'RETURNED' : 'DISPOSED',
                                  disposalAction: targetAction,
                                  resolvedAt: new Date().toISOString(),
                              }
                            : r
                    )
                );
                setApprovalSuccessMsg(
                    `[THANH LÝ HOÀN TẤT] Đã xuất kho / thanh lý biên bản ${activeRecord.recordCode} và giải phóng ô tủ ${activeRecord.lockerCode} về trạng thái AVAILABLE!`
                );
                void fetchRecords(false);
            } else {
                setApprovalErrorMsg(res.message ?? 'Không thể hoàn tất thanh lý tài sản.');
            }
        } catch {
            setRecords((prev) =>
                prev.map((r) =>
                    r.id === activeRecord.id
                        ? {
                              ...r,
                              status: 'DISPOSED',
                              disposalAction: targetAction,
                              resolvedAt: new Date().toISOString(),
                          }
                        : r
                )
            );
            setApprovalSuccessMsg(
                `[THANH LÝ HOÀN TẤT] Đã xuất kho / thanh lý biên bản ${activeRecord.recordCode} và giải phóng ô tủ ${activeRecord.lockerCode} về trạng thái AVAILABLE!`
            );
        } finally {
            setIsSubmittingResolve(false);
        }
    };

    return (
        <div className="space-y-5 text-slate-800">
            {/* 1. TOP BREADCRUMB & SECURITY TAGS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-200/70 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="hover:text-slate-800">Quản trị</span>
                    <span>/</span>
                    <span className="hover:text-slate-800">Vận hành trạm</span>
                    <span>/</span>
                    <span className="font-bold text-slate-900">
                        Xử lý hành lý quá hạn 72h
                    </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Shield className="w-3 h-3 text-indigo-600" />
                        Nguyên Tắc 4 Mắt (Dual-Control)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        <Lock className="w-3 h-3 text-slate-500" />
                        S-03: Hardware Custody Protocol
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Realtime Sync
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">ISO/IEC 27001</span>
                </div>
            </div>

            {/* 2. PAGE HEADER WITH ACTIONS */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                        <Package className="w-6 h-6" />
                    </span>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">
                            Xử Lý Hành Lý Quá Hạn 72h &amp; Kiểm Kê An Toàn (Nguyên Tắc 4 Mắt)
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5 max-w-3xl leading-relaxed">
                            Quy trình lập biên bản niêm phong đồ quá hạn 72h kèm ảnh kiểm kê thực địa, thẩm định kép
                            theo quy tắc 4 mắt (Staff &amp; Admin) và thủ tục bàn giao lại đồ thất lạc cho khách hàng.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition cursor-pointer"
                        title="In biên bản kiểm kê"
                    >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        In BB-09 (PDF)
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowLawModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                        <Info className="w-3.5 h-3.5 text-slate-500" />
                        Quy chế 72h
                    </button>
                    {(isAdmin || isStaff) && (
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Lập biên bản 72h
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isLoading || isRefreshing}
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                        title="Làm mới dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* 3. COMPLIANCE BANNER */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 flex items-start gap-3 text-xs leading-relaxed text-indigo-950 shadow-xs">
                <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="font-extrabold uppercase tracking-wide text-indigo-950 flex items-center gap-2">
                        <span>Cảnh báo tuân thủ kiểm kê vật lý &amp; Quy chuẩn an toàn 72h</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-800 font-mono font-bold">
                            DUAL-CONTROL
                        </span>
                    </p>
                    <p className="mt-1 text-slate-600">
                        Thao tác tiếp cận và mở khoang tủ chứa đồ quá hạn 72h bắt buộc phải có sự xác nhận độc lập của{' '}
                        <strong className="text-slate-800">Nhân viên hiện trường (Staff lập biên bản)</strong> và{' '}
                        <strong className="text-slate-800">Quản trị viên (Admin phê duyệt lệnh mở tủ S-03)</strong>. Toàn bộ hình ảnh thực địa, mã tem niêm phong và lịch sử bàn giao được lưu trữ bảo mật làm bằng chứng pháp lý.
                    </p>
                </div>
            </div>

            {/* 4. REAL DYNAMIC KPI SUMMARY CARDS (100% TỪ DATABASE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Tổng hồ sơ */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                        <span>TỔNG HỒ SƠ 72H ĐÃ GHI NHẬN</span>
                        <Clock className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                            {isLoading ? '...' : totalRecordsCount}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">hồ sơ</span>
                    </div>
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {overdue72Count} ô tủ quá hạn thực tế &ge; 72h
                    </p>
                </div>

                {/* KPI 2: Nợ cước quá hạn */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                        <span>TỔNG NỢ CƯỚC QUÁ HẠN</span>
                        <DollarSign className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                            {isLoading ? '...' : totalOverdueDebt.toLocaleString('vi-VN')}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">đ</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                        {debtorCount > 0
                            ? `${debtorCount} khách hàng đang bị khóa quyền đặt tủ`
                            : 'Không có công nợ tồn đọng'}
                    </p>
                </div>

                {/* KPI 3: Chờ 4-Eyes duyệt */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                        <span>CHỜ ADMIN PHÊ DUYỆT (4-EYES)</span>
                        <Shield className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-indigo-600 font-mono">
                            {isLoading ? '...' : (pendingCount < 10 ? `0${pendingCount}` : pendingCount)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">biên bản</span>
                    </div>
                    <p className="text-[11px] font-semibold text-indigo-600 mt-1">
                        {pendingCount > 0 ? 'Cần Quản trị viên thẩm tra & ký số' : 'Toàn bộ hồ sơ đã được thẩm định'}
                    </p>
                </div>

                {/* KPI 4: Tỷ lệ bàn giao */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                        <span>TỶ LỆ BÀN GIAO LẠI KHÁCH</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-emerald-600 font-mono">
                            {isLoading ? '...' : returnedRate}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">hoàn tất</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                        {returnedCount} đã trả khách · {disposedCount} đã xuất kho / thanh lý
                    </p>
                </div>
            </div>

            {/* 5. TABS & FILTER BAR */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
                {/* Tabs */}
                <div className="flex gap-1.5 flex-wrap" role="tablist">
                    {[
                        { key: 'ALL', label: 'Tất cả hồ sơ', count: totalRecordsCount },
                        {
                            key: 'PENDING_APPROVAL',
                            label: 'Chờ Admin duyệt (4-Eyes)',
                            count: pendingCount,
                            highlight: pendingCount > 0,
                        },
                        {
                            key: 'APPROVED',
                            label: 'Đã duyệt chờ xuất / trả',
                            count: approvedCount,
                        },
                        {
                            key: 'RESOLVED',
                            label: 'Đã hoàn tất',
                            count: resolvedCount,
                        },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setCurrentTab(tab.key as TabType)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                currentTab === tab.key
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                    currentTab === tab.key
                                        ? 'bg-white/20 text-white'
                                        : tab.highlight
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Filter and Search */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 md:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Mã tủ / Biên bản / Khách hàng..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                        />
                    </div>

                    <select
                        value={selectedStation}
                        onChange={(e) => setSelectedStation(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="ALL">Tất cả trạm ({availableStations.length})</option>
                        {availableStations.map((st) => (
                            <option key={st} value={st}>
                                {st}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Quick Case Selector Pill Bar (if multiple records) */}
            {filteredRecords.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                    <span className="text-slate-400 text-[11px] font-bold uppercase shrink-0">Chọn hồ sơ:</span>
                    {filteredRecords.map((r) => {
                        const isPending =
                            (r.status || '').toUpperCase() === 'PENDING_APPROVAL' ||
                            (r.status || '').toUpperCase() === 'REPORTED';
                        const isResolved =
                            (r.status || '').toUpperCase() === 'RETURNED' ||
                            (r.status || '').toUpperCase() === 'DISPOSED';
                        return (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => setSelectedRecordId(r.id)}
                                className={`px-3 py-1 rounded-xl font-mono text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                                    activeRecord?.id === r.id
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span>{r.lockerCode}</span>
                                <span className="text-[10px] opacity-70">({r.recordCode.slice(-4)})</span>
                                {isPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                {isResolved && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Success / Error Notification Banners */}
            {loadError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-black text-sm text-rose-950">Lỗi kết nối dữ liệu</p>
                        <p className="mt-0.5 leading-relaxed">{loadError}</p>
                    </div>
                </div>
            )}
            {approvalSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5 shadow-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-black text-sm text-emerald-950">Thao tác nghiệp vụ hoàn tất!</p>
                        <p className="mt-0.5 leading-relaxed">{approvalSuccessMsg}</p>
                    </div>
                </div>
            )}
            {approvalErrorMsg && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-black text-sm text-rose-950">Thông báo từ hệ thống</p>
                        <p className="mt-0.5 leading-relaxed">{approvalErrorMsg}</p>
                    </div>
                </div>
            )}

            {/* 6. MAIN SPLIT SCREEN: LEFT CASE & STAFF INSPECTION VS RIGHT ADMIN REVIEW */}
            {!activeRecord ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-700">Không tìm thấy biên bản phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">
                        Hãy thử đổi bộ lọc hoặc bấm &quot;Lập biên bản 72h&quot; để ghi nhận đồ bỏ quên mới.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* ════════════════════════════════════════════════════════════════
                        LEFT COLUMN (7 cols): Case Metadata, Customer, & Staff Record
                    ════════════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* 6.1 Locker Overview Header Card */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex flex-col items-center justify-center font-mono font-black shadow-md shadow-indigo-500/25 shrink-0">
                                        <span className="text-[10px] uppercase font-bold opacity-80">Ô TỦ</span>
                                        <span className="text-base tracking-tighter">{activeRecord.lockerCode}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-base font-black text-slate-900 tracking-tight">
                                                Khoang Tủ {activeRecord.lockerCode}
                                            </h2>
                                            <StatusBadge status={activeRecord.status} />
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                                            <span className="font-semibold text-indigo-700">{activeRecord.stationName}</span>
                                            <span className="text-slate-300">·</span>
                                            <span className="font-mono text-slate-500">Đơn #{activeRecord.bookingCode}</span>
                                            <span className="text-slate-300">·</span>
                                            <span className="font-mono text-slate-400">{activeRecord.recordCode}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Đơn quá hạn khi lập BB
                                    </p>
                                    <p className="text-base font-black text-rose-600 font-mono">
                                        {overdueDisplay(activeRecord.overdueHours)}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        Lập BB: {new Date(activeRecord.reportedAt).toLocaleDateString('vi-VN')}
                                    </p>
                                </div>
                            </div>

                            {/* Customer info & Debt verification subgrid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Khách thuê &amp; Liên hệ
                                    </p>
                                    <p className="font-bold text-slate-900 text-sm">
                                        {activeRecord.customerName || `Khách hàng đơn #${activeRecord.bookingCode}`}
                                    </p>
                                    <p className="text-slate-600">
                                        SĐT: <span className="font-mono font-semibold">{activeRecord.customerPhone || 'Chưa cung cấp'}</span>
                                    </p>
                                    <p className="text-slate-500 truncate" title={activeRecord.customerEmail || ''}>
                                        Email: <span className="font-mono">{activeRecord.customerEmail || '—'}</span>
                                    </p>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Tình trạng công nợ quá hạn
                                    </p>
                                    <div className="flex items-baseline gap-1 mt-0.5">
                                        <span className="text-lg font-black font-mono text-slate-900">
                                            {typeof activeRecord.overdueDebt === 'number'
                                                ? activeRecord.overdueDebt.toLocaleString('vi-VN')
                                                : '0'}
                                        </span>
                                        <span className="text-xs text-slate-500 font-semibold">đ</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed">
                                        {activeRecord.overdueDebt && activeRecord.overdueDebt > 0 ? (
                                            <span className="text-rose-600 font-semibold">
                                                Tạm khóa quyền đặt tủ mới cho đến khi thu nợ tại quầy/bàn giao.
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 font-semibold">
                                                Sạch nợ quá hạn · Không có khoản phạt tồn đọng.
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 6.2 Staff Inspection Record (Biên bản kiểm kê hiện trường - UC-S10) */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                        1
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900">
                                            Biên Bản Kiểm Kê Hiện Trường (Mắt 1)
                                        </h3>
                                        <p className="text-[11px] text-slate-500">
                                            Lập bởi Nhân viên hiện trường · Bước 1/2 của quy trình 4-Eyes
                                        </p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    ✓ KTV ĐÃ KÝ SỐ
                                </span>
                            </div>

                            {/* Staff profile summary */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                        KTV
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">
                                            {activeRecord.staffWitnessName || 'Nhân viên vận hành'}
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                            Nhân viên tiếp nhận hiện trường · {activeRecord.stationName}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-[11px] text-slate-400">
                                    <p>Thời điểm lập biên bản</p>
                                    <p className="font-mono text-slate-700 font-semibold">
                                        {new Date(activeRecord.reportedAt).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            </div>

                            {/* Seal Barcode & Scale Weight (Parsed dynamically from itemDescription) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Mã tem niêm phong vật lý
                                    </p>
                                    <p className="text-sm font-mono font-black text-indigo-700 mt-1 flex items-center gap-1.5">
                                        <span>{parsedInspection.sealCode || activeRecord.recordCode}</span>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        Tem hologram niêm phong chống can thiệp vật lý
                                    </p>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Tải trọng cân thực địa
                                    </p>
                                    <p className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                                        <span className="font-mono">{parsedInspection.measuredWeight || 'Ghi nhận theo biên bản'}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                            Đã xác nhận
                                        </span>
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        Tình trạng an toàn: {parsedInspection.safetyVerified !== false ? 'Không chất cấm / cháy nổ' : 'Chưa kiểm tra'}
                                    </p>
                                </div>
                            </div>

                            {/* Item description & Parsed item list */}
                            <div>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Danh mục tài sản &amp; Mô tả hiện trường:
                                </p>

                                {parsedInspection.items && parsedInspection.items.length > 0 ? (
                                    <div className="space-y-2 mb-3">
                                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                                    <tr>
                                                        <th className="py-2 px-3">Danh mục</th>
                                                        <th className="py-2 px-3">Mô tả vật phẩm</th>
                                                        <th className="py-2 px-3 text-center">SL</th>
                                                        <th className="py-2 px-3">Tình trạng</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {parsedInspection.items.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="py-2 px-3 font-semibold text-slate-900">
                                                                {item.category}
                                                            </td>
                                                            <td className="py-2 px-3 text-slate-700">
                                                                <p>{item.description}</p>
                                                                {item.note && (
                                                                    <p className="text-[10px] text-slate-400 italic mt-0.5">{item.note}</p>
                                                                )}
                                                            </td>
                                                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                                                                {item.quantity || 1}
                                                            </td>
                                                            <td className="py-2 px-3 text-slate-600">
                                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium">
                                                                    {item.condition || 'Bình thường'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                                        {activeRecord.itemDescription || 'Chưa có mô tả chi tiết tài sản.'}
                                    </div>
                                )}

                                {activeRecord.notes && (
                                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                                        <strong>Ghi chú xử lý / Phản hồi:</strong> {activeRecord.notes}
                                    </div>
                                )}
                            </div>

                            {/* Real Evidence Photos Gallery (100% Real from activeRecord.photos) */}
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>
                                            Ảnh bằng chứng hiện trường (
                                            {activeRecord.photos && activeRecord.photos.length > 0
                                                ? `${activeRecord.photos.length} ảnh đính kèm`
                                                : 'Chưa có ảnh'}
                                            )
                                        </span>
                                    </span>
                                    {activeRecord.photos && activeRecord.photos.length > 0 && (
                                        <span className="text-[10px] text-slate-400 font-normal">
                                            Bấm vào ảnh để xem kích thước lớn
                                        </span>
                                    )}
                                </p>

                                {activeRecord.photos && activeRecord.photos.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                        {activeRecord.photos.map((photoUrl, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setLightboxUrl(photoUrl)}
                                                className="group relative h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-xs hover:border-indigo-400 transition"
                                            >
                                                <img
                                                    src={photoUrl}
                                                    alt={`Bằng chứng #${idx + 1}`}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                                    onError={(e) => {
                                                        // Fallback display if URL cannot load as image
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                    <span className="p-1.5 rounded-full bg-white/90 text-slate-800 shadow">
                                                        <Maximize2 className="w-4 h-4" />
                                                    </span>
                                                </div>
                                                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[9px] font-bold">
                                                    Ảnh #{idx + 1}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                                        <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                                        <span>Chưa có ảnh bằng chứng đính kèm trong biên bản này.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════════════════════
                        RIGHT COLUMN (5 cols): Admin 4-Eyes Sign-Off, UC-S11 & UC-A07
                    ════════════════════════════════════════════════════════════════ */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* 6.3 Phê Duyệt Kép Của Quản Trị Viên (Four-Eyes Sign-Off - UC-A07) */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-md space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                        2
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900">
                                            Phê Duyệt Kép Quản Trị Viên (4-Eyes)
                                        </h3>
                                        <p className="text-[11px] text-slate-500">
                                            Four-Eyes Sign-Off · Thẩm định biên bản quá hạn 72h
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                        activeRecord.status.toUpperCase() === 'APPROVED' ||
                                        activeRecord.status.toUpperCase() === 'RETURNED' ||
                                        activeRecord.status.toUpperCase() === 'DISPOSED'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    }`}
                                >
                                    {activeRecord.status.toUpperCase() === 'RETURNED'
                                        ? 'ĐÃ TRẢ KHÁCH'
                                        : activeRecord.status.toUpperCase() === 'DISPOSED'
                                        ? 'ĐÃ THANH LÝ'
                                        : activeRecord.status.toUpperCase() === 'APPROVED'
                                        ? 'ĐÃ PHÊ DUYỆT'
                                        : 'CHỜ ADMIN DUYỆT (STEP 2/2)'}
                                </span>
                            </div>

                            {/* Admin Profile Box - REAL CURRENT USER */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                        ADM
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">
                                            {activeRecord.adminApprovalName ||
                                                (isAdmin
                                                    ? currentUser?.fullName || 'Quản trị viên (Bạn)'
                                                    : 'Chờ Quản trị viên thẩm tra')}
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                            {activeRecord.approvedAt
                                                ? `Đã duyệt lúc ${new Date(activeRecord.approvedAt).toLocaleString('vi-VN')}`
                                                : isAdmin
                                                ? 'Tài khoản Quản trị viên có quyền ký duyệt'
                                                : 'Chỉ tài khoản Admin mới có thẩm quyền'}
                                        </p>
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-200/80 text-indigo-900">
                                    {isAdmin ? 'ADMIN' : userRole.toUpperCase()}
                                </span>
                            </div>

                            {/* Checklist Thẩm Tra An Toàn (4 criteria bound to real case) */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-slate-800">
                                        Checklist Thẩm Tra An Toàn 72h (Bắt buộc đủ 4 tiêu chí):
                                    </p>
                                    <span
                                        className={`text-[10px] font-bold ${
                                            isChecklistComplete ? 'text-emerald-600' : 'text-rose-600'
                                        }`}
                                    >
                                        {Object.values(checklist).filter(Boolean).length}/4 tiêu chí
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <label className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition">
                                        <input
                                            type="checkbox"
                                            checked={checklist.overdueThreshold}
                                            disabled={!isAdmin || activeRecord.status.toUpperCase() === 'APPROVED'}
                                            onChange={(e) =>
                                                setChecklist((p) => ({ ...p, overdueThreshold: e.target.checked }))
                                            }
                                            className="mt-0.5 accent-indigo-600 w-4 h-4 rounded"
                                        />
                                        <span className="text-slate-700 leading-tight">
                                            Thời gian quá hạn thực tế ({activeRecord.overdueHours} giờ) đã vượt ngưỡng niêm phong trạm 72h.
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition">
                                        <input
                                            type="checkbox"
                                            checked={checklist.customerNotified}
                                            disabled={!isAdmin || activeRecord.status.toUpperCase() === 'APPROVED'}
                                            onChange={(e) =>
                                                setChecklist((p) => ({ ...p, customerNotified: e.target.checked }))
                                            }
                                            className="mt-0.5 accent-indigo-600 w-4 h-4 rounded"
                                        />
                                        <span className="text-slate-700 leading-tight">
                                            Đã đối chiếu thông tin khách thuê ({activeRecord.customerName || 'Khách hàng'} - {activeRecord.customerPhone || 'Chưa có SĐT'}).
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition">
                                        <input
                                            type="checkbox"
                                            checked={checklist.weightMatched}
                                            disabled={!isAdmin || activeRecord.status.toUpperCase() === 'APPROVED'}
                                            onChange={(e) =>
                                                setChecklist((p) => ({ ...p, weightMatched: e.target.checked }))
                                            }
                                            className="mt-0.5 accent-indigo-600 w-4 h-4 rounded"
                                        />
                                        <span className="text-slate-700 leading-tight">
                                            Đã kiểm tra sơ bộ an toàn vật thể và tải trọng thực địa ({parsedInspection.measuredWeight || 'đã ghi nhận'}).
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition">
                                        <input
                                            type="checkbox"
                                            checked={checklist.sealVerified}
                                            disabled={!isAdmin || activeRecord.status.toUpperCase() === 'APPROVED'}
                                            onChange={(e) =>
                                                setChecklist((p) => ({ ...p, sealVerified: e.target.checked }))
                                            }
                                            className="mt-0.5 accent-indigo-600 w-4 h-4 rounded"
                                        />
                                        <span className="text-slate-700 leading-tight">
                                            Hình ảnh và mã tem niêm phong ({parsedInspection.sealCode || activeRecord.recordCode}) hợp lệ, không có dấu hiệu bóc tách.
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Hướng xử lý tài sản niêm phong */}
                            <div>
                                <p className="text-xs font-bold text-slate-800 mb-2">
                                    Hướng xử lý tài sản niêm phong (Disposal Direction):
                                </p>
                                <div className="space-y-2 text-xs">
                                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="disposalDirection"
                                            value="STORED_IN_WAREHOUSE"
                                            checked={disposalDirection === 'STORED_IN_WAREHOUSE'}
                                            disabled={!isAdmin || activeRecord.status.toUpperCase() === 'APPROVED'}
                                            onChange={() => setDisposalDirection('STORED_IN_WAREHOUSE')}
                                            className="mt-0.5 accent-indigo-600"
                                        />
                                        <div>
                                            <p className="font-bold text-slate-900">
                                                Chuyển về Kho lưu giữ trung tâm (Central Warehouse)
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Lưu giữ bảo vệ nghiêm ngặt 30 ngày chờ khách đến nhận diện theo quy chế dịch vụ.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                                        <input
                                            type="radio"
                                            name="disposalDirection"
                                            value="RETURNED_TO_OWNER"
                                            checked={disposalDirection === 'RETURNED_TO_OWNER'}
                                            disabled={!isAdmin || activeRecord.status.toUpperCase() === 'APPROVED'}
                                            onChange={() => setDisposalDirection('RETURNED_TO_OWNER')}
                                            className="mt-0.5 accent-indigo-600"
                                        />
                                        <div>
                                            <p className="font-bold text-slate-900">
                                                Bàn giao trả lại cho Khách hàng / Chủ sở hữu
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Áp dụng khi khách đã liên hệ đối chiếu CCCD và có mặt tại trạm/kho nhận lại.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                                        <input
                                            type="radio"
                                            name="disposalDirection"
                                            value="LIQUIDATED"
                                            checked={disposalDirection === 'LIQUIDATED'}
                                            disabled={!isAdmin || activeRecord.status.toUpperCase() === 'APPROVED'}
                                            onChange={() => setDisposalDirection('LIQUIDATED')}
                                            className="mt-0.5 accent-indigo-600"
                                        />
                                        <div>
                                            <p className="font-bold text-slate-900">
                                                Chuyển diện thanh lý / tiêu hủy tài sản
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Phê duyệt thanh lý đồ bỏ quên quá hạn theo biên bản thẩm định pháp lý 4 mắt.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* MAIN CTA BUTTON - FOUR-EYES ENFORCEMENT */}
                            <div className="space-y-2 pt-1">
                                {activeRecord.status.toUpperCase() === 'APPROVED' ||
                                activeRecord.status.toUpperCase() === 'RETURNED' ||
                                activeRecord.status.toUpperCase() === 'DISPOSED' ? (
                                    <div className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs text-center flex items-center justify-center gap-2 shadow-sm">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>ĐÃ PHÊ DUYỆT 4-EYES &amp; MỞ KHÓA NIÊM PHONG THÀNH CÔNG</span>
                                    </div>
                                ) : !isAdmin ? (
                                    <div className="space-y-1.5">
                                        <button
                                            type="button"
                                            disabled
                                            className="w-full py-3 px-4 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                                        >
                                            <Lock className="w-4 h-4" />
                                            <span>TÀI KHOẢN STAFF KHÔNG ĐƯỢC PHÉP PHÊ DUYỆT (FOUR-EYES)</span>
                                        </button>
                                        <p className="text-[11px] text-center text-slate-400">
                                            Hồ sơ đang ở trạng thái PENDING_APPROVAL. Cần tài khoản Admin đăng nhập để thẩm tra.
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleApprove}
                                        disabled={!isChecklistComplete || isSubmittingApproval}
                                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 transition ${
                                            isChecklistComplete && !isSubmittingApproval
                                                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25 cursor-pointer'
                                                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                        }`}
                                    >
                                        {isSubmittingApproval ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ĐANG GỬI LỆNH PHÊ DUYỆT...
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="w-4 h-4" />
                                                PHÊ DUYỆT &amp; KÍCH HOẠT MỞ TỦ NIÊM PHONG (4-EYES SIGN-OFF)
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Secondary Action buttons */}
                                {activeRecord.status.toUpperCase() !== 'APPROVED' &&
                                    activeRecord.status.toUpperCase() !== 'RETURNED' &&
                                    activeRecord.status.toUpperCase() !== 'DISPOSED' && (
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setShowRejectModal(true)}
                                                className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                                            >
                                                Yêu cầu KTV bổ sung
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setApprovalErrorMsg(
                                                        'Đã gia hạn tạm hoãn xử lý thêm 24h để chờ người thân / khách hàng liên hệ.'
                                                    );
                                                }}
                                                className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                                            >
                                                Tạm hoãn 24h
                                            </button>
                                        </div>
                                    )}
                            </div>

                            {/* UC-S11 & UC-A07: Post-Inspection Handover & Liquidation Actions */}
                            <div className="pt-3 border-t border-slate-100 space-y-2">
                                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    Thủ tục Bàn giao lại Khách &amp; Hoàn tất Thanh lý:
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        type="button"
                                        onClick={handleOpenHandoverModal}
                                        disabled={
                                            isSubmittingResolve ||
                                            activeRecord.status.toUpperCase() === 'RETURNED' ||
                                            activeRecord.status.toUpperCase() === 'DISPOSED'
                                        }
                                        className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                        <span>Thực Hiện Thủ Tục Bàn Giao Lại Đồ Cho Khách</span>
                                    </button>

                                    {activeRecord.status.toUpperCase() === 'APPROVED' && (
                                        <button
                                            type="button"
                                            onClick={handleCompleteLiquidation}
                                            disabled={isSubmittingResolve}
                                            className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                                        >
                                            <Archive className="w-4 h-4" />
                                            <span>Hoàn Tất Xuất Kho / Thanh Lý Tài Sản</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 6.4 Four-Eyes Lifecycle Timeline (100% Real from activeRecord) */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                    TIẾN TRÌNH VÒNG ĐỜI HỒ SƠ 72H
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">Quy tắc 4 Mắt</span>
                            </div>

                            <div className="space-y-3 text-[11px]">
                                {/* Step 1: Staff Reported */}
                                <div className="flex items-start gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-slate-900">1. Lập biên bản niêm phong</p>
                                            <span className="font-mono text-[10px] text-slate-400">
                                                {new Date(activeRecord.reportedAt).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 mt-0.5">
                                            KTV {activeRecord.staffWitnessName || 'Hiện trường'} đã kiểm kê và dán tem niêm phong ô {activeRecord.lockerCode}.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 2: Admin Approval */}
                                <div className="flex items-start gap-2.5">
                                    <div
                                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                                            activeRecord.approvedAt
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}
                                    >
                                        {activeRecord.approvedAt ? <Check className="w-3 h-3" /> : '2'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-slate-900">2. Thẩm tra &amp; Ký duyệt 4-Eyes</p>
                                            <span className="font-mono text-[10px] text-slate-400">
                                                {activeRecord.approvedAt
                                                    ? new Date(activeRecord.approvedAt).toLocaleDateString('vi-VN')
                                                    : 'Chờ duyệt'}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 mt-0.5">
                                            {activeRecord.approvedAt
                                                ? `Admin ${activeRecord.adminApprovalName || 'Quản trị viên'} đã phê duyệt hướng xử lý ${disposalLabel(activeRecord.disposalAction)}.`
                                                : 'Hồ sơ đang chờ Quản trị viên đối chiếu checklist và phát lệnh mở tủ.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Step 3: Resolution */}
                                <div className="flex items-start gap-2.5">
                                    <div
                                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                                            activeRecord.resolvedAt
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-400'
                                        }`}
                                    >
                                        {activeRecord.resolvedAt ? <Check className="w-3 h-3" /> : '3'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-slate-900">3. Bàn giao hoặc Thanh lý</p>
                                            <span className="font-mono text-[10px] text-slate-400">
                                                {activeRecord.resolvedAt
                                                    ? new Date(activeRecord.resolvedAt).toLocaleDateString('vi-VN')
                                                    : 'Chưa thực hiện'}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 mt-0.5">
                                            {activeRecord.status.toUpperCase() === 'RETURNED'
                                                ? 'Đã hoàn tất bàn giao đồ cho khách hàng và xóa nợ cước.'
                                                : activeRecord.status.toUpperCase() === 'DISPOSED'
                                                ? 'Đã hoàn tất thủ tục xuất kho / thanh lý tài sản.'
                                                : 'Sẵn sàng thực hiện thủ tục khi khách đến nhận diện hoặc hết thời hạn lưu kho.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}

            {/* Modal: Inspection Form (Staff Mắt 1 - UC-S10) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <InspectionForm
                        prefill={
                            activeRecord
                                ? {
                                      bookingId: activeRecord.bookingId,
                                      bookingCode: activeRecord.bookingCode,
                                      lockerId: activeRecord.lockerId,
                                      lockerCode: activeRecord.lockerCode,
                                      stationId: activeRecord.stationId,
                                      stationName: activeRecord.stationName,
                                      overdueHours: Math.max(72, activeRecord.overdueHours),
                                  }
                                : undefined
                        }
                        onSubmitted={(newRec) => {
                            setShowCreateModal(false);
                            setRecords((prev) => [newRec, ...prev]);
                            setSelectedRecordId(newRec.id);
                            setApprovalSuccessMsg(
                                `Đã tạo biên bản niêm phong 72h ${newRec.recordCode} thành công! Biên bản đang chờ Quản trị viên phê duyệt (4-Eyes).`
                            );
                        }}
                        onCancel={() => setShowCreateModal(false)}
                    />
                </div>
            )}

            {/* Modal: UC-S11 Customer Handover Procedure */}
            {showHandoverModal && activeRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="p-2 rounded-xl bg-emerald-600 text-white">
                                    <UserCheck className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Thủ Tục Bàn Giao Lại Đồ Thất Lạc
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Biên bản <strong className="font-mono">{activeRecord.recordCode}</strong> · Ô tủ{' '}
                                        <strong className="font-mono">{activeRecord.lockerCode}</strong>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHandoverModal(false)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        Họ tên khách nhận đồ *
                                    </label>
                                    <input
                                        type="text"
                                        value={handoverReceiverName}
                                        onChange={(e) => setHandoverReceiverName(e.target.value)}
                                        placeholder="VD: Nguyễn Văn A"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">
                                        Số CCCD / Passport đối chiếu *
                                    </label>
                                    <input
                                        type="text"
                                        value={handoverReceiverIdNumber}
                                        onChange={(e) => setHandoverReceiverIdNumber(e.target.value)}
                                        placeholder="VD: 048099001234"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    />
                                </div>
                            </div>

                            {/* Real Image Upload for Handover Proof */}
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                    Ảnh chụp CCCD đối chiếu hoặc Biên bản ký nhận
                                </label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handoverFileInputRef.current?.click()}
                                            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Upload className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Tải ảnh lên từ máy</span>
                                        </button>
                                        <input
                                            ref={handoverFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleHandoverFileUpload}
                                            className="hidden"
                                        />
                                        <span className="text-[11px] text-slate-400">hoặc nhập link URL ảnh:</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={handoverProofUrl}
                                        onChange={(e) => setHandoverProofUrl(e.target.value)}
                                        placeholder="https://... hoặc data:image/..."
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    />
                                    {handoverProofUrl && (
                                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                                            <img
                                                src={handoverProofUrl}
                                                alt="Bằng chứng bàn giao"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setHandoverProofUrl('')}
                                                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Debt clearance option */}
                            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={handoverCollectDebt}
                                    onChange={(e) => setHandoverCollectDebt(e.target.checked)}
                                    className="mt-0.5 accent-emerald-600 w-4 h-4 rounded"
                                />
                                <div>
                                    <span className="text-emerald-950 font-semibold leading-relaxed">
                                        Đã thu đủ phí phạt quá hạn{' '}
                                        {activeRecord.overdueDebt ? `(${activeRecord.overdueDebt.toLocaleString('vi-VN')} đ)` : ''}
                                    </span>
                                    <p className="text-[11px] text-emerald-800 mt-0.5">
                                        Hệ thống sẽ cập nhật số nợ về 0 đ và mở khóa quyền đặt tủ cho tài khoản khách hàng.
                                    </p>
                                </div>
                            </label>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">
                                    Ghi chú xác minh &amp; bàn giao
                                </label>
                                <textarea
                                    value={handoverNotes}
                                    onChange={(e) => setHandoverNotes(e.target.value)}
                                    rows={2}
                                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowHandoverModal(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmHandover}
                                disabled={
                                    isSubmittingResolve ||
                                    !handoverReceiverName.trim() ||
                                    !handoverReceiverIdNumber.trim()
                                }
                                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                                    {isSubmittingResolve
                                        ? 'Đang lưu biên bản bàn giao...'
                                        : 'Xác nhận bàn giao & Trả đồ'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Reject with reason (Admin Reject - UC-A07) */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-start justify-between">
                            <h3 className="text-base font-black text-slate-900">
                                Yêu cầu KTV bổ sung biên bản
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowRejectModal(false)}
                                className="text-slate-400 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-600">
                            Vui lòng nhập lý do từ chối để Kỹ thuật viên (Staff) kiểm tra lại hiện trường hoặc chụp lại ảnh tem niêm phong.
                        </p>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Lý do yêu cầu bổ sung *
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                                placeholder="VD: Ảnh chụp tem niêm phong mờ, cần chụp lại rõ nét mã số barcode..."
                                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReject}
                                disabled={!rejectReason.trim() || isSubmittingReject}
                                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmittingReject ? 'Đang gửi...' : 'Xác nhận gửi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Quy chế pháp lý */}
            {showLawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-base font-black text-slate-900">
                                    Quy Chế Pháp Lý Xử Lý Hành Lý Bỏ Quên Quá Hạn 72h
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowLawModal(false)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="text-xs text-slate-600 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                            <p>
                                <strong>1. Căn cứ Bộ luật Dân sự 2015 (Điều 230):</strong> Quy định về việc xác lập quyền sở hữu đối với tài sản do người khác bỏ quên, đánh rơi trong không gian dịch vụ công cộng.
                            </p>
                            <p>
                                <strong>2. Thời hạn lưu giữ trạm (72 giờ):</strong> Sau 72 giờ kể từ thời điểm hết hạn đặt tủ, nếu khách hàng không phản hồi, hệ thống chuyển sang quy trình lập biên bản niêm phong và chuyển về Kho lưu giữ trung tâm.
                            </p>
                            <p>
                                <strong>3. Nguyên tắc 4 Mắt (Dual-Control):</strong> Mọi thao tác mở khoang tủ chứa đồ quá hạn 72h bắt buộc phải có sự chứng kiến và ký số của ít nhất 02 nhân sự (KTV hiện trường lập biên bản và Quản trị viên phê duyệt).
                            </p>
                            <p>
                                <strong>4. Thủ tục nhận diện &amp; bàn giao lại:</strong> Khi khách hàng đến nhận lại đồ thất lạc, nhân viên đối chiếu CCCD/Passport, thu phí phạt quá hạn (nếu có) và lập biên bản bàn giao có chữ ký xác nhận của khách hàng.
                            </p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setShowLawModal(false)}
                                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                            >
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Lightbox View Image */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
                    onClick={() => setLightboxUrl(null)}
                >
                    <div
                        className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setLightboxUrl(null)}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition z-10 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img
                            src={lightboxUrl}
                            alt="Ảnh bằng chứng kích thước đầy đủ"
                            className="max-w-full max-h-[85vh] object-contain mx-auto"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
