import { Smartphone, QrCode, LockOpen, MousePointerClick, ArrowRight } from 'lucide-react';

/**
 * HowItWorks Component - Phần hướng dẫn 3 bước sử dụng dịch vụ
 * Cải thiện visual balance với connecting line
 */
const HowItWorks = () => {
  const steps = [
    {
      icon: Smartphone,
      step: 'BƯỚC 01',
      title: 'Đặt tủ online trong 30s',
      description: 'Truy cập website hoặc app, chọn trạm gần nhất, chọn kích cỡ tủ và thanh toán quét mã VietQR tự động xác nhận tức thì.',
      highlighted: false,
      color: 'blue',
    },
    {
      icon: QrCode,
      step: 'BƯỚC 02',
      title: 'Nhận vé số hóa JWS tức thì',
      description: 'Mã QR kèm PIN dự phòng được cấp tự động. Công nghệ chữ ký số JWS mã hóa bảo mật chống sao chép và giả mạo.',
      highlighted: true,
      color: 'primary',
    },
    {
      icon: LockOpen,
      step: 'BƯỚC 03',
      title: 'Quét mã mở tủ tại trạm',
      description: 'Đến trạm tủ thông minh, giơ mã QR trước camera Kiosk iPad. Cửa tủ tương ứng sẽ tự động bật mở ngay tức khắc.',
      highlighted: false,
      color: 'emerald',
    },
  ];

  return (
    <>
      {/* How It Works Section */}
      <section className="py-20 md:py-28 bg-white" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-3 px-3 py-1.5 rounded-full bg-primary-container/10 border border-primary/20">
              <MousePointerClick className="w-3.5 h-3.5" />
              Tiện Lợi Tối Đa
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight leading-tight mb-4 text-balance">
              Quy Trình Gửi Đồ <span className="text-gradient">3 Bước Dễ Dàng</span>
            </h2>
            <p className="text-base sm:text-lg text-secondary">
              Không cần xếp hàng, không cần tiền mặt, không lo mất chìa khóa vật lý.
            </p>
          </div>

          {/* Steps Grid with Connecting Line */}
          <div className="relative">
            {/* Connecting Dashed Line - Desktop only */}
            <div className="hidden md:block absolute top-[88px] left-[16%] right-[16%] h-0.5 z-0">
              <div className="w-full h-full border-t-2 border-dashed border-primary-container/40"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className="relative z-10"
                >
                  {/* Step Card */}
                  <div className={`rounded-3xl p-7 border transition-all h-full flex flex-col ${
                    step.highlighted 
                      ? 'bg-gradient-to-br from-primary-container/5 via-white to-primary-container/10 border-2 border-primary-container/40 shadow-elevation-3' 
                      : 'bg-white border border-outline-variant/40 shadow-elevation-1 hover-lift'
                  }`}>
                    {/* Step Number Circle */}
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-elevation-2 relative ${
                        step.highlighted 
                          ? 'bg-gradient-to-br from-primary-container to-primary text-white' 
                          : 'bg-primary-container/10 text-primary'
                      }`}>
                        <step.icon className="w-9 h-9" />
                        {step.highlighted && (
                          <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-amber-900 text-xs font-bold flex items-center justify-center border-2 border-white shadow-elevation-1">
                            ★
                          </span>
                        )}
                      </div>
                      <div className={`text-5xl font-bold ${
                        step.highlighted ? 'text-primary-container/30' : 'text-outline-variant/40'
                      }`}>
                        0{index + 1}
                      </div>
                    </div>

                    {/* Step Badge */}
                    <div className={`inline-block self-start px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider mb-3 ${
                      step.highlighted 
                        ? 'bg-primary-container text-white' 
                        : 'bg-surface-container-low text-secondary'
                    }`}>
                      {step.step}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-on-surface mb-3 leading-tight">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-secondary leading-relaxed flex-1">
                      {step.description}
                    </p>

                    {/* Footer hint */}
                    {index < steps.length - 1 && (
                      <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-primary-container items-center justify-center z-20">
                        <ArrowRight className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12">
            <a 
              href="#booking-widget" 
              className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
            >
              Bắt đầu đặt tủ ngay
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </>
  );
};

export default HowItWorks;
