import 'package:drift/drift.dart';

part 'tables.g.dart';

@DriftDatabase(
  tables: [
    Products,
    OfflineSales,
    OfflineSaleItems,
    OfflineStockLevels,
    SyncQueue,
    OfflineSettings,
  ],
  queries: {
    'selectProductsByStore': '''
      SELECT * FROM products WHERE store_id = :storeId
    ''',
  },
)
class AppDatabase extends _$AppDatabase {
  AppDatabase(super.e);

  @override
  int get schemaVersion => 1;
}

// Tables
class Products extends Table {
  TextColumn get id => text()();
  TextColumn get sku => text().nullable()();
  TextColumn get name => text().nullable()();
  TextColumn get barcode => text().nullable()();
  RealColumn get mrp => real().nullable()();
  RealColumn get sellingPrice => real().nullable()();
  TextColumn get categoryId => text().nullable()();
  TextColumn get storeId => text()();
  IntColumn get stockQuantity => integer()();
  TextColumn get unit => text().nullable()();
  TextColumn get description => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  TextColumn get syncId => text().nullable()();

  @override
  Set<Column> get primaryKeys => {id};
}

class OfflineSales extends Table {
  TextColumn get id => text()();
  TextColumn get saleId => text().nullable()();
  TextColumn get orderId => text().nullable()();
  TextColumn get storeId => text()();
  TextColumn get cashierId => text().nullable()();
  TextColumn get customerId => text().nullable()();
  IntColumn get totalAmount => integer()();
  IntColumn get paymentAmount => integer()();
  IntColumn get changeAmount => integer()();
  IntColumn get paymentMode => integer().nullable()();
  TextColumn get paymentReference => text().nullable()();
  DateTimeColumn get saleTime => dateTime()();
  IntColumn get itemCount => integer()();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  TextColumn get error => text().nullable()();
  IntColumn get retryCount => integer()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKeys => {id};
}

class OfflineSaleItems extends Table {
  TextColumn get id => text()();
  TextColumn get saleId => text()();
  TextColumn get productId => text()();
  TextColumn get productName => text()();
  IntColumn get quantity => integer()();
  RealColumn get price => real()();
  RealColumn get discount => real()();
  RealColumn get total => real()();
  IntColumn get tax => integer().nullable()();
  TextColumn get barcode => text().nullable()();

  @override
  Set<Column> get primaryKeys => {id};
}

class OfflineStockLevels extends Table {
  TextColumn get id => text()();
  TextColumn get storeId => text()();
  TextColumn get itemId => text()();
  IntColumn get quantity => integer()();
  IntColumn get lastUpdatedTimestamp => integer()();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKeys => {id};
}

class SyncQueue extends Table {
  TextColumn get id => text()();
  IntColumn get operationType => integer()();
  TextColumn get tableName => text()();
  TextColumn get recordId => text()();
  BlobColumn get rawData => blob()();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  IntColumn get priority => integer().withDefault(const Constant(10))();
  IntColumn get retryCount => integer()();
  DateTimeColumn get failedAt => dateTime().nullable()();
  DateTimeColumn get lastRetryAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKeys => {id};
}

class OfflineSettings extends Table {
  TextColumn get key => text().primaryKey()();
  TextColumn get value => text()();
  TextColumn get description => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKeys => {key};
}
