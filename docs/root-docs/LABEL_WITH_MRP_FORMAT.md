# Label Format with MRP (Maximum Retail Price)

## Overview
The label now supports printing **MRP with strikethrough** and shows the **discount percentage** when MRP is higher than the sale price.

## Label Layout (40mm x 30mm)

### With MRP (Shows Discount)
```
┌─────────────────────────────────────────┐
│                                         │
│  Rice Premium 5kg                      │  ← Product Name
│                                         │
│  MRP: ~~৳450.00~~                      │  ← MRP with strikethrough
│  _____________                          │  ← Strikethrough line
│  Our Price:                            │
│  ৳350.00                    (-22%)     │  ← Sale price + discount%
│                                         │
│  ┌─────────────────────────┐            │
│  │  ▓▓▓▓ ▓▓ ▓▓▓ ▓▓▓▓▓▓▓  │            │  ← Barcode (Code128)
│  │  ▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓ ▓▓▓   │            │
│  └─────────────────────────┘            │
│                                         │
│  SKU001                                 │  ← Barcode text
│                                         │
│                                 Qty: 1  │
└─────────────────────────────────────────┘
```

### Without MRP (Sale Price Only)
```
┌─────────────────────────────────────────┐
│                                         │
│  Rice Premium 5kg                      │
│                                         │
│  ৳350.00                               │  ← Sale price only
│                                         │
│  ┌─────────────────────────┐            │
│  │  ▓▓▓▓ ▓▓ ▓▓▓ ▓▓▓▓▓▓▓  │            │
│  └─────────────────────────┘            │
│                                         │
│  SKU001                                 │
│                                 Qty: 1  │
└─────────────────────────────────────────┘
```

## TSPL Command Details

### MRP with Strikethrough
```tspl
; Print MRP text
TEXT 10,35,"TSS24.BF2",0,1,1,"MRP: ৳450.00"

; Draw strikethrough line (BAR x,y,width,height)
BAR 10,43,130,2

; Print "Our Price" label
TEXT 10,60,"TSS24.BF2",0,1,1,"Our Price:"

; Print sale price (large)
TEXT 10,80,"TSS24.BF2",0,2,2,"৳350.00"

; Print discount percentage
TEXT 140,85,"TSS24.BF2",0,1,1,"(-22%)"
```

### How Strikethrough Works
Since TSPL doesn't have a "strikethrough font" style, it creates the effect by:
1. Printing the MRP text normally
2. Drawing a horizontal black line (BAR) through it
3. Positioning the line at Y+8 (center of text height)

## Using MRP in CSV Import

### CSV Format with MRP
```csv
barcode,name,mrp,price,copies
SKU001,Rice Premium 5kg,450.00,350.00,10
SKU002,Cooking Oil 1L,220.00,180.00,5
SKU003,Sugar 2kg,150.00,120.00,8
```

### Column Names Accepted
- **MRP:** `mrp`, `max_retail_price`, `maximum_retail_price`, `list_price`, `original_price`, `old_price`
- **Price:** `price`, `sale_price`, `retail_price`, `cost`, `unit_price`, `our_price`

## Discount Calculation

The discount percentage is automatically calculated:

```
Discount % = ((MRP - Sale Price) / MRP) × 100
```

**Example:**
- MRP: ৳450.00
- Sale Price: ৳350.00
- Discount: ((450 - 350) / 450) × 100 = **22%**

## Scenarios

### Scenario 1: MRP > Price (Shows Discount)
```csv
barcode,name,mrp,price
SKU001,Product,100.00,80.00
```
**Label shows:**
- ~~MRP: ৳100.00~~
- Our Price:
- ৳80.00 (-20%)

### Scenario 2: MRP = Price (No Discount)
```csv
barcode,name,mrp,price
SKU001,Product,100.00,100.00
```
**Label shows:**
- ~~MRP: ৳100.00~~
- ৳100.00 (no discount % shown)

### Scenario 3: No MRP (Price Only)
```csv
barcode,name,price
SKU001,Product,100.00
```
**Label shows:**
- ৳100.00 (large, prominent)

### Scenario 4: Price > MRP (Error/Warning)
```
Sale price higher than MRP
Discount % not shown (would be negative)
```

## Code Usage

### Print with MRP
```dart
await printerService.printLabel(
  barcode: 'SKU001',
  productName: 'Rice Premium 5kg',
  price: 350.00,      // Sale price
  mrp: 450.00,        // MRP (shown with strikethrough)
  copies: 1,
);
```

### Print without MRP
```dart
await printerService.printLabel(
  barcode: 'SKU001',
  productName: 'Rice Premium 5kg',
  price: 350.00,      // Only sale price shown
  copies: 1,
);
```

## Benefits

✅ **Customer Trust:** Shows transparency with MRP comparison  
✅ **Discount Highlight:** Customers see savings at a glance  
✅ **Regulatory Compliance:** MRP display required in many regions  
✅ **Professional Look:** Clean strikethrough design  

## Printing Tips

1. **Always use MRP** if you have it - builds customer trust
2. **Ensure MRP accuracy** - wrong MRP can confuse customers
3. **Check discount calculation** - automatically shown if MRP > price
4. **Test print first** - verify layout looks good
5. **Use consistent pricing** - MRP should be same across all labels

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| MRP not showing | MRP not provided or 0 | Check CSV has mrp column with value |
| Discount not showing | MRP ≤ sale price | Ensure MRP is higher than sale price |
| Strikethrough too thick | Printer density setting | Adjust density in TSPL commands |
| Text overlapping | Product name too long | Names truncated to 20 characters |

## Files Modified

- `lib/core/services/printer/label_printer_service.dart` - Added MRP support
- `lib/core/services/csv_import_service.dart` - Added MRP column parsing
- `BULK_PRINT_CSV_FORMAT.md` - Updated documentation
