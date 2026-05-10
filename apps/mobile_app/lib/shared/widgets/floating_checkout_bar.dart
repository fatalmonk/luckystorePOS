import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../shared/providers/pos_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../core/theme/app_radius.dart';
import '../../core/theme/app_shadows.dart';

class FloatingCheckoutBar extends StatelessWidget {
  const FloatingCheckoutBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<PosProvider>(
      builder: (context, posProvider, child) {
        if (posProvider.cartIsEmpty) return const SizedBox.shrink();

        // Gamified Progress Logic (e.g. 500 BDT for free delivery)
        const double freeDeliveryThreshold = 500.0;
        final double progress = (posProvider.totalAmount / freeDeliveryThreshold).clamp(0.0, 1.0);
        final bool unlockedFreeDelivery = posProvider.totalAmount >= freeDeliveryThreshold;

        return Positioned(
          left: 12,
          right: 12,
          bottom: 12,
          child: GestureDetector(
            onTap: () {
              Navigator.of(context).pushNamed('/checkout');
            },
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primaryDefault,
                borderRadius: AppRadius.borderXl,
                boxShadow: AppShadows.elevation3,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: AppColors.primaryOn.withValues(alpha: 0.2),
                              borderRadius: AppRadius.borderMd,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '${posProvider.itemCount}',
                              style: AppTextStyles.labelLg.copyWith(
                                color: AppColors.primaryOn,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Text(
                            'View Checkout',
                            style: TextStyle(
                              color: AppColors.primaryOn,
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '৳${posProvider.totalAmount.toStringAsFixed(0)}',
                        style: AppTextStyles.headingLg.copyWith(
                          color: AppColors.primaryOn,
                          fontFamily: AppTextStyles.fontFamilyMono,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Gamified Progress Bar
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: AppRadius.borderFull,
                        child: LinearProgressIndicator(
                          value: progress,
                          backgroundColor: AppColors.primaryOn.withValues(alpha: 0.15),
                          valueColor: AlwaysStoppedAnimation<Color>(
                            unlockedFreeDelivery ? AppColors.successDefault : AppColors.primaryOn,
                          ),
                          minHeight: 6,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(
                            unlockedFreeDelivery ? Icons.local_shipping_rounded : Icons.info_outline_rounded,
                            size: 14,
                            color: AppColors.primaryOn.withValues(alpha: 0.9),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            unlockedFreeDelivery
                              ? 'Free Delivery Unlocked! 🚚'
                              : 'Add ৳${(freeDeliveryThreshold - posProvider.totalAmount).toStringAsFixed(0)} more for Free Delivery',
                            style: AppTextStyles.labelSm.copyWith(
                              color: AppColors.primaryOn.withValues(alpha: 0.9),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}