# Receipt verification

`verifyReceipt` produces advisory reports only. It never authorizes posting or
inventory changes. Invoice dates must be valid `YYYY-MM-DD` dates. Monetary
inputs must be finite, nonnegative numbers within the safe monetary range.
Products are calculated using decimal coefficients, rounded half up to paisa
per line, then summed independently of extracted line totals. Line and invoice
differences up to five paisa are accepted. Extracted line and invoice totals retain
their decimal precision for comparison: a difference of 0.05 passes, while 0.051
or 0.054 fails. Rounding an extracted total must never widen the tolerance.

The receipt JSON field `source_image_verified` is retained for compatibility but
cannot grant verification. The JSON CLI therefore cannot grant source PASS.
Without a separate review, an otherwise valid receipt requires manual review.

A trusted caller may supply `VerifyReceiptOptions.sourceReview` only after an
authorized human compares the actual receipt image with the extraction:

- `receiptSha256`: `receiptEvidenceHash(receipt)` for the exact reviewed extraction.
- `sourcePath`: local path of the reviewed source file.
- `sourceSha256`: SHA-256 of the reviewed source bytes.
- `reviewedBy`: the reviewer identity supplied by the authenticated caller.
- `reviewedAt`: a parseable review timestamp, no later than the current time.

The verifier checks both hashes, the source file, and review metadata. Changes to
the extraction or source invalidate the review. Hash checks establish binding,
not image accuracy or reviewer identity; the caller must authenticate the reviewer
and must never populate these options from OCR output or untrusted receipt JSON.
JEV and OCR grounding remain advisory and do not replace this human review.

Run the synthetic regression suite with:

```sh
rtk proxy ./node_modules/.bin/vitest run tests/jev/receipt_verification.spec.ts
```
