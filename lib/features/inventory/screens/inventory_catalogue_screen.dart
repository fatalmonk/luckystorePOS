import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_typography.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_search_bar.dart';
import '../models/product.dart';
import '../providers/inventory_provider.dart';
import '../widgets/product_grid_card.dart';
import '../widgets/category_tabs.dart';

class InventoryCatalogueScreen extends ConsumerStatefulWidget {
  const InventoryCatalogueScreen({super.key});

  @override
  ConsumerState<InventoryCatalogueScreen> createState() => _InventoryCatalogueScreenState();
}

class _InventoryCatalogueScreenState extends ConsumerState<InventoryCatalogueScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(inventoryProductsProvider);
    final selectedCategory = ref.watch(selectedCategoryProvider);
    final searchQuery = ref.watch(productSearchQueryProvider);

    return AppScaffold(
      title: 'Inventory Catalogue',
      body: Column(
        children: [
          Padding(
            padding: AppSpacing.paddingAll16,
            child: AppSearchBar(
              controller: _searchController,
              hintText: 'Search products...',
              onChanged: (value) {
                ref.read(productSearchQueryProvider.notifier).state = value;
              },
              onClear: () {
                _searchController.clear();
                ref.read(productSearchQueryProvider.notifier).state = '';
              },
            ),
          ),
          const CategoryTabs(),
          Expanded(
            child: productsAsync.when(
              data: (products) {
                final filteredProducts = _filterProducts(
                  products,
                  selectedCategory,
                  searchQuery,
                );

                if (filteredProducts.isEmpty) {
                  return _buildEmptyState();
                }

                return _buildProductGrid(filteredProducts);
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(
                child: Text(
                  'Error loading products',
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.error,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Product> _filterProducts(
    List<Product> products,
    String? category,
    String query,
  ) {
    return products.where((product) {
      final matchesCategory = category == null ||
          category == 'All' ||
          product.category == category;
      final matchesSearch = query.isEmpty ||
          product.name.toLowerCase().contains(query.toLowerCase()) ||
          product.sku.toLowerCase().contains(query.toLowerCase());
      return matchesCategory && matchesSearch;
    }).toList();
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inventory_2_outlined,
            size: 64,
            color: AppColors.grey400,
          ),
          AppSpacing.vertical16,
          Text(
            'No products found',
            style: AppTypography.bodyLarge.copyWith(
              color: AppColors.grey600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductGrid(List<Product> products) {
    return GridView.builder(
      padding: AppSpacing.paddingAll16,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.75,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        return ProductGridCard(product: products[index]);
      },
    );
  }
}
