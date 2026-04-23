import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../theme/app_theme.dart';

class FloatingCheckoutBar extends StatelessWidget {
  const FloatingCheckoutBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<CartProvider>(
      builder: (context, cart, child) {
        if (cart.itemCount == 0) return const SizedBox.shrink();

        // Gamified Progress Logic (e.g. 500 BDT for free delivery)
        const double freeDeliveryThreshold = 500.0;
        final double progress = (cart.totalAmount / freeDeliveryThreshold).clamp(0.0, 1.0);
        final bool unlockedFreeDelivery = cart.totalAmount >= freeDeliveryThreshold;

        return Positioned(
          left: 16,
          right: 16,
          bottom: 16, // Above BottomNavigationBar (in a Stack context)
          child: GestureDetector(
            onTap: () {
              // Navigate to Checkout
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: AppTheme.neomorphicDecoration.copyWith(
                color: AppTheme.primaryAccent,
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
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${cart.itemCount}',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Text(
                            'Checkout',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '৳${cart.totalAmount.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Gamified Progress Bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: Colors.black.withValues(alpha: 0.2),
                      valueColor: AlwaysStoppedAnimation<Color>(
                        unlockedFreeDelivery ? const Color(0xFF4EEB9E) : Colors.white,
                      ),
                      minHeight: 4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    unlockedFreeDelivery 
                      ? 'Free Delivery Unlocked! 🚚' 
                      : 'Add ৳${(freeDeliveryThreshold - cart.totalAmount).toStringAsFixed(0)} more for Free Delivery',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 10,
                    ),
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
