import { useState, useEffect, useRef } from 'react';
import {
  LuggageDilemmaGraphic,
  DanangTravelGraphic,
  Fast30sGraphic,
  IoTSecurityGraphic,
  PlayIconBespoke,
  PauseIconBespoke,
  PrevIconBespoke,
  NextIconBespoke,
  CinemaIconBespoke
} from './KioskIcons';
import { sounds } from '../../utils/soundEffects';

export interface SlideItem {
  id: string;
  badgeVI: string;
  badgeEN: string;
  titleVI: string;
  titleEN: string;
  descVI: string;
  descEN: string;
  stats: Array<{ labelVI: string; labelEN: string; value: string }>;
  Graphic: React.ComponentType<{ className?: string }>;
}

const SLIDES: SlideItem[] = [
  {
    id: 'dilemma',
    badgeVI: 'BÁO CÁO 1 • THỰC TRẠNG ĐÀ NẴNG',
    badgeEN: 'REPORT 1 • DA NANG REALITY',
    titleVI: 'Nghịch lý ngày du lịch cuối: 4 - 8 tiếng kéo vali mệt mỏi',
    titleEN: 'Last-Day Luggage Dilemma: 4-8 hours dragging heavy bags',
    descVI: '85% khách sạn & homestay tại Đà Nẵng yêu cầu trả phòng lúc 12:00 trưa, trong khi chuyến bay & tàu hỏa chủ yếu khởi hành tối muộn (18:00 - 23:00). Du khách bị kẹt kéo vali dưới nắng nóng.',
    descEN: '85% of hotels/homestays require 12:00 checkout, while flights/trains depart 18:00-23:00. Travelers get stuck dragging heavy luggage around under the Da Nang sun.',
    stats: [
      { labelVI: 'Khoảng trống chết', labelEN: 'Dead-time window', value: '4 - 8 Giờ' },
      { labelVI: 'Homestay không quầy gửi đồ', labelEN: 'Homestays without desk', value: '65%' },
      { labelVI: 'Khách tự túc (FIT)', labelEN: 'Independent tourists', value: '78%' }
    ],
    Graphic: LuggageDilemmaGraphic
  },
  {
    id: 'freedom',
    badgeVI: 'GIẢI PHÁP • TỰ DO TRỌN VẸN',
    badgeEN: 'SOLUTION • 100% FREEDOM',
    titleVI: 'Rảnh tay 100% dạo biển Mỹ Khê & Cầu Rồng không vướng bận',
    titleEN: '100% Hands-Free to explore My Khe beach & Dragon Bridge',
    descVI: 'Chỉ cần gửi hành lý tại trạm SmartLocker gần nhất, bạn tự do vi vu ăn mì Quảng Chợ Hàn, tắm biển Mỹ Khê hay ngắm hoàng hôn Cầu Rồng mà không lo thất lạc hay vác nặng.',
    descEN: 'Drop luggage at the nearest SmartLocker station to savor local foods at Han Market, stroll My Khe beach, or watch Dragon Bridge without burden.',
    stats: [
      { labelVI: 'Rảnh tay du lịch', labelEN: 'Luggage-free mobility', value: '100%' },
      { labelVI: 'Vị trí đắc địa', labelEN: 'Prime transit hubs', value: '24/7' },
      { labelVI: 'Tiết kiệm thể lực', labelEN: 'Energy saved', value: 'Tối đa' }
    ],
    Graphic: DanangTravelGraphic
  },
  {
    id: 'speed',
    badgeVI: 'CÔNG NGHỆ • SIÊU TỐC',
    badgeEN: 'TECHNOLOGY • INSTANT ACCESS',
    titleVI: 'Tự phục vụ 30 giây: 1 chạm quét mã QR mở tủ tự động',
    titleEN: 'Autonomous 30s: 1-Touch QR Scan opens locker door',
    descVI: 'Không cần xếp hàng chờ nhân viên hay mang chìa khóa kim loại dễ mất. Chỉ cần giơ mã QR trên điện thoại trước camera Tablet hoặc nhập PIN 6 số, khóa Solenoid bung chốt ngay.',
    descEN: 'No waiting in line or carrying physical keys. Simply show your mobile QR code to the Tablet camera or enter PIN, the electric lock pops open instantly.',
    stats: [
      { labelVI: 'Thời gian thao tác', labelEN: 'Deposit / retrieve time', value: '< 30s' },
      { labelVI: 'Tốc độ nhả chốt', labelEN: 'Hardware latch pulse', value: '500ms' },
      { labelVI: 'Thủ tục giấy tờ', labelEN: 'Paperwork required', value: '0' }
    ],
    Graphic: Fast30sGraphic
  },
  {
    id: 'iot',
    badgeVI: 'PHẦN CỨNG • IOT BẢO MẬT',
    badgeEN: 'HARDWARE • IOT SECURITY',
    titleVI: 'Bảo mật phần cứng 24/7: Khóa Solenoid & vi điều khiển ESP32',
    titleEN: '24/7 Hardware Security: Solenoid locks & ESP32 controller',
    descVI: 'Mỗi ô tủ tích hợp khóa điện Solenoid lực giữ cao, cảm biến hành trình nhận biết đóng/mở cửa thời gian thực và đồng bộ dữ liệu đám mây qua giao thức MQTT bảo mật.',
    descEN: 'Each locker features an industrial Solenoid lock, magnetic door travel sensor with real-time state telemetry, and encrypted MQTT cloud sync.',
    stats: [
      { labelVI: 'Khóa chốt điện lực', labelEN: 'Industrial Solenoid', value: '12V DC' },
      { labelVI: 'Cảm biến giám sát', labelEN: 'Limit switch status', value: 'Thời gian thực' },
      { labelVI: 'Mã số mở khóa', labelEN: 'Access encryption', value: 'Mã 1 lần' }
    ],
    Graphic: IoTSecurityGraphic
  }
];

interface ConvenienceShowcaseProps {
  lang?: 'VI' | 'EN';
  outdoorMode?: boolean;
  soundEnabled?: boolean;
  className?: string;
}

export default function ConvenienceShowcase({
  lang = 'VI',
  outdoorMode = false,
  soundEnabled = true,
  className = ''
}: ConvenienceShowcaseProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const SLIDE_DURATION_MS = 6000;
  const timerRef = useRef<number | null>(null);

  // Auto-cycling timer with smooth progress bar
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      return;
    }

    let startTime = performance.now();

    const loop = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min((elapsed / SLIDE_DURATION_MS) * 100, 100);
      setProgress(pct);

      if (elapsed >= SLIDE_DURATION_MS) {
        setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
        setProgress(0);
        startTime = performance.now();
      }

      timerRef.current = requestAnimationFrame(loop);
    };

    timerRef.current = requestAnimationFrame(loop);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [isPlaying, currentIndex]);

  const handleNext = () => {
    if (soundEnabled) sounds.playKeypadTap();
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    setProgress(0);
  };

  const handlePrev = () => {
    if (soundEnabled) sounds.playKeypadTap();
    setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    setProgress(0);
  };

  const handleSelect = (idx: number) => {
    if (soundEnabled) sounds.playKeypadTap();
    setCurrentIndex(idx);
    setProgress(0);
  };

  const togglePlay = () => {
    if (soundEnabled) sounds.playKeypadTap();
    setIsPlaying(!isPlaying);
  };

  const activeSlide = SLIDES[currentIndex];
  const GraphicComponent = activeSlide.Graphic;

  // Theming
  const containerBg = outdoorMode
    ? 'bg-white/95 border-slate-300 shadow-xl text-slate-900'
    : 'bg-[#091122]/90 border-slate-800 shadow-2xl text-slate-100';

  const badgeBg = outdoorMode
    ? 'bg-sky-100 text-sky-800 border-sky-300'
    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';

  return (
    <div className={`w-full rounded-3xl border-2 ${containerBg} p-5 transition-all duration-300 backdrop-blur-md relative overflow-hidden ${className}`}>
      
      {/* Dynamic Ambient Background Highlight */}
      <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
        outdoorMode ? 'bg-sky-200/40' : 'bg-cyan-500/10'
      }`}></div>

      {/* Top Header: Slide Info & Control Buttons */}
      <div className="flex items-center justify-between gap-2 border-b pb-3 mb-4 border-inherit">
        
        <div className="flex items-center gap-2.5">
          <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-md border tracking-wider uppercase ${badgeBg}`}>
            {lang === 'VI' ? activeSlide.badgeVI : activeSlide.badgeEN}
          </span>
          <span className="text-[11px] font-mono text-slate-400 font-bold">
            {currentIndex + 1} / {SLIDES.length}
          </span>
        </div>

        {/* Player Controls (No Generic Icons) */}
        <div className="flex items-center gap-1.5">
          
          <button
            onClick={togglePlay}
            className={`p-2 rounded-lg border transition-colors ${
              outdoorMode 
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' 
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title={isPlaying ? 'Pause Auto-Play' : 'Play Auto-Play'}
          >
            {isPlaying ? <PauseIconBespoke className="w-3.5 h-3.5" /> : <PlayIconBespoke className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handlePrev}
            className={`p-2 rounded-lg border transition-colors ${
              outdoorMode 
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' 
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Previous"
          >
            <PrevIconBespoke className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleNext}
            className={`p-2 rounded-lg border transition-colors ${
              outdoorMode 
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' 
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Next"
          >
            <NextIconBespoke className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Video / Presentation Modal Toggle */}
          <button
            onClick={() => {
              if (soundEnabled) sounds.playScanChime();
              setShowModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold transition-all ${
              outdoorMode
                ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-600 shadow-sm'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-400/40'
            }`}
          >
            <CinemaIconBespoke className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'VI' ? 'TRÌNH CHIẾU' : 'SHOWCASE'}</span>
          </button>

        </div>

      </div>

      {/* Main Slide Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        
        {/* Left 5 Cols: Bespoke SVG Motion Graphic */}
        <div className={`md:col-span-5 rounded-2xl p-4 flex items-center justify-center border ${
          outdoorMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
        }`}>
          <div className="transform hover:scale-105 transition-transform duration-500">
            <GraphicComponent className="w-56 h-40 max-w-full drop-shadow-md" />
          </div>
        </div>

        {/* Right 7 Cols: Context, Problem & Solution */}
        <div className="md:col-span-7 space-y-3">
          
          <h4 className={`text-lg md:text-xl font-black tracking-tight uppercase leading-snug ${
            outdoorMode ? 'text-slate-900' : 'text-white'
          }`}>
            {lang === 'VI' ? activeSlide.titleVI : activeSlide.titleEN}
          </h4>

          <p className={`text-xs md:text-sm leading-relaxed ${
            outdoorMode ? 'text-slate-700' : 'text-slate-300'
          }`}>
            {lang === 'VI' ? activeSlide.descVI : activeSlide.descEN}
          </p>

          {/* 3 Live Stat Badges from Report 1 */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {activeSlide.stats.map((st, i) => (
              <div
                key={i}
                className={`p-2 rounded-xl border text-center ${
                  outdoorMode
                    ? 'bg-slate-100/80 border-slate-200'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className={`text-xs md:text-sm font-black font-mono ${
                  outdoorMode ? 'text-sky-700' : 'text-cyan-400'
                }`}>
                  {st.value}
                </div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
                  {lang === 'VI' ? st.labelVI : st.labelEN}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Bottom Progress Bar & Slide Dots */}
      <div className="mt-4 pt-3 border-t border-inherit flex items-center justify-between gap-4">
        
        {/* Slide Indicator Dots */}
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? (outdoorMode ? 'w-8 bg-sky-600' : 'w-8 bg-cyan-400')
                  : (outdoorMode ? 'w-2 bg-slate-300 hover:bg-slate-400' : 'w-2 bg-slate-700 hover:bg-slate-600')
              }`}
            />
          ))}
        </div>

        {/* Continuous Progress Bar */}
        <div className="flex-1 max-w-xs h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full transition-all duration-75 ${
              outdoorMode ? 'bg-sky-600' : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-[10px] font-mono text-slate-400 font-bold hidden sm:block">
          {isPlaying ? (lang === 'VI' ? 'Tự chuyển sau 6s' : 'Auto 6s') : (lang === 'VI' ? 'Đã tạm dừng' : 'Paused')}
        </div>

      </div>

      {/* =========================================================================
          FULLSCREEN CINEMATIC SHOWCASE / VIDEO-STYLE SLIDESHOW MODAL
         ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-fade-in">
          
          <div className="relative w-full max-w-5xl bg-[#0a1020] border-2 border-cyan-500/60 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(6,182,212,0.3)] text-white space-y-6 flex flex-col justify-between max-h-[95vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  <CinemaIconBespoke className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-xl font-black uppercase font-mono tracking-wide text-white">
                    {lang === 'VI' ? 'TRÌNH CHIẾU TIỆN ÍCH SMARTLOCKER' : 'SMARTLOCKER CONVENIENCE SHOWCASE'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {lang === 'VI' ? 'Nghiên cứu hành vi du khách & giải pháp IoT tại TP. Đà Nẵng' : 'Tourist behavior study & IoT solution in Da Nang'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-mono font-bold text-slate-300 hover:text-white"
              >
                ✕ {lang === 'VI' ? 'ĐÓNG' : 'CLOSE'}
              </button>
            </div>

            {/* Modal Hero Presentation Slide */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
              
              {/* Massive Graphic Preview */}
              <div className="lg:col-span-5 bg-[#050914] border-2 border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-inner">
                <div className="absolute top-4 left-4 text-[10px] font-mono text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded bg-cyan-500/10">
                  SCENE 0{currentIndex + 1}
                </div>
                <GraphicComponent className="w-72 h-52 max-w-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] my-2" />
                <span className="text-[11px] font-mono text-slate-400 text-center mt-2">
                  {lang === 'VI' ? 'Mô phỏng đồ họa chuyển động thời gian thực' : 'Real-time motion graphic simulation'}
                </span>
              </div>

              {/* In-depth Details & Report Data */}
              <div className="lg:col-span-7 space-y-5">
                
                <span className="inline-block text-xs font-mono font-extrabold px-3 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                  {lang === 'VI' ? activeSlide.badgeVI : activeSlide.badgeEN}
                </span>

                <h2 className="text-2xl md:text-3xl font-black uppercase text-white leading-tight">
                  {lang === 'VI' ? activeSlide.titleVI : activeSlide.titleEN}
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {lang === 'VI' ? activeSlide.descVI : activeSlide.descEN}
                </p>

                {/* Key Metric Highlights */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {activeSlide.stats.map((st, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                      <div className="text-lg font-black font-mono text-cyan-400">{st.value}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1 leading-tight">
                        {lang === 'VI' ? st.labelVI : st.labelEN}
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>

            {/* Modal Bottom Controls */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              
              {/* Slide dots */}
              <div className="flex items-center gap-2">
                {SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      idx === currentIndex ? 'w-10 bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'w-3 bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Prev / Next Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrev}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 font-mono font-bold text-xs flex items-center gap-2 text-white"
                >
                  <PrevIconBespoke className="w-4 h-4" />
                  {lang === 'VI' ? 'TRANG TRƯỚC' : 'PREV'}
                </button>
                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  {lang === 'VI' ? 'TRANG KẾ' : 'NEXT'}
                  <NextIconBespoke className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
