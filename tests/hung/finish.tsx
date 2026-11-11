import { createRoot } from 'react-dom/client';
import KioskPage from '../../src/pages/kiosk/KioskPage';
import WalkInBooking from '../../src/components/kiosk/WalkInBooking';
import PickupDelegationPanel from '../../src/components/booking/PickupDelegationPanel';
import { kioskText } from '../../src/utils/kioskMessages';
import type { KioskLanguage } from '../../src/utils/kioskI18n';
import '../../src/index.css';

// Harness cho UC-T15 / T16 / T23: dùng component thật, API được giả lập ở tầng mạng (xem run-finish.mjs).
const query = new URLSearchParams(location.search);
const lang = (query.get('lang') || 'EN') as KioskLanguage;
(window as unknown as { __t: (l: string, k: string) => string }).__t = (l, k) => kioskText(l as KioskLanguage)(k as never);
(window as unknown as { __ready: string[] }).__ready = [];

const view = query.get('view');
createRoot(document.getElementById('root')!).render(
  view === 'delegation' ? <PickupDelegationPanel bookingId="booking-test" status="STORED" />
  : view === 'walkin' ? <WalkInBooking lang={lang} stationId="22222222-2222-2222-2222-222222222222"
      onReady={async pin => { (window as unknown as { __ready: string[] }).__ready.push(pin); }} onCancel={() => { (window as unknown as { __left: boolean }).__left = true; }} />
  : <KioskPage />,
);
