import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import type { KioskLanguage } from '../../utils/kioskI18n';

const labels = {
  VI: ['Bật camera', 'Tắt camera', 'Đang mở camera…', 'Đưa mã QR vào khung', 'Chọn camera', 'Đang xác thực vé…', 'Cho phép camera trong trình duyệt rồi thử lại, hoặc dùng PIN 8 số.', 'Không tìm thấy camera. Kết nối camera hoặc dùng PIN 8 số.', 'Không mở được camera. Đóng ứng dụng khác đang dùng camera rồi thử lại.', 'Camera cần HTTPS hoặc localhost. Hãy mở địa chỉ Kiosk HTTPS hoặc dùng PIN.', 'Đã đọc mã. Có thể bật camera để quét lại.'],
  EN: ['Start camera', 'Stop camera', 'Starting camera…', 'Hold the QR code inside the frame', 'Select camera', 'Verifying ticket…', 'Allow camera access in your browser and retry, or use your 8-digit PIN.', 'No camera found. Connect a camera or use your 8-digit PIN.', 'Cannot open camera. Close other camera apps and retry.', 'Camera requires HTTPS or localhost. Open the HTTPS Kiosk or use your PIN.', 'Code read. Start the camera to scan again.'],
  JA: ['カメラを起動', 'カメラ停止', 'カメラ起動中…', 'QRコードを枠内にかざしてください', 'カメラを選択', 'チケット確認中…', 'ブラウザでカメラを許可するか、8桁のPINを使ってください。', 'カメラがありません。接続するかPINを使ってください。', '他のカメラアプリを閉じて再試行してください。', 'HTTPSまたはlocalhostが必要です。HTTPSのKioskまたはPINを使ってください。', '読み取り済み。再スキャンにはカメラを起動してください。'],
  KO: ['카메라 시작', '카메라 중지', '카메라 시작 중…', 'QR 코드를 프레임 안에 맞춰 주세요', '카메라 선택', '티켓 확인 중…', '브라우저에서 카메라를 허용하거나 8자리 PIN을 사용하세요.', '카메라가 없습니다. 연결하거나 PIN을 사용하세요.', '다른 카메라 앱을 닫고 다시 시도하세요.', 'HTTPS 또는 localhost가 필요합니다. HTTPS Kiosk 또는 PIN을 사용하세요.', '코드를 읽었습니다. 다시 스캔하려면 카메라를 시작하세요.'],
  ZH: ['开启摄像头', '关闭摄像头', '正在开启摄像头…', '请将二维码放入框内', '选择摄像头', '正在验证票券…', '请允许浏览器使用摄像头，或使用8位PIN。', '未找到摄像头。请连接摄像头或使用PIN。', '请关闭其他使用摄像头的应用后重试。', '摄像头需要HTTPS或localhost。请打开HTTPS Kiosk或使用PIN。', '已读取。可开启摄像头重新扫描。'],
} satisfies Record<KioskLanguage, string[]>;

type Run = { stream?: MediaStream; cancelled: boolean; timer?: number };
function close(run: Run) {
  run.cancelled = true;
  window.clearTimeout(run.timer);
  run.stream?.getTracks().forEach(track => track.stop());
}

export default function KioskQrScanner({ lang, busy = false, onDecoded }: {
  lang: KioskLanguage; busy?: boolean; onDecoded: (value: string) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = useRef<Run | null>(null);
  const mounted = useRef(false);
  const callback = useRef(onDecoded);
  const [state, setState] = useState<'idle' | 'starting' | 'scanning' | 'stopping' | 'read'>('idle');
  const [error, setError] = useState<number | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState('');
  const t = labels[lang];
  const lastSubmitted = useRef<{ value: string; at: number } | null>(null);
  useEffect(() => { callback.current = onDecoded; }, [onDecoded]);
  useEffect(() => {
    mounted.current = true;
    // Leaving the tab or minimising the kiosk must release the camera and never submit a late frame.
    const onVisibility = () => { if (document.hidden && active.current) stop(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      if (active.current) close(active.current);
      active.current = null;
    };
  }, []);

  function stop() {
    const run = active.current;
    if (run) close(run);
    active.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (mounted.current) setState('idle');
  }

  async function start() {
    if (active.current || busy) return;
    setError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setError(9); return; }
    setState('starting');
    const run: Run = { cancelled: false };
    active.current = run;
    try {
      run.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
        ...(cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: 'environment' } }),
        width: { ideal: 1280 }, height: { ideal: 720 },
      } });
      // A permission prompt can finish after the user has already left this screen.
      if (run.cancelled || !mounted.current) { close(run); return; }
      const video = videoRef.current;
      if (!video) { close(run); return; }
      video.srcObject = run.stream;
      await video.play();
      if (run.cancelled || !mounted.current) { close(run); return; }
      setState('scanning');
      setCameraId(run.stream.getVideoTracks()[0]?.getSettings().deviceId || '');
      void navigator.mediaDevices.enumerateDevices().then(devices => {
        if (!run.cancelled && mounted.current) setCameras(devices.filter(device => device.kind === 'videoinput'));
      }).catch(() => { /* Scanning can continue without camera labels. */ });
      run.stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        if (run.cancelled || !mounted.current) return;
        stop(); setError(8);
      }, { once: true }));
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas unavailable');
      const Detector = (window as unknown as {
        BarcodeDetector?: new (options: { formats: string[] }) => { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> };
      }).BarcodeDetector;
      const nativeDetector = Detector ? new Detector({ formats: ['qr_code'] }) : null;

      const tryDecodeJsQr = (
        sx: number, sy: number, sw: number, sh: number,
        dw: number, dh: number, mirror = false, filter = 'none'
      ): string | undefined => {
        canvas.width = dw;
        canvas.height = dh;
        context.save();
        context.filter = filter;
        if (mirror) {
          context.translate(dw, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
        context.restore();
        const pixels = context.getImageData(0, 0, dw, dh);
        return jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' })?.data.trim();
      };

      const frame = async () => {
        if (run.cancelled || !mounted.current) return;
        if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          let value: string | undefined;

          if (nativeDetector) {
            try {
              const hits = await nativeDetector.detect(video);
              value = hits.find(h => h.rawValue?.trim())?.rawValue?.trim();
            } catch { /* Fallback to jsQR multi-pass below. */ }
          }

          if (!value) {
            const fullScale = Math.min(1, 1280 / vw);
            value = tryDecodeJsQr(0, 0, vw, vh, Math.round(vw * fullScale), Math.round(vh * fullScale));
          }

          const cw = Math.round(vw * 0.65);
          const ch = Math.round(vh * 0.65);
          const cx = Math.round((vw - cw) / 2);
          const cy = Math.round((vh - ch) / 2);

          if (!value) {
            value = tryDecodeJsQr(cx, cy, cw, ch, cw, ch);
          }

          // Center 45% crop upscaled 1.5x so dense QR modules on a phone screen have enough pixels & tight local thresholding
          const tw = Math.round(vw * 0.45);
          const th = Math.round(vh * 0.45);
          const tx = Math.round((vw - tw) / 2);
          const ty = Math.round((vh - th) / 2);
          const upW = Math.round(tw * 1.5);
          const upH = Math.round(th * 1.5);

          if (!value) {
            value = tryDecodeJsQr(tx, ty, tw, th, upW, upH);
          }

          if (!value) {
            // High-contrast anti-glare pass for glowing phone LCD/OLED screens under webcam auto-exposure
            value = tryDecodeJsQr(cx, cy, cw, ch, cw, ch, false, 'grayscale(100%) brightness(85%) contrast(220%)');
          }

          if (!value) {
            value = tryDecodeJsQr(tx, ty, tw, th, upW, upH, false, 'grayscale(100%) brightness(78%) contrast(260%)');
          }

          if (!value) {
            value = tryDecodeJsQr(cx, cy, cw, ch, cw, ch, true, 'grayscale(100%) brightness(85%) contrast(200%)');
          }

          // The same code seen again right after a submit is the phone still in front of the camera, not a new request.
          const previous = lastSubmitted.current;
          if (value && previous?.value === value && Date.now() - previous.at < 4000) value = undefined;

          // Decoding is async: the user may have stopped the camera, switched tab or left meanwhile.
          if (run.cancelled || !mounted.current || document.hidden) return;

          if (value) {
            // No more frames or live tracks before any API request is submitted.
            close(run); video.srcObject = null; setState('read');
            lastSubmitted.current = { value, at: Date.now() };
            // Ticket/API errors are reported by the caller; they are not camera errors.
            try { await callback.current(value); }
            catch { /* Caller already shows the verification error. */ }
            finally {
              if (active.current === run) active.current = null;
              if (lastSubmitted.current?.value === value) lastSubmitted.current = { value, at: Date.now() };
            }
            return;
          }
        }
        run.timer = window.setTimeout(() => void frame(), 90);
      };
      void frame();
    } catch (cause) {
      const cancelled = run.cancelled;
      close(run);
      if (active.current === run) active.current = null;
      if (!mounted.current || cancelled) return;
      const message = String(cause);
      setError(/NotAllowed|Permission|denied/i.test(message) ? 6 : /NotFound|DevicesNotFound/i.test(message) ? 7 : 8);
      setState('idle');
    }
  }

  const transitioning = state === 'starting' || state === 'stopping';
  const live = state === 'scanning';
  const corner = 'absolute w-9 h-9 border-white border-[5px]';
  return <section className="w-full space-y-3 text-sm" aria-label={t[4]}>
    {/* Viewfinder: the video fills a square frame; corner marks show where to hold the code */}
    <div className="relative mx-auto w-[min(18rem,34vh)] aspect-square rounded-3xl overflow-hidden bg-slate-900">
      <video ref={videoRef} muted playsInline aria-label={t[4]} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${live ? 'opacity-100' : 'opacity-0'}`} />
      {!live && <div className="absolute inset-0 grid place-items-center text-slate-500" aria-hidden="true">
        <svg viewBox="0 0 48 48" className={`w-20 h-20 ${state === 'starting' || busy ? 'animate-pulse motion-reduce:animate-none' : ''}`} fill="none" stroke="currentColor" strokeWidth="3">
          <rect x="6" y="6" width="14" height="14" rx="2" /><rect x="28" y="6" width="14" height="14" rx="2" /><rect x="6" y="28" width="14" height="14" rx="2" />
          <path d="M28 28h6v6h-6zM38 38h4v4M28 40h4" />
        </svg>
      </div>}
      <div className={`absolute inset-[14%] ${live ? 'kiosk-corners' : ''}`} aria-hidden="true">
        <span className={`${corner} top-0 left-0 border-r-0 border-b-0 rounded-tl-2xl ${live ? '' : 'opacity-40'}`} />
        <span className={`${corner} top-0 right-0 border-l-0 border-b-0 rounded-tr-2xl ${live ? '' : 'opacity-40'}`} />
        <span className={`${corner} bottom-0 left-0 border-r-0 border-t-0 rounded-bl-2xl ${live ? '' : 'opacity-40'}`} />
        <span className={`${corner} bottom-0 right-0 border-l-0 border-t-0 rounded-br-2xl ${live ? '' : 'opacity-40'}`} />
      </div>
      {live && <span aria-hidden="true" className="kiosk-sweep absolute left-[16%] right-[16%] h-0.5 rounded-full bg-sky-400 shadow-[0_0_12px_3px_rgba(56,189,248,0.7)]" />}
      {busy && <div className="absolute inset-0 grid place-items-center bg-slate-950/60 text-white font-bold">{t[5]}</div>}
    </div>
    <p className="text-center text-slate-500 dark:text-slate-400">{t[3]}</p>
    {cameras.length > 1 && <label className="block text-xs text-slate-500">{t[4]}
      <select className="mt-1 block w-full rounded-xl border p-2 text-slate-900 bg-white" value={cameraId}
        disabled={busy || transitioning || live} onChange={event => setCameraId(event.target.value)}>
        {cameras.map((camera, index) => <option key={camera.deviceId} value={camera.deviceId}>{camera.label || `${t[4]} ${index + 1}`}</option>)}
      </select>
    </label>}
    {error !== null && <p role="alert" className="kiosk-shake text-center font-semibold text-rose-600">{t[error]}</p>}
    <p role="status" className="sr-only">{busy ? t[5] : state === 'starting' ? t[2] : state === 'read' ? t[10] : ''}</p>
    <button type="button" className={`w-full rounded-2xl py-3.5 font-bold text-base transition-colors disabled:opacity-50 ${live ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}
      disabled={busy || transitioning} onClick={() => void (live ? stop() : start())}>
      {state === 'starting' ? t[2] : live ? t[1] : t[0]}
    </button>
  </section>;
}
