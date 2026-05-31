# MHT-P29L 58mm Label Printer Template

This implementation provides ESC/POS command generation for the MHT-P29L 58mm label printer, supporting 40x30mm and 40x40mm label sizes.

## Files Created/Modified

### New Files
1. **`lib/core/services/printer/mht_p29l_template.dart`**
   - `MhtP29lLabelTemplate`: Main ESC/POS command generator
   - `MhtP29lLabelConfig`: Label configuration (dimensions, store name, density, speed)
   - `MhtP29lLabelData`: Label content data (product name, barcode, price, MRP, etc.)
   - `BarcodeValidator`: Helper for Code128 barcode validation

### Modified Files
2. **`lib/shared/services/printer_service.dart`**
   - Updated `LabelPrinterService` to use MHT-P29L ESC/POS template
   - Added Bluetooth BLE connection management
   - Added `printTestLabel()`, `printLabel()`, `printLabels()` methods
   - Exports `MhtP29lTemplate` and related classes

3. **`lib/core/services/printer/printer_test_screen.dart`**
   - Added ESC/POS test buttons:
     - "30mm ESC/POS" - Print 58x30mm label
     - "40mm ESC/POS" - Print 58x40mm label
     - "ESC/POS Test" - Quick test label

## ESC/POS Commands Used

### Initialization
- `ESC @` - Initialize printer
- `ESC 3 n` - Set line spacing (24/180")
- `ESC a n` - Set alignment (0=left, 1=center, 2=right)

### Text Formatting
- `ESC E n` - Bold on/off (1/0)
- `ESC ! n` - Font selection (bits: 3=double height, 4=double width)
- `ESC 7 n` - Set print density (1-15)
- `GS ( K` - Set print speed

### Barcode (Code128)
- `GS H 2` - HRI below barcode
- `GS h 50` - Barcode height (50 dots)
- `GS w 3` - Barcode width (unit 3)
- `GS k 73 len data` - Print Code128 barcode

### Finalization
- `GS V 1` - Feed and partial cut
- `ESC J n` - Reverse feed for label alignment

## Usage Examples

### Print a Single Label

```dart
import 'package:lucky_store/shared/services/printer_service.dart';

// Connect to printer
final printer = LabelPrinterService.instance;
final connected = await printer.connect(targetDeviceName: 'MHT-P29L');

if (connected) {
  // Create label configuration
  const config = MhtP29lLabelConfig(
    widthMm: 58,
    heightMm: 30,
    storeName: 'Lucky Store',
    density: 8,
    speed: 4,
  );

  // Create label data
  final labelData = MhtP29lLabelData(
    productName: 'Sample Product',
    barcode: '123456789',
    price: 299.99,
    mrp: 399.99,
    quantity: 1,
  );

  // Print
  await printer.printLabel(labelData, config: config);
}
```

### Print from PosItem

```dart
await printer.printLabels(
  posItem,      // PosItem instance
  3,            // Number of copies
  heightMm: 30, // Label height (30 or 40)
);
```

### Print Test Label

```dart
await printer.printTestLabel();
```

## Label Layout

```
┌─────────────────────────────┐
│                             │
│       LUCKY STORE           │  <- Store name (bold, centered)
│                             │
│     Sample Product          │  <- Product name (centered)
│                             │
│     MRP: ৳399.99            │  <- MRP with strikethrough
│                             │
│      ৳299.99                │  <- Sale price (large, bold)
│     (-25% OFF)              │  <- Discount percentage
│                             │
│  ════════════════════════   │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│      │  <- Code128 barcode
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│      │
│  ════════════════════════   │
│       123456789             │  <- Barcode text (HRI)
│                             │
│                    Qty: 1   │  <- Quantity (right aligned)
│                             │
└─────────────────────────────┘
```

## Printer Specifications

- **Model**: MHT-P29L / M102
- **Print Width**: 58mm (384 dots @ 203 DPI)
- **Label Sizes**: 40x30mm, 40x40mm
- **Print Technology**: Direct thermal
- **Connection**: Bluetooth BLE
- **Command Set**: ESC/POS

## Testing

Use the PrinterTestScreen for testing:
1. Navigate to the printer test screen
2. Tap "Scan" to find your printer
3. Connect to "MHT-P29L" or "M102"
4. Use ESC/POS test buttons to print labels
5. Check logs for command details and errors

## Notes

- Code128 barcode supports ASCII 32-127 characters
- Text is auto-truncated if too long for label width
- BLE sends data in 512-byte chunks with delays between
- Density values above 10 produce darker prints but slower speed
