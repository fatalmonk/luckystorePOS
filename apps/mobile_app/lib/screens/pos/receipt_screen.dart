import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/pos_models.dart';
import '../../services/receipt_printer_service.dart';

/// Receipt screen shown after a successful sale.
/// Displays a clean receipt with all line items, totals, payment breakdown,
/// and action buttons: Print (ESC/POS), New Sale, and PDF.
class ReceiptScreen extends StatelessWidget {
  final SaleResult saleResult;

  const ReceiptScreen({super.key, required this.saleResult});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: const Color(0xFF0D1117),
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                children: [
                  // Success header
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    color: const Color(0xFF161B22),
                    child: Column(
                      children: [
                        Container(
                          width: 60,
                          height: 60,
                          decoration: const BoxDecoration(
                            color: Color(0xFF2ECC71),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.check_rounded,
                              color: Colors.white, size: 36),
                        ),
                        const SizedBox(height: 12),
                        const Text('Sale Complete!',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        Text(saleResult.saleNumber,
                            style: const TextStyle(
                                color: Color(0xFFE8B84B),
                                fontSize: 13,
                                letterSpacing: 1)),
                      ],
                    ),
                  ),

                  // Receipt body
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: _buildReceiptCard(),
                    ),
                  ),

                  // Action buttons
                  _buildActionBar(context),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildReceiptCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Store header
          const Center(
            child: Column(
              children: [
                Text('𝐋𝐔𝐂𝐊𝐘 𝐒𝐓𝐎𝐑𝐄',
                    style: TextStyle(
                        color: Color(0xFFE8B84B),
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 2)),
                SizedBox(height: 2),
                Text('Your Neighborhood Store',
                    style: TextStyle(color: Colors.white38, fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const _Dashes(),
          const SizedBox(height: 12),

          // Line Items
          if (saleResult.items != null && saleResult.items!.isNotEmpty) ...[
            ...saleResult.items!.map((item) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.item.name,
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
                        Text('${item.qty} × ৳ ${item.item.price.toStringAsFixed(0)}',
                            style: const TextStyle(color: Colors.white38, fontSize: 11)),
                      ],
                    ),
                  ),
                  Text('৳ ${item.lineTotal.toStringAsFixed(2)}',
                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                ],
              ),
            )),
            const SizedBox(height: 12),
            const _Dashes(),
            const SizedBox(height: 12),
          ],

          // Amount section
          _receiptRow('Subtotal',
              '৳ ${saleResult.subtotal.toStringAsFixed(2)}'),
          if (saleResult.discount > 0)
            _receiptRow('Discount',
                '- ৳ ${saleResult.discount.toStringAsFixed(2)}',
                valueColor: const Color(0xFF2ECC71)),
          const SizedBox(height: 8),
          const _Dashes(),
          const SizedBox(height: 8),
          _receiptRow('TOTAL',
              '৳ ${saleResult.totalAmount.toStringAsFixed(2)}',
              bold: true, valueSize: 18),
          const SizedBox(height: 12),
          const _Dashes(),
          const SizedBox(height: 12),

          _receiptRow('Tendered', '৳ ${saleResult.tendered.toStringAsFixed(2)}'),
          if (saleResult.changeDue > 0)
            _receiptRow('Change Due',
                '৳ ${saleResult.changeDue.toStringAsFixed(2)}',
                valueColor: const Color(0xFF2ECC71),
                bold: true,
                valueSize: 16),

          const SizedBox(height: 16),
          const _Dashes(),
          const SizedBox(height: 12),
          const Center(
            child: Text('Thank you for shopping at Lucky Store!',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white38, fontSize: 11)),
          ),
        ],
      ),
    );
  }

  Widget _receiptRow(String label, String value, {
    bool bold = false,
    double valueSize = 14,
    Color? valueColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  color: bold ? Colors.white : Colors.white60,
                  fontSize: bold ? 15 : 13,
                  fontWeight:
                      bold ? FontWeight.w700 : FontWeight.w400)),
          Text(value,
              style: TextStyle(
                  color: valueColor ?? (bold ? Colors.white : Colors.white),
                  fontSize: valueSize,
                  fontWeight:
                      bold ? FontWeight.w800 : FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildActionBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
      ),
      child: Column(
        children: [
          // Print buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () async {
                    try {
                      await ReceiptPrinterService().printEscPosReceipt(saleResult);
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: Text('Printer Error: $e'),
                          backgroundColor: Colors.red,
                        ));
                      }
                    }
                  },
                  icon: const Icon(Icons.print_rounded, color: Colors.black, size: 18),
                  label: const Text('Print BT',
                      style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.w700,
                          fontSize: 14)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE8B84B),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    try {
                      await ReceiptPrinterService().printPdfReceipt(saleResult);
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: Text('PDF Error: $e'),
                          backgroundColor: Colors.red,
                        ));
                      }
                    }
                  },
                  icon: const Icon(Icons.picture_as_pdf_rounded, color: Colors.white, size: 18),
                  label: const Text('PDF / Share',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 14)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF30363D)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              // New Sale — pop to PosMainScreen; cart was cleared by completeSale()
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () =>
                      Navigator.of(context).popUntil((r) => r.isFirst),
                  icon: const Icon(Icons.add_shopping_cart_rounded,
                      color: Colors.black, size: 18),
                  label: const Text('New Sale',
                      style: TextStyle(
                          color: Colors.black, fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2ECC71),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // Done
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () =>
                      Navigator.of(context).popUntil((r) => r.isFirst),
                  icon: const Icon(Icons.check_rounded,
                      color: Colors.white70, size: 18),
                  label: const Text('Done',
                      style: TextStyle(color: Colors.white70)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF30363D)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Dashed divider for receipt styling
class _Dashes extends StatelessWidget {
  const _Dashes();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(32, (index) => Expanded(
        child: Container(
          height: 1,
          color: index.isEven ? Colors.white12 : Colors.transparent,
        ),
      )),
    );
  }
}
