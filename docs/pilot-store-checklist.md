# Pilot Store Readiness Checklist

Complete these 10 gatekeeper tasks sequentially prior to initial live customer deployment.

## 🛠️ Hardware & Network Setup
- [ ] **Primary Android Device**: Tablet or Phone running Android 10+ with 4GB RAM minimum.
- [ ] **Bluetooth Printer**: Paired, loaded with 80mm/58mm paper, successful self-test run.
- [ ] **Scanner Config**: Verified input wedge mode appends hard newline after each successful scan.
- [ ] **Network Check**: 4G SIM card configured and local store WiFi password entered correctly.

## 👥 Staff Onboarding & Training
- [ ] **Cashier Drill**: Complete scanning cart building, quantity adjustment and payment finalization < 10 secs.
- [ ] **Offline Run**: Cashiers understand the "Yellow Syncing" icon meaning and how transactions safely buffer.
- [ ] **Conflict Reset**: Managers have successfully dismissed an injection conflict manually on device.

## 🛡️ Reliability Controls
- [ ] **Telemetry Snapshot**: Verify DB contains the auto-capture snapshots of last hour metrics.
- [ ] **External Export**: Run a manual backup test sending transaction export via email/system share sheet.
- [ ] **Zero-Ledger Sync**: Confirm global central dashboard shows `0` pending and `0` dead letters.

---

### 🛑 NO-GO CRITERIA (Abort Launch If True)
*   DLQ Count > 0 on launch morning.
*   Device battery health < 80%.
*   Local SQLite storage usage approaching device hardware capacity.
