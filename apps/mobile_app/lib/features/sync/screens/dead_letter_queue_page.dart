import 'package:flutter/material.dart';
import 'package:luckystorepos/offline/db.dart';
import 'package:luckystorepos/sync/sync_controller.dart';

class DeadLetterQueuePage extends StatefulWidget {
  final SyncController controller;

  const DeadLetterQueuePage({
    Key? key,
    required this.controller,
  }) : super(key: key);

  @override
  State<DeadLetterQueuePage> createState() => _DeadLetterQueuePageState();
}

class _DeadLetterQueuePageState extends State<DeadLetterQueuePage> {
  List<DeadLetterEvent> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final res = await widget.controller.db.getDeadLetters();
    setState(() {
      _items = res;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: const Text('Dead Letter Queue'),
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(
                  child: Text(
                    'All clean! No failed transactions.',
                    style: TextStyle(color: Colors.grey),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final item = _items[index];
                    return _buildDeadLetterCard(item);
                  },
                ),
    );
  }

  Widget _buildDeadLetterCard(DeadLetterEvent ev) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  ev.eventType.toUpperCase(),
                  style: TextStyle(color: Colors.red[700], fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Failed At: ${ev.failedAt.hour}:${ev.failedAt.minute}',
                  style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                ),
              ),
            ],
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              ev.failureReason,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: Colors.grey[600], fontSize: 13),
            ),
          ),
          children: [
            Container(
              color: const Color(0xFFF9FAFB),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Error Detail', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey)),
                  const SizedBox(height: 4),
                  Text(ev.failureReason, style: const TextStyle(fontSize: 13, color: Colors.redAccent)),
                  const SizedBox(height: 16),
                  const Text('Raw Payload Data', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey)),
                  const SizedBox(height: 4),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1F2937),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      ev.payload,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: Colors.greenAccent,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton.icon(
                        icon: const Icon(Icons.delete_outline, size: 18),
                        label: const Text('Dismiss'),
                        style: TextButton.styleFrom(foregroundColor: Colors.grey[700]),
                        onPressed: () async {
                          await widget.controller.db.dismissDeadLetter(ev.operationId);
                          _load();
                        },
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.replay, size: 18),
                        label: const Text('Retry Now'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue[600],
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: () async {
                          await widget.controller.db.retryDeadLetter(ev.operationId);
                          _load();
                          // Trigger global engine processor kick-off
                          widget.controller.engine.processQueue();
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
