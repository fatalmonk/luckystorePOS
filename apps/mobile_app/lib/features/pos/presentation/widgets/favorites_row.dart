import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_shadows.dart';
import '../../../../models/pos_models.dart';

/// Horizontal scrollable row of favorite/quick-access products
/// Typically shown below search bar for one-tap add to cart
class FavoritesRow extends StatelessWidget {
  final List<PosItem> favorites;
  final Function(PosItem) onTap;
  final String? storeId;
  final bool isLoading;

  const FavoritesRow({
    super.key,
    required this.favorites,
    required this.onTap,
    this.storeId,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return _buildLoadingState();
    }

    if (favorites.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: favorites.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) => _FavoriteChip(
          item: favorites[index],
          onTap: () => onTap(favorites[index]),
          storeId: storeId,
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: 5,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, __) => Container(
          width: 120,
          decoration: BoxDecoration(
            color: AppColors.backgroundSubtle,
            borderRadius: AppRadius.borderMd,
          ),
        ),
      ),
    );
  }
}

class _FavoriteChip extends StatelessWidget {
  final PosItem item;
  final VoidCallback onTap;
  final String? storeId;

  const _FavoriteChip({
    required this.item,
    required this.onTap,
    this.storeId,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderMd,
        child: Container(
          width: 140,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.surfaceDefault,
            borderRadius: AppRadius.borderMd,
            border: Border.all(color: AppColors.borderDefault),
            boxShadow: AppShadows.elevation1,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                item.name,
                style: AppTextStyles.labelSm.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primarySubtle,
                      borderRadius: AppRadius.borderSm,
                    ),
                    child: Text(
                      '৳${item.price.toStringAsFixed(0)}',
                      style: AppTextStyles.labelXs.copyWith(
                        color: AppColors.primaryDefault,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (item.stockQuantity != null && item.stockQuantity! > 0)
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: AppColors.successDefault,
                        borderRadius: AppRadius.borderFull,
                      ),
                    )
                  else
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: AppColors.dangerDefault,
                        borderRadius: AppRadius.borderFull,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
