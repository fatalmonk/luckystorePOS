import 'package:flutter/foundation.dart';
// import 'package:flutter_blue_plus/flutter_blue_plus.dart'; // Problematic on web
import '../models/pos_models.dart';

/// Service for printing barcode labels to TSPL-compatible printers (like Milestone M102)
/// via Bluetooth Low Energy (BLE) using flutter_blue_plus.
class LabelPrinterService {
  static final LabelPrinterService instance = LabelPrinterService._internal();
  LabelPrinterService._internal();

  // BluetoothDevice? _connectedDevice;
  // BluetoothCharacteristic? _writeCharacteristic;

  /// Scans for and connects to a printer by name (default: "M102")
  Future<void> connect({String targetDeviceName = "M102"}) async {
    if (kIsWeb) {
      debugPrint('[LabelPrinterService] Bluetooth scanning not supported on Web.');
      return;
    }
    
    // Logic disabled for web compilation
    throw Exception('Bluetooth label printing is currently disabled due to library incompatibility on this platform.');
  }

  /// Disconnects the printer
  Future<void> disconnect() async {
    // if (_connectedDevice != null) {
    //   await _connectedDevice!.disconnect();
    //   _connectedDevice = null;
    //   _writeCharacteristic = null;
    // }
  }

  /// Prints multiple labels sending raw TSPL commands
  Future<void> printLabels(PosItem item, int copies) async {
    if (kIsWeb) {
      debugPrint('[LabelPrinterService] Printing labels to console on Web: ${item.name} x $copies');
      return;
    }
    
    throw Exception('Bluetooth label printing is currently disabled due to library incompatibility on this platform.');
  }

}
