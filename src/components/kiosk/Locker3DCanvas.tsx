import { kioskText } from '../../utils/kioskMessages';
import { useState, useEffect } from 'react';
import { sounds } from '../../utils/soundEffects';
import type { KioskLanguage } from '../../utils/kioskI18n';

interface Locker3DCanvasProps {
  activeLockerCode?: string;
  doorState?: string;
  className?: string;
  outdoorMode?: boolean;
  lang?: KioskLanguage;
}

export interface SizeSpecInfo {
  code: 'S' | 'M' | 'L';
  name: Record<KioskLanguage, string>;
  dimensions: string;
  volume: string;
  maxWeight: string;
  priceHour: string;
  priceDay: string;
  suitableLuggage: Record<KioskLanguage, string>;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const SIZE_SPECS: Record<'S' | 'M' | 'L', SizeSpecInfo> = {
  S: {
    code: 'S',
    name: {
      VI: 'Cỡ S (Nhỏ)',
      EN: 'Size S (Compact)',
      KO: 'S 사이즈 (소형)',
      ZH: 'S 规格 (小型)',
      JA: 'Sサイズ (小型)',
    },
    dimensions: '32 × 42 × 50 cm',
    volume: '67 Lít',
    maxWeight: '10 kg',
    priceHour: '10.000 đ/h',
    priceDay: '60.000 đ/ngày',
    suitableLuggage: {
      VI: 'Balo laptop 15.6", túi xách tay, mũ bảo hiểm',
      EN: '15.6" Laptop backpack, handbag, helmet',
      KO: '15.6인치 백팩, 핸드백, 헬멧',
      ZH: '15.6寸双肩包、手提包、头盔',
      JA: '15.6インチリュック、手提げ袋、ヘルメット',
    },
    accentColor: '#10b981',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
  },
  M: {
    code: 'M',
    name: {
      VI: 'Cỡ M (Vừa)',
      EN: 'Size M (Medium)',
      KO: 'M 사이즈 (중형)',
      ZH: 'M 规格 (中型)',
      JA: 'Mサイズ (中型)',
    },
    dimensions: '52 × 42 × 55 cm',
    volume: '120 Lít',
    maxWeight: '20 kg',
    priceHour: '15.000 đ/h',
    priceDay: '90.000 đ/ngày',
    suitableLuggage: {
      VI: 'Vali xách tay cabin 20 inch, túi du lịch thể thao',
      EN: '20-inch Cabin suitcase, duffel bag, sports bag',
      KO: '20인치 기내용 캐리어, 여행용 더플백',
      ZH: '20寸登机行李箱、旅行手提包',
      JA: '20インチ機内持ち込みスーツケース、ボストンバッグ',
    },
    accentColor: '#0ea5e9',
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/40',
    badgeText: 'text-sky-700 dark:text-sky-400',
  },
  L: {
    code: 'L',
    name: {
      VI: 'Cỡ L (Lớn)',
      EN: 'Size L (Large)',
      KO: 'L 사이즈 (대형)',
      ZH: 'L 规格 (大型)',
      JA: 'Lサイズ (大型)',
    },
    dimensions: '92 × 45 × 60 cm',
    volume: '248 Lít',
    maxWeight: '40 kg',
    priceHour: '25.000 đ/h',
    priceDay: '150.000 đ/ngày',
    suitableLuggage: {
      VI: 'Vali ký gửi cỡ lớn 28-32 inch, túi gậy golf, thùng đồ',
      EN: '28-32" Check-in suitcase, golf bag, stroller',
      KO: '28~32인치 대형 화물용 캐리어, 골프백, 유모차',
      ZH: '28-32寸大托运行李箱、高尔夫球包、婴儿推车',
      JA: '28〜32インチ大型スーツケース、ゴルフバッグ',
    },
    accentColor: '#f59e0b',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/40',
    badgeText: 'text-amber-700 dark:text-amber-400',
  },
};

export default function Locker3DCanvas({
  activeLockerCode,
  doorState = 'CLOSED',
  className = 'w-full h-full',
  outdoorMode = false,
  lang = 'VI',
}: Locker3DCanvasProps) {
  const x = kioskText(lang);
  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L' | null>(null);

  // Sync with backend active locker if unlocked
  useEffect(() => {
    if (activeLockerCode && doorState === 'OPEN') {
      const codeUpper = activeLockerCode.toUpperCase();
      if (codeUpper.includes('S')) setSelectedSize('S');
      else if (codeUpper.includes('M')) setSelectedSize('M');
      else if (codeUpper.includes('L')) setSelectedSize('L');
    }
  }, [activeLockerCode, doorState]);

  const handleToggleDoor = (code: 'S' | 'M' | 'L') => {
    if (selectedSize === code) {
      setSelectedSize(null);
      try { sounds.playKeypadTap(); } catch {}
    } else {
      setSelectedSize(code);
      try { sounds.playUnlockSuccess(); } catch {}
    }
  };

  return (
    <div className={`relative flex flex-col justify-between select-none overflow-hidden h-full w-full ${className} ${
      outdoorMode ? 'bg-slate-200 text-slate-900' : 'bg-[#0c121d] text-slate-100'
    }`}>
      
      {/* =========================================================================
          1. TOP SIZE SELECTOR TABS (CLEAN HEADER)
         ========================================================================= */}
      <div className={`flex items-center justify-between px-3.5 py-2 border-b z-20 transition-colors shrink-0 ${
        outdoorMode ? 'bg-white border-slate-300' : 'bg-[#141d2f]/95 border-slate-800'
      }`}>
        <div className="flex items-center gap-1.5">
          {(['S', 'M', 'L'] as const).map((sz) => {
            const isSel = selectedSize === sz;
            return (
              <button
                key={sz}
                onClick={() => handleToggleDoor(sz)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                  isSel
                    ? sz === 'S'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : sz === 'M'
                      ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                      : 'bg-amber-600 text-white border-amber-500 shadow-sm'
                    : outdoorMode
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 font-bold'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {SIZE_SPECS[sz].name[lang]} {isSel ? '• ' + x('open') : ''}
              </button>
            );
          })}
        </div>

        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
          {x('previewHint')}
        </span>
      </div>

      {/* =========================================================================
          2. THE COMPLETE PHYSICAL LOCKER CABINET TOWER
             - Thân tủ 2D giữ nguyên hình, bám sát viền (Full viền)
             - Viền trên: Nóc tủ công nghiệp (Canopy top trim)
             - Viền dưới & Phần đế tủ: Chân đế chịu lực (Base pedestal with shock pads)
             - 3 Cánh tủ mở 3D chân thực với độ dày hộp thép (3D thickness box doors)
             - Mặt cánh chỉ có chữ S, M, L nổi khối
         ========================================================================= */}
      <div className="flex-1 w-full p-2.5 flex flex-col min-h-0 overflow-hidden relative">

        {/* --- PHYSICAL CABINET CASING --- */}
        <div className={`w-full h-full rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl border-2 transition-all ${
          outdoorMode 
            ? 'bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 border-slate-700 text-white' 
            : 'bg-gradient-to-b from-[#182336] via-[#121a28] to-[#0e1520] border-slate-700/80 text-white'
        }`}>

          {/* -------------------------------------------------------------------
              [VIỀN TRÊN]: NÓC TỦ CÔNG NGHIỆP (TOP CANOPY HEADER CROWN)
             ------------------------------------------------------------------- */}
          <div className="h-8 px-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 flex items-center justify-between shrink-0 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse"></span>
              <span className="text-[10px] font-black tracking-widest uppercase font-mono text-slate-200">
                SMARTLOCKER PRO 24/7 • STATION HUB
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 opacity-80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded bg-slate-950">
                SERIES 3-BAY
              </span>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              THÂN TỦ CHÍNH (3 KHOANG TỦ S, M, L VỚI KHUNG VIỀN 2 BÊN)
             ------------------------------------------------------------------- */}
          <div className="flex-1 p-2.5 flex flex-col gap-2.5 min-h-0 overflow-hidden justify-between">

            {/* =================================================================
                BAY 1: SIZE S (Top ~22% height)
               ================================================================= */}
            <div 
              onClick={() => handleToggleDoor('S')}
              className="relative rounded-xl border border-slate-700/90 overflow-visible cursor-pointer flex-1 flex flex-col justify-center bg-slate-950 shadow-inner"
              style={{ minHeight: '68px', perspective: '1200px' }}
            >
              {/* Recessed Interior Bay (Shows when 3D door opens) */}
              <div className="absolute inset-0 rounded-lg p-2.5 flex items-center justify-between overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800">
                {/* Interior Lighting Spotlight */}
                {selectedSize === 'S' && (
                  <div className="absolute inset-0 bg-emerald-500/15 pointer-events-none animate-pulse" />
                )}

                {/* Left: 3D Luggage Backpack & Bay Indicator */}
                <div className="flex items-center gap-3 pl-2 z-10">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/90 border-2 border-emerald-500/40 flex items-center justify-center text-2xl shadow-lg ring-2 ring-emerald-500/20">
                    🎒
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <span>{x('size')} S</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans font-bold">{x('open')}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-sans font-bold mt-0.5">
                      67 Lít • Balo laptop 15.6"
                    </div>
                  </div>
                </div>

                {/* Right: Price & Solenoid status */}
                <div className="text-right pr-3 z-10 font-mono">
                  <div className="text-xs font-black text-emerald-400">10.000 đ/h</div>
                  <div className="text-[10px] text-slate-400">{x('secure')}</div>
                </div>
              </div>

              {/* 3D THICKNESS BOX DOOR (S) */}
              <div
                className="absolute inset-0 rounded-lg transition-transform duration-600 ease-out z-20 shadow-2xl"
                style={{
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                  transform: selectedSize === 'S' ? 'rotateY(-84deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front Face */}
                <div className={`absolute inset-0 rounded-lg border-2 p-2.5 flex items-center justify-between shadow-lg ${
                  outdoorMode
                    ? 'bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 border-slate-300 text-slate-900'
                    : 'bg-gradient-to-r from-[#2a384f] via-[#354664] to-[#253247] border-slate-600 text-white'
                }`}>
                  {/* Left: Solenoid LED Status Dot */}
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full border border-black/30 shadow-sm ${
                      selectedSize === 'S' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 shadow-emerald-500/50'
                    }`}></span>
                    <span className="text-[10px] font-mono font-bold opacity-70">
                      {selectedSize === 'S' ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </div>

                  {/* CENTER: EXQUISITE ENAMEL LETTER BADGE S (ONLY THE LETTER S) */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-1 shadow-lg ring-4 ring-emerald-500/30 flex items-center justify-center transform active:scale-95 transition-transform">
                    <div className="w-full h-full rounded-xl bg-slate-950 flex items-center justify-center border border-emerald-400/50 shadow-inner">
                      <span className="text-2xl font-black font-sans text-emerald-400 tracking-tighter">
                        S
                      </span>
                    </div>
                  </div>

                  {/* Right: Solid Vertical Chrome Handle */}
                  <div className="w-3.5 h-10 rounded bg-gradient-to-b from-slate-200 via-white to-slate-400 border border-slate-500 shadow-md flex items-center justify-center">
                    <div className="w-1.5 h-4 bg-slate-700/80 rounded-full"></div>
                  </div>
                </div>

                {/* Right Edge Thickness (Creates solid 3D depth when open) */}
                <div 
                  className="absolute top-0 bottom-0 right-0 w-3 bg-gradient-to-b from-slate-400 via-slate-300 to-slate-500 border border-slate-600"
                  style={{
                    transformOrigin: 'right center',
                    transform: 'rotateY(90deg)',
                  }}
                />
              </div>
            </div>

            {/* =================================================================
                BAY 2: SIZE M (Middle ~33% height)
               ================================================================= */}
            <div 
              onClick={() => handleToggleDoor('M')}
              className="relative rounded-xl border border-slate-700/90 overflow-visible cursor-pointer flex-[1.4] flex flex-col justify-center bg-slate-950 shadow-inner"
              style={{ minHeight: '92px', perspective: '1200px' }}
            >
              {/* Recessed Interior Bay */}
              <div className="absolute inset-0 rounded-lg p-3 flex items-center justify-between overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800">
                {selectedSize === 'M' && (
                  <div className="absolute inset-0 bg-sky-500/15 pointer-events-none animate-pulse" />
                )}

                <div className="flex items-center gap-3 pl-2 z-10">
                  <div className="w-14 h-14 rounded-xl bg-slate-800/90 border-2 border-sky-500/40 flex items-center justify-center text-3xl shadow-lg ring-2 ring-sky-500/20">
                    🧳
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                      <span>{x('size')} M</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-sans font-bold">{x('open')}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-sans font-bold mt-0.5">
                      120 Lít • Vali cabin 20 inch
                    </div>
                  </div>
                </div>

                <div className="text-right pr-3 z-10 font-mono">
                  <div className="text-xs font-black text-sky-400">15.000 đ/h</div>
                  <div className="text-[10px] text-slate-400">{x('padding')}</div>
                </div>
              </div>

              {/* 3D THICKNESS BOX DOOR (M) */}
              <div
                className="absolute inset-0 rounded-lg transition-transform duration-600 ease-out z-20 shadow-2xl"
                style={{
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                  transform: selectedSize === 'M' ? 'rotateY(-84deg)' : 'rotateY(0deg)',
                }}
              >
                <div className={`absolute inset-0 rounded-lg border-2 p-3 flex items-center justify-between shadow-lg ${
                  outdoorMode
                    ? 'bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 border-slate-300 text-slate-900'
                    : 'bg-gradient-to-r from-[#2a384f] via-[#354664] to-[#253247] border-slate-600 text-white'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full border border-black/30 shadow-sm ${
                      selectedSize === 'M' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 shadow-emerald-500/50'
                    }`}></span>
                    <span className="text-[10px] font-mono font-bold opacity-70">
                      {selectedSize === 'M' ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </div>

                  {/* CENTER: EXQUISITE ENAMEL LETTER BADGE M */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 p-1 shadow-lg ring-4 ring-sky-500/30 flex items-center justify-center transform active:scale-95 transition-transform">
                    <div className="w-full h-full rounded-xl bg-slate-950 flex items-center justify-center border border-sky-400/50 shadow-inner">
                      <span className="text-3xl font-black font-sans text-sky-400 tracking-tighter">
                        M
                      </span>
                    </div>
                  </div>

                  <div className="w-3.5 h-14 rounded bg-gradient-to-b from-slate-200 via-white to-slate-400 border border-slate-500 shadow-md flex items-center justify-center">
                    <div className="w-1.5 h-6 bg-slate-700/80 rounded-full"></div>
                  </div>
                </div>

                <div 
                  className="absolute top-0 bottom-0 right-0 w-3 bg-gradient-to-b from-slate-400 via-slate-300 to-slate-500 border border-slate-600"
                  style={{
                    transformOrigin: 'right center',
                    transform: 'rotateY(90deg)',
                  }}
                />
              </div>
            </div>

            {/* =================================================================
                BAY 3: SIZE L (Bottom ~45% height)
               ================================================================= */}
            <div 
              onClick={() => handleToggleDoor('L')}
              className="relative rounded-xl border border-slate-700/90 overflow-visible cursor-pointer flex-[2] flex flex-col justify-center bg-slate-950 shadow-inner"
              style={{ minHeight: '120px', perspective: '1200px' }}
            >
              {/* Recessed Interior Bay */}
              <div className="absolute inset-0 rounded-lg p-3.5 flex items-center justify-between overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800">
                {selectedSize === 'L' && (
                  <div className="absolute inset-0 bg-amber-500/15 pointer-events-none animate-pulse" />
                )}

                <div className="flex items-center gap-3 pl-2 z-10">
                  <div className="w-16 h-16 rounded-xl bg-slate-800/90 border-2 border-amber-500/40 flex items-center justify-center text-4xl shadow-lg ring-2 ring-amber-500/20">
                    📦
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <span>{x('size')} L</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-sans font-bold">{x('open')}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-sans font-bold mt-0.5">
                      248 Lít • Vali 28-32" • Gậy golf
                    </div>
                  </div>
                </div>

                <div className="text-right pr-3 z-10 font-mono">
                  <div className="text-xs font-black text-amber-400">25.000 đ/h</div>
                  <div className="text-[10px] text-slate-400">{x('damping')}</div>
                </div>
              </div>

              {/* 3D THICKNESS BOX DOOR (L) */}
              <div
                className="absolute inset-0 rounded-lg transition-transform duration-600 ease-out z-20 shadow-2xl"
                style={{
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                  transform: selectedSize === 'L' ? 'rotateY(-84deg)' : 'rotateY(0deg)',
                }}
              >
                <div className={`absolute inset-0 rounded-lg border-2 p-3.5 flex items-center justify-between shadow-lg ${
                  outdoorMode
                    ? 'bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 border-slate-300 text-slate-900'
                    : 'bg-gradient-to-r from-[#2a384f] via-[#354664] to-[#253247] border-slate-600 text-white'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full border border-black/30 shadow-sm ${
                      selectedSize === 'L' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 shadow-emerald-500/50'
                    }`}></span>
                    <span className="text-[10px] font-mono font-bold opacity-70">
                      {selectedSize === 'L' ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </div>

                  {/* CENTER: EXQUISITE ENAMEL LETTER BADGE L */}
                  <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-1 shadow-lg ring-4 ring-amber-500/30 flex items-center justify-center transform active:scale-95 transition-transform">
                    <div className="w-full h-full rounded-xl bg-slate-950 flex items-center justify-center border border-amber-400/50 shadow-inner">
                      <span className="text-4xl font-black font-sans text-amber-400 tracking-tighter">
                        L
                      </span>
                    </div>
                  </div>

                  <div className="w-3.5 h-20 rounded bg-gradient-to-b from-slate-200 via-white to-slate-400 border border-slate-500 shadow-md flex items-center justify-center">
                    <div className="w-1.5 h-8 bg-slate-700/80 rounded-full"></div>
                  </div>
                </div>

                <div 
                  className="absolute top-0 bottom-0 right-0 w-3 bg-gradient-to-b from-slate-400 via-slate-300 to-slate-500 border border-slate-600"
                  style={{
                    transformOrigin: 'right center',
                    transform: 'rotateY(90deg)',
                  }}
                />
              </div>
            </div>

          </div>

          {/* -------------------------------------------------------------------
              [PHẦN ĐẾ TỦ & VIỀN DƯỚI]: CHÂN ĐẾ CHỊU LỰC CÔNG NGHIỆP (PEDESTAL BASE)
             ------------------------------------------------------------------- */}
          <div className="h-9 px-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-t-2 border-slate-700/80 flex items-center justify-between shrink-0 shadow-lg">
            {/* Left Rubber Shock Absorber Foot */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-3 rounded-t-sm bg-slate-700 border-t border-slate-500 flex items-center justify-center">
                <div className="w-4 h-1 bg-slate-950 rounded-full"></div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider">
                HEAVY-DUTY BASE
              </span>
            </div>

            {/* Center Floor Anchor & Ventilation */}
            <div className="flex items-center gap-1.5 opacity-60">
              <span className="w-1 h-3 bg-slate-700 rounded-full"></span>
              <span className="w-1 h-3 bg-slate-700 rounded-full"></span>
              <span className="w-1 h-3 bg-slate-700 rounded-full"></span>
              <span className="w-1 h-3 bg-slate-700 rounded-full"></span>
            </div>

            {/* Right Rubber Shock Absorber Foot */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                GROUNDED 220V
              </span>
              <div className="w-8 h-3 rounded-t-sm bg-slate-700 border-t border-slate-500 flex items-center justify-center">
                <div className="w-4 h-1 bg-slate-950 rounded-full"></div>
              </div>
            </div>
          </div>

        </div>

        {/* =====================================================================
            3. DEDICATED HIGH-CONTRAST POPUP CARD (Appears when door is opened)
               - Ultra-readable in outdoor / anti-glare sunlight
               - No washed-out text!
           ===================================================================== */}
        {selectedSize && (
          <div className="absolute inset-x-4 bottom-4 z-30 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className={`p-4 rounded-2xl border-2 shadow-2xl transition-all ${
              outdoorMode
                ? 'bg-white border-slate-400 text-slate-950 shadow-black/30'
                : 'bg-[#121a28]/95 border-slate-600 text-white shadow-black/80 backdrop-blur-md'
            }`}>
              
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-base font-mono text-slate-950 shadow-md ${
                    selectedSize === 'S' ? 'bg-emerald-400' : selectedSize === 'M' ? 'bg-sky-400' : 'bg-amber-400'
                  }`}>
                    {selectedSize}
                  </span>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white">
                      {SIZE_SPECS[selectedSize].name[lang]}
                    </h4>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      {x('previewOpen')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedSize(null);
                    try { sounds.playKeypadTap(); } catch {}
                  }}
                  className={`px-3 py-1 rounded-xl border text-xs font-black transition-colors ${
                    outdoorMode
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                  }`}
                >
                  ✕ Đóng cửa
                </button>
              </div>

              {/* High-Contrast Specifications Grid (Zero wash-out, Jet-Black text) */}
              <div className="grid grid-cols-3 gap-2 text-center mb-2.5">
                <div className={`p-2 rounded-xl border ${
                  outdoorMode ? 'bg-slate-50 border-slate-300' : 'bg-slate-900/80 border-slate-700'
                }`}>
                  <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{x('dimensions')}</div>
                  <div className="font-black font-mono text-xs text-slate-950 dark:text-white mt-0.5">
                    {SIZE_SPECS[selectedSize].dimensions}
                  </div>
                </div>

                <div className={`p-2 rounded-xl border ${
                  outdoorMode ? 'bg-slate-50 border-slate-300' : 'bg-slate-900/80 border-slate-700'
                }`}>
                  <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{x('capacity')}</div>
                  <div className="font-black font-mono text-xs text-slate-950 dark:text-white mt-0.5">
                    {SIZE_SPECS[selectedSize].volume} • {SIZE_SPECS[selectedSize].maxWeight}
                  </div>
                </div>

                <div className={`p-2 rounded-xl border ${
                  outdoorMode ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-950/60 border-emerald-600'
                }`}>
                  <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">{x('price')}</div>
                  <div className="font-black font-mono text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {SIZE_SPECS[selectedSize].priceHour}
                  </div>
                </div>
              </div>

              {/* Suitable Luggage Recommendation */}
              <div className={`p-2 rounded-xl border flex items-center gap-2 text-xs ${
                outdoorMode ? 'bg-slate-50 border-slate-300 text-slate-950' : 'bg-slate-900/80 border-slate-700 text-slate-200'
              }`}>
                <span className="text-emerald-600 dark:text-emerald-400 font-black shrink-0">✓ Phù hợp:</span>
                <span className="font-bold text-[11px] truncate">{SIZE_SPECS[selectedSize].suitableLuggage[lang]}</span>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* =========================================================================
          4. FOOTER TIP BAR (When no door is selected)
         ========================================================================= */}
      {!selectedSize && (
        <div className={`py-1.5 px-3 border-t text-center text-xs font-bold shrink-0 transition-colors ${
          outdoorMode ? 'bg-white border-slate-300 text-slate-700' : 'bg-[#141d2f] border-slate-800 text-slate-400'
        }`}>
          {x('previewHint')}
        </div>
      )}

    </div>
  );
}
