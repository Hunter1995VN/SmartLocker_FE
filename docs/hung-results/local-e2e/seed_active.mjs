import { ids, seedPendingBooking, payBooking, sql, heartbeat } from "./lib.mjs";
heartbeat();
const I = ids();
const bk = seedPendingBooking({ userId: I.userA, stationId: I.stationA, size: "M", hours: 3 });
await payBooking(bk, 75000);
const lk = sql(`SELECT TOP 1 CAST(Id AS varchar(36)) FROM Lockers WHERE StationId='${I.stationA}' AND Size='M' AND BusinessStatus='AVAILABLE'`).split("\n")[0].trim();
sql(`UPDATE Bookings SET LockerId='${lk}', Status='STORED', CheckedInAt=DATEADD(minute,-20,SYSUTCDATETIME()), StartAt=DATEADD(minute,-20,SYSUTCDATETIME()), EndAt=DATEADD(hour,2,SYSUTCDATETIME()) WHERE Id='${bk.id}'; UPDATE Lockers SET BusinessStatus='OCCUPIED' WHERE Id='${lk}'`);
console.log("seeded STORED booking", bk.code);
