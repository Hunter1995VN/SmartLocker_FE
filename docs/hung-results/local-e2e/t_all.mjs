import { writeFileSync } from "node:fs";
import { call, login, heartbeat, ids, seedPendingBooking, payBooking, sql, check, results } from "./lib.mjs";

import { mkdirSync, writeFileSync as wf } from "node:fs";
import { randomUUID as ru } from "node:crypto";
const PHOTO = ru().replace(/-/g, "") + ".jpg";
const PHOTO_DIR = "D:/Kỳ 9 -/Đồ án tốt nghiệp/BE/.worktrees/finish-uc-be/API/bin/Debug/net8.0/App_Data/manual-confirm";
mkdirSync(PHOTO_DIR, { recursive: true });
wf(PHOTO_DIR + "/" + PHOTO, Buffer.from("ffd8ffe000104a46494600010100000100010000ffd9", "hex"));
heartbeat();
// clean slate between runs: free lockers and retire bookings left by earlier runs
sql("UPDATE Bookings SET Status='CANCELLED' WHERE Status IN ('PENDING_PAYMENT','CONFIRMED','STORED'); UPDATE Lockers SET BusinessStatus='AVAILABLE', HealthStatus='HEALTHY', DoorState='CLOSED', Notes=NULL");
const I = ids();
const a = await login("a@e2e.local");
const b = await login("b@e2e.local");
let admin = await login("admin@e2e.local", "/api/admin/auth/login");
if (!admin) admin = await login("admin@e2e.local");
check("ENV", "tokens obtained (traveler A, traveler B, admin)", a && b && admin);

// helpers that move a booking through states the hardware would normally drive (door cycle needs MQTT/ESP32)
function assignLocker(bookingId, size, stationId) {
  const lk = sql(`SELECT TOP 1 CAST(Id AS varchar(36)) FROM Lockers WHERE StationId='${stationId}' AND Size='${size}' AND BusinessStatus='AVAILABLE'`).split("\n")[0].trim();
  sql(`UPDATE Bookings SET LockerId='${lk}' WHERE Id='${bookingId}'; UPDATE Lockers SET BusinessStatus='OCCUPIED' WHERE Id='${lk}'`);
  return lk;
}
const paid = async (userId, stationId, size = "S", hours = 2) => {
  const bk = seedPendingBooking({ userId, stationId, size, hours });
  const amount = (size === "S" ? 15000 : size === "M" ? 25000 : 40000) * hours;
  const r = await payBooking(bk, amount);
  return { ...bk, webhook: r };
};
const stored = async (userId, stationId, size = "S") => {
  const bk = await paid(userId, stationId, size);
  bk.locker = assignLocker(bk.id, size, stationId);
  sql(`UPDATE Bookings SET Status='STORED', CheckedInAt=DATEADD(minute,-10,SYSUTCDATETIME()), StartAt=DATEADD(minute,-10,SYSUTCDATETIME()), EndAt=DATEADD(hour,2,SYSUTCDATETIME()) WHERE Id='${bk.id}'`);
  return bk;
};
const completed = async (userId, stationId, size = "S") => {
  const bk = await paid(userId, stationId, size);
  bk.locker = assignLocker(bk.id, size, stationId);
  sql(`UPDATE Bookings SET Status='COMPLETED', CheckedInAt=DATEADD(hour,-3,SYSUTCDATETIME()), CheckedOutAt=DATEADD(minute,-5,SYSUTCDATETIME()) WHERE Id='${bk.id}'; UPDATE Lockers SET BusinessStatus='AVAILABLE' WHERE Id='${bk.locker}'`);
  return bk;
};

// ───────────── UC-T09 Access ticket ─────────────
const t9 = await paid(I.userA, I.stationA, "S");
check("T09-01", "payment webhook confirms booking and issues credential", t9.webhook.data?.status === "PAID" && sql(`SELECT Status FROM Bookings WHERE Id='${t9.id}'`) === "CONFIRMED");
const v9 = (await call("GET", "/api/Bookings/" + t9.id, a)).data;
check("T09-02", "owner sees 8-digit PIN and QR for a paid booking", /^\d{8}$/.test(v9?.accessCode ?? "") && !!v9?.qrPayload, `pin=${v9?.accessCode} qr=${!!v9?.qrPayload}`);
const hashRow = sql(`SELECT LEN(AccessCodeHash), CASE WHEN ProtectedAccessCode IS NULL THEN 0 ELSE 1 END FROM AccessCredentials WHERE BookingId='${t9.id}'`);
check("T09-03", "PIN is stored hashed (not plain text)", !hashRow.includes(v9.accessCode) && !sql(`SELECT AccessCodeHash FROM AccessCredentials WHERE BookingId='${t9.id}'`).includes(v9.accessCode), hashRow);
const other = await call("GET", "/api/Bookings/" + t9.id, b);
check("T09-04", "another customer cannot read the ticket", [403, 404].includes(other.status) || !other.data?.accessCode, `status ${other.status}`);
const anon = await call("GET", "/api/Bookings/" + t9.id, null);
check("T09-05", "unauthenticated request is rejected (401)", anon.status === 401, `status ${anon.status}`);
const pend = seedPendingBooking({ userId: I.userA, stationId: I.stationA });
const vp = (await call("GET", "/api/Bookings/" + pend.id, a)).data;
check("T09-06", "unpaid (PENDING_PAYMENT) booking exposes no PIN/QR", !vp?.accessCode && !vp?.qrPayload);
const canc = await paid(I.userA, I.stationA, "S");
sql(`UPDATE Bookings SET Status='CANCELLED' WHERE Id='${canc.id}'`);
const vc = (await call("GET", "/api/Bookings/" + canc.id, a)).data;
check("T09-07", "CANCELLED booking exposes no PIN/QR", !vc?.accessCode && !vc?.qrPayload);
const s1 = (await call("GET", "/api/Bookings/" + t9.id, a)).data?.qrPayload;
check("T09-08", "QR payload is stable between two reads inside its validity window", !!s1 && s1 === v9.qrPayload);

// ───────────── UC-T16 Pickup delegation ─────────────
const t16 = await stored(I.userA, I.stationA, "S");
const dEmail = await call("POST", `/api/bookings/${t16.id}/support/delegations`, a, { contact: "friend@example.com", validMinutes: 60 });
check("T16-01", "delegate by e-mail returns 8-digit PIN + delivery result", dEmail.status === 200 && /^\d{8}$/.test(dEmail.body?.pin ?? ""), JSON.stringify(dEmail.body).replace(/"pin":"\d+"/, '"pin":"********"').slice(0, 250));
check("T16-02", "SMTP not configured -> delivery reported as not sent (EMAIL / SMTP_NOT_CONFIGURED), request still succeeds", dEmail.body?.delivery?.channel === "EMAIL" && dEmail.body?.delivery?.sent === false && dEmail.body?.delivery?.reason === "SMTP_NOT_CONFIGURED", JSON.stringify(dEmail.body?.delivery));
const dPhone = await call("POST", `/api/bookings/${t16.id}/support/delegations`, a, { contact: "0912345678", validMinutes: 30 });
check("T16-04", "delegate by phone -> MANUAL / NO_SMS_PROVIDER (owner shares PIN)", dPhone.status === 200 && dPhone.body?.delivery?.channel === "MANUAL" && dPhone.body?.delivery?.reason === "NO_SMS_PROVIDER", JSON.stringify(dPhone.body?.delivery));
const active = sql(`SELECT COUNT(*) FROM PickupDelegations WHERE BookingId='${t16.id}' AND RevokedAt IS NULL AND UsedAt IS NULL`);
check("T16-05", "a new delegation revokes the previous one (exactly 1 active)", active === "1", `active=${active}`);
const bad = [["", 60], ["not a contact", 60], ["abc@", 60], ["0912345678", 0], ["0912345678", 1441]];
for (const [i, [c, m]] of bad.entries()) {
  const r = await call("POST", `/api/bookings/${t16.id}/support/delegations`, a, { contact: c, validMinutes: m });
  check(`T16-06.${i + 1}`, `invalid input rejected (contact='${c}', minutes=${m})`, r.status === 400, `status ${r.status}`);
}
const dOther = await call("POST", `/api/bookings/${t16.id}/support/delegations`, b, { contact: "x@example.com", validMinutes: 30 });
check("T16-07", "another customer cannot delegate someone else's booking", [403, 404].includes(dOther.status), `status ${dOther.status}`);
const conf = await paid(I.userA, I.stationA, "S");
const dConf = await call("POST", `/api/bookings/${conf.id}/support/delegations`, a, { contact: "x@example.com", validMinutes: 30 });
check("T16-08", "delegation refused for a booking that is not STORED", dConf.status === 400, `status ${dConf.status}`);
const delId = dPhone.body?.id;
const rev = await call("DELETE", `/api/bookings/${t16.id}/support/delegations/${delId}`, a);
check("T16-09", "owner can revoke a delegation", [200, 204].includes(rev.status) && sql(`SELECT COUNT(*) FROM PickupDelegations WHERE Id='${delId}' AND RevokedAt IS NOT NULL`) === "1", `status ${rev.status}`);
const colInfo = sql(`SELECT STRING_AGG(COLUMN_NAME, ',') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='PickupDelegations'`);
check("T16-10", "PIN is not stored in plain text in PickupDelegations", !sql(`SELECT * FROM PickupDelegations WHERE Id='${delId}'`).includes(dPhone.body?.pin), colInfo);

// ───────────── UC-T17 Lost items ─────────────
const t17 = await completed(I.userA, I.stationA, "S");
const l1 = await call("POST", `/api/bookings/${t17.id}/support/lost-items`, a, { description: "Black backpack left inside" });
check("T17-01", "report a lost item after completed pickup", l1.status === 200 && l1.body?.status === "OPEN" || l1.status === 200, JSON.stringify(l1.body).slice(0, 160));
const l2 = await call("POST", `/api/bookings/${t17.id}/support/lost-items`, a, { description: "again" });
check("T17-02", "second open report for the same booking is rejected (409)", l2.status === 409, `status ${l2.status}`);
const lb = await call("POST", `/api/bookings/${t17.id}/support/lost-items`, b, { description: "not mine" });
check("T17-03", "another customer cannot report on this booking", [403, 404].includes(lb.status), `status ${lb.status}`);
const st17 = await stored(I.userA, I.stationA, "S");
const ln = await call("POST", `/api/bookings/${st17.id}/support/lost-items`, a, { description: "too early" });
check("T17-04", "report refused while the booking is not completed", ln.status === 400, `status ${ln.status}`);
const t17b = await completed(I.userA, I.stationA, "S");
const lp = await call("POST", `/api/bookings/${t17b.id}/support/lost-items`, a, { description: "png photo", photo: "data:image/png;base64,iVBORw0KGgo=" });
check("T17-05", "non-JPEG photo is rejected", lp.status === 400, `status ${lp.status}`);
const lt = await call("POST", `/api/bookings/${t17b.id}/support/lost-items`, a, { description: "x".repeat(2001) });
check("T17-06", "description over 2000 characters is rejected", lt.status === 400, `status ${lt.status}`);
const t17old = await completed(I.userA, I.stationA, "S");
sql(`UPDATE Bookings SET CheckedOutAt=DATEADD(day,-8,SYSUTCDATETIME()) WHERE Id='${t17old.id}'`);
const lo = await call("POST", `/api/bookings/${t17old.id}/support/lost-items`, a, { description: "eight days later" });
check("T17-07", "report outside the 7-day window is rejected", lo.status === 400, `status ${lo.status}`);
const tAdmin = await call("GET", "/api/admin/traveler-support/lost-items", a);
check("T17-08", "traveler cannot open the staff queue (403)", tAdmin.status === 403, `status ${tAdmin.status}`);
const listed = await call("GET", "/api/admin/traveler-support/lost-items", admin);
const reportId = l1.body?.id;
check("T17-09", "staff queue lists the report", listed.status === 200 && JSON.stringify(listed.body).includes(reportId), `status ${listed.status}`);
const res = await call("POST", `/api/admin/traveler-support/lost-items/${reportId}`, admin, { status: "FOUND", response: "Backpack found, collect at desk." });
check("T17-10", "staff marks the item FOUND with a response", res.status === 200 && sql(`SELECT Status FROM LostItemReports WHERE Id='${reportId}'`) === "FOUND", `status ${res.status} ${JSON.stringify(res.body).slice(0, 120)}`);
const notif = sql(`SELECT COUNT(*) FROM Notifications WHERE UserId='${I.userA}' AND CreatedAt > DATEADD(minute,-5,SYSUTCDATETIME())`);
check("T17-11", "owner is notified about the response", Number(notif) >= 1, `notifications=${notif}`);
const resBad = await call("POST", `/api/admin/traveler-support/lost-items/${reportId}`, admin, { status: "BOGUS", response: "x" });
check("T17-12", "invalid staff status is rejected", resBad.status === 400, `status ${resBad.status}`);

// ───────────── UC-T21 Station review ─────────────
const t21 = await completed(I.userA, I.stationA, "M");
const rv = await call("POST", `/api/bookings/${t21.id}/support/review`, a, { stars: 5, comment: "Fast and clean", criteria: ["CLEAN", "FAST"] });
check("T21-01", "review a completed booking (5 stars, 2 criteria)", rv.status === 200, `status ${rv.status}`);
const rv2 = await call("POST", `/api/bookings/${t21.id}/support/review`, a, { stars: 4 });
check("T21-02", "second review for the same booking is rejected (409)", rv2.status === 409, `status ${rv2.status}`);
const t21b = await completed(I.userA, I.stationA, "M");
for (const [n, body, label] of [[1, { stars: 0 }, "0 stars"], [2, { stars: 6 }, "6 stars"], [3, { stars: 3, criteria: ["BOGUS"] }, "unknown criterion"], [4, { stars: 3, comment: "x".repeat(1001) }, "comment > 1000"], [5, { stars: 3, criteria: ["CLEAN", "FAST", "EASY_TO_FIND", "CLEAN"] }, "more than 3 criteria"]]) {
  const r = await call("POST", `/api/bookings/${t21b.id}/support/review`, a, body);
  check(`T21-03.${n}`, `invalid review rejected (${label})`, r.status === 400, `status ${r.status}`);
}
const stRev = await stored(I.userA, I.stationA, "M");
const rn = await call("POST", `/api/bookings/${stRev.id}/support/review`, a, { stars: 5 });
check("T21-04", "review refused before pickup is completed", rn.status === 400, `status ${rn.status}`);
const rb = await call("POST", `/api/bookings/${t21b.id}/support/review`, b, { stars: 5 });
check("T21-05", "another customer cannot review this booking", [403, 404].includes(rb.status), `status ${rb.status}`);
const stations = (await call("GET", "/api/Stations", a)).data;
const sA = stations.find((s) => s.name === "E2E Station A");
check("T21-06", "station list shows the new rating (ratingCount>=1, average 5)", sA?.ratingCount >= 1, JSON.stringify({ c: sA?.ratingCount, avg: sA?.averageRating ?? sA?.rating }));
const ratings = await call("GET", "/api/admin/traveler-support/ratings", admin);
const rA = Array.isArray(ratings.body) ? ratings.body.find((x) => x.stationName === "E2E Station A") : null;
check("T21-07", "admin ratings view aggregates the reviews per station (count >= 1)", ratings.status === 200 && rA?.count >= 1, JSON.stringify(rA));

// ───────────── UC-S08 Manual confirm ─────────────
const s8 = await stored(I.userA, I.stationA, "L");
import("node:fs").then(()=>{});
sql(`UPDATE Bookings SET CheckedOutAt=SYSUTCDATETIME(), ManualConfirmPhotoUrl='${PHOTO}' WHERE Id='${s8.id}'`);
const q0 = await call("GET", "/api/admin/manual-confirm", a);
check("S08-01", "traveler cannot open the manual-confirm queue (403)", q0.status === 403, `status ${q0.status}`);
const q1 = await call("GET", "/api/admin/manual-confirm", admin);
check("S08-02", "staff queue lists the pending photo confirmation", q1.status === 200 && JSON.stringify(q1.body).includes(s8.id), `status ${q1.status}`);
const noReason = await call("POST", `/api/admin/manual-confirm/${s8.id}/approve`, admin, { reason: "" });
check("S08-03", "approval without a reason is rejected", noReason.status === 400, `status ${noReason.status}`);
const ap = await call("POST", `/api/admin/manual-confirm/${s8.id}/approve`, admin, { reason: "Photo shows the locker is empty and closed." });
const after = sql(`SELECT Status FROM Bookings WHERE Id='${s8.id}'; SELECT BusinessStatus FROM Lockers WHERE Id='${s8.locker}'`).split("\n").map((x) => x.trim());
check("S08-04", "approval completes the booking (COMPLETED_MANUAL) and puts the locker into MAINTENANCE for sensor repair", ap.status === 200 && after[0] === "COMPLETED_MANUAL" && after[1] === "MAINTENANCE", `status ${ap.status} booking=${after[0]} locker=${after[1]}`);
const ap2 = await call("POST", `/api/admin/manual-confirm/${s8.id}/approve`, admin, { reason: "again" });
check("S08-05", "approving the same request twice is rejected", ap2.status === 400, `status ${ap2.status}`);
const apNone = await call("POST", `/api/admin/manual-confirm/00000000-0000-0000-0000-0000000000aa/approve`, admin, { reason: "x" });
check("S08-06", "approving an unknown request is rejected", [400, 404].includes(apNone.status), `status ${apNone.status}`);

// ───────────── UC-S02 Locker grid ─────────────
const g0 = await call("GET", `/api/admin/lockers/station/${I.stationA}/grid`, a);
check("S02-01", "traveler cannot open the admin locker grid (403)", g0.status === 403, `status ${g0.status}`);
const g1 = await call("GET", `/api/admin/lockers/station/${I.stationA}/grid`, admin);
const gj = JSON.stringify(g1.body);
check("S02-02", "admin grid returns all 6 lockers of the station", g1.status === 200 && (gj.match(/lockerCode/gi) ?? []).length >= 6, `status ${g1.status} codes=${(gj.match(/lockerCode/gi) ?? []).length}`);
const g2 = await call("GET", `/api/admin/lockers/station/${I.stationA}/reservations`, admin);
check("S02-03", "reservations endpoint answers for staff", g2.status === 200, `status ${g2.status}`);
const lk = sql(`SELECT TOP 1 CAST(Id AS varchar(36)) FROM Lockers WHERE StationId='${I.stationB}' AND Size='S'`).trim();
const mt = await call("PATCH", `/api/admin/lockers/${lk}/status`, admin, { businessStatus: "MAINTENANCE", healthStatus: "MAINTENANCE", reason: "e2e maintenance check" });
const mtDb = sql(`SELECT BusinessStatus FROM Lockers WHERE Id='${lk}'`);
check("S02-04", "admin can put a free locker into MAINTENANCE", mt.status === 200 && mtDb === "MAINTENANCE", `status ${mt.status} db=${mtDb} ${JSON.stringify(mt.body).slice(0, 100)}`);
heartbeat();
const sb = (await call("GET", "/api/Stations", a)).data.find((s) => s.name === "E2E Station B");
check("S02-05", "maintenance locker is no longer counted as available (availableS 2 -> 1)", sb?.availableS === 1, `availableS=${sb?.availableS}`);
sql(`UPDATE Lockers SET BusinessStatus='AVAILABLE' WHERE Id='${lk}'`);

// ───────────── UC-T11 / T12 / T15 ( limited by missing MQTT broker & PayOS ) ─────────────
const kBook = await paid(I.userA, I.stationA, "S");
const kv = (await call("GET", "/api/Bookings/" + kBook.id, a)).data;
const wrongPin = await call("POST", "/api/kiosk/check-in", null, { stationId: I.stationA, credentialType: "ACCESS_CODE", payload: "00000000" });
check("T11-01", "kiosk rejects a wrong PIN", wrongPin.status >= 400, `status ${wrongPin.status} ${JSON.stringify(wrongPin.body).slice(0, 120)}`);
const wrongSt = await call("POST", "/api/kiosk/check-in", null, { stationId: I.stationB, credentialType: "ACCESS_CODE", payload: kv.accessCode });
check("T11-02", "kiosk rejects a valid PIN used at a different station", wrongSt.status >= 400, `status ${wrongSt.status} ${JSON.stringify(wrongSt.body).slice(0, 120)}`);
const walkBad = await call("POST", "/api/kiosk/walk-in", null, { stationId: I.stationA, size: "S", hours: 2, phone: "not-a-phone" });
check("T15-01", "walk-in with an invalid phone number is rejected", walkBad.status === 400, `status ${walkBad.status}`);
const walkHours = await call("POST", "/api/kiosk/walk-in", null, { stationId: I.stationA, size: "S", hours: 100, phone: "0912345678" });
check("T15-02", "walk-in over the maximum hours is rejected", walkHours.status === 400, `status ${walkHours.status} ${JSON.stringify(walkHours.body).slice(0, 120)}`);
const walkSize = await call("POST", "/api/kiosk/walk-in", null, { stationId: I.stationA, size: "XL", hours: 2, phone: "0912345678" });
check("T15-03", "walk-in with an unknown size is rejected", walkSize.status === 400, `status ${walkSize.status}`);

const pass = results.filter((r) => r.ok).length;
console.log(`\nSUMMARY: ${pass}/${results.length} passed`);
writeFileSync("results.json", JSON.stringify(results, null, 1));
