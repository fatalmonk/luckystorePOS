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

// Re-export the canonical printer service and its models
export '../../core/services/printer/printer_service.dart';
export '../../core/services/printer/printer_models.dart';
export '../../core/services/printer/printer_config.dart';

import 'package:flutter/foundation.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import '../../models/pos_models.dart';

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

/// Label Printer Service - prints barcode labels to TSPL-compatible printers
/// Currently disabled on web due to Bluetooth library incompatibility.
class LabelPrinterService {
  static final LabelPrinterService instance = LabelPrinterService._internal();
  LabelPrinterService._internal();

  /// Scans for and connects to a printer by name (default: "M102")
  Future<void> connect({String targetDeviceName = "M102"}) async {
    if (kIsWeb) {
      debugPrint('[LabelPrinterService] Bluetooth scanning not supported on Web.');
      return;
    }
    throw Exception('Bluetooth label printing is currently disabled due to library incompatibility on this platform.');
  }

  /// Disconnects the printer
  Future<void> disconnect() async {
    // Placeholder for Bluetooth disconnect
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
