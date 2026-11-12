import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";

export const B = "http://localhost:5000";
export const PW = "E2e!Local-2026";
export const CHECKSUM = "local-dummy-checksum-key"; // local dummy only; never a real PayOS key
const SQLSRV = "(localdb)\\MSSQLLocalDB";

export function sql(q) {
  return execFileSync("sqlcmd", ["-S", SQLSRV, "-d", "SmartLockerE2E", "-h", "-1", "-W", "-s", "|", "-Q", "SET NOCOUNT ON; " + q], { encoding: "utf8" }).trim();
}
export async function call(method, path, token, body, extraHeaders = {}) {
  const r = await fetch(B + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j, data: j && typeof j === "object" ? j.data : undefined };
}
export const login = async (email, path = "/api/auth/login") => (await call("POST", path, null, { email, password: PW })).data?.accessToken ?? null;

export const results = [];
export function check(id, name, ok, detail = "") {
  results.push({ id, name, ok: !!ok, detail: String(detail).slice(0, 300) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${name}${ok ? "" : "  -> " + String(detail).slice(0, 300)}`);
}

export function heartbeat() {
  sql("UPDATE IoTDevices SET LastSeenAt=SYSUTCDATETIME(), ConnectivityStatus='ONLINE'");
}

// ---- seed a booking directly (payment gateway is the only thing we bypass) ----
export function ids() {
  const g = (q) => sql(q).split("\n")[0].trim();
  return {
    stationA: g("SELECT TOP 1 CAST(Id AS varchar(36)) FROM Stations WHERE Name='E2E Station A'"),
    stationB: g("SELECT TOP 1 CAST(Id AS varchar(36)) FROM Stations WHERE Name='E2E Station B'"),
    userA: g("SELECT CAST(Id AS varchar(36)) FROM Users WHERE Email='a@e2e.local'"),
    userB: g("SELECT CAST(Id AS varchar(36)) FROM Users WHERE Email='b@e2e.local'"),
  };
}
let seq = 100;
export function seedPendingBooking({ userId, stationId, size = "S", hours = 2, startOffsetMin = 5 }) {
  const id = randomUUID();
  const payId = randomUUID();
  const order = String(Date.now()).slice(-9) + String(seq++);
  const code = "BK" + order.slice(-8);
  sql(`INSERT INTO Bookings (Id,BookingCode,UserId,StationId,Size,Status,StartAt,EndAt,BaseAmount,CreatedAt,UpdatedAt,PaymentExpiresAt)
       VALUES ('${id}','${code}','${userId}','${stationId}','${size}','PENDING_PAYMENT',DATEADD(minute,${startOffsetMin},SYSUTCDATETIME()),DATEADD(minute,${startOffsetMin + hours * 60},SYSUTCDATETIME()),${size === "S" ? 15000 * hours : size === "M" ? 25000 * hours : 40000 * hours},SYSUTCDATETIME(),SYSUTCDATETIME(),DATEADD(minute,15,SYSUTCDATETIME()));
       INSERT INTO Payments (Id,BookingId,Kind,Status,Amount,OrderCode,Gateway,CreatedAt,UpdatedAt,ExpiresAt)
       VALUES ('${payId}','${id}','BASE','PENDING',${size === "S" ? 15000 * hours : size === "M" ? 25000 * hours : 40000 * hours},'${order}','PAYOS',SYSUTCDATETIME(),SYSUTCDATETIME(),DATEADD(minute,15,SYSUTCDATETIME()));`);
  return { id, payId, order, code };
}

// ---- PayOS-style signed webhook (signed with the LOCAL dummy checksum key) ----
export function signedWebhook(orderCode, amount) {
  const data = {
    orderCode: Number(orderCode), amount, description: "E2E", accountNumber: "0000000000", reference: "REF" + orderCode,
    transactionDateTime: "2026-11-12 10:00:00", currency: "VND", paymentLinkId: "pl-" + orderCode, code: "00", desc: "Thành công",
    counterAccountBankId: null, counterAccountBankName: null, counterAccountName: null, counterAccountNumber: null,
    virtualAccountName: null, virtualAccountNumber: null,
  };
  const str = Object.keys(data).sort().map((k) => `${k}=${data[k] === null || data[k] === undefined ? "" : data[k]}`).join("&");
  const signature = createHmac("sha256", CHECKSUM).update(str).digest("hex");
  return { code: "00", desc: "success", success: true, data, signature };
}
export async function payBooking(b, amount) {
  const r = await call("POST", "/api/Payments/payos-webhook", null, signedWebhook(b.order, amount));
  return r;
}
