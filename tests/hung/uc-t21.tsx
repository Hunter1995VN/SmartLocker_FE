import { createRoot } from 'react-dom/client';
import BookingDetailPage from '../../src/pages/BookingDetailPage';
import MyBookingsPage from '../../src/pages/MyBookingsPage';
import StationBookingPage from '../../src/pages/StationBookingPage';
import StationRatingSummary from '../../src/components/admin/incidents/StationRatingSummary';
import '../../src/index.css';
const query = new URLSearchParams(location.search);
const view = query.get('view');
const id = query.get('id') || undefined;
const noop = () => {};
createRoot(document.getElementById('root')!).render(view === 'history' ? <MyBookingsPage onNavigate={noop} />
  : view === 'station' ? <StationBookingPage stationId={id} onNavigate={noop} />
  : view === 'ratings' ? <StationRatingSummary /> : <BookingDetailPage bookingId={id} onNavigate={noop} />);
