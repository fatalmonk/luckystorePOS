import 'package:flutter/material.dart';
import '../../../../shared/widgets/product_card.dart';
import '../../../../models/pos_models.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';

class CategoriesTab extends StatefulWidget {
  const CategoriesTab({super.key});

  @override
  State<CategoriesTab> createState() => _CategoriesTabState();
}

class _CategoriesTabState extends State<CategoriesTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  static const _tabs = ['Grocery', 'Pharmacy', 'Cookups', 'Beauty'];

  // Pastel colors following the blueprint — soft, muted backgrounds
  static const _subcategoryColors = [
    Color(0xFF2D2D3A), // muted indigo-dark
    Color(0xFF2A342A), // pale green-dark
    Color(0xFF342A2A), // soft rose-dark
    Color(0xFF2A2D34), // slate-dark
    Color(0xFF342D2A), // warm sand-dark
    Color(0xFF2D342D), // sage-dark
  ];

  static const _subcategoryItems = [
    {'name': 'Popular', 'emoji': '🔥'},
    {'name': 'Flash Sales', 'emoji': '⚡'},
    {'name': 'Cleaning', 'emoji': '🧹'},
    {'name': 'Dairy', 'emoji': '🥛'},
    {'name': 'Snacks', 'emoji': '🍿'},
    {'name': 'Beverages', 'emoji': '🥤'},
    {'name': 'Vegetables', 'emoji': '🥦'},
    {'name': 'Spices', 'emoji': '🌶️'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Horizontal top-level tab bar
          Container(
            color: AppColors.surfaceDefault,
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              indicatorColor: AppColors.primaryDefault,
              labelColor: AppColors.primaryDefault,
              unselectedLabelColor: AppColors.textSecondary,
              labelStyle: AppTextStyles.labelMd.copyWith(fontWeight: FontWeight.bold),
              tabs: _tabs.map((t) => Tab(text: t)).toList(),
            ),
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: _tabs.map((_) => _buildCategoryBody()).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryBody() {
    return CustomScrollView(
      slivers: [
        // Horizontally scrolling promotional cashback banner
        SliverToBoxAdapter(
          child: Padding(
            padding: AppSpacing.insetLg,
            child: SizedBox(
              height: 110,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: 3,
                itemBuilder: (context, i) => Container(
                  width: 280,
                  margin: const EdgeInsets.only(right: AppSpacing.space4),
                  decoration: BoxDecoration(
                    borderRadius: AppRadius.borderMd,
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primaryDefault.withValues(alpha: 0.8),
                        AppColors.primaryDefault.withValues(alpha: 0.5),
                      ],
                    ),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Get 15% Cashback', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text('On all orders above ৳400', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12)),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),

        // 2-column subcategory pastel grid
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverGrid(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 2.2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            delegate: SliverChildBuilderDelegate(
              (context, i) {
                final item = _subcategoryItems[i % _subcategoryItems.length];
                return Container(
                  decoration: BoxDecoration(
                    color: _subcategoryColors[i % _subcategoryColors.length],
                    borderRadius: BorderRadius.circular(14),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          item['name']!,
                          style: AppTextStyles.labelMd.copyWith(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Text(item['emoji']!, style: TextStyle(fontSize: 28)),
                    ],
                  ),
                );
              },
              childCount: _subcategoryItems.length,
            ),
          ),
        ),

        // Products in this category
        SliverPadding(
          padding: EdgeInsets.fromLTRB(16, 24, 16, 8),
          sliver: SliverToBoxAdapter(
            child: Text(
              'Products',
              style: AppTextStyles.headingMd.copyWith(color: AppColors.textPrimary),
            ),
          ),
        ),

        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
          sliver: SliverGrid(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.65,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),
            delegate: SliverChildBuilderDelegate(
              (context, index) => ProductCard(
                item: PosItem(
                  id: 'CAT-${2000 + index}',
                  sku: 'CAT-${2000 + index}',
                  name: 'Fresh Organic Item ${index + 1}',
                  price: 120.0 + (index * 15),
                ),
                originalPrice: 150.0 + (index * 15),
                weight: '${200 + (index * 50)} g',
              ),
              childCount: 6,
            ),
          ),
        ),
      ],
    );
  }
}
