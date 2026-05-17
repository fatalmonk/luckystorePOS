import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../models/product.dart';

class ProductGridCard extends StatelessWidget {
  final Product product;

  const ProductGridCard({
    super.key,
    required this.product,
  });

  @override
  Widget build(BuildContext context) {
    final hasDiscount = product.sellingPrice < product.mrp;
    final discountPercent = hasDiscount
        ? ((product.mrp - product.sellingPrice) / product.mrp * 100).round()
        : 0;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(12),
                  ),
                  child: Container(
                    width: double.infinity,
                    color: AppColors.grey100,
                    child: product.imageUrl != null
                        ? Image.network(
                            product.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _buildPlaceholder(),
                          )
                        : _buildPlaceholder(),
                  ),
                ),
                if (hasDiscount)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.error,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '-$discountPercent%',
                        style: AppTypography.labelSmall.copyWith(
                          color: AppColors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: _buildStockBadge(),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: Padding(
              padding: AppSpacing.paddingAll12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    product.name,
                    style: AppTypography.bodyMedium.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  AppSpacing.vertical4,
                  Text(
                    product.sku,
                    style: AppTypography.labelSmall.copyWith(
                      color: AppColors.grey500,
                    ),
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      if (hasDiscount) ...[
                        Text(
                          '৳${product.mrp.toStringAsFixed(0)}',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.grey500,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                        AppSpacing.horizontal8,
                      ],
                      Text(
                        '৳${product.sellingPrice.toStringAsFixed(0)}',
                        style: AppTypography.bodyLarge.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
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
    );
  }

  Widget _buildPlaceholder() {
    return Center(
      child: Icon(
        Icons.image_outlined,
        size: 48,
        color: AppColors.grey400,
      ),
    );
  }

  Widget _buildStockBadge() {
    final isLowStock = product.stockQuantity <= product.lowStockThreshold;
    final isOutOfStock = product.stockQuantity == 0;

    Color badgeColor;
    String badgeText;

    if (isOutOfStock) {
      badgeColor = AppColors.grey500;
      badgeText = 'Out of Stock';
    } else if (isLowStock) {
      badgeColor = AppColors.warning;
      badgeText = 'Low Stock';
    } else {
      badgeColor = AppColors.success;
      badgeText = 'In Stock';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: badgeColor.withOpacity(0.9),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        badgeText,
        style: AppTypography.labelSmall.copyWith(
          color: AppColors.white,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
