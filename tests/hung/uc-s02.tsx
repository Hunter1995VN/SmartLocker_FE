import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import AdminLoginPage from '../../src/pages/admin/AdminLoginPage';
import RealtimeLockerGridView from '../../src/components/admin/lockers/RealtimeLockerGridView';
import '../../src/index.css';
// Runs production login and grid components against the configured API; no fixtures or token injection.
function Acceptance() { const [loggedIn, setLoggedIn] = useState(false); return loggedIn ? <RealtimeLockerGridView/> : <AdminLoginPage onLoginSuccess={() => setLoggedIn(true)}/>; }
createRoot(document.getElementById('root')!).render(<Acceptance/>);
