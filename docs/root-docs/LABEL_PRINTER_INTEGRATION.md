# MHT-P29L Label Printer Integration Summary

## Overview
Label printing functionality has been integrated into the Lucky Store mobile app. Users can now print product labels directly from product cards and product detail screens.

## Files Created

### 1. Core Service
- **`lib/core/services/printer/label_printer_service.dart`**
  - Bluetooth LE printer discovery and connection
  - TSPL command generation for MHT-P29L
  - Label printing with barcode, product name, and price
  - Event-based status updates

### 2. UI Screen
- **`lib/features/inventory/label_printer_screen.dart`**
  - Full-screen printer management
  - Bluetooth device scanning
  - Label preview and printing
  - Print settings (copies, etc.)

### 3. Reusable Widget
- **`lib/shared/widgets/print_label_button.dart`**
  - Reusable print button with multiple styles
  - Easy integration into any screen

### 4. Documentation
- **`MHT-P29L_SETUP.md`** - Complete setup and troubleshooting guide

## Files Modified

### 1. Product Details Screen
**File:** `lib/features/pos/presentation/screens/product_details_screen.dart`

**Changes:**
- Added "Print Label" button above "Add to Cart" button
- Pre-fills barcode, product name, and price
- Uses secondary accent color to distinguish from primary action

### 2. Product Card
**File:** `lib/shared/widgets/product_card.dart`

**Changes:**
- Added print icon button in top-right corner
- Quick access to print labels from product grid/list
- Maintains existing wishlist functionality

### 3. Printer Models
**File:** `lib/core/services/printer/printer_models.dart`

**Changes:**
- Added `scanning` and `scanComplete` event types

## How to Use

### From Product Card (Grid/List View)
1. Browse products
2. Tap the **print icon** (🖨️) in the top-right corner of any product card
3. The Label Printer screen opens with product details pre-filled
4. Tap **"Print Label"** to send to connected MHT-P29L

### From Product Detail Screen
1. Tap any product to view details
2. Tap **"Print Label"** button at the bottom of the screen
3. The Label Printer screen opens with product details pre-filled
4. Tap **"Print Label"** to send to connected MHT-P29L

### Direct Code Usage
```dart
// Navigate to label printer with pre-filled data
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => LabelPrinterScreen(
      barcode: 'SKU123456',
      productName: 'Product Name',
      price: 99.99,
    ),
  ),
);

// Or use the reusable button
PrintLabelButton(
  barcode: product.sku,
  productName: product.name,
  price: product.price,
  style: PrintLabelButtonStyle.elevated,
)
```

## Label Format

Default label size: **40mm x 30mm**

```
[Product Name]          [truncated if > 20 chars]
৳99.99                  [price with currency]
[BARCODE: 123456789]    [Code128 barcode]
[Text: 123456789]       [barcode text]
Qty: 1                  [quantity]
```

## Required Permissions

### Android (android/app/src/main/AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### iOS (ios/Runner/Info.plist)
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app needs Bluetooth to connect to label printers</string>
```

## Dependencies

Already included in `pubspec.yaml`:
- `flutter_blue_plus: ^1.31.0` - Bluetooth LE communication

## Testing

### Test Print
1. Turn on MHT-P29L printer
2. Put in pairing mode (hold power until blue light flashes)
3. In app: Inventory → Print Label
4. Tap "Scan for Printers"
5. Select MHT-P29L and Connect
6. Tap "Test Print" to verify connection

### Troubleshooting

**Printer Not Found:**
- Ensure Bluetooth is enabled on device
- Check printer is in pairing mode
- Move closer to printer

**Connection Failed:**
- Printer may be connected to another device
- Restart printer and try again
- Check permissions are granted

**Print Quality Issues:**
- Clean print head with alcohol wipes
- Adjust density in TSPL commands (in `label_printer_service.dart`)
- Verify label roll is loaded correctly

## Next Steps / Enhancements

- [ ] Add bulk print option for multiple products
- [ ] Add label template customization (size, layout)
- [ ] Save printer preferences per user
- [ ] Add print queue for offline printing
- [ ] Support additional printer models

## Support

See `MHT-P29L_SETUP.md` for detailed setup instructions and TSPL command reference.
