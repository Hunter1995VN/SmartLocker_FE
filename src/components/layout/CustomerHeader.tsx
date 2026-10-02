import React, { useState, useRef, useEffect } from 'react';
import {
    Lock, LayoutDashboard, Compass, Clock, Headphones,
    ChevronDown, LogOut
} from 'lucide-react';

export interface CustomerHeaderProps {
    currentPage?: 'dashboard' | 'find-station' | 'my-bookings' | 'station-booking' | 'booking-payment' | 'booking-detail';
    onNavigate: (page: string, data?: any) => void;
    onLogout?: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
    currentPage = 'dashboard',
    onNavigate,
    onLogout
}) => {
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Read logged-in user from localStorage
    const savedUser = localStorage.getItem('smartlocker_user');
    let user: { fullName?: string; email?: string; role?: string } = {};
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

    const isTabActive = (tab: 'dashboard' | 'find-station' | 'my-bookings') => {
        if (tab === 'dashboard') return currentPage === 'dashboard';
        if (tab === 'find-station') return currentPage === 'find-station' || currentPage === 'station-booking';
        if (tab === 'my-bookings') return currentPage === 'my-bookings' || currentPage === 'booking-payment' || currentPage === 'booking-detail';
        return false;
    };

    return (
        <header className="h-16 bg-white border-b border-[#e5eeff] sticky top-0 z-40 shrink-0 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
                {/* 1. Brand Logo & Primary Nav */}
                <div className="flex items-center gap-6 lg:gap-8">
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="flex items-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer"
                        title="Về trang tổng quan"
                    >
                        <div className="w-9 h-9 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-sm">
                            <Lock className="w-[18px] h-[18px] text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-[#0b1c30]">
                            Smart<span className="text-[#2563eb]">Locker</span>
                        </span>
                    </button>

                    {/* Navigation Links */}
                    <nav className="hidden md:flex items-center gap-1.5">
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                                isTabActive('dashboard')
                                    ? 'bg-[#eff4ff] text-[#2563eb]'
                                    : 'text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff]'
                            }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Dashboard</span>
                        </button>

                        <button
                            onClick={() => onNavigate('find-station')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                                isTabActive('find-station')
                                    ? 'bg-[#eff4ff] text-[#2563eb]'
                                    : 'text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff]'
                            }`}
                        >
                            <Compass className="w-4 h-4" />
                            <span>Tìm trạm & Đặt tủ</span>
                        </button>

                        <button
                            onClick={() => onNavigate('my-bookings')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                                isTabActive('my-bookings')
                                    ? 'bg-[#eff4ff] text-[#2563eb]'
                                    : 'text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff]'
                            }`}
                        >
                            <Clock className="w-4 h-4" />
                            <span>Lịch sử đặt chỗ</span>
                        </button>

                        <a
                            href="tel:19001234"
                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold text-[#434655] hover:text-[#0b1c30] hover:bg-[#f0f4ff] transition-all"
                        >
                            <Headphones className="w-4 h-4" />
                            <span>Hỗ trợ</span>
                        </a>
                    </nav>
                </div>

                {/* 2. Trailing System Status & User Profile */}
                <div className="flex items-center gap-3">
                    {/* Live System Status Pill */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#eff4ff] rounded-full border border-[#dce9ff]">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                        </span>
                        <span className="text-xs text-[#0b1c30] font-semibold">IoT Trực tuyến</span>
                    </div>

                    {/* User Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setUserMenuOpen(prev => !prev)}
                            className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl hover:bg-[#eff4ff] transition-colors border border-transparent hover:border-[#e5eeff] cursor-pointer"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#004ac6] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                {initials}
                            </div>
                            <div className="hidden lg:flex flex-col text-left">
                                <span className="text-xs font-bold text-[#0b1c30] truncate max-w-[140px] leading-tight">
                                    {userName}
                                </span>
                                <span className="text-[10px] text-[#737686] uppercase tracking-wide font-medium leading-none mt-0.5">
                                    Khách hàng
                                </span>
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 text-[#737686]" />
                        </button>

                        {/* Dropdown Menu */}
                        {userMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#e5eeff] py-1.5 z-50 animate-fade-in-down">
                                <div className="px-4 py-2.5 border-b border-[#f0f4ff]">
                                    <p className="text-xs font-bold text-[#0b1c30] truncate">{userName}</p>
                                    <p className="text-[11px] text-[#737686] truncate">{user.email || 'traveler@smartlocker.vn'}</p>
                                </div>

                                <button
                                    onClick={() => { setUserMenuOpen(false); onNavigate('dashboard'); }}
                                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#434655] hover:bg-[#eff4ff] hover:text-[#2563eb] flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                    <LayoutDashboard className="w-4 h-4 text-[#2563eb]" />
                                    <span>Trang tổng quan (Dashboard)</span>
                                </button>

                                <button
                                    onClick={() => { setUserMenuOpen(false); onNavigate('find-station'); }}
                                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#434655] hover:bg-[#eff4ff] hover:text-[#2563eb] flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                    <Compass className="w-4 h-4 text-[#2563eb]" />
                                    <span>Tìm trạm & Đặt tủ</span>
                                </button>

                                <button
                                    onClick={() => { setUserMenuOpen(false); onNavigate('my-bookings'); }}
                                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#434655] hover:bg-[#eff4ff] hover:text-[#2563eb] flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                    <Clock className="w-4 h-4 text-[#2563eb]" />
                                    <span>Lịch sử đơn đặt</span>
                                </button>

                                <hr className="my-1 border-[#f0f4ff]" />

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
    );
};

export default CustomerHeader;
