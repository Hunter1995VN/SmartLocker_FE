import React, { useState, useEffect, useRef } from 'react';
import {
    User, Phone, Shield, Key, AlertTriangle, CheckCircle2,
    Clock, ArrowLeft, Lock, Save,
    RefreshCw, AlertCircle, Calendar,
    ChevronRight, Camera, Trash2
} from 'lucide-react';
import CustomerHeader from '../components/layout/CustomerHeader';
import profileService from '../api/profileService';
import type { UserProfileDto, UserOverdueDebtResponse } from '../api/profileService';
import { getApiErrorMessage, resolveAssetUrl } from '../api/client';
import { useT } from '../i18n';

export const PROFILE_UPDATED_EVENT = 'smartlocker:profile-updated';
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Ghi lại hồ sơ mới vào localStorage và báo cho header/dashboard cập nhật ngay. */
function syncStoredUser(patch: { fullName?: string; phone?: string; avatarUrl?: string | null }) {
    try {
        const stored = localStorage.getItem('smartlocker_user');
        if (!stored) return;
        const parsed = JSON.parse(stored);
        Object.assign(parsed, patch);
        if (patch.avatarUrl === null) delete parsed.avatarUrl;
        localStorage.setItem('smartlocker_user', JSON.stringify(parsed));
        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    } catch { /* localStorage không khả dụng: bỏ qua, dữ liệu vẫn nằm trên máy chủ */ }
}

interface ProfilePageProps {
    onLogout: () => void;
    onNavigate: (page: string, data?: any) => void;
}

const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('vi-VN').format(val || 0);
};

const formatDate = (isoString?: string): string => {
    if (!isoString) return '--';
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return isoString;
    }
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ onLogout, onNavigate }) => {
    const t = useT();
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // Profile State
    const [profile, setProfile] = useState<UserProfileDto | null>(null);
    const [fullName, setFullName] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);
    const [profileSuccessMsg, setProfileSuccessMsg] = useState<string>('');
    const [profileErrorMsg, setProfileErrorMsg] = useState<string>('');

    // Change Password State
    const [currentPassword, setCurrentPassword] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [changingPassword, setChangingPassword] = useState<boolean>(false);
    const [pwdSuccessMsg, setPwdSuccessMsg] = useState<string>('');
    const [pwdErrorMsg, setPwdErrorMsg] = useState<string>('');

    // Optional debt summary (for blocking warning pill linking to /overdue-debt)
    const [debtData, setDebtData] = useState<UserOverdueDebtResponse | null>(null);

    // Fetch Profile Data
    const loadData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        setProfileErrorMsg('');

        try {
            const [profileRes, debtRes] = await Promise.all([
                profileService.getProfile(),
                profileService.getOverdueDebt()
            ]);

            if (profileRes.success && profileRes.data) {
                setProfile(profileRes.data);
                setFullName(profileRes.data.fullName || '');
                setPhone(profileRes.data.phone || '');

                // Cập nhật lại localStorage để header/dashboard đồng bộ
                syncStoredUser({
                    fullName: profileRes.data.fullName,
                    phone: profileRes.data.phone,
                    avatarUrl: profileRes.data.avatarUrl ?? null,
                });
            }

            if (debtRes.success && debtRes.data) {
                setDebtData(debtRes.data);
            }
        } catch (err: any) {
            console.error('Lỗi tải dữ liệu profile:', err);
            setProfileErrorMsg(t('Không thể tải thông tin từ máy chủ. Vui lòng thử lại sau.'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Ảnh đại diện: chọn file từ máy → kiểm tra → tải lên → lưu → cập nhật mọi nơi hiển thị
    const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // cho phép chọn lại cùng một file
        if (!file) return;
        setProfileSuccessMsg('');
        setProfileErrorMsg('');
        if (!AVATAR_TYPES.includes(file.type)) {
            setProfileErrorMsg(t('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.'));
            return;
        }
        if (file.size > AVATAR_MAX_BYTES) {
            setProfileErrorMsg(t('Ảnh quá lớn. Vui lòng chọn ảnh dưới 2 MB.'));
            return;
        }
        setUploadingAvatar(true);
        try {
            const res = await profileService.uploadAvatar(file);
            if (res.success && res.data) {
                setProfile(res.data);
                syncStoredUser({ avatarUrl: res.data.avatarUrl ?? null });
                setProfileSuccessMsg(t('Đã cập nhật ảnh đại diện.'));
                setTimeout(() => setProfileSuccessMsg(''), 4000);
            } else {
                setProfileErrorMsg(res.message || t('Không tải được ảnh lên.'));
            }
        } catch (err) {
            setProfileErrorMsg(getApiErrorMessage(err, t('Không tải được ảnh lên. Vui lòng thử lại.')));
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleRemoveAvatar = async () => {
        setProfileSuccessMsg('');
        setProfileErrorMsg('');
        setUploadingAvatar(true);
        try {
            const res = await profileService.deleteAvatar();
            if (res.success && res.data) {
                setProfile(res.data);
                syncStoredUser({ avatarUrl: null });
                setProfileSuccessMsg(t('Đã xóa ảnh đại diện.'));
                setTimeout(() => setProfileSuccessMsg(''), 4000);
            } else {
                setProfileErrorMsg(res.message || t('Không xóa được ảnh.'));
            }
        } catch (err) {
            setProfileErrorMsg(getApiErrorMessage(err, t('Không xóa được ảnh. Vui lòng thử lại.')));
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Handle Profile Update
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileSuccessMsg('');
        setProfileErrorMsg('');

        if (!fullName.trim() || fullName.trim().length < 2) {
            setProfileErrorMsg(t('Họ và tên phải có ít nhất 2 ký tự.'));
            return;
        }

        if (!phone.trim()) {
            setProfileErrorMsg(t('Vui lòng nhập số điện thoại.'));
            return;
        }

        setUpdatingProfile(true);
        try {
            // Không gửi avatarUrl: ảnh đại diện được đổi riêng bằng nút tải ảnh lên.
            const res = await profileService.updateProfile({
                fullName: fullName.trim(),
                phone: phone.trim(),
            });

            if (res.success && res.data) {
                setProfile(res.data);
                syncStoredUser({ fullName: res.data.fullName, phone: res.data.phone });
                setProfileSuccessMsg(t('Cập nhật thông tin cá nhân thành công!'));
                setTimeout(() => setProfileSuccessMsg(''), 4000);
            } else {
                setProfileErrorMsg(res.message || t('Cập nhật thất bại.'));
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || t('Lỗi kết nối khi cập nhật thông tin.');
            setProfileErrorMsg(msg);
        } finally {
            setUpdatingProfile(false);
        }
    };

    // Handle Change Password
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdSuccessMsg('');
        setPwdErrorMsg('');

        if (profile?.hasPassword && !currentPassword) {
            setPwdErrorMsg(t('Vui lòng nhập mật khẩu hiện tại.'));
            return;
        }

        if (newPassword.length < 6) {
            setPwdErrorMsg(t('Mật khẩu mới phải có tối thiểu 6 ký tự.'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setPwdErrorMsg(t('Mật khẩu xác nhận không khớp.'));
            return;
        }

        setChangingPassword(true);
        try {
            const res = await profileService.changePassword({
                currentPassword: currentPassword || undefined,
                newPassword,
                confirmPassword
            });

            if (res.success) {
                setPwdSuccessMsg(res.message || t('Đổi mật khẩu thành công!'));
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => setPwdSuccessMsg(''), 5000);
            } else {
                setPwdErrorMsg(res.message || t('Đổi mật khẩu thất bại.'));
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || t('Lỗi khi đổi mật khẩu.');
            setPwdErrorMsg(msg);
        } finally {
            setChangingPassword(false);
        }
    };

    const hasOverdueDebt = (debtData?.totalOverdueDebt || 0) > 0 || (debtData?.overdueBookings?.length || 0) > 0;

    return (
        <div className="min-h-screen bg-surface-bright flex flex-col font-sans">
            {/* Top Navigation */}
            <CustomerHeader currentPage="profile" onLogout={onLogout} onNavigate={onNavigate} />

            {/* Main Content */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className="link-target inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-2 transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>{t('Quay lại Trang tổng quan')}</span>
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                            {t('Thông tin cá nhân & Bảo mật')}
                        </h1>
                        <p className="text-sm text-on-surface-muted mt-1">
                            {t('Xem và cập nhật thông tin hồ sơ, ảnh đại diện và bảo mật tài khoản')}
                        </p>
                    </div>

                    {/* Refresh button */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => loadData(true)}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-on-surface bg-white border border-outline-soft hover:bg-surface-container-low hover:border-[#b8ccfa] transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                            <span>{refreshing ? t('Đang cập nhật...') : t('Làm mới')}</span>
                        </button>
                    </div>
                </div>

                {/* Overdue Debt Global Alert Pill if user has unpaid debt */}
                {hasOverdueDebt && (
                    <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-rose-900">
                                    {t('Tài khoản có dư nợ quá hạn:')} {formatCurrency(debtData?.totalOverdueDebt || 0)} {t('VNĐ')}
                                </h2>
                                <p className="text-sm text-rose-700 mt-0.5">
                                    {t('Theo quy tắc')} <strong>BR-P08</strong>{t(', bạn cần thanh toán toàn bộ nợ quá hạn để mở khóa tính năng đặt tủ mới.')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onNavigate('overdue-debt')}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                            <span>{t('Xem & Thanh toán')}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                        <div className="bg-white rounded-3xl h-64 border border-surface-container"></div>
                        <div className="md:col-span-2 bg-white rounded-3xl h-96 border border-surface-container"></div>
                    </div>
                )}

                {/* THÔNG TIN CÁ NHÂN & BẢO MẬT */}
                {!loading && profile && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Card: Profile Overview */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl p-6 border border-surface-container shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                                <div className="flex flex-col items-center text-center">
 <div className="w-24 h-24 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-3xl shadow-md border-4 border-white mb-4 overflow-hidden">
                                        {profile.avatarUrl ? (
                                            <img
                                                src={resolveAssetUrl(profile.avatarUrl)}
                                                alt={profile.fullName}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            (profile.fullName || 'U').charAt(0).toUpperCase()
                                        )}
                                    </div>

                                    <h2 className="text-lg font-bold text-on-surface">
                                        {profile.fullName || t('Khách hàng')}
                                    </h2>
                                    <p className="text-sm text-on-surface-muted mt-0.5">{profile.email}</p>

                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                            {profile.role === 'TRAVELER' ? t('Khách hàng SmartLocker') : profile.role}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                            profile.status === 'ACTIVE'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                        }`}>
                                            {profile.status === 'ACTIVE' ? t('Đang hoạt động') : profile.status}
                                        </span>
                                    </div>
                                </div>

                                <hr className="my-5 border-surface-container-low" />

                                <div className="space-y-3.5 text-xs text-on-surface-variant">
                                    <div className="flex items-center justify-between">
                                        <span className="text-on-surface-muted flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5" /> {t('Số điện thoại:')}
                                        </span>
                                        <span className="font-semibold text-on-surface">{profile.phone || '--'}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-on-surface-muted flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" /> {t('Ngày đăng ký:')}
                                        </span>
                                        <span className="font-semibold text-on-surface">{formatDate(profile.createdAt)}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-on-surface-muted flex items-center gap-1.5">
                                            <Shield className="w-3.5 h-3.5" /> {t('Liên kết Google:')}
                                        </span>
                                        <span className={`font-semibold ${profile.googleLinked ? 'text-emerald-600' : 'text-slate-500'}`}>
                                            {profile.googleLinked ? t('Đã liên kết') : t('Chưa liên kết')}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-on-surface-muted flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" /> {t('Lượt đặt tủ:')}
                                        </span>
                                        <span className="font-semibold text-on-surface">{profile.totalBookings} {t('đơn')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Area: Forms */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Form 1: Cập nhật thông tin */}
                            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-on-surface">{t('Cập nhật thông tin cá nhân')}</h2>
                                        <p className="text-sm text-on-surface-muted">{t('Thay đổi họ và tên, số điện thoại hoặc ảnh đại diện')}</p>
                                    </div>
                                </div>

                                {profileSuccessMsg && (
                                    <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>{profileSuccessMsg}</span>
                                    </div>
                                )}

                                {profileErrorMsg && (
                                    <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                        <span>{profileErrorMsg}</span>
                                    </div>
                                )}

                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-on-surface mb-1.5">
                                            {t('Họ và tên')} <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder={t('Nguyễn Văn A')}
                                            aria-label={t('Họ và tên')}
                                            className="w-full px-4 py-2.5 rounded-xl text-xs border border-outline-soft focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-on-surface"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-on-surface mb-1.5">
                                                {t('Email đăng ký (Cố định)')}
                                            </label>
                                            <input
                                                type="email"
                                                value={profile.email}
                                                aria-label={t('Email đăng ký (cố định)')}
                                                disabled
                                                className="w-full px-4 py-2.5 rounded-xl text-xs border border-surface-container bg-surface-bright text-on-surface-muted cursor-not-allowed"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-on-surface mb-1.5">
                                                {t('Số điện thoại liên hệ')} <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="0901234567"
                                                aria-label={t('Số điện thoại liên hệ')}
                                                className="w-full px-4 py-2.5 rounded-xl text-xs border border-outline-soft focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-on-surface"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-on-surface mb-1.5">
                                            {t('Ảnh đại diện')}
                                        </label>
                                        <input
                                            ref={avatarInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handleAvatarFile}
                                            className="hidden"
                                            aria-label={t('Chọn ảnh đại diện')}
                                        />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => avatarInputRef.current?.click()}
                                                disabled={uploadingAvatar}
                                                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-outline-soft bg-white hover:bg-surface-container-low text-on-surface flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                <Camera className="w-3.5 h-3.5" />
                                                {uploadingAvatar ? t('Đang tải ảnh lên...') : t('Chọn ảnh từ máy')}
                                            </button>
                                            {profile.avatarUrl && (
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveAvatar}
                                                    disabled={uploadingAvatar}
                                                    className="px-4 py-2.5 rounded-xl text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    {t('Xóa ảnh')}
                                                </button>
                                            )}
                                            <span className="text-xs text-on-surface-muted">{t('JPEG, PNG hoặc WebP, tối đa 2 MB. Ảnh được lưu ngay khi tải lên.')}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={updatingProfile}
                                            className="px-6 py-2.5 bg-primary-container hover:bg-[#003896] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/15 disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            <span>{updatingProfile ? t('Đang lưu...') : t('Lưu thay đổi')}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Form 2: Đổi mật khẩu */}
                            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-on-surface">
                                            {profile.hasPassword ? t('Đổi mật khẩu') : t('Thiết lập mật khẩu')}
                                        </h2>
                                        <p className="text-sm text-on-surface-muted">
                                            {profile.hasPassword
                                                ? t('Cập nhật mật khẩu định kỳ để bảo vệ tài khoản an toàn')
                                                : t('Tài khoản đăng nhập bằng Google. Bạn có thể đặt mật khẩu để đăng nhập trực tiếp.')}
                                        </p>
                                    </div>
                                </div>

                                {pwdSuccessMsg && (
                                    <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>{pwdSuccessMsg}</span>
                                    </div>
                                )}

                                {pwdErrorMsg && (
                                    <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                        <span>{pwdErrorMsg}</span>
                                    </div>
                                )}

                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    {profile.hasPassword && (
                                        <div>
                                            <label className="block text-xs font-bold text-on-surface mb-1.5">
                                                {t('Mật khẩu hiện tại')} <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="••••••••"
                                                aria-label={t('Mật khẩu hiện tại')}
                                                className="w-full px-4 py-2.5 rounded-xl text-xs border border-outline-soft focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-on-surface"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-on-surface mb-1.5">
                                                {t('Mật khẩu mới')} <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder={t('Tối thiểu 6 ký tự')}
                                                aria-label={t('Mật khẩu mới')}
                                                className="w-full px-4 py-2.5 rounded-xl text-xs border border-outline-soft focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-on-surface"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-on-surface mb-1.5">
                                                {t('Xác nhận mật khẩu mới')} <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder={t('Nhập lại mật khẩu mới')}
                                                aria-label={t('Xác nhận mật khẩu mới')}
                                                className="w-full px-4 py-2.5 rounded-xl text-xs border border-outline-soft focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-on-surface"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={changingPassword}
                                            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Key className="w-3.5 h-3.5" />
                                            <span>{changingPassword ? t('Đang cập nhật...') : t('Cập nhật mật khẩu')}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default ProfilePage;
