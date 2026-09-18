import { useState } from 'react';
import { MapPin, Clock, Package, Search, Zap, Shield, Wifi, RotateCw, ChevronDown, QrCode, Sparkles, MapPinned } from 'lucide-react';

/**
 * Hero Component - Phần Hero chính của trang với Booking Widget
 * Được thiết kế lại với spacing và visual hierarchy cân bằng hơn
 */
const Hero = () => {
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedStation, setSelectedStation] = useState('');

  const stations = [
    'Ga Bến Thành, Sài Gòn (Metro Tuyến 1)',
    'Sân bay Quốc tế Tân Sơn Nhất (Ga T1)',
    'Phố Đi Bộ Nguyễn Huệ (Trạm Ngô Đức Kế)',
    'Ga Sài Gòn (Đường Nguyễn Thông)',
    'Chợ Bến Thành (Cửa Tây Phan Chu Trinh)',
    'Ga Đà Nẵng (Hải Châu, Đà Nẵng)',
    'Phố Cổ Hà Nội (Đinh Tiên Hoàng - Hồ Gươm)',
  ];

  const lockerSizes = [
    { 
      code: 'S', 
      name: 'Size S', 
      desc: 'Balo / Túi xách',
      selected: selectedSize === 'S',
      onClick: () => setSelectedSize('S')
    },
    { 
      code: 'M', 
      name: 'Size M', 
      desc: 'Vali 20" cabin',
      selected: selectedSize === 'M',
      onClick: () => setSelectedSize('M'),
      popular: true
    },
    { 
      code: 'L', 
      name: 'Size L', 
      desc: 'Vali lớn 28"',
      selected: selectedSize === 'L',
      onClick: () => setSelectedSize('L')
    },
  ];

  const valueProps = [
    { icon: Zap, text: 'Nhận tủ trong 30s', color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: Shield, text: 'Bảo hiểm 100% đồ đạc', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Wifi, text: 'Mở tủ Offline chuẩn JWS', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: RotateCw, text: 'Hoàn tiền linh hoạt', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const handleSearch = () => {
    console.log('Searching for:', { station: selectedStation, size: selectedSize });
  };

  return (
    <>
      {/* Hero Section - Improved */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden bg-gradient-to-b from-surface-bright via-background to-background">
        {/* Layered Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-primary/8 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-primary-container/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute inset-0 grid-pattern opacity-30 -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Top Badges & Main Copy */}
          <div className="max-w-3xl mx-auto text-center mb-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-primary/20 text-primary mb-6 shadow-elevation-1 hover-lift">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Mạng lưới tủ hành lý thông minh số 1 tại Việt Nam</span>
            </div>
            
            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-on-surface tracking-tight mb-6 leading-[1.1] text-balance">
              Gửi Hành Lý Thông Minh 24/7 — <br className="hidden sm:inline"/>
              <span className="text-gradient">Tự Do Khám Phá</span> Từng Góc Phố
            </h1>
            
            {/* Subtitle */}
            <p className="text-base sm:text-lg text-secondary max-w-2xl mx-auto leading-relaxed mb-8">
              Đặt tủ trực tuyến chỉ trong <strong className="text-primary font-semibold">30 giây</strong>. Quét mã QR mở tủ tại ga tàu metro, phố đi bộ và sân bay. An toàn tuyệt đối, mở khóa tức thì kể cả khi mất kết nối Internet.
            </p>

            {/* Value Props Pill Row */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {valueProps.map((prop, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-outline-variant/40 text-on-surface text-sm font-semibold shadow-elevation-1 hover-lift"
                >
                  <span className={`w-5 h-5 rounded-md ${prop.bg} flex items-center justify-center`}>
                    <prop.icon className={`w-3 h-3 ${prop.color}`} />
                  </span>
                  {prop.text}
                </span>
              ))}
            </div>
          </div>

          {/* Floating Quick Booking & Search Bar Widget */}
          <div 
            className="max-w-6xl mx-auto bg-white rounded-3xl border border-outline-variant/50 shadow-elevation-4 p-6 md:p-8 relative z-20 hover-lift"
            id="booking-widget"
          >
            <div className="flex items-center gap-2 mb-5">
              <MapPinned className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-on-surface">Tìm tủ trống gần bạn</h2>
              <span className="text-xs text-secondary">(theo vị trí thời gian thực)</span>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 items-end" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
              {/* Input 1: Location Dropdown */}
              <div className="md:col-span-4 flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Chọn trạm gửi
                </label>
                <div className="relative">
                  <select 
                    className="w-full h-14 bg-surface-container-low/40 border border-outline-variant/60 rounded-xl px-4 pr-10 text-on-surface text-sm font-semibold focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all cursor-pointer appearance-none hover:border-primary/40"
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                  >
                    <option value="">📍 Chọn trạm gửi gần bạn...</option>
                    {stations.map((station, index) => (
                      <option key={index} value={station}>📍 {station}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute inset-y-0 right-3 my-auto w-5 h-5 text-secondary pointer-events-none" />
                </div>
              </div>

              {/* Input 2: Time Range Selector */}
              <div className="md:col-span-3 flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Thời gian gửi
                </label>
                <div className="h-14 bg-surface-container-low/40 border border-outline-variant/60 rounded-xl px-4 flex items-center justify-between text-on-surface text-sm font-semibold cursor-pointer hover:border-primary/40 transition-all">
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">Hôm nay, 14:00 - 19:00</span>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold bg-primary-container/10 text-primary rounded-md">5h</span>
                </div>
              </div>

              {/* Input 3: Locker Size Selector Pills */}
              <div className="md:col-span-5 flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  Kích thước ngăn tủ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {lockerSizes.map((size) => (
                    <label 
                      key={size.code}
                      className="cursor-pointer"
                    >
                      <input 
                        type="radio" 
                        name="locker_size" 
                        value={size.code}
                        checked={size.selected}
                        onChange={size.onClick}
                        className="peer sr-only"
                      />
                      <div 
                        className={`relative h-14 rounded-xl border-2 text-center flex flex-col justify-center items-center px-2 transition-all hover:border-primary/40 ${
                          size.selected 
                            ? 'border-primary-container bg-primary-container/5 shadow-elevation-1' 
                            : 'border-outline-variant/60 bg-surface-container-low/40'
                        }`}
                      >
                        {size.popular && !size.selected && (
                          <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">Hot</span>
                        )}
                        <span className={`font-bold text-sm ${size.selected ? 'text-primary' : 'text-on-surface'}`}>
                          {size.name} {size.popular && '★'}
                        </span>
                        <span className="text-xs text-secondary truncate">{size.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Action Button */}
              <div className="md:col-span-12 flex flex-col sm:flex-row items-center justify-between pt-5 border-t border-outline-variant/30 gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
                  <span className="relative flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
                  </span>
                  <span><strong className="text-on-surface font-bold">450+ ô tủ</strong> đang sẵn sàng phục vụ trên toàn mạng lưới</span>
                </div>
                <button 
                  type="submit"
                  className="w-full sm:w-auto px-8 h-14 bg-primary-container hover:bg-primary active:bg-on-primary-fixed-variant text-on-primary rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-elevation-2 hover:shadow-elevation-3 transition-all active:scale-[0.98]"
                >
                  <Search className="w-5 h-5" />
                  <span>Tìm tủ trống ngay</span>
                </button>
              </div>
            </form>
          </div>

          {/* Trust Bar Below Widget */}
          <div className="max-w-6xl mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-secondary">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              <span>Mở tức thì với QR Code</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>Bảo hiểm lên tới 20 triệu</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-primary" />
              <span>Hoạt động kể cả khi offline</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-primary" />
              <span>Hoàn tiền 100% nếu hủy</span>
            </div>
          </div>

          {/* Hero Visual Showcase */}
          <div className="mt-16 max-w-6xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden bg-white border border-outline-variant/40 shadow-elevation-4">
              <div className="relative aspect-video max-h-[560px]">
                {/* Hero Image Placeholder với thiết kế đẹp */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-primary to-primary-fixed-dim">
                  {/* Decorative circles */}
                  <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
                  <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white/5 blur-3xl"></div>
                  <div className="absolute inset-0 dot-pattern opacity-20"></div>
                  
                  {/* Content overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8">
                    <div className="w-32 h-32 rounded-3xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center mb-6 shadow-2xl">
                      <Package className="w-16 h-16" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-2 text-center text-balance">
                      Trạm tủ thông minh SmartLocker
                    </h3>
                    <p className="text-base md:text-lg text-white/80 text-center max-w-md">
                      Hệ thống kiosk hiện đại đặt tại các điểm nóng du lịch & giao thông công cộng
                    </p>
                  </div>
                </div>

                {/* Sleek Overlay Badges */}
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex flex-col gap-2">
                  <div className="backdrop-blur-md bg-inverse-surface/85 text-inverse-on-surface px-4 py-2.5 rounded-xl border border-white/10 shadow-elevation-3 flex items-center gap-3">
                    <span className="relative flex items-center justify-center">
                      <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                      <span className="absolute w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75"></span>
                    </span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-tertiary-fixed">Station Hub #042</div>
                      <div className="text-xs text-surface-variant">Metro Ga Bến Thành • Kiosk iPad Pro V4</div>
                    </div>
                  </div>
                </div>

                {/* Stats Badge */}
                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 hidden sm:flex items-center gap-3">
                  <div className="backdrop-blur-md bg-white/95 text-on-surface px-5 py-3 rounded-xl border border-white/40 shadow-elevation-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-secondary">Tốc độ mở tủ</div>
                      <div className="text-xl font-bold text-primary">0.8 giây</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
