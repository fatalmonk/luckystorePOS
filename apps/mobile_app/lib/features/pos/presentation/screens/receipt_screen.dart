import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../models/pos_models.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_button_styles.dart';
import '../../../../core/theme/app_radius.dart';
// import '../../../../shared/services/printer_service.dart'; // TODO: Re-enable when printer is available

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
        backgroundColor: AppColors.surfaceDefault,
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                children: [
                  // Success header
                  Container(
                    width: double.infinity,
                    padding: AppSpacing.insetLg,
                    color: AppColors.surfaceRaised,
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
                        const SizedBox(height: AppSpacing.space3),
                        const Text('Sale Complete!',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.w700)),
                        const SizedBox(height: AppSpacing.space1),
                        Text(saleResult.saleNumber,
                            style: const TextStyle(
                                color: AppColors.primaryDefault,
                                fontSize: 13,
                                letterSpacing: 1)),
                      ],
                    ),
                  ),

                  // Receipt body
                  Expanded(
                    child: SingleChildScrollView(
                      padding: AppSpacing.insetLg,
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
    final pricingByItemId = <String, PricingResult>{
      for (final line in saleResult.pricingResults) line.itemId: line,
    };
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
                        Text('${item.qty} × ৳ ${(pricingByItemId[item.item.id]?.sellingPrice ?? item.item.price).toStringAsFixed(0)}',
                            style: const TextStyle(color: Colors.white38, fontSize: 11)),
                        if (pricingByItemId[item.item.id] != null)
                          Text(
                            'MRP ৳ ${pricingByItemId[item.item.id]!.mrp.toStringAsFixed(2)}  •  Save ৳ ${pricingByItemId[item.item.id]!.totalSavings.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: Color(0xFF2ECC71),
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
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
          if (saleResult.totalSavings > 0)
            _receiptRow('MRP Savings',
                '- ৳ ${saleResult.totalSavings.toStringAsFixed(2)}',
                valueColor: const Color(0xFF2ECC71)),
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
      padding: AppSpacing.insetLg,
      decoration: BoxDecoration(
        color: AppColors.surfaceRaised,
        border: Border(top: BorderSide(color: AppColors.borderDefault)),
      ),
      child: Column(
        children: [
          // Print buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {}, // BT skipped
                  icon: const Icon(Icons.print_rounded, size: 18),
                  label: const Text('Print BT'),
                  style: AppButtonStyles.primary,
                ),
              ),
              const SizedBox(width: AppSpacing.space3),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {}, // PDF skipped
                  icon: const Icon(Icons.picture_as_pdf_rounded, size: 18),
                  label: const Text('PDF / Share'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textPrimary,
                    side: BorderSide(color: AppColors.borderDefault),
                    padding: AppSpacing.insetSquishMd,
                    shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.space3),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
                  icon: const Icon(Icons.add_shopping_cart_rounded, size: 18),
                  label: const Text('New Sale'),
                  style: AppButtonStyles.secondary,
                ),
              ),
              const SizedBox(width: AppSpacing.space3),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
                  icon: const Icon(Icons.check_rounded, size: 18),
                  label: const Text('Done'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textSecondary,
                    side: BorderSide(color: AppColors.borderDefault),
                    padding: AppSpacing.insetSquishMd,
                    shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
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
