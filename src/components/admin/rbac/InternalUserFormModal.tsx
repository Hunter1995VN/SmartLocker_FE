/**
 * AD-FE-05: UC-A05 — Quản lý tài khoản nội bộ & Phân quyền vai trò (Admin / Staff RBAC)
 * Modal Tạo mới hoặc Chỉnh sửa hồ sơ tài khoản nhân sự nội bộ (ADMIN / STAFF).
 */
import { useState, useEffect } from 'react';
import {
    X,
    UserPlus,
    UserCog,
    Shield,
    Eye,
    EyeOff,
    RefreshCw,
    Copy,
    Check,
    AlertCircle,
    CheckCircle2,
    Lock,
} from 'lucide-react';
import type {
    CreateStaffRequest,
    UpdateInternalUserRequest,
    UserAdminListItemDto,
    UserRole,
} from '../../../api/adminUserService';

interface InternalUserFormModalProps {
    isOpen: boolean;
    mode: 'CREATE' | 'EDIT';
    initialUser?: UserAdminListItemDto | null;
    isSelf?: boolean;
    onClose: () => void;
    onCreateSubmit: (data: CreateStaffRequest) => Promise<boolean>;
    onEditSubmit: (userId: string, data: UpdateInternalUserRequest) => Promise<boolean>;
    isSubmitting: boolean;
}

function generateStrongPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const specials = '@#$!%*?&';
    const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

    const seed = [
        pick(upper),
        pick(upper),
        pick(lower),
        pick(lower),
        pick(lower),
        pick(digits),
        pick(digits),
        pick(specials),
        pick(lower),
        pick(digits),
    ];

    for (let i = seed.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [seed[i], seed[j]] = [seed[j], seed[i]];
    }
    return `Slms@${seed.join('')}`;
}

export default function InternalUserFormModal({
    isOpen,
    mode,
    initialUser,
    isSelf = false,
    onClose,
    onCreateSubmit,
    onEditSubmit,
    isSubmitting,
}: InternalUserFormModalProps) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('STAFF');
    const [reason, setReason] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [copiedCredentials, setCopiedCredentials] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setFormError(null);
        setCopiedCredentials(false);
        if (mode === 'EDIT' && initialUser) {
            setFullName(initialUser.fullName || '');
            setEmail(initialUser.email || '');
            setPhone(initialUser.phone || '');
            const existingRole = (initialUser.role || 'STAFF').toUpperCase();
            setRole(existingRole === 'ADMIN' ? 'ADMIN' : 'STAFF');
            setPassword('');
            setReason('');
        } else {
            setFullName('');
            setEmail('');
            setPhone('');
            setPassword(generateStrongPassword());
            setRole('STAFF');
            setReason('');
            setShowPassword(true);
        }
    }, [isOpen, mode, initialUser]);

    if (!isOpen) return null;

    const handleCopyCredentials = async () => {
        const text = `Tài khoản Nội bộ SmartLocker (${role})\nHọ tên: ${fullName || '(Chưa nhập)'}\nEmail đăng nhập: ${email || '(Chưa nhập)'}\nMật khẩu khởi tạo: ${password}`;
        try {
            await navigator.clipboard.writeText(text);
            setCopiedCredentials(true);
            setTimeout(() => setCopiedCredentials(false), 2500);
        } catch {
            // Ignore clipboard errors in non-secure context
        }
    };

    const validateForm = (): string | null => {
        if (!fullName.trim() || fullName.trim().length < 2) {
            return 'Vui lòng nhập họ và tên hợp lệ (tối thiểu 2 ký tự).';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim() || !emailRegex.test(email.trim())) {
            return 'Vui lòng nhập địa chỉ Email công vụ hợp lệ.';
        }
        if (phone.trim() && !/^[0-9+\-\s]{8,15}$/.test(phone.trim())) {
            return 'Số điện thoại không đúng định dạng (8 - 15 chữ số).';
        }
        if (mode === 'CREATE' && password.length < 6) {
            return 'Mật khẩu khởi tạo phải có tối thiểu 6 ký tự.';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validateForm();
        if (err) {
            setFormError(err);
            return;
        }
        setFormError(null);

        if (mode === 'CREATE') {
            const ok = await onCreateSubmit({
                fullName: fullName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                password,
                role,
            });
            if (ok) onClose();
        } else if (initialUser) {
            const ok = await onEditSubmit(initialUser.id, {
                fullName: fullName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                role,
                reason: reason.trim() || undefined,
            });
            if (ok) onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
                                mode === 'CREATE' ? 'bg-blue-600' : 'bg-indigo-600'
                            }`}
                        >
                            {mode === 'CREATE' ? (
                                <UserPlus className="w-5 h-5" />
                            ) : (
                                <UserCog className="w-5 h-5" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold text-slate-900">
                                {mode === 'CREATE'
                                    ? 'Tạo Tài Khoản Nhân Sự Nội Bộ Mới (UC-A05)'
                                    : 'Cập Nhật Hồ Sơ & Vai Trò Nhân Sự Nội Bộ'}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                {mode === 'CREATE'
                                    ? 'Cấp tài khoản truy cập cổng vận hành Admin / Staff theo mô hình RBAC'
                                    : `Đang chỉnh sửa tài khoản: ${initialUser?.email || ''}`}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
                    {formError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{formError}</span>
                        </div>
                    )}

                    {/* FullName & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Họ và tên nhân sự <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                disabled={isSubmitting}
                                placeholder="VD: Nguyễn Văn Quản Trị"
                                className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Số điện thoại liên hệ
                            </label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={isSubmitting}
                                placeholder="VD: 0901234567"
                                className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Email đăng nhập nội bộ <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="VD: staff.station01@smartlocker.vn"
                            className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                        />
                    </div>

                    {/* Password field (CREATE mode only) */}
                    {mode === 'CREATE' && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                                    <span>
                                        Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                                    </span>
                                </label>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setPassword(generateStrongPassword())}
                                        disabled={isSubmitting}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Tạo mật khẩu mạnh</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCopyCredentials}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer"
                                    >
                                        {copiedCredentials ? (
                                            <>
                                                <Check className="w-3 h-3 text-emerald-600" />
                                                <span className="text-emerald-700">Đã sao chép</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                <span>Copy thông tin</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isSubmitting}
                                    placeholder="Nhập mật khẩu tối thiểu 6 ký tự..."
                                    className="w-full pl-3.5 pr-10 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Mật khẩu được băm bảo mật chuẩn BCrypt trước khi lưu trữ. Hãy sao chép thông tin đăng nhập để bàn giao cho nhân sự.
                            </p>
                        </div>
                    )}

                    {/* RBAC Role Selector */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                            Phân quyền vai trò hệ thống (RBAC Role) <span className="text-rose-500">*</span>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                disabled={isSubmitting || (mode === 'EDIT' && isSelf)}
                                onClick={() => setRole('STAFF')}
                                className={`p-3 rounded-xl border text-left transition cursor-pointer disabled:opacity-60 ${
                                    role === 'STAFF'
                                        ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/15'
                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-extrabold text-teal-800">
                                        STAFF · Vận hành trạm
                                    </span>
                                    {role === 'STAFF' && (
                                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    Giám sát lưới tủ, xử lý sự cố hiện trường, lập biên bản 72h & mở khóa cứu hộ theo quy trình.
                                </p>
                            </button>

                            <button
                                type="button"
                                disabled={isSubmitting || (mode === 'EDIT' && isSelf)}
                                onClick={() => setRole('ADMIN')}
                                className={`p-3 rounded-xl border text-left transition cursor-pointer disabled:opacity-60 ${
                                    role === 'ADMIN'
                                        ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/15'
                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-extrabold text-purple-800 flex items-center gap-1">
                                        <Shield className="w-3.5 h-3.5" />
                                        <span>ADMIN · Quản trị cấp cao</span>
                                    </span>
                                    {role === 'ADMIN' && (
                                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    Toàn quyền cấu hình giá/phạt, phân quyền RBAC, duyệt 4 mắt tài sản 72h, đối soát PayOS & Audit.
                                </p>
                            </button>
                        </div>

                        {mode === 'EDIT' && isSelf && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-medium">
                                Đang chỉnh sửa tài khoản của chính bạn: Hệ thống khóa thay đổi vai trò để tránh tự thu hồi quyền Super Admin.
                            </p>
                        )}
                    </div>

                    {/* Audit Reason (EDIT mode) */}
                    {mode === 'EDIT' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Lý do cập nhật hồ sơ / điều chuyển (lưu vào Audit Log)
                            </label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={isSubmitting}
                                placeholder="VD: Điều chuyển phụ trách cụm trạm Quận 1 / Cập nhật SĐT công vụ..."
                                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-700"
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-600/20 transition cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang xử lý...</span>
                                </>
                            ) : mode === 'CREATE' ? (
                                <>
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>Tạo tài khoản {role}</span>
                                </>
                            ) : (
                                <>
                                    <UserCog className="w-3.5 h-3.5" />
                                    <span>Lưu cập nhật hồ sơ</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
