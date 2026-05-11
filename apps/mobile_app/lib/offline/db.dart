import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'db.g.dart';

enum EventSyncStatus {
  pending,
  processing,
  synced,
  failed,
}

@DataClassName('OfflineEvent')
class OfflineEvents extends Table {
  TextColumn get operationId => text()();
  TextColumn get eventType => text()();
  TextColumn get payload => text()();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  IntColumn get syncStatus => intEnum<EventSyncStatus>().withDefault(Constant(EventSyncStatus.pending.index))();
  TextColumn get deviceId => text().nullable()();
  TextColumn get appVersion => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {operationId};
}

@DataClassName('DeadLetterEvent')
class DeadLetterEvents extends Table {
  TextColumn get operationId => text()();
  TextColumn get eventType => text()();
  TextColumn get payload => text()();
  TextColumn get failureReason => text()();
  DateTimeColumn get failedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {operationId};
}

@DataClassName('SyncConflict')
class SyncConflicts extends Table {
  TextColumn get id => text().clientDefault(() => DateTime.now().millisecondsSinceEpoch.toString())();
  TextColumn get operationId => text()();
  TextColumn get productId => text()();
  IntColumn get expectedQuantity => integer()();
  IntColumn get actualQuantity => integer()();
  TextColumn get snapshotPayload => text()();
  DateTimeColumn get detectedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('TelemetrySnapshot')
class TelemetrySnapshots extends Table {
  TextColumn get id => text().clientDefault(() => DateTime.now().millisecondsSinceEpoch.toString())();
  RealColumn get avgLatencyMs => real()();
  RealColumn get successRatio => real()();
  IntColumn get queueDepth => integer()();
  DateTimeColumn get capturedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [OfflineEvents, DeadLetterEvents, SyncConflicts, TelemetrySnapshots])
class OfflineDatabase extends _$OfflineDatabase {
  OfflineDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 4;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
      },
      onUpgrade: (Migrator m, int from, int to) async {
        if (from < 2) {
          await m.createTable(offlineEvents);
          await m.createTable(deadLetterEvents);
          await customStatement('DROP TABLE IF EXISTS sync_actions;');
        }
        if (from < 3) {
          await m.createTable(syncConflicts);
        }
        if (from < 4) {
          await m.createTable(telemetrySnapshots);
        }
      },
    );
  }

  Future<List<OfflineEvent>> getPendingEvents() =>
      (select(offlineEvents)
        ..where((tbl) => tbl.syncStatus.equals(EventSyncStatus.pending.index))
        ..orderBy([(t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.asc)]))
      .get();

  Stream<int> watchPendingCount() {
    final q = selectCountOf(offlineEvents)..where((tbl) => tbl.syncStatus.isBetweenValues(0, 1));
    return q.watchSingle();
  }

  Stream<int> watchDlqCount() {
    return selectCountOf(deadLetterEvents).watchSingle();
  }

  Stream<int> watchConflictCount() {
    return selectCountOf(syncConflicts).watchSingle();
  }

  Future<void> recordConflict({
    required String operationId,
    required String productId,
    required int expected,
    required int actual,
    required String payload,
  }) {
    return into(syncConflicts).insert(SyncConflictsCompanion.insert(
      operationId: operationId,
      productId: productId,
      expectedQuantity: expected,
      actualQuantity: actual,
      snapshotPayload: payload,
    ));
  }

  Future<void> updateEventStatus(String operationId, EventSyncStatus status) {
    return (update(offlineEvents)..where((tbl) => tbl.operationId.equals(operationId))).write(
      OfflineEventsCompanion(
        syncStatus: Value(status),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  Future<void> incrementRetryCount(String operationId) async {
    final event = await (select(offlineEvents)..where((tbl) => tbl.operationId.equals(operationId))).getSingleOrNull();
    if (event != null) {
      await (update(offlineEvents)..where((tbl) => tbl.operationId.equals(operationId))).write(
        OfflineEventsCompanion(
          retryCount: Value(event.retryCount + 1),
          updatedAt: Value(DateTime.now()),
        ),
      );
    }
  }

  // DLQ Management Operations
  Future<List<DeadLetterEvent>> getDeadLetters() => select(deadLetterEvents).get();

  Future<void> retryDeadLetter(String operationId) async {
    await transaction(() async {
      // Fetch data before removing
      final dead = await (select(deadLetterEvents)..where((t) => t.operationId.equals(operationId))).getSingleOrNull();
      if (dead == null) return;

      // Try pushing event back to original queue with reset retry counter
      await (update(offlineEvents)..where((t) => t.operationId.equals(operationId))).write(
        OfflineEventsCompanion(
          syncStatus: const Value(EventSyncStatus.pending),
          retryCount: const Value(0),
          updatedAt: Value(DateTime.now()),
        ),
      );
      // Remove from DLQ
      await (delete(deadLetterEvents)..where((t) => t.operationId.equals(operationId))).go();
    });
  }

  Future<void> dismissDeadLetter(String operationId) async {
    // Simply clear from DLQ, marking permanent dismissal in standard operation lifecycle
    await (delete(deadLetterEvents)..where((t) => t.operationId.equals(operationId))).go();
  }

  // Conflict Operations
  Future<List<SyncConflict>> getConflicts() => select(syncConflicts).get();

  Future<void> resolveConflict(String conflictId) async {
    // Drops resolved conflict tracking entry after user chooses course of action
    await (delete(syncConflicts)..where((t) => t.id.equals(conflictId))).go();
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'offline_store.db'));
    return NativeDatabase.createInBackground(file);
  });
}

