# Local sample-data E2E (UC-T09, T11, T15, T16, T17, T21, S02, S08)

Runs the real backend (origin/dev + Hunglq T15/T16 work) against a LOCAL SQL Server LocalDB database `SmartLockerE2E`
seeded with sample users/stations/lockers. It never touches the shared cloud database.

- Payment gateway: PayOS is replaced by a signed webhook using a dummy local checksum key (booking rows are inserted directly; the real webhook/credential code runs).
- SMTP and MQTT are disabled (SMTP_NOT_CONFIGURED path is what T16 returns locally).
- Door events are fed to the real `DoorEventHandler` in-process (`doortool`).
- Not covered locally: kiosk check-in/check-out door cycle through MQTT, real PayOS payment, real e-mail delivery, ESP32 hardware, browser voices.

Run order: `dbinit` (create + seed) -> start API with env overrides -> `node t_all.mjs` -> `node t_door.mjs`.
