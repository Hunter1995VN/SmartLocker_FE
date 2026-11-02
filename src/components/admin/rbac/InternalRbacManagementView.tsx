/**
 * AD-FE-05: UC-A05 — Quản lý tài khoản nội bộ & Phân quyền vai trò (Admin / Staff RBAC)
 * Màn hình chuyên biệt quản trị nhân sự nội bộ (Super Admin & Operations Staff),
 * Ma trận phân quyền RBAC 3 tầng (ADMIN / STAFF / TRAVELER) và Nhật ký truy vết phân quyền.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Shield,
    ShieldCheck,
    ShieldAlert,
    UserPlus,
    UserCog,
    Users,
    KeyRound,
    Lock,
    Unlock,
    Trash2,
    Edit3,
    Search,
    RefreshCw,
    Download,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    Activity,
    FileText,
    Mail,
    Phone,
    Calendar,
    Save,
    ExternalLink,
    X,
} from 'lucide-react';
import adminUserService, {
    type UserAdminListItemDto,
    type UserRole,
    type CreateStaffRequest,
    type UpdateInternalUserRequest,
    type RbacSummaryResponseDto,
    type RbacPermissionItemDto,
    type RbacRoleOverviewDto,
} from '../../../api/adminUserService';
import InternalUserFormModal from './InternalUserFormModal';
import ResetStaffPasswordModal from './ResetStaffPasswordModal';

interface InternalRbacManagementViewProps {
    onNavigateAudit?: () => void;
    onNavigateDebtUsers?: () => void;
}

type RbacViewTab = 'INTERNAL_ACCOUNTS' | 'PERMISSION_MATRIX' | 'RBAC_AUDIT_LOGS';

type ConfirmActionKind = 'LOCK' | 'ACTIVATE' | 'DEACTIVATE' | 'CHANGE_ROLE';

interface ConfirmDialogState {
    isOpen: boolean;
    kind: ConfirmActionKind;
    targetUser: UserAdminListItemDto | null;
    nextRole?: UserRole;
}

const FALLBACK_PERMISSION_MATRIX: RbacPermissionItemDto[] = [
    {
        code: 'RBAC_INTERNAL_USERS',
        module: 'Nhân sự & Phân quyền',
        name: 'Tạo, sửa, cấp lại mật khẩu, khóa & phân quyền Admin / Staff',
        description: 'Toàn quyền quản lý vòng đời tài khoản nội bộ và thay đổi vai trò RBAC',
        adminAllowed: true,
        staffAllowed: false,
        travelerAllowed: false,
        staffScopeNote: 'Chỉ xem danh sách & ma trận quyền hạn (Read-only)',
        riskLevel: 'CRITICAL',
    },
    {
        code: 'DEBT_CONTROL',
        module: 'Kiểm soát Nợ xấu',
        name: 'Điều chỉnh dư nợ quá hạn & Chặn hàng loạt tài khoản nợ xấu',
        description: 'Ghi nhận/xóa nợ quá hạn và tự động khóa tài khoản khách hàng vi phạm',
        adminAllowed: true,
        staffAllowed: false,
        travelerAllowed: false,
        staffScopeNote: 'Chỉ tra cứu trạng thái nợ của khách hàng tại trạm',
        riskLevel: 'HIGH',
    },
    {
        code: 'OPS_DASHBOARD',
        module: 'Giám sát Vận hành',
        name: 'Xem Dashboard vận hành, tỷ lệ lấp đầy & cảnh báo IoT',
        description: 'Theo dõi KPI toàn mạng lưới trạm tủ và cảnh báo mất kết nối thiết bị',
        adminAllowed: true,
        staffAllowed: true,
        travelerAllowed: false,
        staffScopeNote: 'Được phép truy cập đầy đủ bảng điều khiển vận hành',
        riskLevel: 'LOW',
    },
    {
        code: 'STATION_PRICING_CONFIG',
        module: 'Trạm & Bảng giá',
        name: 'Tạo/sửa trạm tủ, cấu hình bảng giá thuê, phí phạt & hoàn tiền',
        description: 'Thay đổi thông số thương mại, đơn giá theo kích thước ô tủ và chính sách phạt',
        adminAllowed: true,
        staffAllowed: false,
        travelerAllowed: false,
        staffScopeNote: 'Chỉ xem cấu hình trạm & bảng giá niêm yết',
        riskLevel: 'HIGH',
    },
    {
        code: 'LOCKER_MAINTENANCE',
        module: 'Lưới Ô Tủ Thời gian thực',
        name: 'Giám sát ma trận ô tủ & chuyển trạng thái Bảo trì (Maintenance)',
        description: 'Đưa ô tủ gặp lỗi cảm biến/khóa từ sang chế độ bảo trì kỹ thuật',
        adminAllowed: true,
        staffAllowed: true,
        travelerAllowed: false,
        staffScopeNote: 'Thực hiện trực tiếp khi bảo trì hiện trường',
        riskLevel: 'MEDIUM',
    },
    {
        code: 'EMERGENCY_UNLOCK',
        module: 'Sự cố & Cứu hộ Khẩn cấp',
        name: 'Tiếp nhận sự cố & Gửi lệnh mở khóa khẩn cấp từ xa (Emergency Unlock)',
        description: 'Kích hoạt mở chốt từ xa khi khách kẹt đồ hoặc sự cố phần cứng có xác minh',
        adminAllowed: true,
        staffAllowed: true,
        travelerAllowed: false,
        staffScopeNote: 'Bắt buộc nhập lý do & ghi vết Audit Log',
        riskLevel: 'CRITICAL',
    },
    {
        code: 'ABANDONED_REPORT',
        module: 'Tài sản Bỏ quên > 72h',
        name: 'Lập biên bản thu giữ niêm phong & Bàn giao đồ thất lạc',
        description: 'Xử lý hiện trường các đơn quá hạn trên 72 giờ và chụp ảnh niêm phong',
        adminAllowed: true,
        staffAllowed: true,
        travelerAllowed: false,
        staffScopeNote: 'Lập biên bản & đề xuất thanh lý chờ Admin duyệt',
        riskLevel: 'MEDIUM',
    },
    {
        code: 'ABANDONED_FOUR_EYES',
        module: 'Phê duyệt 4 Mắt',
        name: 'Phê duyệt quyết định thanh lý / tiêu hủy tài sản vô thừa nhận (4-Eyes)',
        description: 'Nguyên tắc kiểm soát chéo: Admin phê duyệt độc lập với nhân viên lập đề xuất',
        adminAllowed: true,
        staffAllowed: false,
        travelerAllowed: false,
        staffScopeNote: 'Bị chặn để đảm bảo nguyên tắc 4 mắt (Four-Eyes Principle)',
        riskLevel: 'CRITICAL',
    },
    {
        code: 'PAYOS_RECONCILIATION',
        module: 'Đối soát Tài chính',
        name: 'Đối soát dòng tiền PayOS, xử lý lệch giao dịch & hoàn tiền',
        description: 'Kiểm toán doanh thu, tra soát webhook thanh toán và xác nhận hoàn tiền',
        adminAllowed: true,
        staffAllowed: false,
        travelerAllowed: false,
        staffScopeNote: 'Không có quyền can thiệp nghiệp vụ kế toán đối soát',
        riskLevel: 'CRITICAL',
    },
    {
        code: 'AUDIT_LOGS_SECURITY',
        module: 'Nhật ký An ninh',
        name: 'Tra cứu & xuất báo cáo Nhật ký Truy vết An ninh toàn hệ thống',
        description: 'Giám sát mọi hành động nhạy cảm, đăng nhập và thay đổi dữ liệu',
        adminAllowed: true,
        staffAllowed: true,
        travelerAllowed: false,
        staffScopeNote: 'Tra cứu phục vụ đối chiếu vận hành ca trực',
        riskLevel: 'MEDIUM',
    },
    {
        code: 'TRAVELER_BOOKING_PAYMENT',
        module: 'Dịch vụ Khách hàng (Traveler App)',
        name: 'Đặt thuê ngăn tủ, thanh toán QR PayOS & nhận vé Offline HMAC',
        description: 'Quyền sử dụng dịch vụ thuê tủ thông minh dành cho hành khách',
        adminAllowed: false,
        staffAllowed: false,
        travelerAllowed: true,
        staffScopeNote: 'Dành riêng cho cổng khách hàng Traveler',
        riskLevel: 'LOW',
    },
];

function formatDateTime(iso?: string): string {
    if (!iso) return 'Chưa ghi nhận';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatShortDate(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function getInitials(name?: string): string {
    if (!name || !name.trim()) return 'NV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getEmployeeCode(user: UserAdminListItemDto): string {
    const prefix = (user.role || '').toUpperCase() === 'ADMIN' ? 'ADM' : 'STF';
    return `${prefix}-${user.id.substring(0, 4).toUpperCase()}`;
}

function getStatusBadge(status?: string) {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE') {
        return {
            label: 'Đang hoạt động',
            cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            dot: 'bg-emerald-500',
        };
    }
    if (s === 'SUSPENDED') {
        return {
            label: 'Đang tạm khóa',
            cls: 'bg-amber-50 text-amber-700 border-amber-200',
            dot: 'bg-amber-500',
        };
    }
    if (s === 'DELETED') {
        return {
            label: 'Đã thu hồi / Nghỉ việc',
            cls: 'bg-rose-50 text-rose-700 border-rose-200',
            dot: 'bg-rose-500',
        };
    }
    return {
        label: s || 'Chờ xác minh',
        cls: 'bg-slate-100 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
    };
}

function getRiskBadge(risk?: string) {
    const r = (risk || 'LOW').toUpperCase();
    if (r === 'CRITICAL') {
        return 'bg-rose-100 text-rose-700 border-rose-200';
    }
    if (r === 'HIGH') {
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    if (r === 'MEDIUM') {
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
}

function getActionLabel(action: string) {
    const a = (action || '').toUpperCase();
    switch (a) {
        case 'CREATE_STAFF':
            return { text: 'Tạo tài khoản nội bộ', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        case 'UPDATE_INTERNAL_USER':
            return { text: 'Cập nhật hồ sơ nhân sự', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
        case 'UPDATE_USER_ROLE':
            return { text: 'Thay đổi vai trò RBAC', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
        case 'RESET_INTERNAL_PASSWORD':
            return { text: 'Cấp lại mật khẩu', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
        case 'UPDATE_USER_STATUS':
            return { text: 'Khóa / Mở khóa tài khoản', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
        case 'DEACTIVATE_INTERNAL_USER':
            return { text: 'Thu hồi quyền truy cập', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
        case 'ADMIN_LOGIN':
            return { text: 'Đăng nhập Portal', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
        default:
            return { text: a || 'Sự kiện hệ thống', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
}

export default function InternalRbacManagementView({
    onNavigateAudit,
    onNavigateDebtUsers,
}: InternalRbacManagementViewProps) {
    // 1. Current logged-in user
    const currentAdminUser = useMemo(() => {
        try {
            const saved = localStorage.getItem('smartlocker_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    }, []);

    const viewerRole = String(currentAdminUser?.role || '').trim().toUpperCase();
    const isAdmin = viewerRole === 'ADMIN';
    const currentUserId = String(
        currentAdminUser?.userId || (currentAdminUser as { id?: string } | null)?.id || ''
    ).toLowerCase();
    const currentUserEmail = String(currentAdminUser?.email || '').toLowerCase();

    const isSelfUser = useCallback(
        (u: UserAdminListItemDto | null | undefined): boolean => {
            if (!u) return false;
            return (
                (Boolean(currentUserId) && u.id.toLowerCase() === currentUserId) ||
                (Boolean(currentUserEmail) && (u.email || '').toLowerCase() === currentUserEmail)
            );
        },
        [currentUserId, currentUserEmail]
    );

    // 2. Data states
    const [internalUsers, setInternalUsers] = useState<UserAdminListItemDto[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserAdminListItemDto | null>(null);
    const [rbacSummary, setRbacSummary] = useState<RbacSummaryResponseDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // 3. UI & Filter states
    const [activeTab, setActiveTab] = useState<RbacViewTab>('INTERNAL_ACCOUNTS');
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'STAFF'>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'DELETED'>('ALL');

    // Permission Matrix filter
    const [matrixRiskFilter, setMatrixRiskFilter] = useState<string>('ALL');
    const [matrixSearch, setMatrixSearch] = useState('');

    // Audit Log tab filter
    const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');
    const [auditSearch, setAuditSearch] = useState('');

    // Right panel inline role editor
    const [panelRoleDraft, setPanelRoleDraft] = useState<UserRole>('STAFF');
    const [panelRoleReason, setPanelRoleReason] = useState('');
    const [isSavingPanelRole, setIsSavingPanelRole] = useState(false);

    // Modals & notifications
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [formModalState, setFormModalState] = useState<{
        isOpen: boolean;
        mode: 'CREATE' | 'EDIT';
        user: UserAdminListItemDto | null;
    }>({ isOpen: false, mode: 'CREATE', user: null });
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);

    const [resetPwdUser, setResetPwdUser] = useState<UserAdminListItemDto | null>(null);
    const [isResettingPwd, setIsResettingPwd] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
        isOpen: false,
        kind: 'LOCK',
        targetUser: null,
    });
    const [confirmReason, setConfirmReason] = useState('');
    const [isExecutingConfirm, setIsExecutingConfirm] = useState(false);

    useEffect(() => {
        if (!notification) return;
        const timer = setTimeout(() => setNotification(null), 5000);
        return () => clearTimeout(timer);
    }, [notification]);

    // Sync right panel role draft when selected user changes
    useEffect(() => {
        if (!selectedUser) return;
        const r = (selectedUser.role || 'STAFF').toUpperCase();
        setPanelRoleDraft(r === 'ADMIN' ? 'ADMIN' : 'STAFF');
        setPanelRoleReason('');
    }, [selectedUser]);

    // 4. Load Internal Accounts + RBAC Summary
    const loadAllData = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setFetchError(null);

        try {
            const [usersRes, summaryRes] = await Promise.allSettled([
                adminUserService.getInternalUsers(),
                adminUserService.getRbacSummary(),
            ]);

            let loadedList: UserAdminListItemDto[] = [];

            if (usersRes.status === 'fulfilled' && usersRes.value.success && usersRes.value.data) {
                loadedList = usersRes.value.data;
            } else {
                // Fallback to getUsers({ role: 'INTERNAL' })
                const fallbackRes = await adminUserService.getUsers({ pageSize: 200 });
                if (fallbackRes.success && fallbackRes.data) {
                    loadedList = fallbackRes.data.filter((u) => {
                        const r = (u.role || '').toUpperCase();
                        return r === 'ADMIN' || r === 'STAFF';
                    });
                } else {
                    setFetchError(fallbackRes.message || 'Không thể tải danh sách tài khoản nội bộ.');
                }
            }

            setInternalUsers(loadedList);
            setSelectedUser((prev) => {
                if (!prev) return loadedList[0] ?? null;
                return loadedList.find((item) => item.id === prev.id) ?? loadedList[0] ?? null;
            });

            if (summaryRes.status === 'fulfilled' && summaryRes.value.success && summaryRes.value.data) {
                setRbacSummary(summaryRes.value.data);
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setFetchError(
                axiosErr.response?.data?.message || 'Không thể kết nối máy chủ để tải dữ liệu phân quyền RBAC.'
            );
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadAllData(false);
    }, [loadAllData]);

    // 5. Computed counters & safety checks
    const stats = useMemo(() => {
        const total = internalUsers.length;
        const admins = internalUsers.filter((u) => (u.role || '').toUpperCase() === 'ADMIN');
        const staff = internalUsers.filter((u) => (u.role || '').toUpperCase() === 'STAFF');
        const activeAdmins = admins.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE').length;
        const activeStaff = staff.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE').length;
        const activeTotal = internalUsers.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE').length;
        const suspendedTotal = internalUsers.filter((u) => (u.status || '').toUpperCase() === 'SUSPENDED').length;
        const deletedTotal = internalUsers.filter((u) => (u.status || '').toUpperCase() === 'DELETED').length;
        return {
            total,
            totalAdmins: admins.length,
            activeAdmins,
            totalStaff: staff.length,
            activeStaff,
            activeTotal,
            suspendedTotal,
            deletedTotal,
            auditCount: rbacSummary?.recentRbacLogs?.length ?? 0,
        };
    }, [internalUsers, rbacSummary]);

    const isLastActiveAdmin = useCallback(
        (u: UserAdminListItemDto | null | undefined): boolean => {
            if (!u) return false;
            return (
                (u.role || '').toUpperCase() === 'ADMIN' &&
                (u.status || '').toUpperCase() === 'ACTIVE' &&
                stats.activeAdmins <= 1
            );
        },
        [stats.activeAdmins]
    );

    // 6. Filtered Internal Users
    const filteredUsers = useMemo(() => {
        return internalUsers.filter((u) => {
            const r = (u.role || '').toUpperCase();
            const s = (u.status || '').toUpperCase();

            if (roleFilter !== 'ALL' && r !== roleFilter) return false;
            if (statusFilter !== 'ALL' && s !== statusFilter) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const code = getEmployeeCode(u).toLowerCase();
                const match =
                    (u.fullName || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q) ||
                    (u.phone || '').toLowerCase().includes(q) ||
                    code.includes(q);
                if (!match) return false;
            }
            return true;
        });
    }, [internalUsers, roleFilter, statusFilter, searchQuery]);

    // 7. Permission Matrix & Role Overviews (live API with fallback)
    const permissionMatrix = useMemo<RbacPermissionItemDto[]>(() => {
        const raw =
            rbacSummary?.permissionMatrix && rbacSummary.permissionMatrix.length > 0
                ? rbacSummary.permissionMatrix
                : FALLBACK_PERMISSION_MATRIX;

        return raw.filter((item) => {
            if (matrixRiskFilter !== 'ALL' && item.riskLevel.toUpperCase() !== matrixRiskFilter) {
                return false;
            }
            if (matrixSearch.trim()) {
                const q = matrixSearch.toLowerCase().trim();
                return (
                    item.name.toLowerCase().includes(q) ||
                    item.module.toLowerCase().includes(q) ||
                    item.code.toLowerCase().includes(q) ||
                    item.description.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [rbacSummary, matrixRiskFilter, matrixSearch]);

    const roleOverviews = useMemo<RbacRoleOverviewDto[]>(() => {
        if (rbacSummary?.roles && rbacSummary.roles.length > 0) {
            return rbacSummary.roles;
        }
        return [
            {
                role: 'ADMIN',
                displayName: 'Quản trị viên Cấp cao (Super Admin)',
                subtitle: 'Toàn quyền cấu hình thương mại, nhân sự RBAC, tài chính & phê duyệt 4 mắt',
                description:
                    'Chịu trách nhiệm cao nhất về vận hành hệ thống SmartLocker, phân quyền tài khoản nội bộ, cấu hình giá và đối soát PayOS.',
                totalUsers: stats.totalAdmins,
                activeUsers: stats.activeAdmins,
                suspendedUsers: stats.totalAdmins - stats.activeAdmins,
                keyPermissions: [
                    'Quản lý tài khoản nội bộ & phân quyền RBAC',
                    'Kiểm soát nợ quá hạn & chặn tài khoản nợ xấu',
                    'Cấu hình trạm tủ, bảng giá, phí phạt & hoàn tiền',
                    'Phê duyệt 4 mắt tài sản bỏ quên > 72h & Đối soát PayOS',
                ],
                restrictions: [
                    'Không thể tự khóa, tự xóa hoặc tự hạ quyền chính mình',
                    'Luôn duy trì tối thiểu 01 Super Admin đang hoạt động',
                ],
            },
            {
                role: 'STAFF',
                displayName: 'Nhân viên Vận hành Trạm (Operations Staff)',
                subtitle: 'Vận hành kỹ thuật hiện trường, xử lý sự cố IoT & lập biên bản 72h',
                description:
                    'Thực hiện ca trực giám sát trạm tủ, hỗ trợ mở khóa cứu hộ khẩn cấp có ghi vết và thu giữ niêm phong đồ bỏ quên.',
                totalUsers: stats.totalStaff,
                activeUsers: stats.activeStaff,
                suspendedUsers: stats.totalStaff - stats.activeStaff,
                keyPermissions: [
                    'Xem Dashboard vận hành & lưới ô tủ thời gian thực',
                    'Đặt chế độ bảo trì ô tủ & mở khóa cứu hộ khẩn cấp',
                    'Lập biên bản thu giữ & bàn giao tài sản bỏ quên > 72h',
                ],
                restrictions: [
                    'Không được tạo/sửa/khóa tài khoản hoặc thay đổi vai trò RBAC',
                    'Không được sửa bảng giá thuê, không duyệt 4 mắt & không đối soát PayOS',
                ],
            },
            {
                role: 'TRAVELER',
                displayName: 'Khách hàng Thuê tủ (Traveler)',
                subtitle: 'Người dùng cuối sử dụng dịch vụ gửi đồ thông minh',
                description:
                    'Đặt chỗ thuê ngăn tủ, thanh toán qua cổng QR PayOS và mở tủ trực tuyến hoặc bằng vé ngoại tuyến HMAC.',
                totalUsers: rbacSummary?.totalTravelers ?? 0,
                activeUsers: rbacSummary?.totalTravelers ?? 0,
                suspendedUsers: 0,
                keyPermissions: [
                    'Đặt thuê ngăn tủ, gia hạn & thanh toán trực tuyến PayOS',
                    'Lưu trữ vé mở khóa ngoại tuyến (Offline HMAC JWS Token)',
                    'Tra cứu lịch sử đơn thuê & tự tất toán dư nợ quá hạn',
                ],
                restrictions: ['Hoàn toàn tách biệt khỏi cổng quản trị nội bộ (/admin)'],
            },
        ];
    }, [rbacSummary, stats]);

    const filteredAuditLogs = useMemo(() => {
        const logs = rbacSummary?.recentRbacLogs ?? [];
        return logs.filter((log) => {
            if (auditActionFilter !== 'ALL' && (log.action || '').toUpperCase() !== auditActionFilter) {
                return false;
            }
            if (auditSearch.trim()) {
                const q = auditSearch.toLowerCase().trim();
                return (
                    (log.userName || '').toLowerCase().includes(q) ||
                    (log.userEmail || '').toLowerCase().includes(q) ||
                    (log.details || '').toLowerCase().includes(q) ||
                    (log.action || '').toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [rbacSummary, auditActionFilter, auditSearch]);

    // 8. CRUD & RBAC Action Handlers
    const handleCreateInternalUser = async (payload: CreateStaffRequest): Promise<boolean> => {
        setIsSubmittingForm(true);
        try {
            const res = await adminUserService.createStaff(payload);
            if (res.success && res.data) {
                setNotification({
                    type: 'success',
                    message:
                        res.message ||
                        `Đã tạo thành công tài khoản ${payload.role} cho ${res.data.fullName} (${res.data.email})!`,
                });
                await loadAllData(true);
                setSelectedUser(res.data);
                return true;
            }
            setNotification({
                type: 'error',
                message: res.message || 'Không thể tạo tài khoản nội bộ.',
            });
            return false;
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Lỗi khi tạo tài khoản nhân sự nội bộ.',
            });
            return false;
        } finally {
            setIsSubmittingForm(false);
        }
    };

    const handleEditInternalUser = async (
        userId: string,
        payload: UpdateInternalUserRequest
    ): Promise<boolean> => {
        setIsSubmittingForm(true);
        try {
            const res = await adminUserService.updateInternalUser(userId, payload);
            if (res.success) {
                setNotification({
                    type: 'success',
                    message: res.message || 'Đã cập nhật hồ sơ nhân sự nội bộ thành công.',
                });
                await loadAllData(true);
                return true;
            }
            setNotification({
                type: 'error',
                message: res.message || 'Cập nhật hồ sơ thất bại.',
            });
            return false;
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Lỗi máy chủ khi cập nhật hồ sơ nhân sự.',
            });
            return false;
        } finally {
            setIsSubmittingForm(false);
        }
    };

    const handleResetPasswordConfirm = async (
        userId: string,
        newPassword: string,
        reason?: string
    ): Promise<boolean> => {
        setIsResettingPwd(true);
        try {
            const res = await adminUserService.resetInternalPassword(userId, { newPassword, reason });
            if (res.success) {
                setNotification({
                    type: 'success',
                    message: res.message || 'Đã cấp lại mật khẩu mới cho tài khoản nội bộ thành công!',
                });
                await loadAllData(true);
                return true;
            }
            setNotification({
                type: 'error',
                message: res.message || 'Không thể cấp lại mật khẩu.',
            });
            return false;
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Lỗi khi đặt lại mật khẩu tài khoản nội bộ.',
            });
            return false;
        } finally {
            setIsResettingPwd(false);
        }
    };

    const handleSaveRoleFromPanel = async () => {
        if (!selectedUser || !isAdmin) return;
        const currentRole = (selectedUser.role || '').toUpperCase();
        if (panelRoleDraft === currentRole) return;

        setIsSavingPanelRole(true);
        try {
            const res = await adminUserService.updateUserRole(selectedUser.id, {
                role: panelRoleDraft,
                reason:
                    panelRoleReason.trim() ||
                    `Quản trị viên chuyển đổi vai trò từ ${currentRole} sang ${panelRoleDraft}`,
            });
            if (res.success) {
                setNotification({
                    type: 'success',
                    message:
                        res.message ||
                        `Đã cập nhật vai trò của ${selectedUser.fullName} từ ${currentRole} sang ${panelRoleDraft}.`,
                });
                setPanelRoleReason('');
                await loadAllData(true);
            } else {
                setNotification({
                    type: 'error',
                    message: res.message || 'Không thể cập nhật phân quyền vai trò.',
                });
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Lỗi khi cập nhật vai trò RBAC.',
            });
        } finally {
            setIsSavingPanelRole(false);
        }
    };

    const openConfirmDialog = (
        kind: ConfirmActionKind,
        targetUser: UserAdminListItemDto,
        nextRole?: UserRole
    ) => {
        setConfirmReason('');
        setConfirmDialog({
            isOpen: true,
            kind,
            targetUser,
            nextRole,
        });
    };

    const handleExecuteConfirmDialog = async () => {
        const target = confirmDialog.targetUser;
        if (!target) return;
        setIsExecutingConfirm(true);

        try {
            if (confirmDialog.kind === 'LOCK') {
                const res = await adminUserService.updateUserStatus(target.id, {
                    status: 'SUSPENDED',
                    reason: confirmReason.trim() || 'Tạm khóa tài khoản nhân sự nội bộ',
                });
                if (res.success) {
                    setNotification({
                        type: 'success',
                        message: res.message || `Đã tạm khóa quyền truy cập của ${target.fullName}.`,
                    });
                    await loadAllData(true);
                    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                } else {
                    setNotification({ type: 'error', message: res.message || 'Tạm khóa thất bại.' });
                }
            } else if (confirmDialog.kind === 'ACTIVATE') {
                const res = await adminUserService.updateUserStatus(target.id, {
                    status: 'ACTIVE',
                    reason: confirmReason.trim() || 'Khôi phục quyền truy cập tài khoản nội bộ',
                });
                if (res.success) {
                    setNotification({
                        type: 'success',
                        message: res.message || `Đã kích hoạt lại tài khoản của ${target.fullName}.`,
                    });
                    await loadAllData(true);
                    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                } else {
                    setNotification({ type: 'error', message: res.message || 'Kích hoạt thất bại.' });
                }
            } else if (confirmDialog.kind === 'DEACTIVATE') {
                const res = await adminUserService.deactivateInternalUser(
                    target.id,
                    confirmReason.trim() || 'Thu hồi vĩnh viễn quyền truy cập nhân sự nghỉ việc / chuyển bộ phận'
                );
                if (res.success) {
                    setNotification({
                        type: 'success',
                        message: res.message || `Đã thu hồi quyền truy cập nội bộ của ${target.fullName}.`,
                    });
                    await loadAllData(true);
                    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                } else {
                    setNotification({ type: 'error', message: res.message || 'Thu hồi tài khoản thất bại.' });
                }
            } else if (confirmDialog.kind === 'CHANGE_ROLE' && confirmDialog.nextRole) {
                const res = await adminUserService.updateUserRole(target.id, {
                    role: confirmDialog.nextRole,
                    reason:
                        confirmReason.trim() ||
                        `Điều chỉnh phân quyền RBAC sang ${confirmDialog.nextRole}`,
                });
                if (res.success) {
                    setNotification({
                        type: 'success',
                        message:
                            res.message ||
                            `Đã chuyển vai trò của ${target.fullName} sang ${confirmDialog.nextRole}.`,
                    });
                    await loadAllData(true);
                    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                } else {
                    setNotification({ type: 'error', message: res.message || 'Đổi vai trò thất bại.' });
                }
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Thao tác thất bại do quy tắc an toàn RBAC.',
            });
        } finally {
            setIsExecutingConfirm(false);
        }
    };

    const handleExportInternalCsv = () => {
        if (filteredUsers.length === 0) {
            setNotification({ type: 'error', message: 'Không có tài khoản nội bộ nào để xuất báo cáo CSV.' });
            return;
        }
        const headers = [
            'Mã Nhân Sự',
            'ID Hệ Thống',
            'Họ và Tên',
            'Email Công Vụ',
            'Số Điện Thoại',
            'Vai Trò RBAC',
            'Trạng Thái',
            'Đăng Nhập Gần Nhất',
            'Tổng Thao Tác Ghi Vết',
            'Ngày Tạo',
        ];
        const rows = [headers.join(',')];
        filteredUsers.forEach((u) => {
            rows.push(
                [
                    `"${getEmployeeCode(u)}"`,
                    `"${u.id}"`,
                    `"${(u.fullName || '').replace(/"/g, '""')}"`,
                    `"${(u.email || '').replace(/"/g, '""')}"`,
                    `"${(u.phone || '').replace(/"/g, '""')}"`,
                    `"${u.role}"`,
                    `"${u.status}"`,
                    `"${formatDateTime(u.lastLoginAt)}"`,
                    `"${u.actionsCount ?? 0}"`,
                    `"${formatShortDate(u.createdAt)}"`,
                ].join(',')
            );
        });
        const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `SmartLocker_Internal_RBAC_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setNotification({
            type: 'success',
            message: `Đã xuất danh sách ${filteredUsers.length} tài khoản nội bộ ra tệp CSV.`,
        });
    };

    const selectedIsSelf = isSelfUser(selectedUser);
    const selectedIsLastAdmin = isLastActiveAdmin(selectedUser);
    const selectedStatusUpper = (selectedUser?.status || '').toUpperCase();
    const selectedRoleUpper = (selectedUser?.role || '').toUpperCase();

    return (
        <div className="space-y-5">
            {/* Breadcrumb & Header */}
            <div>
                <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                    <span>Quản trị hệ thống</span>
                    <span>/</span>
                    <span>An ninh & Nhân sự nội bộ</span>
                    <span>/</span>
                    <span className="text-blue-600 font-bold">
                        Quản lý nhân sự nội bộ & Phân quyền vai trò
                    </span>
                </nav>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                Quản Lý Tài Khoản Nội Bộ & Phân Quyền Vai Trò (Admin / Staff RBAC)
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                                ENTERPRISE RBAC
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                            Quản trị tập trung tài khoản Quản trị viên (Super Admin) và Nhân viên vận hành trạm (Operations Staff), kiểm soát ma trận phân quyền RBAC theo nguyên tắc tối thiểu đặc quyền (Least Privilege) & chống tự khóa quyền quản trị.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => void loadAllData(true)}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer shadow-2xs"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                            <span>Làm mới</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportInternalCsv}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer shadow-2xs"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Xuất CSV Nhân sự</span>
                        </button>

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => setFormModalState({ isOpen: true, mode: 'CREATE', user: null })}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-sm shadow-blue-600/25"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>Tạo tài khoản Nội bộ</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Staff Read-Only Banner */}
            {!isAdmin && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-center justify-between gap-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                            <strong>Chế độ xem giới hạn dành cho Nhân viên Vận hành (STAFF):</strong> Bạn có thể tra cứu danh bạ nhân sự nội bộ và ma trận quyền hạn RBAC, nhưng các thao tác tạo mới, đổi vai trò, cấp lại mật khẩu và thu hồi tài khoản chỉ dành cho <strong>Quản trị viên (ADMIN)</strong>.
                        </span>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-150 ${
                        notification.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {notification.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{notification.message}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setNotification(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Tổng Tài Khoản Nội Bộ
                        </p>
                        <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                            <span className="text-emerald-600 font-bold">{stats.activeTotal} hoạt động</span>
                            {' · '}
                            <span className="text-amber-600 font-semibold">{stats.suspendedTotal} tạm khóa</span>
                            {stats.deletedTotal > 0 ? ` · ${stats.deletedTotal} thu hồi` : ''}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <Users className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Quản Trị Viên (ADMIN)
                        </p>
                        <p className="text-2xl font-extrabold text-purple-700 mt-1">
                            {stats.activeAdmins}
                            <span className="text-sm font-bold text-slate-400"> / {stats.totalAdmins}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Bảo vệ chống mất quyền (Tối thiểu 01 Active Admin)
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Nhân Viên Vận Hành (STAFF)
                        </p>
                        <p className="text-2xl font-extrabold text-teal-700 mt-1">
                            {stats.activeStaff}
                            <span className="text-sm font-bold text-slate-400"> / {stats.totalStaff}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Trực trạm, cứu hộ khẩn cấp & biên bản 72h
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                        <UserCog className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Ma Trận & Nhật Ký RBAC
                        </p>
                        <p className="text-2xl font-extrabold text-slate-900 mt-1">
                            {rbacSummary?.permissionMatrix?.length ?? FALLBACK_PERMISSION_MATRIX.length}{' '}
                            <span className="text-xs font-bold text-slate-500">quyền cốt lõi</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                            <span className="font-bold text-blue-600">{stats.auditCount}</span> sự kiện phân quyền gần đây
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                        <Shield className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveTab('INTERNAL_ACCOUNTS')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-2 ${
                            activeTab === 'INTERNAL_ACCOUNTS'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>Tài khoản Nội bộ (Admin / Staff)</span>
                        <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                activeTab === 'INTERNAL_ACCOUNTS'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 text-slate-700'
                            }`}
                        >
                            {stats.total}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('PERMISSION_MATRIX')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-2 ${
                            activeTab === 'PERMISSION_MATRIX'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Ma trận Phân quyền Vai trò (RBAC Matrix)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('RBAC_AUDIT_LOGS')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-2 ${
                            activeTab === 'RBAC_AUDIT_LOGS'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Nhật ký Truy vết Phân quyền</span>
                        <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                activeTab === 'RBAC_AUDIT_LOGS'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-blue-50 text-blue-700'
                            }`}
                        >
                            {stats.auditCount}
                        </span>
                    </button>
                </div>

                {onNavigateDebtUsers && (
                    <button
                        type="button"
                        onClick={onNavigateDebtUsers}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                        <span>Chuyển sang Quản lý khách hàng</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* ========================================================================
                TAB 1: DANH SÁCH & ĐIỀU KHIỂN TÀI KHOẢN NỘI BỘ
               ======================================================================== */}
            {activeTab === 'INTERNAL_ACCOUNTS' && (
                <div className="space-y-4">
                    {/* Search & Filter Bar */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm theo họ tên, email công vụ, SĐT hoặc mã ADM/STF..."
                                className="w-full pl-10 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Role Filter Pills */}
                            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                                {(
                                    [
                                        { key: 'ALL', label: 'Mọi vai trò' },
                                        { key: 'ADMIN', label: `Admin (${stats.totalAdmins})` },
                                        { key: 'STAFF', label: `Staff (${stats.totalStaff})` },
                                    ] as const
                                ).map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setRoleFilter(item.key)}
                                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                                            roleFilter === item.key
                                                ? 'bg-white text-slate-900 shadow-2xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            {/* Status Dropdown */}
                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(
                                        e.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'DELETED'
                                    )
                                }
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="ALL">Tất cả trạng thái ({stats.total})</option>
                                <option value="ACTIVE">Đang hoạt động ({stats.activeTotal})</option>
                                <option value="SUSPENDED">Đang tạm khóa ({stats.suspendedTotal})</option>
                                <option value="DELETED">Đã thu hồi / Nghỉ việc ({stats.deletedTotal})</option>
                            </select>
                        </div>
                    </div>

                    {/* Master-Detail Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        {/* Left Table (7-8 cols) */}
                        <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <span className="text-xs font-extrabold text-slate-800">
                                    Danh bạ Tài khoản Nhân sự Nội bộ ({filteredUsers.length})
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    Nhấp vào một nhân sự để điều khiển RBAC bên phải
                                </span>
                            </div>

                            {isLoading ? (
                                <div className="p-10 text-center space-y-3">
                                    <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                                    <p className="text-xs font-semibold text-slate-500">
                                        Đang tải danh sách tài khoản nội bộ & dữ liệu RBAC...
                                    </p>
                                </div>
                            ) : fetchError ? (
                                <div className="p-10 text-center space-y-3">
                                    <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                                    <p className="text-xs font-bold text-rose-700">{fetchError}</p>
                                    <button
                                        type="button"
                                        onClick={() => void loadAllData(false)}
                                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                                    >
                                        Thử tải lại
                                    </button>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="p-10 text-center space-y-2">
                                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                                    <p className="text-xs font-bold text-slate-600">
                                        Không tìm thấy tài khoản nhân sự nội bộ phù hợp
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setRoleFilter('ALL');
                                            setStatusFilter('ALL');
                                        }}
                                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                                    >
                                        Xóa bộ lọc tìm kiếm
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/40">
                                                <th className="py-3 px-4">Nhân sự & Liên hệ</th>
                                                <th className="py-3 px-3">Vai trò RBAC</th>
                                                <th className="py-3 px-3">Trạng thái</th>
                                                <th className="py-3 px-3">Hoạt động</th>
                                                {isAdmin && (
                                                    <th className="py-3 px-4 text-right">Thao tác nhanh</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {filteredUsers.map((u) => {
                                                const uRole = (u.role || '').toUpperCase();
                                                const uStatus = (u.status || '').toUpperCase();
                                                const statusBadge = getStatusBadge(uStatus);
                                                const self = isSelfUser(u);
                                                const lastAdmin = isLastActiveAdmin(u);
                                                const isSelected = selectedUser?.id === u.id;

                                                return (
                                                    <tr
                                                        key={u.id}
                                                        onClick={() => setSelectedUser(u)}
                                                        className={`transition cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-blue-50/70'
                                                                : 'hover:bg-slate-50/80'
                                                        }`}
                                                    >
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 border ${
                                                                        uRole === 'ADMIN'
                                                                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                                                                            : 'bg-teal-100 text-teal-700 border-teal-200'
                                                                    }`}
                                                                >
                                                                    {getInitials(u.fullName)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-bold text-slate-900 truncate">
                                                                            {u.fullName || 'Chưa đặt tên'}
                                                                        </span>
                                                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                                                                            {getEmployeeCode(u)}
                                                                        </span>
                                                                        {self && (
                                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-blue-600 text-white">
                                                                                Bạn
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-500 truncate">
                                                                        {u.email}
                                                                    </p>
                                                                    {u.phone && (
                                                                        <p className="text-[10px] font-mono text-slate-400">
                                                                            {u.phone}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="py-3.5 px-3">
                                                            {uRole === 'ADMIN' ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200">
                                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                                    <span>ADMIN</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-teal-100 text-teal-700 border border-teal-200">
                                                                    <UserCog className="w-3.5 h-3.5" />
                                                                    <span>STAFF</span>
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="py-3.5 px-3">
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadge.cls}`}
                                                            >
                                                                <span
                                                                    className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}
                                                                />
                                                                <span>{statusBadge.label}</span>
                                                            </span>
                                                        </td>

                                                        <td className="py-3.5 px-3">
                                                            <div className="space-y-0.5">
                                                                <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                                    <span>{formatDateTime(u.lastLoginAt)}</span>
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                    <Activity className="w-3 h-3 text-blue-500" />
                                                                    <span>{u.actionsCount ?? 0} thao tác ghi vết</span>
                                                                </p>
                                                            </div>
                                                        </td>

                                                        {isAdmin && (
                                                            <td
                                                                className="py-3.5 px-4 text-right"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className="inline-flex items-center justify-end gap-1">
                                                                    <button
                                                                        type="button"
                                                                        title="Chỉnh sửa hồ sơ"
                                                                        onClick={() =>
                                                                            setFormModalState({
                                                                                isOpen: true,
                                                                                mode: 'EDIT',
                                                                                user: u,
                                                                            })
                                                                        }
                                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                                                    >
                                                                        <Edit3 className="w-3.5 h-3.5" />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        title="Cấp lại mật khẩu"
                                                                        onClick={() => setResetPwdUser(u)}
                                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                                                                    >
                                                                        <KeyRound className="w-3.5 h-3.5" />
                                                                    </button>

                                                                    {uStatus === 'ACTIVE' ? (
                                                                        <button
                                                                            type="button"
                                                                            disabled={self || lastAdmin}
                                                                            title={
                                                                                self
                                                                                    ? 'Không thể tự tạm khóa tài khoản của bạn'
                                                                                    : lastAdmin
                                                                                    ? 'Không thể khóa Super Admin duy nhất đang hoạt động'
                                                                                    : 'Tạm khóa tài khoản'
                                                                            }
                                                                            onClick={() => openConfirmDialog('LOCK', u)}
                                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                                        >
                                                                            <Lock className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            title="Khôi phục / Kích hoạt lại tài khoản"
                                                                            onClick={() => openConfirmDialog('ACTIVATE', u)}
                                                                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                                                        >
                                                                            <Unlock className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Right Sticky Control Panel (5-4 cols) */}
                        <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
                            {!selectedUser ? (
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center text-slate-400 min-h-[420px] flex flex-col items-center justify-center">
                                    <Shield className="w-10 h-10 text-slate-200 mb-3" />
                                    <p className="text-xs font-bold text-slate-600 uppercase">
                                        Chưa chọn tài khoản nội bộ
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Chọn một nhân sự từ danh sách bên trái để xem phạm vi quyền hạn và điều khiển RBAC.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                                    {/* Panel Header */}
                                    <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-2.5 h-2.5 rounded-full ${
                                                    selectedStatusUpper === 'ACTIVE'
                                                        ? 'bg-emerald-500 animate-pulse'
                                                        : selectedStatusUpper === 'SUSPENDED'
                                                        ? 'bg-amber-500'
                                                        : 'bg-rose-500'
                                                }`}
                                            />
                                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                                                Bảng Điều Khiển Nhân Sự & RBAC
                                            </span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-slate-900 text-white">
                                            {getEmployeeCode(selectedUser)}
                                        </span>
                                    </div>

                                    <div className="p-5 space-y-4 max-h-[calc(100vh-150px)] overflow-y-auto">
                                        {/* Identity Card */}
                                        <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/70 space-y-2.5">
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 border ${
                                                        selectedRoleUpper === 'ADMIN'
                                                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                                                            : 'bg-teal-100 text-teal-700 border-teal-200'
                                                    }`}
                                                >
                                                    {getInitials(selectedUser.fullName)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <h3 className="text-sm font-extrabold text-slate-900 truncate">
                                                            {selectedUser.fullName}
                                                        </h3>
                                                        {selectedIsSelf && (
                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-blue-600 text-white">
                                                                Tài khoản của bạn
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1 truncate">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{selectedUser.email}</span>
                                                    </p>
                                                    <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="font-mono">
                                                            {selectedUser.phone || 'Chưa cập nhật SĐT'}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                                                <div className="bg-white p-2 rounded-lg border border-slate-100">
                                                    <span className="text-slate-400 block">Đăng nhập gần nhất</span>
                                                    <span className="font-bold text-slate-700">
                                                        {formatDateTime(selectedUser.lastLoginAt)}
                                                    </span>
                                                </div>
                                                <div className="bg-white p-2 rounded-lg border border-slate-100">
                                                    <span className="text-slate-400 block">Thao tác ghi vết</span>
                                                    <span className="font-bold text-blue-600">
                                                        {selectedUser.actionsCount ?? 0} sự kiện Audit
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>Ngày cấp tài khoản: {formatShortDate(selectedUser.createdAt)}</span>
                                            </p>
                                        </div>

                                        {/* Self / Last Admin Protection Notice */}
                                        {(selectedIsSelf || selectedIsLastAdmin) && (
                                            <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                                                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-extrabold">Cơ chế An toàn RBAC: </span>
                                                    {selectedIsSelf
                                                        ? 'Đây là tài khoản Quản trị viên đang đăng nhập của bạn. Hệ thống tự động khóa các nút Tự hạ quyền, Tự tạm khóa và Tự thu hồi để ngăn mất quyền điều khiển.'
                                                        : 'Đây là tài khoản Super Admin duy nhất đang hoạt động. Không thể khóa hoặc hạ quyền khi chưa bổ nhiệm thêm Admin khác.'}
                                                </div>
                                            </div>
                                        )}

                                        {/* Quick Profile & Password Buttons */}
                                        {isAdmin && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormModalState({
                                                            isOpen: true,
                                                            mode: 'EDIT',
                                                            user: selectedUser,
                                                        })
                                                    }
                                                    className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    <span>Sửa hồ sơ</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setResetPwdUser(selectedUser)}
                                                    className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                                                >
                                                    <KeyRound className="w-3.5 h-3.5" />
                                                    <span>Cấp lại mật khẩu</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* RBAC Role Assignment Section */}
                                        <div className="pt-3 border-t border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                                                    Phân quyền Vai trò (RBAC Role)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('PERMISSION_MATRIX')}
                                                    className="text-[11px] font-bold text-purple-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                                >
                                                    <span>Xem ma trận RBAC</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    disabled={!isAdmin || selectedIsSelf || selectedIsLastAdmin}
                                                    onClick={() => setPanelRoleDraft('ADMIN')}
                                                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                                        panelRoleDraft === 'ADMIN'
                                                            ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/15'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-extrabold">ADMIN</span>
                                                        {panelRoleDraft === 'ADMIN' && (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        Quản trị cấp cao
                                                    </p>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={!isAdmin || selectedIsSelf || selectedIsLastAdmin}
                                                    onClick={() => setPanelRoleDraft('STAFF')}
                                                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                                        panelRoleDraft === 'STAFF'
                                                            ? 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/15'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-extrabold">STAFF</span>
                                                        {panelRoleDraft === 'STAFF' && (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        Vận hành trạm tủ
                                                    </p>
                                                </button>
                                            </div>

                                            {/* Live Scope Preview */}
                                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-[11px]">
                                                <p className="font-extrabold text-slate-700">
                                                    Đặc quyền áp dụng cho vai trò {panelRoleDraft}:
                                                </p>
                                                {panelRoleDraft === 'ADMIN' ? (
                                                    <ul className="space-y-1 text-slate-600">
                                                        <li className="flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                            <span>Quản lý nhân sự nội bộ & gán vai trò RBAC</span>
                                                        </li>
                                                        <li className="flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                            <span>Cấu hình giá/phạt, chặn nợ xấu & đối soát PayOS</span>
                                                        </li>
                                                        <li className="flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                            <span>Phê duyệt 4 mắt xử lý tài sản bỏ quên &gt; 72h</span>
                                                        </li>
                                                    </ul>
                                                ) : (
                                                    <ul className="space-y-1 text-slate-600">
                                                        <li className="flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                                            <span>Giám sát lưới tủ, bảo trì ô tủ & mở khóa cứu hộ</span>
                                                        </li>
                                                        <li className="flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                                            <span>Lập biên bản thu giữ & bàn giao đồ thất lạc 72h</span>
                                                        </li>
                                                        <li className="flex items-center gap-1.5 text-slate-400">
                                                            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                                            <span>Không được sửa bảng giá, RBAC, duyệt 4 mắt & đối soát</span>
                                                        </li>
                                                    </ul>
                                                )}
                                            </div>

                                            {isAdmin && panelRoleDraft !== selectedRoleUpper && (
                                                <div className="space-y-2 pt-1">
                                                    <input
                                                        type="text"
                                                        value={panelRoleReason}
                                                        onChange={(e) => setPanelRoleReason(e.target.value)}
                                                        placeholder="Nhập lý do thay đổi vai trò (lưu vào Audit Log)..."
                                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setPanelRoleDraft(
                                                                    selectedRoleUpper === 'ADMIN' ? 'ADMIN' : 'STAFF'
                                                                )
                                                            }
                                                            className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                                                        >
                                                            Hủy
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleSaveRoleFromPanel()}
                                                            disabled={isSavingPanelRole}
                                                            className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            <Save className="w-3.5 h-3.5" />
                                                            <span>
                                                                {isSavingPanelRole
                                                                    ? 'Đang lưu...'
                                                                    : `Lưu vai trò ${panelRoleDraft}`}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Account Lifecycle & Access Control */}
                                        {isAdmin && (
                                            <div className="pt-3 border-t border-slate-100 space-y-2.5">
                                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 block">
                                                    Kiểm soát Trạng thái Truy cập
                                                </span>

                                                {selectedStatusUpper === 'ACTIVE' ? (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={selectedIsSelf || selectedIsLastAdmin}
                                                            onClick={() => openConfirmDialog('LOCK', selectedUser)}
                                                            className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            <Lock className="w-3.5 h-3.5" />
                                                            <span>Tạm khóa ca trực</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={selectedIsSelf || selectedIsLastAdmin}
                                                            onClick={() =>
                                                                openConfirmDialog('DEACTIVATE', selectedUser)
                                                            }
                                                            className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            <span>Thu hồi quyền</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openConfirmDialog('ACTIVATE', selectedUser)}
                                                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                                                        >
                                                            <Unlock className="w-4 h-4" />
                                                            <span>Khôi phục & Kích hoạt lại tài khoản</span>
                                                        </button>

                                                        {selectedStatusUpper !== 'DELETED' && (
                                                            <button
                                                                type="button"
                                                                disabled={selectedIsSelf || selectedIsLastAdmin}
                                                                onClick={() =>
                                                                    openConfirmDialog('DEACTIVATE', selectedUser)
                                                                }
                                                                className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                <span>Thu hồi tài khoản nghỉ việc (Soft Delete)</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================
                TAB 2: MA TRẬN PHÂN QUYỀN VAI TRÒ (RBAC PERMISSION MATRIX)
               ======================================================================== */}
            {activeTab === 'PERMISSION_MATRIX' && (
                <div className="space-y-5">
                    {/* 3 Role Overview Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {roleOverviews.map((roleCard) => {
                            const r = roleCard.role.toUpperCase();
                            const accentBorder =
                                r === 'ADMIN'
                                    ? 'border-purple-200 bg-purple-50/30'
                                    : r === 'STAFF'
                                    ? 'border-teal-200 bg-teal-50/30'
                                    : 'border-slate-200 bg-white';
                            const badgeCls =
                                r === 'ADMIN'
                                    ? 'bg-purple-600 text-white'
                                    : r === 'STAFF'
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-slate-700 text-white';

                            return (
                                <div
                                    key={roleCard.role}
                                    className={`rounded-2xl border p-5 shadow-xs space-y-3.5 ${accentBorder}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span
                                                className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${badgeCls}`}
                                            >
                                                ROLE: {r}
                                            </span>
                                            <h3 className="text-sm font-extrabold text-slate-900 mt-1.5">
                                                {roleCard.displayName}
                                            </h3>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {roleCard.subtitle}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-xl font-extrabold text-slate-900">
                                                {roleCard.activeUsers}
                                            </span>
                                            <span className="text-[10px] text-slate-400 block">
                                                active / {roleCard.totalUsers}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        {roleCard.description}
                                    </p>

                                    <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                                            Quyền hạn chính được cấp
                                        </p>
                                        {roleCard.keyPermissions.map((perm) => (
                                            <div
                                                key={perm}
                                                className="flex items-start gap-1.5 text-[11px] text-slate-700"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                <span>{perm}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {roleCard.restrictions.length > 0 && (
                                        <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                                                Giới hạn & Ràng buộc an ninh
                                            </p>
                                            {roleCard.restrictions.map((resItem) => (
                                                <div
                                                    key={resItem}
                                                    className="flex items-start gap-1.5 text-[11px] text-slate-600"
                                                >
                                                    <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                                    <span>{resItem}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Permission Matrix Table */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                            <div>
                                <h3 className="text-sm font-extrabold text-slate-900">
                                    Bảng Ma Trận Phân Quyền Nghiệp Vụ & API Endpoint ([Authorize])
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Đồng bộ trực tiếp với cấu hình bảo mật JWT Role Claims trên Backend ASP.NET Core
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={matrixSearch}
                                        onChange={(e) => setMatrixSearch(e.target.value)}
                                        placeholder="Tìm phân hệ hoặc quyền..."
                                        className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                                    />
                                </div>
                                <select
                                    value={matrixRiskFilter}
                                    onChange={(e) => setMatrixRiskFilter(e.target.value)}
                                    className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl cursor-pointer"
                                >
                                    <option value="ALL">Mọi mức độ nhạy cảm</option>
                                    <option value="CRITICAL">CRITICAL (Đặc biệt trọng yếu)</option>
                                    <option value="HIGH">HIGH (Rủi ro cao)</option>
                                    <option value="MEDIUM">MEDIUM (Trung bình)</option>
                                    <option value="LOW">LOW (Tiêu chuẩn)</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200/80 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                                        <th className="py-3 px-4">Phân hệ & Quyền hạn</th>
                                        <th className="py-3 px-3 text-center">ADMIN</th>
                                        <th className="py-3 px-3 text-center">STAFF</th>
                                        <th className="py-3 px-3 text-center">TRAVELER</th>
                                        <th className="py-3 px-4">Phạm vi / Ghi chú kiểm soát Staff</th>
                                        <th className="py-3 px-4 text-right">Độ nhạy cảm</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {permissionMatrix.map((perm) => (
                                        <tr key={perm.code} className="hover:bg-slate-50/70 transition">
                                            <td className="py-3.5 px-4 max-w-md">
                                                <span className="text-[10px] font-extrabold uppercase text-blue-600 block">
                                                    {perm.module}
                                                </span>
                                                <span className="font-bold text-slate-900 block mt-0.5">
                                                    {perm.name}
                                                </span>
                                                <span className="text-[11px] text-slate-500 block mt-0.5">
                                                    {perm.description}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-3 text-center">
                                                {perm.adminAllowed ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                                                )}
                                            </td>

                                            <td className="py-3.5 px-3 text-center">
                                                {perm.staffAllowed ? (
                                                    <CheckCircle2 className="w-4 h-4 text-teal-600 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                                                )}
                                            </td>

                                            <td className="py-3.5 px-3 text-center">
                                                {perm.travelerAllowed ? (
                                                    <CheckCircle2 className="w-4 h-4 text-blue-600 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-[11px] text-slate-600 max-w-xs">
                                                {perm.staffScopeNote}
                                            </td>

                                            <td className="py-3.5 px-4 text-right">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getRiskBadge(
                                                        perm.riskLevel
                                                    )}`}
                                                >
                                                    {perm.riskLevel}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================
                TAB 3: NHẬT KÝ TRUY VẾT PHÂN QUYỀN (RBAC AUDIT TRAIL)
               ======================================================================== */}
            {activeTab === 'RBAC_AUDIT_LOGS' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
                        <div>
                            <h3 className="text-sm font-extrabold text-slate-900">
                                Nhật Ký Truy Vết Phân Quyền & Tài Khoản Nội Bộ (RBAC Security Trail)
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Mọi thao tác tạo tài khoản, đổi vai trò, cấp lại mật khẩu, khóa hoặc thu hồi nhân sự đều được ghi vết bất biến
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={auditSearch}
                                    onChange={(e) => setAuditSearch(e.target.value)}
                                    placeholder="Tìm người thực hiện, chi tiết..."
                                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <select
                                value={auditActionFilter}
                                onChange={(e) => setAuditActionFilter(e.target.value)}
                                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl cursor-pointer"
                            >
                                <option value="ALL">Tất cả sự kiện RBAC</option>
                                <option value="CREATE_STAFF">Tạo tài khoản nội bộ</option>
                                <option value="UPDATE_INTERNAL_USER">Cập nhật hồ sơ nhân sự</option>
                                <option value="UPDATE_USER_ROLE">Thay đổi vai trò RBAC</option>
                                <option value="RESET_INTERNAL_PASSWORD">Cấp lại mật khẩu</option>
                                <option value="UPDATE_USER_STATUS">Khóa / Kích hoạt tài khoản</option>
                                <option value="DEACTIVATE_INTERNAL_USER">Thu hồi tài khoản</option>
                                <option value="ADMIN_LOGIN">Đăng nhập Portal</option>
                            </select>

                            {onNavigateAudit && (
                                <button
                                    type="button"
                                    onClick={onNavigateAudit}
                                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
                                >
                                    <span>Mở Audit Logs toàn hệ thống</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {filteredAuditLogs.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 space-y-2">
                            <FileText className="w-8 h-8 mx-auto text-slate-300" />
                            <p className="text-xs font-bold text-slate-600">
                                Chưa có bản ghi nhật ký RBAC nào khớp với bộ lọc hiện tại
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/40 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        <th className="py-3 px-4">Thời gian</th>
                                        <th className="py-3 px-4">Người thực hiện</th>
                                        <th className="py-3 px-3">Loại sự kiện</th>
                                        <th className="py-3 px-4">Chi tiết thay đổi RBAC</th>
                                        <th className="py-3 px-4 text-right">Địa chỉ IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {filteredAuditLogs.map((log) => {
                                        const badge = getActionLabel(log.action);
                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50/70 transition">
                                                <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                                                    {formatDateTime(log.createdAt)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-900">
                                                        {log.userName || 'Quản trị viên'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        {log.userEmail} ·{' '}
                                                        <span className="font-bold text-purple-700">
                                                            {log.userRole}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <span
                                                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}
                                                    >
                                                        {badge.text}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-700 max-w-md">
                                                    {log.details || `${log.action} (${log.targetEntity})`}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                                                    {log.ipAddress || '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Create / Edit Internal User Modal */}
            <InternalUserFormModal
                isOpen={formModalState.isOpen}
                mode={formModalState.mode}
                initialUser={formModalState.user}
                isSelf={isSelfUser(formModalState.user)}
                onClose={() => setFormModalState((prev) => ({ ...prev, isOpen: false }))}
                onCreateSubmit={handleCreateInternalUser}
                onEditSubmit={handleEditInternalUser}
                isSubmitting={isSubmittingForm}
            />

            {/* Reset Password Modal */}
            <ResetStaffPasswordModal
                isOpen={Boolean(resetPwdUser)}
                user={resetPwdUser}
                onClose={() => setResetPwdUser(null)}
                onConfirm={handleResetPasswordConfirm}
                isSubmitting={isResettingPwd}
            />

            {/* Confirmation Dialog for Lock / Activate / Deactivate / Change Role */}
            {confirmDialog.isOpen && confirmDialog.targetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h3 className="text-sm font-extrabold text-slate-900">
                                {confirmDialog.kind === 'LOCK'
                                    ? 'Xác Nhận Tạm Khóa Tài Khoản Nội Bộ'
                                    : confirmDialog.kind === 'ACTIVATE'
                                    ? 'Xác Nhận Khôi Phục Quyền Truy Cập'
                                    : confirmDialog.kind === 'DEACTIVATE'
                                    ? 'Xác Nhận Thu Hồi Tài Khoản Nhân Sự'
                                    : `Xác Nhận Đổi Vai Trò Sang ${confirmDialog.nextRole}`}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                                disabled={isExecutingConfirm}
                                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {confirmDialog.kind === 'LOCK' && (
                                    <>
                                        Tài khoản của nhân sự{' '}
                                        <strong className="text-slate-900">
                                            {confirmDialog.targetUser.fullName}
                                        </strong>{' '}
                                        ({confirmDialog.targetUser.email}) sẽ chuyển sang trạng thái{' '}
                                        <strong className="text-amber-700">SUSPENDED</strong> và không thể đăng nhập cổng vận hành cho đến khi được mở lại.
                                    </>
                                )}
                                {confirmDialog.kind === 'ACTIVATE' && (
                                    <>
                                        Khôi phục trạng thái <strong className="text-emerald-700">ACTIVE</strong> cho tài khoản nội bộ{' '}
                                        <strong className="text-slate-900">
                                            {confirmDialog.targetUser.fullName}
                                        </strong>{' '}
                                        ({confirmDialog.targetUser.email}).
                                    </>
                                )}
                                {confirmDialog.kind === 'DEACTIVATE' && (
                                    <>
                                        Thu hồi quyền truy cập nội bộ của{' '}
                                        <strong className="text-slate-900">
                                            {confirmDialog.targetUser.fullName}
                                        </strong>{' '}
                                        (chuyển trạng thái sang <strong className="text-rose-700">DELETED</strong>, bảo toàn lịch sử biên bản & Audit Logs).
                                    </>
                                )}
                                {confirmDialog.kind === 'CHANGE_ROLE' && (
                                    <>
                                        Chuyển đổi vai trò RBAC của{' '}
                                        <strong className="text-slate-900">
                                            {confirmDialog.targetUser.fullName}
                                        </strong>{' '}
                                        sang <strong className="text-purple-700">{confirmDialog.nextRole}</strong>.
                                    </>
                                )}
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Lý do thực hiện (ghi vào Audit Log)
                                </label>
                                <input
                                    type="text"
                                    value={confirmReason}
                                    onChange={(e) => setConfirmReason(e.target.value)}
                                    disabled={isExecutingConfirm}
                                    placeholder="Nhập lý do nghiệp vụ..."
                                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                                    disabled={isExecutingConfirm}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleExecuteConfirmDialog()}
                                    disabled={isExecutingConfirm}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 ${
                                        confirmDialog.kind === 'ACTIVATE'
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : confirmDialog.kind === 'DEACTIVATE'
                                            ? 'bg-rose-600 hover:bg-rose-700'
                                            : 'bg-amber-600 hover:bg-amber-700'
                                    }`}
                                >
                                    {isExecutingConfirm ? 'Đang thực hiện...' : 'Xác nhận thực thi'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
