import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../core/network/network_config.dart';
import '../../core/errors/exceptions.dart';
import '../../core/utils/result.dart';
import '../../core/utils/app_utils.dart';
import '../../config/environment_contract.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// Inventory service for stock operations
class InventoryService {
  final http.Client _client;

  InventoryService({http.Client? client})
      : _client = client ?? http.Client();

  /// Deduct stock from inventory
  /// Returns: Result with deduction details (movement_id, new_quantity, etc.)
  Future<Result<Map<String, dynamic>>> deductStock({
    required String storeId,
    required String productId,
    required int quantity,
    String? metadata,
  }) async {
    try {
      final url = Uri.parse('${NetworkConfig.supabaseUrl}/rpc/deduct_stock');
      final headers = {
        'Content-Type': 'application/json',
        'apikey': NetworkConfig.supabaseServiceKey,
        'Authorization': 'Bearer ${NetworkConfig.supabaseServiceKey}',
      };

      final body = jsonEncode({
        'store_id': storeId,
        'product_id': productId,
        'quantity': quantity,
        if (metadata != null) 'metadata': metadata,
      });

      final response = await _client
          .post(url, headers: headers, body: body)
          .timeout(Duration(seconds: NetworkConfig.requestTimeout));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;

        // Check for error in response
        if (data['error'] != null) {
          return Failure<Map<String, dynamic>>(
            data['error']['message'] ?? 'Stock deduction failed',
            metadata: data,
          );
        }

        return Success<Map<String, dynamic>>(data);
      } else {
        final error = jsonDecode(response.body);
        return Failure<Map<String, dynamic>>(
          'Failed to deduct stock: ${error['message'] ?? error['error'] ?? 'Unknown error'}',
          metadata: error,
        );
      }
    } catch (e, stackTrace) {
      Logger.error('InventoryService.deductStock failed', e, stackTrace);
      
      if (e is http.ClientException) {
        return Failure<Map<String, dynamic>>(
          'Network error during stock deduction',
          exception: NetworkException('Connection failed'),
        );
      } else if (e is FormatException) {
        return Failure<Map<String, dynamic>>(
          'Invalid response format from server',
          exception: const ValidationException('Malformed server response'),
        );
      } else if (e is TimeoutException) {
        return Failure<Map<String, dynamic>>(
          'Stock deduction timeout',
          exception: const NetworkException('Request timed out'),
        );
      }

      return Failure<Map<String, dynamic>>(
        'Stock deduction failed: ${e.toString()}',
        exception: e as Exception,
      );
    }
  }

  /// Check stock quantity for a product in a store
  Future<int> getStockQuantity({
    required String storeId,
    required String productId,
  }) async {
    try {
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/stock_levels?store_id=eq.$storeId&item_id=eq.$productId&select=qty',
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

      if (response.statusCode != 200) {
        throw NetworkException('Failed to fetch stock levels');
      }

      final List<dynamic> body = jsonDecode(response.body);
      if (body.isEmpty) return 0;

      return body.first['qty'] as int? ?? 0;
    } catch (e) {
      Logger.error('InventoryService.getStockQuantity failed', e);
      rethrow;
    }
  }

  /// Get low stock alerts
  Future<List<Map<String, dynamic>>> getLowStockAlerts({
    required String storeId,
    int? threshold,
  }) async {
    try {
      threshold ??= 10; // Default threshold
      
      final url = Uri.parse(
        '${NetworkConfig.supabaseUrl}/rest/v1/stock_levels?'
        'store_id=eq.$storeId&qty.lt=$threshold&select=*,product:id(item_id)($EnvironmentContract.productProjection)',
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

      if (response.statusCode != 200) {
        throw NetworkException('Failed to fetch low stock alerts');
      }

      return List<Map<String, dynamic>>.from(jsonDecode(response.body));
    } catch (e) {
      Logger.error('InventoryService.getLowStockAlerts failed', e);
      rethrow;
    }
  }

  /// Dispose client
  void dispose() {
    _client.close();
  }
}

/// Stock deduction result model
class StockDeductionResult {
  final String movementId;
  final int newQuantity;
  final int previousQuantity;
  final int deducted;

  StockDeductionResult({
    required this.movementId,
    required this.newQuantity,
    required this.previousQuantity,
    required this.deducted,
  });

  factory StockDeductionResult.fromJson(Map<String, dynamic> json) {
    return StockDeductionResult(
      movementId: json['movement_id'] as String,
      newQuantity: json['new_quantity'] as int,
      previousQuantity: json['previous_quantity'] as int,
      deducted: json['deducted'] as int,
    );
  }

  bool get hasNegativeStock => newQuantity < 0;
}

/// Exception for stock deduction failures
class StockDeductionException implements Exception {
  final String productId;
  final String storeId;
  final int requestedQuantity;
  final String? availableQuantity;
  final String? reason;

  StockDeductionException({
    required this.productId,
    required this.storeId,
    required this.requestedQuantity,
    this.availableQuantity,
    this.reason,
  });

  @override
  String toString() {
    if (availableQuantity != null) {
      return 'StockDeductionException: Insufficient stock for $productId in $storeId. '
          'Requested: $requestedQuantity, Available: $availableQuantity. ${reason ?? ""}';
    }
    return 'StockDeductionException: Failed to deduct $requestedQuantity units of '
        '$productId from $storeId. Reason: $reason';
  }
}

/// Custom exception for stock management
class StockManagementException implements Exception {
  final String message;
  final String? code;

  StockManagementException(this.message, {this.code});

  @override
  String toString() => 'StockManagementException[$code]: $message';
}

// Typedef for stock deduction callback
typedef StockDeductionCallback = Future<Result<StockDeductionResult>> Function({
  required String storeId,
  required String productId,
  required int quantity,
  Map<String, dynamic>? metadata,
});
