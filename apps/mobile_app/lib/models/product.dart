/// Core data models for Lucky Store mobile app
library;

class Product {
  final int productId;
  final String title;
  final String brand;
  final String? description;
  final int categoryId;
  final List<Variant> variants;

  const Product({
    required this.productId,
    required this.title,
    required this.brand,
    this.description,
    required this.categoryId,
    this.variants = const [],
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      productId: json['product_id'] as int,
      title: json['title'] as String,
      brand: json['brand'] as String? ?? '',
      description: json['base_description'] as String?,
      categoryId: json['category_id'] as int,
      variants: (json['variants'] as List<dynamic>? ?? [])
          .map((v) => Variant.fromJson(v as Map<String, dynamic>))
          .toList(),
    );
  }
}

class Variant {
  final String skuId;
  final double price;
  final double? originalPrice;
  final String weight;
  final int stockLevel;

  const Variant({
    required this.skuId,
    required this.price,
    this.originalPrice,
    required this.weight,
    required this.stockLevel,
  });

  factory Variant.fromJson(Map<String, dynamic> json) {
    return Variant(
      skuId: json['sku_id'] as String,
      price: (json['price'] as num).toDouble(),
      originalPrice: json['original_price'] != null
          ? (json['original_price'] as num).toDouble()
          : null,
      weight: json['weight'] as String? ?? '',
      stockLevel: json['stock_level'] as int? ?? 0,
    );
  }

  int get discountPercent {
    if (originalPrice == null || originalPrice! <= price) return 0;
    return (((originalPrice! - price) / originalPrice!) * 100).round();
  }

  bool get inStock => stockLevel > 0;
}
