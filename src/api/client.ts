import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Cấu hình Axios client gọi API Backend.
 * - Base URL tự động chuyển theo môi trường dev/prod
 * - Tự động đính kèm JWT trong header Authorization nếu đã đăng nhập
 */

// Cho dev: backend chạy trên cổng 5000 (mặc định của ASP.NET Core)
// Frontend ở port 5173/5174 → Gọi qua proxy hoặc URL trực tiếp
const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000';

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

// Interceptor: Tự động đính kèm Bearer Token trên MỌI request
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
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
    (response) => response,
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
