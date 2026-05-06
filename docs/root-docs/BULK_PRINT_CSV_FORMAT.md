# Bulk Print CSV Import Format

## Overview
Import products from a CSV file to quickly add them to the bulk print queue. This is useful for:
- Printing labels for new inventory
- Re-printing labels for existing products
- Bulk printing from a supplier's product list
- Seasonal label updates (e.g., price changes)

## CSV Format

### Required Columns

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| `barcode` or `sku` | ✅ Yes | Product barcode or SKU | `SKU001` or `8901234567890` |
| `name` or `product_name` | ✅ Yes | Product name | `Rice Premium 5kg` |

### Optional Columns

| Column Name | Required | Description | Example |
|-------------|----------|-------------|---------|
| `mrp` or `max_retail_price` | ❌ No | MRP shown with strikethrough | `450.00` |
| `price` or `sale_price` | ❌ No | Sale price (shown prominently) | `350.00` |
| `copies` or `quantity` | ❌ No | Number of labels to print (default: 1) | `5` |
| `id` or `product_id` | ❌ No | Internal product ID | `PROD123` |

### Column Aliases

The import accepts multiple column name variations:

- **Barcode/SKU:** `barcode`, `sku`, `code`, `gtin`, `ean`, `upc`, `product_code`
- **Name:** `name`, `product_name`, `title`, `product`, `description`
- **MRP:** `mrp`, `max_retail_price`, `maximum_retail_price`, `list_price`, `original_price`
- **Price:** `price`, `sale_price`, `retail_price`, `cost`, `unit_price`, `our_price`
- **Copies:** `copies`, `quantity`, `qty`, `print_qty`, `labels`, `count`, `print_count`
- **ID:** `id`, `product_id`, `sku_id`, `item_id`

## Example CSV Files

### Minimal CSV (Required columns only)
```csv
barcode,name
SKU001,Rice Premium 5kg
SKU002,Cooking Oil 1L
SKU003,Sugar 2kg
```

### With MRP (Shows discount)
```csv
barcode,name,mrp,price
SKU001,Rice Premium 5kg,450.00,350.00
SKU002,Cooking Oil 1L,220.00,180.00
```
*This will show MRP with strikethrough and "Our Price" with discount percentage*

### Standard CSV (With MRP and Sale Price)
```csv
barcode,name,mrp,price
SKU001,Rice Premium 5kg,450.00,350.00
SKU002,Cooking Oil 1L,220.00,180.00
SKU003,Sugar 2kg,150.00,120.00
```

### Full CSV (All columns with MRP)
```csv
id,barcode,name,mrp,price,copies
PROD001,SKU001,Rice Premium 5kg,450.00,350.00,10
PROD002,SKU002,Cooking Oil 1L,220.00,180.00,5
PROD003,SKU003,Sugar 2kg,150.00,120.00,8
PROD004,SKU004,Tea Premium 500g,300.00,250.00,3
```

### Alternative Column Names
```csv
sku,product_name,retail_price,quantity
SKU001,Rice Premium 5kg,350.00,10
SKU002,Cooking Oil 1L,180.00,5
```

## CSV File Requirements

### Format
- **File extension:** `.csv`
- **Encoding:** UTF-8 (recommended)
- **Delimiter:** Comma (`,`) - Semicolon (`;`) also supported
- **Quote character:** Double quote (`"`)
- **Line endings:** LF or CRLF

### Data Requirements

**Barcode/SKU:**
- Must be unique per product
- Alphanumeric characters only
- Max length: 50 characters
- No spaces (use underscores or hyphens)

**Name:**
- Required for all products
- Max length: 100 characters
- UTF-8 characters supported (e.g., বাংলা text)

**Price:**
- Numeric value only
- No currency symbols
- Use decimal point (`.`) not comma
- Examples: `350`, `350.00`, `99.99`

**Copies:**
- Integer value only
- Range: 1-99
- Default: 1 if not specified

## How to Import

### In the App

1. **Navigate to Bulk Print**
   - Tap the print icon (🖨️) from the home screen
   - Or go to Inventory → Bulk Label Print

2. **Import CSV**
   - Tap the menu icon (⋮) in the top-right
   - Select **"Import from CSV"**
   - Choose your CSV file from device storage

3. **Review Import**
   - See import summary (success count, warnings, errors)
   - Imported products are automatically selected
   - Adjust copies per product if needed

4. **Print**
   - Ensure printer is connected
   - Tap **"Print X Labels"**
   - Wait for completion

### Alternative: Use Template

1. Tap menu (⋮) → **"Download Template"**
2. Save the template file
3. Edit with your product data
4. Import the edited file

## Creating CSV Files

### Using Excel
1. Create a spreadsheet with columns
2. Enter product data
3. Save As → CSV UTF-8 (Comma delimited) (*.csv)

### Using Google Sheets
1. Create a spreadsheet
2. Enter product data
3. File → Download → Comma Separated Values (.csv)

### Using Text Editor
```csv
barcode,name,price,copies
SKU001,Rice Premium 5kg,350.00,10
SKU002,Cooking Oil 1L,180.00,5
```

Save with `.csv` extension and UTF-8 encoding.

## Validation Rules

The import will validate:

✅ **Required fields present**
- Every row must have barcode and name

✅ **Unique barcodes**
- Duplicate barcodes will show a warning

✅ **Valid price format**
- Must be numeric

✅ **Valid copies range**
- 1-99 labels per product

✅ **Max row limit**
- Up to 1000 products per import

## Import Process

1. **Select CSV file** - Pick file from device storage
2. **Preview data** - Review before importing
3. **Map columns** (if needed) - Match CSV columns to fields
4. **Validate** - Check for errors
5. **Import** - Add to bulk print queue
6. **Print** - Send to MHT-P29L printer

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing barcode" | Barcode column empty | Check CSV has barcode values |
| "Missing name" | Name column empty | Check CSV has product names |
| "Invalid price" | Price not numeric | Ensure price is a number |
| "Too many copies" | Copies > 99 | Reduce copies to 99 or less |
| "Duplicate barcode" | Same barcode appears twice | Remove duplicates |
| "Empty file" | No data rows found | Add product data to CSV |
| "Too many rows" | > 1000 products | Split into multiple files |
| "Could not read file" | File access issue | Try a different file location |

## Template Downloads

### Minimal Template
```csv
barcode,name
```

### Full Template (with MRP)
```csv
id,barcode,name,mrp,price,copies
```

## Sample Data for Testing

Save this as `sample_products.csv`:

```csv
barcode,name,price,copies
DEMO001,Test Product 1,100.00,2
DEMO002,Test Product 2,150.50,3
DEMO003,Test Product 3,75.25,1
```

### With MRP and Discount
```csv
barcode,name,mrp,price,copies
DEMO001,Test Product 1,150.00,100.00,2
DEMO002,Test Product 2,200.00,150.50,3
DEMO003,Test Product 3,100.00,75.25,1
```
*Shows MRP with strikethrough and discount percentage (-33%, -25%, -25%)*

## Export from Existing System

If you have products in another system, export with these columns:
- Product Code/SKU → `barcode`
- Product Name → `name`
- Price → `price`
- Stock Quantity → `copies` (if you want to print one label per item)

## Tips

- **Backup first:** Export existing products before bulk importing
- **Test with small file:** Use 3-5 products first
- **Check encoding:** Ensure special characters display correctly
- **Validate prices:** Double-check price formatting
- **Use consistent barcodes:** Follow your barcode scheme
- **Save template:** Keep a template file for future imports

## Files Created

| File | Purpose |
|------|---------|
| `lib/core/services/csv_import_service.dart` | CSV parsing and validation |
| `BULK_PRINT_CSV_FORMAT.md` | This documentation |

## Code Integration

The CSV import is integrated into `BulkLabelPrintScreen`:

```dart
// From app bar menu
PopupMenuButton<String>(
  onSelected: (value) {
    if (value == 'import') _importFromCsv();
    if (value == 'template') _downloadTemplate();
  },
  items: [
    PopupMenuItem(value: 'import', child: Text('Import from CSV')),
    PopupMenuItem(value: 'template', child: Text('Download Template')),
  ],
)
```

## Support

For issues with CSV import:
1. Check file encoding is UTF-8
2. Verify column headers match supported names
3. Ensure no special characters in file
4. Try with the sample data first
5. Check that required columns are present

For printer setup issues, see `MHT-P29L_SETUP.md`.
For bulk printing guide, see `BULK_LABEL_PRINTING.md`.
