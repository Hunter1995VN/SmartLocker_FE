/**
 * AD-FE-05: UC-A06 — Manage Internal Users
 * Định nghĩa hằng số, màu sắc, nhãn hiển thị và utilities cho quản lý tài khoản nội bộ và khách hàng.
 */

export interface RoleConfig {
    label: string;
    subLabel: string;
    badgeClass: string;
    pillClass: string;
    avatarBg: string;
    avatarText: string;
}

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
    ADMIN: {
        label: 'Super Admin',
        subLabel: 'Toàn quyền hệ thống',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
        pillClass: 'bg-purple-600 text-white',
        avatarBg: 'bg-purple-100',
        avatarText: 'text-purple-700',
    },
    STAFF: {
        label: 'Vận hành trạm (Staff)',
        subLabel: 'Vận hành & Hỗ trợ trạm',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
        pillClass: 'bg-blue-600 text-white',
        avatarBg: 'bg-blue-100',
        avatarText: 'text-blue-700',
    },
    TRAVELER: {
        label: 'Khách hàng (Traveler)',
        subLabel: 'Người dùng thuê tủ',
        badgeClass: 'bg-slate-50 text-slate-600 border-slate-200/80',
        pillClass: 'bg-slate-600 text-white',
        avatarBg: 'bg-slate-100',
        avatarText: 'text-slate-700',
    },
};

export interface StatusConfig {
    label: string;
    description: string;
    badgeClass: string;
    dotClass: string;
}

export const STATUS_CONFIGS: Record<string, StatusConfig> = {
    ACTIVE: {
        label: 'Đang hoạt động',
        description: 'Tài khoản hoạt động bình thường, có quyền truy cập đầy đủ theo vai trò.',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
    },
    SUSPENDED: {
        label: 'Tạm khóa đăng nhập',
        description: 'Tài khoản đã bị tạm khóa quyền đăng nhập vào toàn bộ hệ thống vì lý do an toàn / vi phạm.',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
    },
    PENDING_VERIFICATION: {
        label: 'Chờ xác nhận',
        description: 'Tài khoản đang chờ kích hoạt hoặc xác thực email.',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        dotClass: 'bg-sky-500',
    },
    DELETED: {
        label: 'Đã vô hiệu hóa',
        description: 'Tài khoản đã ngừng hoạt động trên hệ thống SmartLocker.',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
        dotClass: 'bg-slate-400',
    },
};

export interface UserAccountStatusInfo {
    key: 'SUSPENDED' | 'BOOKING_BLOCKED' | 'PENDING' | 'ACTIVE' | 'DELETED';
    label: string;
    subLabel: string;
    badgeClass: string;
    dotClass: string;
    description: string;
    loginAllowed: boolean;
    bookingAllowed: boolean;
}

/**
 * Phân định chính xác trạng thái tài khoản:
 * 1. SUSPENDED: Bị tạm khóa quyền đăng nhập hệ thống (không thể đăng nhập web/app).
 * 2. BOOKING_BLOCKED: Bị tạm khóa quyền đặt tủ mới (do nợ cước hoặc khóa thủ công), nhưng vẫn được đăng nhập để trả nợ.
 * 3. PENDING: Chờ kích hoạt / xác nhận email.
 * 4. ACTIVE: Hoạt động bình thường (được đăng nhập và đặt tủ đầy đủ).
 */
export function getUserAccountStatus(user?: {
    status?: string | null;
    role?: string | null;
    overdueDebt?: number | null;
    isBookingBlocked?: boolean | null;
}): UserAccountStatusInfo {
    if (!user) {
        return {
            key: 'ACTIVE',
            label: 'Chưa xác định',
            subLabel: 'Chưa xác định',
            badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
            dotClass: 'bg-slate-400',
            description: 'Thông tin tài khoản chưa được tải.',
            loginAllowed: true,
            bookingAllowed: true,
        };
    }

    const statusKey = (user.status || '').toUpperCase();
    const roleKey = (user.role || '').toUpperCase();
    const isTraveler = roleKey === 'TRAVELER';
    const debt = Number(user.overdueDebt || 0);
    const isBookingLocked = isTraveler && (debt > 0 || Boolean(user.isBookingBlocked));

    // 1. Tạm khóa đăng nhập vào hệ thống
    if (statusKey === 'SUSPENDED') {
        return {
            key: 'SUSPENDED',
            label: 'Tạm khóa đăng nhập',
            subLabel: 'Không thể đăng nhập',
            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
            dotClass: 'bg-rose-500',
            description: 'Tài khoản đã bị tạm khóa quyền đăng nhập vào toàn bộ hệ thống vì lý do bảo mật hoặc vi phạm nghiêm trọng.',
            loginAllowed: false,
            bookingAllowed: false,
        };
    }

    // 2. Đã vô hiệu hóa
    if (statusKey === 'DELETED') {
        return {
            key: 'DELETED',
            label: 'Đã vô hiệu hóa',
            subLabel: 'Ngừng hoạt động',
            badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
            dotClass: 'bg-slate-400',
            description: 'Tài khoản đã bị xóa hoặc ngừng hoạt động vĩnh viễn trên hệ thống.',
            loginAllowed: false,
            bookingAllowed: false,
        };
    }

    // 3. Tạm khóa đặt tủ (vẫn được đăng nhập để xem đơn và thanh toán online)
    if (isBookingLocked) {
        return {
            key: 'BOOKING_BLOCKED',
            label: 'Tạm khóa đặt tủ',
            subLabel: 'Vẫn được đăng nhập',
            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
            dotClass: 'bg-amber-500',
            description: `Tài khoản vẫn được phép đăng nhập hệ thống để xem đơn và thanh toán cước, nhưng bị tạm dừng quyền đặt tủ mới (do có khoản nợ cước ${debt > 0 ? debt.toLocaleString('vi-VN') + ' đ' : 'hoặc đã bị khóa quyền đặt tủ'}).`,
            loginAllowed: true,
            bookingAllowed: false,
        };
    }

    // 4. Chờ xác nhận
    if (statusKey === 'PENDING_VERIFICATION') {
        return {
            key: 'PENDING',
            label: 'Chờ xác nhận',
            subLabel: 'Chưa kích hoạt',
            badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
            dotClass: 'bg-sky-500',
            description: 'Tài khoản mới tạo, đang chờ kích hoạt hoặc xác thực email.',
            loginAllowed: false,
            bookingAllowed: false,
        };
    }

    // 5. Hoạt động bình thường
    return {
        key: 'ACTIVE',
        label: 'Hoạt động bình thường',
        subLabel: 'Đầy đủ quyền',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
        description: 'Tài khoản hoạt động bình thường, có đầy đủ quyền đăng nhập và sử dụng dịch vụ theo vai trò.',
        loginAllowed: true,
        bookingAllowed: true,
    };
}

export function getRoleConfig(role: string): RoleConfig {
    const key = (role || '').toUpperCase();
    return ROLE_CONFIGS[key] || {
        label: role || 'Không xác định',
        subLabel: 'Quyền chưa xác định',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        pillClass: 'bg-slate-600 text-white',
        avatarBg: 'bg-slate-100',
        avatarText: 'text-slate-700',
    };
}

export function getStatusConfig(status: string): StatusConfig {
    const key = (status || '').toUpperCase();
    return STATUS_CONFIGS[key] || {
        label: status || 'Không xác định',
        description: 'Trạng thái tài khoản chưa rõ ràng.',
        badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
        dotClass: 'bg-slate-400',
    };
}

export function formatDate(dateString?: string | null): string {
    if (!dateString) return 'Chưa ghi nhận';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'Chưa ghi nhận';
        return d.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateString;
    }
}

export function getInitials(name?: string | null): string {
    if (!name || !name.trim()) return 'NV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
