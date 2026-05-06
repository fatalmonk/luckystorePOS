# MHT-P29L Label Printer Setup Guide

## Printer Specifications
- **Model**: MHT-P29L (or similar TSC-compatible label printers)
- **Connection**: Bluetooth Low Energy (BLE)
- **Language**: TSPL (TSC Printer Language)
- **Label Size**: 40mm x 30mm (default)
- **Resolution**: 203 DPI (8 dots/mm)

## Setup Steps

### 1. Pair the Printer

1. Turn on the MHT-P29L printer
2. Press and hold the power button until the Bluetooth light flashes
3. The printer is now in pairing mode

### 2. Connect from the App

Navigate to the Label Printer screen in your app:

```dart
// From any screen, navigate to:
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => LabelPrinterScreen(
      barcode: '123456789',      // Optional: pre-fill barcode
      productName: 'Product',    // Optional: pre-fill name
      price: 99.99,              // Optional: pre-fill price
    ),
  ),
);
```

**Or use the UI:**
1. Go to **Inventory** → **Products**
2. Select a product
3. Tap **"Print Label"** button

### 3. Scan and Connect

1. Tap **"Scan for Printers"**
2. Wait for the MHT-P29L to appear in the list
3. Tap **"Connect"** on the MHT-P29L
4. The status should show **"Connected"**

### 4. Print Labels

1. Enter or scan the **barcode**
2. Enter **product name** (optional)
3. Enter **price** (optional)
4. Set number of **copies**
5. Tap **"Print Label"**

## Troubleshooting

### Printer Not Found

- Make sure printer is turned on and in pairing mode (blue light flashing)
- Check if Bluetooth is enabled on your device
- Try moving closer to the printer
- Restart the printer and try again

### Connection Failed

- Ensure the printer is not already connected to another device
- Restart the printer
- Try disconnecting and reconnecting

### Print Quality Issues

- Check label roll is loaded correctly
- Clean the print head with alcohol wipes
- Adjust density in TSPL commands (higher = darker)

### TSPL Commands Reference

The printer uses these default settings:

```tspl
SIZE 40 mm,30 mm    # Label size
GAP 2 mm,0          # Gap between labels
DIRECTION 1         # Print direction
SPEED 4             # Print speed (1-5)
DENSITY 8           # Print density (1-15)
```

## Code Example

```dart
import 'core/services/printer/label_printer_service.dart';

final printerService = LabelPrinterService();

// Scan for printers
printerService.scanForPrinters().listen((results) {
  for (var result in results) {
    print('Found: ${result.device.platformName}');
  }
});

// Connect to printer
await printerService.connect(
  deviceId: 'XX:XX:XX:XX:XX:XX',
  deviceName: 'MHT-P29L',
);

// Print label
await printerService.printLabel(
  barcode: '123456789',
  productName: 'My Product',
  price: 99.99,
  copies: 2,
);
```

## Bluetooth Permissions

Ensure these permissions are in your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

And in `Info.plist` for iOS:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app needs Bluetooth to connect to label printers</string>
```

## Files Created

- `lib/core/services/printer/label_printer_service.dart` - Bluetooth printer service
- `lib/features/inventory/label_printer_screen.dart` - UI for printer connection and printing

## Dependencies Used

- `flutter_blue_plus: ^1.31.0` - Bluetooth LE communication
- Custom TSPL command builder for MHT-P29L compatibility
