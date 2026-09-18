import { Lock, Shield, WifiOff, CreditCard, RefreshCw, ShieldCheck, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

/**
 * Security Component - Phần giới thiệu tính năng bảo mật và công nghệ
 * Bento grid layout cải thiện cân bằng visual
 */
const Security = () => {
  const securityFeatures = [
    {
      icon: WifiOff,
      title: 'Mở tủ Offline độc quyền',
      subtitle: 'Kể cả khi mất kết nối Internet',
      description: 'Trạm tủ thông minh tích hợp chip vi xử lý nhúng lưu trữ Public Key Cryptographic cục bộ. Khi điện thoại bạn mất mạng 4G/WiFi hoặc trạm bị nghẽn mạng, thuật toán JWS (JSON Web Signature) vẫn giải mã token và mở tủ ngay lập tức trong 0.5s.',
      badge: 'Bản quyền công nghệ',
      badgeColor: 'emerald',
      footer: { left: 'CHỮ KÝ MẬT MÃ ED25519', right: 'HOẠT ĐỘNG 100% OFFLINE' },
      stats: { value: '0.5s', label: 'Tốc độ mở tủ offline' },
      colSpan: 'lg:col-span-7',
      gradient: 'bg-gradient-to-br from-primary-container via-primary to-primary',
      textOnDark: true,
    },
    {
      icon: Shield,
      title: 'Giám sát an ninh 24/7',
      description: 'Cảm biến hồng ngoại phát hiện vật thể bên trong ô tủ, ngăn chặn tình trạng quên đồ. Cảm biến gia tốc rung chấn cảnh báo lập tức nếu có tác động cạy phá.',
      footer: { icon: AlertCircle, text: 'Kết nối trực tiếp trung tâm bảo vệ khu vực', textColor: 'text-primary' },
      colSpan: 'lg:col-span-5',
      gradient: null,
    },
    {
      icon: CreditCard,
      title: 'Thanh toán VietQR Napas',
      description: 'Tích hợp cổng thanh toán ngân hàng quốc gia. Tự động xác thực giao dịch sau 2 giây.',
      footer: { banks: ['Vietcombank', 'Techcombank', 'MBBank', 'Apple Pay'] },
      colSpan: 'lg:col-span-5',
      gradient: null,
    },
    {
      icon: RefreshCw,
      title: 'Hoàn tiền 100% tự động',
      description: 'Kế hoạch chuyến đi bị thay đổi? Bạn được phép hủy đặt chỗ trước 2 giờ và nhận hoàn tiền 100% tự động.',
      footer: { icon: ShieldCheck, text: 'Cam kết minh bạch tài chính tuyệt đối', textColor: 'text-emerald-700' },
      colSpan: 'lg:col-span-7',
      gradient: 'bg-gradient-to-br from-emerald-50 via-white to-blue-50',
      stats: { value: '100%', label: 'Hoàn tiền nếu hủy trước 2h' },
    },
  ];

  return (
    <>
      {/* Security Section */}
      <section className="py-20 md:py-28 bg-surface-container-low" id="security">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-3 px-3 py-1.5 rounded-full bg-primary-container/10 border border-primary/20">
              <Lock className="w-3.5 h-3.5" />
              Chuẩn Mực Enterprise
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight leading-tight mb-4 text-balance">
              Bảo Mật & <span className="text-gradient">Công Nghệ Đi Đầu</span>
            </h2>
            <p className="text-base sm:text-lg text-secondary">
              Được thiết kế theo tiêu chuẩn an ninh phần cứng và mật mã học hiện đại nhất.
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Card 1: Large (col-span-7) - Offline Token */}
            <div className={`lg:col-span-7 bg-gradient-to-br from-primary-container via-primary to-primary rounded-3xl p-8 md:p-10 shadow-elevation-3 flex flex-col justify-between text-white relative overflow-hidden`}>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-24 -translate-x-24"></div>
              
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center mb-6 shadow-elevation-2">
                  <WifiOff className="w-7 h-7" />
                </div>

                {/* Badge */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-100 text-xs font-bold mb-4">
                  <Sparkles className="w-3 h-3" />
                  Bản quyền công nghệ
                </span>

                {/* Title */}
                <h3 className="text-2xl md:text-3xl font-bold mt-2 mb-3 leading-tight">
                  Mở tủ Offline độc quyền — Kể cả khi mất kết nối Internet
                </h3>

                {/* Description */}
                <p className="text-white/80 leading-relaxed text-sm md:text-base mb-6">
                  Trạm tủ thông minh tích hợp chip vi xử lý nhúng lưu trữ Public Key Cryptographic cục bộ. Khi điện thoại bạn mất mạng 4G/WiFi hoặc trạm bị nghẽn mạng, thuật toán JWS (JSON Web Signature) vẫn giải mã token và mở tủ ngay lập tức trong 0.5s.
                </p>
              </div>

              {/* Footer */}
              <div className="relative z-10 mt-6 pt-6 border-t border-white/20 flex items-center justify-between text-xs font-mono flex-wrap gap-2">
                <span className="text-white/70">CHỮ KÝ MẬT MÃ ED25519</span>
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  HOẠT ĐỘNG 100% OFFLINE
                </span>
              </div>
            </div>

            {/* Card 2: (col-span-5) - Sensors 24/7 */}
            <div className={`lg:col-span-5 bg-white rounded-3xl p-8 border border-outline-variant/40 shadow-elevation-1 hover-lift flex flex-col justify-between`}>
              <div>
                <div className="w-14 h-14 rounded-2xl bg-primary-container/10 text-primary flex items-center justify-center mb-6">
                  <Shield className="w-7 h-7" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-on-surface mb-3 leading-tight">
                  Giám sát an ninh cảm biến 24/7
                </h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Cảm biến hồng ngoại phát hiện vật thể bên trong ô tủ, ngăn chặn tình trạng quên đồ. Cảm biến gia tốc rung chấn cảnh báo lập tức nếu có tác động cạy phá.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-outline-variant/30 flex items-center gap-2 text-sm font-bold text-primary">
                <AlertCircle className="w-4 h-4" />
                <span>Kết nối trực tiếp trung tâm bảo vệ khu vực</span>
              </div>
            </div>

            {/* Card 3: (col-span-5) - VietQR */}
            <div className={`lg:col-span-5 bg-white rounded-3xl p-8 border border-outline-variant/40 shadow-elevation-1 hover-lift flex flex-col justify-between`}>
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                  <CreditCard className="w-7 h-7" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-on-surface mb-3 leading-tight">
                  Thanh toán tức thì VietQR Napas
                </h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Tích hợp cổng thanh toán ngân hàng quốc gia. Tự động xác thực giao dịch sau 2 giây bằng chuyển khoản Mobile Banking.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-outline-variant/30">
                <div className="text-xs text-secondary mb-2 font-semibold uppercase tracking-wider">Hỗ trợ</div>
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  {['Vietcombank', 'Techcombank', 'MBBank', 'Apple Pay'].map((bank, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-surface-container-low text-on-surface font-semibold text-xs">
                      {bank}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 4: Large (col-span-7) - Refund */}
            <div className={`lg:col-span-7 bg-gradient-to-br from-emerald-50 via-white to-blue-50 rounded-3xl p-8 md:p-10 border border-emerald-200/50 shadow-elevation-1 flex flex-col justify-between relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-200/30 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-6 shadow-elevation-2">
                  <RefreshCw className="w-7 h-7" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-on-surface mb-3 leading-tight">
                  Chính sách hoàn tiền 100% tự động
                </h3>
                <p className="text-secondary leading-relaxed text-sm md:text-base mb-6">
                  Kế hoạch chuyến đi bị thay đổi? Bạn được phép hủy đặt chỗ trước 2 giờ và nhận hoàn tiền 100% tự động về tài khoản ngân hàng ban đầu mà không tốn bất kỳ khoản phí phạt nào.
                </p>
              </div>
              <div className="relative z-10 mt-6 pt-4 border-t border-emerald-200/50 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cam kết minh bạch tài chính tuyệt đối</span>
                </div>
                <a href="#" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                  Tìm hiểu thêm
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Security;
