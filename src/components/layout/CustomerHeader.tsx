import { openSupport } from '../../utils/contact';
import { resolveAssetUrl } from '../../api/client';
import React, { useState, useRef, useEffect } from 'react';
import {
    Lock, LayoutDashboard, Compass, Clock, Headphones,
    ChevronDown, LogOut, Bell, User, DollarSign
} from 'lucide-react';
import NotificationPreferencesModal from '../customer/NotificationPreferencesModal';

export interface CustomerHeaderProps {
    currentPage?: 'dashboard' | 'find-station' | 'my-bookings' | 'station-booking' | 'booking-payment' | 'booking-detail' | 'profile';
    onNavigate: (page: string, data?: any) => void;
    onLogout?: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
    currentPage = 'dashboard',
    onNavigate,
    onLogout
}) => {
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notifPrefsOpen, setNotifPrefsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Đọc lại người dùng khi hồ sơ/ảnh đại diện vừa được cập nhật ở trang Hồ sơ
    const [, setProfileVersion] = useState(0);
    useEffect(() => {
        const refresh = () => setProfileVersion((v) => v + 1);
        window.addEventListener('smartlocker:profile-updated', refresh);
        return () => window.removeEventListener('smartlocker:profile-updated', refresh);
    }, []);

    // Read logged-in user from localStorage
    const savedUser = localStorage.getItem('smartlocker_user');
    let user: { fullName?: string; email?: string; role?: string; avatarUrl?: string } = {};
    try {
        if (savedUser) user = JSON.parse(savedUser);
    } catch {
        // Ignore JSON error
    }

    const userName = user.fullName || 'Khách hàng';
    const initials = userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('') || 'KH';

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setUserMenuOpen(false);
        if (onLogout) {
            onLogout();
        } else {
            localStorage.clear();
            onNavigate('login');
        }
    };

    const isTabActive = (tab: 'dashboard' | 'find-station' | 'my-bookings' | 'profile') => {
        if (tab === 'dashboard') return currentPage === 'dashboard';
        if (tab === 'find-station') return currentPage === 'find-station' || currentPage === 'station-booking';
        if (tab === 'my-bookings') return currentPage === 'my-bookings' || currentPage === 'booking-payment' || currentPage === 'booking-detail';
        if (tab === 'profile') return currentPage === 'profile';
        return false;
    };

    return (
        <>
            <header className="h-16 bg-white border-b border-surface-container sticky top-0 z-40 shrink-0 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
                    {/* 1. Brand Logo & Primary Nav */}
                    <div className="flex items-center gap-6 lg:gap-8">
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className="flex items-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer"
                            title="Về trang tổng quan"
                        >
                            <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center shadow-sm">
                                <Lock className="w-[18px] h-[18px] text-white" />
                            </div>
                            <span className="font-bold text-lg tracking-tight text-on-surface">
                                Smart<span className="text-primary-container">Locker</span>
                            </span>
                        </button>

                        {/* Navigation Links */}
                        <nav className="hidden md:flex items-center gap-1.5">
                            <button
                                onClick={() => onNavigate('dashboard')}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                                    isTabActive('dashboard')
                                        ? 'bg-surface-container-low text-primary-container'
                                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                                }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                <span>Dashboard</span>
                            </button>

                            <button
                                onClick={() => onNavigate('find-station')}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                                    isTabActive('find-station')
                                        ? 'bg-surface-container-low text-primary-container'
                                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                                }`}
                            >
                                <Compass className="w-4 h-4" />
                                <span>Tìm trạm & Đặt tủ</span>
                            </button>

                            <button
                                onClick={() => onNavigate('my-bookings')}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                                    isTabActive('my-bookings')
                                        ? 'bg-surface-container-low text-primary-container'
                                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                                }`}
                            >
                                <Clock className="w-4 h-4" />
                                <span>Lịch sử đặt chỗ</span>
                            </button>

                            <a
                                href="#support" onClick={(e) => { e.preventDefault(); openSupport(); }}
                                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all"
                            >
                                <Headphones className="w-4 h-4" />
                                <span>Hỗ trợ</span>
                            </a>
                        </nav>
                    </div>

                    {/* 2. Trailing System Status & User Profile */}
                    <div className="flex items-center gap-3">
                        {/* User Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setUserMenuOpen(prev => !prev)}
                                className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-surface-container cursor-pointer"
                            >
                                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden">
                                    {user.avatarUrl ? (
                                        <img
                                            src={resolveAssetUrl(user.avatarUrl)}
                                            alt={userName}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                        />
                                    ) : initials}
                                </div>
                                <div className="hidden lg:flex flex-col text-left">
                                    <span className="text-xs font-bold text-on-surface truncate max-w-[140px] leading-tight">
                                        {userName}
                                    </span>
                                    <span className="text-xs text-on-surface-muted uppercase tracking-wide font-medium leading-none mt-0.5">
                                        Khách hàng
                                    </span>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-on-surface-muted" />
                            </button>

                            {/* Dropdown Menu */}
                            {userMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-surface-container py-1.5 z-50 animate-fade-in-down">
                                    <div className="px-4 py-2.5 border-b border-surface-container-low">
                                        <p className="text-sm font-bold text-on-surface truncate">{userName}</p>
                                        <p className="text-sm text-on-surface-muted truncate">{user.email || 'traveler@smartlocker.vn'}</p>
                                    </div>

                                    <button
                                        onClick={() => { setUserMenuOpen(false); onNavigate('dashboard'); }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                        <LayoutDashboard className="w-4 h-4 text-primary-container" />
                                        <span>Trang tổng quan (Dashboard)</span>
                                    </button>

                                    <button
                                        onClick={() => { setUserMenuOpen(false); onNavigate('find-station'); }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                        <Compass className="w-4 h-4 text-primary-container" />
                                        <span>Tìm trạm & Đặt tủ</span>
                                    </button>

                                    <button
                                        onClick={() => { setUserMenuOpen(false); onNavigate('my-bookings'); }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                        <Clock className="w-4 h-4 text-primary-container" />
                                        <span>Lịch sử đơn đặt</span>
                                    </button>

                                    <button
                                        onClick={() => { setUserMenuOpen(false); onNavigate('profile', { tab: 'info' }); }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                        <User className="w-4 h-4 text-primary-container" />
                                        <span>Thông tin cá nhân</span>
                                    </button>

                                    <button
                                        onClick={() => { setUserMenuOpen(false); onNavigate('profile', { tab: 'debt' }); }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                        <DollarSign className="w-4 h-4 text-primary-container" />
                                        <span>Tra cứu dư nợ quá hạn</span>
                                    </button>

                                    <button
                                        onClick={() => { setUserMenuOpen(false); setNotifPrefsOpen(true); }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                        <Bell className="w-4 h-4 text-primary-container" />
                                        <span>Kênh nhận thông báo</span>
                                    </button>

                                    <hr className="my-1 border-surface-container-low" />

                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Đăng xuất</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <NotificationPreferencesModal
                isOpen={notifPrefsOpen}
                onClose={() => setNotifPrefsOpen(false)}
            />
        </>
    );
};

export default CustomerHeader;
