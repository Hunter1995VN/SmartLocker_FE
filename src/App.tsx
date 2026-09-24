/**
 * SmartLocker - Ứng dụng Frontend
 * Hệ thống quản lý tủ đồ thông minh
 */
import { useState, useEffect } from 'react';
import Homepage from './pages/Homepage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyOtpPage from './pages/auth/VerifyOtpPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import TravelerHomePage from './pages/TravelerHomePage';
import StationBookingPage from './pages/StationBookingPage';
import BookingPaymentPage from './pages/BookingPaymentPage';
import BookingDetailPage from './pages/BookingDetailPage';
import MyBookingsPage from './pages/MyBookingsPage';

/** Các trang có trong hệ thống */
type Page = 'home' | 'login' | 'register' | 'verify-otp' | 'forgot-password' | 'dashboard' | 'map' | 'station-booking' | 'booking-payment' | 'booking-detail' | 'my-bookings';

/** Dữ liệu truyền giữa các trang (ví dụ email khi chuyển register → verify-otp) */
interface PageData {
    email?: string;
    stationId?: string;
    bookingId?: string;
    bookingData?: any;
}

/** Chuyển đổi từ URL Pathname sang mã Page tương ứng */
const pathToPage = (pathname: string): Page => {
    const clean = pathname.replace(/^\//, '').split('?')[0].split('/')[0];
    switch (clean) {
        case '': return 'home';
        case 'login': return 'login';
        case 'register': return 'register';
        case 'verify-otp': return 'verify-otp';
        case 'forgot-password': return 'forgot-password';
        case 'dashboard': return 'dashboard';
        case 'map': return 'map';
        case 'station-booking': return 'station-booking';
        case 'booking-payment': return 'booking-payment';
        case 'booking-detail': return 'booking-detail';
        case 'my-bookings': return 'my-bookings';
        default: return 'home';
    }
};

/** Phân tích query string và dữ liệu từ URL / Session */
const parseQueryAndState = (): PageData => {
    const searchParams = new URLSearchParams(window.location.search);
    const stationId = searchParams.get('stationId') || undefined;
    const bookingId = searchParams.get('bookingId') || undefined;
    const email = searchParams.get('email') || undefined;

    let bookingData = undefined;
    try {
        const cached = sessionStorage.getItem('smartlocker_booking_data');
        if (cached) bookingData = JSON.parse(cached);
    } catch {}

    return {
        stationId: stationId || bookingData?.stationId,
        bookingId,
        email,
        bookingData,
    };
};

function App() {
    const savedUser = localStorage.getItem('smartlocker_user');

    // Xác định trang khởi tạo trực tiếp từ URL trên thanh địa chỉ trình duyệt
    const getInitialPage = (): Page => {
        const pageFromUrl = pathToPage(window.location.pathname);
        if (pageFromUrl !== 'home') {
            if (['dashboard', 'my-bookings'].includes(pageFromUrl) && !savedUser) {
                return 'login';
            }
            return pageFromUrl;
        }
        return savedUser ? 'dashboard' : 'home';
    };

    const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);
    const [pageData, setPageData] = useState<PageData>(parseQueryAndState);

    // Đồng bộ URL ngay lần đầu nếu truy cập root '/' khi đã đăng nhập
    useEffect(() => {
        if (window.location.pathname === '/' && savedUser) {
            window.history.replaceState({ page: 'dashboard' }, '', '/dashboard');
        }
    }, [savedUser]);

    // Lắng nghe sự kiện người dùng bấm Back / Forward (mũi tên quay lại / tiến tới trên trình duyệt)
    useEffect(() => {
        const handlePopState = () => {
            const page = pathToPage(window.location.pathname);
            const data = parseQueryAndState();
            setCurrentPage(page);
            setPageData(data);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    /** Chuyển trang và thay đổi URL thật trên trình duyệt (chuẩn web 100%) */
    const navigateTo = (page: Page, data: PageData = {}) => {
        let targetUrl = page === 'home' ? '/' : `/${page}`;
        const params = new URLSearchParams();
        if (data.stationId) params.set('stationId', data.stationId);
        if (data.bookingId) params.set('bookingId', data.bookingId);
        if (data.email) params.set('email', data.email);
        const queryString = params.toString();
        if (queryString) targetUrl += `?${queryString}`;

        // Cập nhật URL trên thanh địa chỉ mà không reload trang (HTML5 History API)
        window.history.pushState({ page, data }, '', targetUrl);

        setPageData(data);
        setCurrentPage(page);

        if (data.bookingData) {
            try {
                sessionStorage.setItem('smartlocker_booking_data', JSON.stringify(data.bookingData));
            } catch {}
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLogout = () => {
        try {
            sessionStorage.removeItem('smartlocker_booking_data');
            localStorage.removeItem('smartlocker_user');
            localStorage.removeItem('smartlocker_token');
        } catch {}
        navigateTo('home');
    };

    return (
        <>
            {currentPage === 'home' && (
                <Homepage onNavigate={(mode) => {
                    if (mode === 'login') navigateTo('login');
                    else if (mode === 'register') navigateTo('register');
                }} />
            )}

            {currentPage === 'login' && (
                <LoginPage onNavigate={(mode, data) => {
                    if (mode === 'dashboard' as Page) navigateTo('dashboard');
                    else navigateTo(mode as Page, data);
                }} onLoginSuccess={() => navigateTo('dashboard')} />
            )}

            {currentPage === 'register' && (
                <RegisterPage onNavigate={(mode, data) => {
                    if (mode === 'dashboard' as Page) navigateTo('dashboard');
                    else navigateTo(mode as Page, data);
                }} onLoginSuccess={() => navigateTo('dashboard')} />
            )}

            {currentPage === 'verify-otp' && pageData.email && (
                <VerifyOtpPage email={pageData.email} onNavigate={(mode, data) => navigateTo(mode as Page, data)} />
            )}

            {currentPage === 'forgot-password' && (
                <ForgotPasswordPage onNavigate={(mode, data) => navigateTo(mode as Page, data)} />
            )}

            {currentPage === 'dashboard' && (
                <DashboardPage
                    onLogout={handleLogout}
                    onNavigateToMap={() => navigateTo('map')}
                />
            )}

            {currentPage === 'map' && (
                <TravelerHomePage
                    onLogout={handleLogout}
                    onNavigateLogin={() => navigateTo('login')}
                    onNavigateRegister={() => navigateTo('register')}
                    onNavigateDashboard={() => navigateTo('dashboard')}
                    onNavigateBooking={(stationId) => navigateTo('station-booking', { stationId })}
                />
            )}

            {currentPage === 'station-booking' && (
                <StationBookingPage
                    onNavigate={(mode, data) => navigateTo(mode as Page, data)}
                    stationId={pageData.stationId || pageData.bookingData?.stationId}
                    initialBookingData={pageData.bookingData}
                />
            )}

            {currentPage === 'booking-payment' && (
                <BookingPaymentPage
                    onNavigate={(mode, data) => navigateTo(mode as Page, data)}
                    bookingData={pageData.bookingData}
                />
            )}

            {currentPage === 'booking-detail' && (
                <BookingDetailPage
                    onNavigate={(mode, data) => navigateTo(mode as Page, data)}
                    bookingId={pageData.bookingId}
                    bookingData={pageData.bookingData}
                />
            )}

            {currentPage === 'my-bookings' && (
                <MyBookingsPage
                    onNavigate={(mode, data) => navigateTo(mode as Page, data)}
                />
            )}
        </>
    );
}

export default App;

