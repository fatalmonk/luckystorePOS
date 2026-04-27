import '../../core/utils/result.dart';
import 'inventory_service.dart';
import 'stock_ledger_entry.dart';
import 'stock_ledger_repository.dart';
import 'audit_service.dart';
import '../../core/utils/app_utils.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// Main inventory repository that coordinates stock operations
class InventoryRepository {
  final InventoryService _inventoryService;
  final StockLedgerRepository _ledgerRepository;
  final AuditService _auditService;

  InventoryRepository({
    required InventoryService inventoryService,
    required StockLedgerRepository ledgerRepository,
    required AuditService auditService,
  })  : _inventoryService = inventoryService,
        _ledgerRepository = ledgerRepository,
        _auditService = auditService;

  /// Deduct stock and log audit trail atomically
  /// This is the primary method for stock deduction during sales
  Future<Result<StockDeductionResult>> deductStock({
    required String storeId,
    required String productId,
    required String productName,
    required int quantity,
    required String saleId,
    String? performedBy,
  }) async {
    try {
      // Step 1: Deduct stock via RPC
      final deductionResult = await _inventoryService.deductStock(
        storeId: storeId,
        productId: productId,
        quantity: quantity,
        metadata: {
          'sale_id': saleId,
          'performed_by': performedBy,
        },
      );

      if (deductionResult.isFailure) {
        return Result<StockDeductionFailure>(failure);
      }

      // Step 2: Log audit trail
      await _auditService.forStockDeduction(
        storeId: storeId,
        productId: productId,
        productName: productName,
        quantity: quantity,
        saleId: saleId,
        performedBy: performedBy,
      );

      // Step 3: Parse and return result
      final data = deductionResult.data as Map<String, dynamic>;
      return Success<StockDeductionResult>(StockDeductionResult.fromJson(data));
    } catch (e, stackTrace) {
      Logger.error('InventoryRepository.deductStock failed', e, stackTrace);
      return Failure<StockDeductionResult>(
        'Failed to deduct stock: ${e.toString()}',
        exception: e as Exception,
      );
    }
  }

  /// Get current stock quantity
  Future<int> getStockQuantity({
    required String storeId,
    required String productId,
  }) async {
    return await _inventoryService.getStockQuantity(
      storeId: storeId,
      productId: productId,
    );
  }

  /// Check if sufficient stock is available
  Future<bool> hasSufficientStock({
    required String storeId,
    required String productId,
    required int quantity,
  }) async {
    try {
      final available = await getStockQuantity(
        storeId: storeId,
        productId: productId,
      );
      return available >= quantity;
    } catch (e) {
      Logger.warning(
        'InventoryRepository: Could not check stock availability',
        e,
      );
      return false;
    }
  }

  /// Get all low stock alerts for a store
  Future<Result<List<Map<String, dynamic>>>> getLowStockAlerts({
    required String storeId,
    int? threshold,
  }) async {
    return Result<List<Map<String, dynamic>>>(() async {
      return await _inventoryService.getLowStockAlerts(
        storeId: storeId,
        threshold: threshold,
      );
    });
  }

  /// Fetch stock ledger entries
  Future<Result<List<StockLedgerEntry>>> getLedgerEntries({
    required StockLedgerQuery query,
  }) async {
    return _ledgerRepository.getLedgerEntries(query: query);
  }

  /// Get ledger summary for a period
  Future<Result<StockLedgerSummary>> getLedgerSummary({
    required String storeId,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    return _ledgerRepository.getLedgerSummary(
      storeId: storeId,
      startDate: startDate,
      endDate: endDate,
    );
  }

  /// Get stock history for a product
  Future<Result<List<StockLedgerEntry>>> getProductHistory({
    required String productId,
    String? storeId,
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
  }) async {
    return _auditService.getProductAuditHistory(
      productId: productId,
      storeId: storeId,
      startDate: startDate,
      endDate: endDate,
      limit: limit,
    );
  }

  /// Validate stock before processing sale
  Future<Result<bool>> validateStock({
    required String storeId,
    required Map<String, int> productQuantities, // Map of productId -> quantity
  }) async {
    try {
      for (final entry in productQuantities.entries) {
        final productId = entry.key;
        final quantity = entry.value;

        final available = await getStockQuantity(
          storeId: storeId,
          productId: productId,
        );

        if (available < quantity) {
          return Failure<bool>(
            'Insufficient stock for $productId: available=$available, required=$quantity',
          );
        }
      }

      return Success<bool>(true);
    } catch (e) {
      return Failure<bool>('Stock validation failed: $e');
    }
  }

  /// Batch stock deduction
  Future<Result<List<StockDeductionResult>>> batchDeductStock({
    required String storeId,
    required List<StockDeductionRequest> requests,
    String? performedBy,
  }) async {
    final results = List<StockDeductionResult>.filled(requests.length, null);
    final errors = <int>[];

    for (int i = 0; i < requests.length; i++) {
      final request = requests[i];
      final result = await deductStock(
        storeId: storeId,
        productId: request.productId,
        productName: request.productName,
        quantity: request.quantity,
        saleId: request.saleId,
        performedBy: performedBy,
      );

      if (result.isSuccess) {
        results[i] = result.data;
      } else {
        errors.add(i);
      }
    }

    if (errors.isEmpty) {
      return Success<List<StockDeductionResult>>(results.whereType<StockDeductionResult>().toList());
    }

    return Failure<List<StockDeductionResult>>(
      'Batch deduction failed for ${errors.length} items',
      metadata: {'failed_indices': errors},
    );
  }

  /// Clean up resources
  void dispose() {
    _inventoryService.dispose();
    _ledgerRepository.dispose();
    _auditService.dispose();
  }
}

/// Request for stock deduction
class StockDeductionRequest {
  final String productId;
  final String productName;
  final int quantity;
  final String saleId;

  const StockDeductionRequest({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.saleId,
  });
}

/// Result of stock validation
class StockValidationResult {
  final bool isValid;
  final String? reason;
  final Map<String, int>? availableStock;

  const StockValidationResult({
    required this.isValid,
    this.reason,
    this.availableStock,
  });

  factory StockValidationResult.success() {
    return const StockValidationResult(isValid: true);
  }

  factory StockValidationResult.failure(String reason) {
    return const StockValidationResult(isValid: false, reason: reason);
  }
}

/// Custom error type for stock deduction
class StockDeductionError {
  final String message;
  final String? productId;
  final String? storeId;
  final int? requestedQuantity;
  final int? availableQuantity;

  const StockDeductionError({
    required this.message,
    this.productId,
    this.storeId,
    this.requestedQuantity,
    this.availableQuantity,
  });

  @override
  String toString() => message;
}
