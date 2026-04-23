import 'package:flutter/foundation.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
// import 'package:flutter_thermal_printer/flutter_thermal_printer.dart';
// import 'package:flutter_thermal_printer/utils/printer.dart'; // Problematic on web
// import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart'; // Problematic on web
import 'package:intl/intl.dart';
import '../../models/pos_models.dart';

class ReceiptPrinterService {
  // final _thermalPrinter = FlutterThermalPrinter.instance;

  /// Generate and print/share a PDF receipt using the 'printing' package.
  Future<void> printPdfReceipt(SaleResult sale, {String storeName = 'Lucky Store'}) async {
    final pdf = pw.Document();
    
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
                              pw.Text('${item.qty} x Tk ${item.item.price.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 8)),
                            ],
                          ),
                        ),
                        pw.Text('Tk ${item.lineTotal.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 10)),
                      ],
                    ),
                  )),
                pw.SizedBox(height: 5),
                pw.Divider(borderStyle: pw.BorderStyle.dashed),
                pw.SizedBox(height: 5),
                // Totals
                _pdfRow('Subtotal', 'Tk ${sale.subtotal.toStringAsFixed(2)}'),
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

  /// Print to a Bluetooth ESC/POS Thermal Printer.
  Future<void> printEscPosReceipt(SaleResult sale, {String storeName = 'Lucky Store'}) async {
    if (kIsWeb) {
      debugPrint('[ReceiptPrinterService] Bluetooth printing not supported on Web. Defaulting to PDF.');
      return printPdfReceipt(sale, storeName: storeName);
    }

    try {
      throw Exception('Bluetooth printing is currently disabled due to library incompatibility on this platform. Please use PDF.');
    } catch (e) {
      throw Exception('Printer error: $e');
    }
  }
}
