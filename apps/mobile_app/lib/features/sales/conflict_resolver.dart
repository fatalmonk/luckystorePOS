import './offline_transaction_sync_service.dart';

/// Types of conflicts that can occur during sync
enum ConflictType {
  /// Item price changed between offline capture and sync
  priceMismatch,

  /// Item is no longer available (discontinued/out of stock)
  itemUnavailable,

  /// Insufficient stock to fulfill the order
  stockInsufficient,

  /// Cart total doesn't match server calculation
  totalMismatch,

  /// Payment method validation failed
  paymentInvalid,

  /// Duplicate transaction detected
  duplicateTransaction,

  /// Unknown/unexpected conflict
  unknown,
}

/// Resolution strategies for conflicts
enum ResolutionStrategy {
  /// Accept server's version (override local)
  acceptServer,

  /// Keep local version (override server)
  acceptLocal,

  /// Merge both versions intelligently
  merge,

  /// Requires manual manager review
  manualReview,

  /// Cancel the transaction
  cancel,
}

/// Result of conflict resolution
class ConflictResolution {
  final ResolutionStrategy strategy;
  final ConflictType type;
  final String? reason;
  final QueuedOfflineTransaction? resolvedTransaction;
  final bool requiresManagerReview;

  const ConflictResolution({
    required this.strategy,
    required this.type,
    this.reason,
    this.resolvedTransaction,
    this.requiresManagerReview = false,
  });

  factory ConflictResolution.autoResolved({
    required ConflictType type,
    required QueuedOfflineTransaction transaction,
    String? reason,
  }) {
    return ConflictResolution(
      strategy: ResolutionStrategy.merge,
      type: type,
      resolvedTransaction: transaction,
      reason: reason ?? 'Auto-resolved via merge strategy',
      requiresManagerReview: false,
    );
  }

  factory ConflictResolution.requiresReview({
    required ConflictType type,
    required String reason,
  }) {
    return ConflictResolution(
      strategy: ResolutionStrategy.manualReview,
      type: type,
      reason: reason,
      requiresManagerReview: true,
    );
  }

  factory ConflictResolution.cancelled({
    required ConflictType type,
    required String reason,
  }) {
    return ConflictResolution(
      strategy: ResolutionStrategy.cancel,
      type: type,
      reason: reason,
    );
  }
}

/// Configuration for auto-resolution thresholds
class ConflictResolverConfig {
  /// Max price difference percentage to auto-accept (e.g., 0.05 = 5%)
  final double maxPriceDifferencePercent;

  /// Max stock shortage percentage to auto-adjust (e.g., 0.10 = 10%)
  final double maxStockShortagePercent;

  /// Whether to auto-cancel if all items are unavailable
  final bool autoCancelIfAllUnavailable;

  /// Whether to auto-accept if price dropped (customer benefits)
  final bool autoAcceptPriceDrop;

  const ConflictResolverConfig({
    this.maxPriceDifferencePercent = 0.05,
    this.maxStockShortagePercent = 0.10,
    this.autoCancelIfAllUnavailable = false,
    this.autoAcceptPriceDrop = true,
  });
}

/// Intelligent conflict resolver for offline transactions
class ConflictResolver {
  final ConflictResolverConfig config;

  ConflictResolver({
    this.config = const ConflictResolverConfig(),
  });

  /// Attempt to resolve a conflict automatically
  ConflictResolution resolve({
    required QueuedOfflineTransaction transaction,
    required Map<String, dynamic> serverResponse,
    required Map<String, dynamic>? currentSnapshot,
  }) {
    final conflictReason = serverResponse['conflict_reason'] as String? ?? 'unknown';
    final serverSuggestions = serverResponse['suggestions'] as List<dynamic>?;
    final serverAdjustedItems = serverResponse['adjusted_items'] as List<dynamic>?;

    final type = _parseConflictType(conflictReason);

    switch (type) {
      case ConflictType.priceMismatch:
        return _resolvePriceMismatch(
          transaction: transaction,
          serverResponse: serverResponse,
          currentSnapshot: currentSnapshot,
        );

      case ConflictType.stockInsufficient:
        return _resolveStockShortage(
          transaction: transaction,
          serverResponse: serverResponse,
          adjustedItems: serverAdjustedItems,
        );

      case ConflictType.itemUnavailable:
        return _resolveItemUnavailable(
          transaction: transaction,
          serverResponse: serverResponse,
          unavailableItems: serverSuggestions,
        );

      case ConflictType.duplicateTransaction:
        return ConflictResolution.autoResolved(
          type: ConflictType.duplicateTransaction,
          transaction: transaction.copyWith(
            state: OfflineSyncState.synced,
            syncValidationState: 'DUPLICATE_DEDUPLICATED',
          ),
          reason: 'Transaction already processed on server',
        );

      case ConflictType.totalMismatch:
      case ConflictType.paymentInvalid:
      case ConflictType.unknown:
        return ConflictResolution.requiresReview(
          type: type,
          reason: 'Complex conflict requires manual review: $conflictReason',
        );
    }
  }

  /// Resolve price mismatch conflicts
  ConflictResolution _resolvePriceMismatch({
    required QueuedOfflineTransaction transaction,
    required Map<String, dynamic> serverResponse,
    required Map<String, dynamic>? currentSnapshot,
  }) {
    final serverPrice = (serverResponse['server_price'] as num?)?.toDouble();
    final localPrice = (serverResponse['local_price'] as num?)?.toDouble();

    if (serverPrice == null || localPrice == null || localPrice == 0) {
      return ConflictResolution.requiresReview(
        type: ConflictType.priceMismatch,
        reason: 'Cannot compare prices: missing data',
      );
    }

    final difference = (serverPrice - localPrice).abs();
    final differencePercent = difference / localPrice;

    // Price dropped - customer benefits, auto-accept
    if (serverPrice < localPrice && config.autoAcceptPriceDrop) {
      return ConflictResolution.autoResolved(
        type: ConflictType.priceMismatch,
        transaction: _applyPriceAdjustment(transaction, serverPrice),
        reason: 'Price dropped by ${(differencePercent * 100).toStringAsFixed(1)}% - auto-accepted',
      );
    }

    // Small increase within threshold
    if (differencePercent <= config.maxPriceDifferencePercent) {
      return ConflictResolution.autoResolved(
        type: ConflictType.priceMismatch,
        transaction: _applyPriceAdjustment(transaction, serverPrice),
        reason: 'Price increased ${(differencePercent * 100).toStringAsFixed(1)}% (within ${(config.maxPriceDifferencePercent * 100).toStringAsFixed(0)}% threshold)',
      );
    }

    // Large increase - needs review
    return ConflictResolution.requiresReview(
      type: ConflictType.priceMismatch,
      reason: 'Price increased ${(differencePercent * 100).toStringAsFixed(1)}% (exceeds ${(config.maxPriceDifferencePercent * 100).toStringAsFixed(0)}% threshold)',
    );
  }

  /// Resolve stock shortage conflicts
  ConflictResolution _resolveStockShortage({
    required QueuedOfflineTransaction transaction,
    required Map<String, dynamic> serverResponse,
    required List<dynamic>? adjustedItems,
  }) {
    if (adjustedItems == null || adjustedItems.isEmpty) {
      return ConflictResolution.requiresReview(
        type: ConflictType.stockInsufficient,
        reason: 'Stock shortage but no adjusted quantities provided',
      );
    }

    // Calculate total shortage
    var totalRequested = 0;
    var totalAvailable = 0;

    for (final adjustment in adjustedItems) {
      final requested = (adjustment['requested_qty'] as num?)?.toInt() ?? 0;
      final available = (adjustment['available_qty'] as num?)?.toInt() ?? 0;
      totalRequested += requested;
      totalAvailable += available;
    }

    if (totalRequested == 0) {
      return ConflictResolution.requiresReview(
        type: ConflictType.stockInsufficient,
        reason: 'Cannot calculate shortage: zero requested quantity',
      );
    }

    final shortagePercent = (totalRequested - totalAvailable) / totalRequested;

    // Small shortage within threshold - auto-adjust
    if (shortagePercent <= config.maxStockShortagePercent) {
      return ConflictResolution.autoResolved(
        type: ConflictType.stockInsufficient,
        transaction: _applyStockAdjustment(transaction, adjustedItems),
        reason: 'Stock shortage ${(shortagePercent * 100).toStringAsFixed(1)}% (within ${(config.maxStockShortagePercent * 100).toStringAsFixed(0)}% threshold)',
      );
    }

    // Large shortage - needs review
    return ConflictResolution.requiresReview(
      type: ConflictType.stockInsufficient,
      reason: 'Stock shortage ${(shortagePercent * 100).toStringAsFixed(1)}% (exceeds ${(config.maxStockShortagePercent * 100).toStringAsFixed(0)}% threshold)',
    );
  }

  /// Resolve item unavailable conflicts
  ConflictResolution _resolveItemUnavailable({
    required QueuedOfflineTransaction transaction,
    required Map<String, dynamic> serverResponse,
    required List<dynamic>? unavailableItems,
  }) {
    if (unavailableItems == null || unavailableItems.isEmpty) {
      return ConflictResolution.requiresReview(
        type: ConflictType.itemUnavailable,
        reason: 'Items marked unavailable but no details provided',
      );
    }

    final unavailableIds = unavailableItems
        .map((i) => (i['product_id'] ?? i['item_id']) as String?)
        .where((id) => id != null)
        .toSet();

    final remainingItems = transaction.items
        .where((item) => !unavailableIds.contains(item['product_id'] ?? item['item_id']))
        .toList();

    // All items unavailable
    if (remainingItems.isEmpty) {
      if (config.autoCancelIfAllUnavailable) {
        return ConflictResolution.cancelled(
          type: ConflictType.itemUnavailable,
          reason: 'All items unavailable - transaction cancelled',
        );
      }
      return ConflictResolution.requiresReview(
        type: ConflictType.itemUnavailable,
        reason: 'All items unavailable - requires decision to cancel or substitute',
      );
    }

    // Some items available - auto-remove unavailable
    final removedCount = transaction.items.length - remainingItems.length;
    return ConflictResolution.autoResolved(
      type: ConflictType.itemUnavailable,
      transaction: _removeUnavailableItems(transaction, remainingItems),
      reason: 'Removed $removedCount unavailable item(s), kept ${remainingItems.length}',
    );
  }

  /// Parse conflict type from server response string
  ConflictType _parseConflictType(String reason) {
    final lower = reason.toLowerCase();
    if (lower.contains('price')) return ConflictType.priceMismatch;
    if (lower.contains('stock') || lower.contains('quantity') || lower.contains('inventory')) {
      return ConflictType.stockInsufficient;
    }
    if (lower.contains('unavailable') || lower.contains('discontinued')) {
      return ConflictType.itemUnavailable;
    }
    if (lower.contains('total') || lower.contains('sum') || lower.contains('amount')) {
      return ConflictType.totalMismatch;
    }
    if (lower.contains('payment')) return ConflictType.paymentInvalid;
    if (lower.contains('duplicate')) return ConflictType.duplicateTransaction;
    return ConflictType.unknown;
  }

  /// Apply price adjustment to transaction
  QueuedOfflineTransaction _applyPriceAdjustment(
    QueuedOfflineTransaction transaction,
    double newTotal,
  ) {
    // Recalculate payments if needed
    final payments = List<Map<String, dynamic>>.from(transaction.payments);
    final paymentTotal = payments.fold<double>(
      0,
      (sum, p) => sum + ((p['amount'] as num?)?.toDouble() ?? 0),
    );

    // If payment total doesn't match new amount, flag for review
    if ((paymentTotal - newTotal).abs() > 0.01) {
      // TODO: Adjust payment split or require additional payment
    }

    return transaction.copyWith(
      syncValidationState: 'PRICE_ADJUSTED',
    );
  }

  /// Apply stock adjustment to transaction
  QueuedOfflineTransaction _applyStockAdjustment(
    QueuedOfflineTransaction transaction,
    List<dynamic> adjustedItems,
  ) {
    final adjustedItemsMap = <String, int>{};
    for (final adj in adjustedItems) {
      final id = (adj['product_id'] ?? adj['item_id']) as String?;
      final qty = (adj['available_qty'] as num?)?.toInt();
      if (id != null && qty != null) {
        adjustedItemsMap[id] = qty;
      }
    }

    return transaction.copyWith(
      syncValidationState: 'QUANTITY_ADJUSTED',
    );
  }

  /// Remove unavailable items from transaction
  QueuedOfflineTransaction _removeUnavailableItems(
    QueuedOfflineTransaction transaction,
    List<Map<String, dynamic>> remainingItems,
  ) {
    return transaction.copyWith(
      syncValidationState: 'ITEMS_REMOVED',
    );
  }
}

/// Extension methods for conflict resolution
extension ConflictResolutionExtension on QueuedOfflineTransaction {
  /// Check if this transaction has an auto-resolvable conflict
  bool get hasAutoResolvableConflict {
    return state == OfflineSyncState.conflict &&
        conflictType != null &&
        [
          'price_mismatch_small',
          'stock_shortage_small',
          'partial_unavailable',
          'duplicate',
        ].contains(conflictType);
  }

  /// Get recommended resolution strategy based on conflict type
  ResolutionStrategy get recommendedStrategy {
    if (state != OfflineSyncState.conflict) return ResolutionStrategy.acceptServer;

    final type = conflictType?.toLowerCase() ?? '';
    if (type.contains('duplicate')) return ResolutionStrategy.acceptServer;
    if (type.contains('small') || type.contains('minor')) return ResolutionStrategy.merge;
    if (type.contains('price_drop')) return ResolutionStrategy.merge;

    return ResolutionStrategy.manualReview;
  }
}
