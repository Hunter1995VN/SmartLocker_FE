import { ArrowRight } from 'lucide-react';

/**
 * CTABanner Component - Phần banner kêu gọi hành động cuối trang
 * Cải thiện visual với better balance
 */
interface CTABannerProps {
    onNavigate?: (mode: 'login' | 'register' | 'verify-otp' | 'forgot-password') => void;
}

const CTABanner = ({ onNavigate }: CTABannerProps) => {
  return (
    <>
      {/* CTA Banner Section */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-primary to-primary-fixed-dim"></div>
        
        {/* Decorative elements */}
        <div className="absolute -right-40 -top-40 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-40 -bottom-40 w-[500px] h-[500px] bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 dot-pattern opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: CTA Content */}
            <div className="lg:col-span-8 text-white">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold mb-5">
                <span>✈️</span>
                <span>Tận Hưởng Kỳ Nghỉ Trọn Vẹn</span>
              </div>

              {/* Headline */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-5 leading-tight text-balance">
                Sẵn sàng du lịch và công tác không vướng bận?
              </h2>

              {/* Description */}
              <p className="text-base md:text-lg text-white/85 max-w-2xl leading-relaxed mb-8">
                Trải nghiệm phong cách du lịch nhẹ nhàng thông minh cùng SmartLocker ngay hôm nay. Đặt tủ trước để giữ chỗ tại các trạm đông khách nhất.
              </p>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8 max-w-xl">
                <div>
                  <div className="text-2xl md:text-3xl font-bold">85+</div>
                  <div className="text-xs text-white/70 mt-1">Trạm tủ</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold">450+</div>
                  <div className="text-xs text-white/70 mt-1">Ô tủ</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold">24/7</div>
                  <div className="text-xs text-white/70 mt-1">Hoạt động</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a 
                  href="#booking-widget"
                  className="px-8 py-4 bg-white hover:bg-surface-bright text-primary rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-elevation-3 hover:shadow-elevation-4 transition-all active:scale-[0.98] cursor-pointer"
                  onClick={(e) => { e.preventDefault(); onNavigate?.('register'); }}
                  role="button"
                >
                  <span>🚀 Tìm trạm & Đặt tủ ngay</span>
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a 
                  href="#how-it-works"
                  className="px-6 py-4 rounded-xl border-2 border-white/40 hover:bg-white/10 text-white text-base font-semibold text-center transition-all"
                >
                  Xem video hướng dẫn 60s
                </a>
              </div>
            </div>

            {/* Right: PWA QR Box */}
            <div className="lg:col-span-4">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 text-center shadow-elevation-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white/80 block mb-3">
                  Lưu Nhanh SmartLocker PWA
                </span>
                
                {/* QR Code Placeholder */}
                <div className="w-40 h-40 mx-auto bg-white p-3 rounded-2xl shadow-elevation-4 mb-4 flex items-center justify-center">
                  <svg className="w-full h-full text-on-surface" viewBox="0 0 100 100" fill="none">
                    {/* Decorative QR-like pattern */}
                    <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                    <rect x="5" y="5" width="20" height="20" fill="white" />
                    <rect x="10" y="10" width="10" height="10" fill="currentColor" />
                    <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                    <rect x="75" y="5" width="20" height="20" fill="white" />
                    <rect x="80" y="10" width="10" height="10" fill="currentColor" />
                    <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                    <rect x="5" y="75" width="20" height="20" fill="white" />
                    <rect x="10" y="80" width="10" height="10" fill="currentColor" />
                    <rect x="40" y="10" width="8" height="8" fill="currentColor" />
                    <rect x="52" y="10" width="8" height="8" fill="currentColor" />
                    <rect x="40" y="22" width="8" height="8" fill="currentColor" />
                    <rect x="52" y="34" width="8" height="8" fill="currentColor" />
                    <rect x="40" y="46" width="8" height="8" fill="currentColor" />
                    <rect x="52" y="46" width="8" height="8" fill="currentColor" />
                    <rect x="64" y="46" width="8" height="8" fill="currentColor" />
                    <rect x="76" y="46" width="8" height="8" fill="currentColor" />
                    <rect x="88" y="46" width="8" height="8" fill="currentColor" />
                    <rect x="40" y="58" width="8" height="8" fill="currentColor" />
                    <rect x="64" y="58" width="8" height="8" fill="currentColor" />
                    <rect x="40" y="70" width="8" height="8" fill="currentColor" />
                    <rect x="52" y="70" width="8" height="8" fill="currentColor" />
                    <rect x="64" y="70" width="8" height="8" fill="currentColor" />
                    <rect x="76" y="82" width="8" height="8" fill="currentColor" />
                  </svg>
                </div>
                
                <p className="text-sm text-white/85 leading-relaxed">
                  Quét mã bằng camera điện thoại để lưu SmartLocker lên màn hình chính mà không cần cài đặt App.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default CTABanner;
