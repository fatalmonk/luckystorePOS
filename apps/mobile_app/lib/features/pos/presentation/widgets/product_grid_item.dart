import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_shadows.dart';
import '../../../../models/pos_models.dart';

class ProductGridItem extends StatelessWidget {
  final PosItem item;
  final String storeId;
  final VoidCallback onAddToCart;
  final bool allowProductAdd;

  const ProductGridItem({
    super.key,
    required this.item,
    required this.storeId,
    required this.onAddToCart,
    this.allowProductAdd = true,
  });

  @override
  Widget build(BuildContext context) {
    final hasDiscount = item.mrp > item.price;
    final discountPercent = hasDiscount
        ? ((item.mrp - item.price) / item.mrp * 100).round()
        : 0;
    final isOutOfStock = item.stock <= 0;

    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.borderLg,
        side: BorderSide(color: AppColors.borderDefault),
      ),
      child: InkWell(
        onTap: allowProductAdd && !isOutOfStock ? onAddToCart : null,
        borderRadius: AppRadius.borderLg,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildImageSection(hasDiscount, discountPercent, isOutOfStock),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      style: AppTextStyles.labelMd.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.sku,
                      style: AppTextStyles.bodyXs.copyWith(
                        color: AppColors.textMuted,
                      ),
                    ),
                    const Spacer(),
                    _buildPriceRow(hasDiscount),
                    const SizedBox(height: 8),
                    _buildStockAndAddRow(isOutOfStock),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImageSection(bool hasDiscount, int discountPercent, bool isOutOfStock) {
    return Stack(
      children: [
        AspectRatio(
          aspectRatio: 1,
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.backgroundSubtle,
              borderRadius: BorderRadius.vertical(
                top: AppRadius.borderLg.topLeft,
              ),
            ),
            child: item.imageUrl != null && item.imageUrl!.isNotEmpty
                ? ClipRRect(
                    borderRadius: BorderRadius.vertical(
                      top: AppRadius.borderLg.topLeft,
                    ),
                    child: Image.network(
                      item.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildPlaceholder(),
                    ),
                  )
                : _buildPlaceholder(),
          ),
        ),
        if (hasDiscount && discountPercent > 0)
          Positioned(
            top: 8,
            left: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.successDefault,
                borderRadius: AppRadius.borderSm,
              ),
              child: Text(
                '-$discountPercent%',
                style: AppTextStyles.labelXs.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        if (isOutOfStock)
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.5),
                borderRadius: BorderRadius.vertical(
                  top: AppRadius.borderLg.topLeft,
                ),
              ),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.dangerDefault,
                    borderRadius: AppRadius.borderSm,
                  ),
                  child: Text(
                    'OUT OF STOCK',
                    style: AppTextStyles.labelXs.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildPlaceholder() {
    return Center(
      child: Icon(
        Icons.image_outlined,
        size: 48,
        color: AppColors.textMuted.withValues(alpha: 0.3),
      ),
    );
  }

  Widget _buildPriceRow(bool hasDiscount) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          '৳${item.price.toStringAsFixed(0)}',
          style: AppTextStyles.labelLg.copyWith(
            fontWeight: FontWeight.w700,
            color: AppColors.primaryDefault,
          ),
        ),
        if (hasDiscount) ...[
          const SizedBox(width: 8),
          Text(
            '৳${item.mrp.toStringAsFixed(0)}',
            style: AppTextStyles.bodySm.copyWith(
              color: AppColors.textMuted,
              decoration: TextDecoration.lineThrough,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStockAndAddRow(bool isOutOfStock) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: isOutOfStock
                ? AppColors.dangerSubtle
                : item.stock < 10
                    ? AppColors.warningSubtle
                    : AppColors.successSubtle,
            borderRadius: AppRadius.borderSm,
          ),
          child: Text(
            isOutOfStock
                ? 'No stock'
                : item.stock < 10
                    ? '${item.stock} left'
                    : 'In stock',
            style: AppTextStyles.labelXs.copyWith(
              color: isOutOfStock
                  ? AppColors.dangerDefault
                  : item.stock < 10
                      ? AppColors.warningDefault
                      : AppColors.successDefault,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const Spacer(),
        if (!isOutOfStock)
          SizedBox(
            width: 36,
            height: 36,
            child: ElevatedButton(
              onPressed: allowProductAdd ? onAddToCart : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryDefault,
                foregroundColor: AppColors.primaryOn,
                disabledBackgroundColor: AppColors.backgroundSubtle,
                padding: EdgeInsets.zero,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: AppRadius.borderMd,
                ),
              ),
              child: const Icon(Icons.add_rounded, size: 20),
            ),
          ),
      ],
    );
  }
}
