import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Navigation, Plus, Minus, ArrowRight, Star, Building2, RefreshCw } from 'lucide-react';
import { calcDistance, getStations } from '../../api/stationService';
import type { Station } from '../../api/stationService';

/**
 * Stations Component - Mạng lưới trạm tủ trên trang chủ.
 * Dữ liệu lấy từ hệ thống (không còn danh sách mẫu); mọi bộ lọc và nút điều khiển đều hoạt động.
 */

type CityId = 'all' | 'hcm' | 'hn' | 'dn' | 'other';
type SizeId = 'all' | 'S' | 'M' | 'L';

const CITY_LABEL: Record<Exclude<CityId, 'all'>, string> = {
  hcm: 'TP. Hồ Chí Minh',
  hn: 'Hà Nội',
  dn: 'Đà Nẵng',
  other: 'Khu vực khác',
};

const SIZE_FILTERS: { id: SizeId; name: string }[] = [
  { id: 'all', name: 'Tất cả' },
  { id: 'S', name: 'Còn cỡ S' },
  { id: 'M', name: 'Còn cỡ M' },
  { id: 'L', name: 'Còn cỡ L' },
];

/** Phân nhóm thành phố theo vĩ độ (dữ liệu trạm chưa có trường thành phố). */
function cityOf(station: Station): Exclude<CityId, 'all'> {
  const lat = Number(station.latitude);
  if (lat >= 20) return 'hn';
  if (lat >= 15.5 && lat <= 16.5) return 'dn';
  if (lat >= 10 && lat <= 11.5) return 'hcm';
  return 'other';
}

const available = (s: Station, size: 'S' | 'M' | 'L') => (size === 'S' ? s.availableS : size === 'M' ? s.availableM : s.availableL) ?? 0;
const minPrice = (s: Station) => {
  const prices = [s.priceS, s.priceM, s.priceL].filter((p): p is number => typeof p === 'number' && p > 0);
  return prices.length ? Math.min(...prices) : null;
};
const getAvailabilityColor = (count: number) => (count >= 3 ? 'text-emerald-600' : count >= 1 ? 'text-amber-600' : 'text-red-600');
const formatDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

const Stations = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityId>('all');
  const [selectedSize, setSelectedSize] = useState<SizeId>('all');
  const [zoom, setZoom] = useState(1);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locMessage, setLocMessage] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getStations()
      .then((list) => setStations(list.filter((s) => s.status === 'ACTIVE')))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: stations.length };
    stations.forEach((s) => { const c = cityOf(s); counts[c] = (counts[c] ?? 0) + 1; });
    return counts;
  }, [stations]);

  const visible = useMemo(() => {
    const list = stations
      .filter((s) => selectedCity === 'all' || cityOf(s) === selectedCity)
      .filter((s) => selectedSize === 'all' || available(s, selectedSize) > 0)
      .map((s) => ({ ...s, distanceKm: userLoc ? calcDistance(userLoc.lat, userLoc.lng, Number(s.latitude), Number(s.longitude)) : undefined }));
    return userLoc ? list.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)) : list;
  }, [stations, selectedCity, selectedSize, userLoc]);

  // Vị trí ghim trên bản đồ: chuẩn hóa tọa độ thật của các trạm đang hiển thị vào khung.
  const pins = useMemo(() => {
    if (visible.length === 0) return [];
    const lats = visible.map((s) => Number(s.latitude));
    const lngs = visible.map((s) => Number(s.longitude));
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const norm = (v: number, lo: number, hi: number) => (hi - lo < 1e-6 ? 0.5 : (v - lo) / (hi - lo));
    return visible.slice(0, 12).map((s) => ({
      station: s,
      left: 14 + norm(Number(s.longitude), minLng, maxLng) * 72,
      top: 14 + (1 - norm(Number(s.latitude), minLat, maxLat)) * 72,
    }));
  }, [visible]);

  const locate = () => {
    if (!navigator.geolocation) { setLocMessage('Trình duyệt không hỗ trợ định vị.'); return; }
    setLocMessage('Đang xác định vị trí...');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocMessage('Đã sắp xếp theo khoảng cách từ vị trí của bạn.'); },
      (err) => setLocMessage(err.code === 1 ? 'Bạn đã chặn quyền vị trí. Hãy cho phép vị trí cho trang này rồi thử lại.' : 'Chưa xác định được vị trí. Vui lòng thử lại.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const goBook = (id: string) => window.location.assign(`/station-booking?stationId=${encodeURIComponent(id)}`);
  const goMap = (id?: string) => window.location.assign(id ? `/find-station?stationId=${encodeURIComponent(id)}` : '/find-station');

  return (
    <>
      <section className="py-20 md:py-28 bg-surface-container-lowest" id="stations">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <MapPin className="w-4 h-4" />
                Hệ thống phủ sóng rộng khắp
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight leading-tight">
                Mạng Lưới Trạm Tủ<br className="hidden md:block" />
                <span className="text-gradient"> Thông Minh Toàn Quốc</span>
              </h2>
              <p className="text-base text-secondary mt-3">
                {loading ? 'Đang tải danh sách trạm...' : `${stations.length} trạm đang hoạt động. Chọn thành phố hoặc cỡ tủ để xem tủ trống theo thời gian thực.`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {(['all', 'hcm', 'hn', 'dn', 'other'] as CityId[])
                .filter((id) => id === 'all' || (cityCounts[id] ?? 0) > 0)
                .map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedCity(id)}
                    aria-pressed={selectedCity === id}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                      selectedCity === id
                        ? 'bg-primary-container text-on-primary border-primary shadow-elevation-1'
                        : 'bg-white text-secondary border-outline-variant/40 hover:bg-surface-container-low hover:border-primary/40'
                    }`}
                  >
                    {id === 'all' ? 'Tất cả' : CITY_LABEL[id]} ({cityCounts[id] ?? 0})
                  </button>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Bản đồ xem nhanh */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-outline-variant/40 shadow-elevation-1 p-5 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs font-bold text-secondary mr-1">Bộ lọc:</span>
                {SIZE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedSize(f.id)}
                    aria-pressed={selectedSize === f.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedSize === f.id
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 min-h-[480px] rounded-2xl overflow-hidden border border-outline-variant/30">
                <div
                  className="absolute inset-0 origin-center transition-transform duration-300"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                    <div
                      className="absolute inset-0 opacity-40"
                      style={{
                        backgroundImage: 'linear-gradient(to right, rgba(99, 102, 241, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.15) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                      }}
                    ></div>
                    <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 500" preserveAspectRatio="none">
                      <path d="M 0 250 Q 100 200, 200 250 T 400 250" stroke="#94a3b8" strokeWidth="3" fill="none" />
                      <path d="M 200 0 L 200 500" stroke="#94a3b8" strokeWidth="3" fill="none" />
                      <path d="M 0 100 L 400 150" stroke="#cbd5e1" strokeWidth="2" fill="none" />
                      <path d="M 0 400 L 400 380" stroke="#cbd5e1" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                  {pins.map(({ station, left, top }) => {
                    const total = available(station, 'S') + available(station, 'M') + available(station, 'L');
                    const active = activeId === station.id;
                    return (
                      <button
                        key={station.id}
                        type="button"
                        onClick={() => setActiveId(active ? null : station.id)}
                        onDoubleClick={() => goMap(station.id)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                        style={{ left: `${left}%`, top: `${top}%` }}
                        title={`${station.name}: ${total} tủ trống`}
                      >
                        <span className={`bg-white border-2 shadow-elevation-3 px-3 py-1.5 rounded-full flex items-center gap-2 ${active ? 'border-primary' : total > 0 ? 'border-emerald-600' : 'border-red-400'}`} style={{ transform: `scale(${1 / zoom})` }}>
                          <span className={`w-2.5 h-2.5 rounded-full ${total > 0 ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                          <span className="text-xs font-bold text-on-surface whitespace-nowrap max-w-[9rem] truncate">{station.name}: {total}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!loading && pins.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-secondary z-10 px-6 text-center">
                    {error ? 'Không tải được danh sách trạm.' : 'Không có trạm phù hợp bộ lọc hiện tại.'}
                  </div>
                )}

                <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white/95 backdrop-blur rounded-xl border border-outline-variant/40 shadow-elevation-2 p-1 z-30">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))}
                    disabled={zoom >= 2}
                    className="w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Phóng to"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <div className="h-px bg-outline-variant/40"></div>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
                    disabled={zoom <= 0.75}
                    className="w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Thu nhỏ"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={locate}
                  className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3.5 py-2 rounded-xl border border-outline-variant/40 shadow-elevation-2 flex items-center gap-2 text-xs font-bold text-primary cursor-pointer hover:bg-primary hover:text-white transition-all z-30"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Định vị gần tôi</span>
                </button>

                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-2 rounded-xl border border-outline-variant/40 shadow-elevation-2 z-30">
                  <div className="flex items-center gap-2 text-xs">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-bold text-on-surface">{visible.length} trạm</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-secondary gap-3">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <span className="truncate" role="status">{locMessage || 'Số tủ trống lấy trực tiếp từ hệ thống'}</span>
                </span>
                <button type="button" onClick={() => goMap()} className="font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer shrink-0">
                  Xem toàn màn hình
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Danh sách trạm */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-secondary uppercase tracking-wider">
                  {userLoc ? 'Trạm gần bạn nhất' : 'Trạm đang hoạt động'}
                </h3>
                <button type="button" onClick={load} className="text-xs text-secondary hover:text-primary inline-flex items-center gap-1 cursor-pointer">
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Làm mới
                </button>
              </div>

              {loading && stations.length === 0 && (
                <div className="bg-white rounded-2xl p-8 border border-outline-variant/40 text-center text-sm text-secondary">Đang tải danh sách trạm...</div>
              )}
              {!loading && error && (
                <div className="bg-white rounded-2xl p-8 border border-red-200 text-center text-sm text-red-700">
                  Không kết nối được máy chủ để lấy danh sách trạm.
                  <button type="button" onClick={load} className="ml-2 font-bold underline cursor-pointer">Thử lại</button>
                </div>
              )}
              {!loading && !error && visible.length === 0 && (
                <div className="bg-white rounded-2xl p-8 border border-outline-variant/40 text-center text-sm text-secondary">Không có trạm phù hợp. Thử đổi thành phố hoặc cỡ tủ.</div>
              )}

              {visible.slice(0, 6).map((station, index) => {
                const totalAvailable = available(station, 'S') + available(station, 'M') + available(station, 'L');
                const price = minPrice(station);
                const primary = index === 0;
                return (
                  <div
                    key={station.id}
                    className={`group bg-white rounded-2xl p-5 border shadow-elevation-1 hover-lift transition-all ${
                      activeId === station.id ? 'ring-2 ring-primary/40 ' : ''
                    }${primary ? 'border-2 border-primary/50 shadow-elevation-2' : 'border-outline-variant/40 hover:border-primary/30'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${primary ? 'bg-primary-container text-white' : 'bg-surface-container-low text-primary'}`}>
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {station.opensAt && station.closesAt ? `Mở cửa ${station.opensAt}–${station.closesAt}` : 'Đang hoạt động'}
                          </span>
                          {station.distanceKm != null && (
                            <span className="text-xs text-secondary flex items-center gap-0.5">
                              <Navigation className="w-3 h-3" />
                              Cách bạn {formatDistance(station.distanceKm)}
                            </span>
                          )}
                          {(station.ratingCount ?? 0) > 0 && station.ratingAverage != null && (
                            <span className="text-xs text-secondary flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <strong className="text-on-surface font-bold">{Number(station.ratingAverage).toFixed(1)}</strong> ({station.ratingCount})
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-on-surface text-base leading-tight">{station.name}</h3>
                        <p className="text-xs text-secondary mt-0.5">{station.address}</p>

                        <div className="grid grid-cols-3 gap-2 mt-4">
                          {(['S', 'M', 'L'] as const).map((size) => (
                            <div key={size} className={`text-center py-2 rounded-lg border ${available(station, size) > 0 ? 'bg-surface-container-low border-outline-variant/30' : 'bg-red-50 border-red-200'}`}>
                              <span className="text-xs text-secondary block">Size {size}</span>
                              <span className={`font-bold text-sm ${getAvailabilityColor(available(station, size))}`}>{available(station, size)} trống</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-outline-variant/30 gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            {price != null && (
                              <>
                                <div>
                                  <div className="text-xs text-secondary">Từ</div>
                                  <div className="text-base font-bold text-on-surface">
                                    {price.toLocaleString('vi-VN')}đ<span className="text-xs font-normal text-secondary">/giờ</span>
                                  </div>
                                </div>
                                <div className="h-8 w-px bg-outline-variant/40"></div>
                              </>
                            )}
                            <div>
                              <div className="text-xs text-secondary">Tổng</div>
                              <div className={`text-base font-bold ${totalAvailable > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{totalAvailable} tủ trống</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => { setActiveId(station.id); goMap(station.id); }}
                              className="px-4 py-2.5 rounded-xl text-sm font-bold border border-outline-variant/40 text-secondary hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
                            >
                              Xem bản đồ
                            </button>
                            <button
                              type="button"
                              disabled={totalAvailable === 0}
                              onClick={() => goBook(station.id)}
                              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                primary
                                  ? 'bg-primary-container hover:bg-primary text-white shadow-elevation-1'
                                  : 'bg-surface-container-low hover:bg-primary-container text-primary hover:text-white border border-outline-variant/40 hover:border-primary'
                              }`}
                            >
                              {totalAvailable === 0 ? 'Hết tủ trống' : 'Đặt tủ ngay'}
                              {totalAvailable > 0 && <ArrowRight className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => goMap()}
                className="w-full py-4 rounded-xl border-2 border-dashed border-outline-variant text-primary font-bold flex items-center justify-center gap-2 hover:bg-surface-container-low hover:border-primary transition-all text-sm mt-2 cursor-pointer"
              >
                <span>{stations.length > 6 ? `Xem tất cả ${stations.length} trạm trên bản đồ` : 'Mở bản đồ trạm'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Stations;
