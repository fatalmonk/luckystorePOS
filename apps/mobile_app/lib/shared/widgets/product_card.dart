import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_shadows.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_text_styles.dart';
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
            content: Text('Added to Cart - ৳${item.price.toStringAsFixed(0)}'),
            duration: const Duration(seconds: 1),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppTheme.primaryAccent,
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
                // 40% vertical space allocated to the product image
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
                  ),
                ),
                // Left-aligned F-pattern typography
                Expanded(
                  flex: 6,
                  child: Padding(
                    padding: const EdgeInsets.all(10.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.name,
                              style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                fontFamily: AppTextStyles.fontFamilyPrimary,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (weight != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                weight!,
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                  fontFamily: AppTextStyles.fontFamilyPrimary,
                                ),
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
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                  decoration: TextDecoration.lineThrough,
                                  fontFamily: AppTextStyles.fontFamilyPrimary,
                                ),
                              ),
                            // Bold pricing
                            Text(
                              '৳${item.price.toStringAsFixed(0)}',
                              style: const TextStyle(
                                color: AppColors.primaryDefault,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                fontFamily: AppTextStyles.fontFamilyPrimary,
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
                    color: AppColors.secondaryDefault.withValues(alpha: 0.9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.print, color: Colors.white, size: 18),
                ),
              ),
            ),

            // Quantity selector (shows current cart quantity)
            Positioned(
              bottom: 10,
              right: 10,
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
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Added to Cart - ৳${item.price.toStringAsFixed(0)}'),
                            duration: const Duration(seconds: 1),
                            behavior: SnackBarBehavior.floating,
                            backgroundColor: AppTheme.primaryAccent,
                          ),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(
                          color: AppColors.primaryDefault,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.add, color: Colors.white, size: 20),
                      ),
                    );
                  }

                  // Transformed State: [-] 1 [+] selector
                  return Container(
                    decoration: BoxDecoration(
                      color: AppColors.surfaceRaised,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.primaryDefault),
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
                            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            child: Icon(Icons.remove, color: AppColors.textPrimary, size: 16),
                          ),
                        ),
                        Text(
                          '$quantity',
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontFamily: AppTextStyles.fontFamilyPrimary,
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            HapticFeedback.lightImpact();
                            posProvider.setQty(item.id, quantity + 1);
                          },
                          child: const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            child: Icon(Icons.add, color: AppColors.primaryDefault, size: 16),
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