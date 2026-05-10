import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_shadows.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../shared/widgets/product_card.dart';
import '../../../../models/pos_models.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      body: CustomScrollView(
        slivers: [
          // Dominant Pinned Search Bar
          SliverAppBar(
            floating: true,
            pinned: true,
            elevation: 0,
            toolbarHeight: 80,
            backgroundColor: AppColors.backgroundDefault,
            title: Container(
              height: 52,
              decoration: BoxDecoration(
                color: AppColors.surfaceDefault,
                borderRadius: AppRadius.borderLg,
                boxShadow: AppShadows.elevation1,
                border: Border.all(color: AppColors.borderDefault),
              ),
              child: TextField(
                style: AppTextStyles.bodyMd.copyWith(color: AppColors.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Search products... (Fuzzy Match)',
                  hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textMuted),
                  prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primaryDefault),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
          ),

          SliverPadding(
            padding: const EdgeInsets.all(16.0),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Promotional Slider (Partial View)
                SizedBox(
                  height: 160,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: 3,
                    itemBuilder: (context, index) {
                      return Container(
                        width: MediaQuery.of(context).size.width * 0.85,
                        margin: const EdgeInsets.only(right: 16),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceRaised,
                          borderRadius: AppRadius.borderLg,
                          boxShadow: AppShadows.elevation2,
                          image: const DecorationImage(
                            image: NetworkImage('https://via.placeholder.com/400x150/6366F1/FFFFFF?text=Premium+Collection'),
                            fit: BoxFit.cover,
                          ),
                        ),
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: AppRadius.borderLg,
                            gradient: LinearGradient(
                              begin: Alignment.bottomRight,
                              colors: [
                                Colors.black.withValues(alpha: 0.6),
                                Colors.transparent,
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 32),

                Text(
                  'Popular Aisles',
                  style: AppTextStyles.headingMd,
                ),
                const SizedBox(height: 16),

                // Category Grid
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    childAspectRatio: 0.8,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 20,
                  ),
                  itemCount: 8,
                  itemBuilder: (context, index) {
                    final icons = [
                      Icons.apple_rounded, 
                      Icons.bakery_dining_rounded, 
                      Icons.egg_rounded, 
                      Icons.local_drink_rounded,
                      Icons.cleaning_services_rounded,
                      Icons.medical_services_rounded,
                      Icons.pets_rounded,
                      Icons.toys_rounded,
                    ];
                    final labels = [
                      'Fruits', 'Bakery', 'Dairy', 'Drinks',
                      'Cleaning', 'Pharma', 'Pets', 'Toys'
                    ];
                    
                    return Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.primarySubtle,
                            borderRadius: AppRadius.borderMd,
                          ),
                          child: Icon(icons[index % icons.length], color: AppColors.primaryDefault, size: 28),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          labels[index % labels.length],
                          style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary),
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 32),

                Text(
                  'Trending Now',
                  style: AppTextStyles.headingMd,
                ),
                const SizedBox(height: 16),
              ]),
            ),
          ),

          // Product Grid
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16).copyWith(bottom: 120),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.68,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  return ProductCard(
                    item: PosItem(
                      id: 'LKY-${1000 + index}',
                      sku: 'LKY-${1000 + index}',
                      name: index % 2 == 0 ? 'Premium Miniket Rice - Handpicked' : 'Fresh Farm Eggs - 1 Dozen',
                      price: index % 2 == 0 ? 340.0 : 145.0,
                    ),
                    originalPrice: index % 2 == 0 ? 380.0 : 160.0,
                    weight: index % 2 == 0 ? '5 kg' : '12 pcs',
                  );
                },
                childCount: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
