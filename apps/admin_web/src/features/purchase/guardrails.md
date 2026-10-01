# Purchase OCR guardrails

## Responsibility boundaries

- OpenRouter vision extracts candidate receipt values from the image. It remains the only image-capable stage.
- TypeSafe System One (`jev-latest`) receives bounded extracted text fields only and screens them for system-directed or unauthorized application instructions. It cannot confirm OCR values against receipt pixels.
- Deterministic browser checks compare arithmetic, filename metadata, vision values, and duplicate invoice metadata. Filename/vision conflicts preserve both values and require review; arithmetic emits one invoice-level warning from the final displayed total. These checks never fill missing values or rewrite extracted values.
- A line total matching quantity × unit price does not prove the amount was visually read. Keep the extracted value unchanged and require human verification when other evidence raises doubt.
- Staff review and the existing purchase RPC remain the boundary for applying values and posting stock or ledger changes.

## Security verdicts

- A clear TypeSafe result allows the extraction to be returned with values unchanged.
- A moderate result returns a manual-review reason. Posting requires staff acknowledgment of the current warnings; draft saving remains available.
- A high-risk result blocks the vision result and disables local OCR fallback for that scan.
- When TypeSafe is missing or unavailable, OpenRouter performs the existing text guard. Unless that guard blocks, the result still requires manual review. If neither guard can return a verdict, the scan fails without falling through to Tesseract.
- The client persists scan ID, warnings, field-source provenance, and acknowledgment with the local draft. A new scan clears prior warnings and acknowledgment.

## Cost and latency

When configured, the TypeSafe call batches two Noul questions and one severity Score. It is bounded by an 8-second request/response timeout and a 16 KiB response limit. The raw image, extracted quantities, prices, and totals are not sent to TypeSafe.

## Credentials and setup

The Edge Function reads `TYPESAFE_API_KEY`. Configure it only through the approved Supabase secret workflow; no secret was added or deployed as part of this local change. OpenRouter remains configured separately for image extraction and fallback screening.

Use the Jev CLI/MCP for developer research and code review, not as an extra request in each scan. It was unavailable during this implementation because its configured provider returned an authentication failure; no live Jev evaluation was used to approve this code.

## Review order

Complete and verify field-source provenance and stale-scan isolation before enabling external OCR guardrails. Keep arithmetic as evidence for human verification, never as a way to infer or normalize receipt values. Re-check TypeSafe model/API behavior and the receipt posting boundary before enabling the secret in a deployed environment.
