import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../shared/providers/pos_provider.dart';
import '../../../../shared/widgets/product_card.dart';
import '../../../../models/pos_models.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_shadows.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_spacing.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<PosItem> _items = [];
  List<PosCategory> _categories = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; _error = null; });
    final pos = context.read<PosProvider>();
    try {
      final catalog = await pos.loadProductCatalog();
      if (!mounted) return;
      setState(() {
        _items = catalog.items;
        _categories = catalog.categories;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load products. Please check your connection.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primaryDefault))
          : _error != null
              ? _buildErrorState()
              : CustomScrollView(
                  slivers: [
                    // Pinned Search Bar
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
                            hintText: 'Search products...',
                            hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.textMuted),
                            prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primaryDefault),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          ),
                          onTap: () {
                            // Switch to search tab
                            // This requires access to MainScaffold state; for now just focus
                          },
                        ),
                      ),
                    ),

                    SliverPadding(
                      padding: const EdgeInsets.all(16.0),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          // Promotional banners
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
                                    image: DecorationImage(
                                      image: NetworkImage(
                                        'https://via.placeholder.com/400x160/${_bannerColors[index]}/FFFFFF?text=${Uri.encodeComponent(_bannerLabels[index])}',
                                      ),
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      borderRadius: AppRadius.borderLg,
                                      gradient: LinearGradient(
                                        begin: Alignment.bottomRight,
                                        colors: [
                                          AppColors.primitiveNeutral900.withValues(alpha: 0.6),
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

                          // Real category grid
                          _categories.isEmpty
                              ? _buildStaticCategories()
                              : GridView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 4,
                                    childAspectRatio: 0.8,
                                    crossAxisSpacing: 16,
                                    mainAxisSpacing: 20,
                                  ),
                                  itemCount: _categories.length.clamp(0, 8),
                                  itemBuilder: (context, index) {
                                    final cat = _categories[index];
                                    return Column(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: AppColors.primarySubtle,
                                            borderRadius: AppRadius.borderMd,
                                          ),
                                          child: Icon(
                                            _categoryIcons[index % _categoryIcons.length],
                                            color: AppColors.primaryDefault,
                                            size: 28,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          cat.name,
                                          style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
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

                    // Real product grid
                    _items.isEmpty
                        ? const SliverToBoxAdapter(
                            child: Center(
                              child: Padding(
                                padding: EdgeInsets.all(32),
                                child: Text('No products available yet.'),
                              ),
                            ),
                          )
                        : SliverPadding(
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
                                  final item = _items[index];
                                  return ProductCard(
                                    item: item,
                                    originalPrice: item.price * 1.15,
                                    weight: '${item.qtyOnHand} in stock',
                                  );
                                },
                                childCount: _items.length.clamp(0, 20),
                              ),
                            ),
                          ),
                  ],
                ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline_rounded, color: AppColors.dangerDefault, size: 64),
          const SizedBox(height: AppSpacing.space3),
          Text(
            _error!,
            style: AppTextStyles.bodyMd.copyWith(color: AppColors.dangerDefault),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.space4),
          ElevatedButton.icon(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryDefault,
              foregroundColor: AppColors.primaryOn,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStaticCategories() {
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
    final labels = ['Fruits', 'Bakery', 'Dairy', 'Drinks', 'Cleaning', 'Pharma', 'Pets', 'Toys'];
    return GridView.builder(
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
        return Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primarySubtle,
                borderRadius: AppRadius.borderMd,
              ),
              child: Icon(icons[index], color: AppColors.primaryDefault, size: 28),
            ),
            const SizedBox(height: 8),
            Text(
              labels[index],
              style: AppTextStyles.labelSm.copyWith(color: AppColors.textSecondary),
            ),
          ],
        );
      },
    );
  }

  static const _bannerColors = ['6366F1', '10B981', 'F59E0B'];
  static const _bannerLabels = ['Premium Collection', 'Fresh Deals', 'Flash Sale'];
  static const _categoryIcons = [
    Icons.apple_rounded,
    Icons.bakery_dining_rounded,
    Icons.egg_rounded,
    Icons.local_drink_rounded,
    Icons.cleaning_services_rounded,
    Icons.medical_services_rounded,
    Icons.pets_rounded,
    Icons.toys_rounded,
  ];
}
