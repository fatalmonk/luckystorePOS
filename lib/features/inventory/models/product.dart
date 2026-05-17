class Product {
  final String id;
  final String name;
  final String? nameBn;
  final String sku;
  final String category;
  final double mrp;
  final double sellingPrice;
  final int stockQuantity;
  final int lowStockThreshold;
  final String? imageUrl;
  final String? barcode;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Product({
    required this.id,
    required this.name,
    this.nameBn,
    required this.sku,
    required this.category,
    required this.mrp,
    required this.sellingPrice,
    required this.stockQuantity,
    this.lowStockThreshold = 10,
    this.imageUrl,
    this.barcode,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get hasDiscount => sellingPrice < mrp;
  double get discountAmount => mrp - sellingPrice;
  double get discountPercent => hasDiscount ? (discountAmount / mrp * 100) : 0;

  Product copyWith({
    String? id,
    String? name,
    String? nameBn,
    String? sku,
    String? category,
    double? mrp,
    double? sellingPrice,
    int? stockQuantity,
    int? lowStockThreshold,
    String? imageUrl,
    String? barcode,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Product(
      id: id ?? this.id,
      name: name ?? this.name,
      nameBn: nameBn ?? this.nameBn,
      sku: sku ?? this.sku,
      category: category ?? this.category,
      mrp: mrp ?? this.mrp,
      sellingPrice: sellingPrice ?? this.sellingPrice,
      stockQuantity: stockQuantity ?? this.stockQuantity,
      lowStockThreshold: lowStockThreshold ?? this.lowStockThreshold,
      imageUrl: imageUrl ?? this.imageUrl,
      barcode: barcode ?? this.barcode,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'name_bn': nameBn,
      'sku': sku,
      'category': category,
      'mrp': mrp,
      'selling_price': sellingPrice,
      'stock_quantity': stockQuantity,
      'low_stock_threshold': lowStockThreshold,
      'image_url': imageUrl,
      'barcode': barcode,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as String,
      name: json['name'] as String,
      nameBn: json['name_bn'] as String?,
      sku: json['sku'] as String,
      category: json['category'] as String,
      mrp: (json['mrp'] as num).toDouble(),
      sellingPrice: (json['selling_price'] as num).toDouble(),
      stockQuantity: json['stock_quantity'] as int,
      lowStockThreshold: json['low_stock_threshold'] as int? ?? 10,
      imageUrl: json['image_url'] as String?,
      barcode: json['barcode'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}
