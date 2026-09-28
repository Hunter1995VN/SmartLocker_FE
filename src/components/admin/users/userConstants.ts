/**
 * AD-FE-05: UC-A06 — Manage Internal Users
 * Định nghĩa hằng số, màu sắc, nhãn hiển thị và utilities cho quản lý tài khoản nội bộ.
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
        subLabel: 'Người dùng vãng lai',
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
        label: 'Bị tạm khóa',
        description: 'Tài khoản đã bị tạm dừng quyền truy cập vào hệ thống vì lý do an toàn.',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
    },
    PENDING_VERIFICATION: {
        label: 'Chờ xác nhận',
        description: 'Tài khoản đang chờ quản trị viên kích hoạt hoặc xác thực email.',
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
