import { createRoot } from 'react-dom/client';
import KioskPage from '../../src/pages/kiosk/KioskPage';
import '../../src/index.css';
// Actual station APIs and SignalR; no fixtures or simulated door events.
createRoot(document.getElementById('root')!).render(<KioskPage />);
