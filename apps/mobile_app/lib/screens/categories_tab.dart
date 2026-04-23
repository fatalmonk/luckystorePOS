import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/product_card.dart';

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
            color: AppTheme.background,
            child: TabBar(
              controller: _tabController,
              isScrollable: true,
              indicatorColor: AppTheme.primaryAccent,
              labelColor: AppTheme.primaryAccentLight,
              unselectedLabelColor: AppTheme.textSecondary,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
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
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              height: 110,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: 3,
                itemBuilder: (context, i) => Container(
                  width: 280,
                  margin: const EdgeInsets.only(right: 16),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.primaryAccent.withValues(alpha: 0.8),
                        AppTheme.primaryAccentLight.withValues(alpha: 0.6),
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
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Text(item['emoji']!, style: const TextStyle(fontSize: 28)),
                    ],
                  ),
                );
              },
              childCount: _subcategoryItems.length,
            ),
          ),
        ),

        // Products in this category
        const SliverPadding(
          padding: EdgeInsets.fromLTRB(16, 24, 16, 8),
          sliver: SliverToBoxAdapter(
            child: Text(
              'Products',
              style: TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
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
                sku: 'CAT-${2000 + index}',
                name: 'Fresh Organic Item ${index + 1}',
                price: 120.0 + (index * 15),
                originalPrice: 150.0 + (index * 15),
                weight: '${200 + (index * 50)} g',
                imageUrl: 'https://via.placeholder.com/150/26282E/F3F3F3?text=Item+${index + 1}',
              ),
              childCount: 6,
            ),
          ),
        ),
      ],
    );
  }
}
