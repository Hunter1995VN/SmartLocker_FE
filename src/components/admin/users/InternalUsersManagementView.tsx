/**
 * AD-FE-05: UC-A06 — Manage Internal Users
 * Container View hoàn chỉnh cho chức năng Quản lý tài khoản nhân viên nội bộ & Phân quyền.
 * Tích hợp 100% với Backend ASP.NET Core API qua adminUserService.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle2,
    AlertCircle,
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
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL'); // 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'
    const [roleFilter, setRoleFilter] = useState<string>('ALL'); // 'ALL' | 'STAFF' | 'ADMIN' | 'TRAVELER'

    // 4. Feedback / Toast
    const [notification, setNotification] = useState<NotificationState | null>(null);

    // 5. Modal States
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [confirmActionType, setConfirmActionType] = useState<ActionType>('LOCK');
    const [confirmTargetUser, setConfirmTargetUser] = useState<UserAdminListItemDto | null>(null);
    const [confirmTargetRole, setConfirmTargetRole] = useState<UserRole | undefined>(undefined);
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [isCreatingStaff, setIsCreatingStaff] = useState(false);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    // Auto-dismiss notification after 4s
    useEffect(() => {
        if (!notification) return;
        const timer = setTimeout(() => setNotification(null), 4000);
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
                // Cập nhật selectedUser nếu đang chọn
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

    // 7. Filter & Search Logic
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            // Filter by status tab
            if (statusFilter !== 'ALL') {
                const uStatus = (u.status || '').toUpperCase();
                if (uStatus !== statusFilter) return false;
            }

            // Filter by role dropdown
            if (roleFilter !== 'ALL') {
                const uRole = (u.role || '').toUpperCase();
                if (uRole !== roleFilter) return false;
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
    }, [users, statusFilter, roleFilter, searchQuery]);

    // Counters for Filter Tabs
    const counters = useMemo(() => {
        const total = users.length;
        const active = users.filter((u) => (u.status || '').toUpperCase() === 'ACTIVE').length;
        const suspended = users.filter((u) => (u.status || '').toUpperCase() === 'SUSPENDED').length;
        const pending = users.filter((u) => (u.status || '').toUpperCase() === 'PENDING_VERIFICATION').length;
        return { total, active, suspended, pending };
    }, [users]);

    // 8. Handlers for User Actions (Lock, Activate, Change Role)
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
                message: 'Không có dữ liệu nhân sự để xuất CSV.',
            });
            return;
        }

        const headers = ['ID', 'Họ và tên', 'Email', 'Số điện thoại', 'Vai trò', 'Trạng thái', 'Ngày tạo'];
        const csvRows = [headers.join(',')];

        filteredUsers.forEach((u) => {
            const row = [
                `"${u.id}"`,
                `"${(u.fullName || '').replace(/"/g, '""')}"`,
                `"${(u.email || '').replace(/"/g, '""')}"`,
                `"${(u.phone || '').replace(/"/g, '""')}"`,
                `"${u.role || ''}"`,
                `"${u.status || ''}"`,
                `"${u.createdAt || ''}"`,
            ];
            csvRows.push(row.join(','));
        });

        // Add UTF-8 BOM so Excel opens Vietnamese characters correctly
        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `SmartLocker_Internal_Users_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setNotification({
            type: 'success',
            message: `Đã xuất danh sách ${filteredUsers.length} tài khoản nhân sự ra file CSV!`,
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
                    <span className="text-blue-600 font-bold">Quản lý tài khoản nội bộ (UC-A06)</span>
                </nav>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                Quản Lý Tài Khoản Nhân Viên & Phân Quyền
                            </h1>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                                RBAC v2.4
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                            Kiểm soát danh tính, phân quyền vai trò (RBAC), quản lý kích hoạt và khóa an toàn đối với đội ngũ vận hành trạm và kỹ thuật viên bảo trì toàn hệ thống SmartLocker.
                        </p>
                    </div>

                    {/* Action buttons on header */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs shadow-blue-600/20"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Tạo tài khoản Staff</span>
                            </button>
                        )}
                    </div>
                </div>
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
                onRoleFilterChange={setRoleFilter}
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
                            setSearchQuery('');
                            setStatusFilter('ALL');
                            setRoleFilter('ALL');
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
