import 'package:flutter/material.dart';
import '../../../../models/pos_models.dart';

/// Product grid for the POS left panel, with loading, error, and empty states.
class ProductGrid extends StatelessWidget {
  final List<PosItem> items;
  final PosLoadState loadState;
  final String? loadError;
  final String storeId;
  final bool allowProductAdd;
  final VoidCallback onRetry;
  final ValueChanged<PosItem> onAddToCart;

  const ProductGrid({
    super.key,
    required this.items,
    required this.loadState,
    required this.loadError,
    required this.storeId,
    required this.allowProductAdd,
    required this.onRetry,
    required this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
    if (loadState == PosLoadState.loading) {
      return const Center(
          child: CircularProgressIndicator(color: Color(0xFFE8B84B)));
    }
    if (loadState == PosLoadState.error) {
      final msg = loadError ?? 'Data load failed';
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded,
                color: Colors.redAccent, size: 48),
            const SizedBox(height: 8),
            Text(
              'Data load failed: $msg',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.redAccent),
            ),
            const SizedBox(height: 10),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, color: Colors.black),
              label: const Text('Retry', style: TextStyle(color: Colors.black)),
              style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE8B84B)),
            ),
          ],
        ),
      );
    }
    if (loadState == PosLoadState.empty || items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off_rounded,
                color: Colors.white.withValues(alpha: 0.2), size: 48),
            const SizedBox(height: 8),
            Text(
              'No products found for store $storeId',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.6)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    // Responsive grid: calculate columns based on available width
    final screenWidth = MediaQuery.of(context).size.width;
    final leftPanelWidth = screenWidth * 0.65;
    final crossAxisCount = leftPanelWidth > 800 ? 4 : (leftPanelWidth > 500 ? 3 : 2);
    final childAspectRatio = leftPanelWidth > 800 ? 0.85 : 0.75;

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: childAspectRatio,
      ),
      itemCount: items.length,
      itemBuilder: (ctx, i) => ProductTile(
        item: items[i],
        onTap: allowProductAdd
            ? () => onAddToCart(items[i])
            : null,
        disabledMessage: 'Product loading failed. Retry before adding items.',
      ),
    );
  }
}

/// Product card tile in the grid.
class ProductTile extends StatelessWidget {
  final PosItem item;
  final VoidCallback? onTap;
  final String disabledMessage;

  const ProductTile({
    super.key,
    required this.item,
    required this.onTap,
    this.disabledMessage = '',
  });

  @override
  Widget build(BuildContext context) {
    final outOfStock = item.qtyOnHand <= 0;

    return GestureDetector(
      onTap: outOfStock ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        decoration: BoxDecoration(
          color: const Color(0xFF161B22),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
        ),
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Product image
                Expanded(
                  flex: 5,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(10)),
                    child: item.imageUrl != null
                        ? Image.network(item.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _placeholder())
                        : _placeholder(),
                  ),
                ),
                // Product info
                Expanded(
                  flex: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Flexible(
                          child: Text(item.name,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  height: 1.2),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis),
                        ),
                        const Spacer(),
                        Row(
                          children: [
                            Text('৳${item.price.toStringAsFixed(0)}',
                                style: const TextStyle(
                                    color: Color(0xFFE8B84B),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700),
                                overflow: TextOverflow.ellipsis),
                            const Spacer(flex: 2),
                            Text('${item.qtyOnHand}',
                                style: TextStyle(
                                    color: item.qtyOnHand > 5
                                        ? Colors.white38
                                        : item.qtyOnHand > 0
                                            ? Colors.orange
                                            : Colors.red,
                                    fontSize: 10)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Out of stock overlay
            if (outOfStock)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: const Text('OUT OF STOCK',
                      style: TextStyle(
                          color: Colors.white60,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5)),
                ),
              ),

            // Add indicator (top-right)
            Positioned(
              top: 4,
              right: 4,
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.5),
                    shape: BoxShape.circle),
                child: const Icon(Icons.add, color: Colors.white, size: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      color: Colors.white.withValues(alpha: 0.04),
      child: Icon(Icons.inventory_2_outlined,
          color: Colors.white.withValues(alpha: 0.2), size: 28),
    );
  }
}