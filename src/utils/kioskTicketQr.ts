/**
 * Reads the public fields of an online-ticket QR (Base64 JSON: bookingId, stationId, nonce, expiresAt)
 * only to explain a rejection to the user. It never authorizes anything: the kiosk API compares the
 * whole payload with the active credential in the database.
 */
export type TicketQrHint = { stationId?: string; expiresAt?: number };

export function readTicketQrHint(raw: string): TicketQrHint | null {
  try {
    const value = raw.trim();
    if (!/^[A-Za-z0-9+/=_-]{40,}$/.test(value)) return null;
    const json = JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
    if (!json || typeof json !== 'object' || !('nonce' in json)) return null;
    const stationId = typeof json.stationId === 'string' ? json.stationId.toLowerCase() : undefined;
    const expiry = typeof json.expiresAt === 'string' ? json.expiresAt : undefined;
    const expiresAt = expiry ? Date.parse(/Z|[+-]\d\d:\d\d$/.test(expiry) ? expiry : `${expiry}Z`) : NaN;
    return { stationId, expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined };
  } catch {
    return null;
  }
}
