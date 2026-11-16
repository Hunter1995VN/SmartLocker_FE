import { useState, useEffect } from 'react';
import { useNetworkStats } from '../../utils/useNetworkStats';
import { Menu, X, Lock, ArrowRight, Zap } from 'lucide-react';
import { openSupport } from '../../utils/contact';
import { useT } from '../../i18n';
import LanguageSwitcher from '../ui/LanguageSwitcher';

type ViewMode = 'login' | 'register' | 'verify-otp' | 'forgot-password';

/**
 * Header Component - Thanh điều hướng chính của trang SmartLocker
 * Cải thiện spacing và visual balance
 */
interface HeaderProps {
    onNavigate?: (mode: ViewMode) => void;
}

const Header = ({ onNavigate }: HeaderProps) => {
    const t = useT();
  const { stations } = useNetworkStats();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#stations', label: t('Tìm trạm gửi tủ') },
    { href: '#how-it-works', label: t('Cách hoạt động') },
    { href: '#pricing', label: t('Kích thước & Bảng giá') },
    { href: '#security', label: t('Bảo mật & Công nghệ') },
    { href: '#customer-reviews', label: t('Đánh giá') },
    { href: '#support', label: t('Hỗ trợ') },
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
          <a href="#" className="flex items-center gap-3 group shrink-0">
 <div className="relative w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center text-white shadow-elevation-1 group-hover:scale-105 group-hover:shadow-elevation-2 transition-all duration-200">
              <Lock className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-on-surface flex items-center gap-2 tracking-tight leading-tight">
                SmartLocker
 <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-tertiary-fixed/30 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                  24/7 Online
                </span>
              </span>
              <span className="text-xs text-secondary leading-tight hidden sm:block">{t('Mạng lưới tủ thông minh')}</span>
            </div>
          </a>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                onClick={link.href === '#support' ? (e) => { e.preventDefault(); openSupport(); } : undefined}
                className="relative px-4 py-2 text-sm font-semibold text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-container-low"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Live Status Pill */}
            <div className="hidden min-[1440px]:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
              </span>
              <span>{stations != null ? t('{n} trạm đang hoạt động', { n: stations }) : t('Trạm đang hoạt động')}</span>
            </div>

            {/* Secondary Sign In */}
            <LanguageSwitcher className="hidden md:inline-flex" />
            <a 
              href="#login"
              className="hidden md:inline-flex text-secondary hover:text-on-surface px-4 py-2 text-sm font-semibold transition-colors rounded-lg hover:bg-surface-container-low"
              onClick={(e) => { e.preventDefault(); onNavigate?.('login'); }}
              role="button"
            >
              {t('Đăng nhập')}
            </a>

            {/* Primary Action CTA */}
            <a 
              href="#booking-widget"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap bg-primary-container hover:bg-on-primary-fixed-variant text-white px-3 sm:px-5 py-2.5 rounded-xl text-sm font-bold shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-200"
              onClick={(e) => { e.preventDefault(); onNavigate?.('register'); }}
              role="button"
            >
              <Zap className="w-4 h-4 hidden sm:block" />
              <span className="sm:hidden">{t('Đặt tủ')}</span>
              <span className="hidden sm:inline">{t('Đặt tủ ngay')}</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            {/* Mobile Menu Toggle Button */}
            <button 
              className="xl:hidden p-2.5 text-on-surface rounded-lg hover:bg-surface-container-low transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? t('Đóng menu') : t('Mở menu')}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {isMobileMenuOpen && (
          <div className="xl:hidden border-t border-outline-variant/30 bg-white px-4 py-4 space-y-2 shadow-elevation-3">
            {/* Status Banner */}
            <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
              </span>
              <span>{stations != null ? t('{n} trạm tủ đang hoạt động', { n: stations }) : t('Mạng lưới trạm tủ đang hoạt động')}</span>
            </div>
            
            {/* Navigation Links */}
            {navLinks.map((link, index) => (
              <a 
                key={index}
                href={link.href}
                className="block px-4 py-3 rounded-xl font-semibold transition-colors text-secondary hover:text-on-surface hover:bg-surface-container-low"
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  if (link.href === '#support') { e.preventDefault(); openSupport(); }
                }}
              >
                {link.label}
              </a>
            ))}
            
            {/* Action Buttons */}
            <div className="pt-3 border-t border-outline-variant/30 flex items-center gap-2">
              <LanguageSwitcher />
              <a 
                href="#login"
                className="flex-1 text-center py-3 rounded-xl border-2 border-outline-variant text-sm font-semibold"
                onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); onNavigate?.('login'); }}
                role="button"
              >
                {t('Đăng nhập')}
              </a>
              <a 
                href="#booking-widget" 
                className="flex-1 text-center py-3 rounded-xl bg-primary-container text-white text-sm font-bold shadow-elevation-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('Đặt tủ ngay')}
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
