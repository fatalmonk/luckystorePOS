-- Lucky Store Receipt Intelligence Pipeline
-- Implements document parsing, classification, structured extraction, and deterministic financial reconciliation

-- Stage 1: Parse once, then retain successful and failed documents separately.
CREATE OR REFRESH STREAMING TABLE parsed_receipt_documents AS
SELECT
  path,
  modificationTime AS ingested_at,
  ai_parse_document(content, map('version', '2.0')) AS parsed
FROM STREAM read_files(
  '${landing_volume_path}',
  format => 'binaryFile'
);

CREATE OR REFRESH STREAMING TABLE raw_parsed_receipts AS
SELECT
  path,
  ingested_at,
  concat_ws('\n', transform(parsed:document:elements, e -> e:content::STRING)) AS text_blocks
FROM STREAM LIVE.parsed_receipt_documents
WHERE parsed:error_status IS NULL;

CREATE OR REFRESH STREAMING TABLE receipt_parse_errors AS
SELECT
  path,
  ingested_at,
  parsed:error_status::STRING AS parse_error
FROM STREAM LIVE.parsed_receipt_documents
WHERE parsed:error_status IS NOT NULL;

-- Stage 2: Classify document type (purchase_invoice, delivery_challan, product_price_list, handwritten_receipt, other)
CREATE OR REFRESH STREAMING TABLE classified_receipts AS
SELECT
  path,
  ingested_at,
  text_blocks,
  ai_classify(
    text_blocks,
    '["purchase_invoice","delivery_challan","product_price_list","handwritten_receipt","other"]',
    map('version', '2.0')
  ):response[0]::STRING AS doc_type
FROM STREAM LIVE.raw_parsed_receipts;

-- Stage 3: Structured multimodal extraction of supplier, invoice metadata, and line items
CREATE OR REFRESH STREAMING TABLE extracted_purchase_items AS
SELECT
  path,
  ingested_at,
  doc_type,
  text_blocks,
  result:response:supplier_name::STRING AS supplier_name,
  result:response:invoice_number::STRING AS invoice_number,
  result:response:invoice_date::STRING AS invoice_date,
  try_cast(result:response:total_amount::STRING AS DECIMAL(18, 2)) AS invoice_total,
  result:response:line_items::ARRAY<VARIANT> AS line_items,
  result:error_message::STRING AS extract_error
FROM (
  SELECT
    *,
    ai_extract(
      text_blocks,
      '{"supplier_name":{"type":"string"},"invoice_number":{"type":"string"},"invoice_date":{"type":"string"},"total_amount":{"type":"number"},"line_items":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"quantity":{"type":"number"},"unit_price":{"type":"number"},"line_total":{"type":"number"}}}}}',
      map('version', '2.0')
    ) AS result
  FROM STREAM LIVE.classified_receipts
  WHERE doc_type IN ('purchase_invoice', 'delivery_challan', 'handwritten_receipt')
    AND text_blocks IS NOT NULL
);

-- Stage 4: Reconcile extracted totals. This result is evidence, not posting authorization.
CREATE OR REFRESH LIVE TABLE purchase_reconciliation AS
WITH item_reconciliation AS (
  SELECT
    path,
    ingested_at,
    doc_type,
    supplier_name,
    invoice_number,
    invoice_date,
    invoice_total,
    extract_error,
    line_items,
    aggregate(
      line_items,
      CAST(0 AS DECIMAL(18, 2)),
      (acc, item) -> acc + coalesce(
        try_cast(item:line_total::STRING AS DECIMAL(18, 2)),
        try_cast(
          try_cast(item:quantity::STRING AS DECIMAL(18, 4))
            * try_cast(item:unit_price::STRING AS DECIMAL(18, 4))
          AS DECIMAL(18, 2)
        ),
        CAST(0 AS DECIMAL(18, 2))
      )
    ) AS calculated_total,
    aggregate(
      line_items,
      true,
      (all_valid, item) -> all_valid
        AND (try_cast(item:quantity::STRING AS DECIMAL(18, 4)) IS NULL
          OR try_cast(item:quantity::STRING AS DECIMAL(18, 4)) > 0)
        AND (try_cast(item:unit_price::STRING AS DECIMAL(18, 4)) IS NULL
          OR try_cast(item:unit_price::STRING AS DECIMAL(18, 4)) >= 0)
        AND (
          (try_cast(item:line_total::STRING AS DECIMAL(18, 2)) IS NOT NULL
            AND try_cast(item:line_total::STRING AS DECIMAL(18, 2)) >= 0)
          OR (
            try_cast(item:line_total::STRING AS DECIMAL(18, 2)) IS NULL
            AND try_cast(item:quantity::STRING AS DECIMAL(18, 4)) > 0
            AND try_cast(item:unit_price::STRING AS DECIMAL(18, 4)) IS NOT NULL
            AND try_cast(
              try_cast(item:quantity::STRING AS DECIMAL(18, 4))
                * try_cast(item:unit_price::STRING AS DECIMAL(18, 4))
              AS DECIMAL(18, 2)
            ) IS NOT NULL
          )
        )
    ) AS line_items_valid
  FROM LIVE.extracted_purchase_items
),
reconciled AS (
SELECT
  path,
  ingested_at,
  doc_type,
  supplier_name,
  invoice_number,
  invoice_date,
  invoice_total,
  extract_error,
  calculated_total,
  line_items,
  CASE
    WHEN doc_type <> 'purchase_invoice' THEN 'not_purchase_invoice'
    WHEN extract_error IS NOT NULL THEN 'extraction_error'
    WHEN invoice_total IS NULL THEN 'missing_invoice_total'
    WHEN invoice_total < 0 THEN 'invalid_invoice_total'
    WHEN supplier_name IS NULL OR trim(supplier_name) = ''
      OR invoice_number IS NULL OR trim(invoice_number) = '' THEN 'missing_invoice_metadata'
    WHEN line_items IS NULL OR size(line_items) = 0 THEN 'missing_line_items'
    WHEN NOT line_items_valid THEN 'invalid_line_items'
    WHEN abs(invoice_total - calculated_total) <= CAST(0.05 AS DECIMAL(18, 2)) THEN 'matched'
    ELSE 'needs_review'
  END AS reconciliation_status,
  line_items_valid
FROM item_reconciliation
)
SELECT
  path,
  ingested_at,
  doc_type,
  supplier_name,
  invoice_number,
  invoice_date,
  invoice_total,
  extract_error,
  calculated_total,
  line_items,
  line_items_valid,
  reconciliation_status,
  reconciliation_status = 'matched' AS totals_match
FROM reconciled;
