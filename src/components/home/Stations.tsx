import { useState } from 'react';
import { MapPin, Navigation, Plus, Minus, ArrowRight, Clock, Star, Building2 } from 'lucide-react';

/**
 * Stations Component - Phần hiển thị mạng lưới trạm tủ
 * Đã cải thiện layout cân bằng hơn giữa map và danh sách trạm
 */

const mockStations = [
  {
    id: 1,
    name: 'Trạm Ga Bến Thành - Cửa Đông Metro',
    address: 'Tầng B1, Ga Metro Bến Thành, Quận 1, TP.HCM',
    status: 'open_24_7',
    type: 'Metro',
    distance: '350m',
    rating: 4.9,
    reviews: 248,
    available: { S: 6, M: 5, L: 3 },
    price: 10000,
    isPrimary: true,
  },
  {
    id: 2,
    name: 'Sân bay Quốc tế Tân Sơn Nhất (Ga T1)',
    address: 'Sảnh đến Cột 10, Ga Quốc Nội T1, Tân Bình',
    status: 'guarded',
    type: 'Airport',
    distance: null,
    rating: 4.8,
    reviews: 412,
    available: { S: 2, M: 4, L: 2 },
    price: 10000,
    isPrimary: false,
  },
  {
    id: 3,
    name: 'Phố Đi Bộ Nguyễn Huệ - Trạm Ngô Đức Kế',
    address: 'Số 02 Ngô Đức Kế, P. Bến Nghé, Quận 1',
    status: 'busy',
    type: 'Pedestrian',
    distance: null,
    rating: 4.7,
    reviews: 156,
    available: { S: 1, M: 3, L: 1 },
    price: 10000,
    isPrimary: false,
  },
];

const cityFilters = [
  { id: 'hcm', name: 'TP. Hồ Chí Minh', count: 48 },
  { id: 'hn', name: 'Hà Nội', count: 25 },
  { id: 'dn', name: 'Đà Nẵng', count: 12 },
];

const typeFilters = [
  { id: 'all', name: 'Tất cả' },
  { id: 'airport', name: 'Sân bay' },
  { id: 'metro', name: 'Ga Tàu Metro' },
  { id: 'street', name: 'Phố Đi Bộ' },
];

const Stations = () => {
  const [selectedCity, setSelectedCity] = useState('hcm');
  const [selectedType, setSelectedType] = useState('all');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open_24_7':
        return { label: 'Đang mở cửa 24/7', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
      case 'guarded':
        return { label: 'Có bảo vệ 24/7', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
      case 'busy':
        return { label: 'Khu sầm uất', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' };
      default:
        return { label: 'Mở cửa', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' };
    }
  };

  const getAvailabilityColor = (count: number) => {
    if (count >= 3) return 'text-emerald-600';
    if (count >= 1) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <>
      {/* Stations Section */}
      <section className="py-20 md:py-28 bg-surface-container-lowest" id="stations">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <MapPin className="w-4 h-4" />
                Hệ thống phủ sóng rộng khắp
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight leading-tight">
                Mạng Lưới Trạm Tủ<br className="hidden md:block"/>
                <span className="text-gradient"> Thông Minh Toàn Quốc</span>
              </h2>
              <p className="text-base text-secondary mt-3">
                Hơn 85+ trạm tủ đặt tại các điểm nóng du lịch, sân bay và nhà ga lớn khắp TP. Hồ Chí Minh, Hà Nội, Đà Nẵng.
              </p>
            </div>
            
            {/* City Filter Pills */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {cityFilters.map((city) => (
                <button
                  key={city.id}
                  onClick={() => setSelectedCity(city.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    selectedCity === city.id
                      ? 'bg-primary-container text-on-primary border-primary shadow-elevation-1'
                      : 'bg-white text-secondary border-outline-variant/40 hover:bg-surface-container-low hover:border-primary/40'
                  }`}
                >
                  {city.name} ({city.count})
                </button>
              ))}
            </div>
          </div>

          {/* Two-Column Layout: Map 5/12 + List 7/12 (cân bằng hơn) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Interactive Map Visual Preview (5/12) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-outline-variant/40 shadow-elevation-1 p-5 overflow-hidden flex flex-col">
              {/* Filter Tags Bar over Map */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs font-bold text-secondary mr-1">Bộ lọc:</span>
                {typeFilters.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedType === type.id
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>

              {/* Stylized Map Canvas Container */}
              <div className="relative flex-1 min-h-[480px] rounded-2xl overflow-hidden border border-outline-variant/30">
                {/* Map Placeholder - Beautiful gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                  {/* Grid pattern overlay */}
                  <div 
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(99, 102, 241, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.15) 1px, transparent 1px)',
                      backgroundSize: '40px 40px'
                    }}
                  ></div>
                  {/* Roads */}
                  <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 500" preserveAspectRatio="none">
                    <path d="M 0 250 Q 100 200, 200 250 T 400 250" stroke="#94a3b8" strokeWidth="3" fill="none" />
                    <path d="M 200 0 L 200 500" stroke="#94a3b8" strokeWidth="3" fill="none" />
                    <path d="M 0 100 L 400 150" stroke="#cbd5e1" strokeWidth="2" fill="none" />
                    <path d="M 0 400 L 400 380" stroke="#cbd5e1" strokeWidth="2" fill="none" />
                  </svg>
                  {/* River */}
                  <div className="absolute top-0 right-1/4 w-20 h-full bg-blue-200/40 -skew-x-12 transform"></div>
                </div>

                {/* Station Pin 1 (Ga Bến Thành) - Primary */}
                <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20">
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-emerald-400 opacity-75"></span>
                    <div className="relative bg-white border-2 border-emerald-600 shadow-elevation-3 px-3 py-2 rounded-full flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-bold text-on-surface whitespace-nowrap">Ga Bến Thành: 14</span>
                    </div>
                  </div>
                </div>

                {/* Station Pin 2 (Sân bay TSN) */}
                <div className="absolute top-1/4 right-1/4 group cursor-pointer z-20">
                  <div className="relative flex items-center justify-center">
                    <div className="relative bg-white border-2 border-primary shadow-elevation-3 px-3 py-2 rounded-full flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                      <span className="text-xs font-bold text-on-surface whitespace-nowrap">Sân bay TSN: 8</span>
                    </div>
                  </div>
                </div>

                {/* Station Pin 3 (Phố Đi Bộ) */}
                <div className="absolute bottom-1/4 left-1/2 group cursor-pointer z-20">
                  <div className="relative flex items-center justify-center">
                    <div className="relative bg-white border-2 border-amber-500 shadow-elevation-3 px-3 py-2 rounded-full flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span className="text-xs font-bold text-on-surface whitespace-nowrap">Phố Đi Bộ: 5</span>
                    </div>
                  </div>
                </div>

                {/* Map Controls (Zoom) */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white/95 backdrop-blur rounded-xl border border-outline-variant/40 shadow-elevation-2 p-1 z-30">
                  <button 
                    className="w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-lg font-bold transition-colors" 
                    aria-label="Phóng to"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <div className="h-px bg-outline-variant/40"></div>
                  <button 
                    className="w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-lg font-bold transition-colors" 
                    aria-label="Thu nhỏ"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                </div>

                {/* GPS Locate Chip */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3.5 py-2 rounded-xl border border-outline-variant/40 shadow-elevation-2 flex items-center gap-2 text-xs font-bold text-primary cursor-pointer hover:bg-primary hover:text-white transition-all z-30">
                  <Navigation className="w-4 h-4" />
                  <span>Định vị gần tôi</span>
                </div>

                {/* Map Stats Badge */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-2 rounded-xl border border-outline-variant/40 shadow-elevation-2 z-30">
                  <div className="flex items-center gap-2 text-xs">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-bold text-on-surface">85+ trạm</span>
                  </div>
                </div>
              </div>

              {/* Map Footer Info */}
              <div className="mt-4 flex items-center justify-between text-xs text-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Đồng bộ mỗi 15s qua IoT 5G
                </span>
                <a href="#all-stations" className="font-bold text-primary flex items-center gap-1 hover:underline">
                  Xem toàn màn hình
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Right: Real-time Station Cards List (7/12) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-secondary uppercase tracking-wider">
                  Trạm đang mở gần bạn
                </h3>
                <span className="text-xs text-secondary">
                  Cập nhật <strong className="text-emerald-600">vừa xong</strong>
                </span>
              </div>

              {mockStations.map((station) => {
                const statusBadge = getStatusBadge(station.status);
                const totalAvailable = station.available.S + station.available.M + station.available.L;
                return (
                  <div 
                    key={station.id}
                    className={`group bg-white rounded-2xl p-5 border shadow-elevation-1 hover-lift cursor-pointer transition-all ${
                      station.isPrimary 
                        ? 'border-2 border-primary/50 shadow-elevation-2' 
                        : 'border-outline-variant/40 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                        station.isPrimary 
                          ? 'bg-primary-container text-white' 
                          : 'bg-surface-container-low text-primary'
                      }`}>
                        <MapPin className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></span>
                                {statusBadge.label}
                              </span>
                              {station.distance && (
                                <span className="text-xs text-secondary flex items-center gap-0.5">
                                  <Navigation className="w-3 h-3" />
                                  Cách bạn {station.distance}
                                </span>
                              )}
                              <span className="text-xs text-secondary flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <strong className="text-on-surface font-bold">{station.rating}</strong> ({station.reviews})
                              </span>
                            </div>
                            <h3 className="font-bold text-on-surface text-base leading-tight">
                              {station.name}
                            </h3>
                            <p className="text-xs text-secondary mt-0.5">{station.address}</p>
                          </div>
                        </div>

                        {/* Capacity Badges */}
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          {(['S', 'M', 'L'] as const).map((size) => (
                            <div key={size} className={`text-center py-2 rounded-lg border ${
                              station.available[size] > 0 
                                ? 'bg-surface-container-low border-outline-variant/30' 
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <span className="text-xs text-secondary block">Size {size}</span>
                              <span className={`font-bold text-sm ${getAvailabilityColor(station.available[size])}`}>
                                {station.available[size]} trống
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Action Row */}
                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-outline-variant/30">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="text-xs text-secondary">Từ</div>
                              <div className="text-base font-bold text-on-surface">
                                {station.price.toLocaleString()}đ<span className="text-xs font-normal text-secondary">/giờ</span>
                              </div>
                            </div>
                            <div className="h-8 w-px bg-outline-variant/40"></div>
                            <div>
                              <div className="text-xs text-secondary">Tổng</div>
                              <div className="text-base font-bold text-emerald-600">
                                {totalAvailable} tủ trống
                              </div>
                            </div>
                          </div>
                          <a 
                            href="#booking-widget"
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all inline-flex items-center gap-2 ${
                              station.isPrimary
                                ? 'bg-primary-container hover:bg-primary text-white shadow-elevation-1'
                                : 'bg-surface-container-low hover:bg-primary-container text-primary hover:text-white border border-outline-variant/40 hover:border-primary'
                            }`}
                          >
                            Đặt tủ ngay
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* View all stations link */}
              <a 
                href="#all-stations"
                className="w-full py-4 rounded-xl border-2 border-dashed border-outline-variant text-primary font-bold flex items-center justify-center gap-2 hover:bg-surface-container-low hover:border-primary transition-all text-sm mt-2"
              >
                <span>Xem tất cả 85+ địa điểm trên bản đồ</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Stations;
