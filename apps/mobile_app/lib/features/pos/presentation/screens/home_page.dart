/// Home page for POS system with adaptive layout.
/// Supports split-screen for tablets (products grid + cart)
/// and single column for phones.

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../shared/providers/pos_provider.dart';
import '../../../../core/services/printer/printer_test_screen.dart';
import '../../../inventory/presentation/screens/bulk_label_print_screen.dart';

/// Adaptive home page that shows different layouts based on device size.
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final isPortrait = MediaQuery.of(context).size.shortestSide < 600;

    return isPortrait ? _buildMobileView(context) : _buildTabletView(context);
  }

  Widget _buildMobileView(BuildContext context) {
    return Consumer<PosProvider>(
      builder: (context, posProvider, child) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Lucky Store POS'),
            actions: [
              // Bulk Label Print
              IconButton(
                icon: const Icon(Icons.print_outlined),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const BulkLabelPrintScreen(),
                    ),
                  );
                },
                tooltip: 'Bulk Print Labels',
              ),
              // Printer Test (for debugging)
              IconButton(
                icon: const Icon(Icons.bug_report_outlined),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const PrinterTestScreen(),
                    ),
                  );
                },
                tooltip: 'Test Printer',
              ),
              IconButton(
                icon: const Icon(Icons.shopping_cart),
                onPressed: () => posProvider.openCart(),
                tooltip: 'View Cart',
              ),
              IconButton(
                icon: const Icon(Icons.settings),
                onPressed: () => posProvider.openSettings(),
                tooltip: 'Settings',
              ),
            ],
          ),
          body: _buildProductGrid(context, posProvider),
        );
      },
    );
  }

  Widget _buildTabletView(BuildContext context) {
    return Consumer<PosProvider>(
      builder: (context, posProvider, _) {
        return Scaffold(
          body: Row(
            children: [
              // Left: Product Grid
              Expanded(
                flex: 2,
                child: _buildSplitProductGrid(context, posProvider),
              ),
              // Right: Cart
              Container(
                width: 400,
                decoration: const BoxDecoration(
                  border: Border(
                    left: BorderSide(color: Colors.grey),
                  ),
                ),
                child: _buildSplitCart(context, posProvider),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildProductGrid(BuildContext context, PosProvider posProvider) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 1.5,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
      ),
      itemCount: posProvider.inventory.length,
      itemBuilder: (context, index) {
        final item = posProvider.inventory[index];
        return _buildProductCard(context, item, posProvider);
      },
    );
  }

  Widget _buildSplitProductGrid(BuildContext context, PosProvider posProvider) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: posProvider.inventory.length,
      itemBuilder: (context, index) {
        final item = posProvider.inventory[index];
        return _buildProductCard(context, item, posProvider);
      },
    );
  }

  Widget _buildProductCard(BuildContext context, dynamic item, PosProvider posProvider) {
    return Card(
      child: InkWell(
        onTap: () {
          posProvider.addToCart(
            productId: item.id,
            productName: item.name,
            price: item.price,
            qty: 1,
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.name,
                style: const TextStyle(fontWeight: FontWeight.bold),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Text(
                '\$${item.price.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 4),
              Text(
                'Stock: ${item.stock}',
                style: TextStyle(
                  color: item.stock > 0 ? Colors.green : Colors.red,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSplitCart(BuildContext context, PosProvider posProvider) {
    return Consumer<PosProvider>(
      builder: (context, posProvider, _) {
        return Container(
          // Cart implementation
          child: const Text('Cart placeholder'),
        );
      },
    );
  }
}
