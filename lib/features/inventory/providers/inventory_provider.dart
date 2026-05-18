import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product.dart';
import '../services/inventory_service.dart';

final inventoryServiceProvider = Provider<InventoryService>((ref) {
  return InventoryService();
});

final inventoryProductsProvider = FutureProvider<List<Product>>((ref) async {
  final service = ref.watch(inventoryServiceProvider);
  return service.getProducts();
});

final selectedCategoryProvider = StateProvider<String?>((ref) => null);

final productSearchQueryProvider = StateProvider<String>((ref) => '');
