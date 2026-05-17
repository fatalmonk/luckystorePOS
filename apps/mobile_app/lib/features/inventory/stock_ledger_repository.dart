import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import '../../core/network/network_config.dart';
import '../../core/errors/exceptions.dart';
import '../../core/utils/result.dart';
import '../../core/utils/app_utils.dart';
import 'stock_ledger_entry.dart';


/// Repository for stock ledger operations
class StockLedgerRepository {
  final http.Client _client;

  StockLedgerRepository({http.Client? client})
      : _client = client ?? http.Client();

  /// Fetch stock ledger entries with filters
  Future<Result<List<StockLedgerEntry>>> getLedgerEntries({
    required StockLedgerQuery query,
  }) async {
    try {
      final params = _buildQueryParams(query);
      
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/inventory_movements?$params&select=*&order=created_at.${query.sortOrder}&limit=${query.limit}&offset=${query.offset}'
      );

      final headers = {
        'Content-Type': 'application/json',
        'apikey': NetworkConfig.supabaseAnonKey,
        'Authorization': 'Bearer ${NetworkConfig.supabaseAnonKey}',
        'Prefer': 'return=representation',
      };

      final response = await _client
          .get(url, headers: headers)
          .timeout(Duration(seconds: NetworkConfig.requestTimeout));

      if (response.statusCode == 200) {
        final List<dynamic> jsonData = json.decode(response.body);
        final entries = jsonData
            .whereType<Map<String, dynamic>>()
            .map((json) => StockLedgerEntry.fromJson(json))
            .toList();

        // Apply filters if not in URL
        final filtered = filterLedgerEntries(entries, query);

        return Success<List<StockLedgerEntry>>(filtered);
      } else {
        final error = json.decode(response.body);
        return Failure<List<StockLedgerEntry>>(
          'Failed to fetch ledger entries: ${error['message'] ?? error['error'] ?? 'Unknown error'}',
          metadata: error,
        );
      }
    } catch (e, stackTrace) {
      Logger.error('StockLedgerRepository.getLedgerEntries failed', e, stackTrace);
      
      if (e is TimeoutException) {
        return Failure<List<StockLedgerEntry>>(
          'Ledger entries fetch timeout',
          exception: NetworkException('Request timed out'),
        );
      }

      return Failure<List<StockLedgerEntry>>(
        'Failed to fetch ledger entries: ${e.toString()}',
        exception: e as Exception,
      );
    }
  }

  /// Build query parameters for stock ledger
  String _buildQueryParams(StockLedgerQuery query) {
    final paramsMap = <String, String>{};

    if (query.storeId != null) {
      paramsMap['store_id.eq'] = query.storeId!;
    }

    if (query.productId != null) {
      paramsMap['item_id.eq'] = query.productId!;
    }

    if (query.startDate != null) {
      paramsMap['created_at.gte'] = query.startDate!.toIso8601String();
    }

    if (query.endDate != null) {
      paramsMap['created_at.lte'] = query.endDate!.toIso8601String();
    }

    if (query.entryType != null) {
      paramsMap['movement_type.eq'] = query.entryType!;
    }

    if (query.reason != null) {
      paramsMap['notes.eq'] = query.reason!;
    }

    paramsMap['order'] = 'created_at.${query.sortOrder}';
    paramsMap['offset'] = query.offset.toString();
    paramsMap['limit'] = query.limit.toString();

    return paramsMap.entries.map((e) => '${e.key}=${e.value}').join('&');
  }



  /// Fetch ledger entries by reference ID (e.g., sale_id)
  Future<Result<List<StockLedgerEntry>>> getByReferenceId({
    required String referenceId,
    String? entryType,
  }) async {
    try {
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/inventory_movements?'
        'reference_id.eq=$referenceId&'
        '${entryType != null ? 'movement_type.eq=$entryType&' : ''}'
        'select=*&'
        'order=created_at.desc'
      );

      final headers = {
        'Content-Type': 'application/json',
        'apikey': NetworkConfig.supabaseAnonKey,
        'Authorization': 'Bearer ${NetworkConfig.supabaseAnonKey}',
        'Prefer': 'return=representation',
      };

      final response = await _client
          .get(url, headers: headers)
          .timeout(Duration(seconds: NetworkConfig.requestTimeout));

      if (response.statusCode == 200) {
        final List<dynamic> jsonData = json.decode(response.body);
        final entries = jsonData
            .whereType<Map<String, dynamic>>()
            .map((json) => StockLedgerEntry.fromJson(json))
            .toList();

        return Success<List<StockLedgerEntry>>(entries);
      } else {
        return Failure<List<StockLedgerEntry>>(
          'Failed to fetch ledger by reference: ${response.body}'
        );
      }
    } catch (e, stackTrace) {
      Logger.error('StockLedgerRepository.getByReferenceId failed', e, stackTrace);
      return Failure<List<StockLedgerEntry>>('Failed to fetch ledger entries: $e');
    }
  }

  /// Dispose client
  void dispose() {
    _client.close();
  }
}

/// Filter ledger entries based on query criteria
List<StockLedgerEntry> filterLedgerEntries(
  List<StockLedgerEntry> entries,
  StockLedgerQuery query,
) {
  return entries.where((entry) {
    // Date range filter
    if (query.startDate != null && entry.timestamp.isBefore(query.startDate!)) {
      return false;
    }
    if (query.endDate != null && entry.timestamp.isAfter(query.endDate!)) {
      return false;
    }

    // Entry type filter
    if (query.entryType != null && entry.entryType.value != query.entryType) {
      return false;
    }

    // Reason filter
    if (query.reason != null && entry.reason != query.reason) {
      return false;
    }

    return true;
  }).toList();
}

// Typedef for ledger callback
typedef GetLedgerEntriesCallback = Future<Result<List<StockLedgerEntry>>> Function({
  required StockLedgerQuery query,
});


