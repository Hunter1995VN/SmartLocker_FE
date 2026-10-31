import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginPage from '../../src/pages/auth/LoginPage';
import BookingDetailPage from '../../src/pages/BookingDetailPage';
import { tokenStore } from '../../src/api/client';
import '../../src/index.css';

// Production components and API; no fixtures, token injection or mocked HTTP.
function Acceptance() {
  const [signedIn, setSignedIn] = useState(!!tokenStore.get());
  const id = new URLSearchParams(location.search).get('id') || undefined;
  return signedIn ? <BookingDetailPage bookingId={id} onNavigate={() => {}} />
    : <LoginPage onNavigate={() => {}} onLoginSuccess={() => setSignedIn(true)} />;
}
createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'email-login-only'}><Acceptance /></GoogleOAuthProvider>
);
