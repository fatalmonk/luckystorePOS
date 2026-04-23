import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ProductDetailsScreen extends StatelessWidget {
  final String sku;
  final String name;
  final double price;
  final double originalPrice;
  final String weight;
  final String imageUrl;

  const ProductDetailsScreen({
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Product Details'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero Imagery
            Hero(
              tag: 'hero-$sku',
              child: Container(
                height: 300,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  image: DecorationImage(
                    image: NetworkImage(imageUrl),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
            
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: AppTheme.neomorphicDecoration,
                        child: const Icon(Icons.favorite_border, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  
                  // Trust Section (Reviews)
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber, size: 20),
                      const Icon(Icons.star, color: Colors.amber, size: 20),
                      const Icon(Icons.star, color: Colors.amber, size: 20),
                      const Icon(Icons.star, color: Colors.amber, size: 20),
                      const Icon(Icons.star_half, color: Colors.amber, size: 20),
                      const SizedBox(width: 8),
                      Text('4.8 (120 Reviews)', style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Financial Hierarchy
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '৳${price.toStringAsFixed(0)}',
                        style: const TextStyle(color: AppTheme.primaryAccent, fontSize: 28, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(width: 12),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text(
                          '৳${originalPrice.toStringAsFixed(0)}',
                          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 18, decoration: TextDecoration.lineThrough),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.errorAccent.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '-${(((originalPrice - price) / originalPrice) * 100).toStringAsFixed(0)}%',
                            style: const TextStyle(color: AppTheme.errorAccent, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: AppTheme.shadowLight),
                  const SizedBox(height: 16),
                  
                  // Logistics & Delivery
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: AppTheme.neomorphicDecoration,
                    child: const Row(
                      children: [
                        Icon(Icons.local_shipping_outlined, color: AppTheme.primaryAccentLight),
                        SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Standard Delivery', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
                              SizedBox(height: 4),
                              Text('Arrives in 30-45 minutes based on nearest fulfillment center.', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                            ],
                          ),
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Accepted Payments
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: AppTheme.neomorphicDecoration,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildPaymentMethod('bKash', Icons.account_balance_wallet),
                        _buildPaymentMethod('Cards', Icons.credit_card),
                        _buildPaymentMethod('COD', Icons.money),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.backgroundElevated,
          boxShadow: [BoxShadow(color: AppTheme.shadowDark, blurRadius: 10, offset: const Offset(0, -5))],
        ),
        child: Row(
          children: [
            Expanded(
              child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryAccent,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Add to Cart', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentMethod(String name, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: AppTheme.textSecondary, size: 28),
        const SizedBox(height: 4),
        Text(name, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
      ],
    );
  }
}
