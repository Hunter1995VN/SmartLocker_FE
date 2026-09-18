import { Lock, Phone, Mail, MapPin, Heart } from 'lucide-react';

/**
 * Footer Component - Footer của trang SmartLocker
 * Cải thiện layout cân bằng
 */
const Footer = () => {
  const footerLinks = {
    locations: [
      { label: 'Bản đồ trạm', href: '#stations' },
      { label: 'Trạng thái mạng lưới', href: '#stations' },
      { label: 'Ga Bến Thành Metro', href: '#stations' },
      { label: 'Sân bay Tân Sơn Nhất', href: '#stations' },
      { label: 'Phố Đi Bộ Nguyễn Huệ', href: '#stations' },
    ],
    services: [
      { label: 'Bảo hiểm hành lý', href: '#pricing' },
      { label: 'Kích thước & Giá', href: '#pricing' },
      { label: 'Kiến trúc bảo mật', href: '#security' },
      { label: 'Hỗ trợ khẩn cấp 24/7', href: '#support' },
      { label: 'Quy trình xử lý quá hạn', href: '#' },
    ],
    legal: [
      { label: 'API & Tích hợp', href: '#' },
      { label: 'Đối tác doanh nghiệp', href: '#' },
      { label: 'Chính sách bảo mật', href: '#' },
      { label: 'Điều khoản dịch vụ', href: '#' },
      { label: 'Hợp tác nhượng quyền', href: '#' },
    ],
  };

  return (
    <>
      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant/40">
        <div className="w-full px-4 md:px-8 py-16 max-w-7xl mx-auto">
          {/* Top Grid: Brand Info + Links Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-outline-variant/30">
            {/* Brand & Mission Statement */}
            <div className="lg:col-span-2 space-y-5">
              {/* Logo */}
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-white shadow-elevation-1">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-on-surface">SmartLocker</span>
              </div>

              {/* Description */}
              <p className="text-sm text-secondary max-w-sm leading-relaxed">
                Hạ tầng mạng lưới tủ gửi đồ tự động thông minh 24/7 hàng đầu Việt Nam. Tích hợp thanh toán số VietQR, mã hóa bảo mật JWS không phụ thuộc internet và bảo hiểm đồ họa toàn diện.
              </p>

              {/* Contact Info */}
              <div className="space-y-2.5 text-sm text-on-surface">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <span>Tổng đài CSKH: <strong>1900 1234</strong> (24/7)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <span>Email: <strong>support@smartlocker.vn</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-secondary">Tòa nhà Innovation Hub, Quận 1, TP.HCM</span>
                </div>
              </div>

              {/* Social Media - Inline SVG */}
              <div className="flex items-center gap-2 pt-2">
                {[
                  { 
                    label: 'Facebook', 
                    svg: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  },
                  { 
                    label: 'YouTube', 
                    svg: <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  },
                  { 
                    label: 'Instagram', 
                    svg: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.053.012 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.988 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                  },
                ].map((social, index) => (
                  <a 
                    key={index}
                    href="#" 
                    className="w-9 h-9 rounded-lg bg-surface-container-low hover:bg-primary-container hover:text-white text-secondary flex items-center justify-center transition-all"
                    aria-label={social.label}
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">{social.svg}</svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4">Vị Trí & Trạm Tủ</h4>
              <ul className="space-y-2.5 text-sm">
                {footerLinks.locations.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href}
                      className="text-secondary hover:text-primary transition-colors inline-flex items-center gap-1 group"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4">Dịch Vụ & An Toàn</h4>
              <ul className="space-y-2.5 text-sm">
                {footerLinks.services.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href}
                      className="text-secondary hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-4">Đối Tác & Pháp Lý</h4>
              <ul className="space-y-2.5 text-sm">
                {footerLinks.legal.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href}
                      className="text-secondary hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Meta & Copyright Row */}
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-secondary">
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
              <span>© 2025 SmartLocker Technologies Inc.</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1">
                Made with <Heart className="w-3 h-3 fill-red-500 text-red-500" /> in Vietnam
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="relative flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
                </span>
                99.98% Uptime
              </span>
              <span className="text-outline">|</span>
              <a className="hover:text-primary transition-colors" href="#">Chính sách bảo mật</a>
              <a className="hover:text-primary transition-colors" href="#">Điều khoản</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
