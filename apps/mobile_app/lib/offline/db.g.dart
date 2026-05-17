// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'db.dart';

// ignore_for_file: type=lint
class $OfflineEventsTable extends OfflineEvents
    with TableInfo<$OfflineEventsTable, OfflineEvent> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineEventsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _operationIdMeta = const VerificationMeta(
    'operationId',
  );
  @override
  late final GeneratedColumn<String> operationId = GeneratedColumn<String>(
    'operation_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _eventTypeMeta = const VerificationMeta(
    'eventType',
  );
  @override
  late final GeneratedColumn<String> eventType = GeneratedColumn<String>(
    'event_type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _retryCountMeta = const VerificationMeta(
    'retryCount',
  );
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
    'retry_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  @override
  late final GeneratedColumnWithTypeConverter<EventSyncStatus, int> syncStatus =
      GeneratedColumn<int>(
        'sync_status',
        aliasedName,
        false,
        type: DriftSqlType.int,
        requiredDuringInsert: false,
        defaultValue: Constant(EventSyncStatus.pending.index),
      ).withConverter<EventSyncStatus>(
        $OfflineEventsTable.$convertersyncStatus,
      );
  static const VerificationMeta _deviceIdMeta = const VerificationMeta(
    'deviceId',
  );
  @override
  late final GeneratedColumn<String> deviceId = GeneratedColumn<String>(
    'device_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _appVersionMeta = const VerificationMeta(
    'appVersion',
  );
  @override
  late final GeneratedColumn<String> appVersion = GeneratedColumn<String>(
    'app_version',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    operationId,
    eventType,
    payload,
    retryCount,
    syncStatus,
    deviceId,
    appVersion,
    createdAt,
    updatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_events';
  @override
  VerificationContext validateIntegrity(
    Insertable<OfflineEvent> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('operation_id')) {
      context.handle(
        _operationIdMeta,
        operationId.isAcceptableOrUnknown(
          data['operation_id']!,
          _operationIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_operationIdMeta);
    }
    if (data.containsKey('event_type')) {
      context.handle(
        _eventTypeMeta,
        eventType.isAcceptableOrUnknown(data['event_type']!, _eventTypeMeta),
      );
    } else if (isInserting) {
      context.missing(_eventTypeMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('retry_count')) {
      context.handle(
        _retryCountMeta,
        retryCount.isAcceptableOrUnknown(data['retry_count']!, _retryCountMeta),
      );
    }
    if (data.containsKey('device_id')) {
      context.handle(
        _deviceIdMeta,
        deviceId.isAcceptableOrUnknown(data['device_id']!, _deviceIdMeta),
      );
    }
    if (data.containsKey('app_version')) {
      context.handle(
        _appVersionMeta,
        appVersion.isAcceptableOrUnknown(data['app_version']!, _appVersionMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {operationId};
  @override
  OfflineEvent map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineEvent(
      operationId:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}operation_id'],
          )!,
      eventType:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}event_type'],
          )!,
      payload:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}payload'],
          )!,
      retryCount:
          attachedDatabase.typeMapping.read(
            DriftSqlType.int,
            data['${effectivePrefix}retry_count'],
          )!,
      syncStatus: $OfflineEventsTable.$convertersyncStatus.fromSql(
        attachedDatabase.typeMapping.read(
          DriftSqlType.int,
          data['${effectivePrefix}sync_status'],
        )!,
      ),
      deviceId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}device_id'],
      ),
      appVersion: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}app_version'],
      ),
      createdAt:
          attachedDatabase.typeMapping.read(
            DriftSqlType.dateTime,
            data['${effectivePrefix}created_at'],
          )!,
      updatedAt:
          attachedDatabase.typeMapping.read(
            DriftSqlType.dateTime,
            data['${effectivePrefix}updated_at'],
          )!,
    );
  }

  @override
  $OfflineEventsTable createAlias(String alias) {
    return $OfflineEventsTable(attachedDatabase, alias);
  }

  static JsonTypeConverter2<EventSyncStatus, int, int> $convertersyncStatus =
      const EnumIndexConverter<EventSyncStatus>(EventSyncStatus.values);
}

class OfflineEvent extends DataClass implements Insertable<OfflineEvent> {
  final String operationId;
  final String eventType;
  final String payload;
  final int retryCount;
  final EventSyncStatus syncStatus;
  final String? deviceId;
  final String? appVersion;
  final DateTime createdAt;
  final DateTime updatedAt;
  const OfflineEvent({
    required this.operationId,
    required this.eventType,
    required this.payload,
    required this.retryCount,
    required this.syncStatus,
    this.deviceId,
    this.appVersion,
    required this.createdAt,
    required this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['operation_id'] = Variable<String>(operationId);
    map['event_type'] = Variable<String>(eventType);
    map['payload'] = Variable<String>(payload);
    map['retry_count'] = Variable<int>(retryCount);
    {
      map['sync_status'] = Variable<int>(
        $OfflineEventsTable.$convertersyncStatus.toSql(syncStatus),
      );
    }
    if (!nullToAbsent || deviceId != null) {
      map['device_id'] = Variable<String>(deviceId);
    }
    if (!nullToAbsent || appVersion != null) {
      map['app_version'] = Variable<String>(appVersion);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  OfflineEventsCompanion toCompanion(bool nullToAbsent) {
    return OfflineEventsCompanion(
      operationId: Value(operationId),
      eventType: Value(eventType),
      payload: Value(payload),
      retryCount: Value(retryCount),
      syncStatus: Value(syncStatus),
      deviceId:
          deviceId == null && nullToAbsent
              ? const Value.absent()
              : Value(deviceId),
      appVersion:
          appVersion == null && nullToAbsent
              ? const Value.absent()
              : Value(appVersion),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory OfflineEvent.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineEvent(
      operationId: serializer.fromJson<String>(json['operationId']),
      eventType: serializer.fromJson<String>(json['eventType']),
      payload: serializer.fromJson<String>(json['payload']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
      syncStatus: $OfflineEventsTable.$convertersyncStatus.fromJson(
        serializer.fromJson<int>(json['syncStatus']),
      ),
      deviceId: serializer.fromJson<String?>(json['deviceId']),
      appVersion: serializer.fromJson<String?>(json['appVersion']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'operationId': serializer.toJson<String>(operationId),
      'eventType': serializer.toJson<String>(eventType),
      'payload': serializer.toJson<String>(payload),
      'retryCount': serializer.toJson<int>(retryCount),
      'syncStatus': serializer.toJson<int>(
        $OfflineEventsTable.$convertersyncStatus.toJson(syncStatus),
      ),
      'deviceId': serializer.toJson<String?>(deviceId),
      'appVersion': serializer.toJson<String?>(appVersion),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  OfflineEvent copyWith({
    String? operationId,
    String? eventType,
    String? payload,
    int? retryCount,
    EventSyncStatus? syncStatus,
    Value<String?> deviceId = const Value.absent(),
    Value<String?> appVersion = const Value.absent(),
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => OfflineEvent(
    operationId: operationId ?? this.operationId,
    eventType: eventType ?? this.eventType,
    payload: payload ?? this.payload,
    retryCount: retryCount ?? this.retryCount,
    syncStatus: syncStatus ?? this.syncStatus,
    deviceId: deviceId.present ? deviceId.value : this.deviceId,
    appVersion: appVersion.present ? appVersion.value : this.appVersion,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  OfflineEvent copyWithCompanion(OfflineEventsCompanion data) {
    return OfflineEvent(
      operationId:
          data.operationId.present ? data.operationId.value : this.operationId,
      eventType: data.eventType.present ? data.eventType.value : this.eventType,
      payload: data.payload.present ? data.payload.value : this.payload,
      retryCount:
          data.retryCount.present ? data.retryCount.value : this.retryCount,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      deviceId: data.deviceId.present ? data.deviceId.value : this.deviceId,
      appVersion:
          data.appVersion.present ? data.appVersion.value : this.appVersion,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineEvent(')
          ..write('operationId: $operationId, ')
          ..write('eventType: $eventType, ')
          ..write('payload: $payload, ')
          ..write('retryCount: $retryCount, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('deviceId: $deviceId, ')
          ..write('appVersion: $appVersion, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    operationId,
    eventType,
    payload,
    retryCount,
    syncStatus,
    deviceId,
    appVersion,
    createdAt,
    updatedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineEvent &&
          other.operationId == this.operationId &&
          other.eventType == this.eventType &&
          other.payload == this.payload &&
          other.retryCount == this.retryCount &&
          other.syncStatus == this.syncStatus &&
          other.deviceId == this.deviceId &&
          other.appVersion == this.appVersion &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class OfflineEventsCompanion extends UpdateCompanion<OfflineEvent> {
  final Value<String> operationId;
  final Value<String> eventType;
  final Value<String> payload;
  final Value<int> retryCount;
  final Value<EventSyncStatus> syncStatus;
  final Value<String?> deviceId;
  final Value<String?> appVersion;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<int> rowid;
  const OfflineEventsCompanion({
    this.operationId = const Value.absent(),
    this.eventType = const Value.absent(),
    this.payload = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.appVersion = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineEventsCompanion.insert({
    required String operationId,
    required String eventType,
    required String payload,
    this.retryCount = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.deviceId = const Value.absent(),
    this.appVersion = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : operationId = Value(operationId),
       eventType = Value(eventType),
       payload = Value(payload);
  static Insertable<OfflineEvent> custom({
    Expression<String>? operationId,
    Expression<String>? eventType,
    Expression<String>? payload,
    Expression<int>? retryCount,
    Expression<int>? syncStatus,
    Expression<String>? deviceId,
    Expression<String>? appVersion,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (operationId != null) 'operation_id': operationId,
      if (eventType != null) 'event_type': eventType,
      if (payload != null) 'payload': payload,
      if (retryCount != null) 'retry_count': retryCount,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (deviceId != null) 'device_id': deviceId,
      if (appVersion != null) 'app_version': appVersion,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineEventsCompanion copyWith({
    Value<String>? operationId,
    Value<String>? eventType,
    Value<String>? payload,
    Value<int>? retryCount,
    Value<EventSyncStatus>? syncStatus,
    Value<String?>? deviceId,
    Value<String?>? appVersion,
    Value<DateTime>? createdAt,
    Value<DateTime>? updatedAt,
    Value<int>? rowid,
  }) {
    return OfflineEventsCompanion(
      operationId: operationId ?? this.operationId,
      eventType: eventType ?? this.eventType,
      payload: payload ?? this.payload,
      retryCount: retryCount ?? this.retryCount,
      syncStatus: syncStatus ?? this.syncStatus,
      deviceId: deviceId ?? this.deviceId,
      appVersion: appVersion ?? this.appVersion,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (operationId.present) {
      map['operation_id'] = Variable<String>(operationId.value);
    }
    if (eventType.present) {
      map['event_type'] = Variable<String>(eventType.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<int>(
        $OfflineEventsTable.$convertersyncStatus.toSql(syncStatus.value),
      );
    }
    if (deviceId.present) {
      map['device_id'] = Variable<String>(deviceId.value);
    }
    if (appVersion.present) {
      map['app_version'] = Variable<String>(appVersion.value);
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
    return (StringBuffer('OfflineEventsCompanion(')
          ..write('operationId: $operationId, ')
          ..write('eventType: $eventType, ')
          ..write('payload: $payload, ')
          ..write('retryCount: $retryCount, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('deviceId: $deviceId, ')
          ..write('appVersion: $appVersion, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $DeadLetterEventsTable extends DeadLetterEvents
    with TableInfo<$DeadLetterEventsTable, DeadLetterEvent> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $DeadLetterEventsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _operationIdMeta = const VerificationMeta(
    'operationId',
  );
  @override
  late final GeneratedColumn<String> operationId = GeneratedColumn<String>(
    'operation_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _eventTypeMeta = const VerificationMeta(
    'eventType',
  );
  @override
  late final GeneratedColumn<String> eventType = GeneratedColumn<String>(
    'event_type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _failureReasonMeta = const VerificationMeta(
    'failureReason',
  );
  @override
  late final GeneratedColumn<String> failureReason = GeneratedColumn<String>(
    'failure_reason',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _failedAtMeta = const VerificationMeta(
    'failedAt',
  );
  @override
  late final GeneratedColumn<DateTime> failedAt = GeneratedColumn<DateTime>(
    'failed_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    operationId,
    eventType,
    payload,
    failureReason,
    failedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'dead_letter_events';
  @override
  VerificationContext validateIntegrity(
    Insertable<DeadLetterEvent> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('operation_id')) {
      context.handle(
        _operationIdMeta,
        operationId.isAcceptableOrUnknown(
          data['operation_id']!,
          _operationIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_operationIdMeta);
    }
    if (data.containsKey('event_type')) {
      context.handle(
        _eventTypeMeta,
        eventType.isAcceptableOrUnknown(data['event_type']!, _eventTypeMeta),
      );
    } else if (isInserting) {
      context.missing(_eventTypeMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('failure_reason')) {
      context.handle(
        _failureReasonMeta,
        failureReason.isAcceptableOrUnknown(
          data['failure_reason']!,
          _failureReasonMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_failureReasonMeta);
    }
    if (data.containsKey('failed_at')) {
      context.handle(
        _failedAtMeta,
        failedAt.isAcceptableOrUnknown(data['failed_at']!, _failedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {operationId};
  @override
  DeadLetterEvent map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DeadLetterEvent(
      operationId:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}operation_id'],
          )!,
      eventType:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}event_type'],
          )!,
      payload:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}payload'],
          )!,
      failureReason:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}failure_reason'],
          )!,
      failedAt:
          attachedDatabase.typeMapping.read(
            DriftSqlType.dateTime,
            data['${effectivePrefix}failed_at'],
          )!,
    );
  }

  @override
  $DeadLetterEventsTable createAlias(String alias) {
    return $DeadLetterEventsTable(attachedDatabase, alias);
  }
}

class DeadLetterEvent extends DataClass implements Insertable<DeadLetterEvent> {
  final String operationId;
  final String eventType;
  final String payload;
  final String failureReason;
  final DateTime failedAt;
  const DeadLetterEvent({
    required this.operationId,
    required this.eventType,
    required this.payload,
    required this.failureReason,
    required this.failedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['operation_id'] = Variable<String>(operationId);
    map['event_type'] = Variable<String>(eventType);
    map['payload'] = Variable<String>(payload);
    map['failure_reason'] = Variable<String>(failureReason);
    map['failed_at'] = Variable<DateTime>(failedAt);
    return map;
  }

  DeadLetterEventsCompanion toCompanion(bool nullToAbsent) {
    return DeadLetterEventsCompanion(
      operationId: Value(operationId),
      eventType: Value(eventType),
      payload: Value(payload),
      failureReason: Value(failureReason),
      failedAt: Value(failedAt),
    );
  }

  factory DeadLetterEvent.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DeadLetterEvent(
      operationId: serializer.fromJson<String>(json['operationId']),
      eventType: serializer.fromJson<String>(json['eventType']),
      payload: serializer.fromJson<String>(json['payload']),
      failureReason: serializer.fromJson<String>(json['failureReason']),
      failedAt: serializer.fromJson<DateTime>(json['failedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'operationId': serializer.toJson<String>(operationId),
      'eventType': serializer.toJson<String>(eventType),
      'payload': serializer.toJson<String>(payload),
      'failureReason': serializer.toJson<String>(failureReason),
      'failedAt': serializer.toJson<DateTime>(failedAt),
    };
  }

  DeadLetterEvent copyWith({
    String? operationId,
    String? eventType,
    String? payload,
    String? failureReason,
    DateTime? failedAt,
  }) => DeadLetterEvent(
    operationId: operationId ?? this.operationId,
    eventType: eventType ?? this.eventType,
    payload: payload ?? this.payload,
    failureReason: failureReason ?? this.failureReason,
    failedAt: failedAt ?? this.failedAt,
  );
  DeadLetterEvent copyWithCompanion(DeadLetterEventsCompanion data) {
    return DeadLetterEvent(
      operationId:
          data.operationId.present ? data.operationId.value : this.operationId,
      eventType: data.eventType.present ? data.eventType.value : this.eventType,
      payload: data.payload.present ? data.payload.value : this.payload,
      failureReason:
          data.failureReason.present
              ? data.failureReason.value
              : this.failureReason,
      failedAt: data.failedAt.present ? data.failedAt.value : this.failedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DeadLetterEvent(')
          ..write('operationId: $operationId, ')
          ..write('eventType: $eventType, ')
          ..write('payload: $payload, ')
          ..write('failureReason: $failureReason, ')
          ..write('failedAt: $failedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(operationId, eventType, payload, failureReason, failedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DeadLetterEvent &&
          other.operationId == this.operationId &&
          other.eventType == this.eventType &&
          other.payload == this.payload &&
          other.failureReason == this.failureReason &&
          other.failedAt == this.failedAt);
}

class DeadLetterEventsCompanion extends UpdateCompanion<DeadLetterEvent> {
  final Value<String> operationId;
  final Value<String> eventType;
  final Value<String> payload;
  final Value<String> failureReason;
  final Value<DateTime> failedAt;
  final Value<int> rowid;
  const DeadLetterEventsCompanion({
    this.operationId = const Value.absent(),
    this.eventType = const Value.absent(),
    this.payload = const Value.absent(),
    this.failureReason = const Value.absent(),
    this.failedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  DeadLetterEventsCompanion.insert({
    required String operationId,
    required String eventType,
    required String payload,
    required String failureReason,
    this.failedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : operationId = Value(operationId),
       eventType = Value(eventType),
       payload = Value(payload),
       failureReason = Value(failureReason);
  static Insertable<DeadLetterEvent> custom({
    Expression<String>? operationId,
    Expression<String>? eventType,
    Expression<String>? payload,
    Expression<String>? failureReason,
    Expression<DateTime>? failedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (operationId != null) 'operation_id': operationId,
      if (eventType != null) 'event_type': eventType,
      if (payload != null) 'payload': payload,
      if (failureReason != null) 'failure_reason': failureReason,
      if (failedAt != null) 'failed_at': failedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  DeadLetterEventsCompanion copyWith({
    Value<String>? operationId,
    Value<String>? eventType,
    Value<String>? payload,
    Value<String>? failureReason,
    Value<DateTime>? failedAt,
    Value<int>? rowid,
  }) {
    return DeadLetterEventsCompanion(
      operationId: operationId ?? this.operationId,
      eventType: eventType ?? this.eventType,
      payload: payload ?? this.payload,
      failureReason: failureReason ?? this.failureReason,
      failedAt: failedAt ?? this.failedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (operationId.present) {
      map['operation_id'] = Variable<String>(operationId.value);
    }
    if (eventType.present) {
      map['event_type'] = Variable<String>(eventType.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (failureReason.present) {
      map['failure_reason'] = Variable<String>(failureReason.value);
    }
    if (failedAt.present) {
      map['failed_at'] = Variable<DateTime>(failedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('DeadLetterEventsCompanion(')
          ..write('operationId: $operationId, ')
          ..write('eventType: $eventType, ')
          ..write('payload: $payload, ')
          ..write('failureReason: $failureReason, ')
          ..write('failedAt: $failedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SyncConflictsTable extends SyncConflicts
    with TableInfo<$SyncConflictsTable, SyncConflict> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncConflictsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    clientDefault: () => DateTime.now().millisecondsSinceEpoch.toString(),
  );
  static const VerificationMeta _operationIdMeta = const VerificationMeta(
    'operationId',
  );
  @override
  late final GeneratedColumn<String> operationId = GeneratedColumn<String>(
    'operation_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _productIdMeta = const VerificationMeta(
    'productId',
  );
  @override
  late final GeneratedColumn<String> productId = GeneratedColumn<String>(
    'product_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _expectedQuantityMeta = const VerificationMeta(
    'expectedQuantity',
  );
  @override
  late final GeneratedColumn<int> expectedQuantity = GeneratedColumn<int>(
    'expected_quantity',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _actualQuantityMeta = const VerificationMeta(
    'actualQuantity',
  );
  @override
  late final GeneratedColumn<int> actualQuantity = GeneratedColumn<int>(
    'actual_quantity',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _snapshotPayloadMeta = const VerificationMeta(
    'snapshotPayload',
  );
  @override
  late final GeneratedColumn<String> snapshotPayload = GeneratedColumn<String>(
    'snapshot_payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _detectedAtMeta = const VerificationMeta(
    'detectedAt',
  );
  @override
  late final GeneratedColumn<DateTime> detectedAt = GeneratedColumn<DateTime>(
    'detected_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    operationId,
    productId,
    expectedQuantity,
    actualQuantity,
    snapshotPayload,
    detectedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_conflicts';
  @override
  VerificationContext validateIntegrity(
    Insertable<SyncConflict> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('operation_id')) {
      context.handle(
        _operationIdMeta,
        operationId.isAcceptableOrUnknown(
          data['operation_id']!,
          _operationIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_operationIdMeta);
    }
    if (data.containsKey('product_id')) {
      context.handle(
        _productIdMeta,
        productId.isAcceptableOrUnknown(data['product_id']!, _productIdMeta),
      );
    } else if (isInserting) {
      context.missing(_productIdMeta);
    }
    if (data.containsKey('expected_quantity')) {
      context.handle(
        _expectedQuantityMeta,
        expectedQuantity.isAcceptableOrUnknown(
          data['expected_quantity']!,
          _expectedQuantityMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_expectedQuantityMeta);
    }
    if (data.containsKey('actual_quantity')) {
      context.handle(
        _actualQuantityMeta,
        actualQuantity.isAcceptableOrUnknown(
          data['actual_quantity']!,
          _actualQuantityMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_actualQuantityMeta);
    }
    if (data.containsKey('snapshot_payload')) {
      context.handle(
        _snapshotPayloadMeta,
        snapshotPayload.isAcceptableOrUnknown(
          data['snapshot_payload']!,
          _snapshotPayloadMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_snapshotPayloadMeta);
    }
    if (data.containsKey('detected_at')) {
      context.handle(
        _detectedAtMeta,
        detectedAt.isAcceptableOrUnknown(data['detected_at']!, _detectedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SyncConflict map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncConflict(
      id:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}id'],
          )!,
      operationId:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}operation_id'],
          )!,
      productId:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}product_id'],
          )!,
      expectedQuantity:
          attachedDatabase.typeMapping.read(
            DriftSqlType.int,
            data['${effectivePrefix}expected_quantity'],
          )!,
      actualQuantity:
          attachedDatabase.typeMapping.read(
            DriftSqlType.int,
            data['${effectivePrefix}actual_quantity'],
          )!,
      snapshotPayload:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}snapshot_payload'],
          )!,
      detectedAt:
          attachedDatabase.typeMapping.read(
            DriftSqlType.dateTime,
            data['${effectivePrefix}detected_at'],
          )!,
    );
  }

  @override
  $SyncConflictsTable createAlias(String alias) {
    return $SyncConflictsTable(attachedDatabase, alias);
  }
}

class SyncConflict extends DataClass implements Insertable<SyncConflict> {
  final String id;
  final String operationId;
  final String productId;
  final int expectedQuantity;
  final int actualQuantity;
  final String snapshotPayload;
  final DateTime detectedAt;
  const SyncConflict({
    required this.id,
    required this.operationId,
    required this.productId,
    required this.expectedQuantity,
    required this.actualQuantity,
    required this.snapshotPayload,
    required this.detectedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['operation_id'] = Variable<String>(operationId);
    map['product_id'] = Variable<String>(productId);
    map['expected_quantity'] = Variable<int>(expectedQuantity);
    map['actual_quantity'] = Variable<int>(actualQuantity);
    map['snapshot_payload'] = Variable<String>(snapshotPayload);
    map['detected_at'] = Variable<DateTime>(detectedAt);
    return map;
  }

  SyncConflictsCompanion toCompanion(bool nullToAbsent) {
    return SyncConflictsCompanion(
      id: Value(id),
      operationId: Value(operationId),
      productId: Value(productId),
      expectedQuantity: Value(expectedQuantity),
      actualQuantity: Value(actualQuantity),
      snapshotPayload: Value(snapshotPayload),
      detectedAt: Value(detectedAt),
    );
  }

  factory SyncConflict.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncConflict(
      id: serializer.fromJson<String>(json['id']),
      operationId: serializer.fromJson<String>(json['operationId']),
      productId: serializer.fromJson<String>(json['productId']),
      expectedQuantity: serializer.fromJson<int>(json['expectedQuantity']),
      actualQuantity: serializer.fromJson<int>(json['actualQuantity']),
      snapshotPayload: serializer.fromJson<String>(json['snapshotPayload']),
      detectedAt: serializer.fromJson<DateTime>(json['detectedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'operationId': serializer.toJson<String>(operationId),
      'productId': serializer.toJson<String>(productId),
      'expectedQuantity': serializer.toJson<int>(expectedQuantity),
      'actualQuantity': serializer.toJson<int>(actualQuantity),
      'snapshotPayload': serializer.toJson<String>(snapshotPayload),
      'detectedAt': serializer.toJson<DateTime>(detectedAt),
    };
  }

  SyncConflict copyWith({
    String? id,
    String? operationId,
    String? productId,
    int? expectedQuantity,
    int? actualQuantity,
    String? snapshotPayload,
    DateTime? detectedAt,
  }) => SyncConflict(
    id: id ?? this.id,
    operationId: operationId ?? this.operationId,
    productId: productId ?? this.productId,
    expectedQuantity: expectedQuantity ?? this.expectedQuantity,
    actualQuantity: actualQuantity ?? this.actualQuantity,
    snapshotPayload: snapshotPayload ?? this.snapshotPayload,
    detectedAt: detectedAt ?? this.detectedAt,
  );
  SyncConflict copyWithCompanion(SyncConflictsCompanion data) {
    return SyncConflict(
      id: data.id.present ? data.id.value : this.id,
      operationId:
          data.operationId.present ? data.operationId.value : this.operationId,
      productId: data.productId.present ? data.productId.value : this.productId,
      expectedQuantity:
          data.expectedQuantity.present
              ? data.expectedQuantity.value
              : this.expectedQuantity,
      actualQuantity:
          data.actualQuantity.present
              ? data.actualQuantity.value
              : this.actualQuantity,
      snapshotPayload:
          data.snapshotPayload.present
              ? data.snapshotPayload.value
              : this.snapshotPayload,
      detectedAt:
          data.detectedAt.present ? data.detectedAt.value : this.detectedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncConflict(')
          ..write('id: $id, ')
          ..write('operationId: $operationId, ')
          ..write('productId: $productId, ')
          ..write('expectedQuantity: $expectedQuantity, ')
          ..write('actualQuantity: $actualQuantity, ')
          ..write('snapshotPayload: $snapshotPayload, ')
          ..write('detectedAt: $detectedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    operationId,
    productId,
    expectedQuantity,
    actualQuantity,
    snapshotPayload,
    detectedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncConflict &&
          other.id == this.id &&
          other.operationId == this.operationId &&
          other.productId == this.productId &&
          other.expectedQuantity == this.expectedQuantity &&
          other.actualQuantity == this.actualQuantity &&
          other.snapshotPayload == this.snapshotPayload &&
          other.detectedAt == this.detectedAt);
}

class SyncConflictsCompanion extends UpdateCompanion<SyncConflict> {
  final Value<String> id;
  final Value<String> operationId;
  final Value<String> productId;
  final Value<int> expectedQuantity;
  final Value<int> actualQuantity;
  final Value<String> snapshotPayload;
  final Value<DateTime> detectedAt;
  final Value<int> rowid;
  const SyncConflictsCompanion({
    this.id = const Value.absent(),
    this.operationId = const Value.absent(),
    this.productId = const Value.absent(),
    this.expectedQuantity = const Value.absent(),
    this.actualQuantity = const Value.absent(),
    this.snapshotPayload = const Value.absent(),
    this.detectedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SyncConflictsCompanion.insert({
    this.id = const Value.absent(),
    required String operationId,
    required String productId,
    required int expectedQuantity,
    required int actualQuantity,
    required String snapshotPayload,
    this.detectedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : operationId = Value(operationId),
       productId = Value(productId),
       expectedQuantity = Value(expectedQuantity),
       actualQuantity = Value(actualQuantity),
       snapshotPayload = Value(snapshotPayload);
  static Insertable<SyncConflict> custom({
    Expression<String>? id,
    Expression<String>? operationId,
    Expression<String>? productId,
    Expression<int>? expectedQuantity,
    Expression<int>? actualQuantity,
    Expression<String>? snapshotPayload,
    Expression<DateTime>? detectedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (operationId != null) 'operation_id': operationId,
      if (productId != null) 'product_id': productId,
      if (expectedQuantity != null) 'expected_quantity': expectedQuantity,
      if (actualQuantity != null) 'actual_quantity': actualQuantity,
      if (snapshotPayload != null) 'snapshot_payload': snapshotPayload,
      if (detectedAt != null) 'detected_at': detectedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SyncConflictsCompanion copyWith({
    Value<String>? id,
    Value<String>? operationId,
    Value<String>? productId,
    Value<int>? expectedQuantity,
    Value<int>? actualQuantity,
    Value<String>? snapshotPayload,
    Value<DateTime>? detectedAt,
    Value<int>? rowid,
  }) {
    return SyncConflictsCompanion(
      id: id ?? this.id,
      operationId: operationId ?? this.operationId,
      productId: productId ?? this.productId,
      expectedQuantity: expectedQuantity ?? this.expectedQuantity,
      actualQuantity: actualQuantity ?? this.actualQuantity,
      snapshotPayload: snapshotPayload ?? this.snapshotPayload,
      detectedAt: detectedAt ?? this.detectedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (operationId.present) {
      map['operation_id'] = Variable<String>(operationId.value);
    }
    if (productId.present) {
      map['product_id'] = Variable<String>(productId.value);
    }
    if (expectedQuantity.present) {
      map['expected_quantity'] = Variable<int>(expectedQuantity.value);
    }
    if (actualQuantity.present) {
      map['actual_quantity'] = Variable<int>(actualQuantity.value);
    }
    if (snapshotPayload.present) {
      map['snapshot_payload'] = Variable<String>(snapshotPayload.value);
    }
    if (detectedAt.present) {
      map['detected_at'] = Variable<DateTime>(detectedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncConflictsCompanion(')
          ..write('id: $id, ')
          ..write('operationId: $operationId, ')
          ..write('productId: $productId, ')
          ..write('expectedQuantity: $expectedQuantity, ')
          ..write('actualQuantity: $actualQuantity, ')
          ..write('snapshotPayload: $snapshotPayload, ')
          ..write('detectedAt: $detectedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $TelemetrySnapshotsTable extends TelemetrySnapshots
    with TableInfo<$TelemetrySnapshotsTable, TelemetrySnapshot> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TelemetrySnapshotsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    clientDefault: () => DateTime.now().millisecondsSinceEpoch.toString(),
  );
  static const VerificationMeta _avgLatencyMsMeta = const VerificationMeta(
    'avgLatencyMs',
  );
  @override
  late final GeneratedColumn<double> avgLatencyMs = GeneratedColumn<double>(
    'avg_latency_ms',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _successRatioMeta = const VerificationMeta(
    'successRatio',
  );
  @override
  late final GeneratedColumn<double> successRatio = GeneratedColumn<double>(
    'success_ratio',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _queueDepthMeta = const VerificationMeta(
    'queueDepth',
  );
  @override
  late final GeneratedColumn<int> queueDepth = GeneratedColumn<int>(
    'queue_depth',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _capturedAtMeta = const VerificationMeta(
    'capturedAt',
  );
  @override
  late final GeneratedColumn<DateTime> capturedAt = GeneratedColumn<DateTime>(
    'captured_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    avgLatencyMs,
    successRatio,
    queueDepth,
    capturedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'telemetry_snapshots';
  @override
  VerificationContext validateIntegrity(
    Insertable<TelemetrySnapshot> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('avg_latency_ms')) {
      context.handle(
        _avgLatencyMsMeta,
        avgLatencyMs.isAcceptableOrUnknown(
          data['avg_latency_ms']!,
          _avgLatencyMsMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_avgLatencyMsMeta);
    }
    if (data.containsKey('success_ratio')) {
      context.handle(
        _successRatioMeta,
        successRatio.isAcceptableOrUnknown(
          data['success_ratio']!,
          _successRatioMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_successRatioMeta);
    }
    if (data.containsKey('queue_depth')) {
      context.handle(
        _queueDepthMeta,
        queueDepth.isAcceptableOrUnknown(data['queue_depth']!, _queueDepthMeta),
      );
    } else if (isInserting) {
      context.missing(_queueDepthMeta);
    }
    if (data.containsKey('captured_at')) {
      context.handle(
        _capturedAtMeta,
        capturedAt.isAcceptableOrUnknown(data['captured_at']!, _capturedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  TelemetrySnapshot map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return TelemetrySnapshot(
      id:
          attachedDatabase.typeMapping.read(
            DriftSqlType.string,
            data['${effectivePrefix}id'],
          )!,
      avgLatencyMs:
          attachedDatabase.typeMapping.read(
            DriftSqlType.double,
            data['${effectivePrefix}avg_latency_ms'],
          )!,
      successRatio:
          attachedDatabase.typeMapping.read(
            DriftSqlType.double,
            data['${effectivePrefix}success_ratio'],
          )!,
      queueDepth:
          attachedDatabase.typeMapping.read(
            DriftSqlType.int,
            data['${effectivePrefix}queue_depth'],
          )!,
      capturedAt:
          attachedDatabase.typeMapping.read(
            DriftSqlType.dateTime,
            data['${effectivePrefix}captured_at'],
          )!,
    );
  }

  @override
  $TelemetrySnapshotsTable createAlias(String alias) {
    return $TelemetrySnapshotsTable(attachedDatabase, alias);
  }
}

class TelemetrySnapshot extends DataClass
    implements Insertable<TelemetrySnapshot> {
  final String id;
  final double avgLatencyMs;
  final double successRatio;
  final int queueDepth;
  final DateTime capturedAt;
  const TelemetrySnapshot({
    required this.id,
    required this.avgLatencyMs,
    required this.successRatio,
    required this.queueDepth,
    required this.capturedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['avg_latency_ms'] = Variable<double>(avgLatencyMs);
    map['success_ratio'] = Variable<double>(successRatio);
    map['queue_depth'] = Variable<int>(queueDepth);
    map['captured_at'] = Variable<DateTime>(capturedAt);
    return map;
  }

  TelemetrySnapshotsCompanion toCompanion(bool nullToAbsent) {
    return TelemetrySnapshotsCompanion(
      id: Value(id),
      avgLatencyMs: Value(avgLatencyMs),
      successRatio: Value(successRatio),
      queueDepth: Value(queueDepth),
      capturedAt: Value(capturedAt),
    );
  }

  factory TelemetrySnapshot.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return TelemetrySnapshot(
      id: serializer.fromJson<String>(json['id']),
      avgLatencyMs: serializer.fromJson<double>(json['avgLatencyMs']),
      successRatio: serializer.fromJson<double>(json['successRatio']),
      queueDepth: serializer.fromJson<int>(json['queueDepth']),
      capturedAt: serializer.fromJson<DateTime>(json['capturedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'avgLatencyMs': serializer.toJson<double>(avgLatencyMs),
      'successRatio': serializer.toJson<double>(successRatio),
      'queueDepth': serializer.toJson<int>(queueDepth),
      'capturedAt': serializer.toJson<DateTime>(capturedAt),
    };
  }

  TelemetrySnapshot copyWith({
    String? id,
    double? avgLatencyMs,
    double? successRatio,
    int? queueDepth,
    DateTime? capturedAt,
  }) => TelemetrySnapshot(
    id: id ?? this.id,
    avgLatencyMs: avgLatencyMs ?? this.avgLatencyMs,
    successRatio: successRatio ?? this.successRatio,
    queueDepth: queueDepth ?? this.queueDepth,
    capturedAt: capturedAt ?? this.capturedAt,
  );
  TelemetrySnapshot copyWithCompanion(TelemetrySnapshotsCompanion data) {
    return TelemetrySnapshot(
      id: data.id.present ? data.id.value : this.id,
      avgLatencyMs:
          data.avgLatencyMs.present
              ? data.avgLatencyMs.value
              : this.avgLatencyMs,
      successRatio:
          data.successRatio.present
              ? data.successRatio.value
              : this.successRatio,
      queueDepth:
          data.queueDepth.present ? data.queueDepth.value : this.queueDepth,
      capturedAt:
          data.capturedAt.present ? data.capturedAt.value : this.capturedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('TelemetrySnapshot(')
          ..write('id: $id, ')
          ..write('avgLatencyMs: $avgLatencyMs, ')
          ..write('successRatio: $successRatio, ')
          ..write('queueDepth: $queueDepth, ')
          ..write('capturedAt: $capturedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, avgLatencyMs, successRatio, queueDepth, capturedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is TelemetrySnapshot &&
          other.id == this.id &&
          other.avgLatencyMs == this.avgLatencyMs &&
          other.successRatio == this.successRatio &&
          other.queueDepth == this.queueDepth &&
          other.capturedAt == this.capturedAt);
}

class TelemetrySnapshotsCompanion extends UpdateCompanion<TelemetrySnapshot> {
  final Value<String> id;
  final Value<double> avgLatencyMs;
  final Value<double> successRatio;
  final Value<int> queueDepth;
  final Value<DateTime> capturedAt;
  final Value<int> rowid;
  const TelemetrySnapshotsCompanion({
    this.id = const Value.absent(),
    this.avgLatencyMs = const Value.absent(),
    this.successRatio = const Value.absent(),
    this.queueDepth = const Value.absent(),
    this.capturedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  TelemetrySnapshotsCompanion.insert({
    this.id = const Value.absent(),
    required double avgLatencyMs,
    required double successRatio,
    required int queueDepth,
    this.capturedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : avgLatencyMs = Value(avgLatencyMs),
       successRatio = Value(successRatio),
       queueDepth = Value(queueDepth);
  static Insertable<TelemetrySnapshot> custom({
    Expression<String>? id,
    Expression<double>? avgLatencyMs,
    Expression<double>? successRatio,
    Expression<int>? queueDepth,
    Expression<DateTime>? capturedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (avgLatencyMs != null) 'avg_latency_ms': avgLatencyMs,
      if (successRatio != null) 'success_ratio': successRatio,
      if (queueDepth != null) 'queue_depth': queueDepth,
      if (capturedAt != null) 'captured_at': capturedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  TelemetrySnapshotsCompanion copyWith({
    Value<String>? id,
    Value<double>? avgLatencyMs,
    Value<double>? successRatio,
    Value<int>? queueDepth,
    Value<DateTime>? capturedAt,
    Value<int>? rowid,
  }) {
    return TelemetrySnapshotsCompanion(
      id: id ?? this.id,
      avgLatencyMs: avgLatencyMs ?? this.avgLatencyMs,
      successRatio: successRatio ?? this.successRatio,
      queueDepth: queueDepth ?? this.queueDepth,
      capturedAt: capturedAt ?? this.capturedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (avgLatencyMs.present) {
      map['avg_latency_ms'] = Variable<double>(avgLatencyMs.value);
    }
    if (successRatio.present) {
      map['success_ratio'] = Variable<double>(successRatio.value);
    }
    if (queueDepth.present) {
      map['queue_depth'] = Variable<int>(queueDepth.value);
    }
    if (capturedAt.present) {
      map['captured_at'] = Variable<DateTime>(capturedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TelemetrySnapshotsCompanion(')
          ..write('id: $id, ')
          ..write('avgLatencyMs: $avgLatencyMs, ')
          ..write('successRatio: $successRatio, ')
          ..write('queueDepth: $queueDepth, ')
          ..write('capturedAt: $capturedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$OfflineDatabase extends GeneratedDatabase {
  _$OfflineDatabase(QueryExecutor e) : super(e);
  $OfflineDatabaseManager get managers => $OfflineDatabaseManager(this);
  late final $OfflineEventsTable offlineEvents = $OfflineEventsTable(this);
  late final $DeadLetterEventsTable deadLetterEvents = $DeadLetterEventsTable(
    this,
  );
  late final $SyncConflictsTable syncConflicts = $SyncConflictsTable(this);
  late final $TelemetrySnapshotsTable telemetrySnapshots =
      $TelemetrySnapshotsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    offlineEvents,
    deadLetterEvents,
    syncConflicts,
    telemetrySnapshots,
  ];
}

typedef $$OfflineEventsTableCreateCompanionBuilder =
    OfflineEventsCompanion Function({
      required String operationId,
      required String eventType,
      required String payload,
      Value<int> retryCount,
      Value<EventSyncStatus> syncStatus,
      Value<String?> deviceId,
      Value<String?> appVersion,
      Value<DateTime> createdAt,
      Value<DateTime> updatedAt,
      Value<int> rowid,
    });
typedef $$OfflineEventsTableUpdateCompanionBuilder =
    OfflineEventsCompanion Function({
      Value<String> operationId,
      Value<String> eventType,
      Value<String> payload,
      Value<int> retryCount,
      Value<EventSyncStatus> syncStatus,
      Value<String?> deviceId,
      Value<String?> appVersion,
      Value<DateTime> createdAt,
      Value<DateTime> updatedAt,
      Value<int> rowid,
    });

class $$OfflineEventsTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineEventsTable> {
  $$OfflineEventsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get operationId => $composableBuilder(
    column: $table.operationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get eventType => $composableBuilder(
    column: $table.eventType,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnWithTypeConverterFilters<EventSyncStatus, EventSyncStatus, int>
  get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnWithTypeConverterFilters(column),
  );

  ColumnFilters<String> get deviceId => $composableBuilder(
    column: $table.deviceId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get appVersion => $composableBuilder(
    column: $table.appVersion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$OfflineEventsTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineEventsTable> {
  $$OfflineEventsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get operationId => $composableBuilder(
    column: $table.operationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get eventType => $composableBuilder(
    column: $table.eventType,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get syncStatus => $composableBuilder(
    column: $table.syncStatus,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get deviceId => $composableBuilder(
    column: $table.deviceId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get appVersion => $composableBuilder(
    column: $table.appVersion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$OfflineEventsTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineEventsTable> {
  $$OfflineEventsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get operationId => $composableBuilder(
    column: $table.operationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get eventType =>
      $composableBuilder(column: $table.eventType, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => column,
  );

  GeneratedColumnWithTypeConverter<EventSyncStatus, int> get syncStatus =>
      $composableBuilder(
        column: $table.syncStatus,
        builder: (column) => column,
      );

  GeneratedColumn<String> get deviceId =>
      $composableBuilder(column: $table.deviceId, builder: (column) => column);

  GeneratedColumn<String> get appVersion => $composableBuilder(
    column: $table.appVersion,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$OfflineEventsTableTableManager
    extends
        RootTableManager<
          _$OfflineDatabase,
          $OfflineEventsTable,
          OfflineEvent,
          $$OfflineEventsTableFilterComposer,
          $$OfflineEventsTableOrderingComposer,
          $$OfflineEventsTableAnnotationComposer,
          $$OfflineEventsTableCreateCompanionBuilder,
          $$OfflineEventsTableUpdateCompanionBuilder,
          (
            OfflineEvent,
            BaseReferences<
              _$OfflineDatabase,
              $OfflineEventsTable,
              OfflineEvent
            >,
          ),
          OfflineEvent,
          PrefetchHooks Function()
        > {
  $$OfflineEventsTableTableManager(
    _$OfflineDatabase db,
    $OfflineEventsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer:
              () => $$OfflineEventsTableFilterComposer($db: db, $table: table),
          createOrderingComposer:
              () =>
                  $$OfflineEventsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer:
              () => $$OfflineEventsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> operationId = const Value.absent(),
                Value<String> eventType = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<int> retryCount = const Value.absent(),
                Value<EventSyncStatus> syncStatus = const Value.absent(),
                Value<String?> deviceId = const Value.absent(),
                Value<String?> appVersion = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => OfflineEventsCompanion(
                operationId: operationId,
                eventType: eventType,
                payload: payload,
                retryCount: retryCount,
                syncStatus: syncStatus,
                deviceId: deviceId,
                appVersion: appVersion,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String operationId,
                required String eventType,
                required String payload,
                Value<int> retryCount = const Value.absent(),
                Value<EventSyncStatus> syncStatus = const Value.absent(),
                Value<String?> deviceId = const Value.absent(),
                Value<String?> appVersion = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => OfflineEventsCompanion.insert(
                operationId: operationId,
                eventType: eventType,
                payload: payload,
                retryCount: retryCount,
                syncStatus: syncStatus,
                deviceId: deviceId,
                appVersion: appVersion,
                createdAt: createdAt,
                updatedAt: updatedAt,
                rowid: rowid,
              ),
          withReferenceMapper:
              (p0) =>
                  p0
                      .map(
                        (e) => (
                          e.readTable(table),
                          BaseReferences(db, table, e),
                        ),
                      )
                      .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$OfflineEventsTableProcessedTableManager =
    ProcessedTableManager<
      _$OfflineDatabase,
      $OfflineEventsTable,
      OfflineEvent,
      $$OfflineEventsTableFilterComposer,
      $$OfflineEventsTableOrderingComposer,
      $$OfflineEventsTableAnnotationComposer,
      $$OfflineEventsTableCreateCompanionBuilder,
      $$OfflineEventsTableUpdateCompanionBuilder,
      (
        OfflineEvent,
        BaseReferences<_$OfflineDatabase, $OfflineEventsTable, OfflineEvent>,
      ),
      OfflineEvent,
      PrefetchHooks Function()
    >;
typedef $$DeadLetterEventsTableCreateCompanionBuilder =
    DeadLetterEventsCompanion Function({
      required String operationId,
      required String eventType,
      required String payload,
      required String failureReason,
      Value<DateTime> failedAt,
      Value<int> rowid,
    });
typedef $$DeadLetterEventsTableUpdateCompanionBuilder =
    DeadLetterEventsCompanion Function({
      Value<String> operationId,
      Value<String> eventType,
      Value<String> payload,
      Value<String> failureReason,
      Value<DateTime> failedAt,
      Value<int> rowid,
    });

class $$DeadLetterEventsTableFilterComposer
    extends Composer<_$OfflineDatabase, $DeadLetterEventsTable> {
  $$DeadLetterEventsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get operationId => $composableBuilder(
    column: $table.operationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get eventType => $composableBuilder(
    column: $table.eventType,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get failureReason => $composableBuilder(
    column: $table.failureReason,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get failedAt => $composableBuilder(
    column: $table.failedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$DeadLetterEventsTableOrderingComposer
    extends Composer<_$OfflineDatabase, $DeadLetterEventsTable> {
  $$DeadLetterEventsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get operationId => $composableBuilder(
    column: $table.operationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get eventType => $composableBuilder(
    column: $table.eventType,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get failureReason => $composableBuilder(
    column: $table.failureReason,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get failedAt => $composableBuilder(
    column: $table.failedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$DeadLetterEventsTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $DeadLetterEventsTable> {
  $$DeadLetterEventsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get operationId => $composableBuilder(
    column: $table.operationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get eventType =>
      $composableBuilder(column: $table.eventType, builder: (column) => column);

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<String> get failureReason => $composableBuilder(
    column: $table.failureReason,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get failedAt =>
      $composableBuilder(column: $table.failedAt, builder: (column) => column);
}

class $$DeadLetterEventsTableTableManager
    extends
        RootTableManager<
          _$OfflineDatabase,
          $DeadLetterEventsTable,
          DeadLetterEvent,
          $$DeadLetterEventsTableFilterComposer,
          $$DeadLetterEventsTableOrderingComposer,
          $$DeadLetterEventsTableAnnotationComposer,
          $$DeadLetterEventsTableCreateCompanionBuilder,
          $$DeadLetterEventsTableUpdateCompanionBuilder,
          (
            DeadLetterEvent,
            BaseReferences<
              _$OfflineDatabase,
              $DeadLetterEventsTable,
              DeadLetterEvent
            >,
          ),
          DeadLetterEvent,
          PrefetchHooks Function()
        > {
  $$DeadLetterEventsTableTableManager(
    _$OfflineDatabase db,
    $DeadLetterEventsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer:
              () =>
                  $$DeadLetterEventsTableFilterComposer($db: db, $table: table),
          createOrderingComposer:
              () => $$DeadLetterEventsTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer:
              () => $$DeadLetterEventsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> operationId = const Value.absent(),
                Value<String> eventType = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<String> failureReason = const Value.absent(),
                Value<DateTime> failedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => DeadLetterEventsCompanion(
                operationId: operationId,
                eventType: eventType,
                payload: payload,
                failureReason: failureReason,
                failedAt: failedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String operationId,
                required String eventType,
                required String payload,
                required String failureReason,
                Value<DateTime> failedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => DeadLetterEventsCompanion.insert(
                operationId: operationId,
                eventType: eventType,
                payload: payload,
                failureReason: failureReason,
                failedAt: failedAt,
                rowid: rowid,
              ),
          withReferenceMapper:
              (p0) =>
                  p0
                      .map(
                        (e) => (
                          e.readTable(table),
                          BaseReferences(db, table, e),
                        ),
                      )
                      .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$DeadLetterEventsTableProcessedTableManager =
    ProcessedTableManager<
      _$OfflineDatabase,
      $DeadLetterEventsTable,
      DeadLetterEvent,
      $$DeadLetterEventsTableFilterComposer,
      $$DeadLetterEventsTableOrderingComposer,
      $$DeadLetterEventsTableAnnotationComposer,
      $$DeadLetterEventsTableCreateCompanionBuilder,
      $$DeadLetterEventsTableUpdateCompanionBuilder,
      (
        DeadLetterEvent,
        BaseReferences<
          _$OfflineDatabase,
          $DeadLetterEventsTable,
          DeadLetterEvent
        >,
      ),
      DeadLetterEvent,
      PrefetchHooks Function()
    >;
typedef $$SyncConflictsTableCreateCompanionBuilder =
    SyncConflictsCompanion Function({
      Value<String> id,
      required String operationId,
      required String productId,
      required int expectedQuantity,
      required int actualQuantity,
      required String snapshotPayload,
      Value<DateTime> detectedAt,
      Value<int> rowid,
    });
typedef $$SyncConflictsTableUpdateCompanionBuilder =
    SyncConflictsCompanion Function({
      Value<String> id,
      Value<String> operationId,
      Value<String> productId,
      Value<int> expectedQuantity,
      Value<int> actualQuantity,
      Value<String> snapshotPayload,
      Value<DateTime> detectedAt,
      Value<int> rowid,
    });

class $$SyncConflictsTableFilterComposer
    extends Composer<_$OfflineDatabase, $SyncConflictsTable> {
  $$SyncConflictsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get operationId => $composableBuilder(
    column: $table.operationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get productId => $composableBuilder(
    column: $table.productId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get expectedQuantity => $composableBuilder(
    column: $table.expectedQuantity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get actualQuantity => $composableBuilder(
    column: $table.actualQuantity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get snapshotPayload => $composableBuilder(
    column: $table.snapshotPayload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get detectedAt => $composableBuilder(
    column: $table.detectedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SyncConflictsTableOrderingComposer
    extends Composer<_$OfflineDatabase, $SyncConflictsTable> {
  $$SyncConflictsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get operationId => $composableBuilder(
    column: $table.operationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get productId => $composableBuilder(
    column: $table.productId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get expectedQuantity => $composableBuilder(
    column: $table.expectedQuantity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get actualQuantity => $composableBuilder(
    column: $table.actualQuantity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get snapshotPayload => $composableBuilder(
    column: $table.snapshotPayload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get detectedAt => $composableBuilder(
    column: $table.detectedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SyncConflictsTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $SyncConflictsTable> {
  $$SyncConflictsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get operationId => $composableBuilder(
    column: $table.operationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get productId =>
      $composableBuilder(column: $table.productId, builder: (column) => column);

  GeneratedColumn<int> get expectedQuantity => $composableBuilder(
    column: $table.expectedQuantity,
    builder: (column) => column,
  );

  GeneratedColumn<int> get actualQuantity => $composableBuilder(
    column: $table.actualQuantity,
    builder: (column) => column,
  );

  GeneratedColumn<String> get snapshotPayload => $composableBuilder(
    column: $table.snapshotPayload,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get detectedAt => $composableBuilder(
    column: $table.detectedAt,
    builder: (column) => column,
  );
}

class $$SyncConflictsTableTableManager
    extends
        RootTableManager<
          _$OfflineDatabase,
          $SyncConflictsTable,
          SyncConflict,
          $$SyncConflictsTableFilterComposer,
          $$SyncConflictsTableOrderingComposer,
          $$SyncConflictsTableAnnotationComposer,
          $$SyncConflictsTableCreateCompanionBuilder,
          $$SyncConflictsTableUpdateCompanionBuilder,
          (
            SyncConflict,
            BaseReferences<
              _$OfflineDatabase,
              $SyncConflictsTable,
              SyncConflict
            >,
          ),
          SyncConflict,
          PrefetchHooks Function()
        > {
  $$SyncConflictsTableTableManager(
    _$OfflineDatabase db,
    $SyncConflictsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer:
              () => $$SyncConflictsTableFilterComposer($db: db, $table: table),
          createOrderingComposer:
              () =>
                  $$SyncConflictsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer:
              () => $$SyncConflictsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> operationId = const Value.absent(),
                Value<String> productId = const Value.absent(),
                Value<int> expectedQuantity = const Value.absent(),
                Value<int> actualQuantity = const Value.absent(),
                Value<String> snapshotPayload = const Value.absent(),
                Value<DateTime> detectedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SyncConflictsCompanion(
                id: id,
                operationId: operationId,
                productId: productId,
                expectedQuantity: expectedQuantity,
                actualQuantity: actualQuantity,
                snapshotPayload: snapshotPayload,
                detectedAt: detectedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                required String operationId,
                required String productId,
                required int expectedQuantity,
                required int actualQuantity,
                required String snapshotPayload,
                Value<DateTime> detectedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SyncConflictsCompanion.insert(
                id: id,
                operationId: operationId,
                productId: productId,
                expectedQuantity: expectedQuantity,
                actualQuantity: actualQuantity,
                snapshotPayload: snapshotPayload,
                detectedAt: detectedAt,
                rowid: rowid,
              ),
          withReferenceMapper:
              (p0) =>
                  p0
                      .map(
                        (e) => (
                          e.readTable(table),
                          BaseReferences(db, table, e),
                        ),
                      )
                      .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SyncConflictsTableProcessedTableManager =
    ProcessedTableManager<
      _$OfflineDatabase,
      $SyncConflictsTable,
      SyncConflict,
      $$SyncConflictsTableFilterComposer,
      $$SyncConflictsTableOrderingComposer,
      $$SyncConflictsTableAnnotationComposer,
      $$SyncConflictsTableCreateCompanionBuilder,
      $$SyncConflictsTableUpdateCompanionBuilder,
      (
        SyncConflict,
        BaseReferences<_$OfflineDatabase, $SyncConflictsTable, SyncConflict>,
      ),
      SyncConflict,
      PrefetchHooks Function()
    >;
typedef $$TelemetrySnapshotsTableCreateCompanionBuilder =
    TelemetrySnapshotsCompanion Function({
      Value<String> id,
      required double avgLatencyMs,
      required double successRatio,
      required int queueDepth,
      Value<DateTime> capturedAt,
      Value<int> rowid,
    });
typedef $$TelemetrySnapshotsTableUpdateCompanionBuilder =
    TelemetrySnapshotsCompanion Function({
      Value<String> id,
      Value<double> avgLatencyMs,
      Value<double> successRatio,
      Value<int> queueDepth,
      Value<DateTime> capturedAt,
      Value<int> rowid,
    });

class $$TelemetrySnapshotsTableFilterComposer
    extends Composer<_$OfflineDatabase, $TelemetrySnapshotsTable> {
  $$TelemetrySnapshotsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get avgLatencyMs => $composableBuilder(
    column: $table.avgLatencyMs,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get successRatio => $composableBuilder(
    column: $table.successRatio,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get queueDepth => $composableBuilder(
    column: $table.queueDepth,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get capturedAt => $composableBuilder(
    column: $table.capturedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$TelemetrySnapshotsTableOrderingComposer
    extends Composer<_$OfflineDatabase, $TelemetrySnapshotsTable> {
  $$TelemetrySnapshotsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get avgLatencyMs => $composableBuilder(
    column: $table.avgLatencyMs,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get successRatio => $composableBuilder(
    column: $table.successRatio,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get queueDepth => $composableBuilder(
    column: $table.queueDepth,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get capturedAt => $composableBuilder(
    column: $table.capturedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$TelemetrySnapshotsTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $TelemetrySnapshotsTable> {
  $$TelemetrySnapshotsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<double> get avgLatencyMs => $composableBuilder(
    column: $table.avgLatencyMs,
    builder: (column) => column,
  );

  GeneratedColumn<double> get successRatio => $composableBuilder(
    column: $table.successRatio,
    builder: (column) => column,
  );

  GeneratedColumn<int> get queueDepth => $composableBuilder(
    column: $table.queueDepth,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get capturedAt => $composableBuilder(
    column: $table.capturedAt,
    builder: (column) => column,
  );
}

class $$TelemetrySnapshotsTableTableManager
    extends
        RootTableManager<
          _$OfflineDatabase,
          $TelemetrySnapshotsTable,
          TelemetrySnapshot,
          $$TelemetrySnapshotsTableFilterComposer,
          $$TelemetrySnapshotsTableOrderingComposer,
          $$TelemetrySnapshotsTableAnnotationComposer,
          $$TelemetrySnapshotsTableCreateCompanionBuilder,
          $$TelemetrySnapshotsTableUpdateCompanionBuilder,
          (
            TelemetrySnapshot,
            BaseReferences<
              _$OfflineDatabase,
              $TelemetrySnapshotsTable,
              TelemetrySnapshot
            >,
          ),
          TelemetrySnapshot,
          PrefetchHooks Function()
        > {
  $$TelemetrySnapshotsTableTableManager(
    _$OfflineDatabase db,
    $TelemetrySnapshotsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer:
              () => $$TelemetrySnapshotsTableFilterComposer(
                $db: db,
                $table: table,
              ),
          createOrderingComposer:
              () => $$TelemetrySnapshotsTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer:
              () => $$TelemetrySnapshotsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<double> avgLatencyMs = const Value.absent(),
                Value<double> successRatio = const Value.absent(),
                Value<int> queueDepth = const Value.absent(),
                Value<DateTime> capturedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TelemetrySnapshotsCompanion(
                id: id,
                avgLatencyMs: avgLatencyMs,
                successRatio: successRatio,
                queueDepth: queueDepth,
                capturedAt: capturedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                required double avgLatencyMs,
                required double successRatio,
                required int queueDepth,
                Value<DateTime> capturedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TelemetrySnapshotsCompanion.insert(
                id: id,
                avgLatencyMs: avgLatencyMs,
                successRatio: successRatio,
                queueDepth: queueDepth,
                capturedAt: capturedAt,
                rowid: rowid,
              ),
          withReferenceMapper:
              (p0) =>
                  p0
                      .map(
                        (e) => (
                          e.readTable(table),
                          BaseReferences(db, table, e),
                        ),
                      )
                      .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$TelemetrySnapshotsTableProcessedTableManager =
    ProcessedTableManager<
      _$OfflineDatabase,
      $TelemetrySnapshotsTable,
      TelemetrySnapshot,
      $$TelemetrySnapshotsTableFilterComposer,
      $$TelemetrySnapshotsTableOrderingComposer,
      $$TelemetrySnapshotsTableAnnotationComposer,
      $$TelemetrySnapshotsTableCreateCompanionBuilder,
      $$TelemetrySnapshotsTableUpdateCompanionBuilder,
      (
        TelemetrySnapshot,
        BaseReferences<
          _$OfflineDatabase,
          $TelemetrySnapshotsTable,
          TelemetrySnapshot
        >,
      ),
      TelemetrySnapshot,
      PrefetchHooks Function()
    >;

class $OfflineDatabaseManager {
  final _$OfflineDatabase _db;
  $OfflineDatabaseManager(this._db);
  $$OfflineEventsTableTableManager get offlineEvents =>
      $$OfflineEventsTableTableManager(_db, _db.offlineEvents);
  $$DeadLetterEventsTableTableManager get deadLetterEvents =>
      $$DeadLetterEventsTableTableManager(_db, _db.deadLetterEvents);
  $$SyncConflictsTableTableManager get syncConflicts =>
      $$SyncConflictsTableTableManager(_db, _db.syncConflicts);
  $$TelemetrySnapshotsTableTableManager get telemetrySnapshots =>
      $$TelemetrySnapshotsTableTableManager(_db, _db.telemetrySnapshots);
}
