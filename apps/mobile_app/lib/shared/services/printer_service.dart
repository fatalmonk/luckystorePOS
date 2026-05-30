/// Consolidated Printer Service for Lucky Store POS
///
/// This file unifies three previous printer implementations:
/// - `services/printer.dart` (ThermalPrinterService - Bluetooth ESC/POS)
/// - `services/receipt_printer_service.dart` (ReceiptPrinterService - PDF via printing package)
/// - `services/label_printer_service.dart` (LabelPrinterService - BLE label printing)
/// - `core/services/printer/printer_service.dart` (PrinterService - unified with retry queue)
///
/// The core/services/printer/ implementation is the canonical version.
/// This file re-exports it for convenience and adds the PDF receipt
/// and label printing capabilities.
library;

// Re-export the canonical printer service and its models
export '../../core/services/printer/printer_service.dart';
export '../../core/services/printer/printer_models.dart';
export '../../core/services/printer/printer_config.dart';

import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import '../../models/pos_models.dart';
import '../../core/services/printer/mht_p29l_template.dart';
export '../../core/services/printer/mht_p29l_template.dart';

/// Legacy wrapper for backward compatibility.
/// Provides [printEscPosReceipt] and [printPdfReceipt] methods
/// that delegate to the canonical services.
class ReceiptPrinterService {
  static final ReceiptPrinterService _instance = ReceiptPrinterService._internal();
  factory ReceiptPrinterService() => _instance;
  ReceiptPrinterService._internal();

  /// Print ESC/POS receipt via Bluetooth/network printer.
  /// Currently delegates to PDF printing as the thermal printer path
  /// requires a connected [PrinterService].
  Future<void> printEscPosReceipt(SaleResult sale) async {
    // For now, fall back to PDF printing on all platforms.
    // TODO: Integrate with PrinterService when a printer is connected.
    return printPdfReceipt(sale);
  }

  /// Generate and print/share a PDF receipt using the 'printing' package.
  Future<void> printPdfReceipt(SaleResult sale, {String storeName = 'Lucky Store'}) async {
    final pdf = pw.Document();
    final pricingByItemId = <String, PricingResult>{
      for (final line in sale.pricingResults) line.itemId: line,
    };

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        build: (pw.Context context) {
          return pw.Padding(
            padding: const pw.EdgeInsets.all(10),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              children: [
                pw.Text(
                  storeName.toUpperCase(),
                  style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
                  textAlign: pw.TextAlign.center,
                ),
                pw.Text('Your Neighborhood Store', style: const pw.TextStyle(fontSize: 10)),
                pw.SizedBox(height: 10),
                pw.Text('Receipt: ${sale.saleNumber}', style: const pw.TextStyle(fontSize: 10)),
                pw.Text('Date: ${DateFormat('dd MMM yyyy HH:mm').format(DateTime.now())}', style: const pw.TextStyle(fontSize: 10)),
                pw.Divider(borderStyle: pw.BorderStyle.dashed),
                pw.SizedBox(height: 5),
                // Items
                if (sale.items != null)
                  ...sale.items!.map((item) => pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(vertical: 2),
                    child: pw.Row(
                      children: [
                        pw.Expanded(
                          child: pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.start,
                            children: [
                              pw.Text(item.item.name, style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                              pw.Text(
                                '${item.qty} x Tk ${(pricingByItemId[item.item.id]?.sellingPrice ?? item.item.price).toStringAsFixed(2)}',
                                style: const pw.TextStyle(fontSize: 8),
                              ),
                              if (pricingByItemId[item.item.id] != null)
                                pw.Text(
                                  'MRP Tk ${pricingByItemId[item.item.id]!.mrp.toStringAsFixed(2)}  Save Tk ${pricingByItemId[item.item.id]!.totalSavings.toStringAsFixed(2)}',
                                  style: const pw.TextStyle(fontSize: 8),
                                ),
                            ],
                          ),
                        ),
                        pw.Text('Tk ${item.lineTotal.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 10)),
                      ],
                    ),
                  )),
                pw.SizedBox(height: 5),
                pw.Divider(borderStyle: pw.BorderStyle.dashed),
                pw.SizedBox(height: 5),
                // Totals
                _pdfRow('Subtotal', 'Tk ${sale.subtotal.toStringAsFixed(2)}'),
                if (sale.totalSavings > 0)
                  _pdfRow('MRP Savings', '- Tk ${sale.totalSavings.toStringAsFixed(2)}'),
                if (sale.discount > 0)
                  _pdfRow('Discount', '- Tk ${sale.discount.toStringAsFixed(2)}'),
                pw.Divider(borderStyle: pw.BorderStyle.dashed),
                _pdfRow('TOTAL', 'Tk ${sale.totalAmount.toStringAsFixed(2)}', isBold: true),
                pw.SizedBox(height: 5),
                _pdfRow('Tendered', 'Tk ${sale.tendered.toStringAsFixed(2)}'),
                if (sale.changeDue > 0)
                  _pdfRow('Change Due', 'Tk ${sale.changeDue.toStringAsFixed(2)}'),
                pw.SizedBox(height: 10),
                pw.Divider(borderStyle: pw.BorderStyle.dashed),
                pw.SizedBox(height: 10),
                pw.Text('Thank you for shopping at Lucky Store!',
                    textAlign: pw.TextAlign.center,
                    style: const pw.TextStyle(fontSize: 10)),
              ],
            ),
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Receipt_${sale.saleNumber}',
    );
  }

  pw.Widget _pdfRow(String label, String value, {bool isBold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: pw.TextStyle(fontSize: isBold ? 12 : 10, fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal)),
          pw.Text(value, style: pw.TextStyle(fontSize: isBold ? 12 : 10, fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal)),
        ],
      ),
    );
  }
}

/// Label Printer Service - prints barcode labels to ESC/POS compatible printers
/// Now supports MHT-P29L 58mm label printer with ESC/POS commands
/// Features: Code128 barcode, store name, product name, price with MRP strikethrough
class LabelPrinterService {
  static final LabelPrinterService instance = LabelPrinterService._internal();
  LabelPrinterService._internal();

  // Bluetooth connection state
  BluetoothDevice? _connectedDevice;
  BluetoothCharacteristic? _writeCharacteristic;
  
  // ESC/POS service UUIDs (standard thermal printer BLE)
  static const String _serviceUuid = '0000ff00-0000-1000-8000-00805f9b34fb';
  static const String _writeCharacteristicUuid = '0000ff02-0000-1000-8000-00805f9b34fb';

  bool get isConnected => _connectedDevice != null;
  
  /// Default label configuration for MHT-P29L 58mm
  final MhtP29lLabelConfig _defaultLabelConfig = const MhtP29lLabelConfig(
    widthMm: 58,
    heightMm: 30,
    storeName: 'Lucky Store',
    density: 8,
    speed: 4,
    copies: 1,
  );

  /// Scans for and connects to a printer by name
  /// 
  /// [targetDeviceName] - The printer name to connect to (default: 'M102', 'MHT-P29L')
  /// Returns true if connection was successful
  Future<bool> connect({String targetDeviceName = 'MHT-P29L'}) async {
    if (kIsWeb) {
      debugPrint('[LabelPrinterService] Bluetooth scanning not supported on Web.');
      return false;
    }

    try {
      // Start Bluetooth scanning
      await FlutterBluePlus.startScan(
        timeout: const Duration(seconds: 10),
      );

      debugPrint('[LabelPrinterService] Scanning for printer: $targetDeviceName');

      // Listen for scan results
      await for (final results in FlutterBluePlus.scanResults) {
        for (final result in results) {
          final device = result.device;
          final deviceName = device.platformName;
          
          // Match by name (case insensitive partial match)
          if (deviceName.toLowerCase().contains(targetDeviceName.toLowerCase()) ||
              deviceName.toLowerCase().contains('m102') ||
              deviceName.toLowerCase().contains('p29l')) {
            
            debugPrint('[LabelPrinterService] Found printer: $deviceName');
            
            // Stop scanning
            await FlutterBluePlus.stopScan();
            
            // Connect to the device
            await device.connect(autoConnect: false);
            _connectedDevice = device;
            
            // Discover services
            final services = await device.discoverServices();
            
            // Find the write characteristic
            for (final service in services) {
              if (service.uuid.toString().toLowerCase() == _serviceUuid) {
                for (final char in service.characteristics) {
                  if (char.uuid.toString().toLowerCase() == _writeCharacteristicUuid) {
                    _writeCharacteristic = char;
                    debugPrint('[LabelPrinterService] Connected to $deviceName');
                    return true;
                  }
                }
              }
            }
            
            // Fallback: look for any writable characteristic
            for (final service in services) {
              for (final char in service.characteristics) {
                if (char.properties.write) {
                  _writeCharacteristic = char;
                  debugPrint('[LabelPrinterService] Connected to $deviceName (fallback characteristic)');
                  return true;
                }
              }
            }
          }
        }
      }

      await FlutterBluePlus.stopScan();
      debugPrint('[LabelPrinterService] Printer not found: $targetDeviceName');
      return false;
    } catch (e) {
      debugPrint('[LabelPrinterService] Connection error: $e');
      return false;
    }
  }

  /// Disconnects the printer
  Future<void> disconnect() async {
    try {
      if (_connectedDevice != null) {
        await _connectedDevice!.disconnect();
      }
    } catch (e) {
      debugPrint('[LabelPrinterService] Disconnect error: $e');
    } finally {
      _connectedDevice = null;
      _writeCharacteristic = null;
    }
  }

  /// Print a single label using MHT-P29L ESC/POS template
  /// 
  /// [data] - The label data to print
  /// [config] - Optional custom label configuration (uses default if null)
  Future<void> printLabel(MhtP29lLabelData data, {MhtP29lLabelConfig? config}) async {
    if (kIsWeb) {
      debugPrint('[LabelPrinterService] Web printing not supported');
      throw Exception('Bluetooth label printing not supported on Web');
    }

    if (_connectedDevice == null || _writeCharacteristic == null) {
      throw Exception('Printer not connected. Call connect() first.');
    }

    final labelConfig = config ?? _defaultLabelConfig;
    final template = MhtP29lLabelTemplate(config: labelConfig);
    final commands = template.generateLabelCommands(data);

    await _sendBytes(commands);
  }

  /// Print multiple copies of a label for a PosItem
  /// 
  /// [item] - The POS item to print labels for
  /// [copies] - Number of copies to print
  /// [heightMm] - Optional label height override (30 or 40)
  Future<void> printLabels(PosItem item, int copies, {int heightMm = 30}) async {
    if (kIsWeb) {
      debugPrint('[LabelPrinterService] Printing labels: ${item.name} x $copies');
      return;
    }

    if (_connectedDevice == null || _writeCharacteristic == null) {
      throw Exception('Printer not connected. Call connect() first.');
    }

    // Create label configuration
    final config = _defaultLabelConfig.copyWith(
      heightMm: heightMm,
      copies: copies,
    );

    // Create label data from PosItem
    final labelData = MhtP29lLabelData(
      productName: item.name,
      barcode: item.barcode ?? item.sku,
      price: item.price,
      mrp: item.mrp,
      quantity: copies,
      sku: item.sku,
    );

    // Generate commands for multiple copies
    final template = MhtP29lLabelTemplate(config: config);
    final commands = template.generateMultiCopyCommands(labelData, copies: copies);

    await _sendBytes(commands);
  }

  /// Print a test label
  Future<void> printTestLabel() async {
    if (_connectedDevice == null || _writeCharacteristic == null) {
      throw Exception('Printer not connected. Call connect() first.');
    }

    final template = MhtP29lLabelTemplate(config: _defaultLabelConfig);
    final commands = template.generateTestLabel();

    await _sendBytes(commands);
  }

  /// Send bytes to the printer in chunks (BLE has MTU limits)
  Future<void> _sendBytes(Uint8List bytes) async {
    if (_writeCharacteristic == null) {
      throw Exception('Write characteristic not available');
    }

    // BLE typically has a 512 byte MTU limit
    const chunkSize = 512;
    
    for (var i = 0; i < bytes.length; i += chunkSize) {
      final end = (i + chunkSize < bytes.length) ? i + chunkSize : bytes.length;
      final chunk = bytes.sublist(i, end);
      
      await _writeCharacteristic!.write(
        chunk,
        withoutResponse: (i + chunkSize < bytes.length), // Use without response for all but last chunk
      );
      
      // Small delay between chunks to prevent buffer overflow
      if (i + chunkSize < bytes.length) {
        await Future.delayed(const Duration(milliseconds: 50));
      }
    }
  }
}
