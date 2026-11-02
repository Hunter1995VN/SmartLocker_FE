import { createRoot } from 'react-dom/client';
import StationBookingPage from '../../src/pages/StationBookingPage';
import '../../src/index.css';

// Production page and actual API. No simulated inventory, payment or door events.
const params = new URLSearchParams(location.search);
createRoot(document.getElementById('root')!).render(<StationBookingPage stationId={params.get('stationId') || undefined}
  onNavigate={(page, props) => {
    if (page === 'booking-payment') window.dispatchEvent(new CustomEvent('acceptance-payment', { detail: props }));
    else location.assign('/');
  }} />);
