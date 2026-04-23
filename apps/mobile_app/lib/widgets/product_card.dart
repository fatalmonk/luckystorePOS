import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/cart_provider.dart';
import '../screens/product_details_screen.dart';

class ProductCard extends StatelessWidget {
  final String sku;
  final String name;
  final double price;
  final double originalPrice;
  final String weight;
  final String imageUrl;

  const ProductCard({
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
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProductDetailsScreen(
              sku: sku,
              name: name,
              price: price,
              originalPrice: originalPrice,
              weight: weight,
              imageUrl: imageUrl,
            ),
          ),
        );
      },
      child: Container(
        decoration: AppTheme.neomorphicDecoration,
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
                      color: Colors.white.withValues(alpha: 0.05),
                      image: DecorationImage(
                        image: NetworkImage(imageUrl),
                        fit: BoxFit.cover,
                      ),
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
                              name,
                              style: const TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              weight,
                              style: const TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Struck-through original price
                            Text(
                              '৳${originalPrice.toStringAsFixed(0)}',
                              style: const TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 12,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                            // Bold pricing
                            Text(
                              '৳${price.toStringAsFixed(0)}',
                              style: const TextStyle(
                                color: AppTheme.primaryAccentLight,
                                fontSize: 16,
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
            
            // Add to Wishlist heart icon
            Positioned(
              top: 8,
              right: 8,
              child: GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  // TODO: Add to wishlist logic
                },
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppTheme.backgroundElevated.withValues(alpha: 0.8),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.favorite_border, color: AppTheme.textSecondary, size: 18),
                ),
              ),
            ),
            
            // Add-to-Cart Transformative Button
            Positioned(
              bottom: 10,
              right: 10,
              child: Consumer<CartProvider>(
                builder: (context, cart, child) {
                  final cartItem = cart.items[sku];
                  final int quantity = cartItem?.quantity ?? 0;

                  if (quantity == 0) {
                    return GestureDetector(
                      onTap: () {
                        HapticFeedback.mediumImpact();
                        cart.addItem(sku, name, price);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Added to Cart - ৳${price.toStringAsFixed(0)}'),
                            duration: const Duration(seconds: 1),
                            behavior: SnackBarBehavior.floating,
                            backgroundColor: AppTheme.primaryAccent,
                          ),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(
                          color: AppTheme.primaryAccent,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.add, color: Colors.white, size: 20),
                      ),
                    );
                  }

                  // Transformed State: [-] 1 [+] selector
                  return Container(
                    decoration: BoxDecoration(
                      color: AppTheme.backgroundElevated,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.primaryAccent),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        GestureDetector(
                          onTap: () {
                            HapticFeedback.lightImpact();
                            cart.decrementItem(sku);
                          },
                          child: const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            child: Icon(Icons.remove, color: AppTheme.textPrimary, size: 16),
                          ),
                        ),
                        Text(
                          '$quantity',
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            HapticFeedback.lightImpact();
                            cart.addItem(sku, name, price);
                          },
                          child: const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            child: Icon(Icons.add, color: AppTheme.primaryAccentLight, size: 16),
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
