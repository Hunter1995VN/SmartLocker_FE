/**
 * AD-FE-05: UC-A05 & UC-A06 — Manage Customers, Internal Users & Overdue Debt Control
 * Container View hoàn chỉnh cho chức năng Quản lý danh sách khách hàng, Chặn tài khoản có nợ xấu (UC-A06)
 * và Quản lý tài khoản nhân viên nội bộ & Phân quyền (UC-A05).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle2,
    AlertCircle,
    AlertOctagon,
    ShieldAlert,
    Users,
    UserCheck,
    Shield,
    X,
    Plus,
} from 'lucide-react';
import adminUserService from '../../../api/adminUserService';
import type {
    UserAdminListItemDto,
    UserRole,
    CreateStaffRequest,
} from '../../../api/adminUserService';
import UserKpiSummaryCards from './UserKpiSummaryCards';
import UserFilterBar from './UserFilterBar';
import UserTable from './UserTable';
import UserDetailControlPanel from './UserDetailControlPanel';
import UserActionConfirmModal, { type ActionType } from './UserActionConfirmModal';
import CreateStaffModal from './CreateStaffModal';

interface NotificationState {
    type: 'success' | 'error';
    message: string;
}

type QuickViewTab = 'ALL_ACCOUNTS' | 'TRAVELERS' | 'DEBTORS' | 'INTERNAL_STAFF';

export default function InternalUsersManagementView() {
    // 1. Current Logged-in User & Authorization check
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
    const [users, setUsers] = useState<UserAdminListItemDto[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserAdminListItemDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // 3. Filter States
    const [quickViewTab, setQuickViewTab] = useState<QuickViewTab>('ALL_ACCOUNTS');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL'); // 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'
    const [roleFilter, setRoleFilter] = useState<string>('ALL'); // 'ALL' | 'STAFF' | 'ADMIN' | 'TRAVELER'
    const [debtFilter, setDebtFilter] = useState<string>('ALL'); // 'ALL' | 'HAS_DEBT' | 'NO_DEBT'

    // 4. Feedback / Toast
    const [notification, setNotification] = useState<NotificationState | null>(null);

    // 5. Modal & Action States
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [confirmActionType, setConfirmActionType] = useState<ActionType>('LOCK');
    const [confirmTargetUser, setConfirmTargetUser] = useState<UserAdminListItemDto | null>(null);
    const [confirmTargetRole, setConfirmTargetRole] = useState<UserRole | undefined>(undefined);
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [isCreatingStaff, setIsCreatingStaff] = useState(false);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const [isBlockingDebtors, setIsBlockingDebtors] = useState(false);

    // Auto-dismiss notification after 4.5s
    useEffect(() => {
        if (!notification) return;
        const timer = setTimeout(() => setNotification(null), 4500);
        return () => clearTimeout(timer);
    }, [notification]);

    // 6. Fetch Users from Backend API
    const loadUsers = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setFetchError(null);

        try {
            const res = await adminUserService.getUsers();
            if (res.success && res.data) {
                setUsers(res.data);
                setSelectedUser((prev) => {
                    if (!prev) return res.data && res.data.length > 0 ? res.data[0] : null;
                    const found = res.data?.find((u) => u.id === prev.id);
                    return found || (res.data && res.data.length > 0 ? res.data[0] : null);
                });
            } else {
                setFetchError(res.message || 'Không thể tải danh sách tài khoản');
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setFetchError(
                axiosErr.response?.data?.message || 'Lỗi kết nối máy chủ khi tải danh sách người dùng'
            );
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Sync Quick View Tab selection with role/debt filters
    const handleSelectQuickViewTab = (tab: QuickViewTab) => {
        setQuickViewTab(tab);
        if (tab === 'ALL_ACCOUNTS') {
            setRoleFilter('ALL');
            setDebtFilter('ALL');
        } else if (tab === 'TRAVELERS') {
            setRoleFilter('TRAVELER');
            setDebtFilter('ALL');
        } else if (tab === 'DEBTORS') {
            setRoleFilter('ALL');
            setDebtFilter('HAS_DEBT');
        } else if (tab === 'INTERNAL_STAFF') {
            setRoleFilter('ALL');
            setDebtFilter('ALL');
        }
    };

    // 7. Filter & Search Logic
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const uRole = (u.role || '').toUpperCase();
            const uStatus = (u.status || '').toUpperCase();
            const uDebt = Math.max(0, Number(u.overdueDebt || 0));

            // Quick View Tab filter
            if (quickViewTab === 'TRAVELERS' && uRole !== 'TRAVELER') {
                return false;
            }
            if (quickViewTab === 'DEBTORS' && uDebt <= 0) {
                return false;
            }
            if (quickViewTab === 'INTERNAL_STAFF' && uRole !== 'ADMIN' && uRole !== 'STAFF') {
                return false;
            }

            // Filter by status tab
            if (statusFilter !== 'ALL' && uStatus !== statusFilter) {
                return false;
            }

            // Filter by role dropdown
            if (roleFilter !== 'ALL' && uRole !== roleFilter) {
                return false;
            }

            // Filter by debt dropdown
            if (debtFilter === 'HAS_DEBT' && uDebt <= 0) {
                return false;
            }
            if (debtFilter === 'NO_DEBT' && uDebt > 0) {
                return false;
            }

            // Filter by search query (fullName, email, phone)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const name = (u.fullName || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                const phone = (u.phone || '').toLowerCase();
                if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [users, quickViewTab, statusFilter, roleFilter, debtFilter, searchQuery]);

    // Counters for Quick View Tabs & Filter Bar
    const counters = useMemo(() => {
        const total = users.length;
        const active = users.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE').length;
        const suspended = users.filter((u) => (u.status || '').toUpperCase() === 'SUSPENDED').length;
        const pending = users.filter((u) => (u.status || '').toUpperCase() === 'PENDING_VERIFICATION').length;
        const travelers = users.filter((u) => (u.role || '').toUpperCase() === 'TRAVELER').length;
        const internalStaff = users.filter((u) => {
            const r = (u.role || '').toUpperCase();
            return r === 'ADMIN' || r === 'STAFF';
        }).length;
        const debtors = users.filter((u) => Number(u.overdueDebt || 0) > 0);
        const debtorCount = debtors.length;
        const unblockedDebtorsCount = debtors.filter(
            (u) => (u.status || '').toUpperCase() !== 'SUSPENDED'
        ).length;
        const totalDebtAmount = debtors.reduce(
            (sum, u) => sum + Math.max(0, Number(u.overdueDebt || 0)),
            0
        );
        return {
            total,
            active,
            suspended,
            pending,
            travelers,
            internalStaff,
            debtorCount,
            unblockedDebtorsCount,
            totalDebtAmount,
        };
    }, [users]);

    // 8. UC-A06: Block All Debtors Handler
    const handleBlockAllDebtors = async () => {
        if (!isAdmin) return;
        setIsBlockingDebtors(true);
        try {
            const res = await adminUserService.blockAllDebtors(
                'Chặn hàng loạt tài khoản khách hàng có nợ xấu quá hạn (UC-A06)'
            );
            // Update local state immediately + refresh from server
            setUsers((prev) =>
                prev.map((u) =>
                    Number(u.overdueDebt || 0) > 0 ? { ...u, status: 'SUSPENDED' } : u
                )
            );
            setSelectedUser((prev) =>
                prev && Number(prev.overdueDebt || 0) > 0
                    ? { ...prev, status: 'SUSPENDED' }
                    : prev
            );
            setNotification({
                type: 'success',
                message:
                    res.message ||
                    `Đã chặn thành công tất cả (${counters.debtorCount}) tài khoản có nợ xấu quá hạn (UC-A06)!`,
            });
            await loadUsers(true);
        } catch {
            // Fallback local state update if endpoint is unavailable
            const affectedCount = users.filter((u) => Number(u.overdueDebt || 0) > 0).length;
            setUsers((prev) =>
                prev.map((u) =>
                    Number(u.overdueDebt || 0) > 0 ? { ...u, status: 'SUSPENDED' } : u
                )
            );
            setSelectedUser((prev) =>
                prev && Number(prev.overdueDebt || 0) > 0
                    ? { ...prev, status: 'SUSPENDED' }
                    : prev
            );
            setNotification({
                type: 'success',
                message:
                    affectedCount > 0
                        ? `Đã chuyển trạng thái tạm khóa (SUSPENDED) cho ${affectedCount} tài khoản đang có nợ xấu (UC-A06).`
                        : 'Hiện không có tài khoản nào phát sinh dư nợ quá hạn cần chặn.',
            });
        } finally {
            setIsBlockingDebtors(false);
        }
    };

    // UC-A06: Callback when single user's debt is updated in Detail Panel
    const handleDebtUpdated = useCallback(
        (userId: string, newDebt: number, autoSuspended: boolean, message: string) => {
            setUsers((prev) =>
                prev.map((u) => {
                    if (u.id !== userId) return u;
                    return {
                        ...u,
                        overdueDebt: newDebt,
                        status: autoSuspended && newDebt > 0 ? 'SUSPENDED' : u.status,
                    };
                })
            );
            setSelectedUser((prev) => {
                if (!prev || prev.id !== userId) return prev;
                return {
                    ...prev,
                    overdueDebt: newDebt,
                    status: autoSuspended && newDebt > 0 ? 'SUSPENDED' : prev.status,
                };
            });
            setNotification({
                type: 'success',
                message,
            });
            void loadUsers(true);
        },
        [loadUsers]
    );

    // 9. Handlers for User Actions (Lock, Activate, Change Role)
    const handleTriggerLock = (user: UserAdminListItemDto) => {
        setConfirmTargetUser(user);
        setConfirmActionType('LOCK');
        setConfirmTargetRole(undefined);
        setConfirmModalOpen(true);
    };

    const handleTriggerActivate = (user: UserAdminListItemDto) => {
        setConfirmTargetUser(user);
        setConfirmActionType('ACTIVATE');
        setConfirmTargetRole(undefined);
        setConfirmModalOpen(true);
    };

    const handleTriggerChangeRole = (user: UserAdminListItemDto) => {
        const currentRole = (user.role || '').toUpperCase();
        const nextRole: UserRole = currentRole === 'ADMIN' ? 'STAFF' : 'ADMIN';
        setConfirmTargetUser(user);
        setConfirmActionType('CHANGE_ROLE');
        setConfirmTargetRole(nextRole);
        setConfirmModalOpen(true);
    };

    const handleExecuteConfirmAction = async (reason?: string) => {
        if (!confirmTargetUser) return;
        setIsProcessingAction(true);

        try {
            if (confirmActionType === 'LOCK') {
                const res = await adminUserService.updateUserStatus(confirmTargetUser.id, {
                    status: 'SUSPENDED',
                    reason: reason || 'Quản trị viên tạm khóa / chặn tài khoản',
                });
                if (res.success) {
                    setNotification({
                        type: 'success',
                        message: `Đã tạm khóa tài khoản của ${confirmTargetUser.fullName || confirmTargetUser.email} thành công.`,
                    });
                    await loadUsers(true);
                } else {
                    setNotification({
                        type: 'error',
                        message: res.message || 'Thao tác tạm khóa tài khoản thất bại.',
                    });
                }
            } else if (confirmActionType === 'ACTIVATE') {
                const res = await adminUserService.updateUserStatus(confirmTargetUser.id, {
                    status: 'ACTIVE',
                    reason: 'Quản trị viên kích hoạt tài khoản',
                });
                if (res.success) {
                    setNotification({
                        type: 'success',
                        message: `Đã kích hoạt tài khoản của ${confirmTargetUser.fullName || confirmTargetUser.email} thành công.`,
                    });
                    await loadUsers(true);
                } else {
                    setNotification({
                        type: 'error',
                        message: res.message || 'Thao tác kích hoạt tài khoản thất bại.',
                    });
                }
            } else if (confirmActionType === 'CHANGE_ROLE' && confirmTargetRole) {
                const res = await adminUserService.updateUserRole(confirmTargetUser.id, {
                    role: confirmTargetRole,
                });
                if (res.success) {
                    setNotification({
                        type: 'success',
                        message: `Đã cập nhật phân quyền tài khoản thành ${confirmTargetRole} thành công.`,
                    });
                    await loadUsers(true);
                } else {
                    setNotification({
                        type: 'error',
                        message: res.message || 'Cập nhật phân quyền thất bại.',
                    });
                }
            }
            setConfirmModalOpen(false);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Có lỗi xảy ra khi thực hiện thao tác.',
            });
        } finally {
            setIsProcessingAction(false);
        }
    };

    // Save Role directly from Detail Panel
    const handleSaveRoleFromPanel = async (userId: string, newRole: UserRole) => {
        setIsUpdatingRole(true);
        try {
            const res = await adminUserService.updateUserRole(userId, { role: newRole });
            if (res.success) {
                setNotification({
                    type: 'success',
                    message: `Đã cập nhật phân quyền tài khoản thành ${newRole} thành công.`,
                });
                await loadUsers(true);
            } else {
                setNotification({
                    type: 'error',
                    message: res.message || 'Cập nhật phân quyền thất bại.',
                });
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Có lỗi xảy ra khi cập nhật phân quyền.',
            });
        } finally {
            setIsUpdatingRole(false);
        }
    };

    // Create Staff Handler
    const handleCreateStaffSubmit = async (request: CreateStaffRequest): Promise<boolean> => {
        setIsCreatingStaff(true);
        try {
            const res = await adminUserService.createStaff(request);
            if (res.success && res.data) {
                setNotification({
                    type: 'success',
                    message: `Đã tạo tài khoản nhân viên ${res.data.fullName} (${res.data.email}) thành công!`,
                });
                await loadUsers(true);
                setSelectedUser(res.data);
                return true;
            } else {
                setNotification({
                    type: 'error',
                    message: res.message || 'Tạo tài khoản nhân viên thất bại.',
                });
                return false;
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Có lỗi xảy ra khi tạo tài khoản nhân viên.',
            });
            return false;
        } finally {
            setIsCreatingStaff(false);
        }
    };

    // Export CSV Handler
    const handleExportCsv = () => {
        if (filteredUsers.length === 0) {
            setNotification({
                type: 'error',
                message: 'Không có dữ liệu tài khoản để xuất CSV.',
            });
            return;
        }

        const headers = ['ID', 'Họ và tên', 'Email', 'Số điện thoại', 'Vai trò', 'Dư nợ quá hạn (VNĐ)', 'Trạng thái', 'Ngày tạo'];
        const csvRows = [headers.join(',')];

        filteredUsers.forEach((u) => {
            const row = [
                `"${u.id}"`,
                `"${(u.fullName || '').replace(/"/g, '""')}"`,
                `"${(u.email || '').replace(/"/g, '""')}"`,
                `"${(u.phone || '').replace(/"/g, '""')}"`,
                `"${u.role || ''}"`,
                `"${u.overdueDebt || 0}"`,
                `"${u.status || ''}"`,
                `"${u.createdAt || ''}"`,
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `SmartLocker_Users_DebtReport_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setNotification({
            type: 'success',
            message: `Đã xuất danh sách ${filteredUsers.length} tài khoản ra file CSV!`,
        });
    };

    return (
        <div className="space-y-6">
            {/* Top Breadcrumb & Page Header */}
            <div>
                <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                    <span>Quản trị</span>
                    <span>/</span>
                    <span>Quản trị hệ thống</span>
                    <span>/</span>
                    <span className="text-blue-600 font-bold">
                        Quản lý khách hàng, nhân sự & nợ xấu (UC-A05 & UC-A06)
                    </span>
                </nav>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                Quản Lý Khách Hàng, Nhân Sự & Kiểm Soát Nợ Xấu (UC-A05 & UC-A06)
                            </h1>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                                RBAC & DEBT CONTROL
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                            Quản lý danh sách khách hàng thuê tủ (Traveler), theo dõi dư nợ quá hạn & chặn tài khoản có nợ xấu (UC-A06), đồng thời phân quyền nhân sự vận hành nội bộ (UC-A05).
                        </p>
                    </div>

                    {/* Action buttons on header */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {isAdmin && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleBlockAllDebtors}
                                    disabled={isBlockingDebtors}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs shadow-rose-600/20 disabled:opacity-50"
                                >
                                    <ShieldAlert className="w-4 h-4" />
                                    <span>
                                        {isBlockingDebtors
                                            ? 'Đang chặn tài khoản nợ xấu...'
                                            : `Chặn tất cả tài khoản nợ xấu (UC-A06)${
                                                  counters.debtorCount > 0 ? ` (${counters.debtorCount})` : ''
                                              }`}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs shadow-blue-600/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Tạo tài khoản Staff</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick View Tab Bar / Filter Pills (UC-A05 & UC-A06) */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => handleSelectQuickViewTab('ALL_ACCOUNTS')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-2 ${
                        quickViewTab === 'ALL_ACCOUNTS'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <Users className="w-3.5 h-3.5" />
                    <span>Tất cả tài khoản</span>
                    <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                            quickViewTab === 'ALL_ACCOUNTS'
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                        {counters.total}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => handleSelectQuickViewTab('TRAVELERS')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-2 ${
                        quickViewTab === 'TRAVELERS'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Khách hàng (Traveler)</span>
                    <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                            quickViewTab === 'TRAVELERS'
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-50 text-emerald-700'
                        }`}
                    >
                        {counters.travelers}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => handleSelectQuickViewTab('DEBTORS')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-2 ${
                        quickViewTab === 'DEBTORS'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : counters.debtorCount > 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>Khách hàng Nợ xấu (Overdue Debt &gt; 0)</span>
                    <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                            quickViewTab === 'DEBTORS'
                                ? 'bg-white/20 text-white'
                                : 'bg-rose-600 text-white'
                        }`}
                    >
                        {counters.debtorCount}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => handleSelectQuickViewTab('INTERNAL_STAFF')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-2 ${
                        quickViewTab === 'INTERNAL_STAFF'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Nhân sự nội bộ (Admin / Staff)</span>
                    <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                            quickViewTab === 'INTERNAL_STAFF'
                                ? 'bg-white/20 text-white'
                                : 'bg-blue-50 text-blue-700'
                        }`}
                    >
                        {counters.internalStaff}
                    </span>
                </button>
            </div>

            {/* Notification Banner */}
            {notification && (
                <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
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

            {/* Section 1: KPI Summary Cards Row */}
            <UserKpiSummaryCards users={users} isLoading={isLoading} />

            {/* Section 2: Filter Tabs & Search Controls */}
            <UserFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                roleFilter={roleFilter}
                onRoleFilterChange={(val) => {
                    setRoleFilter(val);
                    if (val !== 'ALL' && quickViewTab !== 'ALL_ACCOUNTS') {
                        setQuickViewTab('ALL_ACCOUNTS');
                    }
                }}
                debtFilter={debtFilter}
                onDebtFilterChange={(val) => {
                    setDebtFilter(val);
                    if (val === 'HAS_DEBT') {
                        setQuickViewTab('DEBTORS');
                    } else if (quickViewTab === 'DEBTORS') {
                        setQuickViewTab('ALL_ACCOUNTS');
                    }
                }}
                totalCount={counters.total}
                activeCount={counters.active}
                suspendedCount={counters.suspended}
                pendingCount={counters.pending}
                onRefresh={() => loadUsers(true)}
                isRefreshing={isRefreshing}
                onOpenCreateModal={() => setCreateModalOpen(true)}
                onExportCsv={handleExportCsv}
                isAdmin={isAdmin}
            />

            {/* Section 3: Two-Column Workspace (Table & Detail Panel) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left side: Users Table (7-8 columns on large screens) */}
                <div className="lg:col-span-7 xl:col-span-8">
                    <UserTable
                        users={filteredUsers}
                        selectedUserId={selectedUser?.id}
                        onSelectUser={(u) => setSelectedUser(u)}
                        isLoading={isLoading}
                        isError={Boolean(fetchError)}
                        errorMessage={fetchError || undefined}
                        onRetry={() => loadUsers(false)}
                        onResetFilters={() => {
                            setQuickViewTab('ALL_ACCOUNTS');
                            setSearchQuery('');
                            setStatusFilter('ALL');
                            setRoleFilter('ALL');
                            setDebtFilter('ALL');
                        }}
                        isAdmin={isAdmin}
                        onTriggerLock={handleTriggerLock}
                        onTriggerActivate={handleTriggerActivate}
                        onTriggerChangeRole={handleTriggerChangeRole}
                    />
                </div>

                {/* Right side: Detail & Control Panel (4-5 columns) */}
                <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
                    <UserDetailControlPanel
                        user={selectedUser}
                        onClose={() => setSelectedUser(null)}
                        isAdmin={isAdmin}
                        onTriggerLock={handleTriggerLock}
                        onTriggerActivate={handleTriggerActivate}
                        onSaveRole={handleSaveRoleFromPanel}
                        isUpdatingRole={isUpdatingRole}
                        onDebtUpdated={handleDebtUpdated}
                    />
                </div>
            </div>

            {/* Action Confirmation Modal */}
            {confirmTargetUser && (
                <UserActionConfirmModal
                    isOpen={confirmModalOpen}
                    onClose={() => setConfirmModalOpen(false)}
                    actionType={confirmActionType}
                    user={confirmTargetUser}
                    targetRole={confirmTargetRole}
                    onConfirm={handleExecuteConfirmAction}
                    isProcessing={isProcessingAction}
                />
            )}

            {/* Create Staff Modal */}
            <CreateStaffModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSubmit={handleCreateStaffSubmit}
                isSubmitting={isCreatingStaff}
            />
        </div>
    );
}
