/**
 * Shared helpers for reading the traveller's location.
 *
 * Chromium browsers on Windows report PERMISSION_DENIED (code 1) both when the site is blocked
 * and when Windows "Location services" is switched off for the whole device. The Permissions API
 * tells the two apart: if the site permission is "granted" but the request is still denied, the
 * block comes from the operating system, and the page should say so instead of "blocked".
 */
export type GeoFailure = 'denied' | 'os-blocked' | 'unavailable' | 'timeout';

async function sitePermission(): Promise<PermissionState | null> {
  try {
    if (!navigator.permissions?.query) return null;
    return (await navigator.permissions.query({ name: 'geolocation' })).state;
  } catch {
    return null;
  }
}

export async function classifyGeoError(err: GeolocationPositionError): Promise<GeoFailure> {
  if (err.code === 1) return (await sitePermission()) === 'granted' ? 'os-blocked' : 'denied';
  return err.code === 2 ? 'unavailable' : 'timeout';
}

/**
 * Calls `retry` when the location request may now succeed: the site permission changes to
 * "granted" (user allowed it in the address bar) or the tab regains focus (user may have just
 * switched on Windows location services). The caller decides whether a retry is needed.
 * Returns a cleanup function.
 */
export function watchGeoAvailability(retry: () => void): () => void {
  let disposed = false;
  let status: PermissionStatus | null = null;
  const onChange = () => { if (!disposed && status?.state === 'granted') retry(); };
  const onFocus = () => { if (!disposed && document.visibilityState === 'visible') retry(); };

  navigator.permissions?.query?.({ name: 'geolocation' })
    .then(result => { if (disposed) return; status = result; status.addEventListener('change', onChange); })
    .catch(() => { /* Permissions API unavailable: focus retry still works. */ });
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onFocus);

  return () => {
    disposed = true;
    status?.removeEventListener('change', onChange);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onFocus);
  };
}

export const GEO_OS_BLOCKED_HINT =
  'Định vị của máy đang tắt dù trang đã được cho phép. Trên Windows: Settings → Privacy & security → Location → bật Location services, rồi quay lại trang này.';
