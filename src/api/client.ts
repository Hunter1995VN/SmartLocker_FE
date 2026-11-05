import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Cấu hình Axios client gọi API Backend.
 * - Base URL tự động chuyển theo môi trường dev/prod
 * - Tự động ưu tiên kết nối Local Backend (http://localhost:5000) khi chạy trên máy trạm có kết nối phần cứng ESP32/MQTT
 * - Tự động đính kèm JWT trong header Authorization nếu đã đăng nhập
 */

const CLOUD_API_URL = 'https://smartlocker-api.runasp.net';
const LOCAL_API_URL = 'http://localhost:5000';
const ENV_API_URL = import.meta.env.VITE_API_URL as string | undefined;

const API_BASE_URL = ENV_API_URL ||
    (import.meta.env.PROD ? CLOUD_API_URL : LOCAL_API_URL);

let resolvedBaseUrlPromise: Promise<string> | null = null;

export const resolveApiBaseUrl = (): Promise<string> => {
    if (ENV_API_URL || !import.meta.env.PROD) {
        return Promise.resolve(API_BASE_URL);
    }
    if (!resolvedBaseUrlPromise) {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 1200);
        resolvedBaseUrlPromise = fetch(`${LOCAL_API_URL}/api/health`, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal,
        })
            .then((res) => (res.ok ? LOCAL_API_URL : CLOUD_API_URL))
            .catch(() => CLOUD_API_URL)
            .finally(() => window.clearTimeout(timer));
    }
    return resolvedBaseUrlPromise;
};

const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// Token key trong localStorage (đặt ngắn gọn cho dễ)
const TOKEN_KEY = 'smartlocker_token';
const REFRESH_TOKEN_KEY = 'smartlocker_refresh';

export const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
    set: (token: string, refresh?: string) => {
        localStorage.setItem(TOKEN_KEY, token);
        if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    },
    clear: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem('smartlocker_user');
    },
};

// Interceptor: Tự động đính kèm Bearer Token và định tuyến tới Local Backend nếu khả dụng
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        if (!config.baseURL || config.baseURL === CLOUD_API_URL) {
            config.baseURL = await resolveApiBaseUrl();
        }
        const token = tokenStore.get();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor response: Nếu lỗi 401 → xóa token + redirect login
apiClient.interceptors.response.use(
    async (response) => {
        const data = response.data as { success?: boolean; message?: string } | undefined;
        if (
            data?.success === false &&
            typeof data.message === 'string' &&
            data.message.includes('Không gửi được lệnh mở tủ') &&
            response.config.baseURL !== LOCAL_API_URL
        ) {
            try {
                resolvedBaseUrlPromise = Promise.resolve(LOCAL_API_URL);
                return await apiClient.request({
                    ...response.config,
                    baseURL: LOCAL_API_URL,
                });
            } catch {
                return response;
            }
        }
        return response;
    },
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            tokenStore.clear();
            // Redirect về login nếu không phải trang login
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
