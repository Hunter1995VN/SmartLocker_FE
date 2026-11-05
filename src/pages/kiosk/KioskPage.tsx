import { useState, useEffect, useRef } from 'react';
import KioskQrScanner from '../../components/kiosk/KioskQrScanner';
import { kioskApi } from '../../api/kioskService';
import type { KioskStationStatus } from '../../api/kioskService';
import { kioskSignalR } from '../../services/kioskSignalR';
import WalkInBooking from '../../components/kiosk/WalkInBooking';
import SensorPhotoConfirmation from '../../components/kiosk/SensorPhotoConfirmation';
import KioskLockerStatus from '../../components/kiosk/KioskLockerStatus';
import { sounds } from '../../utils/soundEffects';
import { QRCodeSVG } from 'qrcode.react';
import type { CreateBookingResponse } from '../../api/bookingService';
import { kioskText, kioskLocales } from '../../utils/kioskMessages';
import {
  SmartLockerLogo3D,
  CheckInIcon3D,
  CheckOutIcon3D,
  SunlightDayIcon,
  NightMoonIcon
} from '../../components/kiosk/KioskIcons';
import {
  SUPPORTED_LANGUAGES,
  I18N_DICTIONARY,
  type KioskLanguage
} from '../../utils/kioskI18n';

type KioskStep = 'WELCOME' | 'IDLE' | 'AUTH' | 'LOCKER_ACTIVE' | 'OVERDUE' | 'SUCCESS' | 'REVIEW_PENDING' | 'WALK_IN';
type OperationMode = 'CHECK_IN' | 'CHECK_OUT';
type AuthMethod = 'QR' | 'ACCESS_CODE';

export default function KioskPage() {
  // Step flow: Starts with WELCOME (Language Select)
  const [step, setStep] = useState<KioskStep>('WELCOME');
  const [opMode, setOpMode] = useState<OperationMode>('CHECK_IN');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('QR');
  const [accessCode, setAccessCode] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [walkInPin, setWalkInPin] = useState('');
  const [lang, setLang] = useState<KioskLanguage>('VI');
  const x = kioskText(lang);

  // Outdoor Sunlight Anti-Glare Mode (default true for outdoor tablet kiosk)
  const [outdoorMode, setOutdoorMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('kiosk_outdoor_mode');
    return saved !== null ? saved === 'true' : true;
  });

  // Station status
  const [stationId, setStationId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qStation = urlParams.get('stationId');
    if (qStation) return qStation;
    const saved = localStorage.getItem('kiosk_station_id');
    return saved || '';
  });
  const [stationStatus, setStationStatus] = useState<KioskStationStatus | null>(null);
  const [allStations, setAllStations] = useState<Array<{ id: string; name: string; address: string }>>([]);

  // Active locker interaction
  const [activeBookingCode, setActiveBookingCode] = useState<string>('');
  const [activeBookingId, setActiveBookingId] = useState<string>('');
  const [activeLockerId, setActiveLockerId] = useState<string>('');
  const [activeLockerCode, setActiveLockerCode] = useState<string>('');
  const [activeLockerSize, setActiveLockerSize] = useState<string>('');
  const [activeDoorState, setActiveDoorState] = useState<string>('UNKNOWN');
  const [overdueFee, setOverdueFee] = useState<number>(0);
  const [overduePayment, setOverduePayment] = useState<CreateBookingResponse>();

  const sessionTokenRef = useRef<string | undefined>(undefined);
  const credentialRef = useRef<{ credentialType: 'QR' | 'ACCESS_CODE'; payload: string }>({ credentialType: 'QR', payload: '' });
  const observedOpenRef = useRef(false);
  const accessGrantedRef = useRef(false);
  const submittingRef = useRef(false);
  const operationStartedRef = useRef(0);
  const activeLockerIdRef = useRef<string>('');
  const activeLockerCodeRef = useRef<string>('');
  useEffect(() => {
    activeLockerIdRef.current = activeLockerId;
    activeLockerCodeRef.current = activeLockerCode;
  }, [activeLockerId, activeLockerCode]);

  // Status & error
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // UC-C27: Sensor anomaly modal
  const [showSensorModal, setShowSensorModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [doorTimerSeconds, setDoorTimerSeconds] = useState<number>(0);

  // Success auto-return countdown timer
  const [successCountdown, setSuccessCountdown] = useState<number>(6);

  // Real-time clock
  const [currentTime, setCurrentTime] = useState<string>('');

  const t = I18N_DICTIONARY[lang] || I18N_DICTIONARY.VI;

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString(kioskLocales[lang], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  // Fetch stations on mount
  useEffect(() => {
    kioskApi.getStations().then((res: any) => {
      let list: Array<{ id: string; name: string; address: string }> = [];
      if (Array.isArray(res?.data)) {
        list = res.data;
      } else if (res?.data && 'items' in res.data && Array.isArray(res.data.items)) {
        list = res.data.items;
      } else if (Array.isArray(res)) {
        list = res;
      }
      if (list.length > 0) {
        setAllStations(list);
        if (!stationId || !list.some(s => s.id === stationId)) {

          const selected = list[0].id;
          setStationId(selected);
          localStorage.setItem('kiosk_station_id', selected);
        }
      }
    }).catch((err) => {
      console.warn('Cannot load station data:', err);
      setAllStations([]);
      setStationStatus(null);
      setErrorMessage(kioskText(lang)('networkError'));
    });
  }, []);

  // Fetch station status & connect SignalR when stationId changes
  useEffect(() => {
    if (!stationId) return;

    let cancelled = false;
    setStationStatus(null);
    const refreshStatus = async () => {
      try {
        const res = await kioskApi.getStationStatus(stationId);
        if (!cancelled) setStationStatus(res.success ? res.data : null);
      } catch { if (!cancelled) setStationStatus(null); }
    };
    void refreshStatus();
    const statusTimer = setInterval(refreshStatus, 5000);

    // Connect SignalR
    kioskSignalR.connect(
      stationId,
      (event) => {
        if (event.stationId === stationId) void refreshStatus();
        const curId = activeLockerIdRef.current || activeLockerId;
        const occurredAt = Date.parse(event.occurredAt);
        if (!accessGrantedRef.current || !operationStartedRef.current || !Number.isFinite(occurredAt)
          || occurredAt < operationStartedRef.current || event.stationId !== stationId) return;
        if (curId && event.lockerId === curId) {
          setActiveDoorState(event.doorState);
          if (event.doorState === 'OPEN') observedOpenRef.current = true;
          if (event.doorState === 'CLOSED' && observedOpenRef.current) {
            // Only the authenticated operation-status result confirms booking completion.
          } else {
            if (soundEnabled) sounds.playDoorOpenChime();
          }
        }
      },
      () => { /* Command acknowledgement is not proof that the door opened. */ },
      () => { void kioskApi.getStationStatus(stationId).then(res => { if (res.success) setStationStatus(res.data); }).catch(() => setStationStatus(null)); }
    );

    return () => {
      cancelled = true;
      clearInterval(statusTimer);
      kioskSignalR.disconnect();
    };
  }, [stationId, activeLockerId, activeLockerCode, soundEnabled]);

  // Door timer for active locker
  useEffect(() => {
    let interval: any = null;
    if (step === 'LOCKER_ACTIVE') {
      interval = setInterval(() => {
        setDoorTimerSeconds(Math.max(0, Math.floor((Date.now() - operationStartedRef.current) / 1000)));
      }, 1000);
    } else {
      setDoorTimerSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, activeDoorState]);

  // Countdown timer when on SUCCESS screen -> resets to WELCOME (Language Selection)
  useEffect(() => {
    let timer: any = null;
    if (step === 'SUCCESS') {
      setSuccessCountdown(6);
      timer = setInterval(() => {
        setSuccessCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleReturnToWelcome();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step]);

  // Handle Keypad
  const handleKeypadPress = (val: string) => {
    if (soundEnabled) sounds.playKeypadTap();
    if (val === 'CLEAR') {
      setAccessCode('');
    } else if (val === 'BACK') {
      setAccessCode((prev) => prev.slice(0, -1));
    } else {
      if (accessCode.length < 8) {
        setAccessCode((prev) => prev + val);
      }
    }
  };

  // Toggle Outdoor Sunlight Mode
  const handleToggleOutdoorMode = () => {
    if (soundEnabled) sounds.playKeypadTap();
    const next = !outdoorMode;
    setOutdoorMode(next);
    localStorage.setItem('kiosk_outdoor_mode', String(next));
  };

  // Handle Language Selection from Welcome Screen
  const handleSelectLanguage = (selected: KioskLanguage) => {
    if (soundEnabled) sounds.playUnlockSuccess();
    setLang(selected);
    setStep('IDLE');
  };

  // Return to Welcome (Language Select) after completing transaction
  const handleReturnToWelcome = () => {
    accessGrantedRef.current = false;
    setOverduePayment(undefined);
    sessionTokenRef.current = undefined;
    credentialRef.current = { credentialType: 'QR', payload: '' };
    operationStartedRef.current = 0;
    observedOpenRef.current = false;
    activeLockerIdRef.current = '';
    activeLockerCodeRef.current = '';
    setWalkInPin('');
    setLang('VI');
    setStep('WELCOME');
    setAccessCode('');
    setErrorMessage('');
    setShowSensorModal(false);
    setShowHelpModal(false);
    setAccessCode('');
    setOverdueFee(0);
    setActiveDoorState('UNKNOWN');
    setActiveLockerSize('');
    setActiveBookingCode('');
    setActiveBookingId('');
    setActiveLockerId('');
    setActiveLockerCode('');
  };

  // Process QR or PIN
  const handleProcessCredential = async (type: 'QR' | 'ACCESS_CODE', rawValue: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    accessGrantedRef.current = false;
    if (credentialRef.current.credentialType !== type || credentialRef.current.payload !== rawValue) {
      sessionTokenRef.current = undefined;
      setOverduePayment(undefined);
    }
    observedOpenRef.current = false;
    operationStartedRef.current = Date.now();
    credentialRef.current = { credentialType: type, payload: rawValue };
    const targetStationId = stationId;
    // The discovery list loads independently. It is not an authorization source;
    // the kiosk API verifies the exact station, booking and live device mapping.
    if (!targetStationId) {
      submittingRef.current = false;
      setErrorMessage(x('networkError'));
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      if (opMode === 'CHECK_IN') {
        const res = await kioskApi.checkIn({
          stationId: targetStationId,
          credentialType: type,
          payload: rawValue,
        });

        if (res.success && res.data) {
          accessGrantedRef.current = true;
          if (soundEnabled) sounds.playUnlockSuccess();
          sessionTokenRef.current = res.data.sessionToken;
          setActiveBookingId(res.data.bookingId);
          setActiveBookingCode(res.data.bookingCode);
          setActiveLockerId(res.data.lockerId);
          setActiveLockerCode(res.data.lockerCode);
          setActiveLockerSize(res.data.lockerSize);
          setActiveDoorState(res.data.doorState || 'UNKNOWN');
          setStep('LOCKER_ACTIVE');
        } else {
          setErrorMessage(lang === 'VI' ? (res.message || x('authError')) : x('authError'));
          if (soundEnabled) sounds.playWarningAlert();
        }
      } else {
        const res = await kioskApi.checkOut({
          sessionToken: sessionTokenRef.current,
          stationId: targetStationId,
          credentialType: type,
          payload: rawValue,
        });

        if (res.success && res.data) {
          if (res.data.isOverdue) {
            setOverduePayment(undefined);
            sessionTokenRef.current = res.data.sessionToken;
            setActiveBookingId(res.data.bookingId);
            setOverdueFee(res.data.overdueFee || 0);
            setActiveBookingCode(res.data.bookingCode || '');
            setStep('OVERDUE');
            if (soundEnabled) sounds.playWarningAlert();
          } else {
            accessGrantedRef.current = true;
            if (soundEnabled) sounds.playUnlockSuccess();
            sessionTokenRef.current = res.data.sessionToken;
          setActiveBookingId(res.data.bookingId || '');
            setActiveBookingCode(res.data.bookingCode || '');
            setActiveLockerId(res.data.lockerId || '');
            setActiveLockerCode(res.data.lockerCode || '');
            setActiveLockerSize(res.data.lockerSize || '');
            setActiveDoorState(res.data.doorState || 'UNKNOWN');
            setStep('LOCKER_ACTIVE');
          }
        } else {
          setErrorMessage(lang === 'VI' ? (res.message || x('authError')) : x('authError'));
          if (soundEnabled) sounds.playWarningAlert();
        }
      }
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setErrorMessage(x('networkError'));
      } else {
        setErrorMessage(lang === 'VI' ? (err.response?.data?.message || x('authError')) : x('authError'));
      }
      if (soundEnabled) sounds.playWarningAlert();
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!['LOCKER_ACTIVE', 'REVIEW_PENDING'].includes(step) || !activeBookingId || !sessionTokenRef.current) return;
    let disposed = false;
    let pending = false;
    const poll = async () => {
      if (pending) return; pending = true;
      try {
        const result = await kioskApi.operationStatus({ stationId, bookingId: activeBookingId, sessionToken: sessionTokenRef.current! });
        if (disposed || !result.success || result.data.operation !== opMode) return;
        setActiveDoorState(result.data.doorState);
        if (result.data.doorState === 'OPEN') observedOpenRef.current = true;
        if (result.data.complete) { accessGrantedRef.current = false; setStep('SUCCESS'); }
        else if (result.data.manualReviewPending) setStep('REVIEW_PENDING');
      } catch { /* Keep the operation pending; connection loss cannot complete it. */ }
      finally { pending = false; }
    };
    void poll(); const timer = window.setInterval(poll, 2000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [step, activeBookingId, stationId, opMode]);

  useEffect(() => {
    if (step !== 'OVERDUE' || !overduePayment?.orderCode) return;
    let disposed = false;
    let pending = false;
    const poll = async () => {
      if (pending) return; pending = true;
      try {
        const result = await kioskApi.syncPayment(overduePayment.orderCode!);
        if (!disposed && result.success && result.data.status === 'PAID' && result.data.isSuccess)
          await handleProcessCredential(credentialRef.current.credentialType, credentialRef.current.payload);
      } catch { /* A redirect or a failed sync is not proof of payment. */ }
      finally { pending = false; }
    };
    void poll(); const timer = window.setInterval(poll, 5000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [step, overduePayment]);



  return (
    <div className={`h-screen max-h-screen font-sans flex flex-col justify-between selection:bg-slate-300 select-none overflow-hidden transition-colors duration-200 ${
      outdoorMode
        ? 'bg-[#f4f6f9] text-slate-900'
        : 'bg-[#0e131d] text-slate-100'
    }`}>

      {/* =========================================================================
          1. CLEAN INDUSTRIAL TRANSIT HEADER
         ========================================================================= */}
      <header className={`h-14 px-5 border-b flex items-center justify-between shadow-sm z-20 transition-colors ${
        outdoorMode
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#141b27] border-slate-800 text-slate-100'
      }`}>

        {/* Left: Station Identity */}
        <div className="flex items-center gap-3">
          <SmartLockerLogo3D className="w-8 h-8" />

          <div>
            <div className="flex items-center gap-2">
              <select
                value={stationId}
                disabled={loading || step === 'LOCKER_ACTIVE' || step === 'OVERDUE'}
                onChange={(e) => {
                  const newId = e.target.value;
                  setStationId(newId);
                  localStorage.setItem('kiosk_station_id', newId);
                }}
                className={`text-sm font-black tracking-tight uppercase bg-transparent border-0 outline-none cursor-pointer max-w-[240px] md:max-w-[320px] truncate ${
                  outdoorMode ? 'text-slate-900' : 'text-slate-100'
                }`}
                title={x('selectStation')} disabled={!['WELCOME','IDLE'].includes(step)}
              >
                {allStations.map((st) => (
                  <option key={st.id} value={st.id} className="text-slate-900 bg-white">
                    {st.name}
                  </option>
                ))}
              </select>
              <span className={`w-2 h-2 rounded-full ${stationStatus?.connectivityStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500'}`} title={stationStatus?.connectivityStatus || 'UNKNOWN'}></span>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              {stationStatus?.stationAddress || allStations.find(s => s.id === stationId)?.address || x('stationUnavailable')}
            </div>
          </div>
        </div>

        {/* Center: Digital Clock */}
        <div className={`hidden md:flex items-center gap-2 px-3.5 py-1 rounded-lg border font-mono text-xs font-bold ${
          outdoorMode ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <span>{currentTime || '00:00:00'}</span>
        </div>

        {/* Right: Controls & Language Pill */}
        <div className="flex items-center gap-2">

          <label className="text-xs"><span className="sr-only">{x('language')}</span>
            <select aria-label={x('language')} data-testid="kiosk-language" className="max-w-[140px] rounded-lg border bg-transparent p-2" value={lang} onChange={e=>setLang(e.target.value as KioskLanguage)}>
              {SUPPORTED_LANGUAGES.map(item=><option key={item.code} value={item.code} className="bg-white text-slate-900">{item.flag} {item.nativeName}</option>)}
            </select>
          </label>

          {/* Sunlight Contrast Mode Toggle */}
          <button
            onClick={handleToggleOutdoorMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
              outdoorMode
                ? 'bg-amber-100/70 hover:bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title={outdoorMode?x('glare'):x('night')}
          >
            {outdoorMode ? (
              <>
                <SunlightDayIcon className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline">{x('glare')}</span>
              </>
            ) : (
              <>
                <NightMoonIcon className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">{x('night')}</span>
              </>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border text-xs font-mono font-bold ${
              outdoorMode
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={x('sound')}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          {/* Attendant Help */}
          <button
            onClick={() => setShowHelpModal(true)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
              outdoorMode
                ? 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-800'
                : 'bg-sky-950/40 hover:bg-sky-900/60 border-sky-800 text-sky-300'
            }`}
          >
            {x('help')}
          </button>

        </div>
      </header>

      {/* =========================================================================
          2. MAIN VIEWPORT WORKSPACE (STRICTLY FITS 100VH WITHOUT SCROLLBAR)
         ========================================================================= */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 md:p-5 max-w-6xl mx-auto w-full z-10 overflow-hidden">
        {step === 'IDLE' && <button type="button" className="mb-4 rounded-xl bg-blue-700 px-8 py-4 font-bold text-white" disabled={!stationStatus || loading} onClick={() => { setOpMode('CHECK_IN'); setStep('WALK_IN'); }}>{x('book')}</button>}
        {step === 'WALK_IN' && <div className="w-full overflow-y-auto"><WalkInBooking lang={lang} stationId={stationId} onCancel={handleReturnToWelcome} onReady={async pin => { setWalkInPin(pin); await handleProcessCredential('ACCESS_CODE', pin); }}/></div>}
        {walkInPin && step === 'LOCKER_ACTIVE' && <section className="rounded-xl bg-blue-50 p-3 text-center text-slate-900"><p>{x('savePin')}</p><strong className="text-2xl font-mono">{walkInPin.slice(0,4)} {walkInPin.slice(4)}</strong></section>}


        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="w-full max-w-xl mb-3 p-3 rounded-xl bg-rose-700 border border-rose-600 text-white flex items-center justify-between text-xs font-bold shadow-md">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="px-2.5 py-1 bg-rose-900 rounded-lg text-xs">OK</button>
          </div>
        )}

        {/* =========================================================================
            STATE 0: WELCOME & LANGUAGE SELECTION (BẮT BUỘC CHỌN NGÔN NGỮ ĐẦU TIÊN)
           ========================================================================= */}
        {step === 'WELCOME' && (
          <div className="w-full max-w-3xl my-auto text-center space-y-6 animate-fade-in">

            {/* Header Greeting */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 shadow-sm">
                <span>{stationStatus?.stationName || x('stationUnavailable')}</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{x('selfService')}</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                {t.welcomeTitle}
              </h1>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                Welcome • 환영합니다 • 欢迎 • ようこそ
              </p>
            </div>

            {/* Language Selection Grid */}
            <div className={`p-6 rounded-3xl border shadow-lg ${
              outdoorMode ? 'bg-white border-slate-200' : 'bg-[#131b28] border-slate-800'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                {t.selectLanguagePrompt}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {SUPPORTED_LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => handleSelectLanguage(item.code)}
                    className={`group p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center space-y-2 active:scale-95 text-center cursor-pointer ${
                      outdoorMode
                        ? 'bg-slate-50 hover:bg-sky-50 border-slate-200 hover:border-sky-500 shadow-sm'
                        : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-sky-400 shadow-md'
                    }`}
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">
                      {item.flag}
                    </span>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {item.nativeName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Demonstration Toolbar */}
            <div className="flex items-center justify-center gap-2 pt-2 text-xs font-mono text-slate-500 dark:text-slate-400">



            </div>

          </div>
        )}

        {/* =========================================================================
            STATE 1: IDLE WELCOME (HERO ACTIONS + NEAT 3D LOCKER TOWER)
           ========================================================================= */}
        {step === 'IDLE' && (
          <div className="w-full h-full max-h-[580px] grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch my-auto">

            {/* Left 7 Columns: Tactile Action Cards (NO AI clutter, confident typography) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${stationStatus?.connectivityStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {stationStatus?.stationName || x('stationUnavailable')}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight">
                  {x('chooseAction')}
                </h2>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {x('chooseHint')}
                </p>
              </div>

              {/* The Two Dominant Tactile Action Cards (Entire cards are touch buttons) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">

                {/* 1. GỬI HÀNH LÝ / DEPOSIT - Full card is touch button */}
                <button
                  onClick={() => {
                    if (soundEnabled) sounds.playKeypadTap();
                    setOpMode('CHECK_IN');
                    setStep('AUTH');
                    setErrorMessage('');
                  setAuthMethod('QR');
                  }}
                  className={`group relative p-6 rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between active:scale-[0.98] text-left cursor-pointer shadow-lg hover:shadow-xl ${
                    outdoorMode
                      ? 'bg-white hover:bg-sky-50/60 border-slate-300 hover:border-sky-500 text-slate-900 ring-sky-500/10 hover:ring-4'
                      : 'bg-[#131b28] hover:bg-[#162132] border-slate-800 hover:border-sky-500 text-white hover:ring-4 ring-sky-500/20'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 group-hover:scale-105 transition-transform">
                      <CheckInIcon3D className="w-14 h-14" />
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-300/40">
                      {t.depositTitle}
                    </span>
                  </div>

                  <div className="my-auto py-3">
                    <h3 className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors uppercase tracking-tight">
                      {t.depositTitle}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {t.depositDesc}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 w-full text-xs font-bold text-sky-600 dark:text-sky-400">
                    <span>{x('depositTap')}</span>
                    <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>

                {/* 2. LẤY HÀNH LÝ / RETRIEVE - Full card is touch button */}
                <button
                  onClick={() => {
                    if (soundEnabled) sounds.playKeypadTap();
                    setOpMode('CHECK_OUT');
                    setStep('AUTH');
                    setErrorMessage('');
                  setAuthMethod('QR');
                  }}
                  className={`group relative p-6 rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between active:scale-[0.98] text-left cursor-pointer shadow-lg hover:shadow-xl ${
                    outdoorMode
                      ? 'bg-white hover:bg-emerald-50/60 border-slate-300 hover:border-emerald-500 text-slate-900 ring-emerald-500/10 hover:ring-4'
                      : 'bg-[#131b28] hover:bg-[#15232a] border-slate-800 hover:border-emerald-500 text-white hover:ring-4 ring-emerald-500/20'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                      <CheckOutIcon3D className="w-14 h-14" />
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300/40">
                      {t.retrieveTitle}
                    </span>
                  </div>

                  <div className="my-auto py-3">
                    <h3 className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                      {t.retrieveTitle}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {t.retrieveDesc}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 w-full text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>{x('retrieveTap')}</span>
                    <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>

              </div>

              {/* Bottom Quick Presets & Status */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                outdoorMode ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-2">




                </div>

                <div className="text-slate-500 text-xs font-mono">

                </div>
              </div>

            </div>

            {/* Right 5 Columns: 3D Locker Tower (Neat, proportional, fits frame) */}
            <div className={`lg:col-span-5 border rounded-2xl relative transition-all flex flex-col overflow-y-auto min-h-0 h-full ${
              outdoorMode
                ? 'bg-white border-slate-200 shadow-sm text-slate-900'
                : 'bg-[#131b28] border-slate-800 shadow-lg text-slate-100'
            }`}>
              <KioskLockerStatus status={stationStatus} lang={lang} activeLockerId={activeLockerId} />
            </div>

          </div>
        )}

        {/* =========================================================================
            STATE 2: AUTHENTICATION (SCANNER & VAULT KEYPAD)
           ========================================================================= */}
        {step === 'AUTH' && (
          <div className={`w-full max-w-lg border-2 rounded-3xl p-6 shadow-xl relative transition-all my-auto ${
            outdoorMode
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-[#131b28] border-slate-800 text-slate-100'
          }`}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <button
                disabled={loading}
                onClick={() => setStep('IDLE')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                  outdoorMode
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                ← {t.cancel}
              </button>

              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                {opMode === 'CHECK_IN' ? t.depositTitle : t.retrieveTitle}
              </span>

              <div className="w-12"></div>
            </div>

            {/* Mode Switcher: QR or PIN */}
            <div className={`grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl border ${
              outdoorMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <button
                onClick={() => {
                  if (submittingRef.current) return;
                  if (soundEnabled) sounds.playKeypadTap();
                  setErrorMessage('');
                  setAuthMethod('QR');
                }}
                className={`py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                  authMethod === 'QR'
                    ? (outdoorMode ? 'bg-sky-600 text-white shadow-sm' : 'bg-sky-500 text-slate-950 font-black')
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.scanQr}
              </button>
              <button
                onClick={() => {
                  if (submittingRef.current) return;
                  if (soundEnabled) sounds.playKeypadTap();
                  setErrorMessage('');
                  setAuthMethod('ACCESS_CODE');
                }}
                className={`py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                  authMethod === 'ACCESS_CODE'
                    ? (outdoorMode ? 'bg-sky-600 text-white shadow-sm' : 'bg-sky-500 text-slate-950 font-black')
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.enterPin}
              </button>
            </div>

            {/* TAB 1: SCANNER */}
            {authMethod === 'QR' && (
              <div className="flex flex-col items-center space-y-3">
                <KioskQrScanner lang={lang} busy={loading} onDecoded={async value => { if (soundEnabled) sounds.playScanChime(); await handleProcessCredential('QR', value); }} />

                <div className="w-full pt-2">
                  <input
                    type="text"
                    placeholder={t.qrPlaceholder}
                    aria-label={t.qrPlaceholder}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                    className={`w-full rounded-xl px-4 py-2 text-xs font-mono focus:outline-none border ${
                      outdoorMode
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:ring-1 focus:ring-sky-500'
                        : 'bg-slate-900 border-slate-800 text-slate-200 focus:ring-1 focus:ring-sky-500'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement;
                        if (target.value.trim()) {
                          const value = target.value.trim();
                          target.value = '';
                          void handleProcessCredential('QR', value);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: NUMPAD */}
            {authMethod === 'ACCESS_CODE' && (
              <div className="space-y-3">
                {/* 8-Digit Display */}
                <div className={`border rounded-xl py-2.5 px-4 flex items-center justify-center gap-1.5 font-mono ${
                  outdoorMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const char = accessCode[idx];
                    return (
                      <div
                        key={idx}
                        className={`w-7 h-9 rounded-lg flex items-center justify-center font-bold text-base transition-all ${
                          char
                            ? (outdoorMode ? 'border-2 border-sky-600 text-sky-800 bg-white shadow-sm' : 'border-2 border-sky-400 text-sky-300 bg-slate-800')
                            : (outdoorMode ? 'border border-slate-300 text-slate-400 bg-white' : 'border border-slate-800 text-slate-700 bg-slate-900')
                        }`}
                      >
                        {char || '•'}
                      </div>
                    );
                  })}
                </div>

                {/* Tactile Keypad */}
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKeypadPress(key)}
                      className={`h-12 rounded-xl font-mono font-bold text-lg active:translate-y-0.5 transition-all ${
                        key === 'CLEAR'
                          ? (outdoorMode ? 'bg-rose-100 border border-rose-300 text-rose-700 text-xs' : 'bg-rose-950/50 border border-rose-800 text-rose-300 text-xs')
                          : key === 'BACK'
                          ? (outdoorMode ? 'bg-amber-100 border border-amber-300 text-amber-800 text-sm' : 'bg-amber-950/50 border border-amber-800 text-amber-300 text-sm')
                          : (outdoorMode ? 'bg-white border border-slate-300 text-slate-900 shadow-sm' : 'bg-slate-900 border border-slate-800 text-white shadow-sm')
                      }`}
                    >
                      {key === 'CLEAR' ? 'CLR' : key === 'BACK' ? '⌫' : key}
                    </button>
                  ))}
                </div>

                <button
                  disabled={accessCode.length !== 8 || loading}
                  onClick={() => handleProcessCredential('ACCESS_CODE', accessCode)}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                    accessCode.length >= 4 && !loading
                      ? (outdoorMode ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm' : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-black')
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? t.unlocking : t.confirmUnlock}
                </button>
              </div>
            )}

            {/* Quick Test Presets inside Auth */}
            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">

              <div className="flex gap-2">


              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            STATE 3: LOCKER ACTIVE (DOOR UNLOCKED)
           ========================================================================= */}
        {step === 'LOCKER_ACTIVE' && (
          <div className={`w-full max-w-3xl border-2 rounded-3xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-5 items-center my-auto ${
            outdoorMode
              ? 'bg-white border-sky-600 text-slate-900'
              : 'bg-[#131b28] border-sky-500/50 text-slate-100'
          }`}>

            {/* Left 6 Columns: 3D Model with Door Physically Open */}
            <div className={`md:col-span-6 rounded-2xl border p-2 relative min-h-[280px] max-h-[340px] flex items-center justify-center ${
              outdoorMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div role="status" aria-label={x('status')} className="text-center space-y-5">
                <strong className="text-4xl">{activeLockerCode || '—'}</strong>
                <p className="text-2xl">{activeDoorState}</p><p>{activeDoorState === 'OPEN' ? t.doorCloseInstruction : x('waitingDoor')}</p>
              </div>
            </div>

            {/* Right 6 Columns: Status Details */}
            <div className="md:col-span-6 space-y-4">

              <div className="flex justify-between items-center text-xs font-mono border-b pb-2 border-slate-200 dark:border-slate-800">
                <span>{x('order')}: {activeBookingCode}</span>
                <span className="font-bold">{x('sizeLabel')}: {activeLockerSize || '—'}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">
                  {x('yourLocker')}
                </span>
                <span className="text-4xl md:text-5xl font-black font-mono text-sky-600 dark:text-sky-400">
                  {activeLockerCode || '—'}
                </span>
              </div>

              <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                outdoorMode ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}>
                {opMode === 'CHECK_IN' ? t.doorOpenedDepositDesc : t.doorOpenedRetrieveDesc}
                <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {t.doorCloseInstruction}
                </div>
              </div>

              {/* Timer & Exception */}
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-500">
                  {x('elapsed')}: <strong className="text-slate-900 dark:text-white font-mono">{doorTimerSeconds}s</strong>
                </span>
                {doorTimerSeconds >= 30 && opMode === 'CHECK_OUT' && (
                  <button
                    onClick={() => setShowSensorModal(true)}
                    className="text-amber-600 dark:text-amber-400 underline font-bold"
                  >
                    {t.sensorAlertButton}
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowHelpModal(true)}
                className={`w-full py-3 rounded-xl text-xs font-bold uppercase transition-colors ${
                  outdoorMode ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {x('staff')}
              </button>

            </div>

          </div>
        )}

        {/* =========================================================================
            STATE 4: OVERDUE FEE
           ========================================================================= */}
        {step === 'OVERDUE' && (
          <div className={`w-full max-w-md border-2 rounded-3xl p-6 text-center space-y-4 my-auto ${
            outdoorMode
              ? 'bg-white border-amber-500 text-slate-900 shadow-xl'
              : 'bg-[#131b28] border-amber-500/50 text-white shadow-2xl'
          }`}>
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
              {t.overdueTitle}
            </span>
            <div className={`p-4 rounded-xl border ${
              outdoorMode ? 'bg-amber-50 border-amber-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <span className="text-xs text-slate-500 block mb-1">{x('fee')}</span>
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {overdueFee.toLocaleString(kioskLocales[lang])} đ
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t.overdueSubtitle}
            </p>
            {overduePayment ? <div className="space-y-3 flex flex-col items-center">
              <QRCodeSVG value={overduePayment.qrCode || overduePayment.paymentUrl} size={210} />
              <p className="text-xs">{overduePayment.qrCode ? x('scanPay') : x('paymentPageQr')}</p>
            </div> : <button disabled={loading} className="rounded-xl bg-blue-700 text-white px-6 py-3" onClick={async () => {
              if (loading || !activeBookingId) return; setLoading(true); setErrorMessage('');
              try {
                const result = await kioskApi.payOverdue({ stationId, bookingId: activeBookingId, ...credentialRef.current, sessionToken: sessionTokenRef.current });
                if (result.success && result.data.paymentUrl) { setOverduePayment(result.data); setOverdueFee(result.data.amount); }
                else setErrorMessage(lang === 'VI' ? (result.message || x('submitError')) : x('submitError'));
              } catch (error) {
                setErrorMessage(lang === 'VI' ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message || x('submitError')) : x('submitError'));
              } finally { setLoading(false); }
            }}>{loading ? x('sending') : x('payFee')}</button>}
            <button
              onClick={handleReturnToWelcome}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white uppercase"
            >
              {t.close}
            </button>
          </div>
        )}

        {/* =========================================================================
            STATE 5: SUCCESS (AUTO RESETS TO WELCOME / LANGUAGE SELECT SCREEN)
           ========================================================================= */}
        {step === 'REVIEW_PENDING' && <section className="rounded-2xl bg-white p-8 text-center text-slate-900"><h2 className="text-2xl font-bold">{x('pending')}</h2><p className="my-4">{x('pendingHint')}</p><button type="button" onClick={handleReturnToWelcome}>{x('home')}</button></section>}
        {step === 'SUCCESS' && (
          <div className={`w-full max-w-md border-2 rounded-3xl p-8 text-center space-y-5 my-auto animate-fade-in shadow-xl ${
            outdoorMode
              ? 'bg-white border-emerald-600 text-slate-900'
              : 'bg-[#131b28] border-emerald-500/50 text-white'
          }`}>
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl font-black">
              ✓
            </div>

            <div>
              <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white">
                {t.successTitle}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {opMode === 'CHECK_IN' ? t.successDepositDesc : t.successRetrieveDesc}
              </p>
            </div>

            {/* Countdown Banner */}
            <div className={`p-3 rounded-xl border text-xs font-mono ${
              outdoorMode ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <span>{t.autoReturnPrompt} </span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                {successCountdown} {t.secondsSuffix}
              </strong>
            </div>

            {/* Finish Button */}
            <button
              onClick={handleReturnToWelcome}
              className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm ${
                outdoorMode
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
              }`}
            >
              {t.finishButton}
            </button>
          </div>
        )}

      </main>

      {/* =========================================================================
          3. SENSOR & ATTENDANT MODALS
         ========================================================================= */}
      {showSensorModal && opMode === 'CHECK_OUT' && sessionTokenRef.current && <SensorPhotoConfirmation
        lang={lang} stationId={stationId} bookingId={activeBookingId} lockerId={activeLockerId} sessionToken={sessionTokenRef.current}
        onClose={() => setShowSensorModal(false)} onSubmitted={() => { setShowSensorModal(false); setStep('REVIEW_PENDING'); }}/>}

      {/* Attendant Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#141b27] border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center space-y-3 text-white">
            <span className="text-sm font-bold text-sky-400 uppercase">
              {x('help')}
            </span>
            <div className="p-3 bg-slate-900 rounded-xl text-left text-xs space-y-1.5 text-slate-300">
              {stationStatus?.contactPhone && <div>{x('hotline')}: <strong className="text-sky-400 font-mono">{stationStatus.contactPhone}</strong></div>}
              <div>{t.stationLabel}: <strong className="text-white">{stationStatus?.stationName || x('stationUnavailable')}</strong></div>
              <div className="text-[11px] text-slate-400">{x('supportHint')}</div>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-sky-600 rounded-lg text-xs font-bold text-white uppercase"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. CLEAN INDUSTRIAL TRANSIT FOOTER
         ========================================================================= */}
      <footer className={`h-9 px-5 border-t flex items-center justify-between text-xs transition-colors ${
        outdoorMode
          ? 'bg-white border-slate-200 text-slate-500'
          : 'bg-[#101622] border-slate-800/80 text-slate-500'
      }`}>
        <span>SmartLocker</span>
        <span>{stationStatus?.contactPhone?`${x('hotline')}: ${stationStatus.contactPhone}`:x('staff')}</span>
      </footer>

    </div>
  );
}
