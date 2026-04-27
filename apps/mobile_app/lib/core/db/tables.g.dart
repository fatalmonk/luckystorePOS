// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tables.dart';

// ignore_for_file: type=lint
class $ProductsTable extends Products with TableInfo<$ProductsTable, Product> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ProductsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _skuMeta = const VerificationMeta('sku');
  @override
  late final GeneratedColumn<String> sku = GeneratedColumn<String>(
      'sku', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _barcodeMeta =
      const VerificationMeta('barcode');
  @override
  late final GeneratedColumn<String> barcode = GeneratedColumn<String>(
      'barcode', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _mrpMeta = const VerificationMeta('mrp');
  @override
  late final GeneratedColumn<double> mrp = GeneratedColumn<double>(
      'mrp', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _sellingPriceMeta =
      const VerificationMeta('sellingPrice');
  @override
  late final GeneratedColumn<double> sellingPrice = GeneratedColumn<double>(
      'selling_price', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _categoryIdMeta =
      const VerificationMeta('categoryId');
  @override
  late final GeneratedColumn<String> categoryId = GeneratedColumn<String>(
      'category_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _storeIdMeta =
      const VerificationMeta('storeId');
  @override
  late final GeneratedColumn<String> storeId = GeneratedColumn<String>(
      'store_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _stockQuantityMeta =
      const VerificationMeta('stockQuantity');
  @override
  late final GeneratedColumn<int> stockQuantity = GeneratedColumn<int>(
      'stock_quantity', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _unitMeta = const VerificationMeta('unit');
  @override
  late final GeneratedColumn<String> unit = GeneratedColumn<String>(
      'unit', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _descriptionMeta =
      const VerificationMeta('description');
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
      'description', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _syncIdMeta = const VerificationMeta('syncId');
  @override
  late final GeneratedColumn<String> syncId = GeneratedColumn<String>(
      'sync_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        sku,
        name,
        barcode,
        mrp,
        sellingPrice,
        categoryId,
        storeId,
        stockQuantity,
        unit,
        description,
        createdAt,
        updatedAt,
        syncStatus,
        syncId
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'products';
  @override
  VerificationContext validateIntegrity(Insertable<Product> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('sku')) {
      context.handle(
          _skuMeta, sku.isAcceptableOrUnknown(data['sku']!, _skuMeta));
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    }
    if (data.containsKey('barcode')) {
      context.handle(_barcodeMeta,
          barcode.isAcceptableOrUnknown(data['barcode']!, _barcodeMeta));
    }
    if (data.containsKey('mrp')) {
      context.handle(
          _mrpMeta, mrp.isAcceptableOrUnknown(data['mrp']!, _mrpMeta));
    }
    if (data.containsKey('selling_price')) {
      context.handle(
          _sellingPriceMeta,
          sellingPrice.isAcceptableOrUnknown(
              data['selling_price']!, _sellingPriceMeta));
    }
    if (data.containsKey('category_id')) {
      context.handle(
          _categoryIdMeta,
          categoryId.isAcceptableOrUnknown(
              data['category_id']!, _categoryIdMeta));
    }
    if (data.containsKey('store_id')) {
      context.handle(_storeIdMeta,
          storeId.isAcceptableOrUnknown(data['store_id']!, _storeIdMeta));
    } else if (isInserting) {
      context.missing(_storeIdMeta);
    }
    if (data.containsKey('stock_quantity')) {
      context.handle(
          _stockQuantityMeta,
          stockQuantity.isAcceptableOrUnknown(
              data['stock_quantity']!, _stockQuantityMeta));
    } else if (isInserting) {
      context.missing(_stockQuantityMeta);
    }
    if (data.containsKey('unit')) {
      context.handle(
          _unitMeta, unit.isAcceptableOrUnknown(data['unit']!, _unitMeta));
    }
    if (data.containsKey('description')) {
      context.handle(
          _descriptionMeta,
          description.isAcceptableOrUnknown(
              data['description']!, _descriptionMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('sync_id')) {
      context.handle(_syncIdMeta,
          syncId.isAcceptableOrUnknown(data['sync_id']!, _syncIdMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => const {};
  @override
  Product map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Product(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      sku: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sku']),
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name']),
      barcode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}barcode']),
      mrp: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}mrp']),
      sellingPrice: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}selling_price']),
      categoryId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}category_id']),
      storeId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}store_id'])!,
      stockQuantity: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}stock_quantity'])!,
      unit: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}unit']),
      description: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}description']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_status'])!,
      syncId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_id']),
    );
  }

  @override
  $ProductsTable createAlias(String alias) {
    return $ProductsTable(attachedDatabase, alias);
  }
}

class Product extends DataClass implements Insertable<Product> {
  final String id;
  final String? sku;
  final String? name;
  final String? barcode;
  final double? mrp;
  final double? sellingPrice;
  final String? categoryId;
  final String storeId;
  final int stockQuantity;
  final String? unit;
  final String? description;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String syncStatus;
  final String? syncId;
  const Product(
      {required this.id,
      this.sku,
      this.name,
      this.barcode,
      this.mrp,
      this.sellingPrice,
      this.categoryId,
      required this.storeId,
      required this.stockQuantity,
      this.unit,
      this.description,
      required this.createdAt,
      required this.updatedAt,
      required this.syncStatus,
      this.syncId});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || sku != null) {
      map['sku'] = Variable<String>(sku);
    }
    if (!nullToAbsent || name != null) {
      map['name'] = Variable<String>(name);
    }
    if (!nullToAbsent || barcode != null) {
      map['barcode'] = Variable<String>(barcode);
    }
    if (!nullToAbsent || mrp != null) {
      map['mrp'] = Variable<double>(mrp);
    }
    if (!nullToAbsent || sellingPrice != null) {
      map['selling_price'] = Variable<double>(sellingPrice);
    }
    if (!nullToAbsent || categoryId != null) {
      map['category_id'] = Variable<String>(categoryId);
    }
    map['store_id'] = Variable<String>(storeId);
    map['stock_quantity'] = Variable<int>(stockQuantity);
    if (!nullToAbsent || unit != null) {
      map['unit'] = Variable<String>(unit);
    }
    if (!nullToAbsent || description != null) {
      map['description'] = Variable<String>(description);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    map['sync_status'] = Variable<String>(syncStatus);
    if (!nullToAbsent || syncId != null) {
      map['sync_id'] = Variable<String>(syncId);
    }
    return map;
  }

  ProductsCompanion toCompanion(bool nullToAbsent) {
    return ProductsCompanion(
      id: Value(id),
      sku: sku == null && nullToAbsent ? const Value.absent() : Value(sku),
      name: name == null && nullToAbsent ? const Value.absent() : Value(name),
      barcode: barcode == null && nullToAbsent
          ? const Value.absent()
          : Value(barcode),
      mrp: mrp == null && nullToAbsent ? const Value.absent() : Value(mrp),
      sellingPrice: sellingPrice == null && nullToAbsent
          ? const Value.absent()
          : Value(sellingPrice),
      categoryId: categoryId == null && nullToAbsent
          ? const Value.absent()
          : Value(categoryId),
      storeId: Value(storeId),
      stockQuantity: Value(stockQuantity),
      unit: unit == null && nullToAbsent ? const Value.absent() : Value(unit),
      description: description == null && nullToAbsent
          ? const Value.absent()
          : Value(description),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      syncStatus: Value(syncStatus),
      syncId:
          syncId == null && nullToAbsent ? const Value.absent() : Value(syncId),
    );
  }

  factory Product.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Product(
      id: serializer.fromJson<String>(json['id']),
      sku: serializer.fromJson<String?>(json['sku']),
      name: serializer.fromJson<String?>(json['name']),
      barcode: serializer.fromJson<String?>(json['barcode']),
      mrp: serializer.fromJson<double?>(json['mrp']),
      sellingPrice: serializer.fromJson<double?>(json['sellingPrice']),
      categoryId: serializer.fromJson<String?>(json['categoryId']),
      storeId: serializer.fromJson<String>(json['storeId']),
      stockQuantity: serializer.fromJson<int>(json['stockQuantity']),
      unit: serializer.fromJson<String?>(json['unit']),
      description: serializer.fromJson<String?>(json['description']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      syncId: serializer.fromJson<String?>(json['syncId']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'sku': serializer.toJson<String?>(sku),
      'name': serializer.toJson<String?>(name),
      'barcode': serializer.toJson<String?>(barcode),
      'mrp': serializer.toJson<double?>(mrp),
      'sellingPrice': serializer.toJson<double?>(sellingPrice),
      'categoryId': serializer.toJson<String?>(categoryId),
      'storeId': serializer.toJson<String>(storeId),
      'stockQuantity': serializer.toJson<int>(stockQuantity),
      'unit': serializer.toJson<String?>(unit),
      'description': serializer.toJson<String?>(description),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'syncId': serializer.toJson<String?>(syncId),
    };
  }

  Product copyWith(
          {String? id,
          Value<String?> sku = const Value.absent(),
          Value<String?> name = const Value.absent(),
          Value<String?> barcode = const Value.absent(),
          Value<double?> mrp = const Value.absent(),
          Value<double?> sellingPrice = const Value.absent(),
          Value<String?> categoryId = const Value.absent(),
          String? storeId,
          int? stockQuantity,
          Value<String?> unit = const Value.absent(),
          Value<String?> description = const Value.absent(),
          DateTime? createdAt,
          DateTime? updatedAt,
          String? syncStatus,
          Value<String?> syncId = const Value.absent()}) =>
      Product(
        id: id ?? this.id,
        sku: sku.present ? sku.value : this.sku,
        name: name.present ? name.value : this.name,
        barcode: barcode.present ? barcode.value : this.barcode,
        mrp: mrp.present ? mrp.value : this.mrp,
        sellingPrice:
            sellingPrice.present ? sellingPrice.value : this.sellingPrice,
        categoryId: categoryId.present ? categoryId.value : this.categoryId,
        storeId: storeId ?? this.storeId,
        stockQuantity: stockQuantity ?? this.stockQuantity,
        unit: unit.present ? unit.value : this.unit,
        description: description.present ? description.value : this.description,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        syncStatus: syncStatus ?? this.syncStatus,
        syncId: syncId.present ? syncId.value : this.syncId,
      );
  Product copyWithCompanion(ProductsCompanion data) {
    return Product(
      id: data.id.present ? data.id.value : this.id,
      sku: data.sku.present ? data.sku.value : this.sku,
      name: data.name.present ? data.name.value : this.name,
      barcode: data.barcode.present ? data.barcode.value : this.barcode,
      mrp: data.mrp.present ? data.mrp.value : this.mrp,
      sellingPrice: data.sellingPrice.present
          ? data.sellingPrice.value
          : this.sellingPrice,
      categoryId:
          data.categoryId.present ? data.categoryId.value : this.categoryId,
      storeId: data.storeId.present ? data.storeId.value : this.storeId,
      stockQuantity: data.stockQuantity.present
          ? data.stockQuantity.value
          : this.stockQuantity,
      unit: data.unit.present ? data.unit.value : this.unit,
      description:
          data.description.present ? data.description.value : this.description,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      syncId: data.syncId.present ? data.syncId.value : this.syncId,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Product(')
          ..write('id: $id, ')
          ..write('sku: $sku, ')
          ..write('name: $name, ')
          ..write('barcode: $barcode, ')
          ..write('mrp: $mrp, ')
          ..write('sellingPrice: $sellingPrice, ')
          ..write('categoryId: $categoryId, ')
          ..write('storeId: $storeId, ')
          ..write('stockQuantity: $stockQuantity, ')
          ..write('unit: $unit, ')
          ..write('description: $description, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('syncId: $syncId')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      sku,
      name,
      barcode,
      mrp,
      sellingPrice,
      categoryId,
      storeId,
      stockQuantity,
      unit,
      description,
      createdAt,
      updatedAt,
      syncStatus,
      syncId);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Product &&
          other.id == this.id &&
          other.sku == this.sku &&
          other.name == this.name &&
          other.barcode == this.barcode &&
          other.mrp == this.mrp &&
          other.sellingPrice == this.sellingPrice &&
          other.categoryId == this.categoryId &&
          other.storeId == this.storeId &&
          other.stockQuantity == this.stockQuantity &&
          other.unit == this.unit &&
          other.description == this.description &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.syncStatus == this.syncStatus &&
          other.syncId == this.syncId);
}

class ProductsCompanion extends UpdateCompanion<Product> {
  final Value<String> id;
  final Value<String?> sku;
  final Value<String?> name;
  final Value<String?> barcode;
  final Value<double?> mrp;
  final Value<double?> sellingPrice;
  final Value<String?> categoryId;
  final Value<String> storeId;
  final Value<int> stockQuantity;
  final Value<String?> unit;
  final Value<String?> description;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<String> syncStatus;
  final Value<String?> syncId;
  final Value<int> rowid;
  const ProductsCompanion({
    this.id = const Value.absent(),
    this.sku = const Value.absent(),
    this.name = const Value.absent(),
    this.barcode = const Value.absent(),
    this.mrp = const Value.absent(),
    this.sellingPrice = const Value.absent(),
    this.categoryId = const Value.absent(),
    this.storeId = const Value.absent(),
    this.stockQuantity = const Value.absent(),
    this.unit = const Value.absent(),
    this.description = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.syncId = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ProductsCompanion.insert({
    required String id,
    this.sku = const Value.absent(),
    this.name = const Value.absent(),
    this.barcode = const Value.absent(),
    this.mrp = const Value.absent(),
    this.sellingPrice = const Value.absent(),
    this.categoryId = const Value.absent(),
    required String storeId,
    required int stockQuantity,
    this.unit = const Value.absent(),
    this.description = const Value.absent(),
    required DateTime createdAt,
    required DateTime updatedAt,
    this.syncStatus = const Value.absent(),
    this.syncId = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        storeId = Value(storeId),
        stockQuantity = Value(stockQuantity),
        createdAt = Value(createdAt),
        updatedAt = Value(updatedAt);
  static Insertable<Product> custom({
    Expression<String>? id,
    Expression<String>? sku,
    Expression<String>? name,
    Expression<String>? barcode,
    Expression<double>? mrp,
    Expression<double>? sellingPrice,
    Expression<String>? categoryId,
    Expression<String>? storeId,
    Expression<int>? stockQuantity,
    Expression<String>? unit,
    Expression<String>? description,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<String>? syncStatus,
    Expression<String>? syncId,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (sku != null) 'sku': sku,
      if (name != null) 'name': name,
      if (barcode != null) 'barcode': barcode,
      if (mrp != null) 'mrp': mrp,
      if (sellingPrice != null) 'selling_price': sellingPrice,
      if (categoryId != null) 'category_id': categoryId,
      if (storeId != null) 'store_id': storeId,
      if (stockQuantity != null) 'stock_quantity': stockQuantity,
      if (unit != null) 'unit': unit,
      if (description != null) 'description': description,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (syncId != null) 'sync_id': syncId,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ProductsCompanion copyWith(
      {Value<String>? id,
      Value<String?>? sku,
      Value<String?>? name,
      Value<String?>? barcode,
      Value<double?>? mrp,
      Value<double?>? sellingPrice,
      Value<String?>? categoryId,
      Value<String>? storeId,
      Value<int>? stockQuantity,
      Value<String?>? unit,
      Value<String?>? description,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<String>? syncStatus,
      Value<String?>? syncId,
      Value<int>? rowid}) {
    return ProductsCompanion(
      id: id ?? this.id,
      sku: sku ?? this.sku,
      name: name ?? this.name,
      barcode: barcode ?? this.barcode,
      mrp: mrp ?? this.mrp,
      sellingPrice: sellingPrice ?? this.sellingPrice,
      categoryId: categoryId ?? this.categoryId,
      storeId: storeId ?? this.storeId,
      stockQuantity: stockQuantity ?? this.stockQuantity,
      unit: unit ?? this.unit,
      description: description ?? this.description,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncStatus: syncStatus ?? this.syncStatus,
      syncId: syncId ?? this.syncId,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (sku.present) {
      map['sku'] = Variable<String>(sku.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (barcode.present) {
      map['barcode'] = Variable<String>(barcode.value);
    }
    if (mrp.present) {
      map['mrp'] = Variable<double>(mrp.value);
    }
    if (sellingPrice.present) {
      map['selling_price'] = Variable<double>(sellingPrice.value);
    }
    if (categoryId.present) {
      map['category_id'] = Variable<String>(categoryId.value);
    }
    if (storeId.present) {
      map['store_id'] = Variable<String>(storeId.value);
    }
    if (stockQuantity.present) {
      map['stock_quantity'] = Variable<int>(stockQuantity.value);
    }
    if (unit.present) {
      map['unit'] = Variable<String>(unit.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (syncId.present) {
      map['sync_id'] = Variable<String>(syncId.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ProductsCompanion(')
          ..write('id: $id, ')
          ..write('sku: $sku, ')
          ..write('name: $name, ')
          ..write('barcode: $barcode, ')
          ..write('mrp: $mrp, ')
          ..write('sellingPrice: $sellingPrice, ')
          ..write('categoryId: $categoryId, ')
          ..write('storeId: $storeId, ')
          ..write('stockQuantity: $stockQuantity, ')
          ..write('unit: $unit, ')
          ..write('description: $description, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('syncId: $syncId, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineSalesTable extends OfflineSales
    with TableInfo<$OfflineSalesTable, OfflineSale> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineSalesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _saleIdMeta = const VerificationMeta('saleId');
  @override
  late final GeneratedColumn<String> saleId = GeneratedColumn<String>(
      'sale_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _orderIdMeta =
      const VerificationMeta('orderId');
  @override
  late final GeneratedColumn<String> orderId = GeneratedColumn<String>(
      'order_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _storeIdMeta =
      const VerificationMeta('storeId');
  @override
  late final GeneratedColumn<String> storeId = GeneratedColumn<String>(
      'store_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _cashierIdMeta =
      const VerificationMeta('cashierId');
  @override
  late final GeneratedColumn<String> cashierId = GeneratedColumn<String>(
      'cashier_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _customerIdMeta =
      const VerificationMeta('customerId');
  @override
  late final GeneratedColumn<String> customerId = GeneratedColumn<String>(
      'customer_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _totalAmountMeta =
      const VerificationMeta('totalAmount');
  @override
  late final GeneratedColumn<int> totalAmount = GeneratedColumn<int>(
      'total_amount', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _paymentAmountMeta =
      const VerificationMeta('paymentAmount');
  @override
  late final GeneratedColumn<int> paymentAmount = GeneratedColumn<int>(
      'payment_amount', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _changeAmountMeta =
      const VerificationMeta('changeAmount');
  @override
  late final GeneratedColumn<int> changeAmount = GeneratedColumn<int>(
      'change_amount', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _paymentModeMeta =
      const VerificationMeta('paymentMode');
  @override
  late final GeneratedColumn<int> paymentMode = GeneratedColumn<int>(
      'payment_mode', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _paymentReferenceMeta =
      const VerificationMeta('paymentReference');
  @override
  late final GeneratedColumn<String> paymentReference = GeneratedColumn<String>(
      'payment_reference', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _saleTimeMeta =
      const VerificationMeta('saleTime');
  @override
  late final GeneratedColumn<DateTime> saleTime = GeneratedColumn<DateTime>(
      'sale_time', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _itemCountMeta =
      const VerificationMeta('itemCount');
  @override
  late final GeneratedColumn<int> itemCount = GeneratedColumn<int>(
      'item_count', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _errorMeta = const VerificationMeta('error');
  @override
  late final GeneratedColumn<String> error = GeneratedColumn<String>(
      'error', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _retryCountMeta =
      const VerificationMeta('retryCount');
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
      'retry_count', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        saleId,
        orderId,
        storeId,
        cashierId,
        customerId,
        totalAmount,
        paymentAmount,
        changeAmount,
        paymentMode,
        paymentReference,
        saleTime,
        itemCount,
        syncStatus,
        error,
        retryCount,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_sales';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineSale> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('sale_id')) {
      context.handle(_saleIdMeta,
          saleId.isAcceptableOrUnknown(data['sale_id']!, _saleIdMeta));
    }
    if (data.containsKey('order_id')) {
      context.handle(_orderIdMeta,
          orderId.isAcceptableOrUnknown(data['order_id']!, _orderIdMeta));
    }
    if (data.containsKey('store_id')) {
      context.handle(_storeIdMeta,
          storeId.isAcceptableOrUnknown(data['store_id']!, _storeIdMeta));
    } else if (isInserting) {
      context.missing(_storeIdMeta);
    }
    if (data.containsKey('cashier_id')) {
      context.handle(_cashierIdMeta,
          cashierId.isAcceptableOrUnknown(data['cashier_id']!, _cashierIdMeta));
    }
    if (data.containsKey('customer_id')) {
      context.handle(
          _customerIdMeta,
          customerId.isAcceptableOrUnknown(
              data['customer_id']!, _customerIdMeta));
    }
    if (data.containsKey('total_amount')) {
      context.handle(
          _totalAmountMeta,
          totalAmount.isAcceptableOrUnknown(
              data['total_amount']!, _totalAmountMeta));
    } else if (isInserting) {
      context.missing(_totalAmountMeta);
    }
    if (data.containsKey('payment_amount')) {
      context.handle(
          _paymentAmountMeta,
          paymentAmount.isAcceptableOrUnknown(
              data['payment_amount']!, _paymentAmountMeta));
    } else if (isInserting) {
      context.missing(_paymentAmountMeta);
    }
    if (data.containsKey('change_amount')) {
      context.handle(
          _changeAmountMeta,
          changeAmount.isAcceptableOrUnknown(
              data['change_amount']!, _changeAmountMeta));
    } else if (isInserting) {
      context.missing(_changeAmountMeta);
    }
    if (data.containsKey('payment_mode')) {
      context.handle(
          _paymentModeMeta,
          paymentMode.isAcceptableOrUnknown(
              data['payment_mode']!, _paymentModeMeta));
    }
    if (data.containsKey('payment_reference')) {
      context.handle(
          _paymentReferenceMeta,
          paymentReference.isAcceptableOrUnknown(
              data['payment_reference']!, _paymentReferenceMeta));
    }
    if (data.containsKey('sale_time')) {
      context.handle(_saleTimeMeta,
          saleTime.isAcceptableOrUnknown(data['sale_time']!, _saleTimeMeta));
    } else if (isInserting) {
      context.missing(_saleTimeMeta);
    }
    if (data.containsKey('item_count')) {
      context.handle(_itemCountMeta,
          itemCount.isAcceptableOrUnknown(data['item_count']!, _itemCountMeta));
    } else if (isInserting) {
      context.missing(_itemCountMeta);
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('error')) {
      context.handle(
          _errorMeta, error.isAcceptableOrUnknown(data['error']!, _errorMeta));
    }
    if (data.containsKey('retry_count')) {
      context.handle(
          _retryCountMeta,
          retryCount.isAcceptableOrUnknown(
              data['retry_count']!, _retryCountMeta));
    } else if (isInserting) {
      context.missing(_retryCountMeta);
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => const {};
  @override
  OfflineSale map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineSale(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      saleId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sale_id']),
      orderId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}order_id']),
      storeId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}store_id'])!,
      cashierId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}cashier_id']),
      customerId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}customer_id']),
      totalAmount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}total_amount'])!,
      paymentAmount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}payment_amount'])!,
      changeAmount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}change_amount'])!,
      paymentMode: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}payment_mode']),
      paymentReference: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}payment_reference']),
      saleTime: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}sale_time'])!,
      itemCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}item_count'])!,
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_status'])!,
      error: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}error']),
      retryCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}retry_count'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $OfflineSalesTable createAlias(String alias) {
    return $OfflineSalesTable(attachedDatabase, alias);
  }
}

class OfflineSale extends DataClass implements Insertable<OfflineSale> {
  final String id;
  final String? saleId;
  final String? orderId;
  final String storeId;
  final String? cashierId;
  final String? customerId;
  final int totalAmount;
  final int paymentAmount;
  final int changeAmount;
  final int? paymentMode;
  final String? paymentReference;
  final DateTime saleTime;
  final int itemCount;
  final String syncStatus;
  final String? error;
  final int retryCount;
  final DateTime createdAt;
  final DateTime updatedAt;
  const OfflineSale(
      {required this.id,
      this.saleId,
      this.orderId,
      required this.storeId,
      this.cashierId,
      this.customerId,
      required this.totalAmount,
      required this.paymentAmount,
      required this.changeAmount,
      this.paymentMode,
      this.paymentReference,
      required this.saleTime,
      required this.itemCount,
      required this.syncStatus,
      this.error,
      required this.retryCount,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || saleId != null) {
      map['sale_id'] = Variable<String>(saleId);
    }
    if (!nullToAbsent || orderId != null) {
      map['order_id'] = Variable<String>(orderId);
    }
    map['store_id'] = Variable<String>(storeId);
    if (!nullToAbsent || cashierId != null) {
      map['cashier_id'] = Variable<String>(cashierId);
    }
    if (!nullToAbsent || customerId != null) {
      map['customer_id'] = Variable<String>(customerId);
    }
    map['total_amount'] = Variable<int>(totalAmount);
    map['payment_amount'] = Variable<int>(paymentAmount);
    map['change_amount'] = Variable<int>(changeAmount);
    if (!nullToAbsent || paymentMode != null) {
      map['payment_mode'] = Variable<int>(paymentMode);
    }
    if (!nullToAbsent || paymentReference != null) {
      map['payment_reference'] = Variable<String>(paymentReference);
    }
    map['sale_time'] = Variable<DateTime>(saleTime);
    map['item_count'] = Variable<int>(itemCount);
    map['sync_status'] = Variable<String>(syncStatus);
    if (!nullToAbsent || error != null) {
      map['error'] = Variable<String>(error);
    }
    map['retry_count'] = Variable<int>(retryCount);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  OfflineSalesCompanion toCompanion(bool nullToAbsent) {
    return OfflineSalesCompanion(
      id: Value(id),
      saleId:
          saleId == null && nullToAbsent ? const Value.absent() : Value(saleId),
      orderId: orderId == null && nullToAbsent
          ? const Value.absent()
          : Value(orderId),
      storeId: Value(storeId),
      cashierId: cashierId == null && nullToAbsent
          ? const Value.absent()
          : Value(cashierId),
      customerId: customerId == null && nullToAbsent
          ? const Value.absent()
          : Value(customerId),
      totalAmount: Value(totalAmount),
      paymentAmount: Value(paymentAmount),
      changeAmount: Value(changeAmount),
      paymentMode: paymentMode == null && nullToAbsent
          ? const Value.absent()
          : Value(paymentMode),
      paymentReference: paymentReference == null && nullToAbsent
          ? const Value.absent()
          : Value(paymentReference),
      saleTime: Value(saleTime),
      itemCount: Value(itemCount),
      syncStatus: Value(syncStatus),
      error:
          error == null && nullToAbsent ? const Value.absent() : Value(error),
      retryCount: Value(retryCount),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory OfflineSale.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineSale(
      id: serializer.fromJson<String>(json['id']),
      saleId: serializer.fromJson<String?>(json['saleId']),
      orderId: serializer.fromJson<String?>(json['orderId']),
      storeId: serializer.fromJson<String>(json['storeId']),
      cashierId: serializer.fromJson<String?>(json['cashierId']),
      customerId: serializer.fromJson<String?>(json['customerId']),
      totalAmount: serializer.fromJson<int>(json['totalAmount']),
      paymentAmount: serializer.fromJson<int>(json['paymentAmount']),
      changeAmount: serializer.fromJson<int>(json['changeAmount']),
      paymentMode: serializer.fromJson<int?>(json['paymentMode']),
      paymentReference: serializer.fromJson<String?>(json['paymentReference']),
      saleTime: serializer.fromJson<DateTime>(json['saleTime']),
      itemCount: serializer.fromJson<int>(json['itemCount']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      error: serializer.fromJson<String?>(json['error']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'saleId': serializer.toJson<String?>(saleId),
      'orderId': serializer.toJson<String?>(orderId),
      'storeId': serializer.toJson<String>(storeId),
      'cashierId': serializer.toJson<String?>(cashierId),
      'customerId': serializer.toJson<String?>(customerId),
      'totalAmount': serializer.toJson<int>(totalAmount),
      'paymentAmount': serializer.toJson<int>(paymentAmount),
      'changeAmount': serializer.toJson<int>(changeAmount),
      'paymentMode': serializer.toJson<int?>(paymentMode),
      'paymentReference': serializer.toJson<String?>(paymentReference),
      'saleTime': serializer.toJson<DateTime>(saleTime),
      'itemCount': serializer.toJson<int>(itemCount),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'error': serializer.toJson<String?>(error),
      'retryCount': serializer.toJson<int>(retryCount),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  OfflineSale copyWith(
          {String? id,
          Value<String?> saleId = const Value.absent(),
          Value<String?> orderId = const Value.absent(),
          String? storeId,
          Value<String?> cashierId = const Value.absent(),
          Value<String?> customerId = const Value.absent(),
          int? totalAmount,
          int? paymentAmount,
          int? changeAmount,
          Value<int?> paymentMode = const Value.absent(),
          Value<String?> paymentReference = const Value.absent(),
          DateTime? saleTime,
          int? itemCount,
          String? syncStatus,
          Value<String?> error = const Value.absent(),
          int? retryCount,
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      OfflineSale(
        id: id ?? this.id,
        saleId: saleId.present ? saleId.value : this.saleId,
        orderId: orderId.present ? orderId.value : this.orderId,
        storeId: storeId ?? this.storeId,
        cashierId: cashierId.present ? cashierId.value : this.cashierId,
        customerId: customerId.present ? customerId.value : this.customerId,
        totalAmount: totalAmount ?? this.totalAmount,
        paymentAmount: paymentAmount ?? this.paymentAmount,
        changeAmount: changeAmount ?? this.changeAmount,
        paymentMode: paymentMode.present ? paymentMode.value : this.paymentMode,
        paymentReference: paymentReference.present
            ? paymentReference.value
            : this.paymentReference,
        saleTime: saleTime ?? this.saleTime,
        itemCount: itemCount ?? this.itemCount,
        syncStatus: syncStatus ?? this.syncStatus,
        error: error.present ? error.value : this.error,
        retryCount: retryCount ?? this.retryCount,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  OfflineSale copyWithCompanion(OfflineSalesCompanion data) {
    return OfflineSale(
      id: data.id.present ? data.id.value : this.id,
      saleId: data.saleId.present ? data.saleId.value : this.saleId,
      orderId: data.orderId.present ? data.orderId.value : this.orderId,
      storeId: data.storeId.present ? data.storeId.value : this.storeId,
      cashierId: data.cashierId.present ? data.cashierId.value : this.cashierId,
      customerId:
          data.customerId.present ? data.customerId.value : this.customerId,
      totalAmount:
          data.totalAmount.present ? data.totalAmount.value : this.totalAmount,
      paymentAmount: data.paymentAmount.present
          ? data.paymentAmount.value
          : this.paymentAmount,
      changeAmount: data.changeAmount.present
          ? data.changeAmount.value
          : this.changeAmount,
      paymentMode:
          data.paymentMode.present ? data.paymentMode.value : this.paymentMode,
      paymentReference: data.paymentReference.present
          ? data.paymentReference.value
          : this.paymentReference,
      saleTime: data.saleTime.present ? data.saleTime.value : this.saleTime,
      itemCount: data.itemCount.present ? data.itemCount.value : this.itemCount,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      error: data.error.present ? data.error.value : this.error,
      retryCount:
          data.retryCount.present ? data.retryCount.value : this.retryCount,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSale(')
          ..write('id: $id, ')
          ..write('saleId: $saleId, ')
          ..write('orderId: $orderId, ')
          ..write('storeId: $storeId, ')
          ..write('cashierId: $cashierId, ')
          ..write('customerId: $customerId, ')
          ..write('totalAmount: $totalAmount, ')
          ..write('paymentAmount: $paymentAmount, ')
          ..write('changeAmount: $changeAmount, ')
          ..write('paymentMode: $paymentMode, ')
          ..write('paymentReference: $paymentReference, ')
          ..write('saleTime: $saleTime, ')
          ..write('itemCount: $itemCount, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('error: $error, ')
          ..write('retryCount: $retryCount, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      saleId,
      orderId,
      storeId,
      cashierId,
      customerId,
      totalAmount,
      paymentAmount,
      changeAmount,
      paymentMode,
      paymentReference,
      saleTime,
      itemCount,
      syncStatus,
      error,
      retryCount,
      createdAt,
      updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineSale &&
          other.id == this.id &&
          other.saleId == this.saleId &&
          other.orderId == this.orderId &&
          other.storeId == this.storeId &&
          other.cashierId == this.cashierId &&
          other.customerId == this.customerId &&
          other.totalAmount == this.totalAmount &&
          other.paymentAmount == this.paymentAmount &&
          other.changeAmount == this.changeAmount &&
          other.paymentMode == this.paymentMode &&
          other.paymentReference == this.paymentReference &&
          other.saleTime == this.saleTime &&
          other.itemCount == this.itemCount &&
          other.syncStatus == this.syncStatus &&
          other.error == this.error &&
          other.retryCount == this.retryCount &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class OfflineSalesCompanion extends UpdateCompanion<OfflineSale> {
  final Value<String> id;
  final Value<String?> saleId;
  final Value<String?> orderId;
  final Value<String> storeId;
  final Value<String?> cashierId;
  final Value<String?> customerId;
  final Value<int> totalAmount;
  final Value<int> paymentAmount;
  final Value<int> changeAmount;
  final Value<int?> paymentMode;
  final Value<String?> paymentReference;
  final Value<DateTime> saleTime;
  final Value<int> itemCount;
  final Value<String> syncStatus;
  final Value<String?> error;
  final Value<int> retryCount;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const OfflineSalesCompanion({
    this.id = const Value.absent(),
    this.saleId = const Value.absent(),
    this.orderId = const Value.absent(),
    this.storeId = const Value.absent(),
    this.cashierId = const Value.absent(),
    this.customerId = const Value.absent(),
    this.totalAmount = const Value.absent(),
    this.paymentAmount = const Value.absent(),
    this.changeAmount = const Value.absent(),
    this.paymentMode = const Value.absent(),
    this.paymentReference = const Value.absent(),
    this.saleTime = const Value.absent(),
    this.itemCount = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.error = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineSalesCompanion.insert({
    required String id,
    this.saleId = const Value.absent(),
    this.orderId = const Value.absent(),
    required String storeId,
    this.cashierId = const Value.absent(),
    this.customerId = const Value.absent(),
    required int totalAmount,
    required int paymentAmount,
    required int changeAmount,
    this.paymentMode = const Value.absent(),
    this.paymentReference = const Value.absent(),
    required DateTime saleTime,
    required int itemCount,
    this.syncStatus = const Value.absent(),
    this.error = const Value.absent(),
    required int retryCount,
    required DateTime createdAt,
    required DateTime updatedAt,
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        storeId = Value(storeId),
        totalAmount = Value(totalAmount),
        paymentAmount = Value(paymentAmount),
        changeAmount = Value(changeAmount),
        saleTime = Value(saleTime),
        itemCount = Value(itemCount),
        retryCount = Value(retryCount),
        createdAt = Value(createdAt),
        updatedAt = Value(updatedAt);
  static Insertable<OfflineSale> custom({
    Expression<String>? id,
    Expression<String>? saleId,
    Expression<String>? orderId,
    Expression<String>? storeId,
    Expression<String>? cashierId,
    Expression<String>? customerId,
    Expression<int>? totalAmount,
    Expression<int>? paymentAmount,
    Expression<int>? changeAmount,
    Expression<int>? paymentMode,
    Expression<String>? paymentReference,
    Expression<DateTime>? saleTime,
    Expression<int>? itemCount,
    Expression<String>? syncStatus,
    Expression<String>? error,
    Expression<int>? retryCount,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (saleId != null) 'sale_id': saleId,
      if (orderId != null) 'order_id': orderId,
      if (storeId != null) 'store_id': storeId,
      if (cashierId != null) 'cashier_id': cashierId,
      if (customerId != null) 'customer_id': customerId,
      if (totalAmount != null) 'total_amount': totalAmount,
      if (paymentAmount != null) 'payment_amount': paymentAmount,
      if (changeAmount != null) 'change_amount': changeAmount,
      if (paymentMode != null) 'payment_mode': paymentMode,
      if (paymentReference != null) 'payment_reference': paymentReference,
      if (saleTime != null) 'sale_time': saleTime,
      if (itemCount != null) 'item_count': itemCount,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (error != null) 'error': error,
      if (retryCount != null) 'retry_count': retryCount,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineSalesCompanion copyWith(
      {Value<String>? id,
      Value<String?>? saleId,
      Value<String?>? orderId,
      Value<String>? storeId,
      Value<String?>? cashierId,
      Value<String?>? customerId,
      Value<int>? totalAmount,
      Value<int>? paymentAmount,
      Value<int>? changeAmount,
      Value<int?>? paymentMode,
      Value<String?>? paymentReference,
      Value<DateTime>? saleTime,
      Value<int>? itemCount,
      Value<String>? syncStatus,
      Value<String?>? error,
      Value<int>? retryCount,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<int>? rowid}) {
    return OfflineSalesCompanion(
      id: id ?? this.id,
      saleId: saleId ?? this.saleId,
      orderId: orderId ?? this.orderId,
      storeId: storeId ?? this.storeId,
      cashierId: cashierId ?? this.cashierId,
      customerId: customerId ?? this.customerId,
      totalAmount: totalAmount ?? this.totalAmount,
      paymentAmount: paymentAmount ?? this.paymentAmount,
      changeAmount: changeAmount ?? this.changeAmount,
      paymentMode: paymentMode ?? this.paymentMode,
      paymentReference: paymentReference ?? this.paymentReference,
      saleTime: saleTime ?? this.saleTime,
      itemCount: itemCount ?? this.itemCount,
      syncStatus: syncStatus ?? this.syncStatus,
      error: error ?? this.error,
      retryCount: retryCount ?? this.retryCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (saleId.present) {
      map['sale_id'] = Variable<String>(saleId.value);
    }
    if (orderId.present) {
      map['order_id'] = Variable<String>(orderId.value);
    }
    if (storeId.present) {
      map['store_id'] = Variable<String>(storeId.value);
    }
    if (cashierId.present) {
      map['cashier_id'] = Variable<String>(cashierId.value);
    }
    if (customerId.present) {
      map['customer_id'] = Variable<String>(customerId.value);
    }
    if (totalAmount.present) {
      map['total_amount'] = Variable<int>(totalAmount.value);
    }
    if (paymentAmount.present) {
      map['payment_amount'] = Variable<int>(paymentAmount.value);
    }
    if (changeAmount.present) {
      map['change_amount'] = Variable<int>(changeAmount.value);
    }
    if (paymentMode.present) {
      map['payment_mode'] = Variable<int>(paymentMode.value);
    }
    if (paymentReference.present) {
      map['payment_reference'] = Variable<String>(paymentReference.value);
    }
    if (saleTime.present) {
      map['sale_time'] = Variable<DateTime>(saleTime.value);
    }
    if (itemCount.present) {
      map['item_count'] = Variable<int>(itemCount.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (error.present) {
      map['error'] = Variable<String>(error.value);
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSalesCompanion(')
          ..write('id: $id, ')
          ..write('saleId: $saleId, ')
          ..write('orderId: $orderId, ')
          ..write('storeId: $storeId, ')
          ..write('cashierId: $cashierId, ')
          ..write('customerId: $customerId, ')
          ..write('totalAmount: $totalAmount, ')
          ..write('paymentAmount: $paymentAmount, ')
          ..write('changeAmount: $changeAmount, ')
          ..write('paymentMode: $paymentMode, ')
          ..write('paymentReference: $paymentReference, ')
          ..write('saleTime: $saleTime, ')
          ..write('itemCount: $itemCount, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('error: $error, ')
          ..write('retryCount: $retryCount, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineSaleItemsTable extends OfflineSaleItems
    with TableInfo<$OfflineSaleItemsTable, OfflineSaleItem> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineSaleItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _saleIdMeta = const VerificationMeta('saleId');
  @override
  late final GeneratedColumn<String> saleId = GeneratedColumn<String>(
      'sale_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _productIdMeta =
      const VerificationMeta('productId');
  @override
  late final GeneratedColumn<String> productId = GeneratedColumn<String>(
      'product_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _productNameMeta =
      const VerificationMeta('productName');
  @override
  late final GeneratedColumn<String> productName = GeneratedColumn<String>(
      'product_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _quantityMeta =
      const VerificationMeta('quantity');
  @override
  late final GeneratedColumn<int> quantity = GeneratedColumn<int>(
      'quantity', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _priceMeta = const VerificationMeta('price');
  @override
  late final GeneratedColumn<double> price = GeneratedColumn<double>(
      'price', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _discountMeta =
      const VerificationMeta('discount');
  @override
  late final GeneratedColumn<double> discount = GeneratedColumn<double>(
      'discount', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _totalMeta = const VerificationMeta('total');
  @override
  late final GeneratedColumn<double> total = GeneratedColumn<double>(
      'total', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _taxMeta = const VerificationMeta('tax');
  @override
  late final GeneratedColumn<int> tax = GeneratedColumn<int>(
      'tax', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _barcodeMeta =
      const VerificationMeta('barcode');
  @override
  late final GeneratedColumn<String> barcode = GeneratedColumn<String>(
      'barcode', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        saleId,
        productId,
        productName,
        quantity,
        price,
        discount,
        total,
        tax,
        barcode
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_sale_items';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineSaleItem> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('sale_id')) {
      context.handle(_saleIdMeta,
          saleId.isAcceptableOrUnknown(data['sale_id']!, _saleIdMeta));
    } else if (isInserting) {
      context.missing(_saleIdMeta);
    }
    if (data.containsKey('product_id')) {
      context.handle(_productIdMeta,
          productId.isAcceptableOrUnknown(data['product_id']!, _productIdMeta));
    } else if (isInserting) {
      context.missing(_productIdMeta);
    }
    if (data.containsKey('product_name')) {
      context.handle(
          _productNameMeta,
          productName.isAcceptableOrUnknown(
              data['product_name']!, _productNameMeta));
    } else if (isInserting) {
      context.missing(_productNameMeta);
    }
    if (data.containsKey('quantity')) {
      context.handle(_quantityMeta,
          quantity.isAcceptableOrUnknown(data['quantity']!, _quantityMeta));
    } else if (isInserting) {
      context.missing(_quantityMeta);
    }
    if (data.containsKey('price')) {
      context.handle(
          _priceMeta, price.isAcceptableOrUnknown(data['price']!, _priceMeta));
    } else if (isInserting) {
      context.missing(_priceMeta);
    }
    if (data.containsKey('discount')) {
      context.handle(_discountMeta,
          discount.isAcceptableOrUnknown(data['discount']!, _discountMeta));
    } else if (isInserting) {
      context.missing(_discountMeta);
    }
    if (data.containsKey('total')) {
      context.handle(
          _totalMeta, total.isAcceptableOrUnknown(data['total']!, _totalMeta));
    } else if (isInserting) {
      context.missing(_totalMeta);
    }
    if (data.containsKey('tax')) {
      context.handle(
          _taxMeta, tax.isAcceptableOrUnknown(data['tax']!, _taxMeta));
    }
    if (data.containsKey('barcode')) {
      context.handle(_barcodeMeta,
          barcode.isAcceptableOrUnknown(data['barcode']!, _barcodeMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => const {};
  @override
  OfflineSaleItem map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineSaleItem(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      saleId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sale_id'])!,
      productId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}product_id'])!,
      productName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}product_name'])!,
      quantity: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}quantity'])!,
      price: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}price'])!,
      discount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}discount'])!,
      total: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}total'])!,
      tax: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}tax']),
      barcode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}barcode']),
    );
  }

  @override
  $OfflineSaleItemsTable createAlias(String alias) {
    return $OfflineSaleItemsTable(attachedDatabase, alias);
  }
}

class OfflineSaleItem extends DataClass implements Insertable<OfflineSaleItem> {
  final String id;
  final String saleId;
  final String productId;
  final String productName;
  final int quantity;
  final double price;
  final double discount;
  final double total;
  final int? tax;
  final String? barcode;
  const OfflineSaleItem(
      {required this.id,
      required this.saleId,
      required this.productId,
      required this.productName,
      required this.quantity,
      required this.price,
      required this.discount,
      required this.total,
      this.tax,
      this.barcode});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['sale_id'] = Variable<String>(saleId);
    map['product_id'] = Variable<String>(productId);
    map['product_name'] = Variable<String>(productName);
    map['quantity'] = Variable<int>(quantity);
    map['price'] = Variable<double>(price);
    map['discount'] = Variable<double>(discount);
    map['total'] = Variable<double>(total);
    if (!nullToAbsent || tax != null) {
      map['tax'] = Variable<int>(tax);
    }
    if (!nullToAbsent || barcode != null) {
      map['barcode'] = Variable<String>(barcode);
    }
    return map;
  }

  OfflineSaleItemsCompanion toCompanion(bool nullToAbsent) {
    return OfflineSaleItemsCompanion(
      id: Value(id),
      saleId: Value(saleId),
      productId: Value(productId),
      productName: Value(productName),
      quantity: Value(quantity),
      price: Value(price),
      discount: Value(discount),
      total: Value(total),
      tax: tax == null && nullToAbsent ? const Value.absent() : Value(tax),
      barcode: barcode == null && nullToAbsent
          ? const Value.absent()
          : Value(barcode),
    );
  }

  factory OfflineSaleItem.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineSaleItem(
      id: serializer.fromJson<String>(json['id']),
      saleId: serializer.fromJson<String>(json['saleId']),
      productId: serializer.fromJson<String>(json['productId']),
      productName: serializer.fromJson<String>(json['productName']),
      quantity: serializer.fromJson<int>(json['quantity']),
      price: serializer.fromJson<double>(json['price']),
      discount: serializer.fromJson<double>(json['discount']),
      total: serializer.fromJson<double>(json['total']),
      tax: serializer.fromJson<int?>(json['tax']),
      barcode: serializer.fromJson<String?>(json['barcode']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'saleId': serializer.toJson<String>(saleId),
      'productId': serializer.toJson<String>(productId),
      'productName': serializer.toJson<String>(productName),
      'quantity': serializer.toJson<int>(quantity),
      'price': serializer.toJson<double>(price),
      'discount': serializer.toJson<double>(discount),
      'total': serializer.toJson<double>(total),
      'tax': serializer.toJson<int?>(tax),
      'barcode': serializer.toJson<String?>(barcode),
    };
  }

  OfflineSaleItem copyWith(
          {String? id,
          String? saleId,
          String? productId,
          String? productName,
          int? quantity,
          double? price,
          double? discount,
          double? total,
          Value<int?> tax = const Value.absent(),
          Value<String?> barcode = const Value.absent()}) =>
      OfflineSaleItem(
        id: id ?? this.id,
        saleId: saleId ?? this.saleId,
        productId: productId ?? this.productId,
        productName: productName ?? this.productName,
        quantity: quantity ?? this.quantity,
        price: price ?? this.price,
        discount: discount ?? this.discount,
        total: total ?? this.total,
        tax: tax.present ? tax.value : this.tax,
        barcode: barcode.present ? barcode.value : this.barcode,
      );
  OfflineSaleItem copyWithCompanion(OfflineSaleItemsCompanion data) {
    return OfflineSaleItem(
      id: data.id.present ? data.id.value : this.id,
      saleId: data.saleId.present ? data.saleId.value : this.saleId,
      productId: data.productId.present ? data.productId.value : this.productId,
      productName:
          data.productName.present ? data.productName.value : this.productName,
      quantity: data.quantity.present ? data.quantity.value : this.quantity,
      price: data.price.present ? data.price.value : this.price,
      discount: data.discount.present ? data.discount.value : this.discount,
      total: data.total.present ? data.total.value : this.total,
      tax: data.tax.present ? data.tax.value : this.tax,
      barcode: data.barcode.present ? data.barcode.value : this.barcode,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSaleItem(')
          ..write('id: $id, ')
          ..write('saleId: $saleId, ')
          ..write('productId: $productId, ')
          ..write('productName: $productName, ')
          ..write('quantity: $quantity, ')
          ..write('price: $price, ')
          ..write('discount: $discount, ')
          ..write('total: $total, ')
          ..write('tax: $tax, ')
          ..write('barcode: $barcode')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, saleId, productId, productName, quantity,
      price, discount, total, tax, barcode);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineSaleItem &&
          other.id == this.id &&
          other.saleId == this.saleId &&
          other.productId == this.productId &&
          other.productName == this.productName &&
          other.quantity == this.quantity &&
          other.price == this.price &&
          other.discount == this.discount &&
          other.total == this.total &&
          other.tax == this.tax &&
          other.barcode == this.barcode);
}

class OfflineSaleItemsCompanion extends UpdateCompanion<OfflineSaleItem> {
  final Value<String> id;
  final Value<String> saleId;
  final Value<String> productId;
  final Value<String> productName;
  final Value<int> quantity;
  final Value<double> price;
  final Value<double> discount;
  final Value<double> total;
  final Value<int?> tax;
  final Value<String?> barcode;
  final Value<int> rowid;
  const OfflineSaleItemsCompanion({
    this.id = const Value.absent(),
    this.saleId = const Value.absent(),
    this.productId = const Value.absent(),
    this.productName = const Value.absent(),
    this.quantity = const Value.absent(),
    this.price = const Value.absent(),
    this.discount = const Value.absent(),
    this.total = const Value.absent(),
    this.tax = const Value.absent(),
    this.barcode = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineSaleItemsCompanion.insert({
    required String id,
    required String saleId,
    required String productId,
    required String productName,
    required int quantity,
    required double price,
    required double discount,
    required double total,
    this.tax = const Value.absent(),
    this.barcode = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        saleId = Value(saleId),
        productId = Value(productId),
        productName = Value(productName),
        quantity = Value(quantity),
        price = Value(price),
        discount = Value(discount),
        total = Value(total);
  static Insertable<OfflineSaleItem> custom({
    Expression<String>? id,
    Expression<String>? saleId,
    Expression<String>? productId,
    Expression<String>? productName,
    Expression<int>? quantity,
    Expression<double>? price,
    Expression<double>? discount,
    Expression<double>? total,
    Expression<int>? tax,
    Expression<String>? barcode,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (saleId != null) 'sale_id': saleId,
      if (productId != null) 'product_id': productId,
      if (productName != null) 'product_name': productName,
      if (quantity != null) 'quantity': quantity,
      if (price != null) 'price': price,
      if (discount != null) 'discount': discount,
      if (total != null) 'total': total,
      if (tax != null) 'tax': tax,
      if (barcode != null) 'barcode': barcode,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineSaleItemsCompanion copyWith(
      {Value<String>? id,
      Value<String>? saleId,
      Value<String>? productId,
      Value<String>? productName,
      Value<int>? quantity,
      Value<double>? price,
      Value<double>? discount,
      Value<double>? total,
      Value<int?>? tax,
      Value<String?>? barcode,
      Value<int>? rowid}) {
    return OfflineSaleItemsCompanion(
      id: id ?? this.id,
      saleId: saleId ?? this.saleId,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      quantity: quantity ?? this.quantity,
      price: price ?? this.price,
      discount: discount ?? this.discount,
      total: total ?? this.total,
      tax: tax ?? this.tax,
      barcode: barcode ?? this.barcode,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (saleId.present) {
      map['sale_id'] = Variable<String>(saleId.value);
    }
    if (productId.present) {
      map['product_id'] = Variable<String>(productId.value);
    }
    if (productName.present) {
      map['product_name'] = Variable<String>(productName.value);
    }
    if (quantity.present) {
      map['quantity'] = Variable<int>(quantity.value);
    }
    if (price.present) {
      map['price'] = Variable<double>(price.value);
    }
    if (discount.present) {
      map['discount'] = Variable<double>(discount.value);
    }
    if (total.present) {
      map['total'] = Variable<double>(total.value);
    }
    if (tax.present) {
      map['tax'] = Variable<int>(tax.value);
    }
    if (barcode.present) {
      map['barcode'] = Variable<String>(barcode.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSaleItemsCompanion(')
          ..write('id: $id, ')
          ..write('saleId: $saleId, ')
          ..write('productId: $productId, ')
          ..write('productName: $productName, ')
          ..write('quantity: $quantity, ')
          ..write('price: $price, ')
          ..write('discount: $discount, ')
          ..write('total: $total, ')
          ..write('tax: $tax, ')
          ..write('barcode: $barcode, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineStockLevelsTable extends OfflineStockLevels
    with TableInfo<$OfflineStockLevelsTable, OfflineStockLevel> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineStockLevelsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _storeIdMeta =
      const VerificationMeta('storeId');
  @override
  late final GeneratedColumn<String> storeId = GeneratedColumn<String>(
      'store_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _itemIdMeta = const VerificationMeta('itemId');
  @override
  late final GeneratedColumn<String> itemId = GeneratedColumn<String>(
      'item_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _quantityMeta =
      const VerificationMeta('quantity');
  @override
  late final GeneratedColumn<int> quantity = GeneratedColumn<int>(
      'quantity', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _lastUpdatedTimestampMeta =
      const VerificationMeta('lastUpdatedTimestamp');
  @override
  late final GeneratedColumn<int> lastUpdatedTimestamp = GeneratedColumn<int>(
      'last_updated_timestamp', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        storeId,
        itemId,
        quantity,
        lastUpdatedTimestamp,
        syncStatus,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_stock_levels';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineStockLevel> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('store_id')) {
      context.handle(_storeIdMeta,
          storeId.isAcceptableOrUnknown(data['store_id']!, _storeIdMeta));
    } else if (isInserting) {
      context.missing(_storeIdMeta);
    }
    if (data.containsKey('item_id')) {
      context.handle(_itemIdMeta,
          itemId.isAcceptableOrUnknown(data['item_id']!, _itemIdMeta));
    } else if (isInserting) {
      context.missing(_itemIdMeta);
    }
    if (data.containsKey('quantity')) {
      context.handle(_quantityMeta,
          quantity.isAcceptableOrUnknown(data['quantity']!, _quantityMeta));
    } else if (isInserting) {
      context.missing(_quantityMeta);
    }
    if (data.containsKey('last_updated_timestamp')) {
      context.handle(
          _lastUpdatedTimestampMeta,
          lastUpdatedTimestamp.isAcceptableOrUnknown(
              data['last_updated_timestamp']!, _lastUpdatedTimestampMeta));
    } else if (isInserting) {
      context.missing(_lastUpdatedTimestampMeta);
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => const {};
  @override
  OfflineStockLevel map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineStockLevel(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      storeId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}store_id'])!,
      itemId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}item_id'])!,
      quantity: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}quantity'])!,
      lastUpdatedTimestamp: attachedDatabase.typeMapping.read(
          DriftSqlType.int, data['${effectivePrefix}last_updated_timestamp'])!,
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_status'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $OfflineStockLevelsTable createAlias(String alias) {
    return $OfflineStockLevelsTable(attachedDatabase, alias);
  }
}

class OfflineStockLevel extends DataClass
    implements Insertable<OfflineStockLevel> {
  final String id;
  final String storeId;
  final String itemId;
  final int quantity;
  final int lastUpdatedTimestamp;
  final String syncStatus;
  final DateTime createdAt;
  final DateTime updatedAt;
  const OfflineStockLevel(
      {required this.id,
      required this.storeId,
      required this.itemId,
      required this.quantity,
      required this.lastUpdatedTimestamp,
      required this.syncStatus,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['store_id'] = Variable<String>(storeId);
    map['item_id'] = Variable<String>(itemId);
    map['quantity'] = Variable<int>(quantity);
    map['last_updated_timestamp'] = Variable<int>(lastUpdatedTimestamp);
    map['sync_status'] = Variable<String>(syncStatus);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  OfflineStockLevelsCompanion toCompanion(bool nullToAbsent) {
    return OfflineStockLevelsCompanion(
      id: Value(id),
      storeId: Value(storeId),
      itemId: Value(itemId),
      quantity: Value(quantity),
      lastUpdatedTimestamp: Value(lastUpdatedTimestamp),
      syncStatus: Value(syncStatus),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory OfflineStockLevel.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineStockLevel(
      id: serializer.fromJson<String>(json['id']),
      storeId: serializer.fromJson<String>(json['storeId']),
      itemId: serializer.fromJson<String>(json['itemId']),
      quantity: serializer.fromJson<int>(json['quantity']),
      lastUpdatedTimestamp:
          serializer.fromJson<int>(json['lastUpdatedTimestamp']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'storeId': serializer.toJson<String>(storeId),
      'itemId': serializer.toJson<String>(itemId),
      'quantity': serializer.toJson<int>(quantity),
      'lastUpdatedTimestamp': serializer.toJson<int>(lastUpdatedTimestamp),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  OfflineStockLevel copyWith(
          {String? id,
          String? storeId,
          String? itemId,
          int? quantity,
          int? lastUpdatedTimestamp,
          String? syncStatus,
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      OfflineStockLevel(
        id: id ?? this.id,
        storeId: storeId ?? this.storeId,
        itemId: itemId ?? this.itemId,
        quantity: quantity ?? this.quantity,
        lastUpdatedTimestamp: lastUpdatedTimestamp ?? this.lastUpdatedTimestamp,
        syncStatus: syncStatus ?? this.syncStatus,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  OfflineStockLevel copyWithCompanion(OfflineStockLevelsCompanion data) {
    return OfflineStockLevel(
      id: data.id.present ? data.id.value : this.id,
      storeId: data.storeId.present ? data.storeId.value : this.storeId,
      itemId: data.itemId.present ? data.itemId.value : this.itemId,
      quantity: data.quantity.present ? data.quantity.value : this.quantity,
      lastUpdatedTimestamp: data.lastUpdatedTimestamp.present
          ? data.lastUpdatedTimestamp.value
          : this.lastUpdatedTimestamp,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineStockLevel(')
          ..write('id: $id, ')
          ..write('storeId: $storeId, ')
          ..write('itemId: $itemId, ')
          ..write('quantity: $quantity, ')
          ..write('lastUpdatedTimestamp: $lastUpdatedTimestamp, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, storeId, itemId, quantity,
      lastUpdatedTimestamp, syncStatus, createdAt, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineStockLevel &&
          other.id == this.id &&
          other.storeId == this.storeId &&
          other.itemId == this.itemId &&
          other.quantity == this.quantity &&
          other.lastUpdatedTimestamp == this.lastUpdatedTimestamp &&
          other.syncStatus == this.syncStatus &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class OfflineStockLevelsCompanion extends UpdateCompanion<OfflineStockLevel> {
  final Value<String> id;
  final Value<String> storeId;
  final Value<String> itemId;
  final Value<int> quantity;
  final Value<int> lastUpdatedTimestamp;
  final Value<String> syncStatus;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const OfflineStockLevelsCompanion({
    this.id = const Value.absent(),
    this.storeId = const Value.absent(),
    this.itemId = const Value.absent(),
    this.quantity = const Value.absent(),
    this.lastUpdatedTimestamp = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineStockLevelsCompanion.insert({
    required String id,
    required String storeId,
    required String itemId,
    required int quantity,
    required int lastUpdatedTimestamp,
    this.syncStatus = const Value.absent(),
    required DateTime createdAt,
    required DateTime updatedAt,
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        storeId = Value(storeId),
        itemId = Value(itemId),
        quantity = Value(quantity),
        lastUpdatedTimestamp = Value(lastUpdatedTimestamp),
        createdAt = Value(createdAt),
        updatedAt = Value(updatedAt);
  static Insertable<OfflineStockLevel> custom({
    Expression<String>? id,
    Expression<String>? storeId,
    Expression<String>? itemId,
    Expression<int>? quantity,
    Expression<int>? lastUpdatedTimestamp,
    Expression<String>? syncStatus,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (storeId != null) 'store_id': storeId,
      if (itemId != null) 'item_id': itemId,
      if (quantity != null) 'quantity': quantity,
      if (lastUpdatedTimestamp != null)
        'last_updated_timestamp': lastUpdatedTimestamp,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineStockLevelsCompanion copyWith(
      {Value<String>? id,
      Value<String>? storeId,
      Value<String>? itemId,
      Value<int>? quantity,
      Value<int>? lastUpdatedTimestamp,
      Value<String>? syncStatus,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<int>? rowid}) {
    return OfflineStockLevelsCompanion(
      id: id ?? this.id,
      storeId: storeId ?? this.storeId,
      itemId: itemId ?? this.itemId,
      quantity: quantity ?? this.quantity,
      lastUpdatedTimestamp: lastUpdatedTimestamp ?? this.lastUpdatedTimestamp,
      syncStatus: syncStatus ?? this.syncStatus,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (storeId.present) {
      map['store_id'] = Variable<String>(storeId.value);
    }
    if (itemId.present) {
      map['item_id'] = Variable<String>(itemId.value);
    }
    if (quantity.present) {
      map['quantity'] = Variable<int>(quantity.value);
    }
    if (lastUpdatedTimestamp.present) {
      map['last_updated_timestamp'] = Variable<int>(lastUpdatedTimestamp.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineStockLevelsCompanion(')
          ..write('id: $id, ')
          ..write('storeId: $storeId, ')
          ..write('itemId: $itemId, ')
          ..write('quantity: $quantity, ')
          ..write('lastUpdatedTimestamp: $lastUpdatedTimestamp, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SyncQueueTable extends SyncQueue
    with TableInfo<$SyncQueueTable, SyncQueueData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncQueueTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _operationTypeMeta =
      const VerificationMeta('operationType');
  @override
  late final GeneratedColumn<int> operationType = GeneratedColumn<int>(
      'operation_type', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _tableNameMeta =
      const VerificationMeta('tableName');
  @override
  late final GeneratedColumn<String> tableName = GeneratedColumn<String>(
      'table_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _recordIdMeta =
      const VerificationMeta('recordId');
  @override
  late final GeneratedColumn<String> recordId = GeneratedColumn<String>(
      'record_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _rawDataMeta =
      const VerificationMeta('rawData');
  @override
  late final GeneratedColumn<Uint8List> rawData = GeneratedColumn<Uint8List>(
      'raw_data', aliasedName, false,
      type: DriftSqlType.blob, requiredDuringInsert: true);
  static const VerificationMeta _syncStatusMeta =
      const VerificationMeta('syncStatus');
  @override
  late final GeneratedColumn<String> syncStatus = GeneratedColumn<String>(
      'sync_status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _priorityMeta =
      const VerificationMeta('priority');
  @override
  late final GeneratedColumn<int> priority = GeneratedColumn<int>(
      'priority', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(10));
  static const VerificationMeta _retryCountMeta =
      const VerificationMeta('retryCount');
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
      'retry_count', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _failedAtMeta =
      const VerificationMeta('failedAt');
  @override
  late final GeneratedColumn<DateTime> failedAt = GeneratedColumn<DateTime>(
      'failed_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _lastRetryAtMeta =
      const VerificationMeta('lastRetryAt');
  @override
  late final GeneratedColumn<DateTime> lastRetryAt = GeneratedColumn<DateTime>(
      'last_retry_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        operationType,
        tableName,
        recordId,
        rawData,
        syncStatus,
        priority,
        retryCount,
        failedAt,
        lastRetryAt,
        createdAt,
        updatedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_queue';
  @override
  VerificationContext validateIntegrity(Insertable<SyncQueueData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('operation_type')) {
      context.handle(
          _operationTypeMeta,
          operationType.isAcceptableOrUnknown(
              data['operation_type']!, _operationTypeMeta));
    } else if (isInserting) {
      context.missing(_operationTypeMeta);
    }
    if (data.containsKey('table_name')) {
      context.handle(_tableNameMeta,
          tableName.isAcceptableOrUnknown(data['table_name']!, _tableNameMeta));
    } else if (isInserting) {
      context.missing(_tableNameMeta);
    }
    if (data.containsKey('record_id')) {
      context.handle(_recordIdMeta,
          recordId.isAcceptableOrUnknown(data['record_id']!, _recordIdMeta));
    } else if (isInserting) {
      context.missing(_recordIdMeta);
    }
    if (data.containsKey('raw_data')) {
      context.handle(_rawDataMeta,
          rawData.isAcceptableOrUnknown(data['raw_data']!, _rawDataMeta));
    } else if (isInserting) {
      context.missing(_rawDataMeta);
    }
    if (data.containsKey('sync_status')) {
      context.handle(
          _syncStatusMeta,
          syncStatus.isAcceptableOrUnknown(
              data['sync_status']!, _syncStatusMeta));
    }
    if (data.containsKey('priority')) {
      context.handle(_priorityMeta,
          priority.isAcceptableOrUnknown(data['priority']!, _priorityMeta));
    }
    if (data.containsKey('retry_count')) {
      context.handle(
          _retryCountMeta,
          retryCount.isAcceptableOrUnknown(
              data['retry_count']!, _retryCountMeta));
    } else if (isInserting) {
      context.missing(_retryCountMeta);
    }
    if (data.containsKey('failed_at')) {
      context.handle(_failedAtMeta,
          failedAt.isAcceptableOrUnknown(data['failed_at']!, _failedAtMeta));
    }
    if (data.containsKey('last_retry_at')) {
      context.handle(
          _lastRetryAtMeta,
          lastRetryAt.isAcceptableOrUnknown(
              data['last_retry_at']!, _lastRetryAtMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => const {};
  @override
  SyncQueueData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncQueueData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      operationType: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}operation_type'])!,
      tableName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}table_name'])!,
      recordId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}record_id'])!,
      rawData: attachedDatabase.typeMapping
          .read(DriftSqlType.blob, data['${effectivePrefix}raw_data'])!,
      syncStatus: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}sync_status'])!,
      priority: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}priority'])!,
      retryCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}retry_count'])!,
      failedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}failed_at']),
      lastRetryAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}last_retry_at']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $SyncQueueTable createAlias(String alias) {
    return $SyncQueueTable(attachedDatabase, alias);
  }
}

class SyncQueueData extends DataClass implements Insertable<SyncQueueData> {
  final String id;
  final int operationType;
  final String tableName;
  final String recordId;
  final Uint8List rawData;
  final String syncStatus;
  final int priority;
  final int retryCount;
  final DateTime? failedAt;
  final DateTime? lastRetryAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  const SyncQueueData(
      {required this.id,
      required this.operationType,
      required this.tableName,
      required this.recordId,
      required this.rawData,
      required this.syncStatus,
      required this.priority,
      required this.retryCount,
      this.failedAt,
      this.lastRetryAt,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['operation_type'] = Variable<int>(operationType);
    map['table_name'] = Variable<String>(tableName);
    map['record_id'] = Variable<String>(recordId);
    map['raw_data'] = Variable<Uint8List>(rawData);
    map['sync_status'] = Variable<String>(syncStatus);
    map['priority'] = Variable<int>(priority);
    map['retry_count'] = Variable<int>(retryCount);
    if (!nullToAbsent || failedAt != null) {
      map['failed_at'] = Variable<DateTime>(failedAt);
    }
    if (!nullToAbsent || lastRetryAt != null) {
      map['last_retry_at'] = Variable<DateTime>(lastRetryAt);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  SyncQueueCompanion toCompanion(bool nullToAbsent) {
    return SyncQueueCompanion(
      id: Value(id),
      operationType: Value(operationType),
      tableName: Value(tableName),
      recordId: Value(recordId),
      rawData: Value(rawData),
      syncStatus: Value(syncStatus),
      priority: Value(priority),
      retryCount: Value(retryCount),
      failedAt: failedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(failedAt),
      lastRetryAt: lastRetryAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastRetryAt),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory SyncQueueData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncQueueData(
      id: serializer.fromJson<String>(json['id']),
      operationType: serializer.fromJson<int>(json['operationType']),
      tableName: serializer.fromJson<String>(json['tableName']),
      recordId: serializer.fromJson<String>(json['recordId']),
      rawData: serializer.fromJson<Uint8List>(json['rawData']),
      syncStatus: serializer.fromJson<String>(json['syncStatus']),
      priority: serializer.fromJson<int>(json['priority']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
      failedAt: serializer.fromJson<DateTime?>(json['failedAt']),
      lastRetryAt: serializer.fromJson<DateTime?>(json['lastRetryAt']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'operationType': serializer.toJson<int>(operationType),
      'tableName': serializer.toJson<String>(tableName),
      'recordId': serializer.toJson<String>(recordId),
      'rawData': serializer.toJson<Uint8List>(rawData),
      'syncStatus': serializer.toJson<String>(syncStatus),
      'priority': serializer.toJson<int>(priority),
      'retryCount': serializer.toJson<int>(retryCount),
      'failedAt': serializer.toJson<DateTime?>(failedAt),
      'lastRetryAt': serializer.toJson<DateTime?>(lastRetryAt),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  SyncQueueData copyWith(
          {String? id,
          int? operationType,
          String? tableName,
          String? recordId,
          Uint8List? rawData,
          String? syncStatus,
          int? priority,
          int? retryCount,
          Value<DateTime?> failedAt = const Value.absent(),
          Value<DateTime?> lastRetryAt = const Value.absent(),
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      SyncQueueData(
        id: id ?? this.id,
        operationType: operationType ?? this.operationType,
        tableName: tableName ?? this.tableName,
        recordId: recordId ?? this.recordId,
        rawData: rawData ?? this.rawData,
        syncStatus: syncStatus ?? this.syncStatus,
        priority: priority ?? this.priority,
        retryCount: retryCount ?? this.retryCount,
        failedAt: failedAt.present ? failedAt.value : this.failedAt,
        lastRetryAt: lastRetryAt.present ? lastRetryAt.value : this.lastRetryAt,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  SyncQueueData copyWithCompanion(SyncQueueCompanion data) {
    return SyncQueueData(
      id: data.id.present ? data.id.value : this.id,
      operationType: data.operationType.present
          ? data.operationType.value
          : this.operationType,
      tableName: data.tableName.present ? data.tableName.value : this.tableName,
      recordId: data.recordId.present ? data.recordId.value : this.recordId,
      rawData: data.rawData.present ? data.rawData.value : this.rawData,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      priority: data.priority.present ? data.priority.value : this.priority,
      retryCount:
          data.retryCount.present ? data.retryCount.value : this.retryCount,
      failedAt: data.failedAt.present ? data.failedAt.value : this.failedAt,
      lastRetryAt:
          data.lastRetryAt.present ? data.lastRetryAt.value : this.lastRetryAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncQueueData(')
          ..write('id: $id, ')
          ..write('operationType: $operationType, ')
          ..write('tableName: $tableName, ')
          ..write('recordId: $recordId, ')
          ..write('rawData: $rawData, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('priority: $priority, ')
          ..write('retryCount: $retryCount, ')
          ..write('failedAt: $failedAt, ')
          ..write('lastRetryAt: $lastRetryAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      operationType,
      tableName,
      recordId,
      $driftBlobEquality.hash(rawData),
      syncStatus,
      priority,
      retryCount,
      failedAt,
      lastRetryAt,
      createdAt,
      updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncQueueData &&
          other.id == this.id &&
          other.operationType == this.operationType &&
          other.tableName == this.tableName &&
          other.recordId == this.recordId &&
          $driftBlobEquality.equals(other.rawData, this.rawData) &&
          other.syncStatus == this.syncStatus &&
          other.priority == this.priority &&
          other.retryCount == this.retryCount &&
          other.failedAt == this.failedAt &&
          other.lastRetryAt == this.lastRetryAt &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class SyncQueueCompanion extends UpdateCompanion<SyncQueueData> {
  final Value<String> id;
  final Value<int> operationType;
  final Value<String> tableName;
  final Value<String> recordId;
  final Value<Uint8List> rawData;
  final Value<String> syncStatus;
  final Value<int> priority;
  final Value<int> retryCount;
  final Value<DateTime?> failedAt;
  final Value<DateTime?> lastRetryAt;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const SyncQueueCompanion({
    this.id = const Value.absent(),
    this.operationType = const Value.absent(),
    this.tableName = const Value.absent(),
    this.recordId = const Value.absent(),
    this.rawData = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.priority = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.failedAt = const Value.absent(),
    this.lastRetryAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SyncQueueCompanion.insert({
    required String id,
    required int operationType,
    required String tableName,
    required String recordId,
    required Uint8List rawData,
    this.syncStatus = const Value.absent(),
    this.priority = const Value.absent(),
    required int retryCount,
    this.failedAt = const Value.absent(),
    this.lastRetryAt = const Value.absent(),
    required DateTime createdAt,
    required DateTime updatedAt,
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        operationType = Value(operationType),
        tableName = Value(tableName),
        recordId = Value(recordId),
        rawData = Value(rawData),
        retryCount = Value(retryCount),
        createdAt = Value(createdAt),
        updatedAt = Value(updatedAt);
  static Insertable<SyncQueueData> custom({
    Expression<String>? id,
    Expression<int>? operationType,
    Expression<String>? tableName,
    Expression<String>? recordId,
    Expression<Uint8List>? rawData,
    Expression<String>? syncStatus,
    Expression<int>? priority,
    Expression<int>? retryCount,
    Expression<DateTime>? failedAt,
    Expression<DateTime>? lastRetryAt,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (operationType != null) 'operation_type': operationType,
      if (tableName != null) 'table_name': tableName,
      if (recordId != null) 'record_id': recordId,
      if (rawData != null) 'raw_data': rawData,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (priority != null) 'priority': priority,
      if (retryCount != null) 'retry_count': retryCount,
      if (failedAt != null) 'failed_at': failedAt,
      if (lastRetryAt != null) 'last_retry_at': lastRetryAt,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SyncQueueCompanion copyWith(
      {Value<String>? id,
      Value<int>? operationType,
      Value<String>? tableName,
      Value<String>? recordId,
      Value<Uint8List>? rawData,
      Value<String>? syncStatus,
      Value<int>? priority,
      Value<int>? retryCount,
      Value<DateTime?>? failedAt,
      Value<DateTime?>? lastRetryAt,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<int>? rowid}) {
    return SyncQueueCompanion(
      id: id ?? this.id,
      operationType: operationType ?? this.operationType,
      tableName: tableName ?? this.tableName,
      recordId: recordId ?? this.recordId,
      rawData: rawData ?? this.rawData,
      syncStatus: syncStatus ?? this.syncStatus,
      priority: priority ?? this.priority,
      retryCount: retryCount ?? this.retryCount,
      failedAt: failedAt ?? this.failedAt,
      lastRetryAt: lastRetryAt ?? this.lastRetryAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (operationType.present) {
      map['operation_type'] = Variable<int>(operationType.value);
    }
    if (tableName.present) {
      map['table_name'] = Variable<String>(tableName.value);
    }
    if (recordId.present) {
      map['record_id'] = Variable<String>(recordId.value);
    }
    if (rawData.present) {
      map['raw_data'] = Variable<Uint8List>(rawData.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>(syncStatus.value);
    }
    if (priority.present) {
      map['priority'] = Variable<int>(priority.value);
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    if (failedAt.present) {
      map['failed_at'] = Variable<DateTime>(failedAt.value);
    }
    if (lastRetryAt.present) {
      map['last_retry_at'] = Variable<DateTime>(lastRetryAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncQueueCompanion(')
          ..write('id: $id, ')
          ..write('operationType: $operationType, ')
          ..write('tableName: $tableName, ')
          ..write('recordId: $recordId, ')
          ..write('rawData: $rawData, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('priority: $priority, ')
          ..write('retryCount: $retryCount, ')
          ..write('failedAt: $failedAt, ')
          ..write('lastRetryAt: $lastRetryAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineSettingsTable extends OfflineSettings
    with TableInfo<$OfflineSettingsTable, OfflineSetting> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineSettingsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
      'key', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
      'value', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _descriptionMeta =
      const VerificationMeta('description');
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
      'description', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns =>
      [key, value, description, createdAt, updatedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_settings';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineSetting> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(
          _keyMeta, key.isAcceptableOrUnknown(data['key']!, _keyMeta));
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(
          _valueMeta, value.isAcceptableOrUnknown(data['value']!, _valueMeta));
    } else if (isInserting) {
      context.missing(_valueMeta);
    }
    if (data.containsKey('description')) {
      context.handle(
          _descriptionMeta,
          description.isAcceptableOrUnknown(
              data['description']!, _descriptionMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => const {};
  @override
  OfflineSetting map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineSetting(
      key: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}key'])!,
      value: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}value'])!,
      description: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}description']),
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
    );
  }

  @override
  $OfflineSettingsTable createAlias(String alias) {
    return $OfflineSettingsTable(attachedDatabase, alias);
  }
}

class OfflineSetting extends DataClass implements Insertable<OfflineSetting> {
  final String key;
  final String value;
  final String? description;
  final DateTime createdAt;
  final DateTime updatedAt;
  const OfflineSetting(
      {required this.key,
      required this.value,
      this.description,
      required this.createdAt,
      required this.updatedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['value'] = Variable<String>(value);
    if (!nullToAbsent || description != null) {
      map['description'] = Variable<String>(description);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  OfflineSettingsCompanion toCompanion(bool nullToAbsent) {
    return OfflineSettingsCompanion(
      key: Value(key),
      value: Value(value),
      description: description == null && nullToAbsent
          ? const Value.absent()
          : Value(description),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory OfflineSetting.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineSetting(
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String>(json['value']),
      description: serializer.fromJson<String?>(json['description']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'value': serializer.toJson<String>(value),
      'description': serializer.toJson<String?>(description),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  OfflineSetting copyWith(
          {String? key,
          String? value,
          Value<String?> description = const Value.absent(),
          DateTime? createdAt,
          DateTime? updatedAt}) =>
      OfflineSetting(
        key: key ?? this.key,
        value: value ?? this.value,
        description: description.present ? description.value : this.description,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
  OfflineSetting copyWithCompanion(OfflineSettingsCompanion data) {
    return OfflineSetting(
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
      description:
          data.description.present ? data.description.value : this.description,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSetting(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('description: $description, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(key, value, description, createdAt, updatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineSetting &&
          other.key == this.key &&
          other.value == this.value &&
          other.description == this.description &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class OfflineSettingsCompanion extends UpdateCompanion<OfflineSetting> {
  final Value<String> key;
  final Value<String> value;
  final Value<String?> description;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const OfflineSettingsCompanion({
    this.key = const Value.absent(),
    this.value = const Value.absent(),
    this.description = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineSettingsCompanion.insert({
    required String key,
    required String value,
    this.description = const Value.absent(),
    required DateTime createdAt,
    required DateTime updatedAt,
    this.rowid = const Value.absent(),
  })  : key = Value(key),
        value = Value(value),
        createdAt = Value(createdAt),
        updatedAt = Value(updatedAt);
  static Insertable<OfflineSetting> custom({
    Expression<String>? key,
    Expression<String>? value,
    Expression<String>? description,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (value != null) 'value': value,
      if (description != null) 'description': description,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineSettingsCompanion copyWith(
      {Value<String>? key,
      Value<String>? value,
      Value<String?>? description,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<int>? rowid}) {
    return OfflineSettingsCompanion(
      key: key ?? this.key,
      value: value ?? this.value,
      description: description ?? this.description,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSettingsCompanion(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('description: $description, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $ProductsTable products = $ProductsTable(this);
  late final $OfflineSalesTable offlineSales = $OfflineSalesTable(this);
  late final $OfflineSaleItemsTable offlineSaleItems =
      $OfflineSaleItemsTable(this);
  late final $OfflineStockLevelsTable offlineStockLevels =
      $OfflineStockLevelsTable(this);
  late final $SyncQueueTable syncQueue = $SyncQueueTable(this);
  late final $OfflineSettingsTable offlineSettings =
      $OfflineSettingsTable(this);
  Selectable<Product> selectProductsByStore(String storeId) {
    return customSelect('SELECT * FROM products WHERE store_id = ?1',
        variables: [
          Variable<String>(storeId)
        ],
        readsFrom: {
          products,
        }).asyncMap(products.mapFromRow);
  }

  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
        products,
        offlineSales,
        offlineSaleItems,
        offlineStockLevels,
        syncQueue,
        offlineSettings
      ];
}

typedef $$ProductsTableCreateCompanionBuilder = ProductsCompanion Function({
  required String id,
  Value<String?> sku,
  Value<String?> name,
  Value<String?> barcode,
  Value<double?> mrp,
  Value<double?> sellingPrice,
  Value<String?> categoryId,
  required String storeId,
  required int stockQuantity,
  Value<String?> unit,
  Value<String?> description,
  required DateTime createdAt,
  required DateTime updatedAt,
  Value<String> syncStatus,
  Value<String?> syncId,
  Value<int> rowid,
});
typedef $$ProductsTableUpdateCompanionBuilder = ProductsCompanion Function({
  Value<String> id,
  Value<String?> sku,
  Value<String?> name,
  Value<String?> barcode,
  Value<double?> mrp,
  Value<double?> sellingPrice,
  Value<String?> categoryId,
  Value<String> storeId,
  Value<int> stockQuantity,
  Value<String?> unit,
  Value<String?> description,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<String> syncStatus,
  Value<String?> syncId,
  Value<int> rowid,
});

class $$ProductsTableFilterComposer
    extends Composer<_$AppDatabase, $ProductsTable> {
  $$ProductsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get sku => $composableBuilder(
      column: $table.sku, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get barcode => $composableBuilder(
      column: $table.barcode, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get mrp => $composableBuilder(
      column: $table.mrp, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get sellingPrice => $composableBuilder(
      column: $table.sellingPrice, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get categoryId => $composableBuilder(
      column: $table.categoryId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get storeId => $composableBuilder(
      column: $table.storeId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get stockQuantity => $composableBuilder(
      column: $table.stockQuantity, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get unit => $composableBuilder(
      column: $table.unit, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnFilters(column));
}

class $$ProductsTableOrderingComposer
    extends Composer<_$AppDatabase, $ProductsTable> {
  $$ProductsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get sku => $composableBuilder(
      column: $table.sku, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get barcode => $composableBuilder(
      column: $table.barcode, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get mrp => $composableBuilder(
      column: $table.mrp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get sellingPrice => $composableBuilder(
      column: $table.sellingPrice,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get categoryId => $composableBuilder(
      column: $table.categoryId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get storeId => $composableBuilder(
      column: $table.storeId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get stockQuantity => $composableBuilder(
      column: $table.stockQuantity,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get unit => $composableBuilder(
      column: $table.unit, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncId => $composableBuilder(
      column: $table.syncId, builder: (column) => ColumnOrderings(column));
}

class $$ProductsTableAnnotationComposer
    extends Composer<_$AppDatabase, $ProductsTable> {
  $$ProductsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get sku =>
      $composableBuilder(column: $table.sku, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get barcode =>
      $composableBuilder(column: $table.barcode, builder: (column) => column);

  GeneratedColumn<double> get mrp =>
      $composableBuilder(column: $table.mrp, builder: (column) => column);

  GeneratedColumn<double> get sellingPrice => $composableBuilder(
      column: $table.sellingPrice, builder: (column) => column);

  GeneratedColumn<String> get categoryId => $composableBuilder(
      column: $table.categoryId, builder: (column) => column);

  GeneratedColumn<String> get storeId =>
      $composableBuilder(column: $table.storeId, builder: (column) => column);

  GeneratedColumn<int> get stockQuantity => $composableBuilder(
      column: $table.stockQuantity, builder: (column) => column);

  GeneratedColumn<String> get unit =>
      $composableBuilder(column: $table.unit, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<String> get syncId =>
      $composableBuilder(column: $table.syncId, builder: (column) => column);
}

class $$ProductsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $ProductsTable,
    Product,
    $$ProductsTableFilterComposer,
    $$ProductsTableOrderingComposer,
    $$ProductsTableAnnotationComposer,
    $$ProductsTableCreateCompanionBuilder,
    $$ProductsTableUpdateCompanionBuilder,
    (Product, BaseReferences<_$AppDatabase, $ProductsTable, Product>),
    Product,
    PrefetchHooks Function()> {
  $$ProductsTableTableManager(_$AppDatabase db, $ProductsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ProductsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ProductsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ProductsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String?> sku = const Value.absent(),
            Value<String?> name = const Value.absent(),
            Value<String?> barcode = const Value.absent(),
            Value<double?> mrp = const Value.absent(),
            Value<double?> sellingPrice = const Value.absent(),
            Value<String?> categoryId = const Value.absent(),
            Value<String> storeId = const Value.absent(),
            Value<int> stockQuantity = const Value.absent(),
            Value<String?> unit = const Value.absent(),
            Value<String?> description = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              ProductsCompanion(
            id: id,
            sku: sku,
            name: name,
            barcode: barcode,
            mrp: mrp,
            sellingPrice: sellingPrice,
            categoryId: categoryId,
            storeId: storeId,
            stockQuantity: stockQuantity,
            unit: unit,
            description: description,
            createdAt: createdAt,
            updatedAt: updatedAt,
            syncStatus: syncStatus,
            syncId: syncId,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            Value<String?> sku = const Value.absent(),
            Value<String?> name = const Value.absent(),
            Value<String?> barcode = const Value.absent(),
            Value<double?> mrp = const Value.absent(),
            Value<double?> sellingPrice = const Value.absent(),
            Value<String?> categoryId = const Value.absent(),
            required String storeId,
            required int stockQuantity,
            Value<String?> unit = const Value.absent(),
            Value<String?> description = const Value.absent(),
            required DateTime createdAt,
            required DateTime updatedAt,
            Value<String> syncStatus = const Value.absent(),
            Value<String?> syncId = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              ProductsCompanion.insert(
            id: id,
            sku: sku,
            name: name,
            barcode: barcode,
            mrp: mrp,
            sellingPrice: sellingPrice,
            categoryId: categoryId,
            storeId: storeId,
            stockQuantity: stockQuantity,
            unit: unit,
            description: description,
            createdAt: createdAt,
            updatedAt: updatedAt,
            syncStatus: syncStatus,
            syncId: syncId,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$ProductsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $ProductsTable,
    Product,
    $$ProductsTableFilterComposer,
    $$ProductsTableOrderingComposer,
    $$ProductsTableAnnotationComposer,
    $$ProductsTableCreateCompanionBuilder,
    $$ProductsTableUpdateCompanionBuilder,
    (Product, BaseReferences<_$AppDatabase, $ProductsTable, Product>),
    Product,
    PrefetchHooks Function()>;
typedef $$OfflineSalesTableCreateCompanionBuilder = OfflineSalesCompanion
    Function({
  required String id,
  Value<String?> saleId,
  Value<String?> orderId,
  required String storeId,
  Value<String?> cashierId,
  Value<String?> customerId,
  required int totalAmount,
  required int paymentAmount,
  required int changeAmount,
  Value<int?> paymentMode,
  Value<String?> paymentReference,
  required DateTime saleTime,
  required int itemCount,
  Value<String> syncStatus,
  Value<String?> error,
  required int retryCount,
  required DateTime createdAt,
  required DateTime updatedAt,
  Value<int> rowid,
});
typedef $$OfflineSalesTableUpdateCompanionBuilder = OfflineSalesCompanion
    Function({
  Value<String> id,
  Value<String?> saleId,
  Value<String?> orderId,
  Value<String> storeId,
  Value<String?> cashierId,
  Value<String?> customerId,
  Value<int> totalAmount,
  Value<int> paymentAmount,
  Value<int> changeAmount,
  Value<int?> paymentMode,
  Value<String?> paymentReference,
  Value<DateTime> saleTime,
  Value<int> itemCount,
  Value<String> syncStatus,
  Value<String?> error,
  Value<int> retryCount,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$OfflineSalesTableFilterComposer
    extends Composer<_$AppDatabase, $OfflineSalesTable> {
  $$OfflineSalesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get saleId => $composableBuilder(
      column: $table.saleId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get orderId => $composableBuilder(
      column: $table.orderId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get storeId => $composableBuilder(
      column: $table.storeId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get cashierId => $composableBuilder(
      column: $table.cashierId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get customerId => $composableBuilder(
      column: $table.customerId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get totalAmount => $composableBuilder(
      column: $table.totalAmount, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get paymentAmount => $composableBuilder(
      column: $table.paymentAmount, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get changeAmount => $composableBuilder(
      column: $table.changeAmount, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get paymentMode => $composableBuilder(
      column: $table.paymentMode, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get paymentReference => $composableBuilder(
      column: $table.paymentReference,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get saleTime => $composableBuilder(
      column: $table.saleTime, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get itemCount => $composableBuilder(
      column: $table.itemCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get error => $composableBuilder(
      column: $table.error, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$OfflineSalesTableOrderingComposer
    extends Composer<_$AppDatabase, $OfflineSalesTable> {
  $$OfflineSalesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get saleId => $composableBuilder(
      column: $table.saleId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get orderId => $composableBuilder(
      column: $table.orderId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get storeId => $composableBuilder(
      column: $table.storeId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get cashierId => $composableBuilder(
      column: $table.cashierId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get customerId => $composableBuilder(
      column: $table.customerId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get totalAmount => $composableBuilder(
      column: $table.totalAmount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get paymentAmount => $composableBuilder(
      column: $table.paymentAmount,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get changeAmount => $composableBuilder(
      column: $table.changeAmount,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get paymentMode => $composableBuilder(
      column: $table.paymentMode, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get paymentReference => $composableBuilder(
      column: $table.paymentReference,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get saleTime => $composableBuilder(
      column: $table.saleTime, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get itemCount => $composableBuilder(
      column: $table.itemCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get error => $composableBuilder(
      column: $table.error, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$OfflineSalesTableAnnotationComposer
    extends Composer<_$AppDatabase, $OfflineSalesTable> {
  $$OfflineSalesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get saleId =>
      $composableBuilder(column: $table.saleId, builder: (column) => column);

  GeneratedColumn<String> get orderId =>
      $composableBuilder(column: $table.orderId, builder: (column) => column);

  GeneratedColumn<String> get storeId =>
      $composableBuilder(column: $table.storeId, builder: (column) => column);

  GeneratedColumn<String> get cashierId =>
      $composableBuilder(column: $table.cashierId, builder: (column) => column);

  GeneratedColumn<String> get customerId => $composableBuilder(
      column: $table.customerId, builder: (column) => column);

  GeneratedColumn<int> get totalAmount => $composableBuilder(
      column: $table.totalAmount, builder: (column) => column);

  GeneratedColumn<int> get paymentAmount => $composableBuilder(
      column: $table.paymentAmount, builder: (column) => column);

  GeneratedColumn<int> get changeAmount => $composableBuilder(
      column: $table.changeAmount, builder: (column) => column);

  GeneratedColumn<int> get paymentMode => $composableBuilder(
      column: $table.paymentMode, builder: (column) => column);

  GeneratedColumn<String> get paymentReference => $composableBuilder(
      column: $table.paymentReference, builder: (column) => column);

  GeneratedColumn<DateTime> get saleTime =>
      $composableBuilder(column: $table.saleTime, builder: (column) => column);

  GeneratedColumn<int> get itemCount =>
      $composableBuilder(column: $table.itemCount, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<String> get error =>
      $composableBuilder(column: $table.error, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$OfflineSalesTableTableManager extends RootTableManager<
    _$AppDatabase,
    $OfflineSalesTable,
    OfflineSale,
    $$OfflineSalesTableFilterComposer,
    $$OfflineSalesTableOrderingComposer,
    $$OfflineSalesTableAnnotationComposer,
    $$OfflineSalesTableCreateCompanionBuilder,
    $$OfflineSalesTableUpdateCompanionBuilder,
    (
      OfflineSale,
      BaseReferences<_$AppDatabase, $OfflineSalesTable, OfflineSale>
    ),
    OfflineSale,
    PrefetchHooks Function()> {
  $$OfflineSalesTableTableManager(_$AppDatabase db, $OfflineSalesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineSalesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineSalesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineSalesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String?> saleId = const Value.absent(),
            Value<String?> orderId = const Value.absent(),
            Value<String> storeId = const Value.absent(),
            Value<String?> cashierId = const Value.absent(),
            Value<String?> customerId = const Value.absent(),
            Value<int> totalAmount = const Value.absent(),
            Value<int> paymentAmount = const Value.absent(),
            Value<int> changeAmount = const Value.absent(),
            Value<int?> paymentMode = const Value.absent(),
            Value<String?> paymentReference = const Value.absent(),
            Value<DateTime> saleTime = const Value.absent(),
            Value<int> itemCount = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            Value<String?> error = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineSalesCompanion(
            id: id,
            saleId: saleId,
            orderId: orderId,
            storeId: storeId,
            cashierId: cashierId,
            customerId: customerId,
            totalAmount: totalAmount,
            paymentAmount: paymentAmount,
            changeAmount: changeAmount,
            paymentMode: paymentMode,
            paymentReference: paymentReference,
            saleTime: saleTime,
            itemCount: itemCount,
            syncStatus: syncStatus,
            error: error,
            retryCount: retryCount,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            Value<String?> saleId = const Value.absent(),
            Value<String?> orderId = const Value.absent(),
            required String storeId,
            Value<String?> cashierId = const Value.absent(),
            Value<String?> customerId = const Value.absent(),
            required int totalAmount,
            required int paymentAmount,
            required int changeAmount,
            Value<int?> paymentMode = const Value.absent(),
            Value<String?> paymentReference = const Value.absent(),
            required DateTime saleTime,
            required int itemCount,
            Value<String> syncStatus = const Value.absent(),
            Value<String?> error = const Value.absent(),
            required int retryCount,
            required DateTime createdAt,
            required DateTime updatedAt,
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineSalesCompanion.insert(
            id: id,
            saleId: saleId,
            orderId: orderId,
            storeId: storeId,
            cashierId: cashierId,
            customerId: customerId,
            totalAmount: totalAmount,
            paymentAmount: paymentAmount,
            changeAmount: changeAmount,
            paymentMode: paymentMode,
            paymentReference: paymentReference,
            saleTime: saleTime,
            itemCount: itemCount,
            syncStatus: syncStatus,
            error: error,
            retryCount: retryCount,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineSalesTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $OfflineSalesTable,
    OfflineSale,
    $$OfflineSalesTableFilterComposer,
    $$OfflineSalesTableOrderingComposer,
    $$OfflineSalesTableAnnotationComposer,
    $$OfflineSalesTableCreateCompanionBuilder,
    $$OfflineSalesTableUpdateCompanionBuilder,
    (
      OfflineSale,
      BaseReferences<_$AppDatabase, $OfflineSalesTable, OfflineSale>
    ),
    OfflineSale,
    PrefetchHooks Function()>;
typedef $$OfflineSaleItemsTableCreateCompanionBuilder
    = OfflineSaleItemsCompanion Function({
  required String id,
  required String saleId,
  required String productId,
  required String productName,
  required int quantity,
  required double price,
  required double discount,
  required double total,
  Value<int?> tax,
  Value<String?> barcode,
  Value<int> rowid,
});
typedef $$OfflineSaleItemsTableUpdateCompanionBuilder
    = OfflineSaleItemsCompanion Function({
  Value<String> id,
  Value<String> saleId,
  Value<String> productId,
  Value<String> productName,
  Value<int> quantity,
  Value<double> price,
  Value<double> discount,
  Value<double> total,
  Value<int?> tax,
  Value<String?> barcode,
  Value<int> rowid,
});

class $$OfflineSaleItemsTableFilterComposer
    extends Composer<_$AppDatabase, $OfflineSaleItemsTable> {
  $$OfflineSaleItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get saleId => $composableBuilder(
      column: $table.saleId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get productId => $composableBuilder(
      column: $table.productId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get productName => $composableBuilder(
      column: $table.productName, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get quantity => $composableBuilder(
      column: $table.quantity, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get price => $composableBuilder(
      column: $table.price, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get discount => $composableBuilder(
      column: $table.discount, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get total => $composableBuilder(
      column: $table.total, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get tax => $composableBuilder(
      column: $table.tax, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get barcode => $composableBuilder(
      column: $table.barcode, builder: (column) => ColumnFilters(column));
}

class $$OfflineSaleItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $OfflineSaleItemsTable> {
  $$OfflineSaleItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get saleId => $composableBuilder(
      column: $table.saleId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get productId => $composableBuilder(
      column: $table.productId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get productName => $composableBuilder(
      column: $table.productName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get quantity => $composableBuilder(
      column: $table.quantity, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get price => $composableBuilder(
      column: $table.price, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get discount => $composableBuilder(
      column: $table.discount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get total => $composableBuilder(
      column: $table.total, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get tax => $composableBuilder(
      column: $table.tax, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get barcode => $composableBuilder(
      column: $table.barcode, builder: (column) => ColumnOrderings(column));
}

class $$OfflineSaleItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $OfflineSaleItemsTable> {
  $$OfflineSaleItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get saleId =>
      $composableBuilder(column: $table.saleId, builder: (column) => column);

  GeneratedColumn<String> get productId =>
      $composableBuilder(column: $table.productId, builder: (column) => column);

  GeneratedColumn<String> get productName => $composableBuilder(
      column: $table.productName, builder: (column) => column);

  GeneratedColumn<int> get quantity =>
      $composableBuilder(column: $table.quantity, builder: (column) => column);

  GeneratedColumn<double> get price =>
      $composableBuilder(column: $table.price, builder: (column) => column);

  GeneratedColumn<double> get discount =>
      $composableBuilder(column: $table.discount, builder: (column) => column);

  GeneratedColumn<double> get total =>
      $composableBuilder(column: $table.total, builder: (column) => column);

  GeneratedColumn<int> get tax =>
      $composableBuilder(column: $table.tax, builder: (column) => column);

  GeneratedColumn<String> get barcode =>
      $composableBuilder(column: $table.barcode, builder: (column) => column);
}

class $$OfflineSaleItemsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $OfflineSaleItemsTable,
    OfflineSaleItem,
    $$OfflineSaleItemsTableFilterComposer,
    $$OfflineSaleItemsTableOrderingComposer,
    $$OfflineSaleItemsTableAnnotationComposer,
    $$OfflineSaleItemsTableCreateCompanionBuilder,
    $$OfflineSaleItemsTableUpdateCompanionBuilder,
    (
      OfflineSaleItem,
      BaseReferences<_$AppDatabase, $OfflineSaleItemsTable, OfflineSaleItem>
    ),
    OfflineSaleItem,
    PrefetchHooks Function()> {
  $$OfflineSaleItemsTableTableManager(
      _$AppDatabase db, $OfflineSaleItemsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineSaleItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineSaleItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineSaleItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> saleId = const Value.absent(),
            Value<String> productId = const Value.absent(),
            Value<String> productName = const Value.absent(),
            Value<int> quantity = const Value.absent(),
            Value<double> price = const Value.absent(),
            Value<double> discount = const Value.absent(),
            Value<double> total = const Value.absent(),
            Value<int?> tax = const Value.absent(),
            Value<String?> barcode = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineSaleItemsCompanion(
            id: id,
            saleId: saleId,
            productId: productId,
            productName: productName,
            quantity: quantity,
            price: price,
            discount: discount,
            total: total,
            tax: tax,
            barcode: barcode,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String saleId,
            required String productId,
            required String productName,
            required int quantity,
            required double price,
            required double discount,
            required double total,
            Value<int?> tax = const Value.absent(),
            Value<String?> barcode = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineSaleItemsCompanion.insert(
            id: id,
            saleId: saleId,
            productId: productId,
            productName: productName,
            quantity: quantity,
            price: price,
            discount: discount,
            total: total,
            tax: tax,
            barcode: barcode,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineSaleItemsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $OfflineSaleItemsTable,
    OfflineSaleItem,
    $$OfflineSaleItemsTableFilterComposer,
    $$OfflineSaleItemsTableOrderingComposer,
    $$OfflineSaleItemsTableAnnotationComposer,
    $$OfflineSaleItemsTableCreateCompanionBuilder,
    $$OfflineSaleItemsTableUpdateCompanionBuilder,
    (
      OfflineSaleItem,
      BaseReferences<_$AppDatabase, $OfflineSaleItemsTable, OfflineSaleItem>
    ),
    OfflineSaleItem,
    PrefetchHooks Function()>;
typedef $$OfflineStockLevelsTableCreateCompanionBuilder
    = OfflineStockLevelsCompanion Function({
  required String id,
  required String storeId,
  required String itemId,
  required int quantity,
  required int lastUpdatedTimestamp,
  Value<String> syncStatus,
  required DateTime createdAt,
  required DateTime updatedAt,
  Value<int> rowid,
});
typedef $$OfflineStockLevelsTableUpdateCompanionBuilder
    = OfflineStockLevelsCompanion Function({
  Value<String> id,
  Value<String> storeId,
  Value<String> itemId,
  Value<int> quantity,
  Value<int> lastUpdatedTimestamp,
  Value<String> syncStatus,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$OfflineStockLevelsTableFilterComposer
    extends Composer<_$AppDatabase, $OfflineStockLevelsTable> {
  $$OfflineStockLevelsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get storeId => $composableBuilder(
      column: $table.storeId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get itemId => $composableBuilder(
      column: $table.itemId, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get quantity => $composableBuilder(
      column: $table.quantity, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get lastUpdatedTimestamp => $composableBuilder(
      column: $table.lastUpdatedTimestamp,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$OfflineStockLevelsTableOrderingComposer
    extends Composer<_$AppDatabase, $OfflineStockLevelsTable> {
  $$OfflineStockLevelsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get storeId => $composableBuilder(
      column: $table.storeId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get itemId => $composableBuilder(
      column: $table.itemId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get quantity => $composableBuilder(
      column: $table.quantity, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get lastUpdatedTimestamp => $composableBuilder(
      column: $table.lastUpdatedTimestamp,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$OfflineStockLevelsTableAnnotationComposer
    extends Composer<_$AppDatabase, $OfflineStockLevelsTable> {
  $$OfflineStockLevelsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get storeId =>
      $composableBuilder(column: $table.storeId, builder: (column) => column);

  GeneratedColumn<String> get itemId =>
      $composableBuilder(column: $table.itemId, builder: (column) => column);

  GeneratedColumn<int> get quantity =>
      $composableBuilder(column: $table.quantity, builder: (column) => column);

  GeneratedColumn<int> get lastUpdatedTimestamp => $composableBuilder(
      column: $table.lastUpdatedTimestamp, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$OfflineStockLevelsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $OfflineStockLevelsTable,
    OfflineStockLevel,
    $$OfflineStockLevelsTableFilterComposer,
    $$OfflineStockLevelsTableOrderingComposer,
    $$OfflineStockLevelsTableAnnotationComposer,
    $$OfflineStockLevelsTableCreateCompanionBuilder,
    $$OfflineStockLevelsTableUpdateCompanionBuilder,
    (
      OfflineStockLevel,
      BaseReferences<_$AppDatabase, $OfflineStockLevelsTable, OfflineStockLevel>
    ),
    OfflineStockLevel,
    PrefetchHooks Function()> {
  $$OfflineStockLevelsTableTableManager(
      _$AppDatabase db, $OfflineStockLevelsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineStockLevelsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineStockLevelsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineStockLevelsTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> storeId = const Value.absent(),
            Value<String> itemId = const Value.absent(),
            Value<int> quantity = const Value.absent(),
            Value<int> lastUpdatedTimestamp = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineStockLevelsCompanion(
            id: id,
            storeId: storeId,
            itemId: itemId,
            quantity: quantity,
            lastUpdatedTimestamp: lastUpdatedTimestamp,
            syncStatus: syncStatus,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String storeId,
            required String itemId,
            required int quantity,
            required int lastUpdatedTimestamp,
            Value<String> syncStatus = const Value.absent(),
            required DateTime createdAt,
            required DateTime updatedAt,
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineStockLevelsCompanion.insert(
            id: id,
            storeId: storeId,
            itemId: itemId,
            quantity: quantity,
            lastUpdatedTimestamp: lastUpdatedTimestamp,
            syncStatus: syncStatus,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineStockLevelsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $OfflineStockLevelsTable,
    OfflineStockLevel,
    $$OfflineStockLevelsTableFilterComposer,
    $$OfflineStockLevelsTableOrderingComposer,
    $$OfflineStockLevelsTableAnnotationComposer,
    $$OfflineStockLevelsTableCreateCompanionBuilder,
    $$OfflineStockLevelsTableUpdateCompanionBuilder,
    (
      OfflineStockLevel,
      BaseReferences<_$AppDatabase, $OfflineStockLevelsTable, OfflineStockLevel>
    ),
    OfflineStockLevel,
    PrefetchHooks Function()>;
typedef $$SyncQueueTableCreateCompanionBuilder = SyncQueueCompanion Function({
  required String id,
  required int operationType,
  required String tableName,
  required String recordId,
  required Uint8List rawData,
  Value<String> syncStatus,
  Value<int> priority,
  required int retryCount,
  Value<DateTime?> failedAt,
  Value<DateTime?> lastRetryAt,
  required DateTime createdAt,
  required DateTime updatedAt,
  Value<int> rowid,
});
typedef $$SyncQueueTableUpdateCompanionBuilder = SyncQueueCompanion Function({
  Value<String> id,
  Value<int> operationType,
  Value<String> tableName,
  Value<String> recordId,
  Value<Uint8List> rawData,
  Value<String> syncStatus,
  Value<int> priority,
  Value<int> retryCount,
  Value<DateTime?> failedAt,
  Value<DateTime?> lastRetryAt,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$SyncQueueTableFilterComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get operationType => $composableBuilder(
      column: $table.operationType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get tableName => $composableBuilder(
      column: $table.tableName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get recordId => $composableBuilder(
      column: $table.recordId, builder: (column) => ColumnFilters(column));

  ColumnFilters<Uint8List> get rawData => $composableBuilder(
      column: $table.rawData, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get priority => $composableBuilder(
      column: $table.priority, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get failedAt => $composableBuilder(
      column: $table.failedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastRetryAt => $composableBuilder(
      column: $table.lastRetryAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$SyncQueueTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get operationType => $composableBuilder(
      column: $table.operationType,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get tableName => $composableBuilder(
      column: $table.tableName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get recordId => $composableBuilder(
      column: $table.recordId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<Uint8List> get rawData => $composableBuilder(
      column: $table.rawData, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get priority => $composableBuilder(
      column: $table.priority, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get failedAt => $composableBuilder(
      column: $table.failedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastRetryAt => $composableBuilder(
      column: $table.lastRetryAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$SyncQueueTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get operationType => $composableBuilder(
      column: $table.operationType, builder: (column) => column);

  GeneratedColumn<String> get tableName =>
      $composableBuilder(column: $table.tableName, builder: (column) => column);

  GeneratedColumn<String> get recordId =>
      $composableBuilder(column: $table.recordId, builder: (column) => column);

  GeneratedColumn<Uint8List> get rawData =>
      $composableBuilder(column: $table.rawData, builder: (column) => column);

  GeneratedColumn<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<int> get priority =>
      $composableBuilder(column: $table.priority, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => column);

  GeneratedColumn<DateTime> get failedAt =>
      $composableBuilder(column: $table.failedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get lastRetryAt => $composableBuilder(
      column: $table.lastRetryAt, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$SyncQueueTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SyncQueueTable,
    SyncQueueData,
    $$SyncQueueTableFilterComposer,
    $$SyncQueueTableOrderingComposer,
    $$SyncQueueTableAnnotationComposer,
    $$SyncQueueTableCreateCompanionBuilder,
    $$SyncQueueTableUpdateCompanionBuilder,
    (
      SyncQueueData,
      BaseReferences<_$AppDatabase, $SyncQueueTable, SyncQueueData>
    ),
    SyncQueueData,
    PrefetchHooks Function()> {
  $$SyncQueueTableTableManager(_$AppDatabase db, $SyncQueueTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncQueueTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncQueueTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncQueueTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<int> operationType = const Value.absent(),
            Value<String> tableName = const Value.absent(),
            Value<String> recordId = const Value.absent(),
            Value<Uint8List> rawData = const Value.absent(),
            Value<String> syncStatus = const Value.absent(),
            Value<int> priority = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<DateTime?> failedAt = const Value.absent(),
            Value<DateTime?> lastRetryAt = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              SyncQueueCompanion(
            id: id,
            operationType: operationType,
            tableName: tableName,
            recordId: recordId,
            rawData: rawData,
            syncStatus: syncStatus,
            priority: priority,
            retryCount: retryCount,
            failedAt: failedAt,
            lastRetryAt: lastRetryAt,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required int operationType,
            required String tableName,
            required String recordId,
            required Uint8List rawData,
            Value<String> syncStatus = const Value.absent(),
            Value<int> priority = const Value.absent(),
            required int retryCount,
            Value<DateTime?> failedAt = const Value.absent(),
            Value<DateTime?> lastRetryAt = const Value.absent(),
            required DateTime createdAt,
            required DateTime updatedAt,
            Value<int> rowid = const Value.absent(),
          }) =>
              SyncQueueCompanion.insert(
            id: id,
            operationType: operationType,
            tableName: tableName,
            recordId: recordId,
            rawData: rawData,
            syncStatus: syncStatus,
            priority: priority,
            retryCount: retryCount,
            failedAt: failedAt,
            lastRetryAt: lastRetryAt,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$SyncQueueTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SyncQueueTable,
    SyncQueueData,
    $$SyncQueueTableFilterComposer,
    $$SyncQueueTableOrderingComposer,
    $$SyncQueueTableAnnotationComposer,
    $$SyncQueueTableCreateCompanionBuilder,
    $$SyncQueueTableUpdateCompanionBuilder,
    (
      SyncQueueData,
      BaseReferences<_$AppDatabase, $SyncQueueTable, SyncQueueData>
    ),
    SyncQueueData,
    PrefetchHooks Function()>;
typedef $$OfflineSettingsTableCreateCompanionBuilder = OfflineSettingsCompanion
    Function({
  required String key,
  required String value,
  Value<String?> description,
  required DateTime createdAt,
  required DateTime updatedAt,
  Value<int> rowid,
});
typedef $$OfflineSettingsTableUpdateCompanionBuilder = OfflineSettingsCompanion
    Function({
  Value<String> key,
  Value<String> value,
  Value<String?> description,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<int> rowid,
});

class $$OfflineSettingsTableFilterComposer
    extends Composer<_$AppDatabase, $OfflineSettingsTable> {
  $$OfflineSettingsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(
      column: $table.key, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get value => $composableBuilder(
      column: $table.value, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));
}

class $$OfflineSettingsTableOrderingComposer
    extends Composer<_$AppDatabase, $OfflineSettingsTable> {
  $$OfflineSettingsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key => $composableBuilder(
      column: $table.key, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get value => $composableBuilder(
      column: $table.value, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));
}

class $$OfflineSettingsTableAnnotationComposer
    extends Composer<_$AppDatabase, $OfflineSettingsTable> {
  $$OfflineSettingsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$OfflineSettingsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $OfflineSettingsTable,
    OfflineSetting,
    $$OfflineSettingsTableFilterComposer,
    $$OfflineSettingsTableOrderingComposer,
    $$OfflineSettingsTableAnnotationComposer,
    $$OfflineSettingsTableCreateCompanionBuilder,
    $$OfflineSettingsTableUpdateCompanionBuilder,
    (
      OfflineSetting,
      BaseReferences<_$AppDatabase, $OfflineSettingsTable, OfflineSetting>
    ),
    OfflineSetting,
    PrefetchHooks Function()> {
  $$OfflineSettingsTableTableManager(
      _$AppDatabase db, $OfflineSettingsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineSettingsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineSettingsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineSettingsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> key = const Value.absent(),
            Value<String> value = const Value.absent(),
            Value<String?> description = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineSettingsCompanion(
            key: key,
            value: value,
            description: description,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String key,
            required String value,
            Value<String?> description = const Value.absent(),
            required DateTime createdAt,
            required DateTime updatedAt,
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineSettingsCompanion.insert(
            key: key,
            value: value,
            description: description,
            createdAt: createdAt,
            updatedAt: updatedAt,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineSettingsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $OfflineSettingsTable,
    OfflineSetting,
    $$OfflineSettingsTableFilterComposer,
    $$OfflineSettingsTableOrderingComposer,
    $$OfflineSettingsTableAnnotationComposer,
    $$OfflineSettingsTableCreateCompanionBuilder,
    $$OfflineSettingsTableUpdateCompanionBuilder,
    (
      OfflineSetting,
      BaseReferences<_$AppDatabase, $OfflineSettingsTable, OfflineSetting>
    ),
    OfflineSetting,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$ProductsTableTableManager get products =>
      $$ProductsTableTableManager(_db, _db.products);
  $$OfflineSalesTableTableManager get offlineSales =>
      $$OfflineSalesTableTableManager(_db, _db.offlineSales);
  $$OfflineSaleItemsTableTableManager get offlineSaleItems =>
      $$OfflineSaleItemsTableTableManager(_db, _db.offlineSaleItems);
  $$OfflineStockLevelsTableTableManager get offlineStockLevels =>
      $$OfflineStockLevelsTableTableManager(_db, _db.offlineStockLevels);
  $$SyncQueueTableTableManager get syncQueue =>
      $$SyncQueueTableTableManager(_db, _db.syncQueue);
  $$OfflineSettingsTableTableManager get offlineSettings =>
      $$OfflineSettingsTableTableManager(_db, _db.offlineSettings);
}
