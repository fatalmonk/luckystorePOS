import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_text_styles.dart';
import '../../shared/providers/pos_provider.dart';
import '../../models/pos_models.dart';
import '../../features/inventory/label_printer_screen.dart';

class ProductCard extends StatelessWidget {
  final PosItem item;
  final double? originalPrice;
  final String? weight;

  const ProductCard({
    super.key,
    required this.item,
    this.originalPrice,
    this.weight,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        context.read<PosProvider>().addItem(item);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Added to Cart - ৳${item.price.toStringAsFixed(0)}',
              style: AppTextStyles.labelMd.copyWith(color: AppColors.primaryOn),
            ),
            duration: const Duration(seconds: 1),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.primaryDefault,
            shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceDefault,
          borderRadius: AppRadius.borderMd,
          boxShadow: AppShadows.elevation1,
          border: Border.all(color: AppColors.borderDefault),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Product Image Container
                Expanded(
                  flex: 4,
                  child: Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSubtle,
                      image: item.imageUrl != null
                          ? DecorationImage(
                              image: NetworkImage(item.imageUrl!),
                              fit: BoxFit.cover,
                            )
                          : null,
                    ),
                    child: item.imageUrl == null
                        ? Center(
                            child: Icon(
                              Icons.image_not_supported_outlined,
                              color: AppColors.textMuted.withValues(alpha: 0.3),
                              size: 32,
                            ),
                          )
                        : null,
                  ),
                ),
                // Product Info Container
                Expanded(
                  flex: 6,
                  child: Padding(
                    padding: const EdgeInsets.all(12.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.name,
                              style: AppTextStyles.labelLg.copyWith(height: 1.2),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (weight != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                weight!,
                                style: AppTextStyles.bodySm,
                              ),
                            ],
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Struck-through original price
                            if (originalPrice != null)
                              Text(
                                '৳${originalPrice!.toStringAsFixed(0)}',
                                style: AppTextStyles.bodySm.copyWith(
                                  decoration: TextDecoration.lineThrough,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            // Bold pricing
                            Text(
                              '৳${item.price.toStringAsFixed(0)}',
                              style: AppTextStyles.headingMd.copyWith(
                                color: AppColors.primaryDefault,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Print Label button
            Positioned(
              top: 8,
              right: 8,
              child: GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => LabelPrinterScreen(
                        barcode: item.sku,
                        productName: item.name,
                        price: item.price,
                      ),
                    ),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.secondaryDefault.withValues(alpha: 0.1),
                    borderRadius: AppRadius.borderSm,
                    border: Border.all(color: AppColors.secondaryDefault.withValues(alpha: 0.2)),
                  ),
                  child: const Icon(Icons.print_rounded, color: AppColors.secondaryDefault, size: 16),
                ),
              ),
            ),

            // Quantity selector (shows current cart quantity)
            Positioned(
              bottom: 12,
              right: 12,
              child: Consumer<PosProvider>(
                builder: (context, posProvider, child) {
                  final cartItem = posProvider.cart.firstWhere(
                    (c) => c.item.id == item.id,
                    orElse: () => CartItem(item: item, qty: 0),
                  );
                  final int quantity = cartItem.qty;

                  if (quantity == 0) {
                    return GestureDetector(
                      onTap: () {
                        HapticFeedback.mediumImpact();
                        posProvider.addItem(item);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primaryDefault,
                          borderRadius: AppRadius.borderMd,
                          boxShadow: AppShadows.elevation1,
                        ),
                        child: const Icon(Icons.add_rounded, color: AppColors.primaryOn, size: 20),
                      ),
                    );
                  }

                  return Container(
                    decoration: BoxDecoration(
                      color: AppColors.surfaceDefault,
                      borderRadius: AppRadius.borderFull,
                      border: Border.all(color: AppColors.primaryDefault, width: 1.5),
                      boxShadow: AppShadows.elevation1,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        GestureDetector(
                          onTap: () {
                            HapticFeedback.lightImpact();
                            if (quantity <= 1) {
                              posProvider.removeItem(item.id);
                            } else {
                              posProvider.setQty(item.id, quantity - 1);
                            }
                          },
                          child: const Padding(
                            padding: EdgeInsets.fromLTRB(10, 6, 8, 6),
                            child: Icon(Icons.remove_rounded, color: AppColors.textPrimary, size: 16),
                          ),
                        ),
                        Text(
                          '$quantity',
                          style: AppTextStyles.labelMd.copyWith(fontWeight: FontWeight.bold),
                        ),
                        GestureDetector(
                          onTap: () {
                            HapticFeedback.lightImpact();
                            posProvider.setQty(item.id, quantity + 1);
                          },
                          child: const Padding(
                            padding: EdgeInsets.fromLTRB(8, 6, 10, 6),
                            child: Icon(Icons.add_rounded, color: AppColors.primaryDefault, size: 16),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}