import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../shared/providers/pos_provider.dart';
import '../../../../shared/widgets/product_card.dart';
import '../../../../models/pos_models.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_radius.dart';

/// Categories tab showing real backend categories and products with images.
class CategoriesTab extends StatefulWidget {
  const CategoriesTab({super.key});

  @override
  State<CategoriesTab> createState() => _CategoriesTabState();
}

class _CategoriesTabState extends State<CategoriesTab> {
  List<PosCategory> _categories = [];
  List<PosItem> _items = [];
  bool _loading = true;
  String? _error;
  String? _selectedCategoryId;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; _error = null; });
    final pos = context.read<PosProvider>();
    try {
      final cats = await pos.loadCategories();
      if (!mounted) return;
      setState(() {
        _categories = cats;
        _selectedCategoryId = cats.isNotEmpty ? cats.first.id : null;
      });
      if (_selectedCategoryId != null) {
        await _loadProducts(_selectedCategoryId);
      } else {
        setState(() => _loading = false);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load categories. Please check your connection.';
        _loading = false;
      });
    }
  }

  Future<void> _loadProducts(String? categoryId) async {
    setState(() => _loading = true);
    final pos = context.read<PosProvider>();
    try {
      final items = await pos.searchItems('', categoryId: categoryId);
      if (!mounted) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load products.';
        _loading = false;
      });
    }
  }

  void _selectCategory(String? catId) {
    setState(() => _selectedCategoryId = catId);
    _loadProducts(catId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDefault,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Category chips
            Container(
              height: 56,
              decoration: const BoxDecoration(
                color: AppColors.surfaceDefault,
                border: Border(bottom: BorderSide(color: AppColors.borderDefault)),
              ),
              child: _categories.isEmpty && !_loading
                  ? Center(
                      child: Text(
                        'No categories available',
                        style: AppTextStyles.bodySm.copyWith(color: AppColors.textSecondary),
                      ),
                    )
                  : ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      children: [
                        _chip('All', selected: _selectedCategoryId == null, onTap: () => _selectCategory(null)),
                        ..._categories.map((c) => _chip(
                              c.name,
                              selected: _selectedCategoryId == c.id,
                              onTap: () => _selectCategory(c.id),
                            )),
                      ],
                    ),
            ),

            // Products grid
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primaryDefault))
                  : _error != null
                      ? _buildErrorState()
                      : _items.isEmpty
                          ? _buildEmptyState()
                          : _buildProductGrid(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, {required bool selected, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryDefault : AppColors.backgroundSubtle,
          borderRadius: AppRadius.borderFull,
          border: Border.all(
            color: selected ? AppColors.primaryDefault : AppColors.borderDefault,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: AppTextStyles.labelSm.copyWith(
            color: selected ? AppColors.primaryOn : AppColors.textSecondary,
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildProductGrid() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.60,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: _items.length,
      itemBuilder: (context, index) {
        final item = _items[index];
        return ProductCard(
          item: item,
          originalPrice: item.price * 1.15, // approximate original price
          weight: '${item.qtyOnHand} in stock',
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.search_off_rounded, color: AppColors.textMuted, size: 64),
          const SizedBox(height: AppSpacing.space3),
          Text(
            'No products in this category yet.',
            style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.space4),
          ElevatedButton.icon(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Reload'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryDefault,
              foregroundColor: AppColors.primaryOn,
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
}
