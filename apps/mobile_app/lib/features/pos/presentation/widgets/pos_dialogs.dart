import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../models/pos_models.dart';
import '../../../../shared/providers/pos_provider.dart';
import '../../../../shared/providers/auth_provider.dart';
import '../screens/pos_session_summary_screen.dart';

/// Shows the discount dialog for the POS cart.
void showDiscountDialog(BuildContext context, PosProvider pos) {
  final ctrl = TextEditingController();
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: const Color(0xFF161B22),
      title: const Text('Apply Discount',
          style: TextStyle(color: Colors.white, fontSize: 16)),
      content: TextField(
        controller: ctrl,
        autofocus: true,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        style: const TextStyle(color: Colors.white, fontSize: 18),
        decoration: const InputDecoration(
          prefixText: '৳ ',
          prefixStyle: TextStyle(color: Color(0xFFE8B84B), fontSize: 18),
          hintText: '0.00',
          hintStyle: TextStyle(color: Colors.white30),
          enabledBorder: UnderlineInputBorder(
              borderSide: BorderSide(color: Color(0xFF30363D))),
          focusedBorder: UnderlineInputBorder(
              borderSide: BorderSide(color: Color(0xFFE8B84B))),
        ),
      ),
      actions: [
        TextButton(
            onPressed: () { pos.setCartDiscount(0); Navigator.pop(ctx); },
            child: const Text('Remove', style: TextStyle(color: Colors.red))),
        ElevatedButton(
          onPressed: () {
            final v = double.tryParse(ctrl.text) ?? 0;
            pos.setCartDiscount(v);
            Navigator.pop(ctx);
          },
          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE8B84B)),
          child: const Text('Apply', style: TextStyle(color: Colors.black)),
        ),
      ],
    ),
  );
}

/// Shows the clear-cart confirmation dialog.
void showClearCartDialog(BuildContext context, PosProvider pos) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: const Color(0xFF161B22),
      title: const Text('Clear Cart?',
          style: TextStyle(color: Colors.white)),
      content: const Text('This will remove all items from the cart.',
          style: TextStyle(color: Colors.white60)),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54))),
        ElevatedButton(
          onPressed: () {
            pos.clearCart();
            Navigator.pop(ctx);
          },
          style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
          child: const Text('Clear', style: TextStyle(color: Colors.white)),
        ),
      ],
    ),
  );
}

/// Shows the cashier info dialog with session details and sign-out / end-shift actions.
void showCashierDialog(BuildContext context, PosProvider pos) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: const Color(0xFF161B22),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFE8B84B).withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.person_rounded,
                color: Color(0xFFE8B84B), size: 20),
          ),
          const SizedBox(width: 10),
          Text(pos.cashierName ?? 'Cashier',
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600)),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _infoRow(Icons.tag_rounded, 'Session',
              pos.session?.sessionNumber ?? '—'),
          const SizedBox(height: 6),
          _infoRow(Icons.store_outlined, 'Store ID',
              pos.storeId ?? '—'),
          const SizedBox(height: 6),
          _infoRow(Icons.access_time_rounded, 'Started',
              pos.session?.openedAt != null
                  ? _formatTime(pos.session!.openedAt)
                  : '—'),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Close',
              style: TextStyle(color: Colors.white38)),
        ),
        TextButton(
          onPressed: () {
            Navigator.pop(ctx);
            context.read<AuthProvider>().signOut();
          },
          child: const Text('Sign Out',
              style: TextStyle(color: Colors.redAccent, fontSize: 13)),
        ),
        ElevatedButton.icon(
          icon: const Icon(Icons.summarize_outlined,
              color: Colors.black, size: 16),
          label: const Text('End Shift',
              style: TextStyle(
                  color: Colors.black, fontWeight: FontWeight.w700)),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFE8B84B),
            elevation: 0,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: () {
            Navigator.pop(ctx);
            if (pos.session?.id != null) {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => PosSessionSummaryScreen(
                      sessionId: pos.session!.id),
                ),
              );
            }
          },
        ),
      ],
    ),
  );
}

/// Shows the POS debug snapshot dialog.
void showPosDebugDialog(
  BuildContext context,
  PosProvider pos, {
  required List<PosCategory> categories,
  required List<PosItem> items,
  required VoidCallback onReload,
}) {
  final debug = pos.posDebugSnapshot;
  final diagnostics = <String>[
    'Source mode: ${debug['data_source_mode']}',
    'Offline safe mode: ${debug['offline_safe_mode']}',
    'Store ID: ${debug['store_id'] ?? 'null'}',
    'Cashier ID: ${debug['cashier_id'] ?? 'null'}',
    'Last load path: ${debug['last_load_path']}',
    'Last categories count: ${debug['last_category_count']}',
    'Last items count: ${debug['last_item_count']}',
    'Last load error: ${debug['last_load_error'] ?? 'none'}',
    'Last loaded at: ${debug['last_loaded_at'] ?? 'never'}',
    'Current UI category chips: ${categories.length}',
    'Current UI item tiles: ${items.length}',
  ];

  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: const Color(0xFF161B22),
      title: const Text(
        'POS Debug Snapshot',
        style: TextStyle(color: Colors.white, fontSize: 16),
      ),
      content: SizedBox(
        width: 520,
        child: SingleChildScrollView(
          child: SelectableText(
            diagnostics.join('\n'),
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 12,
              height: 1.4,
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Close', style: TextStyle(color: Colors.white54)),
        ),
        ElevatedButton(
          onPressed: () async {
            Navigator.pop(ctx);
            onReload();
          },
          style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE8B84B)),
          child: const Text('Reload', style: TextStyle(color: Colors.black)),
        ),
      ],
    ),
  );
}

// ── Private helpers ──────────────────────────────────────────────────────────

Widget _infoRow(IconData icon, String label, String value) {
  return Row(
    children: [
      Icon(icon, color: Colors.white38, size: 15),
      const SizedBox(width: 8),
      Text('$label: ', style: const TextStyle(color: Colors.white38, fontSize: 12)),
      Expanded(
        child: Text(value,
            style: const TextStyle(color: Colors.white70, fontSize: 12),
            overflow: TextOverflow.ellipsis),
      ),
    ],
  );
}

String _formatTime(DateTime dt) {
  final local = dt.toLocal();
  final h = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final m = local.minute.toString().padLeft(2, '0');
  final period = local.hour < 12 ? 'AM' : 'PM';
  return '$h:$m $period';
}