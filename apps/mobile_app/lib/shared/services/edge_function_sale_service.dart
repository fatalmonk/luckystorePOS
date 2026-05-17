import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Calls the create-sale edge function instead of using direct RPC.
/// Provides rate limiting, input validation, and CORS enforcement that
/// direct RPC calls bypass.
class EdgeFunctionSaleService {
  static String get _edgeUrl =>
      dotenv.maybeGet('CREATE_SALE_EDGE_URL')?.trim() ?? '';

  static bool get isConfigured => _edgeUrl.isNotEmpty;

  /// Submit a sale through the create-sale edge function.
  /// Falls back to null if the edge function is not configured, so callers
  /// can use direct RPC as a fallback.
  static Future<Map<String, dynamic>?> createSale({
    required String storeId,
    required String clientTransactionId,
    required List<Map<String, dynamic>> items,
    required String paymentMethodId,
    double discount = 0,
    String? reference,
    String? userToken,
    Duration timeout = const Duration(seconds: 30),
  }) async {
    if (!isConfigured) return null;

    try {
      final response = await http.post(
        Uri.parse(_edgeUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${userToken ?? Supabase.instance.client.auth.currentSession?.accessToken ?? ''}',
        },
        body: jsonEncode({
          'store_id': storeId,
          'client_transaction_id': clientTransactionId,
          'items': items,
          'discount': discount,
          'payment_method_id': paymentMethodId,
          if (reference != null) 'reference': reference,
        }),
      ).timeout(timeout);

      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
      }
      return null;
    } catch (_) {
      return null; // Caller falls back to direct RPC
    }
  }
}
