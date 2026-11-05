import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QRCodeSVG } from 'qrcode.react';
import KioskQrScanner from '../../src/components/kiosk/KioskQrScanner';
import '../../src/index.css';

// Isolated optical decoder/lifecycle regression. No API, payment or device events.
function Regression() {
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const [value, setValue] = useState('');
  const payload = btoa(JSON.stringify({ bookingId: '00000000-0000-0000-0000-000000000001',
    stationId: '00000000-0000-0000-0000-000000000002', nonce: 'A'.repeat(64), expiresAt: '2020-01-01T00:00:00Z' }));
  return <main className="p-4 max-w-lg">
    <h1>Isolated regression — not hardware acceptance</h1>
    <div id="fixture" style={{ width: 480, height: 480, padding: 40, background: 'white' }}>
      <QRCodeSVG value={payload} size={400} level="M" />
    </div>
    <button onClick={() => setVisible(v => !v)}>Toggle scanner</button>
    <output data-testid="count">{count}</output><output data-testid="decoded">{value}</output>
    {visible && <KioskQrScanner lang="VI" busy={busy} onDecoded={async decoded => {
      setBusy(true); setCount(c => c + 1); setValue(decoded);
      await new Promise(resolve => setTimeout(resolve, 350)); setBusy(false);
    }} />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Regression /></StrictMode>);
