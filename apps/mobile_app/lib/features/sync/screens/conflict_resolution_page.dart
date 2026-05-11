import 'package:flutter/material.dart';
import 'package:luckystorepos/offline/db.dart';
import 'package:luckystorepos/sync/sync_controller.dart';
import 'dart:convert';

class ConflictResolutionPage extends StatefulWidget {
  final SyncController controller;

  const ConflictResolutionPage({
    Key? key,
    required this.controller,
  }) : super(key: key);

  @override
  State<ConflictResolutionPage> createState() => _ConflictResolutionPageState();
}

class _ConflictResolutionPageState extends State<ConflictResolutionPage> {
  List<SyncConflict> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final res = await widget.controller.db.getConflicts();
    setState(() {
      _items = res;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFFBEB),
      appBar: AppBar(
        title: const Text('Sync Conflicts'),
        backgroundColor: Colors.amber[700],
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(
                  child: Text('Hooray! No outstanding drift conflicts.'),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length,
                  itemBuilder: (context, index) => _buildConflictCard(_items[index]),
                ),
    );
  }

  Widget _buildConflictCard(SyncConflict c) {
    Map<String, dynamic> payload = {};
    try {
      payload = jsonDecode(c.snapshotPayload);
    } catch (_) {}

    final int delta = c.actualQuantity - c.expectedQuantity;
    final Color deltaColor = delta >= 0 ? Colors.green[700]! : Colors.red[700]!;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning, color: Colors.orange[800], size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Inventory Divergence Detected',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildStatColumn('Target Product', c.productId.substring(0, 8)),
                _buildStatColumn('Action Mode', payload['quantity_delta'] != null ? 'Adjustment' : 'Sales Deduction'),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _buildQuantityBox('Local Expectation', c.expectedQuantity, Colors.grey[600]!),
                  ),
                  Icon(Icons.arrow_forward, color: Colors.grey[400]),
                  Expanded(
                    child: _buildQuantityBox('Cloud Reality', c.actualQuantity, Colors.blue[700]!),
                  ),
                  Expanded(
                    child: _buildQuantityBox('Difference', delta, deltaColor, showSign: true),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'How should the system recover this record?',
              style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF374151)),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      // Dropping the original request, resolving the conflict state tracking
                      await widget.controller.db.resolveConflict(c.id);
                      await widget.controller.db.dismissDeadLetter(c.operationId);
                      _load();
                    },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red[700],
                      side: BorderSide(color: Colors.red[200]!),
                    ),
                    child: const Text('Discard Event'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      // Logic for dynamic recalculation flow usually injected here
                      // For now, clears UI conflict tracking entry marking resolution manual handler path
                      await widget.controller.db.resolveConflict(c.id);
                      _load();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue[700],
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Adopt Reality'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatColumn(String label, String val) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[500], fontWeight: FontWeight.w500)),
        const SizedBox(height: 2),
        Text(val, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.black87)),
      ],
    );
  }

  Widget _buildQuantityBox(String label, int qty, Color color, {bool showSign = false}) {
    final sign = showSign && qty > 0 ? '+' : '';
    return Column(
      children: [
        Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
        const SizedBox(height: 4),
        Text(
          '$sign$qty',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: color),
        ),
      ],
    );
  }
}
