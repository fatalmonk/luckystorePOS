import 'package:flutter/material.dart';
import '../../../inventory/label_printer_screen.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_shadows.dart';
import '../../../../core/theme/app_button_styles.dart';

class ProductDetailsScreen extends StatelessWidget {
  final String sku;
  final String name;
  final double price;
  final double originalPrice;
  final String weight;
  final String imageUrl;

  const ProductDetailsScreen({
    super.key,
    required this.sku,
    required this.name,
    required this.price,
    required this.originalPrice,
    required this.weight,
    required this.imageUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Product Details'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero Imagery
            Hero(
              tag: 'hero-$sku',
              child: Container(
                height: 300,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  image: DecorationImage(
                    image: NetworkImage(imageUrl),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                      ),
                      Container(
                        padding: AppSpacing.insetSm,
                        decoration: BoxDecoration(
                          color: AppColors.surfaceDefault,
                          borderRadius: AppRadius.borderMd,
                          boxShadow: AppShadows.elevation1,
                          border: Border.all(color: AppColors.borderDefault),
                        ),
                        child: const Icon(Icons.favorite_border, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Trust Section (Reviews)
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber, size: 20),
                      const Icon(Icons.star, color: Colors.amber, size: 20),
                      const Icon(Icons.star, color: Colors.amber, size: 20),
                      const Icon(Icons.star, color: Colors.amber, size: 20),
                      const Icon(Icons.star_half, color: Colors.amber, size: 20),
                      const SizedBox(width: 8),
                      Text('4.8 (120 Reviews)', style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Financial Hierarchy
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '৳${price.toStringAsFixed(0)}',
                        style: AppTextStyles.headingXl.copyWith(color: AppColors.primaryDefault),
                      ),
                      const SizedBox(width: AppSpacing.space3),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text(
                          '৳${originalPrice.toStringAsFixed(0)}',
                          style: AppTextStyles.bodyMd.copyWith(color: AppColors.textMuted, decoration: TextDecoration.lineThrough),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.space2),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Container(
                          padding: AppSpacing.insetSquishSm,
                          decoration: BoxDecoration(
                            color: AppColors.dangerSubtle,
                            borderRadius: AppRadius.borderSm,
                          ),
                          child: Text(
                            '-${(((originalPrice - price) / originalPrice) * 100).toStringAsFixed(0)}%',
                            style: AppTextStyles.labelSm.copyWith(color: AppColors.dangerDefault),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Divider(color: AppColors.borderDefault),
                  const SizedBox(height: 16),

                  // Logistics & Delivery
                  Container(
                    padding: AppSpacing.insetMd,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceDefault,
                      borderRadius: AppRadius.borderMd,
                      boxShadow: AppShadows.elevation1,
                      border: Border.all(color: AppColors.borderDefault),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.local_shipping_outlined, color: AppColors.primaryDefault),
                        const SizedBox(width: AppSpacing.space4),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Standard Delivery', style: AppTextStyles.labelMd.copyWith(color: AppColors.textPrimary)),
                              const SizedBox(height: AppSpacing.space1),
                              Text('Arrives in 30-45 minutes based on nearest fulfillment center.', style: AppTextStyles.bodyXs.copyWith(color: AppColors.textSecondary)),
                            ],
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Accepted Payments
                  Container(
                    padding: AppSpacing.insetMd,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceDefault,
                      borderRadius: AppRadius.borderMd,
                      boxShadow: AppShadows.elevation1,
                      border: Border.all(color: AppColors.borderDefault),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildPaymentMethod('bKash', Icons.account_balance_wallet),
                        _buildPaymentMethod('Cards', Icons.credit_card),
                        _buildPaymentMethod('COD', Icons.money),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomSheet: Container(
        padding: AppSpacing.insetMd,
        decoration: BoxDecoration(
          color: AppColors.surfaceRaised,
          boxShadow: AppShadows.elevation2,
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Print Label Button
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => LabelPrinterScreen(
                        barcode: sku,
                        productName: name,
                        price: price,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.print, color: AppColors.primaryOn),
                label: Text(
                  'Print Label',
                  style: AppTextStyles.labelLg.copyWith(color: AppColors.primaryOn),
                ),
                style: AppButtonStyles.secondary,
              ),
              const SizedBox(height: 12),
              // Add to Cart Button
              ElevatedButton(
                onPressed: () {},
                style: AppButtonStyles.primary,
                child: Text(
                  'Add to Cart',
                  style: AppTextStyles.labelLg.copyWith(color: AppColors.primaryOn),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentMethod(String name, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: AppColors.textSecondary, size: 28),
        const SizedBox(height: AppSpacing.space1),
        Text(name, style: AppTextStyles.labelXs.copyWith(color: AppColors.textSecondary)),
      ],
    );
  }
}
