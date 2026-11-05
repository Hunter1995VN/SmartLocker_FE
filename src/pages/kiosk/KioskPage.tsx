import { useState, useEffect, useRef } from 'react';
import KioskQrScanner from '../../components/kiosk/KioskQrScanner';
import { readTicketQrHint } from '../../utils/kioskTicketQr';
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
    // Explain the most common rejections precisely; the API remains the only authority.
    const qrHint = type === 'QR' ? readTicketQrHint(rawValue) : null;
    if (qrHint?.stationId && qrHint.stationId !== targetStationId.toLowerCase()) {
      submittingRef.current = false;
      const stationName = allStations.find(s => s.id.toLowerCase() === qrHint.stationId)?.name || x('otherStation');
      setErrorMessage(x('qrWrongStation').replace('{station}', stationName));
      if (soundEnabled) sounds.playWarningAlert();
      return;
    }
    const rejection = (serverMessage?: string) =>
      qrHint?.expiresAt !== undefined && qrHint.expiresAt <= Date.now() ? x('qrExpired')
        : lang === 'VI' ? (serverMessage || x('authError')) : x('authError');

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
          setErrorMessage(rejection(res.message));
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
          setErrorMessage(rejection(res.message));
          if (soundEnabled) sounds.playWarningAlert();
        }
      }
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setErrorMessage(x('networkError'));
      } else {
        setErrorMessage(rejection(err.response?.data?.message));
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
                {step === 'WALK_IN' && <div className="w-full overflow-y-auto"><WalkInBooking lang={lang} stationId={stationId} onCancel={handleReturnToWelcome} onReady={async pin => { setWalkInPin(pin); await handleProcessCredential('ACCESS_CODE', pin); }}/></div>}
        {walkInPin && step === 'LOCKER_ACTIVE' && <section className="rounded-xl bg-blue-50 p-3 text-center text-slate-900"><p>{x('savePin')}</p><strong className="text-2xl font-mono">{walkInPin.slice(0,4)} {walkInPin.slice(4)}</strong></section>}


        {/* Error Alert Banner */}
        {errorMessage && (
          <div key={errorMessage} role="alert" className="kiosk-shake w-full max-w-xl mb-3 p-3 pl-4 rounded-2xl bg-rose-700 text-white flex items-center justify-between gap-3 text-sm font-semibold shadow-lg">
            <span className="flex items-center gap-2"><span aria-hidden="true" className="grid place-items-center w-6 h-6 shrink-0 rounded-full bg-white/20 font-black">!</span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="px-3 py-1.5 bg-rose-900/70 hover:bg-rose-900 rounded-lg text-xs font-bold">OK</button>
          </div>
        )}

        {/* =========================================================================
            STATE 0: WELCOME & LANGUAGE SELECTION (BẮT BUỘC CHỌN NGÔN NGỮ ĐẦU TIÊN)
           ========================================================================= */}
        {step === 'WELCOME' && (
          <div className="kiosk-enter w-full max-w-3xl my-auto text-center space-y-8">
            <div className="space-y-3">
              <h1 className={`text-4xl md:text-6xl font-black tracking-tight ${outdoorMode ? 'text-slate-900' : 'text-white'}`}>
                {t.welcomeTitle}
              </h1>
              <p className="text-base md:text-lg text-slate-500 dark:text-slate-400" aria-hidden="true">
                Welcome&ensp;환영합니다&ensp;欢迎&ensp;ようこそ
              </p>
            </div>

            <nav aria-label={x('chooseLanguage')} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {SUPPORTED_LANGUAGES.map((item, index) => (
                <button
                  key={item.code}
                  lang={item.code.toLowerCase()}
                  onClick={() => handleSelectLanguage(item.code)}
                  style={{ animationDelay: `${120 + index * 50}ms` }}
                  className={`kiosk-enter group h-24 md:h-28 rounded-2xl border-2 transition-all duration-200 flex items-center justify-center text-center cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/60 ${
                    outdoorMode
                      ? 'bg-white hover:bg-sky-50 border-slate-200 hover:border-sky-500 shadow-sm hover:shadow-md'
                      : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-sky-400'
                  }`}
                >
                  <span className={`text-xl md:text-2xl font-black group-hover:scale-105 transition-transform ${outdoorMode ? 'text-slate-900' : 'text-white'}`}>
                    {item.nativeName}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        )}

        {step === 'IDLE' && (
          <div className="kiosk-enter w-full h-full max-h-[580px] grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch my-auto">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { mode: 'CHECK_IN', title: t.depositTitle, Icon: CheckInIcon3D, tone: 'sky' },
                { mode: 'CHECK_OUT', title: t.retrieveTitle, Icon: CheckOutIcon3D, tone: 'emerald' },
              ] as const).map(({ mode, title, Icon, tone }, index) => (
                <button
                  key={mode}
                  onClick={() => {
                    if (soundEnabled) sounds.playKeypadTap();
                    setOpMode(mode);
                    setStep('AUTH');
                    setErrorMessage('');
                    setAuthMethod('QR');
                  }}
                  style={{ animationDelay: `${index * 80}ms` }}
                  className={`kiosk-enter group relative overflow-hidden p-7 rounded-[28px] border-2 transition-all duration-200 flex flex-col items-start justify-between gap-6 text-left cursor-pointer active:scale-[0.98] hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 ${
                    tone === 'sky'
                      ? (outdoorMode ? 'bg-white border-slate-200 hover:border-sky-500 shadow-md hover:shadow-xl focus-visible:ring-sky-400/60' : 'bg-[#131b28] border-slate-800 hover:border-sky-500 focus-visible:ring-sky-400/40')
                      : (outdoorMode ? 'bg-white border-slate-200 hover:border-emerald-500 shadow-md hover:shadow-xl focus-visible:ring-emerald-400/60' : 'bg-[#131b28] border-slate-800 hover:border-emerald-500 focus-visible:ring-emerald-400/40')
                  }`}
                >
                  {/* Door seam: a thin handle bar that slides on hover, like pulling a locker door */}
                  <span aria-hidden="true" className={`absolute right-6 top-1/2 -translate-y-1/2 h-16 w-1.5 rounded-full transition-transform duration-300 group-hover:translate-x-1 ${tone === 'sky' ? 'bg-sky-500/70' : 'bg-emerald-500/70'}`} />
                  <span className={`p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${tone === 'sky' ? 'bg-sky-500/10' : 'bg-emerald-500/10'}`}>
                    <Icon className="w-16 h-16" />
                  </span>
                  <span className="space-y-1.5 pr-8">
                    <span className={`block text-3xl md:text-4xl font-black tracking-tight transition-colors ${outdoorMode ? 'text-slate-950' : 'text-white'} ${tone === 'sky' ? 'group-hover:text-sky-600' : 'group-hover:text-emerald-600'}`}>
                      {title}
                    </span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">{x('authHint')}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className={`kiosk-enter lg:col-span-5 border rounded-2xl relative flex flex-col overflow-y-auto min-h-0 h-full ${
              outdoorMode
                ? 'bg-white border-slate-200 shadow-sm text-slate-900'
                : 'bg-[#131b28] border-slate-800 shadow-lg text-slate-100'
            }`} style={{ animationDelay: '160ms' }}>
              <KioskLockerStatus status={stationStatus} lang={lang} activeLockerId={activeLockerId} />
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 2: AUTHENTICATION (SCANNER & VAULT KEYPAD)
           ========================================================================= */}
        {step === 'AUTH' && (
          <div className={`kiosk-enter w-full max-w-lg border rounded-[28px] p-5 shadow-xl relative my-auto max-h-full overflow-y-auto ${
            outdoorMode
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-[#131b28] border-slate-800 text-slate-100'
          }`}>
            <div className="flex items-center gap-3 mb-5">
              <button
                disabled={loading}
                onClick={() => setStep('IDLE')}
                aria-label={t.cancel}
                className={`w-10 h-10 grid place-items-center rounded-full text-lg font-bold transition-colors disabled:opacity-40 ${
                  outdoorMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                }`}
              >
                ←
              </button>
              <h2 className={`text-xl font-black tracking-tight ${opMode === 'CHECK_IN' ? 'text-sky-700 dark:text-sky-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {opMode === 'CHECK_IN' ? t.depositTitle : t.retrieveTitle}
              </h2>
            </div>

            {/* QR / PIN switch with a sliding indicator */}
            <div role="tablist" className={`relative grid grid-cols-2 mb-5 p-1 rounded-2xl ${outdoorMode ? 'bg-slate-100' : 'bg-slate-900'}`}>
              <span aria-hidden="true" className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl shadow-sm transition-transform duration-300 ease-out ${
                outdoorMode ? 'bg-white' : 'bg-slate-700'
              } ${authMethod === 'ACCESS_CODE' ? 'translate-x-full' : ''}`} />
              {([['QR', t.scanQr], ['ACCESS_CODE', t.enterPin]] as const).map(([method, label]) => (
                <button
                  key={method}
                  role="tab"
                  aria-selected={authMethod === method}
                  onClick={() => {
                    if (submittingRef.current) return;
                    if (soundEnabled) sounds.playKeypadTap();
                    setErrorMessage('');
                    setAuthMethod(method);
                  }}
                  className={`relative z-10 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                    authMethod === method ? (outdoorMode ? 'text-sky-700' : 'text-white') : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {authMethod === 'QR' && (
              <div key="qr" className="kiosk-enter flex flex-col items-center gap-3">
                <KioskQrScanner lang={lang} busy={loading} onDecoded={async value => { if (soundEnabled) sounds.playScanChime(); await handleProcessCredential('QR', value); }} />

                {/* Manual entry is for USB scanners and staff; kept out of the way */}
                <details className="w-full group">
                  <summary className="cursor-pointer list-none text-center text-xs font-semibold text-slate-500 hover:text-sky-600 select-none">
                    {x('manualEntry')}
                  </summary>
                  <input
                    type="text"
                    placeholder={t.qrPlaceholder}
                    aria-label={t.qrPlaceholder}
                    disabled={loading}
                    autoComplete="off"
                    spellCheck={false}
                    className={`mt-2 w-full rounded-xl px-4 py-2 text-xs font-mono focus:outline-none border ${
                      outdoorMode
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:ring-2 focus:ring-sky-500'
                        : 'bg-slate-900 border-slate-800 text-slate-200 focus:ring-2 focus:ring-sky-500'
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
                </details>
              </div>
            )}

            {authMethod === 'ACCESS_CODE' && (
              <div key="pin" className="kiosk-enter space-y-4">
                <div className="flex items-center justify-center gap-1.5 font-mono" aria-live="polite" aria-label={`${accessCode.length}/8`}>
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const char = accessCode[idx];
                    return (
                      <div
                        key={`${idx}-${char ?? ''}`}
                        className={`w-9 h-11 rounded-xl flex items-center justify-center font-black text-xl ${idx === 4 ? 'ml-2' : ''} ${
                          char
                            ? `kiosk-pop ${outdoorMode ? 'bg-sky-600 text-white' : 'bg-sky-500 text-slate-950'}`
                            : (outdoorMode ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-slate-700')
                        }`}
                      >
                        {char || '·'}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKeypadPress(key)}
                      aria-label={key === 'CLEAR' ? 'Clear' : key === 'BACK' ? 'Backspace' : key}
                      className={`h-14 rounded-2xl font-bold text-xl transition-all duration-100 active:scale-90 ${
                        key === 'CLEAR' || key === 'BACK'
                          ? (outdoorMode ? 'bg-slate-100 text-slate-500 text-base' : 'bg-slate-900 text-slate-400 text-base')
                          : (outdoorMode ? 'bg-white border border-slate-200 text-slate-900 shadow-sm hover:bg-sky-50' : 'bg-slate-800 text-white hover:bg-slate-700')
                      }`}
                    >
                      {key === 'CLEAR' ? 'C' : key === 'BACK' ? '⌫' : key}
                    </button>
                  ))}
                </div>

                <button
                  disabled={accessCode.length !== 8 || loading}
                  onClick={() => handleProcessCredential('ACCESS_CODE', accessCode)}
                  className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                    accessCode.length === 8 && !loading
                      ? (outdoorMode ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md' : 'bg-sky-500 hover:bg-sky-400 text-slate-950')
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? t.unlocking : t.confirmUnlock}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'LOCKER_ACTIVE' && (
          <div className={`kiosk-enter w-full max-w-3xl border rounded-[28px] p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center my-auto ${
            outdoorMode
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-[#131b28] border-slate-800 text-slate-100'
          }`}>
            {/* The door drawing follows the real sensor state only: it swings open on OPEN, shut otherwise */}
            <div role="status" aria-label={x('status')} className={`relative rounded-3xl p-6 min-h-[260px] flex items-center justify-center overflow-hidden ${
              outdoorMode ? 'bg-slate-100' : 'bg-slate-900'
            }`}>
              <div className={`relative w-44 h-56 rounded-2xl border-4 ${outdoorMode ? 'border-slate-300 bg-slate-800' : 'border-slate-700 bg-black'}`}>
                <div className="absolute inset-0 grid place-items-center">
                  <span aria-hidden="true" className="w-24 h-24 rounded-full bg-sky-300/25 blur-2xl" />
                </div>
                <div className={`absolute inset-0 rounded-xl ${activeDoorState === 'OPEN' ? 'kiosk-door' : 'kiosk-door-closed'} ${
                  opMode === 'CHECK_IN' ? 'bg-sky-600' : 'bg-emerald-600'
                } shadow-2xl flex items-center justify-end pr-3`}>
                  <span className="h-14 w-1.5 rounded-full bg-white/70" />
                  <span className="absolute top-4 left-4 text-lg font-black font-mono text-white/90">{activeLockerCode || '—'}</span>
                </div>
              </div>
              <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${
                activeDoorState === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : activeDoorState === 'CLOSED' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {activeDoorState}
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <span className="text-sm text-slate-500">{x('yourLocker')}</span>
                <div className="flex items-baseline gap-3">
                  <span className={`text-6xl font-black font-mono ${opMode === 'CHECK_IN' ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {activeLockerCode || '—'}
                  </span>
                  <span className="text-sm font-bold text-slate-500">{x('sizeLabel')} {activeLockerSize || '—'}</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{activeBookingCode}</span>
              </div>

              <p className="text-lg font-bold leading-snug">
                {activeDoorState === 'OPEN' ? t.doorCloseInstruction : x('waitingDoor')}
              </p>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-mono tabular-nums">{doorTimerSeconds}s</span>
                {doorTimerSeconds >= 30 && opMode === 'CHECK_OUT' && (
                  <button onClick={() => setShowSensorModal(true)} className="text-amber-600 dark:text-amber-400 underline font-bold">
                    {t.sensorAlertButton}
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowHelpModal(true)}
                className={`w-full py-3 rounded-2xl text-sm font-bold transition-colors ${
                  outdoorMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {x('staff')}
              </button>
            </div>
          </div>
        )}

        {step === 'OVERDUE' && (
          <div className={`kiosk-enter w-full max-w-md border rounded-[28px] p-7 text-center space-y-5 my-auto shadow-xl ${
            outdoorMode ? 'bg-white border-amber-300 text-slate-900' : 'bg-[#131b28] border-amber-500/50 text-white'
          }`}>
            <div>
              <h2 className="text-lg font-black text-amber-700 dark:text-amber-400">{t.overdueTitle}</h2>
              <p className="kiosk-pop mt-2 text-5xl font-black font-mono tabular-nums">
                {overdueFee.toLocaleString(kioskLocales[lang])}<span className="text-2xl ml-1">đ</span>
              </p>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.overdueSubtitle}</p>
            {overduePayment ? <div className="kiosk-enter space-y-3 flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl border border-slate-200"><QRCodeSVG value={overduePayment.qrCode || overduePayment.paymentUrl} size={210} /></div>
              <p className="text-sm">{overduePayment.qrCode ? x('scanPay') : x('paymentPageQr')}</p>
            </div> : <button disabled={loading} className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-4 disabled:opacity-60" onClick={async () => {
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
              className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-white"
            >
              {t.close}
            </button>
          </div>
        )}

        {step === 'REVIEW_PENDING' && (
          <section className={`kiosk-enter w-full max-w-md rounded-[28px] p-8 text-center space-y-4 my-auto shadow-xl ${outdoorMode ? 'bg-white text-slate-900' : 'bg-[#131b28] text-white'}`}>
            <div className="mx-auto w-14 h-14 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <h2 className="text-2xl font-black">{x('pending')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{x('pendingHint')}</p>
            <button type="button" onClick={handleReturnToWelcome} className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-sm font-bold">{x('home')}</button>
          </section>
        )}

        {step === 'SUCCESS' && (
          <div className={`kiosk-enter w-full max-w-md rounded-[28px] p-8 text-center space-y-6 my-auto shadow-xl overflow-hidden relative ${
            outdoorMode ? 'bg-white text-slate-900' : 'bg-[#131b28] text-white'
          }`}>
            <svg viewBox="0 0 64 64" className="kiosk-pop mx-auto w-24 h-24" aria-hidden="true">
              <circle cx="32" cy="32" r="30" className="fill-emerald-500" />
              <path d="M19 33 l9 9 l17 -19" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="kiosk-tick" />
            </svg>

            <div>
              <h2 className="text-3xl font-black">{t.successTitle}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {opMode === 'CHECK_IN' ? t.successDepositDesc : t.successRetrieveDesc}
              </p>
            </div>

            <button
              onClick={handleReturnToWelcome}
              className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
                outdoorMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {t.finishButton} <span className="font-mono tabular-nums opacity-80">({successCountdown})</span>
            </button>

            {/* Auto-return countdown as a draining bar */}
            <span aria-hidden="true" className="kiosk-drain absolute left-0 bottom-0 h-1.5 w-full bg-emerald-500" />
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
