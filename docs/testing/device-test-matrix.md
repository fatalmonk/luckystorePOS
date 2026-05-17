# Production Validation Matrix

This matrix specifies hard requirements for certifying a hardware release as "Pilot Ready" for real store environments.

## 1. Network Resilience Suite

| Scenario | Action Requirement | PASS Criteria |
| :--- | :--- | :--- |
| **Unstable 2G Simulation** | Run 10 checkouts during 90% packet loss | 0 lost transactions. Eventual FIFO queue clearance. |
| **Hard Reconnect Storm** | Drop wifi, queue 50 items, restore wifi | Replay system triggers automagically < 2sec from reconnect. |
| **Long Offline Window** | Keep app disconnected for 4+ operating hours | No UI stutter or ANR crashes; local SQLite cache responsive. |

## 2. Android Lifecycle Integrity

| Scenario | Action Requirement | PASS Criteria |
| :--- | :--- | :--- |
| **OS Kill & Restore** | Build cart -> force kill via Android ADB -> relaunch | Cart state persists 100% perfectly from SQLite restoration. |
| **Low Memory Cold Start** | Launch with <100MB system ram available | App enters minimal safe state, halts graphics before crashing. |
| **Background Suspend** | Put app in bg during active replay sync | Transaction finishes OR elegantly pauses & resumes on foreground. |

## 3. Hardware Validation (Peripherals)

| Scenario | Action Requirement | PASS Criteria |
| :--- | :--- | :--- |
| **Bluetooth Disconnect** | Cut power to Thermal Printer mid-print queue | App flags "Printer Offline". User can queue next or reprint. |
| **Keyboard Wedge Stress** | Input 10 raw barcodes per second via scanner | Inputs serialized linearly. No character truncation. |

## 4. Concurrency Multi-Register Stress

| Scenario | Action Requirement | PASS Criteria |
| :--- | :--- | :--- |
| **Dual-Register Race** | Deduct last stock unit simultaneously on 2 pads | Exact 1 "Success", exact 1 "Conflict/Sold-Out" handled locally. |
| **Mid-Sale Recon** | Run admin stock adjustment while cashier builds cart | System warns cashier of change OR handles variance on submit. |
