// Stock Service for stock adjustment operations
// Uses the adjust-stock edge function via the PosProvider

library;

import 'package:supabase_flutter/supabase_flutter.dart';

/// Stock adjustment reasons enum
/// Matches the database adjustment reasons
enum StockAdjustmentReason {
  damaged,
  theft,
  found,
  returnToSupplier;

  String get rpcValue {
    switch (this) {
      case StockAdjustmentReason.damaged:
        return 'damaged';
      case StockAdjustmentReason.theft:
        return 'theft';
      case StockAdjustmentReason.found:
        return 'found';
      case StockAdjustmentReason.returnToSupplier:
        return 'return_to_supplier';
    }
  }

  String get displayName {
    switch (this) {
      case StockAdjustmentReason.damaged:
        return 'Damaged';
      case StockAdjustmentReason.theft:
        return 'Theft';
      case StockAdjustmentReason.found:
        return 'Found';
      case StockAdjustmentReason.returnToSupplier:
        return 'Return to Supplier';
    }
  }

  /// Whether this adjustment adds or removes stock
  bool get isPositive {
    return switch (this) {
      StockAdjustmentReason.found => true,
      _ => false,
    };
  }

  int get direction => isPositive ? 1 : -1;
}

/// Result of a stock adjustment operation
class StockAdjustmentServiceResult {
  final bool success;
  final String? error;
  final String? errorCode;
  final int? newQuantity;
  final int? previousQuantity;
  final String? ledgerEntryId;
  final bool requiresManagerAuth;

  StockAdjustmentServiceResult({
    required this.success,
    this.error,
    this.errorCode,
    this.newQuantity,
    this.previousQuantity,
    this.ledgerEntryId,
    this.requiresManagerAuth = false,
  });

  factory StockAdjustmentServiceResult.fromJson(Map<String, dynamic> json) {
    return StockAdjustmentServiceResult(
      success: json['success'] ?? false,
      error: json['error'] as String?,
      errorCode: json['error_code'] as String?,
      newQuantity: json['new_quantity'] as int?,
      previousQuantity: json['previous_quantity'] as int?,
      ledgerEntryId: json['ledger_entry_id'] as String?,
      requiresManagerAuth: json['requires_manager_auth'] ?? false,
    );
  }
}

/// Service for stock operations
class StockService {
  final SupabaseClient _supabase;

  StockService({SupabaseClient? client})
      : _supabase = client ?? Supabase.instance.client;

  /// Get current stock level for an item
  Future<int> getStockLevel({
    required String storeId,
    required String itemId,
  }) async {
    try {
      final result = await _supabase
          .from('stock_levels')
          .select('qty')
          .eq('store_id', storeId)
          .eq('item_id', itemId)
          .maybeSingle();

      return result?['qty'] as int? ?? 0;
    } catch (e) {
      throw StockServiceException('Failed to get stock level: $e');
    }
  }

  /// Adjust stock via RPC
  ///
  /// [itemId] - Item ID to adjust
  /// [delta] - Delta (positive or negative)
  /// [reason] - Reason for adjustment
  /// [notes] - Optional notes
  /// [managerPin] - Optional manager PIN for large adjustments
  Future<StockAdjustmentServiceResult> adjustStock({
    required String storeId,
    required String itemId,
    required int delta,
    required StockAdjustmentReason reason,
    String? notes,
    String? managerPin,
  }) async {
    try {
      final response = await _supabase.functions.invoke(
        'adjust-stock',
        body: {
          'store_id': storeId,
          'item_id': itemId,
          'delta': delta,
          'reason': reason.rpcValue,
          'notes': notes,
          if (managerPin != null) 'manager_pin': managerPin,
        },
      );

      final data = response.data as Map<String, dynamic>?;

      if (response.status != 200) {
        final errorCode = data?['error_code'] as String?;
        final errorMsg = data?['error'] as String? ?? 'Stock adjustment failed';

        return StockAdjustmentServiceResult(
          success: false,
          error: errorMsg,
          errorCode: errorCode,
          requiresManagerAuth: errorCode == 'MANAGER_AUTH_REQUIRED',
        );
      }

      return StockAdjustmentServiceResult(
        success: true,
        newQuantity: data?['new_quantity'] as int?,
        previousQuantity: data?['previous_quantity'] as int?,
        ledgerEntryId: data?['ledger_entry_id'] as String?,
      );
    } catch (e) {
      return StockAdjustmentServiceResult(
        success: false,
        error: e.toString(),
      );
    }
  }

  /// Get stock ledger entries for an item
  Future<List<Map<String, dynamic>>> getStockLedger({
    required String storeId,
    required String itemId,
    int limit = 50,
  }) async {
    try {
      final results = await _supabase
          .from('stock_ledger')
          .select('*')
          .eq('store_id', storeId)
          .eq('item_id', itemId)
          .order('created_at', ascending: false)
          .limit(limit);

      return List<Map<String, dynamic>>.from(results);
    } catch (e) {
      throw StockServiceException('Failed to get stock ledger: $e');
    }
  }
}

/// Exception for stock service operations
class StockServiceException implements Exception {
  final String message;

  StockServiceException(this.message);

  @override
  String toString() => 'StockServiceException: $message';
}
