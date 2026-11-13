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

// Kết quả dò nguồn API được ghi nhớ để mọi request (REST, SignalR) dùng cùng một backend.
// Cloud được nhớ 60 giây rồi dò lại (kiosk có thể bật backend cục bộ sau); local được nhớ
// cho tới khi request tới local bị lỗi mạng.
const CLOUD_CACHE_MS = 60_000;
let resolvedBaseUrl: { url: string; at: number } | null = null;
let pendingProbePromise: Promise<string> | null = null;

const probeLocalBackend = (): Promise<boolean> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 1500);
    return fetch(`${LOCAL_API_URL}/api/health`, { method: 'GET', mode: 'cors', signal: controller.signal })
        .then((res) => res.ok)
        .catch(() => false)
        .finally(() => window.clearTimeout(timer));
};

export const resolveApiBaseUrl = (): Promise<string> => {
    if (ENV_API_URL || !import.meta.env.PROD) {
        return Promise.resolve(API_BASE_URL);
    }
    if (resolvedBaseUrl && (resolvedBaseUrl.url === LOCAL_API_URL || Date.now() - resolvedBaseUrl.at < CLOUD_CACHE_MS)) {
        return Promise.resolve(resolvedBaseUrl.url);
    }
    if (!pendingProbePromise) {
        pendingProbePromise = probeLocalBackend()
            .then((ok) => {
                const url = ok ? LOCAL_API_URL : CLOUD_API_URL;
                resolvedBaseUrl = { url, at: Date.now() };
                return url;
            })
            .finally(() => { pendingProbePromise = null; });
    }
    return pendingProbePromise;
};

/** Backend đang được dùng cho REST (để SignalR kết nối cùng nơi). */
export const getActiveApiBaseUrl = (): string => resolvedBaseUrl?.url ?? API_BASE_URL;

const MQTT_DISPATCH_FAILED = 'Không gửi được lệnh mở tủ';
type RetryableConfig = InternalAxiosRequestConfig & { _localMqttRetry?: boolean };

/**
 * Cloud trả lỗi gửi MQTT (BE đã hoàn tác check-in, không có lệnh mở nào được phát).
 * Chỉ thử lại một lần qua backend cục bộ khi backend đó thực sự đang chạy; không đánh dấu
 * local là nguồn mặc định nếu chưa xác nhận health, để các request sau không bị chuyển nhầm
 * sang localhost không tồn tại.
 */
const retryKioskViaLocal = async (config: RetryableConfig | undefined, message: unknown) => {
    if (!config || config._localMqttRetry || ENV_API_URL || !import.meta.env.PROD) return null;
    if (config.baseURL === LOCAL_API_URL || typeof message !== 'string' || !message.includes(MQTT_DISPATCH_FAILED)) return null;
    if (!String(config.url ?? '').toLowerCase().startsWith('/api/kiosk/')) return null;
    if (!(await probeLocalBackend())) return null;
    resolvedBaseUrl = { url: LOCAL_API_URL, at: Date.now() };
    return apiClient.request({ ...config, baseURL: LOCAL_API_URL, _localMqttRetry: true } as RetryableConfig);
};

// Máy chủ đám mây có thể "ngủ" và mất vài chục giây để khởi động lại: 15s là quá ngắn nên gây lỗi timeout.
// Request đọc (GET) được tự thử lại; request ghi (POST/PUT/DELETE) không thử lại để tránh thực hiện hai lần.
const REQUEST_TIMEOUT_MS = 30000;
const RETRY_DELAYS_MS = [800, 2500];

const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

type RetryCounterConfig = InternalAxiosRequestConfig & { _transientRetries?: number };

const isTimeoutError = (error: AxiosError): boolean =>
    error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';

const isTransientReadFailure = (error: AxiosError): boolean => {
    const config = error.config;
    if (!config || (config.method ?? 'get').toLowerCase() !== 'get') return false;
    if (isTimeoutError(error)) return true;
    if (!error.response) return error.code === 'ERR_NETWORK';
    return [502, 503, 504].includes(error.response.status);
};

/** Ảnh do hệ thống lưu có dạng "/api/Profile/avatar/..." (đường dẫn tương đối): ghép với địa chỉ máy chủ đang dùng. */
export const resolveAssetUrl = (url?: string | null): string => {
    if (!url) return '';
    return url.startsWith('/') ? `${getActiveApiBaseUrl()}${url}` : url;
};

/** Thông báo tiếng Việt dễ hiểu cho lỗi mạng/timeout; rơi về message của máy chủ nếu có. */
export const getApiErrorMessage = (err: unknown, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): string => {
    const error = err as AxiosError<{ message?: string }>;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error && isTimeoutError(error)) return 'Máy chủ phản hồi chậm (có thể đang khởi động). Vui lòng đợi vài giây rồi thử lại.';
    if (error && !error.response && error.code === 'ERR_NETWORK') return 'Không kết nối được máy chủ. Hãy kiểm tra mạng và thử lại.';
    return fallback;
};

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

// Interceptor response: Nếu Cloud báo không gửi được lệnh MQTT → tự động chuyển tiếp qua Local Backend
apiClient.interceptors.response.use(
    async (response) => {
        const data = response.data as { success?: boolean; message?: string } | undefined;
        if (data?.success === false) {
            try {
                const retried = await retryKioskViaLocal(response.config, data.message);
                if (retried) return retried;
            } catch (retryErr) {
                return Promise.reject(retryErr);
            }
        }
        return response;
    },
    async (error: AxiosError) => {
        const errData = error.response?.data as { message?: string } | undefined;
        const retried = await retryKioskViaLocal(error.config, errData?.message);
        if (retried) return retried;

        // Tự thử lại các lần đọc dữ liệu bị timeout / mất kết nối thoáng qua (tối đa 2 lần).
        const retryConfig = error.config as RetryCounterConfig | undefined;
        if (retryConfig && isTransientReadFailure(error)) {
            const attempt = retryConfig._transientRetries ?? 0;
            if (attempt < RETRY_DELAYS_MS.length) {
                retryConfig._transientRetries = attempt + 1;
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
                return apiClient.request(retryConfig);
            }
        }

        // Backend cục bộ đã tắt: lần sau dò lại nguồn API. Không tự gửi lại request này.
        if (!error.response && error.config?.baseURL === LOCAL_API_URL && resolvedBaseUrl?.url === LOCAL_API_URL) {
            resolvedBaseUrl = null;
        }

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
