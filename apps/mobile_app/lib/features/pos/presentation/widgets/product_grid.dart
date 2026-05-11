import 'package:flutter/material.dart';
import '../../../../models/pos_models.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_shadows.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_button_styles.dart';

/// Product grid for the POS left panel, with loading, error, and empty states.
class ProductGrid extends StatelessWidget {
  final List<PosItem> items;
  final PosLoadState loadState;
  final String? loadError;
  final String storeId;
  final bool allowProductAdd;
  final VoidCallback onRetry;
  final ValueChanged<PosItem> onAddToCart;

  const ProductGrid({
    super.key,
    required this.items,
    required this.loadState,
    required this.loadError,
    required this.storeId,
    required this.allowProductAdd,
    required this.onRetry,
    required this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
    if (loadState == PosLoadState.loading) {
      return const Center(
          child: CircularProgressIndicator(color: AppColors.primaryDefault));
    }
    if (loadState == PosLoadState.error) {
      final msg = loadError ?? 'Data load failed';
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded,
                color: AppColors.dangerDefault, size: AppSpacing.space12),
            const SizedBox(height: AppSpacing.space4),
            Text(
              'Data load failed: $msg',
              textAlign: TextAlign.center,
              style: AppTextStyles.bodyMd.copyWith(color: AppColors.dangerDefault),
            ),
            const SizedBox(height: AppSpacing.space5),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry Connection'),
              style: AppButtonStyles.primary,
            ),
          ],
        ),
      );
    }
    if (loadState == PosLoadState.empty || items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off_rounded,
                color: AppColors.textMuted.withValues(alpha: 0.3), size: AppSpacing.space16),
            const SizedBox(height: AppSpacing.space4),
            Text(
              'No products found for store $storeId',
              style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.space5),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Reload Catalog'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primaryDefault,
                side: const BorderSide(color: AppColors.primaryDefault),
                shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
                padding: AppSpacing.insetSquishLg,
              ),
            ),
          ],
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final crossAxisCount = width > 800 ? 4 : (width > 500 ? 3 : 2);
        final childAspectRatio = width > 800 ? 0.88 : 0.82;

        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: childAspectRatio,
          ),
          itemCount: items.length,
          itemBuilder: (ctx, i) => ProductTile(
            item: items[i],
            onTap: allowProductAdd
                ? () => onAddToCart(items[i])
                : null,
            disabledMessage: 'Product loading failed. Retry before adding items.',
          ),
        );
      },
    );
  }
}

/// Denser product tile optimized for the POS split-view grid.
class ProductTile extends StatelessWidget {
  final PosItem item;
  final VoidCallback? onTap;
  final String disabledMessage;

  const ProductTile({
    super.key,
    required this.item,
    required this.onTap,
    this.disabledMessage = '',
  });

  @override
  Widget build(BuildContext context) {
    final outOfStock = item.qtyOnHand <= 0;

    return GestureDetector(
      onTap: outOfStock ? null : onTap,
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
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Product image
                Expanded(
                  flex: 5,
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSubtle,
                    ),
                    child: item.imageUrl != null
                        ? Image.network(
                            item.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _placeholder(),
                          )
                        : _placeholder(),
                  ),
                ),
                // Product info
                Expanded(
                  flex: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Flexible(
                          child: Text(
                            item.name,
                            style: AppTextStyles.labelMd.copyWith(
                              height: 1.1,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const Spacer(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '৳${item.price.toStringAsFixed(0)}',
                              style: AppTextStyles.labelLg.copyWith(
                                color: AppColors.primaryDefault,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: item.qtyOnHand > 5 
                                  ? AppColors.successDefault.withValues(alpha: 0.1)
                                  : item.qtyOnHand > 0 
                                    ? AppColors.warningDefault.withValues(alpha: 0.1)
                                    : AppColors.dangerDefault.withValues(alpha: 0.1),
                                borderRadius: AppRadius.borderXs,
                              ),
                              child: Text(
                                '${item.qtyOnHand}',
                                style: AppTextStyles.bodyXs.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: item.qtyOnHand > 5 
                                    ? AppColors.successDefault
                                    : item.qtyOnHand > 0 
                                      ? AppColors.warningDefault
                                      : AppColors.dangerDefault,
                                ),
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

            // Out of stock overlay
            if (outOfStock)
              Positioned.fill(
                child: Container(
                  color: AppColors.backgroundDefault.withValues(alpha: 0.6),
                  alignment: Alignment.center,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.dangerDefault,
                      borderRadius: AppRadius.borderSm,
                    ),
                    child: Text(
                      'SOLD OUT',
                      style: AppTextStyles.labelXs.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ),
                ),
              ),

            // Add indicator (top-right)
            if (!outOfStock)
              Positioned(
                top: 6,
                right: 6,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: AppColors.primaryDefault.withValues(alpha: 0.9),
                    shape: BoxShape.circle,
                    boxShadow: AppShadows.elevation1,
                  ),
                  child: const Icon(Icons.add_rounded, color: AppColors.primaryOn, size: 18),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Center(
      child: Icon(
        Icons.image_not_supported_rounded,
        color: AppColors.textMuted.withValues(alpha: 0.2),
        size: 32,
      ),
    );
  }
}