import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Service that manages Supabase Realtime subscriptions for stock level updates.
///
/// It creates a channel filtered to the current user's `store_id` and
/// broadcasts incoming changes via a `Stream<Map<String, dynamic>>` so that
/// UI widgets can react to stock updates in real time.
class RealtimeProvider {
  final SupabaseClient _client;
  final String _storeId;
  final StreamController<Map<String, dynamic>> _controller =
      StreamController.broadcast();
  RealtimeChannel? _channel;

  RealtimeProvider(this._client, this._storeId);

  /// Exposes a stream of incoming payloads from the `stock_levels` table.
  Stream<Map<String, dynamic>> get updates => _controller.stream;

  /// Initializes the realtime subscription. The channel filters rows by `store_id`
  /// using a Postgres `WHERE` clause – this ensures we only receive events relevant
  /// to the current POS terminal and avoids memory leaks from unrelated stores.
  Future<void> init() async {
    // Clean up any existing subscription.
    await _channel?.unsubscribe();
    
    // Create a channel
    _channel = _client.channel('public:stock_levels');

    // Listen for all INSERT/UPDATE/DELETE events with filter.
    _channel!.onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: 'stock_levels',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'store_id',
        value: _storeId,
      ),
      callback: (payload) {
        final data = payload.newRecord.isNotEmpty ? payload.newRecord : payload.oldRecord;
        if (data.isNotEmpty) {
          _controller.add(data);
        }
      },
    );

    await _channel!.subscribe();
  }

  /// Dispose the channel and controller.
  Future<void> dispose() async {
    await _channel?.unsubscribe();
    await _controller.close();
    _channel = null;
  }
}
