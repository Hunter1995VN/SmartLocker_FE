/**
 * SmartLocker - Ứng dụng Frontend
 * Hệ thống quản lý tủ đồ thông minh
 */
import { useState } from 'react';
import Homepage from './pages/Homepage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyOtpPage from './pages/auth/VerifyOtpPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import TravelerHomePage from './pages/TravelerHomePage';
import StationBookingPage from './pages/StationBookingPage';

/** Các trang có trong hệ thống */
type Page = 'home' | 'login' | 'register' | 'verify-otp' | 'forgot-password' | 'dashboard' | 'map' | 'station-booking';

/** Dữ liệu truyền giữa các trang (ví dụ email khi chuyển register → verify-otp) */
interface PageData {
    email?: string;
    stationId?: string;
}

function App() {
    // Nếu đã có token trong localStorage → vào thẳng dashboard
    const savedUser = localStorage.getItem('smartlocker_user');
    const [currentPage, setCurrentPage] = useState<Page>(savedUser ? 'dashboard' : 'home');
    const [pageData, setPageData] = useState<PageData>({});

    /** Chuyển trang, có thể truyền kèm data */
    const navigateTo = (page: Page, data: PageData = {}) => {
        setPageData(data);
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                    onLogout={() => navigateTo('home')}
                    onNavigateToMap={() => navigateTo('map')}
                />
            )}

            {currentPage === 'map' && (
                <TravelerHomePage
                    onLogout={() => navigateTo('home')}
                    onNavigateLogin={() => navigateTo('login')}
                    onNavigateRegister={() => navigateTo('register')}
                    onNavigateDashboard={() => navigateTo('dashboard')}
                />
            )}

            {currentPage === 'station-booking' && (
                <StationBookingPage
                    onNavigate={(mode, data) => navigateTo(mode as Page, data)}
                    stationId={pageData.stationId}
                />
            )}
        </>
    );
}

export default App;

