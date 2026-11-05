import { useEffect, useState } from 'react';
import WalkInBooking from '../../components/kiosk/WalkInBooking';
import { kioskApi } from '../../api/kioskService';
import { SmartLockerLogo3D } from '../../components/kiosk/KioskIcons';
import { SUPPORTED_LANGUAGES, type KioskLanguage } from '../../utils/kioskI18n';
import { kioskText } from '../../utils/kioskMessages';

const DEFAULT_STATION_ID = '4d085486-34b6-485e-9fb8-cf4519624db4';

export default function WalkInTabletPage() {
  const [lang, setLang] = useState<KioskLanguage>('VI');
  const [stationId, setStationId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('stationId') || localStorage.getItem('kiosk_station_id') || DEFAULT_STATION_ID;
  });
  const [stations, setStations] = useState<Array<{ id: string; name: string; address: string }>>([]);
  const x = kioskText(lang);

  useEffect(() => {
    let mounted = true;
    kioskApi.getStations().then((res) => {
      if (!mounted || !res.success || !res.data) return;
      const list = Array.isArray(res.data) ? res.data : (res.data.items || []);
      if (list.length > 0) {
        setStations(list);
        if (!list.some((s) => s.id === stationId)) {
          setStationId(list[0].id);
        }
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [stationId]);

  const currentStation = stations.find((s) => s.id === stationId);

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-900 font-sans flex flex-col justify-between">
      <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <SmartLockerLogo3D className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-2">
              <select
                value={stationId}
                onChange={(e) => {
                  setStationId(e.target.value);
                  localStorage.setItem('kiosk_station_id', e.target.value);
                }}
                className="text-sm font-black tracking-tight uppercase bg-transparent border-0 outline-none cursor-pointer text-slate-900"
                title={x('selectStation')}
              >
                {stations.map((st) => (
                  <option key={st.id} value={st.id} className="text-slate-900 bg-white">
                    {st.name}
                  </option>
                ))}
              </select>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                TABLET WALK-IN
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {currentStation?.address || x('selfService')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            aria-label={x('language')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
            value={lang}
            onChange={(e) => setLang(e.target.value as KioskLanguage)}
          >
            {SUPPORTED_LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.flag} {item.nativeName}
              </option>
            ))}
          </select>
          <a
            href="/kiosk"
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Màn hình Kiosk Mở Tủ →
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full">
        <div className="w-full">
          <WalkInBooking
            lang={lang}
            stationId={stationId}
            onCancel={() => {
              window.location.href = '/kiosk';
            }}
            onReady={async () => {
              window.location.href = '/kiosk';
            }}
          />
        </div>
      </main>

      <footer className="h-10 px-6 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span>SmartLocker Walk-in Tablet Terminal (UC-T15)</span>
        <span>Hotline: 1900 6868</span>
      </footer>
    </div>
  );
}
