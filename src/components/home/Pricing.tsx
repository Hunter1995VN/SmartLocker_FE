import { Check, Star, Ruler, Shield, Battery, ShieldCheck, Award, Tag } from 'lucide-react';

/**
 * Pricing Component - Phần hiển thị kích cỡ tủ và bảng giá
 * Cải thiện visual hierarchy và spacing
 */
const Pricing = () => {
  const sizes = [
    {
      code: 'S',
      name: 'Size S',
      subtitle: '(Nhỏ)',
      category: 'Balo & Túi Xách',
      codeName: 'S-BAY',
      description: 'Phù hợp balo laptop, túi xách du lịch, túi đồ mua sắm',
      dimensions: '45 × 35 × 50 cm',
      price: 10000,
      priceDay: 70000,
      insurance: '10.000.000đ',
      capacity: '1 balo lớn + 1 túi xách phụ kiện',
      features: [
        'Bảo hiểm bồi thường 10.000.000đ',
        'Mở tủ không giới hạn số lần',
        'Khóa điện tử solenoid bảo mật',
      ],
      popular: false,
      color: 'blue',
    },
    {
      code: 'M',
      name: 'Size M',
      subtitle: '(Tiêu Chuẩn)',
      category: 'Vali Cabin 20"',
      codeName: 'M-BAY',
      description: 'Vali xách tay máy bay 20 inch, balo phượt cỡ lớn',
      dimensions: '60 × 45 × 60 cm',
      price: 20000,
      priceDay: 140000,
      insurance: '20.000.000đ',
      capacity: '1 vali xách tay 20" + áo khoác, quà lưu niệm',
      features: [
        'Cổng sạc pin dự phòng tích hợp trong tủ',
        'Bảo hiểm bồi thường 20.000.000đ',
        'Mở tủ không giới hạn số lần',
        'Cảm biến chống cạy cửa 24/7',
      ],
      popular: true,
      color: 'primary',
    },
    {
      code: 'L',
      name: 'Size L',
      subtitle: '(Cực Đại)',
      category: 'Vali Lớn Ký Gửi',
      codeName: 'L-BAY',
      description: 'Vali ký gửi 28-32 inch hoặc nhóm bạn gửi chung 2-3 kiện',
      dimensions: '85 × 50 × 70 cm',
      price: 30000,
      priceDay: 210000,
      insurance: '20.000.000đ',
      capacity: '1 vali lớn 28" + 1 balo kéo hoặc 2 vali cỡ vừa',
      features: [
        'Bảo hiểm bồi thường 20.000.000đ',
        'Mở tủ không giới hạn số lần',
        'Phù hợp nhóm 3-4 người',
      ],
      popular: false,
      color: 'indigo',
    },
  ];

  const guarantees = [
    { icon: ShieldCheck, text: 'Khóa điện tử Solenoid chịu lực cao' },
    { icon: Shield, text: 'Cảm biến chống cạy cửa 24/7' },
    { icon: Award, text: 'Tặng kèm bảo hiểm bồi hoàn tới 20 triệu' },
    { icon: Battery, text: 'Hỗ trợ kỹ thuật từ xa 24/7 tức thì' },
  ];

  return (
    <>
      {/* Pricing Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-surface to-surface-container-lowest" id="pricing">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-3 px-3 py-1.5 rounded-full bg-primary-container/10 border border-primary/20">
              <Tag className="w-3.5 h-3.5" />
              Chi Phí Hợp Lý
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight leading-tight mb-4 text-balance">
              Kích Cỡ Tủ & <span className="text-gradient">Bảng Giá Minh Bạch</span>
            </h2>
            <p className="text-base sm:text-lg text-secondary max-w-2xl mx-auto">
              Tính tiền theo giờ linh hoạt, không phụ phí ẩn, tích hợp bảo hiểm hành lý miễn phí theo từng đơn đặt.
            </p>
          </div>

          {/* Pricing Columns Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {sizes.map((size) => (
              <div 
                key={size.code}
                className={`relative rounded-3xl flex flex-col transition-all duration-300 ${
                  size.popular 
                    ? 'bg-white border-2 border-primary-container shadow-elevation-4 lg:scale-105 lg:-mt-4 lg:mb-4 z-10' 
                    : 'bg-white border border-outline-variant/40 shadow-elevation-1 hover:shadow-elevation-3 hover:-translate-y-1'
                }`}
              >
                {/* Popular Badge */}
                {size.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-primary-container to-primary text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-elevation-2 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-white" />
                      Phổ biến nhất
                    </div>
                  </div>
                )}

                <div className={`p-7 ${size.popular ? 'pt-10' : ''}`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      size.popular 
                        ? 'bg-primary-container text-white' 
                        : 'bg-surface-container-low text-secondary'
                    }`}>
                      {size.category}
                    </span>
                    <span className="text-xs font-mono text-secondary">{size.codeName}</span>
                  </div>

                  {/* Title */}
                  <div className="mb-2">
                    <h3 className="text-2xl font-bold text-on-surface">
                      {size.name} <span className="text-secondary font-medium">{size.subtitle}</span>
                    </h3>
                    <p className="text-sm text-secondary mt-2 leading-relaxed">{size.description}</p>
                  </div>

                  {/* Price */}
                  <div className={`my-6 py-5 border-y ${size.popular ? 'border-primary/20 bg-primary-container/5 -mx-7 px-7' : 'border-outline-variant/30'}`}>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold ${size.popular ? 'text-primary' : 'text-on-surface'}`}>
                        {size.price.toLocaleString()}đ
                      </span>
                      <span className="text-base text-secondary">/ giờ</span>
                    </div>
                    <p className="text-xs text-secondary mt-1">
                      hoặc gói trọn ngày <strong className="text-on-surface">{size.priceDay.toLocaleString()}đ</strong>/24h
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-semibold">Tiết kiệm 30%</span>
                      <span className="text-secondary">khi đặt trọn ngày</span>
                    </div>
                  </div>

                  {/* Dimensions Badge */}
                  <div className={`rounded-xl p-3.5 mb-6 flex items-center gap-3 ${
                    size.popular 
                      ? 'bg-primary-container/10 border border-primary/20' 
                      : 'bg-surface-container-low border border-outline-variant/30'
                  }`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      size.popular ? 'bg-primary-container text-white' : 'bg-white text-primary'
                    }`}>
                      <Ruler className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={`text-xs ${size.popular ? 'text-primary font-semibold' : 'text-secondary'}`}>
                        Kích thước (C × R × S)
                      </div>
                      <div className="text-sm font-bold text-on-surface">{size.dimensions}</div>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="mb-5">
                    <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Sức chứa</h4>
                    <p className="text-sm text-on-surface">{size.capacity}</p>
                  </div>

                  {/* Features list */}
                  <div className="mb-8">
                    <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Quyền lợi bao gồm</h4>
                    <ul className="space-y-2.5">
                      {size.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2.5 text-sm text-on-surface">
                          <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                            size.popular ? 'bg-primary-container text-white' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="p-7 pt-0">
                  <button 
                    className={`w-full py-4 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2 ${
                      size.popular 
                        ? 'bg-primary-container hover:bg-primary text-white shadow-elevation-2 hover:shadow-elevation-3' 
                        : 'bg-white hover:bg-primary-container text-primary hover:text-white border-2 border-primary'
                    }`}
                  >
                    Chọn {size.name}
                  </button>
                  <p className="text-xs text-center text-secondary mt-3">
                    Thanh toán linh hoạt • Hủy miễn phí trước 2h
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust & Hardware Guarantees Row */}
          <div className="mt-16 bg-white rounded-2xl border border-outline-variant/30 p-6 md:p-8 shadow-elevation-1">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-on-surface">Cam kết chất lượng phần cứng & dịch vụ</h3>
              <p className="text-sm text-secondary mt-1">Mọi trạm SmartLocker đều đạt chuẩn an toàn quốc tế</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {guarantees.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary-container/10 text-primary flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-on-surface leading-tight">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Pricing;
