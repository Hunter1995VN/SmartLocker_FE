/**
 * UC-T22: Thiết lập tùy chọn kênh nhận thông báo (SMS, Email, WebPush)
 * Kết nối với Backend endpoint /api/notifications/preferences và lưu dự phòng localStorage.
 */
import client from './client';
import type { ApiResponse } from './adminDashboardService';

export interface NotificationPreferenceDto {
    enableEmail: boolean;
    enableSms: boolean;
    enableWebPush: boolean;
    bookingConfirmAlert: boolean;
    checkInReminderAlert: boolean;
    expiryWarningAlert: boolean;
    overduePenaltyAlert: boolean;
    promotionalAlert: boolean;
    preferredLanguage: string;
    updatedAt?: string;
}

const LOCAL_PREF_KEY = 'smartlocker_notification_prefs';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferenceDto = {
    enableEmail: true,
    enableSms: false,
    enableWebPush: true,
    bookingConfirmAlert: true,
    checkInReminderAlert: true,
    expiryWarningAlert: true,
    overduePenaltyAlert: true,
    promotionalAlert: false,
    preferredLanguage: 'vi',
};

const notificationPreferenceService = {
    getPreferences: async (): Promise<NotificationPreferenceDto> => {
        try {
            const res = await client.get<ApiResponse<NotificationPreferenceDto>>(
                '/api/notifications/preferences'
            );
            if (res.data?.success && res.data.data) {
                localStorage.setItem(LOCAL_PREF_KEY, JSON.stringify(res.data.data));
                return res.data.data;
            }
        } catch {
            // Fallback to localStorage if offline or unauthenticated
        }

        try {
            const cached = localStorage.getItem(LOCAL_PREF_KEY);
            if (cached) {
                return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(cached) };
            }
        } catch {
            // Ignore parse error
        }

        return DEFAULT_NOTIFICATION_PREFS;
    },

    updatePreferences: async (
        prefs: NotificationPreferenceDto
    ): Promise<{ success: boolean; data: NotificationPreferenceDto; message: string }> => {
        const updated = {
            ...prefs,
            overduePenaltyAlert: true,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_PREF_KEY, JSON.stringify(updated));

        try {
            const res = await client.put<ApiResponse<NotificationPreferenceDto>>(
                '/api/notifications/preferences',
                updated
            );
            if (res.data?.success && res.data.data) {
                localStorage.setItem(LOCAL_PREF_KEY, JSON.stringify(res.data.data));
                return {
                    success: true,
                    data: res.data.data,
                    message: res.data.message || 'Đã lưu tùy chọn kênh nhận thông báo thành công!',
                };
            }
        } catch {
            // Saved locally as resilient fallback
        }

        return {
            success: true,
            data: updated,
            message: 'Đã lưu tùy chọn kênh nhận thông báo (Email, SMS, WebPush) thành công!',
        };
    },
};

export default notificationPreferenceService;
