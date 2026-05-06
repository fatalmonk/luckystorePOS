import 'dart:async';
import 'dart:typed_data';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../../utils/result.dart';
import '../../utils/app_utils.dart';
import 'printer_models.dart';

/// TSPL Label Printer Service for MHT-P29L and similar TSC-compatible printers
/// Uses Bluetooth Low Energy (BLE) to connect and print labels
class LabelPrinterService {
  static const String _serviceUuid = "0000ff00-0000-1000-8000-00805f9b34fb";
  static const String _writeCharacteristicUuid = "0000ff02-0000-1000-8000-00805f9b34fb";
  static const String _notifyCharacteristicUuid = "0000ff01-0000-1000-8000-00805f9b34fb";

  BluetoothDevice? _connectedDevice;
  BluetoothCharacteristic? _writeCharacteristic;
  StreamSubscription<BluetoothConnectionState>? _connectionSubscription;
  final StreamController<PrinterEvent> _eventController;

  bool _isConnecting = false;
  bool _isScanning = false;
  String? _lastConnectedDeviceId;

  LabelPrinterService() : _eventController = StreamController<PrinterEvent>.broadcast();

  Stream<PrinterEvent> get eventStream => _eventController.stream;
  bool get isConnecting => _isConnecting;
  bool get isScanning => _isScanning;
  bool get isConnected => _connectedDevice != null;
  String? get connectedDeviceId => _connectedDevice?.remoteId.str;
  String? get connectedDeviceName => _connectedDevice?.platformName;

  /// Scan for available Bluetooth label printers
  Stream<List<ScanResult>> scanForPrinters({Duration timeout = const Duration(seconds: 10)}) {
    _isScanning = true;
    _broadcastEvent(PrinterEvent(
      type: PrinterEventType.scanning,
      message: 'Scanning for printers...',
    ));

    // Start scanning
    FlutterBluePlus.startScan(
      timeout: timeout,
      withServices: [], // Scan all devices
    );

    return FlutterBluePlus.scanResults;
  }

  /// Stop scanning
  Future<void> stopScan() async {
    await FlutterBluePlus.stopScan();
    _isScanning = false;
    _broadcastEvent(PrinterEvent(
      type: PrinterEventType.scanComplete,
      message: 'Scan complete',
    ));
  }

  /// Connect to a specific printer by device ID
  Future<Result<String>> connect({
    required String deviceId,
    String? deviceName,
    Duration timeout = const Duration(seconds: 15),
  }) async {
    if (_isConnecting) {
      return Failure<String>('Connection already in progress');
    }

    if (_connectedDevice != null) {
      await disconnect();
    }

    try {
      _isConnecting = true;
      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.connecting,
        printerId: deviceId,
        message: 'Connecting to ${deviceName ?? deviceId}...',
      ));

      // Find the device
      final device = BluetoothDevice.fromId(deviceId);
      _connectedDevice = device;

      // Listen for connection state changes
      _connectionSubscription = device.connectionState.listen((state) {
        _handleConnectionStateChange(deviceId, state);
      });

      // Connect with auto-connect enabled
      await device.connect(
        autoConnect: false,
        mtu: null,
      ).timeout(timeout);

      // Discover services
      final services = await device.discoverServices();

      // Find the printer service and characteristics
      bool foundService = false;
      for (var service in services) {
        if (service.uuid.toString().toLowerCase() == _serviceUuid) {
          for (var characteristic in service.characteristics) {
            final uuid = characteristic.uuid.toString().toLowerCase();
            if (uuid == _writeCharacteristicUuid) {
              _writeCharacteristic = characteristic;
              foundService = true;
            }
          }
        }
      }

      if (!foundService || _writeCharacteristic == null) {
        // Try generic approach - look for any writable characteristic
        for (var service in services) {
          for (var characteristic in service.characteristics) {
            if (characteristic.properties.write) {
              _writeCharacteristic = characteristic;
              foundService = true;
              break;
            }
          }
          if (foundService) break;
        }
      }

      if (!foundService || _writeCharacteristic == null) {
        throw PrinterConnectionException('Printer service not found');
      }

      _lastConnectedDeviceId = deviceId;

      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.connected,
        printerId: deviceId,
        message: 'Connected to ${deviceName ?? deviceId}',
      ));

      return Success<String>(deviceId);
    } catch (e, stackTrace) {
      Logger.error('LabelPrinterService.connect failed', e, stackTrace);
      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.connectionFailed,
        printerId: deviceId,
        error: e.toString(),
        message: 'Connection failed: ${e.toString()}',
      ));
      await _cleanupConnection();
      return Failure<String>('Connection failed: $e');
    } finally {
      _isConnecting = false;
    }
  }

  /// Auto-connect to the last connected printer
  Future<Result<String>> reconnectToLast({Duration timeout = const Duration(seconds: 15)}) async {
    if (_lastConnectedDeviceId == null) {
      return Failure<String>('No previous connection found');
    }
    return connect(deviceId: _lastConnectedDeviceId!, timeout: timeout);
  }

  /// Disconnect from printer
  Future<Result<void>> disconnect() async {
    try {
      if (_connectedDevice == null) {
        return Failure<void>('No printer connected');
      }

      await _cleanupConnection();

      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.disconnected,
        printerId: _lastConnectedDeviceId,
        message: 'Printer disconnected',
      ));

      return Success<void>(null);
    } catch (e) {
      return Failure<void>('Disconnect failed: $e');
    }
  }

  /// Print a label using TSPL commands
  Future<Result<void>> printLabel({
    required String barcode,
    String? productName,
    double? price,
    double? mrp,          // MRP (Maximum Retail Price) - shown with strikethrough
    int quantity = 1,
    int copies = 1,
    int labelWidth = 40,  // mm
    int labelHeight = 30, // mm
    int speed = 4,        // 1-5
    int density = 8,      // 1-15
  }) async {
    if (_connectedDevice == null || _writeCharacteristic == null) {
      return Failure<void>('Printer not connected');
    }

    try {
      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.printing,
        printerId: _connectedDevice!.remoteId.str,
        message: 'Printing label...',
      ));

      // Build TSPL commands
      final tsplCommands = _buildTSPLCommands(
        barcode: barcode,
        productName: productName,
        price: price,
        quantity: quantity,
        copies: copies,
        labelWidth: labelWidth,
        labelHeight: labelHeight,
        speed: speed,
        density: density,
      );

      // Convert to bytes and send
      final bytes = Uint8List.fromList(tsplCommands.codeUnits);

      // Send in chunks if needed (BLE has MTU limit)
      const chunkSize = 512;
      for (var i = 0; i < bytes.length; i += chunkSize) {
        final end = (i + chunkSize < bytes.length) ? i + chunkSize : bytes.length;
        final chunk = bytes.sublist(i, end);
        await _writeCharacteristic!.write(chunk, withoutResponse: false);
      }

      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.printed,
        printerId: _connectedDevice!.remoteId.str,
        message: 'Label printed successfully',
      ));

      return Success<void>(null);
    } catch (e, stackTrace) {
      Logger.error('LabelPrinterService.printLabel failed', e, stackTrace);
      _broadcastEvent(PrinterEvent(
        type: PrinterEventType.printFailed,
        printerId: _connectedDevice!.remoteId.str,
        error: e.toString(),
        message: 'Print failed: ${e.toString()}',
      ));
      return Failure<void>('Print failed: $e');
    }
  }

  /// Print a barcode label (simplified)
  Future<Result<void>> printBarcodeLabel({
    required String barcode,
    String? text,
    int copies = 1,
  }) async {
    return printLabel(
      barcode: barcode,
      productName: text,
      copies: copies,
    );
  }

  /// Build TSPL command string
  String _buildTSPLCommands({
    required String barcode,
    String? productName,
    double? price,
    double? mrp,
    int quantity = 1,
    int copies = 1,
    int labelWidth = 40,
    int labelHeight = 30,
    int speed = 4,
    int density = 8,
  }) {
    final buffer = StringBuffer();

    // TSPL Header - Set label size and clear buffer
    buffer.writeln('SIZE $labelWidth mm,$labelHeight mm');
    buffer.writeln('GAP 2 mm,0');
    buffer.writeln('DIRECTION 1');
    buffer.writeln('REFERENCE 0,0');
    buffer.writeln('OFFSET 0 mm');
    buffer.writeln('SET PEEL OFF');
    buffer.writeln('SET TEAR ON');
    buffer.writeln('SPEED $speed');
    buffer.writeln('DENSITY $density');
    buffer.writeln('CODEPAGE UTF-8');
    buffer.writeln('CLS'); // Clear image buffer

    // Calculate positions (dots - 203 DPI = 8 dots/mm)
    final widthDots = labelWidth * 8;
    final heightDots = labelHeight * 8;
    final centerX = widthDots ~/ 2;

    int currentY = 10; // Track Y position

    // Print product name (if provided)
    if (productName != null && productName.isNotEmpty) {
      final displayName = productName.length > 20
          ? '${productName.substring(0, 17)}...'
          : productName;
      buffer.writeln('TEXT 10,$currentY,"TSS24.BF2",0,1,1,"$displayName"');
      currentY += 30; // Move down 30 dots
    }

    // Print MRP with strikethrough (if provided)
    if (mrp != null && mrp > 0) {
      final mrpText = 'MRP: ৳${mrp.toStringAsFixed(2)}';
      final mrpWidth = mrpText.length * 12; // Approximate width in dots

      // Print MRP text
      buffer.writeln('TEXT 10,$currentY,"TSS24.BF2",0,1,1,"$mrpText"');

      // Draw strikethrough line
      // BAR x,y,width,height
      buffer.writeln('BAR 10,${currentY + 8},$mrpWidth,2');

      currentY += 25;
    }

    // Print sale price (if provided and different from MRP)
    if (price != null) {
      if (mrp != null && mrp > price) {
        // Show "Our Price" label above the price
        buffer.writeln('TEXT 10,$currentY,"TSS24.BF2",0,1,1,"Our Price:"');
        currentY += 20;
      }

      // Print price in large font
      buffer.writeln('TEXT 10,$currentY,"TSS24.BF2",0,2,2,"৳${price.toStringAsFixed(2)}"');

      // Calculate discount percentage if MRP is provided
      if (mrp != null && mrp > price) {
        final discount = ((mrp - price) / mrp * 100).round();
        final discountX = 140; // Position to the right of price
        buffer.writeln('TEXT $discountX,${currentY + 5},"TSS24.BF2",0,1,1,"(-$discount%)"');
      }

      currentY += 40;
    } else {
      currentY += 20;
    }

    // Print barcode (Code128)
    // Barcode position: below price section
    buffer.writeln('BARCODE 10,$currentY,"128",50,1,0,2,2,"$barcode"');

    // Print barcode text below barcode
    currentY += 60;
    buffer.writeln('TEXT 10,$currentY,"TSS24.BF2",0,1,1,"$barcode"');

    // Print quantity in top right corner
    buffer.writeln('TEXT ${widthDots - 60},10,"TSS24.BF2",0,1,1,"Qty: $quantity"');

    // Print copies
    buffer.writeln('PRINT $copies,1');

    // End of commands
    buffer.writeln('END');

    return buffer.toString();
  }

  /// Test print - print a test label
  Future<Result<void>> testPrint() async {
    return printLabel(
      barcode: 'TEST123456',
      productName: 'Test Product',
      price: 99.99,
      quantity: 1,
      copies: 1,
    );
  }

  /// Get printer status (if supported)
  Future<Result<Map<String, dynamic>>> getPrinterStatus() async {
    if (_connectedDevice == null) {
      return Failure<Map<String, dynamic>>('Printer not connected');
    }

    try {
      // Send status query command
      final statusCommand = 'STATUS\r\n';
      final bytes = Uint8List.fromList(statusCommand.codeUnits);
      await _writeCharacteristic!.write(bytes, withoutResponse: false);

      // Note: Reading response requires setting up notify characteristic
      // This is a simplified implementation

      return Success<Map<String, dynamic>>({
        'connected': true,
        'deviceId': _connectedDevice!.remoteId.str,
        'deviceName': _connectedDevice!.platformName,
      });
    } catch (e) {
      return Failure<Map<String, dynamic>>('Failed to get status: $e');
    }
  }

  /// Handle connection state changes
  void _handleConnectionStateChange(String deviceId, BluetoothConnectionState state) {
    switch (state) {
      case BluetoothConnectionState.connected:
        // Connection established
        break;
      case BluetoothConnectionState.disconnected:
        _broadcastEvent(PrinterEvent(
          type: PrinterEventType.disconnected,
          printerId: deviceId,
          message: 'Printer disconnected unexpectedly',
        ));
        _cleanupConnection();
        break;
      default:
        break;
    }
  }

  /// Cleanup connection resources
  Future<void> _cleanupConnection() async {
    await _connectionSubscription?.cancel();
    _connectionSubscription = null;

    try {
      await _connectedDevice?.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }

    _connectedDevice = null;
    _writeCharacteristic = null;
  }

  /// Broadcast event to listeners
  void _broadcastEvent(PrinterEvent event) {
    if (!_eventController.isClosed) {
      _eventController.add(event);
    }
  }

  /// Dispose resources
  void dispose() {
    _cleanupConnection();
    _eventController.close();
  }
}

/// Exception for printer connection errors
class PrinterConnectionException implements Exception {
  final String message;
  PrinterConnectionException(this.message);

  @override
  String toString() => 'PrinterConnectionException: $message';
}
