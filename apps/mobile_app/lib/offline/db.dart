import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'db.g.dart';

enum SyncActionType {
  insert,
  update,
  delete,
}

enum SyncActionStatus {
  pending,
  syncing,
  success,
  failed,
}

@DataClassName('SyncAction')
class SyncActions extends Table {
  TextColumn get id => text()();
  IntColumn get actionType => intEnum<SyncActionType>()();
  TextColumn get payload => text()();
  IntColumn get status => intEnum<SyncActionStatus>().withDefault(Constant(SyncActionStatus.pending.index))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [SyncActions])
class OfflineDatabase extends _$OfflineDatabase {
  OfflineDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
      },
    );
  }

  Future<List<SyncAction>> getPendingActions() =>
      (select(syncActions)..where((tbl) => tbl.status.equals(SyncActionStatus.pending.index))).get();

  Future<void> updateActionStatus(String id, SyncActionStatus status) {
    return (update(syncActions)..where((tbl) => tbl.id.equals(id))).write(
      SyncActionsCompanion(
        status: Value(status),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'offline_store.db'));
    return NativeDatabase.createInBackground(file);
  });
}

