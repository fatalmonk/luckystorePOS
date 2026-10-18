# TypeSafe Research — Google Drive "Lucky Store" Folder
Source (primary): the mounted Google Drive "My Drive" folder (account-specific local path omitted; contents were checked through local filesystem paths).

Workspace context: Lucky Store monorepo (customer storefront and mobile app); local paths intentionally omitted.

## Verified Contents — "Lucky Store" (folder-level, verified paths)
- Finance & Accounts: Daily Sales Tracker, Accounts & Financial Records (.gsheet)
- Inventory & Product Data: multiple sheets (Batch 01 Legacy, March 2026, 2026-04-13 Excel export, Items Export .csv, Inventory Tracker Template, Master with Images)
- SEO audit artifacts in root of Drive: `Luckystore1947_28-Sep-2026_...` (duplicate pages, missing title tags, single dofollow link reports — .gsheet) — these map directly to the SEO backlog items (Task 3/Item 6 sitemap + meta verification).
- Corporate: "Lucky Group - Corporate & Shared" (vendor list, senior merchandiser screening script, profile PDF).

## Separate business records

Other business folders are out of scope; their names and contents are intentionally omitted.

No fabricated files listed; all paths verified by `find` output from this session. Not verified: actual Google Sheets cell contents (file-level listing only; no file-read of contents performed).

## Relevance to TypeSafe (Jev)
These data sources can feed TypeSafe judgments: inventory sheets → `Choice` (product status), SEO audit .gsheets → `Score` (priority ranking of fixes), KTL proposal PDFs → `Noul` (constraint checks). Primary docs: docs.typesafe.ai/cookbooks (batching/re-ranking/guardrails) and SDK quickstart (https://docs.typesafe.ai/introduction/quickstart).
