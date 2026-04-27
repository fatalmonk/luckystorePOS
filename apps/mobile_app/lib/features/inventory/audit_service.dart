import '../core/network/network_config.dart';
import '../core/errors/exceptions.dart';
import '../core/utils/result.dart';
import 'stock_ledger_entry.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// Audit service for tracking inventory changes with full context
class AuditService {
  final http.Client _client;
  
  AuditService({http.Client? client}) : _client = client ?? http.Client();

  /// Create audit log entry for inventory change
  /// Returns: Result with audit trail details
  Future<Result<StockLedgerEntry>> logInventoryChange({
    required String storeId,
    required String productId,
    required String productName,
    required int quantity,
    required LedgerEntryType entryType,
    required String reason,
    required String referenceId,
    String? performedBy,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/stock_ledger?select=*&'
        'if_match=*&'
        'return=representation'
      );

      final headers = {
        'Content-Type': 'application/json',
        'apikey': NetworkConfig.supabaseServiceKey,
        'Authorization': 'Bearer ${NetworkConfig.supabaseServiceKey}',
      };

      final payload = {
        'store_id': storeId,
        'product_id': productId,
        'product_name': productName,
        'quantity': quantity,
        'entry_type': entryType.value,
        'reason': reason,
        'reference_id': referenceId,
        'performed_by': performedBy,
        'metadata': metadata,
      };

      // First, get previous quantity for audit trail
      final previousQuantity = await _getPreviousStockQuantity(
        storeId: storeId,
        productId: productId,
      );

      // Now insert the ledger entry
      final response = await _client
          .post(url, headers: headers, body: jsonEncode(payload))
          .timeout(Duration(seconds: NetworkConfig.requestTimeout));

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body)[0] as Map<String, dynamic>;
        data['previous_quantity'] = previousQuantity;
        
        // Recalculate new quantity
        final newQuantity = previousQuantity + quantity;
        data['new_quantity'] = newQuantity;

        final entry = StockLedgerEntry.fromJson(data);
        
        Logger.info('AuditService: Logged inventory change - ${entryType.value} of $quantity units for $productId');
        
        return Success<StockLedgerEntry>(entry);
      } else {
        final error = jsonDecode(response.body);
        return Failure<StockLedgerEntry>(
          'Failed to log inventory change: ${error['message'] ?? error['error'] ?? 'Unknown error'}',
          metadata: error,
        );
      }
    } catch (e, stackTrace) {
      Logger.error('AuditService.logInventoryChange failed', e, stackTrace);
      
      return Failure<StockLedgerEntry>(
        'Failed to log inventory change: ${e.toString()}',
        exception: e is AppException ? e : DatabaseException('Database operation failed'),
      );
    }
  }

  /// Get previous stock quantity
  Future<int> _getPreviousStockQuantity({
    required String storeId,
    required String productId,
  }) async {
    try {
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/stock_levels?stock_id.eq=$storeId&'
        'item_id.eq=$productId&select=qty'
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
        final List<dynamic> result = jsonDecode(response.body);
        if (result.isNotEmpty) {
          return result.first['qty'] as int? ?? 0;
        }
        return 0;
      }
      return 0;
    } catch (e) {
      Logger.warning('AuditService: Could not fetch previous quantity', e);
      return 0;
    }
  }

  /// Create audit trail for stock deduction
  Future<Result<StockLedgerEntry>> forStockDeduction({
    required String storeId,
    required String productId,
    required String productName,
    required int quantity,
    required String saleId,
    String? performedBy,
  }) async {
    return logInventoryChange(
      storeId: storeId,
      productId: productId,
      productName: productName,
      quantity: -quantity, // Negative for deduction
      entryType: LedgerEntryType.sale,
      reason: 'sale_deduction',
      referenceId: saleId,
      performedBy: performedBy,
      metadata: {
        'source': 'sale_deduction',
        'method': 'stock_deduce_rpc',
      },
    );
  }

  /// Create audit trail for stock addition
  Future<Result<StockLedgerEntry>> forStockAddition({
    required String storeId,
    required String productId,
    required String productName,
    required int quantity,
    required String referenceId,
    LedgerEntryType? type,
    String? performedBy,
  }) async {
    return logInventoryChange(
      storeId: storeId,
      productId: productId,
      productName: productName,
      quantity: quantity, // Positive for addition
      entryType: type ?? LedgerEntryType.purchase,
      reason: 'restock',
      referenceId: referenceId,
      performedBy: performedBy,
      metadata: {
        'source': 'restock_adquisition',
      },
    );
  }

  /// Batch log inventory changes
  Future<Result<List<StockLedgerEntry>>> batchLogChanges({
    required List<InventoryChange> changes,
    String? performedBy,
  }) async {
    final results = List.generate(changes.length, (index) => null);
    final errors = <int>[];

    for (int i = 0; i < changes.length; i++) {
      try {
        final change = changes[i];
        final result = await logInventoryChange(
          storeId: change.storeId,
          productId: change.productId,
          productName: change.productName,
          quantity: change.quantity,
          entryType: change.entryType,
          reason: change.reason,
          referenceId: change.referenceId,
          performedBy: performedBy,
          metadata: change.metadata,
        );
        
        if (result.isSuccess) {
          results[i] = result.data;
        } else {
          errors.add(i);
        }
      } catch (e) {
        errors.add(i);
        Logger.error('AuditService: Batch change $i failed', e);
      }
    }

    if (errors.isEmpty) {
      return Success<List<StockLedgerEntry>>(
        results.whereType<StockLedgerEntry>().toList(),
      );
    }

    return Failure<List<StockLedgerEntry>>(
      'Batch logging failed for ${errors.length} changes',
      metadata: {'failed_indices': errors},
    );
  }

  /// Fetch audit history for a product
  Future<Result<List<StockLedgerEntry>>> getProductAuditHistory({
    required String productId,
    String? storeId,
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
  }) async {
    try {
      var url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/stock_ledger?'
        'product_id.eq=$productId&'
        'select=*&'
        'order=timestamp.desc'
      );

      if (storeId != null) {
        url = Uri.parse(
          '${NetworkConfig.supabaseUrl}/rest/v1/stock_ledger?'
          'product_id.eq=$productId&'
          'store_id.eq=$storeId&'
          'select=*&'
          'order=timestamp.desc'
        );
      }

      if (startDate != null) {
        url = Uri.parse('$url&timestamp.gte=${startDate.toIso8601String()}');
      }

      if (endDate != null) {
        url = Uri.parse('$url&timestamp.lte=${endDate.toIso8601String()}');
      }

      if (limit != null) {
        url = Uri.parse('$url&limit=$limit');
      }

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
        final List<dynamic> jsonData = jsonDecode(response.body);
        final entries = jsonData
            .whereType<Map<String, dynamic>>()
            .map((json) => StockLedgerEntry.fromJson(json))
            .toList();

        return Success<List<StockLedgerEntry>>(entries);
      } else {
        return Failure<List<StockLedgerEntry>>(
          'Failed to fetch audit history'
        );
      }
    } catch (e) {
      return Failure<List<StockLedgerEntry>>(
        'Failed to fetch audit history: $e',
        exception: e is AppException ? e : DatabaseException(e.toString()),
      );
    }
  }

  /// Dispose client
  void dispose() {
    _client.close();
  }
}

/// Represents a single inventory change to be logged
class InventoryChange {
  final String storeId;
  final String productId;
  final String productName;
  final int quantity;
  final LedgerEntryType entryType;
  final String reason;
  final String referenceId;
  final Map<String, dynamic>? metadata;

  const InventoryChange({
    required this.storeId,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.entryType,
    required this.reason,
    required this.referenceId,
    this.metadata,
  });
}

/// Audit context for operation tracking
class AuditContext {
  final String? userId;
  final String? sessionId;
  final String source;
  final Map<String, dynamic>? metadata;

  const AuditContext({
    this.userId,
    this.sessionId,
    required this.source,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'session_id': sessionId,
      'source': source,
      'metadata': metadata,
    };
  }
}
