import React from 'react';
import { createRoot } from 'react-dom/client';
import StationBookingPage from '../../src/pages/StationBookingPage';
import BookingPaymentPage from '../../src/pages/BookingPaymentPage';
import '../../src/index.css';

// Actual production components. HTTP is intercepted by the test runner before navigation.
const q = new URLSearchParams(location.search);
const nav = (page: string, props?: unknown) => { (window as any).__report5Navigation = { page, props }; };
const payment = { bookingId: '00000000-0000-0000-0000-000000000001', bookingCode: 'TEST-ONLY', amount: 45000, size: 'S' as const, duration: 3, paymentExpiresAt: new Date(Date.now() + 600000).toISOString(), qrCode: 'NONPAYABLE-TEST-QR' };
createRoot(document.getElementById('root')!).render(q.get('page') === 'payment'
  ? <BookingPaymentPage onNavigate={nav} bookingData={payment} />
  : <StationBookingPage stationId="00000000-0000-0000-0000-000000000002" onNavigate={nav} initialBookingData={{ size: 'S' }} />);
