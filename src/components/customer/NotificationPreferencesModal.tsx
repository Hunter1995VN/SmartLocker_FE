/**
 * UC-T22: Thiết lập tùy chọn kênh nhận thông báo (SMS, Email, WebPush)
 * Modal cấu hình kênh nhận thông báo & loại cảnh báo cho Traveler.
 */
import React, { useState, useEffect } from 'react';
import {
    Bell,
    Mail,
    MessageSquare,
    Globe,
    CheckCircle2,
    ShieldAlert,
    Clock,
    Sparkles,
    X,
    Save,
} from 'lucide-react';
import notificationPreferenceService, {
    DEFAULT_NOTIFICATION_PREFS,
} from '../../api/notificationPreferenceService';
import type { NotificationPreferenceDto } from '../../api/notificationPreferenceService';

interface NotificationPreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [prefs, setPrefs] = useState<NotificationPreferenceDto>(DEFAULT_NOTIFICATION_PREFS);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        let mounted = true;
        setSaveMessage(null);
        setIsLoading(true);
        notificationPreferenceService
            .getPreferences()
            .then((data) => {
                if (mounted) {
                    setPrefs(data);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (mounted) setIsLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleToggleChannel = async (key: 'enableEmail' | 'enableSms' | 'enableWebPush') => {
        if (key === 'enableWebPush' && !prefs.enableWebPush && 'Notification' in window) {
            try {
                await Notification.requestPermission();
            } catch {
                // Ignore browser permission error
            }
        }
        setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
        setSaveMessage(null);
    };

    const handleToggleAlert = (
        key: 'bookingConfirmAlert' | 'checkInReminderAlert' | 'expiryWarningAlert' | 'promotionalAlert'
    ) => {
        setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
        setSaveMessage(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage(null);
        const res = await notificationPreferenceService.updatePreferences(prefs);
        setPrefs(res.data);
        setSaveMessage(res.message);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-[#e5eeff] max-w-lg w-full shadow-2xl overflow-hidden animate-fade-in-down">
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-[#0b1c30] to-[#1e3a8a] text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-blue-200" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold">Thiết Lập Kênh Nhận Thông Báo</h2>
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30">
                                    UC-T22
                                </span>
                            </div>
                            <p className="text-xs text-blue-200 mt-0.5">
                                Tùy chỉnh nhận mã PIN mở tủ, nhắc hẹn check-in & cảnh báo quá hạn
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                            Đang tải cấu hình thông báo của bạn...
                        </div>
                    ) : (
                        <>
                            {/* Section 1: 3 Kênh nhận thông báo (Email, SMS, WebPush) */}
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
                                    1. Kênh Nhận Thông Báo (Channels)
                                </p>
                                <div className="space-y-2.5">
                                    {/* Email Channel */}
                                    <div
                                        onClick={() => void handleToggleChannel('enableEmail')}
                                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                                            prefs.enableEmail
                                                ? 'border-blue-500 bg-blue-50/40'
                                                : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                    prefs.enableEmail
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">
                                                    Email Điện Tử (Gmail SMTP)
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    Nhận vé QR, mã PIN 6 số, hóa đơn điện tử & biên bản thanh toán
                                                </p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={prefs.enableEmail}
                                            onChange={() => {}}
                                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                        />
                                    </div>

                                    {/* SMS Channel */}
                                    <div
                                        onClick={() => void handleToggleChannel('enableSms')}
                                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                                            prefs.enableSms
                                                ? 'border-blue-500 bg-blue-50/40'
                                                : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                    prefs.enableSms
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">
                                                    Tin Nhắn SMS Di Động
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    Nhận mã mở tủ khẩn cấp khi đi vào vùng mất kết nối 4G/Wi-Fi
                                                </p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={prefs.enableSms}
                                            onChange={() => {}}
                                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                        />
                                    </div>

                                    {/* WebPush Channel */}
                                    <div
                                        onClick={() => void handleToggleChannel('enableWebPush')}
                                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                                            prefs.enableWebPush
                                                ? 'border-blue-500 bg-blue-50/40'
                                                : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                    prefs.enableWebPush
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                <Globe className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">
                                                    Thông Báo Đẩy Trình Duyệt (WebPush)
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    Thông báo tức thì trên trình duyệt khi cửa tủ đóng/mở hoặc thanh toán xong
                                                </p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={prefs.enableWebPush}
                                            onChange={() => {}}
                                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Loại sự kiện thông báo */}
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
                                    2. Tùy Chọn Loại Sự Kiện Cảnh Báo
                                </p>
                                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 divide-y divide-slate-200/70 text-xs">
                                    <label className="p-3 flex items-center justify-between cursor-pointer">
                                        <span className="flex items-center gap-2.5 font-semibold text-slate-800">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            Xác nhận đặt tủ & Cấp mã PIN 6 số
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={prefs.bookingConfirmAlert}
                                            onChange={() => handleToggleAlert('bookingConfirmAlert')}
                                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                        />
                                    </label>

                                    <label className="p-3 flex items-center justify-between cursor-pointer">
                                        <span className="flex items-center gap-2.5 font-semibold text-slate-800">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            Nhắc nhở thời gian giữ chỗ 30 phút & Sắp hết giờ thuê
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={prefs.checkInReminderAlert}
                                            onChange={() => handleToggleAlert('checkInReminderAlert')}
                                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                        />
                                    </label>

                                    <div className="p-3 flex items-center justify-between bg-amber-50/50">
                                        <span className="flex items-center gap-2.5 font-semibold text-slate-800">
                                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                                            Cảnh báo quá hạn lưu trữ & Niêm phong 72h (Bắt buộc)
                                        </span>
                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                            Luôn bật
                                        </span>
                                    </div>

                                    <label className="p-3 flex items-center justify-between cursor-pointer">
                                        <span className="flex items-center gap-2.5 font-semibold text-slate-800">
                                            <Sparkles className="w-4 h-4 text-purple-600" />
                                            Nhận mã giảm giá & Ưu đãi trạm mới
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={prefs.promotionalAlert}
                                            onChange={() => handleToggleAlert('promotionalAlert')}
                                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                                        />
                                    </label>
                                </div>
                            </div>

                            {saveMessage && (
                                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>{saveMessage}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                        Đóng
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        <span>{isSaving ? 'Đang lưu...' : 'Lưu Thiết Lập Thông Báo'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationPreferencesModal;
