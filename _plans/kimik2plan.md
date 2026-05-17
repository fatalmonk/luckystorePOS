# Lucky Store POS — Single-Store Focus Plan

> **The "1-Store" Rule:** Every feature must either (a) save the owner time daily, or (b) directly help acquire store #2. Everything else is deferred.

---

## Phase A: Counter Speed & Trust (Weeks 1–3)
*Fix daily friction that makes or breaks a single-store deployment.*

### A1. Mobile POS — Checkout Faster Than Pen & Paper

| Feature | Why It Matters | Implementation |
|---------|---------------|----------------|
| **Quick-add favorites grid** | Owner sells same 15–20 items daily. One-tap beats barcode. | Pin top 20 by sales velocity to POS home. |
| **Voice search (Bangla)** (Disabled) | Staff not tech-savvy. Saying "চাল" is natural. | `speech_to_text` with `localeId: 'bn_BD'`. |
| **Customer phone lookup** | Credit sales common. Last 4 digits → auto-fill name/balance. | SQLite index on `customers.phone` substring. |
| **Offline sale queue visibility** ✅ | Staff panic when internet drops. Clear badge: "Sales Queued: 3". | Drift stream listener + SnackBar. |
| **Printer health indicator** | MHT-P29L disconnects mid-day. Show BT + battery in header. | `flutter_blue_plus` connection state stream. |

### A2. Kill Silent Failures

| Fix | Current Risk | Solution |
|-----|-------------|----------|
| **bKash offline queue** | Offline bKash payment: does it process on reconnect? | `pending_payments` table. Edge fn `process-bkash-queue`. |
| **Stock adjustment fraud** | Staff could adjust stock to cover theft. | Manager PIN required for adjustments >5%. |
| **Duplicate sale protection** ✅ | Network blip → double entry. | Idempotency key on `create-sale` edge fn. |

---

## Phase B: Owner's Daily Admin (Weeks 3–6)
*Owner does the books. Save 1 hour/day.*

### B1. Automated Reconciliation

| Feature | Replaces |
|---------|----------|
| **End-of-day auto-summary** | Manual cash counting + notebook tally. Auto-SMS at 10 PM. |
| **bKash ↔ Sale mismatch alert** | Manual bKash app vs POS comparison. Alert if counts differ. |
| **Expense voice entry** | Forgetting to log cash expenses. "Transport 200" → parsed. |

### B2. Inventory Intelligence

| Feature | Why Now |
|---------|---------|
| **Auto reorder alerts** | "চাল stock runs out in 2 days." Order before crisis. |
| **Expiry heatmap** | FMCG expiry = death. "3 items expire in 14 days" red badge. |
| **Dead stock flag** | "This item hasn't sold in 30 days." Clear shelf space. |

### B3. Collections That Work

| Feature | Bangladesh Context |
|---------|-------------------|
| **WhatsApp reminder (1-click)** | One button sends: "আপনার বকেয়া ৳1,200. অনুগ্রহ করে পরিশোধ করুন।" |
| **Promise-to-pay calendar** | Customer says "Friday." Auto-reminder Friday AM. |
| **Collection success rate** | Chart: "Recovered ৳45k of ৳60k overdue this month." |

---

## Phase C: Growth Prep — 1 to 5 Stores (Months 3–4)

### C1. Price Monitoring as Marketing

| Action | Output |
|--------|--------|
| **Weekly Market Price Report** | PDF: "Shwapno sells X for ৳45, you sell for ৳42." Owner shares on Facebook. |
| **Price opportunity alert** | "Chaldal raised Y by ৳5. Consider raising yours." |
| **Competitor OOS signals** | "Chaldal out of Z. You have 12 units—push today." |

### C2. Demo Mode & Onboarding

| Feature | Purpose |
|---------|---------|
| **"Try Without Account"** | Demo store with 50 BD SKUs (চাল, ডাল, সাবান). Reduces signup friction. |
| **Bangla video tutorials** | 3 videos × 3 min: "প্রথম বিক্রয়", "বারকোড প্রিন্ট", "বিকাশ পেমেন্ট". |
| **"Why Switch?" flyer** | Print-ready Bangla PDF vs. paper notebooks. Share with neighbors. |

### C3. Play Store Launch (Credibility)
- Frame bKash as "payment method recording" (not financial app)
- Target: Live by end of Month 3

---

## Explicitly Deferred (Until Store #3+)

| Feature | Why Deferred |
|---------|-------------|
| Multi-store / Franchise mode | No point until 2 stores. Migration debt risk. |
| Supplier portal (B2B) | 1 store: suppliers call owner directly. |
| AI basket analysis | Need 1000+ transactions. Not enough volume. |
| NBR e-Filing export | File manually. Build when asked 3 times. |
| Storybook expansion | Zero impact on store #1 revenue. |

---

## 4-Month Roadmap

```
Week 1-2:  POS favorites + Bangla voice + printer status
Week 3:    Offline bKash queue + duplicate protection + reorder alerts  
Week 4:    EOD summary + bKash mismatch + expiry heatmap
Week 5-6:  WhatsApp collections + dead stock + expense quick-add
Week 7-8:  Price reports PDF + demo mode + video tutorials
Month 3:   Play Store launch + "Try Without Account"
Month 4:   Outreach to store #2 with testimonial + case study
```

---

## The One Metric

**Daily active sessions on mobile POS.**
- Target: 50+ opens/day, <30 sec per sale
- If owner still reaches for notebook, nothing else matters.

---

## Immediate To-Do List

### Phase A Tasks (Remaining)
- [ ] **Quick-add favorites grid**: Implement UI on POS home.
- [ ] **Customer phone lookup**: Implement SQLite index and lookup logic.
- [ ] **Printer health indicator**: Complete UI for BT + battery status.
- [ ] **bKash offline queue**: Fix compilation errors in `bkash_checkout.dart` and implement queue.
- [ ] **Stock adjustment fraud**: Add manager PIN for adjustments.
- [ ] **Voice search (Bangla)**: Resolve `speech_to_text` incompatibility with Flutter 3.29+.
