import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/pos_products_provider.dart';
import '../providers/pos_cart_provider.dart';
import '../providers/pos_offline_queue_provider.dart';
import '../providers/pos_search_provider.dart';
import '../widgets/product_grid_item.dart';
import '../widgets/cart_panel.dart';
import '../widgets/favorites_row.dart';
import '../widgets/checkout_dialog.dart';

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> {
  final _searchController = TextEditingController();
  final _searchFocus = FocusNode();

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    ref.read(posSearchProvider.notifier).state = value;
  }

  void _clearSearch() {
    _searchController.clear();
    ref.read(posSearchProvider.notifier).state = '';
  }

  void _showCheckout() {
    final cart = ref.read(posCartProvider);
    if (cart.items.isEmpty) return;

    showDialog(
      context: context,
      builder: (_) => CheckoutDialog(
        total: cart.total,
        onConfirm: _processCheckout,
      ),
    );
  }

  Future<void> _processCheckout(double tendered) async {
    final cart = ref.read(posCartProvider);
    final total = cart.total;

    if (tendered < total) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Insufficient amount')),
        );
      }
      return;
    }

    await ref.read(posOfflineQueueProvider.notifier).queueSale(
      items: cart.items.map((i) => i.toJson()).toList(),
      total: total,
      tendered: tendered,
      change: tendered - total,
    );

    ref.read(posCartProvider.notifier).clear();
    if (mounted) Navigator.pop(context);
  }

  void _showCartBottomSheet() {
    final cart = ref.read(posCartProvider);
    final pendingCount = ref.read(posOfflineQueueProvider).where((s) => s.status == 'pending').length;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, controller) => CartPanel(
          items: cart.items,
          total: cart.total,
          itemCount: cart.itemCount,
          onAddItem: (productId) => ref.read(posCartProvider.notifier).addItem(productId),
          onRemoveItem: (productId) => ref.read(posCartProvider.notifier).removeItem(productId),
          onUpdateQuantity: (productId, qty) => ref.read(posCartProvider.notifier).updateQuantity(productId, qty),
          onClear: () => ref.read(posCartProvider.notifier).clear(),
          onCheckout: () {
            Navigator.pop(context);
            _showCheckout();
          },
          pendingSyncCount: pendingCount,
          scrollController: controller,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isCompact = screenWidth < 600;

    return Scaffold(
      body: isCompact
          ? _buildCompactLayout()
          : _buildExpandedLayout(),
      floatingActionButton: isCompact && ref.watch(posCartProvider).itemCount > 0
          ? FloatingActionButton.extended(
              onPressed: _showCartBottomSheet,
              icon: const Icon(Icons.shopping_cart),
              label: Text('${ref.watch(posCartProvider).itemCount}'),
            )
          : null,
    );
  }

  Widget _buildCompactLayout() {
    final productsAsync = ref.watch(posProductsProvider);
    final searchQuery = ref.watch(posSearchProvider);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _searchController,
            focusNode: _searchFocus,
            onChanged: _onSearchChanged,
            decoration: InputDecoration(
              hintText: 'Search products...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: _clearSearch,
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
        FavoritesRow(
          onProductTap: (productId) => ref.read(posCartProvider.notifier).addItem(productId),
        ),
        Expanded(
          child: productsAsync.when(
            data: (products) {
              if (products.isEmpty) {
                return const Center(child: Text('No products found'));
              }
              return GridView.builder(
                padding: const EdgeInsets.all(12),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.75,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: products.length,
                itemBuilder: (_, index) => ProductGridItem(
                  product: products[index],
                  onTap: () => ref.read(posCartProvider.notifier).addItem(products[index].id),
                ),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Error: $e')),
          ),
        ),
      ],
    );
  }

  Widget _buildExpandedLayout() {
    final productsAsync = ref.watch(posProductsProvider);
    final cart = ref.watch(posCartProvider);
    final pendingCount = ref.watch(posOfflineQueueProvider).where((s) => s.status == 'pending').length;
    final searchQuery = ref.watch(posSearchProvider);

    return Row(
      children: [
        Expanded(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: TextField(
                  controller: _searchController,
                  focusNode: _searchFocus,
                  onChanged: _onSearchChanged,
                  decoration: InputDecoration(
                    hintText: 'Search products...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: _clearSearch,
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              FavoritesRow(
                onProductTap: (productId) => ref.read(posCartProvider.notifier).addItem(productId),
              ),
              Expanded(
                child: productsAsync.when(
                  data: (products) {
                    if (products.isEmpty) {
                      return const Center(child: Text('No products found'));
                    }
                    return GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.75,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: products.length,
                      itemBuilder: (_, index) => ProductGridItem(
                        product: products[index],
                        onTap: () => ref.read(posCartProvider.notifier).addItem(products[index].id),
                      ),
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('Error: $e')),
                ),
              ),
            ],
          ),
        ),
        Container(
          width: 360,
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(color: Theme.of(context).dividerColor),
            ),
          ),
          child: CartPanel(
            items: cart.items,
            total: cart.total,
            itemCount: cart.itemCount,
            onAddItem: (productId) => ref.read(posCartProvider.notifier).addItem(productId),
            onRemoveItem: (productId) => ref.read(posCartProvider.notifier).removeItem(productId),
            onUpdateQuantity: (productId, qty) => ref.read(posCartProvider.notifier).updateQuantity(productId, qty),
            onClear: () => ref.read(posCartProvider.notifier).clear(),
            onCheckout: _showCheckout,
            pendingSyncCount: pendingCount,
          ),
        ),
      ],
    );
  }
}
