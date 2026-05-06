# Bulk Label Printing Feature

## Overview
The Bulk Label Printing feature allows you to print labels for multiple products at once, saving time and streamlining inventory management.

## Files Created

### 1. Bulk Print Screen
**File:** `lib/features/inventory/presentation/screens/bulk_label_print_screen.dart`

Features:
- ✅ Select multiple products from a list
- ✅ Search/filter products by name or barcode
- ✅ Adjust copies per product
- ✅ "Select All" functionality
- ✅ Real-time print progress tracking
- ✅ Connection status indicator
- ✅ Summary of selected products and total labels

## How to Use

### Accessing Bulk Print

**From Home Page:**
1. Tap the **print icon** (🖨️) in the top-right of the home screen
2. The Bulk Label Print screen opens

**From Code:**
```dart
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => const BulkLabelPrintScreen(),
  ),
);

// Or with initial products
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => BulkLabelPrintScreen(
      initialProducts: [
        BulkPrintProduct(
          id: '1',
          barcode: 'SKU001',
          name: 'Product Name',
          price: 99.99,
        ),
      ],
    ),
  ),
);
```

### Printing Workflow

1. **Select Products:**
   - Check the box next to each product you want to print
   - Or tap "Select All" to select all visible products
   - Use the search bar to filter products

2. **Set Copies:**
   - Tap the +/- buttons next to each selected product
   - Or set the same number of copies for all selected products

3. **Connect Printer:**
   - If not connected, tap "Setup Printer" button
   - Scan and connect to your MHT-P29L printer

4. **Print:**
   - Tap "Print X Labels" button
   - Watch the progress indicator
   - Wait for completion confirmation

## Features

### Product Selection
- **Individual Selection:** Tap checkbox next to each product
- **Select All:** Tap "Select All" checkbox to select all visible products
- **Clear Selection:** Tap "Clear" to deselect all products

### Copy Management
- Adjust copies per product with +/- buttons
- Range: 1-99 copies per product
- Total label count automatically calculated

### Search & Filter
- Real-time search by product name
- Search by barcode/SKU
- Filters the visible product list

### Print Progress
- Shows current print count out of total
- Real-time status updates
- Error handling with retry option
- Completion confirmation dialog

### Printer Connection
- Shows connection status in app bar
- Quick access to printer setup
- Auto-reconnect on print start

## Integration with Existing Features

### From Product Card
- Single product print: Tap print icon on product card
- Opens `LabelPrinterScreen` with pre-filled data

### From Product Detail
- Single product print: Tap "Print Label" button
- Opens `LabelPrinterScreen` with pre-filled data

### Bulk Print (New)
- Access from home screen print icon
- Select multiple products
- Print all at once

## UI Components

### 1. Product List Item
```
┌─────────────────────────────────────────┐
│ [✓] Product Name                ৳99.99 │
│     Barcode: SKU001              [1] [+]│
└─────────────────────────────────────────┘
      ↑ Copies counter
```

### 2. Bottom Action Bar
```
┌─────────────────────────────────────────┐
│ Selected: 5 products                    │
│ Total labels: 12              [Setup ▼] │
│                                         │
│ [        Print 12 Labels        ]      │
└─────────────────────────────────────────┘
```

### 3. Status Bar
```
┌─────────────────────────────────────────┐
│ ℹ️ Printing 5 of 12 labels...    ⏳    │
└─────────────────────────────────────────┘
```

## Data Model

```dart
class BulkPrintProduct {
  final String id;
  final String barcode;
  final String name;
  final double price;
  int copies;      // Number of labels to print
  bool selected;   // Whether product is selected
}
```

## Customization

### Loading Products from Database

Replace the `_loadSampleProducts()` method in `BulkLabelPrintScreen`:

```dart
void _loadSampleProducts() async {
  // Load from your database/API
  final products = await yourDatabase.getAllProducts();
  
  setState(() {
    _allProducts = products.map((p) => BulkPrintProduct(
      id: p.id,
      barcode: p.barcode,
      name: p.name,
      price: p.price,
    )).toList();
    _filteredProducts = _allProducts;
  });
}
```

### Adjusting Print Delay

Modify the delay between prints in `_startBulkPrint()`:

```dart
// Small delay between prints to prevent printer buffer overflow
await Future.delayed(const Duration(milliseconds: 500));
```

Increase the delay if your printer struggles with rapid prints.

### Custom Label Format

The label format is defined in `label_printer_service.dart`:

```dart
String _buildTSPLCommands({
  required String barcode,
  String? productName,
  double? price,
  // ...
})
```

## Troubleshooting

### Products Not Loading
- Check that your database connection is working
- Verify product data format matches `BulkPrintProduct`

### Print Stops Mid-Process
- Check printer paper roll
- Ensure Bluetooth connection is stable
- Increase print delay between labels

### Printer Not Found
- Ensure printer is in pairing mode
- Check Bluetooth is enabled on device
- Verify MHT-P29L is powered on

### Slow Printing
- Reduce number of copies
- Increase print delay
- Check printer battery level

## Performance Tips

1. **Limit Concurrent Prints:** Print in batches of 20-50 labels
2. **Use Search:** Filter to specific products for faster selection
3. **Pre-connect Printer:** Connect printer before starting bulk print
4. **Monitor Battery:** Ensure printer has sufficient battery for large batches

## Future Enhancements

- [ ] Import products from CSV for bulk printing
- [ ] Save print templates
- [ ] Schedule bulk prints
- [ ] Print history log
- [ ] Export print queue
- [ ] Barcode scanning to add to print queue
- [ ] Category-based filtering
- [ ] Stock level indicators

## Support

For printer setup issues, see `MHT-P29L_SETUP.md`.
For integration questions, see `LABEL_PRINTER_INTEGRATION.md`.
