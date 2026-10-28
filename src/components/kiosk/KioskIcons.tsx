/**
 * Custom Bespoke Cyber-Physical SVG Icons & 3D Logo for SmartLocker Kiosk
 * Không dùng icon mặc định, thiết kế theo phong cách Isometric Cyber-Physical HUD.
 */

export function SmartLockerLogo3D({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="cubeTop" x1="32" y1="4" x2="32" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="cubeLeft" x1="8" y1="20" x2="32" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="cubeRight" x1="56" y1="20" x2="32" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#334155" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
        <filter id="neonGlow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Top Face */}
      <polygon points="32,6 54,18 32,30 10,18" fill="url(#cubeTop)" stroke="#7dd3fc" strokeWidth="1.5" strokeLinejoin="round" />
      
      {/* Left Face */}
      <polygon points="10,18 32,30 32,56 10,44" fill="url(#cubeLeft)" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" />
      
      {/* Right Face */}
      <polygon points="32,30 54,18 54,44 32,56" fill="url(#cubeRight)" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" />
      
      {/* Center Cyber Lock Core */}
      <circle cx="32" cy="30" r="4.5" fill="#38bdf8" filter="url(#neonGlow)" />
      <circle cx="32" cy="30" r="2.5" fill="#ffffff" />
      <path d="M32 35 L32 45" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function CheckInIcon3D({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="checkInGrad" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      {/* 3D Locker Cabinet Frame */}
      <rect x="14" y="10" width="36" height="44" rx="4" fill="#0f172a" stroke="url(#checkInGrad)" strokeWidth="2.5" />
      <line x1="14" y1="24" x2="50" y2="24" stroke="#334155" strokeWidth="1.5" />
      <line x1="14" y1="38" x2="50" y2="38" stroke="#334155" strokeWidth="1.5" />
      {/* Open Compartment Handle */}
      <circle cx="44" cy="17" r="1.5" fill="#38bdf8" />
      <circle cx="44" cy="31" r="1.5" fill="#38bdf8" />
      <circle cx="44" cy="45" r="1.5" fill="#38bdf8" />
      {/* Glowing Deposit Arrow */}
      <path d="M28 27 L36 31 L28 35 Z" fill="#38bdf8" />
      <path d="M20 31 L34 31" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CheckOutIcon3D({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="checkOutGrad" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* 3D Locker Cabinet Frame */}
      <rect x="14" y="10" width="36" height="44" rx="4" fill="#0f172a" stroke="url(#checkOutGrad)" strokeWidth="2.5" />
      <line x1="14" y1="24" x2="50" y2="24" stroke="#334155" strokeWidth="1.5" />
      <line x1="14" y1="38" x2="50" y2="38" stroke="#334155" strokeWidth="1.5" />
      {/* Exit Arrow */}
      <path d="M36 27 L28 31 L36 35 Z" fill="#34d399" />
      <path d="M44 31 L30 31" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
      {/* Keycard Glyph */}
      <rect x="22" y="14" width="10" height="6" rx="1" fill="#34d399" />
    </svg>
  );
}

export function QrScannerReticle({ className = "w-64 h-64" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* 4 Optical Corner Brackets */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-xl shadow-[0_0_10px_#22d3ee]"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-xl shadow-[0_0_10px_#22d3ee]"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl shadow-[0_0_10px_#22d3ee]"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-xl shadow-[0_0_10px_#22d3ee]"></div>
      
      {/* Center Optical Crosshair */}
      <div className="w-6 h-0.5 bg-cyan-400/60 shadow-[0_0_6px_#22d3ee]"></div>
      <div className="h-6 w-0.5 bg-cyan-400/60 shadow-[0_0_6px_#22d3ee] absolute"></div>
      <div className="w-16 h-16 border border-cyan-400/30 rounded-full absolute animate-ping pointer-events-none"></div>
    </div>
  );
}

export function VaultDoorGraphic({ isOpen, size = 'S', code = 'S-01' }: { isOpen: boolean; size?: string; code?: string }) {
  return (
    <div className="relative w-48 h-56 mx-auto perspective-1000">
      {/* Cabinet Frame */}
      <div className="w-full h-full bg-[#0a1120] border-4 border-slate-700 rounded-2xl p-2 relative shadow-2xl flex flex-col justify-between">
        
        {/* Top Vent & Status LED */}
        <div className="flex justify-between items-center px-2 pt-1 border-b border-slate-800 pb-2">
          <span className="text-[10px] font-mono font-bold text-slate-400">{code}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-slate-500 uppercase">SIZE {size}</span>
            <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
          </div>
        </div>

        {/* 3D Swing Door Panel */}
        <div 
          className={`h-36 rounded-xl border-2 transition-all duration-700 origin-left flex items-center justify-center relative ${
            isOpen 
              ? 'bg-slate-900/40 border-amber-500/80 -rotate-y-65 shadow-[0_0_30px_rgba(245,158,11,0.25)]' 
              : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 rotate-y-0 shadow-lg'
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {isOpen ? (
            <div className="text-center space-y-1">
              <span className="text-xs font-mono font-bold text-amber-400 tracking-wider">OPEN</span>
              <div className="w-8 h-1 bg-amber-400/50 mx-auto rounded-full"></div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-slate-600 flex items-center justify-center bg-slate-950">
                <div className="w-3 h-3 rounded-full bg-slate-500"></div>
              </div>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">LOCKED</span>
            </div>
          )}
        </div>

        {/* Bottom Latch Sensor */}
        <div className="flex justify-between items-center px-2 text-[8px] font-mono text-slate-500">
          <span>SOLENOID 12V</span>
          <span>LIMIT SW: {isOpen ? 'HIGH' : 'LOW'}</span>
        </div>

      </div>
    </div>
  );
}

export function SunlightDayIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
      <path d="M12 2V5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 19V22" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 12H5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 12H22" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.93 4.93L7.05 7.05" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16.95 16.95L19.07 19.07" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.93 19.07L7.05 16.95" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16.95 7.05L19.07 4.93" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function NightMoonIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
      <circle cx="15" cy="8" r="1" fill="#bae6fd" />
      <circle cx="17" cy="13" r="1.5" fill="#bae6fd" />
    </svg>
  );
}

export function PlayIconBespoke({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <polygon points="6,4 20,12 6,20" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function PauseIconBespoke({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

export function PrevIconBespoke({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NextIconBespoke({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CinemaIconBespoke({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M7 4V8M12 4V8M17 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polygon points="10,11 16,14 10,17" fill="currentColor" />
    </svg>
  );
}

/**
 * Bespoke Report 1 Slide 1 Graphic:
 * The Last-Day Luggage Dilemma (Hotel 12:00 checkout vs Flight 20:00 night - 4-8h dragging heavy bag)
 */
export function LuggageDilemmaGraphic({ className = "w-48 h-36" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="sunHeat" x1="0" y1="0" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id="suitcaseGrad" x1="60" y1="50" x2="140" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="#334155" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Burning Midday Sun */}
      <circle cx="200" cy="35" r="22" fill="url(#sunHeat)" opacity="0.9" />
      <circle cx="200" cy="35" r="30" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

      {/* Clock Icon 12:00 -> 20:00 */}
      <rect x="20" y="20" width="80" height="34" rx="8" fill="#1e293b" stroke="#ef4444" strokeWidth="1.5" />
      <text x="30" y="42" fill="#f87171" fontSize="12" fontFamily="monospace" fontWeight="bold">12:00 - 20:00</text>

      {/* Heavy Rolling Suitcase */}
      <rect x="80" y="70" width="70" height="85" rx="8" fill="url(#suitcaseGrad)" stroke="#f87171" strokeWidth="2" />
      {/* Handle */}
      <path d="M102 70 V45 H128 V70" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      {/* Stripes */}
      <line x1="88" y1="100" x2="142" y2="100" stroke="#475569" strokeWidth="2" />
      <line x1="88" y1="120" x2="142" y2="120" stroke="#475569" strokeWidth="2" />
      {/* Wheels */}
      <circle cx="95" cy="160" r="6" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
      <circle cx="135" cy="160" r="6" fill="#0f172a" stroke="#64748b" strokeWidth="2" />

      {/* Stress & Fatigue Warning Lines */}
      <path d="M50 115 L70 120" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M45 130 L68 132" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M155 110 L175 105" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />

      {/* Burden Warning Badge */}
      <rect x="60" y="145" width="120" height="24" rx="6" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
      <text x="70" y="161" fill="#fecaca" fontSize="10" fontFamily="sans-serif" fontWeight="bold">4 - 8H MỆT MỎI DƯỚI NẮNG</text>
    </svg>
  );
}

/**
 * Bespoke Report 1 Slide 2 Graphic:
 * Da Nang Tourism Freedom (Dragon Bridge arch, Beach waves, Hand-free explorer)
 */
export function DanangTravelGraphic({ className = "w-48 h-36" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="bridgeGrad" x1="20" y1="80" x2="220" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="waveGrad" x1="0" y1="130" x2="240" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284c7" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
      </defs>

      {/* Iconic Dragon Bridge Golden Arch */}
      <path d="M20 110 Q70 30, 120 75 T220 70" stroke="url(#bridgeGrad)" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* Dragon Head Stylized */}
      <polygon points="215,60 235,70 215,80" fill="#f59e0b" />
      <circle cx="225" cy="68" r="2" fill="#ef4444" />

      {/* Han River / My Khe Ocean Waves */}
      <path d="M0 135 C40 125, 80 145, 120 135 C160 125, 200 145, 240 135 V180 H0 Z" fill="url(#waveGrad)" opacity="0.85" />
      <path d="M0 150 C50 142, 100 158, 150 150 C200 142, 220 155, 240 150 V180 H0 Z" fill="#075985" opacity="0.9" />

      {/* Free Tourist Figure with Hands Up */}
      <circle cx="85" cy="80" r="9" fill="#38bdf8" />
      <path d="M85 90 V115" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
      <path d="M68 96 L85 102 L102 96" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
      <path d="M85 115 L74 135" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
      <path d="M85 115 L96 135" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

      {/* Badge: 100% Rảnh Tay */}
      <rect x="40" y="10" width="160" height="26" rx="6" fill="#047857" stroke="#34d399" strokeWidth="1.5" />
      <text x="50" y="27" fill="#ecfdf5" fontSize="11" fontFamily="sans-serif" fontWeight="bold">✨ 100% RẢNH TAY DU LỊCH</text>
    </svg>
  );
}

/**
 * Bespoke Report 1 Slide 3 Graphic:
 * 30-Second Touchless Access (QR scan to door pop)
 */
export function Fast30sGraphic({ className = "w-48 h-36" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* 30s Stopwatch Dial */}
      <circle cx="65" cy="90" r="45" fill="#0f172a" stroke="#06b6d4" strokeWidth="3" />
      <circle cx="65" cy="90" r="3" fill="#22d3ee" />
      <line x1="65" y1="90" x2="65" y2="55" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
      <line x1="65" y1="90" x2="88" y2="90" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="58" y="36" width="14" height="6" rx="2" fill="#06b6d4" />

      {/* QR Code Matrix */}
      <rect x="145" y="45" width="70" height="70" rx="8" fill="#ffffff" stroke="#0891b2" strokeWidth="2" />
      <rect x="155" y="55" width="16" height="16" fill="#0f172a" />
      <rect x="189" y="55" width="16" height="16" fill="#0f172a" />
      <rect x="155" y="89" width="16" height="16" fill="#0f172a" />
      <rect x="175" y="75" width="10" height="10" fill="#06b6d4" />

      {/* Laser Scanning Beam */}
      <line x1="140" y1="80" x2="220" y2="80" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="4 2" />

      {/* Badge: 30 Giây Tự Phục Vụ */}
      <rect x="35" y="145" width="170" height="26" rx="6" fill="#083344" stroke="#06b6d4" strokeWidth="1.5" />
      <text x="45" y="162" fill="#cffafe" fontSize="11" fontFamily="monospace" fontWeight="bold">⚡ 30 GIÂY MỞ TỦ TỰ ĐỘNG</text>
    </svg>
  );
}

/**
 * Bespoke Report 1 Slide 4 Graphic:
 * 24/7 IoT Hardware Security (ESP32 + Solenoid + Limit Switch + Cloud)
 */
export function IoTSecurityGraphic({ className = "w-48 h-36" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Central Security Shield */}
      <path d="M120 20 L180 45 V95 C180 135, 120 165, 120 165 C120 165, 60 135, 60 95 V45 Z" fill="#064e3b" stroke="#10b981" strokeWidth="2.5" />

      {/* ESP32 Microchip Shape */}
      <rect x="95" y="60" width="50" height="50" rx="4" fill="#022c22" stroke="#34d399" strokeWidth="1.5" />
      <circle cx="120" cy="85" r="10" fill="#059669" />
      <path d="M115 85 L119 89 L126 81" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Solenoid Bolt Lines */}
      <rect x="35" y="75" width="22" height="14" rx="2" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
      <rect x="25" y="79" width="10" height="6" fill="#f59e0b" />
      <path d="M57 82 H95" stroke="#10b981" strokeWidth="2" strokeDasharray="2 2" />

      {/* Cloud & MQTT Signal */}
      <path d="M183 82 H210" stroke="#10b981" strokeWidth="2" strokeDasharray="2 2" />
      <rect x="210" y="74" width="20" height="16" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
      <circle cx="220" cy="82" r="3" fill="#38bdf8" />

      {/* Badge: Bảo mật IoT 24/7 */}
      <rect x="40" y="145" width="160" height="26" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
      <text x="50" y="162" fill="#a7f3d0" fontSize="11" fontFamily="sans-serif" fontWeight="bold">🛡️ BẢO MẬT PHẦN CỨNG 24/7</text>
    </svg>
  );
}

