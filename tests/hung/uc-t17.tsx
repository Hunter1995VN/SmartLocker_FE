import { createRoot } from 'react-dom/client';
import BookingDetailPage from '../../src/pages/BookingDetailPage';
import MyBookingsPage from '../../src/pages/MyBookingsPage';
import LostItemQueue from '../../src/components/admin/incidents/LostItemQueue';
import '../../src/index.css';
const query = new URLSearchParams(location.search);
const view = query.get('view');
createRoot(document.getElementById('root')!).render(view === 'staff' ? <LostItemQueue />
  : view === 'history' ? <MyBookingsPage onNavigate={() => {}} />
  : <BookingDetailPage bookingId={query.get('id') || undefined} onNavigate={() => {}} />);
