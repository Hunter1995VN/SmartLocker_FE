import { createRoot } from 'react-dom/client';
import KioskPage from '../../src/pages/kiosk/KioskPage';
import BookingDetailPage from '../../src/pages/BookingDetailPage';
import TravelerSupportPanel from '../../src/components/booking/TravelerSupportPanel';
import type { BookingDto } from '../../src/api/bookingService';
import '../../src/index.css';
const query = new URLSearchParams(location.search);
const booking = { id: 'booking-test', status: query.get('status') || 'COMPLETED' } as BookingDto;
createRoot(document.getElementById('root')!).render(query.get('view') === 'ticket'
  ? <BookingDetailPage bookingId="booking-test" onNavigate={() => {}} />
  : query.get('view') === 'support' ? <TravelerSupportPanel booking={booking} /> : <KioskPage />);
