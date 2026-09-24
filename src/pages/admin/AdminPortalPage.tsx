/**
 * AD-FE-01: UC-A01 — Log In to Admin Portal
 * Màn hình khu vực Admin Portal sau khi đăng nhập thành công.
 * Xác nhận quyền truy cập của Admin / Staff và cung cấp chức năng Đăng xuất.
 * TUYỆT ĐỐI KHÔNG implement các Use Case ngoài phạm vi (Dashboard UC-A02, Station/Locker Management...).
 */
import { useState } from 'react';
import { Lock, LogOut, ShieldCheck, Wrench, UserCheck, Shield } from 'lucide-react';
import type { AuthResponse } from '../../api/authService';

interface AdminPortalPageProps {
    onLogout: () => void;
    onNavigateLogin?: () => void;
}

export default function AdminPortalPage({ onLogout }: AdminPortalPageProps) {
    const [user] = useState<AuthResponse | null>(() => {
        try {
            const saved = localStorage.getItem('smartlocker_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const role = (user?.role || '').trim();
    const isAdmin = role.toLowerCase() === 'admin';
    const isStaff = role.toLowerCase() === 'staff';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
            {/* Top Navigation */}
            <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/30 border border-blue-400/20">
                        <Lock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-white tracking-tight">SmartLocker</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Admin Portal
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">Hệ thống quản trị & vận hành SLMS</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* User Profile Pill */}
                    <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 font-bold text-xs">
                            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-semibold text-white leading-tight">
                                {user?.fullName || 'Người dùng Quản trị'}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-tight">
                                {user?.email || 'admin@smartlocker.vn'}
                            </p>
                        </div>
                        <span
                            className={`ml-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                isAdmin
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                    : isStaff
                                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                                    : 'bg-slate-700 text-slate-300 border-slate-600'
                            }`}
                        >
                            {role || 'Admin/Staff'}
                        </span>
                    </div>

                    {/* Logout Button */}
                    <button
                        type="button"
                        onClick={onLogout}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
                        title="Đăng xuất khỏi Admin Portal"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Đăng xuất</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
                    {/* Status Icon */}
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-7 h-7 text-emerald-400" />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold mb-1">
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Xác thực thành công — UC-A01</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                Chào mừng đến với SmartLocker Admin Portal
                            </h1>
                            <p className="text-xs text-slate-400 mt-1">
                                Bạn đã đăng nhập thành công với vai trò được ủy quyền trong hệ thống.
                            </p>
                        </div>
                    </div>

                    {/* User Session Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Người dùng hiện tại
                            </p>
                            <p className="text-sm font-bold text-white">{user?.fullName || 'Chưa cập nhật'}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{user?.email || 'N/A'}</p>
                            {user?.phone && <p className="text-xs text-slate-500 mt-0.5">SĐT: {user.phone}</p>}
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Quyền hạn & Phân nhóm
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                {isAdmin ? (
                                    <>
                                        <Shield className="w-4 h-4 text-purple-400" />
                                        <span className="text-sm font-bold text-purple-300">Quản trị viên (Admin)</span>
                                    </>
                                ) : isStaff ? (
                                    <>
                                        <Wrench className="w-4 h-4 text-teal-400" />
                                        <span className="text-sm font-bold text-teal-300">
                                            Nhân viên kỹ thuật (Staff)
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm font-bold text-slate-300">{role}</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                {isAdmin
                                    ? 'Toàn quyền cấu hình hệ sinh thái trạm tủ và tài khoản.'
                                    : 'Quyền vận hành, bảo trì và xử lý sự cố thiết bị tại trạm.'}
                            </p>
                        </div>
                    </div>

                    {/* Scope Notice */}
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 leading-relaxed">
                        <p className="font-semibold text-blue-100 mb-1">
                            ℹ️ Thông tin phân hệ — Task AD-FE-01 (UC-A01: Log In to Admin Portal)
                        </p>
                        <p className="text-blue-300/90">
                            Chức năng xác thực và phân quyền Admin & Staff đã hoàn thành và sẵn sàng kết nối. Các phân hệ
                            nghiệp vụ tiếp theo (như UC-A02 Operations Dashboard, Quản lý trạm tủ, Quản lý sự cố...)
                            sẽ được tích hợp theo các task tương ứng tiếp theo.
                        </p>
                    </div>

                    {/* Action */}
                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={onLogout}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Đăng xuất phiên làm việc</span>
                        </button>
                    </div>
                </div>
            </main>

            {/* Bottom Footer */}
            <footer className="w-full py-3 text-center text-xs text-slate-500 border-t border-slate-800 bg-slate-900/60">
                <span>© 2025 SmartLocker Management System (SLMS) · Phân hệ Quản trị</span>
            </footer>
        </div>
    );
}
