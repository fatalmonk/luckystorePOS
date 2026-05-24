import 'package:flutter/material.dart';
import '../../../../models/pos_models.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
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
    final isOutOfStock = item.qtyOnHand <= 0;

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.borderDefault),
      ),
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: isOutOfStock ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Circular avatar with stock badge
              Stack(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: AppColors.backgroundSubtle,
                    backgroundImage: item.imageUrl != null && item.imageUrl!.isNotEmpty
                      ? NetworkImage(item.imageUrl!)
                      : null,
                    child: item.imageUrl == null || item.imageUrl!.isEmpty
                      ? const Icon(Icons.inventory_2, size: 32, color: AppColors.textMuted)
                      : null,
                  ),
                  if (item.qtyOnHand < 10)
                    Positioned(
                      top: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isOutOfStock 
                            ? AppColors.dangerDefault 
                            : AppColors.warningDefault,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          isOutOfStock ? '0' : '${item.qtyOnHand}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              
              // Product name
              Text(
                item.name,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 4),
              
              // Price
              Text(
                '৳${item.price.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDefault,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}