import React, { useState, useEffect } from 'react';
import {
    User, Phone, Shield, Key, AlertTriangle, CheckCircle2,
    Clock, CreditCard, ArrowLeft, Lock, Save,
    RefreshCw, AlertCircle, Calendar, DollarSign, Building,
    ChevronRight
} from 'lucide-react';
import CustomerHeader from '../components/layout/CustomerHeader';
import profileService from '../api/profileService';
import type { UserProfileDto, UserOverdueDebtResponse } from '../api/profileService';

interface ProfilePageProps {
    onLogout: () => void;
    onNavigate: (page: string, data?: any) => void;
    initialTab?: 'info' | 'debt';
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

export const ProfilePage: React.FC<ProfilePageProps> = ({ onLogout, onNavigate, initialTab = 'info' }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'debt'>(initialTab);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // Profile State
    const [profile, setProfile] = useState<UserProfileDto | null>(null);
    const [fullName, setFullName] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [avatarUrl, setAvatarUrl] = useState<string>('');
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

    // Overdue Debt State
    const [debtData, setDebtData] = useState<UserOverdueDebtResponse | null>(null);
    const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
    const [debtActionMsg, setDebtActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch Profile & Debt Data
    const loadData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        setProfileErrorMsg('');
        setDebtActionMsg(null);

        try {
            const [profileRes, debtRes] = await Promise.all([
                profileService.getProfile(),
                profileService.getOverdueDebt()
            ]);

            if (profileRes.success && profileRes.data) {
                setProfile(profileRes.data);
                setFullName(profileRes.data.fullName || '');
                setPhone(profileRes.data.phone || '');
                setAvatarUrl(profileRes.data.avatarUrl || '');

                // Cập nhật lại localStorage để header đồng bộ
                const stored = localStorage.getItem('smartlocker_user');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        parsed.fullName = profileRes.data.fullName;
                        parsed.phone = profileRes.data.phone;
                        parsed.avatarUrl = profileRes.data.avatarUrl;
                        localStorage.setItem('smartlocker_user', JSON.stringify(parsed));
                    } catch {}
                }
            }

            if (debtRes.success && debtRes.data) {
                setDebtData(debtRes.data);
            }
        } catch (err: any) {
            console.error('Lỗi tải dữ liệu profile:', err);
            setProfileErrorMsg('Không thể tải thông tin từ máy chủ. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Handle Profile Update
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileSuccessMsg('');
        setProfileErrorMsg('');

        if (!fullName.trim() || fullName.trim().length < 2) {
            setProfileErrorMsg('Họ và tên phải có ít nhất 2 ký tự.');
            return;
        }

        if (!phone.trim()) {
            setProfileErrorMsg('Vui lòng nhập số điện thoại.');
            return;
        }

        setUpdatingProfile(true);
        try {
            const res = await profileService.updateProfile({
                fullName: fullName.trim(),
                phone: phone.trim(),
                avatarUrl: avatarUrl.trim() || undefined
            });

            if (res.success && res.data) {
                setProfile(res.data);
                setProfileSuccessMsg('Cập nhật thông tin cá nhân thành công!');
                setTimeout(() => setProfileSuccessMsg(''), 4000);
            } else {
                setProfileErrorMsg(res.message || 'Cập nhật thất bại.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Lỗi kết nối khi cập nhật thông tin.';
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
            setPwdErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
            return;
        }

        if (newPassword.length < 6) {
            setPwdErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPwdErrorMsg('Mật khẩu xác nhận không khớp.');
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
                setPwdSuccessMsg(res.message || 'Đổi mật khẩu thành công!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => setPwdSuccessMsg(''), 5000);
            } else {
                setPwdErrorMsg(res.message || 'Đổi mật khẩu thất bại.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Lỗi khi đổi mật khẩu.';
            setPwdErrorMsg(msg);
        } finally {
            setChangingPassword(false);
        }
    };

    // Handle Pay Overdue Fee
    const handlePayOverdue = async (bookingId: string) => {
        setPayingBookingId(bookingId);
        setDebtActionMsg(null);

        try {
            const res = await profileService.payOverdueDebt(bookingId);
            if (res && res.success && res.data?.paymentUrl) {
                setDebtActionMsg({
                    type: 'success',
                    text: 'Đang chuyển hướng tới cổng thanh toán PayOS...'
                });
                // Redirect user to PayOS Checkout
                window.location.href = res.data.paymentUrl;
            } else {
                setDebtActionMsg({
                    type: 'error',
                    text: res?.message || 'Không thể tạo liên kết thanh toán. Vui lòng thử lại.'
                });
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Lỗi khi xử lý thanh toán quá hạn.';
            setDebtActionMsg({
                type: 'error',
                text: msg
            });
        } finally {
            setPayingBookingId(null);
        }
    };

    const hasOverdueDebt = (debtData?.totalOverdueDebt || 0) > 0 || (debtData?.overdueBookings?.length || 0) > 0;

    return (
        <div className="min-h-screen bg-[#f8faff] flex flex-col font-sans">
            {/* Top Navigation */}
            <CustomerHeader onLogout={onLogout} onNavigate={onNavigate} />

            {/* Main Content */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#004ac6] hover:underline mb-2 transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Quay lại Trang tổng quan</span>
                        </button>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                            Quản lý tài khoản & Dư nợ
                        </h1>
                        <p className="text-sm text-[#737686] mt-1">
                            Xem thông tin cá nhân, cập nhật bảo mật và tra cứu chi tiết dư nợ quá hạn
                        </p>
                    </div>

                    {/* Refresh button */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => loadData(true)}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#0b1c30] bg-white border border-[#dce3f1] hover:bg-[#f0f4ff] hover:border-[#b8ccfa] transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#004ac6]' : ''}`} />
                            <span>{refreshing ? 'Đang cập nhật...' : 'Làm mới'}</span>
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
                                <h4 className="text-sm font-bold text-rose-900">
                                    Tài khoản có dư nợ quá hạn: {formatCurrency(debtData?.totalOverdueDebt || 0)} VNĐ
                                </h4>
                                <p className="text-xs text-rose-700 mt-0.5">
                                    Theo quy tắc <strong>BR-P08</strong>, bạn cần thanh toán toàn bộ nợ quá hạn để mở khóa tính năng đặt tủ mới.
                                </p>
                            </div>
                        </div>
                        {activeTab !== 'debt' && (
                            <button
                                onClick={() => setActiveTab('debt')}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                                <span>Xem & Thanh toán</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Tabs Switch */}
                <div className="flex border-b border-[#e1e7f5] mb-8 gap-2">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                            activeTab === 'info'
                                ? 'border-[#004ac6] text-[#004ac6]'
                                : 'border-transparent text-[#737686] hover:text-[#0b1c30]'
                        }`}
                    >
                        <User className="w-4 h-4" />
                        <span>Thông tin cá nhân & Bảo mật</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('debt')}
                        className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer relative ${
                            activeTab === 'debt'
                                ? 'border-[#004ac6] text-[#004ac6]'
                                : 'border-transparent text-[#737686] hover:text-[#0b1c30]'
                        }`}
                    >
                        <DollarSign className="w-4 h-4" />
                        <span>Tra cứu dư nợ quá hạn</span>
                        {hasOverdueDebt && (
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                        )}
                    </button>
                </div>

                {/* Loading Skeleton */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                        <div className="bg-white rounded-3xl h-64 border border-[#e5eeff]"></div>
                        <div className="md:col-span-2 bg-white rounded-3xl h-96 border border-[#e5eeff]"></div>
                    </div>
                )}

                {/* TAB 1: THÔNG TIN CÁ NHÂN & BẢO MẬT */}
                {!loading && activeTab === 'info' && profile && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Card: Profile Overview */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl p-6 border border-[#e5eeff] shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#004ac6] to-[#3b82f6] text-white flex items-center justify-center font-bold text-3xl shadow-md border-4 border-white mb-4 overflow-hidden">
                                        {profile.avatarUrl ? (
                                            <img
                                                src={profile.avatarUrl}
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

                                    <h3 className="text-lg font-bold text-[#0b1c30]">
                                        {profile.fullName || 'Khách hàng'}
                                    </h3>
                                    <p className="text-xs text-[#737686] mt-0.5">{profile.email}</p>

                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                            {profile.role === 'TRAVELER' ? 'Khách hàng SmartLocker' : profile.role}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                            profile.status === 'ACTIVE'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                        }`}>
                                            {profile.status === 'ACTIVE' ? 'Đang hoạt động' : profile.status}
                                        </span>
                                    </div>
                                </div>

                                <hr className="my-5 border-[#f0f4ff]" />

                                <div className="space-y-3.5 text-xs text-[#434655]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#737686] flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5" /> Số điện thoại:
                                        </span>
                                        <span className="font-semibold text-[#0b1c30]">{profile.phone || '--'}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[#737686] flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" /> Ngày đăng ký:
                                        </span>
                                        <span className="font-semibold text-[#0b1c30]">{formatDate(profile.createdAt)}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[#737686] flex items-center gap-1.5">
                                            <Shield className="w-3.5 h-3.5" /> Liên kết Google:
                                        </span>
                                        <span className={`font-semibold ${profile.googleLinked ? 'text-emerald-600' : 'text-slate-500'}`}>
                                            {profile.googleLinked ? 'Đã liên kết' : 'Chưa liên kết'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[#737686] flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" /> Lượt đặt tủ:
                                        </span>
                                        <span className="font-semibold text-[#0b1c30]">{profile.totalBookings} đơn</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Area: Forms */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Form 1: Cập nhật thông tin */}
                            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e5eeff] shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#004ac6] flex items-center justify-center">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[#0b1c30]">Cập nhật thông tin cá nhân</h3>
                                        <p className="text-xs text-[#737686]">Thay đổi họ và tên, số điện thoại hoặc ảnh đại diện</p>
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
                                        <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                                            Họ và tên <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Nguyễn Văn A"
                                            className="w-full px-4 py-2.5 rounded-xl text-xs border border-[#dce3f1] focus:outline-hidden focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/15 transition-all text-[#0b1c30]"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                                                Email đăng ký (Cố định)
                                            </label>
                                            <input
                                                type="email"
                                                value={profile.email}
                                                disabled
                                                className="w-full px-4 py-2.5 rounded-xl text-xs border border-[#e5eeff] bg-[#f8faff] text-[#737686] cursor-not-allowed"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                                                Số điện thoại liên hệ <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="0901234567"
                                                className="w-full px-4 py-2.5 rounded-xl text-xs border border-[#dce3f1] focus:outline-hidden focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/15 transition-all text-[#0b1c30]"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                                            Đường dẫn ảnh đại diện (Avatar URL)
                                        </label>
                                        <input
                                            type="url"
                                            value={avatarUrl}
                                            onChange={(e) => setAvatarUrl(e.target.value)}
                                            placeholder="https://example.com/avatar.jpg"
                                            className="w-full px-4 py-2.5 rounded-xl text-xs border border-[#dce3f1] focus:outline-hidden focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/15 transition-all text-[#0b1c30]"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={updatingProfile}
                                            className="px-6 py-2.5 bg-[#004ac6] hover:bg-[#003896] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/15 disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            <span>{updatingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Form 2: Đổi mật khẩu */}
                            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e5eeff] shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[#0b1c30]">
                                            {profile.hasPassword ? 'Đổi mật khẩu' : 'Thiết lập mật khẩu'}
                                        </h3>
                                        <p className="text-xs text-[#737686]">
                                            {profile.hasPassword
                                                ? 'Cập nhật mật khẩu định kỳ để bảo vệ tài khoản an toàn'
                                                : 'Tài khoản đăng nhập bằng Google. Bạn có thể đặt mật khẩu để đăng nhập trực tiếp.'}
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
                                            <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                                                Mật khẩu hiện tại <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full px-4 py-2.5 rounded-xl text-xs border border-[#dce3f1] focus:outline-hidden focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/15 transition-all text-[#0b1c30]"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                                                Mật khẩu mới <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Tối thiểu 6 ký tự"
                                                className="w-full px-4 py-2.5 rounded-xl text-xs border border-[#dce3f1] focus:outline-hidden focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/15 transition-all text-[#0b1c30]"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                                                Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Nhập lại mật khẩu mới"
                                                className="w-full px-4 py-2.5 rounded-xl text-xs border border-[#dce3f1] focus:outline-hidden focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/15 transition-all text-[#0b1c30]"
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
                                            <span>{changingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: TRA CỨU DƯ NỢ QUÁ HẠN */}
                {!loading && activeTab === 'debt' && debtData && (
                    <div className="space-y-8">
                        {/* Financial Standing Banner */}
                        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xs relative overflow-hidden ${
                            hasOverdueDebt
                                ? 'bg-gradient-to-r from-rose-50 to-orange-50 border-rose-200'
                                : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                        }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                                        hasOverdueDebt ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    }`}>
                                        {hasOverdueDebt ? <AlertTriangle className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
                                    </div>

                                    <div>
                                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                            hasOverdueDebt
                                                ? 'bg-rose-100/70 text-rose-800 border-rose-300'
                                                : 'bg-emerald-100/70 text-emerald-800 border-emerald-300'
                                        }`}>
                                            {hasOverdueDebt ? 'Tài khoản có dư nợ' : 'Tài khoản sạch nợ'}
                                        </span>

                                        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0b1c30] mt-1.5">
                                            {hasOverdueDebt ? 'Phát sinh dư nợ quá hạn chưa thanh toán' : 'Không có bất kỳ dư nợ quá hạn nào'}
                                        </h2>

                                        <p className="text-xs sm:text-sm text-[#434655] mt-1 max-w-2xl leading-relaxed">
                                            {debtData.statusMessage}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-left sm:text-right shrink-0 bg-white/70 p-4 rounded-2xl border border-white/60 backdrop-blur-xs">
                                    <span className="text-[11px] text-[#737686] font-semibold block uppercase">
                                        Tổng nợ quá hạn
                                    </span>
                                    <span className={`text-2xl sm:text-3xl font-black ${
                                        hasOverdueDebt ? 'text-rose-600' : 'text-emerald-600'
                                    }`}>
                                        {formatCurrency(debtData.totalOverdueDebt)} VNĐ
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Debt Action Notification */}
                        {debtActionMsg && (
                            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in ${
                                debtActionMsg.type === 'success'
                                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                            }`}>
                                {debtActionMsg.type === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                )}
                                <span>{debtActionMsg.text}</span>
                            </div>
                        )}

                        {/* 3 Metric Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div className="bg-white p-5 rounded-2xl border border-[#e5eeff] shadow-xs">
                                <span className="text-xs font-semibold text-[#737686] block">Dư nợ tài khoản (BR-P08)</span>
                                <span className="text-xl font-bold text-[#0b1c30] mt-1 block">
                                    {formatCurrency(debtData.accountOverdueDebt)} VNĐ
                                </span>
                                <span className="text-[11px] text-[#737686] mt-0.5 block">Khoản nợ ghi nhận trên hồ sơ</span>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-[#e5eeff] shadow-xs">
                                <span className="text-xs font-semibold text-[#737686] block">Đơn đang quá hạn</span>
                                <span className={`text-xl font-bold mt-1 block ${
                                    debtData.overdueBookings.length > 0 ? 'text-rose-600' : 'text-[#0b1c30]'
                                }`}>
                                    {debtData.overdueBookings.length} đơn
                                </span>
                                <span className="text-[11px] text-[#737686] mt-0.5 block">Tủ đang lưu quá giờ hẹn</span>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-[#e5eeff] shadow-xs">
                                <span className="text-xs font-semibold text-[#737686] block">Đã thanh toán nợ quá hạn</span>
                                <span className="text-xl font-bold text-emerald-600 mt-1 block">
                                    {debtData.paymentHistory.length} giao dịch
                                </span>
                                <span className="text-[11px] text-[#737686] mt-0.5 block">Các khoản nợ đã hoàn tất</span>
                            </div>
                        </div>

                        {/* Section 1: Active Overdue Bookings */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e5eeff] shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[#0b1c30]">
                                            Danh sách đơn đặt tủ đang quá hạn ({debtData.overdueBookings.length})
                                        </h3>
                                        <p className="text-xs text-[#737686]">
                                            Các đơn tủ quá hạn gửi đồ cần được thanh toán phụ phí trước khi lấy đồ hoặc đặt đơn mới
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {debtData.overdueBookings.length === 0 ? (
                                <div className="text-center py-12 px-4 bg-[#f8faff] rounded-2xl border border-dashed border-[#dce3f1]">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                                    <h4 className="text-sm font-bold text-[#0b1c30]">Không có đơn nào bị quá hạn</h4>
                                    <p className="text-xs text-[#737686] mt-1 max-w-md mx-auto">
                                        Tất cả các lượt gửi tủ của bạn đều đang trong khung giờ quy định hoặc đã được hoàn tất đúng hạn.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {debtData.overdueBookings.map((b) => (
                                        <div
                                            key={b.bookingId}
                                            className="p-5 rounded-2xl bg-white border border-rose-200 hover:border-rose-300 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                                                        {b.bookingCode}
                                                    </span>
                                                    <span className="text-xs font-bold text-[#0b1c30] flex items-center gap-1">
                                                        <Building className="w-3.5 h-3.5 text-[#737686]" />
                                                        {b.stationName}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                                        Tủ {b.lockerCode} ({b.lockerSize})
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-[#737686]">
                                                    <div>
                                                        <span>Bắt đầu quá hạn từ: </span>
                                                        <strong className="text-rose-600">{formatDate(b.overdueSince)}</strong>
                                                    </div>
                                                    <div>
                                                        <span>Thời gian quá hạn: </span>
                                                        <strong className="text-rose-600">{b.overdueHours} giờ</strong>
                                                    </div>
                                                    <div>
                                                        <span>Đơn giá quá hạn: </span>
                                                        <span className="font-semibold text-[#0b1c30]">{formatCurrency(b.overdueFeePerHour)}đ/giờ</span>
                                                    </div>
                                                    <div>
                                                        <span>Địa chỉ trạm: </span>
                                                        <span className="truncate">{b.stationAddress || 'Tại trạm'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#f0f4ff]">
                                                <div className="text-left sm:text-right">
                                                    <span className="text-[10px] text-[#737686] uppercase font-bold block">Phụ phí quá hạn</span>
                                                    <span className="text-lg font-extrabold text-rose-600">
                                                        {formatCurrency(b.estimatedOverdueFee)} VNĐ
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => handlePayOverdue(b.bookingId)}
                                                    disabled={payingBookingId === b.bookingId}
                                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-600/20 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer shrink-0"
                                                >
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    <span>{payingBookingId === b.bookingId ? 'Đang tạo link...' : 'Thanh toán ngay'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section 2: Settlement History */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e5eeff] shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#004ac6] flex items-center justify-center">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[#0b1c30]">Lịch sử thanh toán phụ phí quá hạn</h3>
                                    <p className="text-xs text-[#737686]">Các giao dịch thanh toán quá hạn đã được đối soát thành công qua PayOS</p>
                                </div>
                            </div>

                            {debtData.paymentHistory.length === 0 ? (
                                <div className="text-center py-8 text-xs text-[#737686] bg-[#f8faff] rounded-2xl border border-[#e5eeff]">
                                    Chưa có giao dịch thanh toán phụ phí quá hạn nào.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-[#e5eeff] text-[#737686] font-bold">
                                                <th className="pb-3 px-3">Mã đơn hàng</th>
                                                <th className="pb-3 px-3">Mã đơn đặt tủ</th>
                                                <th className="pb-3 px-3">Số tiền</th>
                                                <th className="pb-3 px-3">Cổng thanh toán</th>
                                                <th className="pb-3 px-3">Thời gian</th>
                                                <th className="pb-3 px-3 text-right">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f0f4ff]">
                                            {debtData.paymentHistory.map((p) => (
                                                <tr key={p.paymentId} className="hover:bg-[#f8faff] transition-colors">
                                                    <td className="py-3 px-3 font-mono font-bold text-[#0b1c30]">
                                                        {p.orderCode}
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-[#004ac6]">
                                                        {p.bookingCode}
                                                    </td>
                                                    <td className="py-3 px-3 font-bold text-rose-600">
                                                        {formatCurrency(p.amount)} VNĐ
                                                    </td>
                                                    <td className="py-3 px-3 text-[#737686]">
                                                        {p.gateway}
                                                    </td>
                                                    <td className="py-3 px-3 text-[#737686]">
                                                        {formatDate(p.paidAt)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                            Thành công
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProfilePage;
