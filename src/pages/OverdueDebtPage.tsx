import React, { useState, useEffect } from 'react';
import {
    AlertTriangle, CheckCircle2, Clock, CreditCard, ArrowLeft,
    RefreshCw, AlertCircle, Building
} from 'lucide-react';
import CustomerHeader from '../components/layout/CustomerHeader';
import profileService from '../api/profileService';
import type { UserOverdueDebtResponse } from '../api/profileService';
import { useT } from '../i18n';

interface OverdueDebtPageProps {
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

export const OverdueDebtPage: React.FC<OverdueDebtPageProps> = ({ onLogout, onNavigate }) => {
    const t = useT();
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [debtData, setDebtData] = useState<UserOverdueDebtResponse | null>(null);
    const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
    const [debtActionMsg, setDebtActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadDebtData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        setDebtActionMsg(null);

        try {
            const res = await profileService.getOverdueDebt();
            if (res.success && res.data) {
                setDebtData(res.data);
            }
        } catch (err: any) {
            console.error('Lỗi tải dữ liệu dư nợ quá hạn:', err);
            setDebtActionMsg({
                type: 'error',
                text: t('Không thể tải thông tin từ máy chủ. Vui lòng thử lại sau.')
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDebtData();
    }, []);

    const handlePayOverdue = async (bookingId: string) => {
        setPayingBookingId(bookingId);
        setDebtActionMsg(null);

        try {
            const res = await profileService.payOverdueDebt(bookingId);
            if (res && res.success && res.data?.paymentUrl) {
                setDebtActionMsg({
                    type: 'success',
                    text: t('Đang chuyển hướng tới cổng thanh toán PayOS...')
                });
                window.location.href = res.data.paymentUrl;
            } else {
                setDebtActionMsg({
                    type: 'error',
                    text: res?.message || t('Không thể tạo liên kết thanh toán. Vui lòng thử lại.')
                });
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || t('Lỗi khi xử lý thanh toán quá hạn.');
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
        <div className="min-h-screen bg-surface-bright flex flex-col font-sans">
            <CustomerHeader currentPage="overdue-debt" onLogout={onLogout} onNavigate={onNavigate} />

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
                            {t('Tra cứu dư nợ quá hạn')}
                        </h1>
                        <p className="text-sm text-on-surface-muted mt-1">
                            {t('Kiểm tra chi tiết các khoản phụ phí quá hạn, thanh toán trực tuyến và lịch sử đối soát')}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => loadDebtData(true)}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-on-surface bg-white border border-outline-soft hover:bg-surface-container-low hover:border-[#b8ccfa] transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                            <span>{refreshing ? t('Đang cập nhật...') : t('Làm mới')}</span>
                        </button>
                    </div>
                </div>

                {/* Loading Skeleton */}
                {loading && (
                    <div className="space-y-6 animate-pulse">
                        <div className="bg-white rounded-3xl h-32 border border-surface-container"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div className="bg-white rounded-2xl h-28 border border-surface-container"></div>
                            <div className="bg-white rounded-2xl h-28 border border-surface-container"></div>
                            <div className="bg-white rounded-2xl h-28 border border-surface-container"></div>
                        </div>
                        <div className="bg-white rounded-3xl h-64 border border-surface-container"></div>
                    </div>
                )}

                {!loading && debtData && (
                    <div className="space-y-8">
                        {/* Financial Standing Banner */}
                        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xs relative overflow-hidden ${
                            hasOverdueDebt
                                ? 'bg-error-container/40 border-rose-200'
                                : 'bg-tertiary-fixed/30 border-emerald-200'
                        }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                                        hasOverdueDebt ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    }`}>
                                        {hasOverdueDebt ? <AlertTriangle className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
                                    </div>

                                    <div>
                                        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                            hasOverdueDebt
                                                ? 'bg-rose-100/70 text-rose-800 border-rose-300'
                                                : 'bg-emerald-100/70 text-emerald-800 border-emerald-300'
                                        }`}>
                                            {hasOverdueDebt ? t('Tài khoản có dư nợ') : t('Tài khoản sạch nợ')}
                                        </span>

                                        <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface mt-1.5">
                                            {hasOverdueDebt ? t('Phát sinh dư nợ quá hạn chưa thanh toán') : t('Không có bất kỳ dư nợ quá hạn nào')}
                                        </h2>

                                        <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
                                            {debtData.statusMessage}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-left sm:text-right shrink-0 bg-white/70 p-4 rounded-2xl border border-white/60 backdrop-blur-xs">
                                    <span className="text-xs text-on-surface-muted font-semibold block uppercase">
                                        {t('Tổng nợ quá hạn')}
                                    </span>
                                    <span className={`text-2xl sm:text-3xl font-extrabold ${
                                        hasOverdueDebt ? 'text-rose-600' : 'text-emerald-600'
                                    }`}>
                                        {formatCurrency(debtData.totalOverdueDebt)} {t('VNĐ')}
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
                            <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-xs">
                                <span className="text-xs font-semibold text-on-surface-muted block">{t('Dư nợ tài khoản (BR-P08)')}</span>
                                <span className="text-xl font-bold text-on-surface mt-1 block">
                                    {formatCurrency(debtData.accountOverdueDebt)} {t('VNĐ')}
                                </span>
                                <span className="text-xs text-on-surface-muted mt-0.5 block">{t('Khoản nợ ghi nhận trên hồ sơ')}</span>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-xs">
                                <span className="text-xs font-semibold text-on-surface-muted block">{t('Đơn đang quá hạn')}</span>
                                <span className={`text-xl font-bold mt-1 block ${
                                    debtData.overdueBookings.length > 0 ? 'text-rose-600' : 'text-on-surface'
                                }`}>
                                    {debtData.overdueBookings.length} {t('đơn')}
                                </span>
                                <span className="text-xs text-on-surface-muted mt-0.5 block">{t('Tủ đang lưu quá giờ hẹn')}</span>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-surface-container shadow-xs">
                                <span className="text-xs font-semibold text-on-surface-muted block">{t('Đã thanh toán nợ quá hạn')}</span>
                                <span className="text-xl font-bold text-emerald-600 mt-1 block">
                                    {debtData.paymentHistory.length} {t('giao dịch')}
                                </span>
                                <span className="text-xs text-on-surface-muted mt-0.5 block">{t('Các khoản nợ đã hoàn tất')}</span>
                            </div>
                        </div>

                        {/* Section 1: Active Overdue Bookings */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-on-surface">
                                            {t('Danh sách đơn đặt tủ đang quá hạn (')}{debtData.overdueBookings.length})
                                        </h2>
                                        <p className="text-sm text-on-surface-muted">
                                            {t('Các đơn tủ quá hạn gửi đồ cần được thanh toán phụ phí trước khi lấy đồ hoặc đặt đơn mới')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {debtData.overdueBookings.length === 0 ? (
                                <div className="text-center py-12 px-4 bg-surface-bright rounded-2xl border border-dashed border-outline-soft">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                                    <h4 className="text-sm font-bold text-on-surface">{t('Không có đơn nào bị quá hạn')}</h4>
                                    <p className="text-sm text-on-surface-muted mt-1 max-w-md mx-auto">
                                        {t('Tất cả các lượt gửi tủ của bạn đều đang trong khung giờ quy định hoặc đã được hoàn tất đúng hạn.')}
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
                                                    <span className="text-xs font-bold text-on-surface flex items-center gap-1">
                                                        <Building className="w-3.5 h-3.5 text-on-surface-muted" />
                                                        {b.stationName}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                                        {t('Tủ')} {b.lockerCode} ({b.lockerSize})
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-on-surface-muted">
                                                    <div>
                                                        <span>{t('Bắt đầu quá hạn từ:')} </span>
                                                        <strong className="text-rose-600">{formatDate(b.overdueSince)}</strong>
                                                    </div>
                                                    <div>
                                                        <span>{t('Thời gian quá hạn:')} </span>
                                                        <strong className="text-rose-600">{b.overdueHours} {t('giờ')}</strong>
                                                    </div>
                                                    <div>
                                                        <span>{t('Đơn giá quá hạn:')} </span>
                                                        <span className="font-semibold text-on-surface">{formatCurrency(b.overdueFeePerHour)}{t('đ/giờ')}</span>
                                                    </div>
                                                    <div>
                                                        <span>{t('Địa chỉ trạm:')} </span>
                                                        <span className="truncate">{b.stationAddress || t('Tại trạm')}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-surface-container-low">
                                                <div className="text-left sm:text-right">
                                                    <span className="text-xs text-on-surface-muted uppercase font-bold block">{t('Phụ phí quá hạn')}</span>
                                                    <span className="text-lg font-extrabold text-rose-600">
                                                        {formatCurrency(b.estimatedOverdueFee)} {t('VNĐ')}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => handlePayOverdue(b.bookingId)}
                                                    disabled={payingBookingId === b.bookingId}
                                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-600/20 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer shrink-0"
                                                >
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    <span>{payingBookingId === b.bookingId ? t('Đang tạo link...') : t('Thanh toán ngay')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section 2: Settlement History */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-container shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-on-surface">{t('Lịch sử thanh toán phụ phí quá hạn')}</h2>
                                    <p className="text-sm text-on-surface-muted">{t('Các giao dịch thanh toán quá hạn đã được đối soát thành công qua PayOS')}</p>
                                </div>
                            </div>

                            {debtData.paymentHistory.length === 0 ? (
                                <div className="text-center py-8 text-xs text-on-surface-muted bg-surface-bright rounded-2xl border border-surface-container">
                                    {t('Chưa có giao dịch thanh toán phụ phí quá hạn nào.')}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-surface-container text-on-surface-muted font-bold">
                                                <th className="pb-3 px-3">{t('Mã đơn hàng')}</th>
                                                <th className="pb-3 px-3">{t('Mã đơn đặt tủ')}</th>
                                                <th className="pb-3 px-3">{t('Số tiền')}</th>
                                                <th className="pb-3 px-3">{t('Cổng thanh toán')}</th>
                                                <th className="pb-3 px-3">{t('Thời gian')}</th>
                                                <th className="pb-3 px-3 text-right">{t('Trạng thái')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-surface-container-low">
                                            {debtData.paymentHistory.map((p) => (
                                                <tr key={p.paymentId} className="hover:bg-surface-bright transition-colors">
                                                    <td className="py-3 px-3 font-mono font-bold text-on-surface">
                                                        {p.orderCode}
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-primary">
                                                        {p.bookingCode}
                                                    </td>
                                                    <td className="py-3 px-3 font-bold text-rose-600">
                                                        {formatCurrency(p.amount)} {t('VNĐ')}
                                                    </td>
                                                    <td className="py-3 px-3 text-on-surface-muted">
                                                        {p.gateway}
                                                    </td>
                                                    <td className="py-3 px-3 text-on-surface-muted">
                                                        {formatDate(p.paidAt)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                            {t('Thành công')}
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

export default OverdueDebtPage;
