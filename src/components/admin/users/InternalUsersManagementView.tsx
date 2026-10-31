/**
 * AD-FE-05: Quản lý khách hàng & Kiểm soát dư nợ
 * Giao diện quản lý danh sách khách hàng thuê tủ (Traveler), theo dõi dư nợ quá hạn & chặn tài khoản vi phạm.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle2,
    AlertCircle,
    ShieldAlert,
    X,
} from 'lucide-react';
import adminUserService from '../../../api/adminUserService';
import type {
    UserAdminListItemDto,
    UserRole,
} from '../../../api/adminUserService';
import UserKpiSummaryCards from './UserKpiSummaryCards';
import UserFilterBar from './UserFilterBar';
import UserTable from './UserTable';
import UserDetailControlPanel from './UserDetailControlPanel';
import UserActionConfirmModal, { type ActionType } from './UserActionConfirmModal';

interface NotificationState {
    type: 'success' | 'error';
    message: string;
}

interface InternalUsersManagementViewProps {
    onNavigateRbac?: () => void;
}

export default function InternalUsersManagementView({
    onNavigateRbac,
}: InternalUsersManagementViewProps = {}) {
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
                    if (!prev) return null;
                    const found = res.data?.find((u) => u.id === prev.id);
                    return found || null;
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

    // 7. Filter & Search Logic
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            // Search match (name, email, phone)
            const query = searchQuery.trim().toLowerCase();
            const matchSearch =
                !query ||
                (u.fullName && u.fullName.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query)) ||
                (u.phone && u.phone.toLowerCase().includes(query));

            // Status filter
            const matchStatus =
                statusFilter === 'ALL' ||
                (u.status || '').toUpperCase() === statusFilter.toUpperCase();

            // Role filter
            const matchRole =
                roleFilter === 'ALL' ||
                (u.role || '').toUpperCase() === roleFilter.toUpperCase();

            // Debt filter
            const debt = Number(u.overdueDebt || 0);
            const matchDebt =
                debtFilter === 'ALL' ||
                (debtFilter === 'HAS_DEBT' && debt > 0) ||
                (debtFilter === 'NO_DEBT' && debt <= 0);

            return matchSearch && matchStatus && matchRole && matchDebt;
        });
    }, [users, searchQuery, statusFilter, roleFilter, debtFilter]);

    // Counters for Quick Tab Badges
    const counters = useMemo(() => {
        const total = users.length;
        const active = users.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE').length;
        const suspended = users.filter((u) => (u.status || '').toUpperCase() === 'SUSPENDED').length;
        const pending = users.filter((u) => (u.status || '').toUpperCase() === 'PENDING_VERIFICATION').length;
        const debtors = users.filter((u) => Number(u.overdueDebt || 0) > 0);
        const debtorCount = debtors.length;
        const totalOverdueDebt = debtors.reduce((sum, u) => sum + Math.max(0, Number(u.overdueDebt || 0)), 0);

        return {
            total,
            active,
            suspended,
            pending,
            debtorCount,
            totalOverdueDebt,
        };
    }, [users]);

    // 8. Action Handlers
    const handleTriggerLock = (user: UserAdminListItemDto) => {
        setConfirmTargetUser(user);
        setConfirmActionType('LOCK');
        setConfirmModalOpen(true);
    };

    const handleTriggerActivate = (user: UserAdminListItemDto) => {
        setConfirmTargetUser(user);
        setConfirmActionType('ACTIVATE');
        setConfirmModalOpen(true);
    };

    const handleTriggerChangeRole = (user: UserAdminListItemDto) => {
        setConfirmTargetUser(user);
        setConfirmActionType('CHANGE_ROLE');
        const nextRole: UserRole =
            (user.role || '').toUpperCase() === 'TRAVELER'
                ? 'STAFF'
                : (user.role || '').toUpperCase() === 'STAFF'
                ? 'ADMIN'
                : 'STAFF';
        setConfirmTargetRole(nextRole);
        setConfirmModalOpen(true);
    };

    // Chặn tất cả khách hàng nợ xấu
    const handleBlockAllDebtors = async () => {
        if (!isAdmin) return;
        const debtorsToBlock = users.filter(
            (u) => Number(u.overdueDebt || 0) > 0 && (u.status || '').toUpperCase() !== 'SUSPENDED'
        );

        if (debtorsToBlock.length === 0) {
            setNotification({
                type: 'success',
                message: 'Hiện không có tài khoản nợ quá hạn nào chưa bị khóa.',
            });
            return;
        }

        const confirmMsg = `Bạn có chắc chắn muốn chặn ${debtorsToBlock.length} tài khoản khách hàng đang có nợ quá hạn?`;
        if (!window.confirm(confirmMsg)) return;

        setIsBlockingDebtors(true);
        let successCount = 0;
        let failCount = 0;

        for (const debtor of debtorsToBlock) {
            try {
                const res = await adminUserService.updateUserStatus(debtor.id, {
                    status: 'SUSPENDED',
                    reason: `Tự động chặn do có nợ quá hạn ${Number(debtor.overdueDebt).toLocaleString('vi-VN')} đ`,
                });
                if (res.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        setIsBlockingDebtors(false);
        await loadUsers(true);

        if (failCount === 0) {
            setNotification({
                type: 'success',
                message: `Đã chặn thành công ${successCount} tài khoản nợ quá hạn!`,
            });
        } else {
            setNotification({
                type: 'error',
                message: `Đã chặn ${successCount} tài khoản. Có ${failCount} tài khoản thất bại.`,
            });
        }
    };

    const handleDebtUpdated = (
        userId: string,
        newDebt: number,
        autoSuspended: boolean,
        message: string
    ) => {
        setUsers((prev) =>
            prev.map((u) => {
                if (u.id === userId) {
                    return {
                        ...u,
                        overdueDebt: newDebt,
                        status: autoSuspended ? 'SUSPENDED' : u.status,
                    };
                }
                return u;
            })
        );
        setSelectedUser((prev) => {
            if (prev && prev.id === userId) {
                return {
                    ...prev,
                    overdueDebt: newDebt,
                    status: autoSuspended ? 'SUSPENDED' : prev.status,
                };
            }
            return prev;
        });
        setNotification({ type: 'success', message });
    };

    const handleExecuteConfirmAction = async (reason?: string) => {
        if (!confirmTargetUser) return;
        setIsProcessingAction(true);

        try {
            if (confirmActionType === 'LOCK') {
                const res = await adminUserService.updateUserStatus(confirmTargetUser.id, {
                    status: 'SUSPENDED',
                    reason: reason || 'Quản trị viên tạm khóa tài khoản',
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
                        message: `Đã cập nhật vai trò tài khoản thành ${confirmTargetRole} thành công.`,
                    });
                    await loadUsers(true);
                } else {
                    setNotification({
                        type: 'error',
                        message: res.message || 'Cập nhật vai trò thất bại.',
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

    const handleSaveRoleFromPanel = async (userId: string, newRole: UserRole) => {
        setIsUpdatingRole(true);
        try {
            const res = await adminUserService.updateUserRole(userId, { role: newRole });
            if (res.success) {
                setNotification({
                    type: 'success',
                    message: `Đã cập nhật vai trò tài khoản thành ${newRole} thành công.`,
                });
                await loadUsers(true);
            } else {
                setNotification({
                    type: 'error',
                    message: res.message || 'Cập nhật vai trò thất bại.',
                });
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setNotification({
                type: 'error',
                message: axiosErr.response?.data?.message || 'Có lỗi xảy ra khi cập nhật vai trò.',
            });
        } finally {
            setIsUpdatingRole(false);
        }
    };

    // Export CSV
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
        link.setAttribute('download', `SmartLocker_KhachHang_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setNotification({
            type: 'success',
            message: `Đã xuất danh sách ${filteredUsers.length} khách hàng ra file CSV!`,
        });
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
                    <span className="text-blue-600 font-bold">
                        Quản lý khách hàng
                    </span>
                </nav>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                                Quản Lý Khách Hàng
                            </h1>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                                KHÁCH HÀNG & DƯ NỢ
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Theo dõi danh sách khách hàng thuê tủ, kiểm soát trạng thái hoạt động và xử lý dư nợ cước quá hạn.
                        </p>
                    </div>

                    {/* Action button on header */}
                    {isAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={handleBlockAllDebtors}
                                disabled={isBlockingDebtors || counters.debtorCount === 0}
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs shadow-rose-600/20 disabled:opacity-50"
                            >
                                <ShieldAlert className="w-4 h-4" />
                                <span>
                                    {isBlockingDebtors
                                        ? 'Đang chặn...'
                                        : `Chặn tài khoản nợ cước${counters.debtorCount > 0 ? ` (${counters.debtorCount})` : ''}`}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

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

            {/* Section 1: KPI Summary Cards Row */}
            <UserKpiSummaryCards users={users} isLoading={isLoading} />

            {/* Section 2: Filter Tabs & Search Controls */}
            <UserFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                roleFilter={roleFilter}
                onRoleFilterChange={setRoleFilter}
                debtFilter={debtFilter}
                onDebtFilterChange={setDebtFilter}
                totalCount={counters.total}
                activeCount={counters.active}
                suspendedCount={counters.suspended}
                pendingCount={counters.pending}
                onRefresh={() => loadUsers(true)}
                isRefreshing={isRefreshing}
                onExportCsv={handleExportCsv}
                isAdmin={isAdmin}
                showCreateStaff={false}
            />

            {/* Section 3: Workspace (Table & Detail Panel) */}
            <div className={`grid grid-cols-1 ${selectedUser ? 'lg:grid-cols-12' : ''} gap-5 items-start`}>
                {/* Table column */}
                <div className={selectedUser ? 'lg:col-span-7 xl:col-span-8' : 'w-full'}>
                    <UserTable
                        users={filteredUsers}
                        selectedUserId={selectedUser?.id}
                        onSelectUser={(u) => setSelectedUser(u)}
                        isLoading={isLoading}
                        isError={Boolean(fetchError)}
                        errorMessage={fetchError || undefined}
                        onRetry={() => loadUsers(false)}
                        onResetFilters={() => {
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

                {/* Right side: Detail & Control Panel */}
                {selectedUser && (
                    <div className="lg:col-span-5 xl:col-span-4 sticky top-6 animate-in fade-in slide-in-from-right-4 duration-200">
                        <UserDetailControlPanel
                            user={selectedUser}
                            onClose={() => setSelectedUser(null)}
                            isAdmin={isAdmin}
                            onTriggerLock={handleTriggerLock}
                            onTriggerActivate={handleTriggerActivate}
                            onSaveRole={handleSaveRoleFromPanel}
                            isUpdatingRole={isUpdatingRole}
                            onDebtUpdated={handleDebtUpdated}
                            onNavigateRbac={onNavigateRbac}
                        />
                    </div>
                )}
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
        </div>
    );
}
