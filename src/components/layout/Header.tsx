import { useState, useEffect } from 'react';
import { Menu, X, Lock, ArrowRight, Zap } from 'lucide-react';

type ViewMode = 'login' | 'register' | 'verify-otp' | 'forgot-password';

/**
 * Header Component - Thanh điều hướng chính của trang SmartLocker
 * Cải thiện spacing và visual balance
 */
interface HeaderProps {
    onNavigate?: (mode: ViewMode) => void;
}

const Header = ({ onNavigate }: HeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#stations', label: 'Tìm trạm gửi tủ' },
    { href: '#how-it-works', label: 'Cách hoạt động' },
    { href: '#pricing', label: 'Kích thước & Bảng giá' },
    { href: '#security', label: 'Bảo mật & Công nghệ' },
    { href: '#support', label: 'Hỗ trợ' },
  ];

  return (
    <>
      {/* Sticky Header */}
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-lg border-b border-outline-variant/40 shadow-elevation-2' 
            : 'bg-white/80 backdrop-blur-md border-b border-outline-variant/20'
        }`}
      >
        <div className="w-full px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-between h-[72px]">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-white shadow-elevation-1 group-hover:scale-105 group-hover:shadow-elevation-2 transition-all duration-200">
              <Lock className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-on-surface flex items-center gap-2 tracking-tight leading-tight">
                SmartLocker
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                  24/7 Online
                </span>
              </span>
              <span className="text-xs text-secondary leading-tight hidden sm:block">Mạng lưới tủ thông minh</span>
            </div>
          </a>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link, index) => (
              <a 
                key={index}
                href={link.href}
                className="relative px-4 py-2 text-sm font-semibold text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-container-low"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Live Status Pill */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
              </span>
              <span>Tất cả trạm Online</span>
            </div>

            {/* Language / Currency Switcher */}
            <button 
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant/40 text-secondary hover:text-on-surface hover:bg-surface-container-low transition-all text-xs font-bold"
              aria-label="Đổi ngôn ngữ"
            >
              <span className="text-base leading-none">🇻🇳</span>
              <span>VND</span>
              <span className="text-outline">|</span>
              <span className="text-secondary hover:text-primary">EN</span>
            </button>

            {/* Secondary Sign In */}
            <a 
              href="#login"
              className="hidden md:inline-flex text-secondary hover:text-on-surface px-4 py-2 text-sm font-semibold transition-colors rounded-lg hover:bg-surface-container-low"
              onClick={(e) => { e.preventDefault(); onNavigate?.('login'); }}
              role="button"
            >
              Đăng nhập
            </a>

            {/* Primary Action CTA */}
            <a 
              href="#booking-widget"
              className="inline-flex items-center justify-center gap-2 bg-primary-container hover:bg-primary text-white px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-200"
              onClick={(e) => { e.preventDefault(); onNavigate?.('register'); }}
              role="button"
            >
              <Zap className="w-4 h-4 hidden sm:block" />
              <span>Đặt tủ ngay</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            {/* Mobile Menu Toggle Button */}
            <button 
              className="lg:hidden p-2 text-on-surface rounded-lg hover:bg-surface-container-low transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Mở menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-outline-variant/30 bg-white px-4 py-4 space-y-2 shadow-elevation-3">
            {/* Status Banner */}
            <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
              </span>
              <span>Hệ thống 85+ trạm tủ đang Online sẵn sàng</span>
            </div>
            
            {/* Navigation Links */}
            {navLinks.map((link, index) => (
              <a 
                key={index}
                href={link.href}
                className="block px-4 py-3 rounded-xl font-semibold transition-colors text-secondary hover:text-on-surface hover:bg-surface-container-low"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            
            {/* Action Buttons */}
            <div className="pt-3 border-t border-outline-variant/30 flex gap-2">
              <a 
                href="#login" 
                className="flex-1 text-center py-3 rounded-xl border-2 border-outline-variant text-sm font-semibold"
              >
                Đăng nhập
              </a>
              <a 
                href="#booking-widget" 
                className="flex-1 text-center py-3 rounded-xl bg-primary-container text-white text-sm font-bold shadow-elevation-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Đặt tủ ngay
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
