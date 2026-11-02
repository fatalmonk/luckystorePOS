# Receipt tooling memory

The optional `memory` dependency group installs the TypeSafe Simple Memory
cookbook support used by LuckyStore's local Python receipt tooling:

```sh
uv sync --group memory
```

`typesafe-sdk` is already a base project dependency. `scripts/receipts/receipt_memory.py`
adapts the cookbook to the existing `scripts.receipts.typesafe_client.TypeSafeClient`.
It is opt-in and development-only; the admin OCR flow, receipt importers, Jev
ledger audit, and posting paths do not call it automatically.

## Intended use

Keep only durable receipt-layout conventions, such as where a supplier prints a
net total or how its invoice labels a date. Do not remember individual receipt
values, OCR transcripts, payment details, invoice numbers, or personal data.
Call `remember_verified_pattern(...)` only after a human has compared the source
image and confirmed the candidate convention. That operation sends only the
short candidate fact to TypeSafe for a Noul save judgment; the image, source
path, supplier name, source hash, and transaction values are not sent by this
helper. An identical judgment is served from `cooksafe.JsonCache` when available.

Saved memories are scoped by a one-way hash of supplier name and stored locally
under `.cache/luckystore/receipt-format-memories.json`. They expire after 180
days and are capped at 12 per supplier. The cache and store are gitignored. To
remove a supplier's memories, call `ReceiptMemoryStore().forget_supplier(name)`;
to remove all local memory data, delete `.cache/luckystore/`.

For a later TypeSafe review, use `evaluate_with_supplier_memories(...)` or
`state_with_supplier_memories(...)`. The inserted notes are advisory context;
the current receipt remains the source of truth, and no memory can populate or
approve ledger fields by itself. The default save threshold is a conservative
starting value and should be calibrated against human-labeled examples before
any broader automation.

No TypeSafe API call runs during setup or import. The caller must explicitly
invoke the save function, and a human-review flag is required.
